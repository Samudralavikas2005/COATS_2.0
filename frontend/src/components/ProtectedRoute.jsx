import { Navigate } from "react-router-dom";

/**
 * Checks:
 * 1. Token exists
 * 2. Token is not expired (reads exp from JWT payload)
 * 3. If requiredRole is given, user's role must match
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const token = localStorage.getItem("access");

  // No token at all → login
  if (!token) return <Navigate to="/login" replace />;

  // Decode JWT payload to check expiry
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const now = Math.floor(Date.now() / 1000);

    // Token expired → clear storage and redirect
    if (payload.exp && payload.exp < now) {
      localStorage.clear();
      return <Navigate to="/login" replace />;
    }

    // Role guard — if a specific role is required, enforce it
    if (requiredRole && payload.role !== requiredRole) {
      // Redirect to their correct home
      if (payload.role === "SUPERVISOR") return <Navigate to="/dashboard" replace />;
      return <Navigate to="/cases" replace />;
    }
  } catch {
    // Malformed token → clear and redirect
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  return children;
}
