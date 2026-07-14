import { useState } from "react";
import { useLocation } from "wouter";
import { Terminal, Lock, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";

export default function AdminLogin() {
  const { signIn, user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user && isAdmin) {
    setLocation("/admin");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setLocation("/admin");
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
              <span className="ml-3 text-xs text-primary font-bold tracking-widest">admin@41m4:~/login</span>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3">
                <Terminal className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold tracking-widest text-primary uppercase">Admin Access</h1>
              </div>

              <div className="text-muted-foreground text-xs space-y-1 border border-border/40 bg-background/30 p-3">
                <div><span className="text-primary">$</span> Restricted area — admin credentials required</div>
                <div><span className="text-primary">$</span> Unauthorized access is prohibited</div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background border-border/60 focus-visible:ring-primary focus-visible:border-primary rounded-none font-mono text-sm"
                    placeholder="admin@domain.com"
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
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background border-border/60 focus-visible:ring-primary focus-visible:border-primary rounded-none font-mono text-sm"
                    placeholder="••••••••"
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
                  {loading ? "AUTHENTICATING..." : "[AUTHENTICATE]"}
                </Button>
              </form>

              <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border/40">
                <button onClick={() => setLocation("/")} className="text-primary hover:underline">
                  [BACK TO HOME]
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
