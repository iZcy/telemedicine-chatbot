import { useAuth } from "@/contexts/AuthContext";

// src/pages/admin/AnalyticsPage.tsx
export default function AnalyticsPage() {
  const { logout } = useAuth(); // Add this hook

  const handleLogout = async () => {
    try {
      await logout();
      // User will be redirected automatically due to auth state change
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="p-6">
      {/* <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1> */}
      <div className="flex justify-between items-center mb-6">
        {/* Page Title */}
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <div className="flex items-center space-x-4">
          {/* Back Button */}
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back
          </button>
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Chat Volume */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Chat Volume</h3>
          {/* Add chart component */}
        </div>

        {/* Knowledge Gaps */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Knowledge Gaps</h3>
          {/* Add gap analysis */}
        </div>

        {/* Response Quality */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Response Quality</h3>
          {/* Add quality metrics */}
        </div>
      </div>
    </div>
  );
}