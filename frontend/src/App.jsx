import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, Suspense, lazy } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import ReportPage from './pages/ReportPage';
import TrackerPage from './pages/TrackerPage';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { DashboardSkeleton, ReportSkeleton, TrackerSkeleton } from './components/LoadingSkeleton';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication status
    // In production, this would check Azure Static Web Apps auth
    const checkAuth = async () => {
      try {
        const response = await fetch('/.auth/me');
        const data = await response.json();
        if (data.clientPrincipal) {
          setUser(data.clientPrincipal);
          setIsAuthenticated(true);
        }
      } catch (error) {
        // In development, simulate authenticated user
        if (import.meta.env.DEV) {
          setUser({ userId: 'demo-user', userDetails: 'Demo User' });
          setIsAuthenticated(true);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-clearance-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-clearance-pass"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />
          }
        />
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <Layout user={user}>
                <ErrorBoundary>
                  <DashboardPage user={user} />
                </ErrorBoundary>
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/upload"
          element={
            isAuthenticated ? (
              <Layout user={user}>
                <ErrorBoundary>
                  <UploadPage user={user} />
                </ErrorBoundary>
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/report/:reportId"
          element={
            isAuthenticated ? (
              <Layout user={user}>
                <ErrorBoundary>
                  <ReportPage user={user} />
                </ErrorBoundary>
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/tracker"
          element={
            isAuthenticated ? (
              <Layout user={user}>
                <ErrorBoundary>
                  <TrackerPage user={user} />
                </ErrorBoundary>
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
