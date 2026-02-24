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
import { RealtimeProvider } from "@/context/realtime-context";
import { lazy, Suspense } from "react";
import { PageSkeleton } from "@/components/skeletons";
import { Navigate, useParams } from "react-router-dom";

// Helper component to handle dynamic redirects with params
const DynamicRedirect = ({ to }: { to: string }) => {
  const params = useParams();
  let target = to;
  Object.entries(params).forEach(([key, value]) => {
    target = target.replace(`:${key}`, value || "");
  });
  return <Navigate to={target} replace />;
};

const Welcome = lazy(() => import("./pages/Welcome"));
const Auth = lazy(() => import("./pages/Auth"));
const Events = lazy(() => import("./pages/Events"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const BatchAthleteImport = lazy(() => import("./pages/BatchAthleteImport"));
const RegistrationOptions = lazy(() => import("./pages/RegistrationOptions"));
const AthleteRegistrationForm = lazy(() => import("./pages/AthleteRegistrationForm"));
const DivisionImport = lazy(() => import("./pages/DivisionImport"));
const FightDetail = lazy(() => import("./pages/FightDetail"));
const PrintBrackets = lazy(() => import("./pages/PrintBrackets"));
const CreateEvent = lazy(() => import("./pages/CreateEvent"));
const AccountSecurity = lazy(() => import("./pages/AccountSecurity"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PublicEvent = lazy(() => import("./pages/PublicEvent"));
const PublicRegistration = lazy(() => import("./pages/PublicRegistration"));
const Profile = lazy(() => import("./pages/Profile"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
// Staff pages
const StaffAccess = lazy(() => import("./pages/StaffAccess"));
const StaffCheckIn = lazy(() => import("./pages/StaffCheckIn"));
const StaffBracket = lazy(() => import("./pages/StaffBracket"));
const StaffResults = lazy(() => import("./pages/StaffResults"));
const StaffFightDetail = lazy(() => import("./pages/StaffFightDetail"));

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
            <RealtimeProvider>
              <LayoutSettingsProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner position="top-right" />
                <BrowserRouter>
                  <Suspense fallback={<PageSkeleton />}>
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
                    <Route path="/p/events/:id" element={<PublicEvent />} />
                    <Route path="/p/events/:id/register" element={<PublicRegistration />} />
                    {/* Alinhando links com a gerência atual, suportando alias */}
                    <Route path="/p/register/:id" element={<PublicRegistration />} />
                    <Route path="/change-password" element={<ChangePassword />} />
                    
                    {/* Redirects for legacy/incorrect /public/ links */}
                    <Route path="/public/events/:id" element={<DynamicRedirect to="/p/events/:id" />} />
                    <Route path="/public/events/:id/register" element={<DynamicRedirect to="/p/events/:id/register" />} />
                    <Route path="/public/register/:id" element={<DynamicRedirect to="/p/register/:id" />} />
                    {/* Staff routes */}
                    <Route path="/staff/:eventId/:token" element={<StaffAccess />} />
                    <Route path="/staff/:eventId/check-in/:token" element={<StaffCheckIn />} />
                    <Route path="/staff/:eventId/check_in/:token" element={<StaffCheckIn />} />
                    <Route path="/staff/:eventId/bracket/:token" element={<StaffBracket />} />
                    <Route path="/staff/:eventId/bracket/:token/fight/:divisionId/:matchId" element={<StaffFightDetail />} />
                    <Route path="/staff/:eventId/results/:token" element={<StaffResults />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </TooltipProvider>
              </LayoutSettingsProvider>
            </RealtimeProvider>
          </OfflineProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;