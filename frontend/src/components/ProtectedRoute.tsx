import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

/** Sends signed-out visitors to the sign-in page, then back where they were going. */
export default function ProtectedRoute() {
  const { currentUser } = useAuthContext();
  const location = useLocation();
  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
