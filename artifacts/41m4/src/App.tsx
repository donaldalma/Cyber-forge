import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Arsenal from "@/pages/arsenal";
import Lab from "@/pages/lab";
import LabXss from "@/pages/lab-xss";
import LabSqli from "@/pages/lab-sqli";
import LabCsrf from "@/pages/lab-csrf";
import LabLfi from "@/pages/lab-lfi";
import LabSsrf from "@/pages/lab-ssrf";
import LabXxe from "@/pages/lab-xxe";
import Docs from "@/pages/docs";
import ApiReference from "@/pages/api-reference";
import AdminLogin from "@/pages/admin-login";
import Admin from "@/pages/admin";

const queryClient = new QueryClient();

function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/arsenal" component={Arsenal} />
      <Route path="/docs" component={Docs} />
      <Route path="/api-reference" component={ApiReference} />
      <Route path="/lab" component={Lab} />
      <Route path="/lab/" component={Lab} />
      <Route path="/lab/xss" component={LabXss} />
      <Route path="/lab/sqli" component={LabSqli} />
      <Route path="/lab/csrf" component={LabCsrf} />
      <Route path="/lab/lfi" component={LabLfi} />
      <Route path="/lab/ssrf" component={LabSsrf} />
      <Route path="/lab/xxe" component={LabXxe} />
      <Route path="/lab/:rest*" component={Lab} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <ScrollToTop />
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
