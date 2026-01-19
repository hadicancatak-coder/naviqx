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

// High-traffic pages loaded eagerly for instant navigation
import Tasks from "./pages/Tasks";
import Sprints from "./pages/Sprints";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import KPIs from "./pages/KPIs";
import CampaignsLog from "./pages/CampaignsLog";
import Projects from "./pages/Projects";
import Whiteboard from "./pages/Whiteboard";
import Knowledge from "./pages/Knowledge";
import TechStack from "./pages/TechStack";
import KeywordIntel from "./pages/KeywordIntel";

// Lazy-loaded pages for better initial load
const SprintsManagement = lazy(() => import("./pages/admin/SprintsManagement"));
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
const SearchPlanner = lazy(() => import("./pages/SearchPlanner"));
const LpPlanner = lazy(() => import("./pages/LpPlanner"));
const LpMapPublic = lazy(() => import("./pages/LpMapPublic"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Security = lazy(() => import("./pages/Security"));
const About = lazy(() => import("./pages/About"));
const HowTo = lazy(() => import("./pages/HowTo"));
const UtmPlanner = lazy(() => import("./pages/UtmPlanner"));
const CopyWriter = lazy(() => import("./pages/CopyWriter"));
const CaptionLibrary = lazy(() => import("./pages/CaptionLibrary"));
const LocationIntelligence = lazy(() => import("./pages/LocationIntelligence"));
const WebIntel = lazy(() => import("./pages/WebIntel"));
const CampaignReview = lazy(() => import("./pages/CampaignReview"));
const CampaignsLogExternal = lazy(() => import("./pages/CampaignsLogExternal"));
const KnowledgePublic = lazy(() => import("./pages/KnowledgePublic"));
const Performance = lazy(() => import("./pages/Performance"));
const ProjectsPublic = lazy(() => import("./pages/ProjectsPublic"));


const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <TaskDrawerProvider>
            <Sonner position="bottom-right" expand={false} richColors closeButton />
            <GlobalBubbleMenu />
            <TaskDrawer />
            <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/mfa-setup" element={<ProtectedRoute><MfaSetup /></ProtectedRoute>} />
                  <Route path="/mfa-verify" element={<ProtectedRoute><MfaVerify /></ProtectedRoute>} />
              <Route path="/campaigns-log/review/:token" element={<Suspense fallback={<PageLoader />}><CampaignReview /></Suspense>} />
              <Route path="/campaigns-log/external/:token" element={<Suspense fallback={<PageLoader />}><CampaignsLogExternal /></Suspense>} />
              <Route path="/knowledge/public/:token" element={<Suspense fallback={<PageLoader />}><KnowledgePublic /></Suspense>} />
              <Route path="/projects/public/:token" element={<Suspense fallback={<PageLoader />}><ProjectsPublic /></Suspense>} />
              <Route path="/lp-planner/public/:token" element={<Suspense fallback={<PageLoader />}><LpMapPublic /></Suspense>} />
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
                    </Route>
                    <Route path="/ads" element={<Navigate to="/ads/search" replace />} />
                    <Route path="/ads/search" element={<SearchPlanner adType="search" key="search" />} />
                    <Route path="/ads/library" element={<Navigate to="/ads/captions" replace />} />
                    <Route path="/ads/captions" element={<CaptionLibrary />} />
                    <Route path="/ads/lp" element={<LpPlanner />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/profile/:userId?" element={<Profile />} />
                    <Route path="/utm-planner" element={<UtmPlanner />} />
                    <Route path="/copywriter" element={<CopyWriter />} />
                    <Route path="/security" element={<Security />} />
                    <Route path="/kpis" element={<KPIs />} />
                    <Route path="/campaigns-log" element={<CampaignsLog />} />
                    <Route path="/location-intelligence" element={<LocationIntelligence />} />
                    <Route path="/web-intel" element={<WebIntel />} />
                    <Route path="/keyword-intel" element={<KeywordIntel />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/how-to" element={<HowTo />} />
                    <Route path="/knowledge" element={<Knowledge />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/tech-stack" element={<TechStack />} />
                    <Route path="/performance" element={<Performance />} />
                    <Route path="/whiteboard" element={<Whiteboard />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
              </Routes>
            </TaskDrawerProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;