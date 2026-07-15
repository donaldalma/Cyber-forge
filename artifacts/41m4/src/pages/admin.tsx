import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Terminal, Plus, Pencil, Trash2, LogOut, X, AlertCircle, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { apiFetch, API_BASE_URL } from "@/lib/api";

const CATEGORIES = [
  "XSS", "SQLi", "CSRF", "LFI", "SSRF", "XXE", "RCE", "IDOR",
  "Open Redirect", "SSTI", "Path Traversal", "Command Injection",
];

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
  cve: string | null;
  views: number;
  createdAt: string;
}

interface PayloadForm {
  category: string;
  subcategory: string;
  title: string;
  payload: string;
  description: string;
  isBypass: boolean;
  bypassType: string;
  tags: string;
  platform: string;
  cve: string;
}

const emptyForm: PayloadForm = {
  category: "XSS",
  subcategory: "",
  title: "",
  payload: "",
  description: "",
  isBypass: false,
  bypassType: "",
  tags: "",
  platform: "",
  cve: "",
};

export default function Admin() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const [, setLocation] = useLocation();

  const [payloads, setPayloads] = useState<Payload[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PayloadForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const limit = 20;

  const fetchPayloads = useCallback(async (p: number) => {
    setLoading(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await apiFetch(`/api/payloads?page=${p}&limit=${limit}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch payloads");
      const data = await res.json();
      setPayloads(data.payloads);
      setTotal(data.meta.total);
    } catch {
      setError("Failed to load payloads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      setLocation("/admin/login");
    }
  }, [user, isAdmin, authLoading, setLocation]);

  useEffect(() => {
    if (user && isAdmin) fetchPayloads(page);
  }, [user, isAdmin, page, fetchPayloads]);

  if (authLoading || !user || !isAdmin) return null;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSaveError("");
    setDialogOpen(true);
  };

  const openEdit = (p: Payload) => {
    setEditingId(p.id);
    setForm({
      category: p.category,
      subcategory: p.subcategory,
      title: p.title,
      payload: p.payload,
      description: p.description,
      isBypass: p.isBypass,
      bypassType: p.bypassType ?? "",
      tags: p.tags.join(", "),
      platform: p.platform ?? "",
      cve: p.cve ?? "",
    });
    setSaveError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const body = {
        ...form,
        bypassType: form.bypassType || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        platform: form.platform || null,
        cve: form.cve || null,
      };

      const url = editingId ? `/api/payloads/${editingId}` : "/api/payloads";
      const method = editingId ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Save failed");
      }

      setDialogOpen(false);
      fetchPayloads(page);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await apiFetch(`/api/payloads/${deleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Delete failed");
      }

      setDeleteId(null);
      if (payloads.length === 1 && page > 1) setPage(page - 1);
      else fetchPayloads(page);
    } catch {
      // silently ignore
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <nav className="border-b border-border/50 p-4 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-2xl font-bold tracking-widest text-primary">ADMIN</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="text-muted-foreground hover:text-primary rounded-none text-xs tracking-wider">
              <Terminal className="w-3.5 h-3.5 mr-1.5" />[HOME]
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-destructive rounded-none text-xs tracking-wider">
              <LogOut className="w-3.5 h-3.5 mr-1.5" />[LOGOUT]
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-widest text-primary uppercase">Payload Management</h1>
            <p className="text-xs text-muted-foreground mt-1">Total: {total} payloads</p>
          </div>
          <Button onClick={openCreate} className="rounded-none bg-primary text-background hover:bg-primary/80 font-bold tracking-wider shadow-[0_0_15px_rgba(0,255,65,0.3)]">
            <Plus className="w-4 h-4 mr-2" />[ADD PAYLOAD]
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-xs border border-destructive/30 bg-destructive/10 p-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="border border-border/50 bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="text-xs tracking-widest text-muted-foreground font-mono">ID</TableHead>
                <TableHead className="text-xs tracking-widest text-muted-foreground font-mono">CATEGORY</TableHead>
                <TableHead className="text-xs tracking-widest text-muted-foreground font-mono">TITLE</TableHead>
                <TableHead className="text-xs tracking-widest text-muted-foreground font-mono">SUBCATEGORY</TableHead>
                <TableHead className="text-xs tracking-widest text-muted-foreground font-mono">PAYLOAD</TableHead>
                <TableHead className="text-xs tracking-widest text-muted-foreground font-mono">BYPASS</TableHead>
                <TableHead className="text-xs tracking-widest text-muted-foreground font-mono text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading payloads...
                  </TableCell>
                </TableRow>
              ) : payloads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No payloads found.
                  </TableCell>
                </TableRow>
              ) : (
                payloads.map((p) => (
                  <TableRow key={p.id} className="border-border/30 hover:bg-muted/30">
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-mono rounded-none border-primary/40 text-primary">
                        {p.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{p.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.subcategory}</TableCell>
                    <TableCell className="text-xs max-w-[250px] truncate font-mono text-muted-foreground">{p.payload}</TableCell>
                    <TableCell>
                      {p.isBypass ? (
                        <Badge variant="outline" className="text-xs rounded-none border-orange-400/40 text-orange-400">BYPASS</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)} className="h-7 px-2 text-xs text-muted-foreground hover:text-primary rounded-none">
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(p.id)} className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive rounded-none">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-none text-xs">
                PREV
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-none text-xs">
                NEXT
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border/50 max-w-2xl max-h-[90vh] overflow-y-auto rounded-none">
          <DialogHeader>
            <DialogTitle className="text-primary font-bold tracking-widest text-sm uppercase">
              {editingId ? `Edit Payload #${editingId}` : "Add New Payload"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs tracking-widest text-muted-foreground uppercase">Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger className="bg-background border-border/60 rounded-none font-mono text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/50 rounded-none">
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="font-mono text-sm rounded-none">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs tracking-widest text-muted-foreground uppercase">Subcategory *</Label>
                <Input
                  value={form.subcategory}
                  onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
                  className="bg-background border-border/60 rounded-none font-mono text-sm"
                  placeholder="e.g. Reflected, Auth Bypass"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs tracking-widest text-muted-foreground uppercase">Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="bg-background border-border/60 rounded-none font-mono text-sm"
                placeholder="e.g. Basic script alert"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs tracking-widest text-muted-foreground uppercase">Payload *</Label>
              <Textarea
                value={form.payload}
                onChange={(e) => setForm((f) => ({ ...f, payload: e.target.value }))}
                className="bg-background border-border/60 rounded-none font-mono text-sm min-h-[80px]"
                placeholder="The actual exploit payload"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs tracking-widest text-muted-foreground uppercase">Description *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="bg-background border-border/60 rounded-none font-mono text-sm min-h-[60px]"
                placeholder="What this payload does"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs tracking-widest text-muted-foreground uppercase">Tags</Label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  className="bg-background border-border/60 rounded-none font-mono text-sm"
                  placeholder="Comma-separated: xss, waf-bypass"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs tracking-widest text-muted-foreground uppercase">Platform</Label>
                <Input
                  value={form.platform}
                  onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                  className="bg-background border-border/60 rounded-none font-mono text-sm"
                  placeholder="e.g. Apache, PHP, Node.js"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 pt-6">
                <Checkbox
                  id="bypass"
                  checked={form.isBypass}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isBypass: v === true }))}
                />
                <Label htmlFor="bypass" className="text-xs tracking-widest text-muted-foreground uppercase cursor-pointer">
                  WAF Bypass
                </Label>
              </div>

              {form.isBypass && (
                <div className="space-y-1.5">
                  <Label className="text-xs tracking-widest text-muted-foreground uppercase">Bypass Type</Label>
                  <Input
                    value={form.bypassType}
                    onChange={(e) => setForm((f) => ({ ...f, bypassType: e.target.value }))}
                    className="bg-background border-border/60 rounded-none font-mono text-sm"
                    placeholder="e.g. ModSecurity, Cloudflare"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs tracking-widest text-muted-foreground uppercase">CVE</Label>
              <Input
                value={form.cve}
                onChange={(e) => setForm((f) => ({ ...f, cve: e.target.value }))}
                className="bg-background border-border/60 rounded-none font-mono text-sm"
                placeholder="e.g. CVE-2024-12345"
              />
            </div>

            {saveError && (
              <div className="flex items-center gap-2 text-destructive text-xs border border-destructive/30 bg-destructive/10 p-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-none text-xs" disabled={saving}>
              CANCEL
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.title || !form.payload || !form.subcategory || !form.description} className="rounded-none bg-primary text-background hover:bg-primary/80 font-bold tracking-wider text-xs">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingId ? "[UPDATE]" : "[CREATE]"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <DialogContent className="bg-card border-border/50 rounded-none max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive font-bold tracking-widest text-sm uppercase">Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete payload? <span className="text-primary font-mono">#{deleteId}</span>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="rounded-none text-xs" disabled={deleting}>
              CANCEL
            </Button>
            <Button onClick={handleDelete} disabled={deleting} className="rounded-none bg-destructive text-white hover:bg-destructive/80 font-bold tracking-wider text-xs">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              [DELETE]
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
