import { useState } from "react";
import { useLocation } from "wouter";
import { Terminal, Lock, User, Mail, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Register() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      setSuccess(true);
      setTimeout(() => setLocation("/"), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex flex-col">
      <nav className="border-b border-border/50 p-4 bg-background/90 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => setLocation("/")} className="text-2xl font-bold tracking-widest text-primary hover:opacity-80">41M4</button>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="border border-primary shadow-[0_0_30px_rgba(0,255,65,0.15)] bg-card">
            <div className="bg-primary/20 border-b border-primary p-3 flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
              <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full" />
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
              <span className="ml-3 text-xs text-primary font-bold tracking-widest">auth@41m4:~/register</span>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3">
                <Terminal className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold tracking-widest text-primary uppercase">Create Account</h1>
              </div>

              <div className="text-muted-foreground text-xs space-y-1 border border-border/40 bg-background/30 p-3">
                <div><span className="text-primary">$</span> Initializing new operator profile</div>
                <div><span className="text-primary">$</span> Enter credentials to proceed</div>
              </div>

              {success ? (
                <div className="flex items-center gap-3 text-primary border border-primary/40 bg-primary/10 p-4">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="font-bold">Account created.</div>
                    <div className="text-xs text-muted-foreground">Redirecting to home...</div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="username" className="text-xs tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                      <User className="w-3.5 h-3.5" /> Username
                    </Label>
                    <Input
                      id="username"
                      required
                      minLength={3}
                      maxLength={30}
                      pattern="[a-zA-Z0-9_-]+"
                      value={form.username}
                      onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                      className="bg-background border-border/60 focus-visible:ring-primary focus-visible:border-primary rounded-none font-mono text-sm"
                      placeholder="h4ck3r_h4nd1e"
                    />
                    <p className="text-xs text-muted-foreground">Letters, numbers, _ and - only (3–30 chars)</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" /> Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                      className="bg-background border-border/60 focus-visible:ring-primary focus-visible:border-primary rounded-none font-mono text-sm"
                      placeholder="user@domain.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5" /> Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={8}
                      value={form.password}
                      onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                      className="bg-background border-border/60 focus-visible:ring-primary focus-visible:border-primary rounded-none font-mono text-sm"
                      placeholder="Min 8 characters"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm" className="text-xs tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5" /> Confirm Password
                    </Label>
                    <Input
                      id="confirm"
                      type="password"
                      required
                      value={form.confirm}
                      onChange={(e) => setForm(f => ({ ...f, confirm: e.target.value }))}
                      className="bg-background border-border/60 focus-visible:ring-primary focus-visible:border-primary rounded-none font-mono text-sm"
                      placeholder="Repeat password"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-destructive text-xs border border-destructive/30 bg-destructive/10 p-3">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-none bg-primary text-background hover:bg-primary/80 font-bold tracking-widest shadow-[0_0_15px_rgba(0,255,65,0.3)]"
                  >
                    {loading ? "CREATING ACCOUNT..." : "[CREATE ACCOUNT]"}
                  </Button>
                </form>
              )}

              <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border/40">
                Already registered? Please return to the home page.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
