import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Terminal, Shield, Activity, Zap, Server, BookOpen, Code2, FlaskConical, ChevronRight, Target, Lock, Database, Globe, FileText, Cpu, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Stats {
  total: number;
  bypassCount: number;
  byCategory: { category: string; count: number }[];
}

const QUICK_LABS = [
  { name: "XSS", path: "/lab/xss", icon: <Terminal className="w-5 h-5" />, color: "text-green-400 border-green-400/40 hover:bg-green-400/10" },
  { name: "SQLi", path: "/lab/sqli", icon: <Database className="w-5 h-5" />, color: "text-blue-400 border-blue-400/40 hover:bg-blue-400/10" },
  { name: "CSRF", path: "/lab/csrf", icon: <Globe className="w-5 h-5" />, color: "text-yellow-400 border-yellow-400/40 hover:bg-yellow-400/10" },
  { name: "LFI", path: "/lab/lfi", icon: <FileText className="w-5 h-5" />, color: "text-purple-400 border-purple-400/40 hover:bg-purple-400/10" },
  { name: "SSRF", path: "/lab/ssrf", icon: <Cpu className="w-5 h-5" />, color: "text-cyan-400 border-cyan-400/40 hover:bg-cyan-400/10" },
  { name: "XXE", path: "/lab/xxe", icon: <AlertTriangle className="w-5 h-5" />, color: "text-orange-400 border-orange-400/40 hover:bg-orange-400/10" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [heroText, setHeroText] = useState("");

  const fullHeroText = "root@41m4:~$ ./load_arsenal --mode expert";

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setHeroText(fullHeroText.substring(0, i));
      i++;
      if (i > fullHeroText.length) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch("/api/payloads/stats/overview")
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-mono">
      {/* Navbar */}
      <nav className="border-b border-border/50 p-4 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="text-2xl font-bold tracking-widest text-primary shrink-0">41M4</div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/arsenal")} className="text-muted-foreground hover:text-primary rounded-none text-xs tracking-wider">
              <Target className="w-3.5 h-3.5 mr-1.5" />[ARSENAL]
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/docs")} className="text-muted-foreground hover:text-primary rounded-none text-xs tracking-wider">
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />[DOCS]
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/api-reference")} className="text-muted-foreground hover:text-primary rounded-none text-xs tracking-wider">
              <Code2 className="w-3.5 h-3.5 mr-1.5" />[API]
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/lab")} className="text-orange-400 hover:text-orange-300 hover:bg-orange-400/10 rounded-none border border-orange-400/40 text-xs tracking-wider">
              <FlaskConical className="w-3.5 h-3.5 mr-1.5" />[ATTACK BOX]
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-4 max-w-7xl mx-auto relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,_var(--tw-gradient-stops))] from-primary/8 via-background to-background pointer-events-none" />
        <div className="relative z-10 text-center space-y-6">
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-primary">
            CROSS THE LINE.
          </h1>
          <div className="bg-card border border-border inline-block text-left p-3 min-w-[280px] shadow-[0_0_20px_rgba(0,255,65,0.15)]">
            <span className="text-primary text-sm">{heroText}</span><span className="animate-pulse">_</span>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto uppercase tracking-wider">
            Professional-grade security research platform for authorized penetration testing.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button size="lg" onClick={() => setLocation("/arsenal")} className="bg-primary text-background hover:bg-primary/80 rounded-none font-bold tracking-wider shadow-[0_0_15px_rgba(0,255,65,0.3)]">
              [BROWSE ARSENAL]
            </Button>
            <Button size="lg" variant="outline" onClick={() => setLocation("/lab")} className="border-orange-400 text-orange-400 hover:bg-orange-400/10 rounded-none font-bold tracking-wider">
              [ATTACK LAB]
            </Button>
          </div>
        </div>
      </section>

      {/* Live Stats */}
      <section className="border-y border-border/50 bg-card/30">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-border/50 text-center">
          {[
            { label: "PAYLOADS", val: stats ? stats.total.toLocaleString() : "—" },
            { label: "CATEGORIES", val: stats ? String(stats.byCategory.length) : "—" },
            { label: "WAF BYPASSES", val: stats ? String(stats.bypassCount) : "—" },
            { label: "TOTAL LINES", val: "300+" },
          ].map((s, i) => (
            <div key={i} className="p-6">
              <div className="text-3xl font-bold text-primary mb-1">{s.val}</div>
              <div className="text-xs text-muted-foreground tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-border/50 p-6 hover:border-primary/40 transition-colors cursor-pointer" onClick={() => setLocation("/arsenal")}>
            <Target className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-bold tracking-wider text-lg mb-2">PAYLOAD ARSENAL</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Searchable database of hand-curated exploit payloads across 12 vulnerability categories with WAF bypass tagging.
            </p>
            <span className="text-xs text-primary flex items-center gap-1">
              Browse arsenal <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          <div className="border border-border/50 p-6 hover:border-orange-400/40 transition-colors cursor-pointer" onClick={() => setLocation("/lab")}>
            <FlaskConical className="h-8 w-8 text-orange-400 mb-4" />
            <h3 className="font-bold tracking-wider text-lg mb-2">ATTACK BOX</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Fully isolated vulnerable lab environment. Practice XSS, SQLi, CSRF, LFI, SSRF, and XXE attacks in a safe sandbox.
            </p>
            <span className="text-xs text-orange-400 flex items-center gap-1">
              Enter lab <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          <div className="border border-border/50 p-6 hover:border-primary/40 transition-colors cursor-pointer" onClick={() => setLocation("/api-reference")}>
            <Code2 className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-bold tracking-wider text-lg mb-2">API & DOCS</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Full OpenAPI 3.1 specification and auto-generated client libraries for integrating 41M4 into your toolchain.
            </p>
            <span className="text-xs text-primary flex items-center gap-1">
              View docs <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </section>

      {/* Quick Access Labs */}
      <section className="border-y border-border/50 bg-card/20 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold tracking-widest uppercase">Quick Access — Attack Labs</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {QUICK_LABS.map((lab) => (
              <button
                key={lab.name}
                onClick={() => setLocation(lab.path)}
                className={`border p-4 flex flex-col items-center gap-2 transition-all ${lab.color}`}
              >
                {lab.icon}
                <span className="text-xs font-bold tracking-wider">{lab.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features row */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: <Activity className="h-7 w-7 text-primary" />, title: "LIVE DATABASE", desc: "PostgreSQL-backed payload database. Every payload is hand-curated with descriptions and exploit context." },
            { icon: <Zap className="h-7 w-7 text-primary" />, title: "SMART SEARCH", desc: "Full-text search across payload bodies, titles, descriptions, and subcategories with pagination." },
            { icon: <Shield className="h-7 w-7 text-primary" />, title: "WAF BYPASS TAGGED", desc: "Bypass payloads are tagged and filterable — quickly find techniques to evade ModSecurity, Cloudflare WAF, and more." },
            { icon: <Server className="h-7 w-7 text-primary" />, title: "LIVE ATTACK LAB", desc: "Real vulnerable Express.js endpoints for XSS, SQLi, CSRF, and LFI — not a simulation, not sandboxed." },
          ].map((f, i) => (
            <div key={i} className="p-5 border border-border/30 hover:border-primary/40 transition-colors">
              {f.icon}
              <h3 className="font-bold tracking-wider text-sm mt-3 mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-10 px-4 text-center text-sm">
        <div className="max-w-7xl mx-auto space-y-4 text-muted-foreground">
          <div className="text-xl font-bold tracking-widest text-primary">41M4</div>
          <p className="text-xs uppercase tracking-widest">Professional Security Research Platform</p>
          <div className="flex gap-4 justify-center text-xs">
            <button onClick={() => setLocation("/arsenal")} className="hover:text-primary">[ARSENAL]</button>
            <button onClick={() => setLocation("/docs")} className="hover:text-primary">[DOCS]</button>
            <button onClick={() => setLocation("/api-reference")} className="hover:text-primary">[API]</button>
            <button onClick={() => setLocation("/lab")} className="hover:text-orange-400">[LAB]</button>
          </div>
          <div className="border border-destructive/30 bg-destructive/5 text-destructive p-3 inline-block max-w-xl text-xs uppercase tracking-wide">
            FOR AUTHORIZED SECURITY RESEARCH ONLY. NEVER TEST WITHOUT EXPLICIT WRITTEN PERMISSION.
          </div>
        </div>
      </footer>
    </div>
  );
}
