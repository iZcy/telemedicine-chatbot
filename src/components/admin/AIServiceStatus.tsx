// src/components/admin/AIServiceStatus.tsx
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, RefreshCw, Sparkles } from 'lucide-react';

interface ServiceStatus {
  status: 'ok' | 'error';
  latency?: number;
  configured: boolean;
}

interface AIHealthData {
  status: string;
  timestamp: string;
  services: {
    deepseek: ServiceStatus;
  };
  primary_service: string;
}

export default function AIServiceStatus() {
  const [healthData, setHealthData] = useState<AIHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchHealthData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/health/ai');
      const data = await response.json();
      setHealthData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch AI health data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: 'ok' | 'error') => {
    return status === 'ok' ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getStatusColor = (status: 'ok' | 'error') => {
    return status === 'ok' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50';
  };

  if (isLoading && !healthData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Memeriksa layanan AI...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Status Layanan AI</h3>
        <button
          onClick={fetchHealthData}
          disabled={isLoading}
          className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Perbarui
        </button>
      </div>

      {healthData && (
        <div className="space-y-4">
          {/* Overall Status */}
          <div className={`p-3 rounded-lg ${healthData.status === 'healthy'
            ? 'bg-green-50 text-green-700'
            : 'bg-yellow-50 text-yellow-700'
            }`}>
            <div className="flex items-center">
              {getStatusIcon(healthData.status === 'healthy' ? 'ok' : 'error')}
              <span className="ml-2 font-medium">
                Status Sistem: {healthData.status === 'healthy' ? 'Sehat' : 'Terdegradasi'}
              </span>
            </div>
            <p className="text-sm mt-1">
              Menggunakan {healthData.primary_service} sebagai layanan utama
            </p>
          </div>

          {/* DeepSeek Service */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Sparkles className="h-5 w-5 text-purple-600 mr-2" />
                <h4 className="font-medium text-gray-900">DeepSeek AI</h4>
              </div>
              {getStatusIcon(healthData.services.deepseek.status)}
            </div>
            <div className="space-y-1 text-sm">
              <div className={`inline-block px-2 py-1 rounded ${getStatusColor(healthData.services.deepseek.status)}`}>
                {healthData.services.deepseek.status === 'ok' ? 'Online' : 'Offline'}
              </div>
              <p className="text-gray-600">
                Konfigurasi: {healthData.services.deepseek.configured ? 'Ya' : 'Tidak'}
              </p>
              {healthData.services.deepseek.latency && (
                <p className="text-gray-600 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {healthData.services.deepseek.latency}ms
                </p>
              )}
              <p className="text-gray-600">
                Model: deepseek-chat-v3-0324
              </p>
            </div>
          </div>

          {/* Features Status */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Fitur Sistem</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span>RAG Search</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span>Ekstraksi Gejala</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span>Basis Pengetahuan</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span>Analitik Chat</span>
              </div>
            </div>
          </div>

          {/* Last Updated */}
          <div className="text-xs text-gray-500 text-center">
            Terakhir diperbarui: {lastUpdated.toLocaleTimeString('id-ID')}
          </div>
        </div>
      )}
    </div>
  );
}