// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import KnowledgePage from './pages/admin/KnowledgePage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route
            path="/admin"
            element={
              <ErrorBoundary>
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              </ErrorBoundary>
            }
          />
          <Route
            path="/admin/knowledge"
            element={
              <ErrorBoundary>
                <ProtectedRoute requireAdmin>
                  <KnowledgePage />
                </ProtectedRoute>
              </ErrorBoundary>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ErrorBoundary>
                <ProtectedRoute requireAdmin>
                  <AnalyticsPage />
                </ProtectedRoute>
              </ErrorBoundary>
            }
          />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;