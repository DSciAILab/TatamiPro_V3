import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/context/language-context";
import { AuthProvider } from "@/context/auth-context";
import { LayoutSettingsProvider } from "@/context/layout-settings-context";
import { OfflineProvider } from "@/context/offline-context";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import BatchAthleteImport from "./pages/BatchAthleteImport";
import RegistrationOptions from "./pages/RegistrationOptions";
import AthleteRegistrationForm from "./pages/AthleteRegistrationForm";
import DivisionImport from "./pages/DivisionImport";
import FightDetail from "./pages/FightDetail";
import PrintBrackets from "./pages/PrintBrackets";
import CreateEvent from "./pages/CreateEvent";
import AccountSecurity from "./pages/AccountSecurity";
import NotFound from "./pages/NotFound";
import PublicEvent from "./pages/PublicEvent";
import PublicRegistration from "./pages/PublicRegistration";
import Profile from "./pages/Profile";
import ChangePassword from "./pages/ChangePassword";
// Staff pages
import StaffAccess from "./pages/StaffAccess";
import StaffCheckIn from "./pages/StaffCheckIn";
import StaffBracket from "./pages/StaffBracket";
import StaffResults from "./pages/StaffResults";
import StaffFightDetail from "./pages/StaffFightDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="vite-ui-theme"
    >
      <LanguageProvider>
        <AuthProvider>
          <OfflineProvider> 
            <LayoutSettingsProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Welcome />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/events/create" element={<CreateEvent />} />
                    <Route path="/events/:id" element={<EventDetail />} />
                    <Route path="/events/:id/registration-options" element={<RegistrationOptions />} />
                    <Route path="/events/:id/register-athlete" element={<AthleteRegistrationForm />} />
                    <Route path="/events/:id/import-athletes" element={<BatchAthleteImport />} />
                    <Route path="/events/:id/import-divisions" element={<DivisionImport />} />
                    <Route path="/events/:eventId/fights/:divisionId/:matchId" element={<FightDetail />} />
                    <Route path="/events/:eventId/print-brackets" element={<PrintBrackets />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/account-security" element={<AccountSecurity />} />
                    <Route path="/public/events/:id" element={<PublicEvent />} />
                    <Route path="/public/events/:id/register" element={<PublicRegistration />} />
                    <Route path="/change-password" element={<ChangePassword />} />
                    {/* Staff routes */}
                    <Route path="/staff/:eventId/:token" element={<StaffAccess />} />
                    <Route path="/staff/:eventId/check-in/:token" element={<StaffCheckIn />} />
                    <Route path="/staff/:eventId/bracket/:token" element={<StaffBracket />} />
                    <Route path="/staff/:eventId/bracket/:token/fight/:divisionId/:matchId" element={<StaffFightDetail />} />
                    <Route path="/staff/:eventId/results/:token" element={<StaffResults />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </LayoutSettingsProvider>
          </OfflineProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;