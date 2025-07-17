// src/pages/admin/AdminDashboard.tsx - Updated with WhatsApp link
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Database, MessageSquare, BarChart3, Settings, Bot, LogOut, Users, TrendingUp, Smartphone } from 'lucide-react';
import AIServiceStatus from '@/components/admin/AIServiceStatus';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  totalChats: number;
  totalKnowledgeEntries: number;
  totalResponses: number;
  knowledgeGaps: number;
  todayChats: number;
  yesterdayChats: number;
  activeUsers: number;
  averageResponseTime: number;
}

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalChats: 0,
    totalKnowledgeEntries: 0,
    totalResponses: 0,
    knowledgeGaps: 0,
    todayChats: 0,
    yesterdayChats: 0,
    activeUsers: 0,
    averageResponseTime: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
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

  const getTrendIndicator = (current: number, previous: number) => {
    if (previous === 0) return { icon: '→', color: 'text-gray-500', text: 'Tidak ada data sebelumnya' };

    const change = ((current - previous) / previous) * 100;
    if (change > 0) {
      return { icon: '↗', color: 'text-green-500', text: `+${change.toFixed(1)}%` };
    } else if (change < 0) {
      return { icon: '↘', color: 'text-red-500', text: `${change.toFixed(1)}%` };
    }
    return { icon: '→', color: 'text-gray-500', text: 'Tidak ada perubahan' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  const todayTrend = getTrendIndicator(stats.todayChats, stats.yesterdayChats);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Admin</h1>
            <p className="text-gray-600">Kelola sistem chatbot medis telemedicine Anda</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Keluar
          </button>
        </div>

        {/* AI Service Status */}
        <div className="mb-8">
          <AIServiceStatus />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Database className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Entri Pengetahuan</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalKnowledgeEntries}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Medis Terverifikasi</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Chat</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalChats}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Sesi Percakapan</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Bot className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Respons AI</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalResponses}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">DeepSeek AI</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Celah Pengetahuan</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.knowledgeGaps}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Perlu Ditambahkan</p>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Activity */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Chat Hari Ini</h3>
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">{stats.todayChats}</p>
            <div className="flex items-center text-sm">
              <span className={`mr-2 ${todayTrend.color}`}>{todayTrend.icon}</span>
              <span className={todayTrend.color}>{todayTrend.text}</span>
              <span className="text-gray-500 ml-1">dari kemarin</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Pengguna Aktif</h3>
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">{stats.activeUsers}</p>
            <p className="text-sm text-gray-500">7 hari terakhir</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Waktu Respons</h3>
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">{stats.averageResponseTime}s</p>
            <p className="text-sm text-gray-500">Rata-rata respons AI</p>
          </div>
        </div>

        {/* Main Actions - Updated to include WhatsApp */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-gray-900">
          <Link to="/admin/knowledge" className="block">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <Database className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold ml-2">Basis Pengetahuan</h2>
              </div>
              <p className="text-gray-600 mb-4">
                Kelola entri pengetahuan medis, kategori, dan alur kerja persetujuan konten.
              </p>
              <div className="text-blue-600 font-medium">Kelola Pengetahuan →</div>
            </div>
          </Link>

          <Link to="/admin/analytics" className="block">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <BarChart3 className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold ml-2">Analitik</h2>
              </div>
              <p className="text-gray-600 mb-4">
                Lihat analitik chat, celah pengetahuan, dan metrik performa sistem.
              </p>
              <div className="text-green-600 font-medium">Lihat Analitik →</div>
            </div>
          </Link>

          <Link to="/admin/whatsapp" className="block">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <Smartphone className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold ml-2">WhatsApp Integration</h2>
              </div>
              <p className="text-gray-600 mb-4">
                Kelola koneksi WhatsApp, kirim pesan massal, dan pantau sesi aktif.
              </p>
              <div className="text-green-600 font-medium">Kelola WhatsApp →</div>
            </div>
          </Link>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Bot className="h-6 w-6 text-purple-600" />
              <h2 className="text-xl font-semibold ml-2">Konfigurasi AI</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Pantau status layanan AI dan konfigurasi sistem DeepSeek.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Layanan AI:</span>
                <span className="font-medium">DeepSeek Chat</span>
              </div>
              <div className="flex justify-between">
                <span>Model:</span>
                <span className="font-medium">deepseek-chat</span>
              </div>
              <div className="flex justify-between">
                <span>RAG:</span>
                <span className="font-medium text-green-600">Aktif</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}