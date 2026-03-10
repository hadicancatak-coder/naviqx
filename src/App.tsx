import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TaskDrawerProvider } from "./contexts/TaskDrawerContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GlobalBubbleMenu } from "@/components/editor/GlobalBubbleMenu";
import { TaskDrawer } from "./components/tasks/TaskDrawer";
import { PageLoader } from "./components/layout/PageLoader";

// Critical pages loaded eagerly
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import MfaSetup from "./pages/MfaSetup";
import MfaVerify from "./pages/MfaVerify";
import ResetPassword from "./pages/ResetPassword";
import ChangePasswordRequired from "./pages/ChangePasswordRequired";

// High-traffic pages loaded eagerly for instant navigation
import Tasks from "./pages/Tasks";
import Sprints from "./pages/Sprints";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import KPIs from "./pages/KPIs";
import CampaignsLog from "./pages/CampaignsLog";
import Projects from "./pages/Projects";
import Library from "./pages/Library";
import KeywordIntel from "./pages/KeywordIntel";
import SearchPlanner from "./pages/SearchPlanner";
import LpPlanner from "./pages/LpPlanner";
import UtmPlanner from "./pages/UtmPlanner";
import Performance from "./pages/Performance";
const DailyLog = lazy(() => import("./pages/DailyLog"));
import AppStorePlanner from "./pages/AppStorePlanner";

