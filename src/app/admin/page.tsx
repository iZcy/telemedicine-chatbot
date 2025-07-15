import Link from 'next/link';
import { Database, MessageSquare, BarChart3, Settings } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your telemedicine chatbot system</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Knowledge Entries</p>
                <p className="text-2xl font-bold text-gray-900">248</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Chats</p>
                <p className="text-2xl font-bold text-gray-900">1,432</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">2.3s</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Knowledge Gaps</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Link href="/admin/knowledge" className="block">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <Database className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold ml-2">Knowledge Base</h2>
              </div>
              <p className="text-gray-600 mb-4">
                Manage medical knowledge entries, categories, and content approval workflow.
              </p>
              <div className="text-blue-600 font-medium">Manage Knowledge →</div>
            </div>
          </Link>

          <Link href="/admin/analytics" className="block">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <BarChart3 className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold ml-2">Analytics</h2>
              </div>
              <p className="text-gray-600 mb-4">
                View chat analytics, knowledge gaps, and system performance metrics.
              </p>
              <div className="text-green-600 font-medium">View Analytics →</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}