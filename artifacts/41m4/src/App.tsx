import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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

const queryClient = new QueryClient();

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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
