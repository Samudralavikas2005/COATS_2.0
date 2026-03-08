import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Cases from "./pages/Cases";
import CreateCase from "./pages/CreateCase";
import CaseDetail from "./pages/CaseDetail";
import COATSDashboard from "./pages/COATSDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Default — redirect based on role */}
        <Route path="/" element={<RoleRedirect />} />

        {/* Login */}
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
            <ProtectedRoute>
              <CreateCase />
            </ProtectedRoute>
          }
        />

        {/* Supervisor — full analytics dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <COATSDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

// Redirect "/" based on stored role
function RoleRedirect() {
  const role = localStorage.getItem("role");
  if (role === "SUPERVISOR") return <Navigate to="/dashboard" replace />;
  if (role === "CASE")       return <Navigate to="/cases" replace />;
  return <Navigate to="/login" replace />;
}

export default App;
