import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import { Toaster } from "./components/ui/sonner";
import "./App.css";

// ✅ MOVE THIS OUTSIDE — static component
const ProtectedRoute = ({ children, adminOnly = false, user, loading }) => {
  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1d2e] to-[#0a0e27] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500" />
      </div>
    );

  if (!user) return <Navigate to="/auth" />;

  if (adminOnly && !user.is_admin) return <Navigate to="/dashboard" />;

  return children;
};

function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return JSON.parse(localStorage.getItem("user") || "{}");
  });
  const [loading] = useState(false);

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route
            path="/auth"
            element={
              !user ? (
                <AuthPage setUser={setUser} />
              ) : (
                <Navigate to={user.is_admin ? "/admin" : "/dashboard"} />
              )
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user} loading={loading}>
                <Dashboard user={user} setUser={setUser} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute user={user} loading={loading} adminOnly>
                <AdminPanel user={user} setUser={setUser} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/"
            element={
              <Navigate
                to={user ? (user.is_admin ? "/admin" : "/dashboard") : "/auth"}
              />
            }
          />
        </Routes>
      </BrowserRouter>

      <Toaster position="top-right" />
    </div>
  );
}

export default App;
