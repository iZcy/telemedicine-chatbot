// src/pages/admin/AnalyticsPage.tsx
import { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, TrendingUp, Users, Clock, AlertTriangle, MessageSquare } from 'lucide-react';

interface ChatVolumeData {
  date: string;
  count: number;
}

interface KnowledgeGapData {
  query: string;
  frequency: number;
  needsContent: boolean;
  createdAt: string;
}

interface ResponseQualityData {
  helpful: number;
  notHelpful: number;
  averageConfidence: number;
  totalResponses: number;
}

interface TopQuery {
  query: string;
  count: number;
}

interface CategoryData {
  category: string;
  count: number;
}

export default function AnalyticsPage() {
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [chatVolume, setChatVolume] = useState<ChatVolumeData[]>([]);
  const [knowledgeGaps, setKnowledgeGaps] = useState<KnowledgeGapData[]>([]);
  const [responseQuality, setResponseQuality] = useState<ResponseQualityData>({
    helpful: 0,
    notHelpful: 0,
    averageConfidence: 0,
    totalResponses: 0
  });
  const [topQueries, setTopQueries] = useState<TopQuery[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [volumeRes, gapsRes, qualityRes, queriesRes, categoriesRes] = await Promise.all([
        fetch('/api/stats/chat-volume', { headers }),
        fetch('/api/stats/knowledge-gaps', { headers }),
        fetch('/api/stats/response-quality', { headers }),
        fetch('/api/stats/top-queries', { headers }),
        fetch('/api/stats/categories', { headers })
      ]);

      if (volumeRes.ok) setChatVolume(await volumeRes.json());
      if (gapsRes.ok) setKnowledgeGaps(await gapsRes.json());
      if (qualityRes.ok) setResponseQuality(await qualityRes.json());
      if (queriesRes.ok) setTopQueries(await queriesRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getMaxChatCount = () => {
    return Math.max(...chatVolume.map(item => item.count), 1);
  };

  const getTotalChats = () => {
    return chatVolume.reduce((sum, item) => sum + item.count, 0);
  };

  const getHelpfulPercentage = () => {
    const total = responseQuality.helpful + responseQuality.notHelpful;
    return total > 0 ? Math.round((responseQuality.helpful / total) * 100) : 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data analitik...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Analitik</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Kembali
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Keluar
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Chat 30 Hari</p>
                <p className="text-2xl font-bold text-gray-900">{getTotalChats()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Kualitas Respons</p>
                <p className="text-2xl font-bold text-gray-900">{getHelpfulPercentage()}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Konfiden Rata-rata</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(responseQuality.averageConfidence * 100)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Celah Pengetahuan</p>
                <p className="text-2xl font-bold text-gray-900">{knowledgeGaps.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Chat Volume Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
              Volume Chat (30 Hari)
            </h3>
            <div className="space-y-2">
              {chatVolume.slice(-7).map((item, index) => (
                <div key={index} className="flex items-center">
                  <span className="text-sm text-gray-600 w-20">
                    {new Date(item.date).toLocaleDateString('id-ID', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                  <div className="flex-1 mx-3">
                    <div className="bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                        style={{ width: `${(item.count / getMaxChatCount()) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <MessageSquare className="h-5 w-5 text-green-600 mr-2" />
              Distribusi Kategori
            </h3>
            <div className="space-y-3">
              {categories.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{category.category}</span>
                  <div className="flex items-center">
                    <div className="w-20 bg-gray-200 rounded-full h-2 mr-3">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${(category.count / Math.max(...categories.map(c => c.count), 1)) * 100}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{category.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Knowledge Gaps and Top Queries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Knowledge Gaps */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              Celah Pengetahuan
            </h3>
            <div className="space-y-3">
              {knowledgeGaps.length > 0 ? (
                knowledgeGaps.map((gap, index) => (
                  <div key={index} className="border-l-4 border-red-400 pl-4 py-2">
                    <p className="text-sm font-medium text-gray-900">{gap.query}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        Frekuensi: {gap.frequency}x
                      </span>
                      <span className="text-xs text-red-600">
                        Perlu konten
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Tidak ada celah pengetahuan yang terdeteksi
                </p>
              )}
            </div>
          </div>

          {/* Top Queries */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
              Pertanyaan Populer
            </h3>
            <div className="space-y-3">
              {topQueries.length > 0 ? (
                topQueries.map((query, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-2">
                    <span className="text-sm text-gray-900 flex-1">{query.query}</span>
                    <span className="text-sm font-medium text-purple-600 ml-2">
                      {query.count}x
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Belum ada data pertanyaan
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}