// Lazy-loaded pages for better initial load
const SprintsManagement = lazy(() => import("./pages/admin/SprintsManagement"));
const RecurringTasksAudit = lazy(() => import("./pages/admin/RecurringTasksAudit"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const Overview = lazy(() => import("./pages/admin/Overview"));
const UsersManagement = lazy(() => import("./pages/admin/UsersManagement"));
const Config = lazy(() => import("./pages/admin/Config"));
const SecurityPage = lazy(() => import("./pages/admin/SecurityPage"));
const Logs = lazy(() => import("./pages/admin/Logs"));
const AdRulesManagement = lazy(() => import("./pages/admin/AdRulesManagement"));
const ExternalLinksManagement = lazy(() => import("./pages/admin/ExternalLinksManagement"));
const KPIsManagement = lazy(() => import("./pages/admin/KPIsManagement"));
const ErrorLogs = lazy(() => import("./pages/admin/ErrorLogs"));
const SecurityScans = lazy(() => import("./pages/admin/SecurityScans"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const LpMapPublic = lazy(() => import("./pages/LpMapPublic"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Security = lazy(() => import("./pages/Security"));
const About = lazy(() => import("./pages/About"));
const HowTo = lazy(() => import("./pages/HowTo"));
const CopyWriter = lazy(() => import("./pages/CopyWriter"));
const CaptionLibrary = lazy(() => import("./pages/CaptionLibrary"));
const WebIntel = lazy(() => import("./pages/WebIntel"));
const PublicReview = lazy(() => import("./pages/PublicReview"));
const UniversalReview = lazy(() => import("./pages/UniversalReview"));



const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
          {/* PUBLIC ROUTES - Outside AuthProvider to prevent MFA redirects */}
            {/* Universal Token Resolver - auto-detects resource type */}
            <Route path="/r/:token" element={<Suspense fallback={<PageLoader />}><UniversalReview /></Suspense>} />
            
            {/* Legacy routes - redirect to unified */}
            <Route path="/review/:token" element={<Suspense fallback={<PageLoader />}><PublicReview resourceType="campaign" /></Suspense>} />
            <Route path="/campaigns-log/review/:token" element={<Suspense fallback={<PageLoader />}><PublicReview resourceType="campaign" /></Suspense>} />
            <Route path="/campaigns-log/external/:token" element={<Suspense fallback={<PageLoader />}><PublicReview resourceType="campaign" /></Suspense>} />
            <Route path="/knowledge/public/:token" element={<Suspense fallback={<PageLoader />}><PublicReview resourceType="knowledge" /></Suspense>} />
            <Route path="/projects/public/:token" element={<Suspense fallback={<PageLoader />}><PublicReview resourceType="project" /></Suspense>} />
            <Route path="/lp-planner/public/:token" element={<Suspense fallback={<PageLoader />}><PublicReview resourceType="lp_map" /></Suspense>} />
            {/* Unified Public Review Routes */}
            <Route path="/ads/search/review/:token" element={<Suspense fallback={<PageLoader />}><PublicReview resourceType="search_ads" /></Suspense>} />
            <Route path="/ads/lp/review/:token" element={<Suspense fallback={<PageLoader />}><PublicReview resourceType="lp_map" /></Suspense>} />
            <Route path="/campaigns/review/:token" element={<Suspense fallback={<PageLoader />}><PublicReview resourceType="campaign" /></Suspense>} />
            <Route path="/knowledge/review/:token" element={<Suspense fallback={<PageLoader />}><PublicReview resourceType="knowledge" /></Suspense>} />
            <Route path="/projects/review/:token" element={<Suspense fallback={<PageLoader />}><PublicReview resourceType="project" /></Suspense>} />
            
            {/* AUTHENTICATED ROUTES - Inside AuthProvider */}
            <Route path="/*" element={
              <AuthProvider>
                <TaskDrawerProvider>
                  <Sonner position="bottom-right" expand={false} richColors closeButton />
                  <GlobalBubbleMenu />
                  <TaskDrawer />
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/mfa-setup" element={<ProtectedRoute><MfaSetup /></ProtectedRoute>} />
                    <Route path="/mfa-verify" element={<ProtectedRoute><MfaVerify /></ProtectedRoute>} />
                    <Route path="/change-password" element={<ProtectedRoute><ChangePasswordRequired /></ProtectedRoute>} />
                    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/dashboard" element={<Navigate to="/" replace />} />
                      <Route path="/tasks" element={<Tasks />} />
                      <Route path="/sprints" element={<Sprints />} />
                      
                      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                        <Route index element={<Navigate to="overview" replace />} />
                        <Route path="overview" element={<Overview />} />
                        <Route path="users" element={<UsersManagement />} />
                        <Route path="kpis" element={<KPIsManagement />} />
                        <Route path="config" element={<Config />} />
                        <Route path="external-links" element={<ExternalLinksManagement />} />
                        <Route path="security" element={<SecurityPage />} />
                        <Route path="logs" element={<Logs />} />
                        <Route path="ad-rules" element={<AdRulesManagement />} />
                        <Route path="errors" element={<ErrorLogs />} />
                        <Route path="security-scans" element={<SecurityScans />} />
                        <Route path="sprints" element={<SprintsManagement />} />
                        <Route path="recurring" element={<RecurringTasksAudit />} />
                        <Route path="settings" element={<AdminSettings />} />
                      </Route>
                      <Route path="/ads" element={<Navigate to="/ads/google" replace />} />
                      <Route path="/ads/google" element={<SearchPlanner />} />
                      <Route path="/ads/search" element={<Navigate to="/ads/google" replace />} />
                      <Route path="/ads/display" element={<Navigate to="/ads/google" replace />} />
                      <Route path="/ads/app" element={<Navigate to="/ads/google" replace />} />
                      <Route path="/ads/library" element={<Navigate to="/ads/captions" replace />} />
                      <Route path="/ads/captions" element={<CaptionLibrary />} />
                      <Route path="/ads/lp" element={<LpPlanner />} />
                      <Route path="/ads/app-store" element={<AppStorePlanner />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/profile/:userId?" element={<Profile />} />
                      <Route path="/utm-planner" element={<UtmPlanner />} />
                      <Route path="/copywriter" element={<CopyWriter />} />
                      <Route path="/security" element={<Security />} />
                      <Route path="/kpis" element={<KPIs />} />
                      <Route path="/campaigns-log" element={<CampaignsLog />} />
                      <Route path="/web-intel" element={<WebIntel />} />
                      <Route path="/keyword-intel" element={<KeywordIntel />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/how-to" element={<HowTo />} />
                      <Route path="/library" element={<Library />} />
                      <Route path="/knowledge" element={<Navigate to="/library" replace />} />
                      <Route path="/tech-stack" element={<Navigate to="/library" replace />} />
                      <Route path="/projects" element={<Projects />} />
                      <Route path="/performance" element={<Performance />} />
                      
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </TaskDrawerProvider>
              </AuthProvider>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;