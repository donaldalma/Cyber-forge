import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronRight, RotateCcw, Copy, Check, AlertTriangle, X, Menu } from "lucide-react";
import { motion } from "framer-motion";

interface Payload {
  id: number;
  label: string;
  payload: string;
  desc: string;
  bypass: boolean;
}

interface Props {
  title: string;
  code: string;
  targetUrl: string;
  payloads: Payload[];
  injectionMode?: "query" | "hash";
  queryParam?: string;
  hint?: string;
}

export function GenericLab({ title, code, targetUrl, payloads, injectionMode = "query", queryParam = "q", hint }: Props) {
  const [, setLocation] = useLocation();
  const [payloadInput, setPayloadInput] = useState("");
  const [iframeUrl, setIframeUrl] = useState(targetUrl);
  const [iframeKey, setIframeKey] = useState(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [mobilePayloadOpen, setMobilePayloadOpen] = useState(false);

  const injectPayload = (payload: string) => {
    setPayloadInput(payload);
    let url: string;
    if (injectionMode === "hash") {
      url = `${targetUrl}#${encodeURIComponent(payload)}`;
    } else {
      url = `${targetUrl}?${queryParam}=${encodeURIComponent(payload)}`;
    }
    setIframeUrl(url);
    setIframeKey((k) => k + 1);
  };

  const handleCopy = (id: number, payload: string) => {
    navigator.clipboard.writeText(payload);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleReset = () => {
    setIframeUrl(targetUrl);
    setIframeKey((k) => k + 1);
    setPayloadInput("");
  };

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
            <span className="text-primary font-bold">[{code}] {title.toUpperCase()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="text-xs px-2 py-1 border border-border/50 text-muted-foreground hover:text-orange-400 hover:border-orange-400/50 transition-all flex items-center gap-1"
            data-testid="btn-reset"
            title="Reset lab"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={() => setMobilePayloadOpen(!mobilePayloadOpen)}
            className="md:hidden text-xs px-2 py-1 border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50 transition-all flex items-center gap-1"
            title="Toggle payloads"
          >
            <Menu className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Split - Responsive */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Left: Iframe Target */}
        <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-border min-w-0">
          <div className="bg-card/50 border-b border-border px-3 py-2 flex items-center gap-2 flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            <span className="text-xs text-muted-foreground ml-2 font-mono truncate">{iframeUrl}</span>
          </div>

          <div className="border-b border-border bg-card/30 px-3 py-2 flex gap-2 flex-shrink-0">
            <input
              className="flex-1 bg-background border border-border text-primary text-xs px-2 py-1 font-mono outline-none focus:border-primary"
              value={payloadInput}
              onChange={(e) => setPayloadInput(e.target.value)}
              placeholder="Enter payload..."
              onKeyDown={(e) => { if (e.key === "Enter") injectPayload(payloadInput); }}
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

          {hint && (
            <div className="border-b border-border bg-card/20 px-3 py-1.5 text-xs text-muted-foreground/70 flex-shrink-0">
              <span className="text-primary mr-2">//</span>{hint}
            </div>
          )}

          <iframe
            key={iframeKey}
            src={iframeUrl}
            className="flex-1 w-full border-none bg-[#050505]"
            title="Lab Target"
            data-testid="lab-iframe"
          />
        </div>

        {/* Right: Payload Panel - Desktop Visible, Mobile Modal */}
        <>
          {/* Desktop Panel */}
          <div className="hidden md:flex w-[380px] flex-shrink-0 flex-col overflow-hidden">
            <div className="border-b border-border px-3 py-2.5 flex-shrink-0">
              <div className="text-xs font-bold text-primary tracking-wider">PAYLOAD ARSENAL</div>
              <div className="text-xs text-muted-foreground mt-0.5">{payloads.length} payloads — click INJECT or type your own</div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border/30">
              {payloads.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="group px-3 py-3 hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground">{p.label}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(p.id, p.payload)}
                        className="text-muted-foreground hover:text-primary p-1"
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
                  {p.bypass && (
                    <span className="text-xs text-orange-400 border border-orange-400/30 px-1 mb-1 inline-block">BYPASS</span>
                  )}
                  <p className="text-xs text-muted-foreground leading-relaxed mb-1">{p.desc}</p>
                  <code className="text-xs text-primary/60 break-all">{p.payload.length > 80 ? p.payload.substring(0, 80) + "…" : p.payload}</code>
                </motion.div>
              ))}
            </div>

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

          {/* Mobile Modal Overlay */}
          {mobilePayloadOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-40 md:hidden"
              onClick={() => setMobilePayloadOpen(false)}
            />
          )}

          {/* Mobile Bottom Sheet */}
          {mobilePayloadOpen && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-background border-t border-border flex flex-col z-50 md:hidden"
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-2 flex-shrink-0">
                <div>
                  <div className="text-xs font-bold text-primary tracking-wider">PAYLOAD ARSENAL</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{payloads.length} payloads</div>
                </div>
                <button
                  onClick={() => setMobilePayloadOpen(false)}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-border/30">
                {payloads.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="group px-3 py-3 hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-foreground">{p.label}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopy(p.id, p.payload)}
                          className="text-muted-foreground hover:text-primary p-1"
                          data-testid={`copy-mobile-${p.id}`}
                        >
                          {copiedId === p.id ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => {
                            injectPayload(p.payload);
                            setMobilePayloadOpen(false);
                          }}
                          className="text-xs bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 hover:bg-primary hover:text-background transition-all"
                          data-testid={`inject-mobile-${p.id}`}
                        >
                          INJECT
                        </button>
                      </div>
                    </div>
                    {p.bypass && (
                      <span className="text-xs text-orange-400 border border-orange-400/30 px-1 mb-1 inline-block">BYPASS</span>
                    )}
                    <p className="text-xs text-muted-foreground leading-relaxed mb-1">{p.desc}</p>
                    <code className="text-xs text-primary/60 break-all">{p.payload.length > 80 ? p.payload.substring(0, 80) + "…" : p.payload}</code>
                  </motion.div>
                ))}
              </div>

              <div className="border-t border-border px-3 py-1.5 flex items-center justify-between flex-shrink-0 bg-card/30">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-green-500">●</span>
                  <span>TARGET LIVE</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="w-3 h-3 text-orange-400" />
                  <span>AUTH ONLY</span>
                </div>
              </div>
            </motion.div>
          )}
        </>
      </div>
    </div>
  );
}
