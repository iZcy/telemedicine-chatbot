// src/pages/admin/AnalyticsPage.tsx
export default function AnalyticsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>

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