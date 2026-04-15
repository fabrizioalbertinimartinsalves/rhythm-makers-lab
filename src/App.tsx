import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner, toast } from "sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { TenantProvider } from "@/contexts/TenantContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import InstallPrompt from "@/components/InstallPrompt";
import React, { lazy, Suspense, useEffect, useMemo } from "react";
import RoleRedirect from "@/components/RoleRedirect";
import { LoadingFullPage } from "./components/LoadingFullPage";
import StudentOnboardingGuard from "./components/StudentOnboardingGuard";
import { PushNotificationService } from "@/services/PushNotificationService";
import { UpdateService } from "@/services/UpdateService";

// Lazy imports for pages
const Index = lazy(() => import("@/pages/Index"));
const Login = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const TrialClassForm = lazy(() => import("@/pages/TrialClassForm"));
const PreMatriculaForm = lazy(() => import("@/pages/PreMatriculaForm"));
const PublicBooking = lazy(() => import("@/pages/PublicBooking"));
const ShareTurmas = lazy(() => import("@/pages/ShareTurmas"));
const Contact = lazy(() => import("@/pages/Contact"));
const BlockedAccess = lazy(() => import("@/pages/BlockedAccess"));
const PublicTicket = lazy(() => import("@/pages/PublicTicket"));
const PaymentSuccess = lazy(() => import("@/pages/public/PaymentSuccess"));

