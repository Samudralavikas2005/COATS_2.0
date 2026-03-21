import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Login from "./pages/Login";
import Cases from "./pages/Cases";
import CreateCase from "./pages/CreateCase";
import CaseDetail from "./pages/CaseDetail";
import COATSDashboard from "./pages/COATSDashboard";
import CaseLogs from "./pages/CaseLogs";
import ProtectedRoute from "./components/ProtectedRoute";
import { startSessionTimeout, stopSessionTimeout } from "./utils/sessionTimeout";

function App() {
  useEffect(() => {
    const role = localStorage.getItem("role");
    // Only start session timeout if user is logged in
    if (role) {
      startSessionTimeout();
    }
    return () => stopSessionTimeout();
  }, []);

  return (
    <BrowserRouter>
      <Routes>

        {/* Default — redirect based on role */}
        <Route path="/" element={<RoleRedirect />} />

        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Case Officer routes */}
        <Route
          path="/cases"
          element={
            <ProtectedRoute>
              <Cases />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases/:id"
          element={
            <ProtectedRoute>
              <CaseDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-case"
          element={
            <ProtectedRoute requiredRole="CASE">
              <CreateCase />
            </ProtectedRoute>
          }
        />

        {/* Supervisor routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="SUPERVISOR">
              <COATSDashboard />
            </ProtectedRoute>
          }
        />

        {/* Shared — both roles can view logs */}
        <Route
          path="/logs"
          element={
            <ProtectedRoute>
              <CaseLogs />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

function RoleRedirect() {
  const role = localStorage.getItem("role");
  if (role === "SUPERVISOR") return <Navigate to="/dashboard" replace />;
  if (role === "CASE")       return <Navigate to="/cases" replace />;
  return <Navigate to="/login" replace />;
}

export default App;
