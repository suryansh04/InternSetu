import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { PageLoader } from "./components/PageLoader";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SignupPage from "./pages/SignupPage";

// Signed-in pages load on demand, so the landing page stays small.
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const MatchesPage = lazy(() => import("./pages/MatchesPage"));
const SavedPage = lazy(() => import("./pages/SavedPage"));
const ApplicationsPage = lazy(() => import("./pages/ApplicationsPage"));
const InterviewPage = lazy(() => import("./pages/InterviewPage"));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<MatchesPage />} />
            <Route path="saved" element={<SavedPage />} />
            <Route path="applied" element={<ApplicationsPage />} />
            <Route path="interview" element={<InterviewPage />} />
          </Route>
        </Route>

        {/* Old links */}
        <Route path="/form" element={<Navigate to="/profile" replace />} />
        <Route path="/main/*" element={<Navigate to="/app" replace />} />
        <Route path="/interview-prep" element={<Navigate to="/app/interview" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