const SuperAdminDashboard = lazy(() => import("@/pages/superadmin/Dashboard"));
const SuperAdminOrganizations = lazy(() => import("@/pages/superadmin/Organizations"));
const SuperAdminPlans = lazy(() => import("@/pages/superadmin/Plans"));
const SuperAdminUsers = lazy(() => import("@/pages/superadmin/Users"));
const SuperAdminFeatures = lazy(() => import("@/pages/superadmin/Features"));
const CasualSales = lazy(() => import("@/pages/admin/CasualSales"));
const SuperAdminSettings = lazy(() => import("@/pages/superadmin/Settings"));
const LoginBranding = lazy(() => import("@/pages/superadmin/LoginBranding"));
const LandingEditor = lazy(() => import("@/pages/superadmin/LandingEditor"));
const SuperAdminBilling = lazy(() => import("@/pages/superadmin/Billing"));
const DatabaseManager = lazy(() => import("@/pages/superadmin/DatabaseManager"));
const Registration = lazy(() => import("@/pages/Registration"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const DynamicPage = lazy(() => import("@/pages/DynamicPage"));
const ExperimentalPage = lazy(() => import("@/pages/ExperimentalPage"));
const EnrollmentPage = lazy(() => import("@/pages/EnrollmentPage"));

const PageManager = lazy(() => import("@/pages/superadmin/PageManager"));
const VisualPageEditor = lazy(() => import("@/pages/superadmin/VisualPageEditor"));

// Admin
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Schedule = lazy(() => import("./pages/admin/Schedule"));
const Students = lazy(() => import("./pages/admin/Students"));
const Plans = lazy(() => import("./pages/admin/Plans"));
const FinancialManagement = lazy(() => import("./pages/admin/FinancialManagement"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const Modalities = lazy(() => import("./pages/admin/Modalities"));
const ExperimentalLeads = lazy(() => import("./pages/admin/ExperimentalLeads"));
const HybridSchedule = lazy(() => import("./pages/admin/HybridSchedule"));
const HybridCheckIn = lazy(() => import("./pages/admin/HybridCheckIn"));
const Classes = lazy(() => import("./pages/admin/Classes"));
const Contracts = lazy(() => import("./pages/admin/Contracts"));
const Store = lazy(() => import("./pages/admin/Store"));
const PDV = lazy(() => import("./pages/admin/PDV"));
const CRM = lazy(() => import("./pages/admin/CRM"));
const PreMatriculas = lazy(() => import("./pages/admin/PreMatriculas"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const Notices = lazy(() => import("./pages/admin/Notices"));
const Bookings = lazy(() => import("./pages/admin/Bookings"));
const Integrations = lazy(() => import("./pages/admin/Integrations"));
const LTV = lazy(() => import("./pages/admin/LTV"));
const InstructorPayments = lazy(() => import("./pages/admin/InstructorPayments"));
const Instructors = lazy(() => import("./pages/admin/Instructors"));
const Partners = lazy(() => import("./pages/admin/Partners"));
const Festivals = lazy(() => import("@/pages/admin/Festivals"));
const Costumes = lazy(() => import("./pages/admin/Costumes"));
const AdminManual = lazy(() => import("./pages/admin/AdminManual"));


// Instructor
const InstructorHome = lazy(() => import("./pages/instructor/InstructorHome"));
const Attendance = lazy(() => import("./pages/instructor/Attendance"));
const Records = lazy(() => import("./pages/instructor/Records"));
const Assessments = lazy(() => import("./pages/instructor/Assessments"));
const InstructorNotices = lazy(() => import("./pages/instructor/Notices"));
const InstructorSettings = lazy(() => import("./pages/instructor/Settings"));
const InstructorCheckIn = lazy(() => import("./pages/instructor/CheckIn"));

// Student
const StudentHome = lazy(() => import("./pages/student/StudentHome"));
const Booking = lazy(() => import("./pages/student/Booking"));
const Progress = lazy(() => import("./pages/student/Progress"));
const Messages = lazy(() => import("./pages/student/Messages"));
const StudentFinancial = lazy(() => import("./pages/student/StudentFinancial"));
const Profile = lazy(() => import("./pages/student/Profile"));
const Documents = lazy(() => import("./pages/student/Documents"));


// Error Boundary Simples para evitar tela branca total
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string | null; stack: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, stack: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message, stack: error.stack };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    
    // AUTO-CURA: Se o erro for de carregamento de arquivo (comum pós-deploy)
    // tentamos recarregar a página automaticamente uma vez.
    const isChunkError = 
      error.name === 'ChunkLoadError' || 
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('loading chunk');
      
    if (isChunkError) {
      const lastReload = sessionStorage.getItem('kineos_last_chunk_reload');
      const now = Date.now();
      
      // Só recarrega se não tiver tentado nos últimos 10 segundos (evita loop)
      if (!lastReload || now - parseInt(lastReload) > 10000) {
        sessionStorage.setItem('kineos_last_chunk_reload', now.toString());
        console.warn("Detectado erro de cache/build. Forçando recarregamento...");
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="h-20 w-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl font-bold">!</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2 mt-4 uppercase italic">Algo deu errado ao carregar o Kineos</h1>
            <p className="text-slate-500 mb-8 font-medium">Tente atualizar a página. Se o erro persistir, use o botão abaixo para limpar o cache e tentar novamente.</p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }}
                className="px-8 py-3 bg-[#3F936C] text-white rounded-2xl font-bold shadow-lg shadow-green-900/10 hover:brightness-110 transition-all active:scale-95"
              >
                Limpar Cache e Sincronizar
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
              >
                Tentar Novamente
              </button>
            </div>
            {/* Debug info hidden in production unless specifically requested by support */}
            <div className="mt-8 pt-6 border-t border-slate-50">
              <p className="text-[8px] text-slate-300 font-mono tracking-tighter opacity-50 hover:opacity-100 transition-opacity">
                Build: v1.8.2-final | Error: {this.state.error} | Stack: {this.state.stack?.slice(0, 200)}...
              </p>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

const AppContent = () => {
  const { loading, isLoaded } = useAuth();

  // Cache breaker: force exactly one reload if the app version is old
  // This ensures the PWA Service Worker is refreshed with the new branding code.
  useEffect(() => {
    const CURRENT_VERSION = "3.2.5";
    const savedVersion = localStorage.getItem("kineos_app_version");
    if (savedVersion !== CURRENT_VERSION) {
      localStorage.setItem("kineos_app_version", CURRENT_VERSION);
      // Removido console.log para limpar build
      setTimeout(() => window.location.reload(), 200);
    } else {
      toast.info("Sistema v1.8.6-reactive ativo", { icon: "🚀", duration: 3000 });
    }
    
    // Initialize Push Notifications
    PushNotificationService.initialize();
    
    // Check for Live Updates (OTA)
    // Pedimos permissão primeiro e aguardamos um pouco para carregar os plugins
    const initOTA = async () => {
      await UpdateService.requestPermissions();
      setTimeout(() => {
        UpdateService.checkForUpdates();
      }, 2000); 
    };
    initOTA();
  }, []);

  if (loading || !isLoaded) {
    return <LoadingFullPage />;
  }

  return (
    <Suspense fallback={<LoadingFullPage />}>
      <InstallPrompt />
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Navigate to="/contato" replace />} />
        <Route path="/contato" element={<Contact />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/recover-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/aula-experimental" element={<Navigate to={`/experimental${window.location.search}`} replace />} />
        <Route path="/pre-matricula" element={<Navigate to={`/matricula${window.location.search}`} replace />} />
        <Route path="/agendar" element={<PublicBooking />} />
        <Route path="/marcar/:slug" element={<PublicBooking />} />
        <Route path="/turmas" element={<ShareTurmas />} />
        <Route path="/blocked" element={<BlockedAccess />} />
        <Route path="/ticket/:id" element={<PublicTicket />} />
        <Route path="/experimental" element={<ExperimentalPage />} />
        <Route path="/matricula" element={<EnrollmentPage />} />
        <Route path="/success" element={<PaymentSuccess />} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><Dashboard /></ProtectedRoute>} />
        <Route path="/admin/modalities" element={<ProtectedRoute allowedRoles={["admin"]}><Modalities /></ProtectedRoute>} />
        <Route path="/admin/experimentos" element={<ProtectedRoute allowedRoles={["admin"]}><ExperimentalLeads /></ProtectedRoute>} />
        <Route path="/admin/hybrid-schedule" element={<ProtectedRoute allowedRoles={["admin"]}><HybridSchedule /></ProtectedRoute>} />
        <Route path="/admin/checkin" element={<ProtectedRoute allowedRoles={["admin"]}><HybridCheckIn /></ProtectedRoute>} />
        <Route path="/admin/classes" element={<ProtectedRoute allowedRoles={["admin"]}><Classes /></ProtectedRoute>} />
        <Route path="/admin/schedule" element={<ProtectedRoute allowedRoles={["admin"]}><Schedule /></ProtectedRoute>} />
        <Route path="/admin/students" element={<ProtectedRoute allowedRoles={["admin"]}><Students /></ProtectedRoute>} />
        <Route path="/admin/plans" element={<ProtectedRoute allowedRoles={["admin"]}><Plans /></ProtectedRoute>} />
        <Route path="/admin/financial" element={<ProtectedRoute allowedRoles={["admin"]}><FinancialManagement /></ProtectedRoute>} />
        <Route path="/admin/vendas" element={<ProtectedRoute allowedRoles={["admin"]}><CasualSales /></ProtectedRoute>} />
        <Route path="/admin/contracts" element={<ProtectedRoute allowedRoles={["admin"]}><Contracts /></ProtectedRoute>} />
        <Route path="/admin/store" element={<ProtectedRoute allowedRoles={["admin"]}><Store /></ProtectedRoute>} />
        <Route path="/admin/pdv" element={<ProtectedRoute allowedRoles={["admin"]}><PDV /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={["admin"]}><Reports /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={["admin"]}><SettingsPage /></ProtectedRoute>} />
        <Route path="/admin/crm" element={<ProtectedRoute allowedRoles={["admin"]}><CRM /></ProtectedRoute>} />
        <Route path="/admin/pre-matriculas" element={<ProtectedRoute allowedRoles={["admin"]}><PreMatriculas /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["admin"]}><UserManagement /></ProtectedRoute>} />
        <Route path="/admin/notices" element={<ProtectedRoute allowedRoles={["admin"]}><Notices /></ProtectedRoute>} />
        <Route path="/admin/bookings" element={<ProtectedRoute allowedRoles={["admin"]}><Bookings /></ProtectedRoute>} />
        <Route path="/admin/integrations" element={<ProtectedRoute allowedRoles={["admin"]}><Integrations /></ProtectedRoute>} />
        <Route path="/admin/ltv" element={<ProtectedRoute allowedRoles={["admin"]}><LTV /></ProtectedRoute>} />
        <Route path="/admin/instructor-payments" element={<ProtectedRoute allowedRoles={["admin"]}><InstructorPayments /></ProtectedRoute>} />
        <Route path="/admin/instructors" element={<ProtectedRoute allowedRoles={["admin"]}><Instructors /></ProtectedRoute>} />
        <Route path="/admin/partners" element={<ProtectedRoute allowedRoles={["admin"]}><Partners /></ProtectedRoute>} />
        <Route path="/admin/festivals" element={<ProtectedRoute allowedRoles={["admin"]}><Festivals /></ProtectedRoute>} />
        <Route path="/admin/costumes" element={<ProtectedRoute allowedRoles={["admin"]}><Costumes /></ProtectedRoute>} />
        <Route path="/admin/manual" element={<ProtectedRoute allowedRoles={["admin"]}><AdminManual /></ProtectedRoute>} />


        {/* Super Admin */}
        <Route path="/superadmin" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminDashboard /></ProtectedRoute>} />
        <Route path="/superadmin/organizations" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminOrganizations /></ProtectedRoute>} />
        <Route path="/superadmin/plans" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminPlans /></ProtectedRoute>} />
        <Route path="/superadmin/users" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminUsers /></ProtectedRoute>} />
        <Route path="/superadmin/features" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminFeatures /></ProtectedRoute>} />
        <Route path="/superadmin/settings" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminSettings /></ProtectedRoute>} />
        <Route path="/superadmin/login-branding" element={<ProtectedRoute allowedRoles={["superadmin"]}><LoginBranding /></ProtectedRoute>} />
        <Route path="/superadmin/landing" element={<ProtectedRoute allowedRoles={["superadmin"]}><LandingEditor /></ProtectedRoute>} />
        <Route path="/superadmin/pages" element={<ProtectedRoute allowedRoles={["superadmin"]}><PageManager /></ProtectedRoute>} />
        <Route path="/superadmin/pages/:slug" element={<ProtectedRoute allowedRoles={["superadmin"]}><VisualPageEditor /></ProtectedRoute>} />
        <Route path="/superadmin/billing" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminBilling /></ProtectedRoute>} />
        <Route path="/superadmin/database" element={<ProtectedRoute allowedRoles={["superadmin"]}><DatabaseManager /></ProtectedRoute>} />
        <Route path="/cadastro" element={<Registration />} />
        <Route path="/landing" element={<LandingPage />} />
        
        {/* Dynamic Pages */}
        <Route path="/sobre" element={<DynamicPage />} />
        <Route path="/blog" element={<DynamicPage />} />
        <Route path="/carreiras" element={<DynamicPage />} />
        <Route path="/ajuda" element={<DynamicPage />} />
        <Route path="/status" element={<DynamicPage />} />
        <Route path="/privacidade" element={<DynamicPage />} />
        <Route path="/whatsapp" element={<DynamicPage />} />
        <Route path="/s/:slug" element={<DynamicPage />} /> {/* Fallback and custom slugs */}

        {/* Instructor */}
        <Route path="/instructor" element={<ProtectedRoute allowedRoles={["admin", "instructor"]}><InstructorHome /></ProtectedRoute>} />
        <Route path="/instructor/attendance" element={<ProtectedRoute allowedRoles={["admin", "instructor"]}><Attendance /></ProtectedRoute>} />
        <Route path="/instructor/check-in" element={<ProtectedRoute allowedRoles={["admin", "instructor"]}><InstructorCheckIn /></ProtectedRoute>} />
        <Route path="/instructor/records" element={<ProtectedRoute allowedRoles={["admin", "instructor"]}><Records /></ProtectedRoute>} />
        <Route path="/instructor/assessments" element={<ProtectedRoute allowedRoles={["admin", "instructor"]}><Assessments /></ProtectedRoute>} />
        <Route path="/instructor/notices" element={<ProtectedRoute allowedRoles={["admin", "instructor"]}><InstructorNotices /></ProtectedRoute>} />
        <Route path="/instructor/settings" element={<ProtectedRoute allowedRoles={["admin", "instructor"]}><InstructorSettings /></ProtectedRoute>} />

        {/* Student */}
        <Route
          path="/student/*"
          element={
            <ProtectedRoute allowedRoles={["admin", "student"]}>
              <StudentOnboardingGuard>
                <Routes>
                  <Route index element={<StudentHome />} />
                  <Route path="booking" element={<Booking />} />
                  <Route path="financial" element={<StudentFinancial />} />
                  <Route path="progress" element={<Progress />} />
                  <Route path="messages" element={<Messages />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="documents" element={<Documents />} />
                </Routes>
              </StudentOnboardingGuard>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TenantProvider>
          <AuthProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <AppContent />
              </ErrorBoundary>
            </BrowserRouter>
          </AuthProvider>
        </TenantProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
