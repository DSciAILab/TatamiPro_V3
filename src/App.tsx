import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import BatchAthleteImport from "./pages/BatchAthleteImport";
import RegistrationOptions from "./pages/RegistrationOptions"; // Novo import
import AthleteRegistrationForm from "./components/AthleteRegistrationForm"; // Importar o formulário diretamente para a rota
import DivisionImport from "./pages/DivisionImport"; // Novo import para importação de divisões
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/events/:id/registration-options" element={<RegistrationOptions />} /> {/* Nova rota para opções de registro */}
            <Route path="/events/:id/register-athlete" element={<AthleteRegistrationForm eventId={""} onRegister={() => {}} />} /> {/* Rota para registro individual */}
            <Route path="/events/:id/import-athletes" element={<BatchAthleteImport />} />
            <Route path="/events/:id/import-divisions" element={<DivisionImport />} /> {/* Nova rota para importação de divisões */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;