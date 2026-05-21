import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Terminal, Database, FileText, Globe, AlertTriangle, ChevronRight, Cpu } from "lucide-react";

const LAB_MODULES = [
  {
    id: "xss",
    name: "Cross-Site Scripting",
    code: "XSS",
    icon: <Terminal className="w-8 h-8" />,
    payloads: "20+",
    desc: "Inject malicious scripts into web pages viewed by other users. Practice reflected, stored, and DOM-based XSS in a live vulnerable environment.",
    techniques: ["Reflected XSS", "Stored XSS", "DOM-based XSS", "WAF Bypass", "CSP Evasion"],
    status: "ACTIVE",
    path: "/lab/xss",
  },
  {
    id: "sqli",
    name: "SQL Injection",
    code: "SQLi",
    icon: <Database className="w-8 h-8" />,
    payloads: "10+",
    desc: "Exploit poorly written database queries. Extract credentials, bypass authentication, and drop tables in a live simulated SQL environment.",
    techniques: ["Auth Bypass", "UNION-based", "Blind SQLi", "Time-based", "Error-based"],
    status: "ACTIVE",
    path: "/lab/sqli",
  },
  {
    id: "csrf",
    name: "Cross-Site Request Forgery",
    code: "CSRF",
    icon: <Globe className="w-8 h-8" />,
    payloads: "3+",
    desc: "Force authenticated users to perform unintended actions. Hijack bank transfers and account changes without the victim's knowledge.",
    techniques: ["GET-based CSRF", "POST-based CSRF", "JSON CSRF", "Logout CSRF"],
    status: "ACTIVE",
    path: "/lab/csrf",
  },
  {
    id: "lfi",
    name: "Local File Inclusion",
    code: "LFI",
    icon: <FileText className="w-8 h-8" />,
    payloads: "7+",
    desc: "Practice file-read impact safely with realistic fake filesystem targets, config leaks, and environment-variable exposure via path traversal.",
    techniques: ["Path Traversal", "Null Byte Bypass", "PHP Wrappers", "Log Poisoning"],
    status: "ACTIVE",
    path: "/lab/lfi",
  },
  {
    id: "ssrf",
    name: "Server-Side Request Forgery",
    code: "SSRF",
    icon: <Cpu className="w-8 h-8" />,
    payloads: "8+",
    desc: "Make the server issue requests to internal services. Access cloud metadata endpoints, internal APIs, and scan private networks.",
    techniques: ["AWS Metadata", "Internal Port Scan", "Protocol Smuggling", "IP Bypass"],
    status: "ACTIVE",
    path: "/lab/ssrf",
  },
  {
    id: "xxe",
    name: "XML External Entity",
    code: "XXE",
    icon: <AlertTriangle className="w-8 h-8" />,
    payloads: "3+",
    desc: "Exploit XML parsers to read files, perform SSRF, and execute blind out-of-band data exfiltration.",
    techniques: ["File Read", "SSRF via XXE", "Blind OOB", "Entity Nesting"],
    status: "ACTIVE",
    path: "/lab/xxe",
  },
];

export default function Lab() {
  const [, setLocation] = useLocation();
  const [hovered, setHovered] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, { attempts: number; solved: number }>>({});

  useEffect(() => {
    fetch("/api/lab/progress", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.labs) return;
        setProgress(Object.fromEntries(data.labs.map((row: { labType: string; attempts: number; solved: number }) => [row.labType, row])));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      {/* Navbar */}
      <nav className="border-b border-border/50 p-4 sticky top-0 bg-background/90 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            className="text-2xl font-bold tracking-widest text-primary glitch cursor-pointer"
            onClick={() => setLocation("/")}
            data-testid="logo-link"
          >
            41M4
          </button>
          <div className="flex items-center gap-2 text-muted-foreground text-xs tracking-wider">
            <span className="text-primary">root@41m4</span>
            <span>:</span>
            <span className="text-orange-400">~/attack-box</span>
            <span className="blink text-primary">_</span>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="text-xs text-muted-foreground tracking-widest mb-3">
            {"// SELECT VULNERABILITY CLASS //"}
          </div>
          <h1 className="text-4xl font-black tracking-tight text-primary mb-3">
            ATTACK BOX
          </h1>
          <p className="text-muted-foreground max-w-2xl tracking-wide">
            Choose a vulnerability class to enter a fully isolated, intentionally vulnerable practice environment. Labs run through backend endpoints with safe simulated impact data.
          </p>
          <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="text-green-500">● {LAB_MODULES.filter(m => m.status === "ACTIVE").length} ACTIVE</span>
            {LAB_MODULES.some(m => m.status !== "ACTIVE") && (
              <>
                <span className="text-muted-foreground/50">|</span>
                <span className="text-muted-foreground/50">● {LAB_MODULES.filter(m => m.status !== "ACTIVE").length} COMING SOON</span>
              </>
            )}
          </div>
        </div>

        {/* Lab Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LAB_MODULES.map((lab, i) => {
            const isActive = lab.status === "ACTIVE";
            return (
              <motion.div
                key={lab.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                onMouseEnter={() => setHovered(lab.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => isActive && lab.path && setLocation(lab.path)}
                className={`border border-border p-5 flex flex-col gap-4 transition-all duration-200 ${
                  isActive
                    ? "cursor-pointer hover:border-primary hover:shadow-[0_0_20px_rgba(0,255,65,0.15)]"
                    : "opacity-40 cursor-not-allowed"
                }`}
                data-testid={`lab-card-${lab.id}`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div className="text-primary">{lab.icon}</div>
                  {lab.status !== "ACTIVE" && (
                    <span className="text-xs text-muted-foreground/50 tracking-wider">COMING SOON</span>
                  )}
                </div>

                {/* Name */}
                <div>
                  <div className="text-xs text-muted-foreground tracking-widest mb-1">[{lab.code}]</div>
                  <div className="font-bold text-lg tracking-tight text-foreground">{lab.name}</div>
                </div>

                {/* Desc */}
                <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                  {lab.desc}
                </p>

                {/* Techniques */}
                <div className="flex flex-wrap gap-1">
                  {lab.techniques.slice(0, 3).map((t) => (
                    <span key={t} className="text-xs border border-primary/20 text-primary/60 px-2 py-0.5">
                      {t}
                    </span>
                  ))}
                  {lab.techniques.length > 3 && (
                    <span className="text-xs text-muted-foreground/50 px-1 py-0.5">
                      +{lab.techniques.length - 3} more
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-auto">
                  <span className="text-xs text-muted-foreground">{lab.payloads} payloads</span>
                  {isActive && (
                    <div className={`flex items-center gap-1 text-xs font-bold tracking-wider transition-colors ${hovered === lab.id ? "text-primary" : "text-muted-foreground"}`}>
                      ENTER LAB <ChevronRight className="w-3 h-3" />
                    </div>
                  )}
                </div>
                {progress[lab.id] && (
                  <div className="text-xs text-muted-foreground border-t border-border/30 pt-2">
                    {progress[lab.id].solved}/{progress[lab.id].attempts} successful attempts recorded
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Disclaimer */}
        <div className="mt-12 border border-red-900/50 bg-red-950/20 text-red-500/70 p-4 text-xs tracking-wider uppercase text-center">
          Warning: These environments are intentionally vulnerable. Use only for authorized security research and education. Never test against systems you do not own.
        </div>
      </div>
    </div>
  );
}
