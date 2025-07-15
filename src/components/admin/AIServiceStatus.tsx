// src/components/admin/AIServiceStatus.tsx
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

interface ServiceStatus {
  status: 'ok' | 'error';
  latency?: number;
  configured: boolean;
}

interface AIHealthData {
  status: string;
  timestamp: string;
  services: {
    openai: ServiceStatus;
    deepseek: ServiceStatus;
  };
  fallback_available: boolean;
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
          <span className="ml-2 text-gray-600">Checking AI services...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">AI Service Status</h3>
        <button
          onClick={fetchHealthData}
          disabled={isLoading}
          className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
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
                System Status: {healthData.status === 'healthy' ? 'Healthy' : 'Degraded'}
              </span>
            </div>
            {healthData.fallback_available && (
              <p className="text-sm mt-1">Fallback service available</p>
            )}
          </div>

          {/* Individual Services */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OpenAI */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">OpenAI (Primary)</h4>
                {getStatusIcon(healthData.services.openai.status)}
              </div>
              <div className="space-y-1 text-sm">
                <div className={`inline-block px-2 py-1 rounded ${getStatusColor(healthData.services.openai.status)}`}>
                  {healthData.services.openai.status === 'ok' ? 'Online' : 'Offline'}
                </div>
                <p className="text-gray-600">
                  Configured: {healthData.services.openai.configured ? 'Yes' : 'No'}
                </p>
                {healthData.services.openai.latency && (
                  <p className="text-gray-600 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {healthData.services.openai.latency}ms
                  </p>
                )}
              </div>
            </div>

            {/* DeepSeek */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">DeepSeek (Fallback)</h4>
                {getStatusIcon(healthData.services.deepseek.status)}
              </div>
              <div className="space-y-1 text-sm">
                <div className={`inline-block px-2 py-1 rounded ${getStatusColor(healthData.services.deepseek.status)}`}>
                  {healthData.services.deepseek.status === 'ok' ? 'Online' : 'Offline'}
                </div>
                <p className="text-gray-600">
                  Configured: {healthData.services.deepseek.configured ? 'Yes' : 'No'}
                </p>
                {healthData.services.deepseek.latency && (
                  <p className="text-gray-600 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {healthData.services.deepseek.latency}ms
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Last Updated */}
          <div className="text-xs text-gray-500 text-center">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}