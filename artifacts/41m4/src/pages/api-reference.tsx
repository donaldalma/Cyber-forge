import { useState } from "react";
import { useLocation } from "wouter";
import { Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Method = "GET" | "POST" | "DELETE" | "PUT" | "PATCH";

interface Endpoint {
  method: Method;
  path: string;
  summary: string;
  description: string;
  auth?: boolean;
  params?: { name: string; in: "query" | "path" | "body"; type: string; required: boolean; description: string }[];
  response: string;
  example: string;
}

const METHOD_COLORS: Record<Method, string> = {
  GET: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
  PUT: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  PATCH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const ENDPOINTS: { group: string; endpoints: Endpoint[] }[] = [
  {
    group: "Payloads",
    endpoints: [
      {
        method: "GET",
        path: "/api/payloads",
        summary: "List and search payloads",
        description: "Returns a paginated list of payloads. Supports full-text search across payload body, title, description, and subcategory. Combine filters as needed.",
        params: [
          { name: "category", in: "query", type: "string", required: false, description: "XSS | SQLi | CSRF | LFI | SSRF | XXE | RCE | IDOR | Open Redirect | SSTI | Path Traversal | Command Injection" },
          { name: "search", in: "query", type: "string", required: false, description: "Free text search across payload body, title, description" },
          { name: "bypass", in: "query", type: "boolean", required: false, description: "true — returns only WAF/CSP/filter bypass payloads" },
          { name: "page", in: "query", type: "integer", required: false, description: "Page number (default: 1)" },
          { name: "limit", in: "query", type: "integer", required: false, description: "Results per page (default: 50, max: 100)" },
        ],
        response: `{
  "payloads": [
    {
      "id": 1,
      "category": "XSS",
      "subcategory": "Basic",
      "title": "Script Tag Classic",
      "payload": "<script>alert(1)</script>",
      "description": "The simplest XSS payload...",
      "isBypass": false,
      "bypassType": null,
      "tags": ["basic", "script"],
      "platform": null,
      "cve": null,
      "views": 42
    }
  ],
  "meta": { "total": 320, "page": 1, "limit": 50, "pages": 7 }
}`,
        example: `# Search XSS WAF bypass payloads
curl "/api/payloads?category=XSS&bypass=true&page=1&limit=20"

# Full text search
curl "/api/payloads?search=SLEEP"

# SQLi payloads
curl "/api/payloads?category=SQLi"`,
      },
      {
        method: "GET",
        path: "/api/payloads/categories",
        summary: "Get payload counts by category",
        description: "Returns the number of payloads available in each vulnerability category.",
        response: `{
  "categories": [
    { "category": "XSS", "count": 72 },
    { "category": "SQLi", "count": 65 },
    { "category": "LFI", "count": 30 }
  ]
}`,
        example: `curl /api/payloads/categories`,
      },
      {
        method: "GET",
        path: "/api/payloads/stats/overview",
        summary: "Get payload database statistics",
        description: "Returns aggregate counts broken down by category. Useful for dashboard widgets.",
        response: `{
  "total": 320,
  "bypassCount": 89,
  "byCategory": [
    { "category": "XSS", "count": 72 },
    { "category": "SQLi", "count": 65 }
  ]
}`,
        example: `curl /api/payloads/stats/overview`,
      },
      {
        method: "GET",
        path: "/api/payloads/:id",
        summary: "Get a specific payload by ID",
        description: "Returns a single payload by its database ID. Also increments the view counter.",
        params: [
          { name: "id", in: "path", type: "integer", required: true, description: "Payload database ID" },
        ],
        response: `{
  "id": 42,
  "category": "SQLi",
  "subcategory": "UNION-based",
  "title": "UNION credential dump",
      "payload": "' UNION SELECT username,password FROM users--",
      "description": "Dumps usernames and passwords...",
      "isBypass": false,
  "bypassType": null,
  "tags": ["union", "credential-dump"],
  "platform": null,
  "cve": null,
  "views": 156
}`,
        example: `curl /api/payloads/42`,
      },
    ],
  },
  {
    group: "Attack Labs",
    endpoints: [
      {
        method: "GET",
        path: "/api/lab/xss/reflected",
        summary: "Reflected XSS lab endpoint",
        description: "Returns an HTML page that reflects the ?payload= query parameter without sanitization. Test XSS payloads directly in the payload parameter. The response is a full HTML page.",
        params: [
          { name: "payload", in: "query", type: "string", required: false, description: "Value reflected unsanitized into the HTML response" },
        ],
        response: `HTML page with reflected user input`,
        example: `# Open in browser:
/api/lab/xss/reflected?payload=<img+src=x+onerror=alert(1)>`,
      },
      {
        method: "GET",
        path: "/api/lab/xss/stored",
        summary: "Stored XSS lab — view comments",
        description: "Returns the stored XSS lab page with all submitted comments rendered unescaped.",
        response: `HTML page listing stored comments`,
        example: `curl /api/lab/xss/stored`,
      },
      {
        method: "POST",
        path: "/api/lab/xss/stored",
        summary: "Stored XSS lab — submit a comment",
        description: "Stores a comment without sanitization. Any XSS payload in the comment will execute when the stored lab page is visited.",
        params: [
          { name: "username", in: "body", type: "string", required: false, description: "Display name for the comment" },
          { name: "body", in: "body", type: "string", required: true, description: "Comment text stored and rendered unescaped" },
        ],
        response: `Redirect to stored lab page`,
        example: `curl -X POST /api/lab/xss/stored \\
  -d 'username=operator' \\
  -d 'body=<script>alert(document.cookie)</script>'`,
      },
      {
        method: "GET",
        path: "/api/lab/sqli/search",
        summary: "SQL Injection lab — search endpoint",
        description: "Simulates a vulnerable search endpoint that concatenates user input into a SQL query string. The page shows the query structure and simulated results.",
        params: [
          { name: "q", in: "query", type: "string", required: false, description: "Search term — injected directly into query" },
        ],
        response: `HTML page with query visualization`,
        example: `# Open in browser:
/api/lab/sqli/search?q=' OR 1=1--`,
      },
      {
        method: "GET",
        path: "/api/lab/csrf/bank",
        summary: "CSRF lab — vulnerable bank form",
        description: "A simulated bank transfer form with no CSRF protection. The transfer endpoint accepts POST requests from any origin with the victim's session.",
        response: `HTML bank transfer form`,
        example: `# Open in browser, then craft a CSRF PoC page:
<form method="POST" action="/api/lab/csrf/transfer">
  <input name="to" value="hacker">
  <input name="amount" value="9999">
</form>`,
      },
      {
        method: "GET",
        path: "/api/lab/lfi",
        summary: "LFI lab — path traversal demo",
        description: "Demonstrates path traversal patterns. The file= parameter simulates path construction and shows how traversal sequences resolve — safe educational simulation.",
        params: [
          { name: "file", in: "query", type: "string", required: false, description: "Filename or traversal path to simulate" },
        ],
        response: `HTML page showing path resolution`,
        example: `# Open in browser:
/api/lab/lfi?file=../../../../etc/passwd`,
      },
      {
        method: "GET",
        path: "/api/lab/ssrf/fetch",
        summary: "SSRF lab — webhook fetcher",
        description: "A realistic server-side fetcher simulation with naive blocklist behavior, internal services, cloud metadata targets, and parser-mismatch bypass cases.",
        params: [
          { name: "url", in: "query", type: "string", required: false, description: "URL fetched by the simulated backend service" },
        ],
        response: `HTML page with fetcher policy decision and simulated backend response`,
        example: `# Open in browser:
/api/lab/ssrf/fetch?url=http://0x7f000001:8080/admin`,
      },
      {
        method: "GET",
        path: "/api/lab/xxe/parse",
        summary: "XXE lab — legacy XML parser",
        description: "Simulates an XML importer that resolves external entities. Safe fake file and cloud-metadata reads demonstrate realistic XXE impact without touching host files.",
        params: [
          { name: "xml", in: "query", type: "string", required: false, description: "XML document containing a DOCTYPE external entity" },
        ],
        response: `HTML page showing parser result and resolved entity content`,
        example: `# Open in browser with URL-encoded XML:
/api/lab/xxe/parse?xml=<!DOCTYPE r [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><r>&xxe;</r>`,
      },
      {
        method: "GET",
        path: "/api/lab/progress",
        summary: "Lab progress",
        description: "Returns the current lab progress metadata without requiring authentication.",
        response: `{ "labs": [], "recent": [] }`,
        example: `curl /api/lab/progress`,
      },
      {
        method: "GET",
        path: "/api/healthz",
        summary: "API health check",
        description: "Returns the API server status. Use to verify the service is running before making other requests.",
        response: `{ "status": "ok" }`,
        example: `curl /api/healthz`,
      },
    ],
  },
];

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(endpoint.example);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-border/40 hover:border-border/80 transition-colors">
      <button
        className="w-full text-left p-4 flex items-center gap-3"
        onClick={() => setOpen(o => !o)}
      >
        <span className={`text-xs font-bold px-2 py-0.5 border rounded-none min-w-[52px] text-center ${METHOD_COLORS[endpoint.method]}`}>
          {endpoint.method}
        </span>
        <span className="font-mono text-sm text-primary flex-1 text-left">{endpoint.path}</span>
        <span className="text-xs text-muted-foreground hidden md:inline mr-4">{endpoint.summary}</span>
        {endpoint.auth && <Badge variant="outline" className="rounded-none border-yellow-500/40 text-yellow-500 text-xs">AUTH</Badge>}
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-border/40 p-4 space-y-4 bg-background/40">
          <p className="text-sm text-muted-foreground leading-relaxed">{endpoint.description}</p>

          {endpoint.params && endpoint.params.length > 0 && (
            <div>
              <div className="text-xs font-bold tracking-widest text-primary uppercase mb-2">Parameters</div>
              <div className="border border-border/40 divide-y divide-border/40">
                <div className="grid grid-cols-12 gap-2 p-2 text-xs text-muted-foreground bg-card/50">
                  <div className="col-span-3 font-bold">Name</div>
                  <div className="col-span-1 font-bold">In</div>
                  <div className="col-span-2 font-bold">Type</div>
                  <div className="col-span-1 font-bold">Req.</div>
                  <div className="col-span-5 font-bold">Description</div>
                </div>
                {endpoint.params.map(p => (
                  <div key={p.name} className="grid grid-cols-12 gap-2 p-2 text-xs">
                    <div className="col-span-3 text-primary font-mono">{p.name}</div>
                    <div className="col-span-1 text-muted-foreground">{p.in}</div>
                    <div className="col-span-2 text-muted-foreground">{p.type}</div>
                    <div className="col-span-1 text-muted-foreground">{p.required ? "✓" : "—"}</div>
                    <div className="col-span-5 text-muted-foreground">{p.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-bold tracking-widest text-primary uppercase mb-2">Response</div>
            <pre className="bg-background border border-border/40 p-3 text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
              {endpoint.response}
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold tracking-widest text-primary uppercase">Example</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copy}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-primary rounded-none"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <pre className="bg-background border border-border/40 p-3 text-xs text-primary overflow-x-auto whitespace-pre-wrap">
              {endpoint.example}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiReference() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex flex-col">
      <nav className="border-b border-border/50 p-4 sticky top-0 bg-background/90 backdrop-blur z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button onClick={() => setLocation("/")} className="text-2xl font-bold tracking-widest text-primary hover:opacity-80">41M4</button>
          <div className="flex gap-4 items-center">
            <button onClick={() => setLocation("/docs")} className="text-xs text-muted-foreground hover:text-primary tracking-widest">[DOCS]</button>
            <Badge variant="outline" className="border-primary text-primary rounded-none">API REF</Badge>
            <button onClick={() => setLocation("/lab")} className="text-xs text-orange-400 hover:text-orange-300 tracking-widest">[ATTACK BOX]</button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto w-full px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-primary uppercase mb-2">API Reference</h1>
          <p className="text-muted-foreground text-sm">Base URL: <code className="text-primary">/api</code> — All endpoints return JSON unless noted.</p>
        </div>

        <div className="border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground">
          <span className="text-primary font-bold">NOTE: </span>
          All documented endpoints are accessible without authentication in this deployment.
        </div>

        {ENDPOINTS.map(group => (
          <div key={group.group} className="space-y-1">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-sm font-bold tracking-widest text-primary uppercase">{group.group}</h2>
              <div className="flex-1 border-t border-border/30" />
            </div>
            {group.endpoints.map(ep => (
              <EndpointCard key={ep.method + ep.path} endpoint={ep} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
