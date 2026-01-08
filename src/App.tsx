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
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";

import AdminLayout from "./pages/admin/AdminLayout";
import Overview from "./pages/admin/Overview";
import UsersManagement from "./pages/admin/UsersManagement";
import Config from "./pages/admin/Config";
import SecurityPage from "./pages/admin/SecurityPage";
import Logs from "./pages/admin/Logs";
import AdRulesManagement from "./pages/admin/AdRulesManagement";
import ExternalLinksManagement from "./pages/admin/ExternalLinksManagement";
import KPIsManagement from "./pages/admin/KPIsManagement";
import ErrorLogs from "./pages/admin/ErrorLogs";
import SecurityScans from "./pages/admin/SecurityScans";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import SearchPlanner from "./pages/SearchPlanner";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import MfaSetup from "./pages/MfaSetup";
import MfaVerify from "./pages/MfaVerify";
import Security from "./pages/Security";
import About from "./pages/About";
import HowTo from "./pages/HowTo";
import UtmPlanner from "./pages/UtmPlanner";
import CopyWriter from "./pages/CopyWriter";
import CaptionLibrary from "./pages/CaptionLibrary";
import LocationIntelligence from "./pages/LocationIntelligence";
import WebIntel from "./pages/WebIntel";
import KPIs from "./pages/KPIs";
import CampaignsLog from "./pages/CampaignsLog";
import CampaignReview from "./pages/CampaignReview";
import CampaignsLogExternal from "./pages/CampaignsLogExternal";
import Knowledge from "./pages/Knowledge";
import KnowledgePublic from "./pages/KnowledgePublic";
import TechStack from "./pages/TechStack";
import Performance from "./pages/Performance";
import KeywordIntel from "./pages/KeywordIntel";
import Projects from "./pages/Projects";
import ProjectsPublic from "./pages/ProjectsPublic";


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
            <Route path="/campaigns-log/review/:token" element={<CampaignReview />} />
            <Route path="/campaigns-log/external/:token" element={<CampaignsLogExternal />} />
            <Route path="/knowledge/public/:token" element={<KnowledgePublic />} />
            <Route path="/projects/public/:token" element={<ProjectsPublic />} />
                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/tasks" element={<Tasks />} />
                  
                  
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
                  </Route>
                  <Route path="/ads" element={<Navigate to="/ads/search" replace />} />
                  <Route path="/ads/search" element={<SearchPlanner adType="search" key="search" />} />
                  <Route path="/ads/library" element={<Navigate to="/ads/captions" replace />} />
                  <Route path="/ads/captions" element={<CaptionLibrary />} />
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
