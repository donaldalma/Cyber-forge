import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Copy, Check, ChevronRight, Search, Filter, BookOpen, Code2, FlaskConical, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Payload {
  id: number;
  category: string;
  subcategory: string;
  title: string;
  payload: string;
  description: string;
  isBypass: boolean;
  bypassType: string | null;
  tags: string[];
  platform: string | null;
}

interface Stats {
  total: number;
  bypassCount: number;
  byCategory: { category: string; count: number }[];
}

const CATEGORIES = ["ALL", "XSS", "SQLi", "LFI", "SSRF", "XXE", "RCE", "CSRF", "IDOR", "Open Redirect", "SSTI", "Command Injection"];

export default function Arsenal() {
  const [, setLocation] = useLocation();
  const [payloads, setPayloads] = useState<Payload[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [bypassOnly, setBypassOnly] = useState(false);
  const [selectedPayload, setSelectedPayload] = useState<Payload | null>(null);

  useEffect(() => {
    fetch("/api/payloads/stats/overview")
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const fetchPayloads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCategory !== "ALL") params.set("category", activeCategory);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (bypassOnly) params.set("bypass", "true");
      params.set("page", "1");
      params.set("limit", "100");
      const first = await fetch(`/api/payloads?${params}`);
      const firstData = await first.json();
      let allPayloads: Payload[] = firstData.payloads ?? [];
      const totalPages = firstData.meta?.pages ?? 1;
      for (let p = 2; p <= totalPages; p++) {
        params.set("page", String(p));
        const r = await fetch(`/api/payloads?${params}`);
        const d = await r.json();
        if (Array.isArray(d.payloads) && d.payloads.length > 0) {
          allPayloads = allPayloads.concat(d.payloads);
        }
      }
      setPayloads(allPayloads);
      setTotal(firstData.meta?.total ?? allPayloads.length);
    } catch {
      setPayloads([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, searchQuery, bypassOnly]);

  useEffect(() => {
    fetchPayloads();
  }, [fetchPayloads]);

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-mono">
      {/* Navbar */}
      <nav className="border-b border-border/50 p-4 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/")} className="text-2xl font-bold tracking-widest text-primary shrink-0">41M4</button>
            <span className="text-border text-sm">/</span>
            <span className="text-xs text-muted-foreground tracking-widest">ARSENAL</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/docs")} className="text-muted-foreground hover:text-primary rounded-none text-xs tracking-wider">
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />[DOCS]
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/lab")} className="text-orange-400 hover:text-orange-300 hover:bg-orange-400/10 rounded-none border border-orange-400/40 text-xs tracking-wider">
              <FlaskConical className="w-3.5 h-3.5 mr-1.5" />[ATTACK BOX]
            </Button>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="py-12 px-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
          <button onClick={() => setLocation("/")} className="hover:text-primary transition-colors">home</button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-primary">payload-arsenal</span>
        </div>

        <div className="flex items-center gap-3 text-primary mb-2">
          <Terminal className="w-6 h-6" />
          <h1 className="text-3xl font-bold tracking-widest uppercase">Payload Arsenal</h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-2xl mb-8">
          Searchable database of hand-curated security research payloads. Filter by category, search by keyword, and identify WAF bypass techniques.
        </p>

        {/* Mini Stats */}
        {stats && (
          <div className="flex gap-6 mb-8 text-xs">
            <span className="text-muted-foreground">Total: <strong className="text-primary">{stats.total}</strong></span>
            <span className="text-muted-foreground">Categories: <strong className="text-primary">{stats.byCategory.length}</strong></span>
            <span className="text-muted-foreground">Bypasses: <strong className="text-purple-400">{stats.bypassCount}</strong></span>
          </div>
        )}

        {/* Search + Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 bg-card border-border/60 focus-visible:ring-primary rounded-none font-mono"
              placeholder="Search payloads, techniques, CVEs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setBypassOnly(b => !b)}
            className={`rounded-none border-border/60 gap-2 ${bypassOnly ? "border-primary text-primary bg-primary/10" : "text-muted-foreground"}`}
          >
            <Filter className="w-4 h-4" />
            {bypassOnly ? "BYPASS ONLY" : "SHOW BYPASS"}
          </Button>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs px-3 py-1.5 tracking-wider border transition-colors rounded-none ${
                activeCategory === cat
                  ? "bg-primary text-background border-primary"
                  : "border-primary/30 text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results count */}
        {total > 0 && !loading && (
          <div className="text-xs text-muted-foreground mb-4">{total} result{total !== 1 ? "s" : ""}</div>
        )}
      </section>

      {/* Payload Grid */}
      <section className="px-4 pb-16 max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border border-border/30 bg-card h-40 animate-pulse" />
            ))}
          </div>
        ) : payloads.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border border-dashed border-border/50">
            <Terminal className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <div className="tracking-widest">NO_PAYLOADS_FOUND</div>
            <div className="text-xs mt-2">Try a different search or category</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {payloads.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <Card
                    className="bg-card border-border/50 rounded-none group hover:border-primary/50 transition-colors cursor-pointer h-full flex flex-col"
                    onClick={() => setSelectedPayload(p)}
                  >
                    <CardContent className="p-4 flex-1 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="rounded-none border-primary/40 text-primary bg-primary/10 text-xs">{p.category}</Badge>
                          {p.isBypass && <Badge variant="outline" className="rounded-none text-xs border-purple-500/40 text-purple-400 bg-purple-500/10">BYPASS</Badge>}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-none opacity-0 group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); handleCopy(p.id, p.payload); }}
                        >
                          {copiedId === p.id ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                      <div className="text-xs font-semibold text-foreground/80 tracking-wide">{p.title}</div>
                      <div className="bg-background/60 border border-border/30 p-2.5 flex-1 overflow-hidden relative">
                        <pre className="text-xs text-primary/80 font-mono whitespace-nowrap overflow-hidden text-ellipsis">{p.payload}</pre>
                        <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background/60 to-transparent" />
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{p.description}</div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Payload Detail Modal */}
      <AnimatePresence>
        {selectedPayload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPayload(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="border border-primary bg-card max-w-2xl w-full shadow-[0_0_40px_rgba(0,255,65,0.2)] max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-primary/15 border-b border-primary p-3 flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full" />
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                <span className="ml-2 text-xs text-primary font-bold tracking-widest flex-1">{selectedPayload.category} // {selectedPayload.subcategory}</span>
                <button onClick={() => setSelectedPayload(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-primary mb-2">{selectedPayload.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPayload.isBypass && (
                      <Badge variant="outline" className="rounded-none text-xs border-purple-500/40 text-purple-400">
                        BYPASS{selectedPayload.bypassType ? `: ${selectedPayload.bypassType}` : ""}
                      </Badge>
                    )}
                    {selectedPayload.platform && (
                      <Badge variant="outline" className="rounded-none text-xs border-blue-500/40 text-blue-400">{selectedPayload.platform}</Badge>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs tracking-widest text-muted-foreground uppercase mb-2">Payload</div>
                  <div className="relative bg-background border border-primary/40 p-4 group">
                    <pre className="text-sm text-primary font-mono whitespace-pre-wrap break-all">{selectedPayload.payload}</pre>
                    <button
                      onClick={() => handleCopy(selectedPayload.id, selectedPayload.payload)}
                      className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copiedId === selectedPayload.id ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-xs tracking-widest text-muted-foreground uppercase mb-2">Description</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedPayload.description}</p>
                </div>

                {selectedPayload.tags.length > 0 && (
                  <div>
                    <div className="text-xs tracking-widest text-muted-foreground uppercase mb-2">Tags</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPayload.tags.map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 border border-border/40 text-muted-foreground">#{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-border/40">
                  <Button
                    className="flex-1 rounded-none bg-primary text-background hover:bg-primary/80 font-bold"
                    onClick={() => handleCopy(selectedPayload.id, selectedPayload.payload)}
                  >
                    {copiedId === selectedPayload.id ? <><Check className="w-4 h-4 mr-2" /> COPIED</> : <><Copy className="w-4 h-4 mr-2" /> COPY PAYLOAD</>}
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedPayload(null)} className="rounded-none border-border/60">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
