// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import KnowledgePage from './pages/admin/KnowledgePage';
import AnalyticsPage from './pages/admin/AnalyticsPage';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/knowledge" element={<KnowledgePage />} />
        <Route path="/admin/analytics" element={<AnalyticsPage />} />
      </Routes>
    </div>
  );
}

export default App;