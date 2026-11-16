import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PageLoader } from "./components/PageLoader";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";

// Only the landing page is in the first download; every other route loads on demand.
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const AppLayout = lazy(() => import("./components/AppLayout"));
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
