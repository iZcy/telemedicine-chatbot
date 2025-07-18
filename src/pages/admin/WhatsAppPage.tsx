// src/pages/admin/WhatsAppPage.tsx - Updated with session management
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  MessageSquare,
  QrCode,
  CheckCircle,
  XCircle,
  Loader2,
  Users,
  LogOut,
  RefreshCw,
  AlertTriangle,
  Smartphone,
  Wifi,
  WifiOff,
  Trash2,
  Eye
} from 'lucide-react';

interface WhatsAppStatus {
  isReady: boolean;
  activeSessions: number;
  connectionState: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'READY' | 'ERROR';
  lastConnected?: string;
  qrCode?: string;
  error?: string;
}

interface SessionInfo {
  activeCount: number;
  sessions: Array<{ phone: string; sessionId: string; duration: string }>;
}

export default function WhatsAppPage() {
  const { logout } = useAuth();
  const [status, setStatus] = useState<WhatsAppStatus>({
    isReady: false,
    activeSessions: 0,
    connectionState: 'DISCONNECTED'
  });
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({
    activeCount: 0,
    sessions: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [connectionLog, setConnectionLog] = useState<string[]>([]);

  useEffect(() => {
    fetchStatus();
    fetchSessionInfo();
    // Poll status every 5 seconds when connecting
    const interval = setInterval(() => {
      if (status.connectionState === 'CONNECTING') {
        fetchStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [status.connectionState]);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
      if (error instanceof Error) {
        addToLog('Error fetching status: ' + error.message);
      }
    }
  };

  const fetchSessionInfo = async () => {
    try {
      const response = await fetch('/api/whatsapp/sessions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSessionInfo(data);
      }
    } catch (error) {
      console.error('Error fetching session info:', error);
    }
  };

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const handleInitialize = async () => {
    setIsLoading(true);
    addToLog('Initializing WhatsApp service...');

    try {
      const response = await fetch('/api/whatsapp/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        addToLog('WhatsApp service initialized successfully');
        setStatus(prev => ({ ...prev, connectionState: 'CONNECTING' }));
        // Start polling for QR code and status
        setTimeout(() => fetchStatus(), 2000);
      } else {
        addToLog('Failed to initialize: ' + data.error);
        setStatus(prev => ({ ...prev, connectionState: 'ERROR', error: data.error }));
      }
    } catch (error) {
      addToLog('Network error during initialization');
      setStatus(prev => ({ ...prev, connectionState: 'ERROR', error: 'Network error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    addToLog('Disconnecting WhatsApp service...');

    try {
      const response = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        addToLog(`WhatsApp service disconnected successfully. ${data.sessionsCleared} sessions cleared.`);
        setStatus({
          isReady: false,
          activeSessions: 0,
          connectionState: 'DISCONNECTED'
        });
        setSessionInfo({
          activeCount: 0,
          sessions: []
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        addToLog('Error disconnecting: ' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Add this handler to your WhatsAppPage component:
  const handleForceLogout = async () => {
    setIsLoading(true);
    addToLog('Force logout - clearing all WhatsApp authentication...');

    try {
      const response = await fetch('/api/whatsapp/force-logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        addToLog(`Force logout successful. ${data.sessionsCleared} sessions cleared, auth data removed.`);
        setStatus({
          isReady: false,
          activeSessions: 0,
          connectionState: 'DISCONNECTED'
        });
        setSessionInfo({
          activeCount: 0,
          sessions: []
        });
      } else {
        addToLog('Failed to force logout: ' + data.error);
      }
    } catch (error) {
      if (error instanceof Error) {
        addToLog('Error during force logout: ' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 🧹 NEW: Clear sessions without disconnecting
  const handleClearSessions = async () => {
    setIsLoading(true);
    addToLog('Clearing active sessions...');

    try {
      const response = await fetch('/api/whatsapp/clear-sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        addToLog(`Successfully cleared ${data.sessionsCleared} sessions`);
        await fetchSessionInfo();
        await fetchStatus();
      } else {
        addToLog('Failed to clear sessions: ' + data.error);
      }
    } catch (error) {
      if (error instanceof Error) {
        addToLog('Error clearing sessions: ' + error.message);
      }
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

  const getStatusIcon = () => {
    switch (status.connectionState) {
      case 'READY':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'CONNECTED':
        return <Wifi className="h-6 w-6 text-blue-500" />;
      case 'CONNECTING':
        return <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />;
      case 'ERROR':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <WifiOff className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (status.connectionState) {
      case 'READY':
        return 'Ready - WhatsApp connected and active';
      case 'CONNECTED':
        return 'Connected - Authenticating...';
      case 'CONNECTING':
        return 'Connecting - Please wait...';
      case 'ERROR':
        return `Error - ${status.error || 'Connection failed'}`;
      default:
        return 'Disconnected - Not connected to WhatsApp';
    }
  };

  const getStatusColor = () => {
    switch (status.connectionState) {
      case 'READY':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'CONNECTED':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'CONNECTING':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'ERROR':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">WhatsApp Integration</h1>
            <p className="text-gray-600">Manage WhatsApp connection</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Connection Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <MessageSquare className="h-5 w-5 text-green-600 mr-2" />
                  Connection Status
                </h2>
                <button
                  onClick={fetchStatus}
                  disabled={isLoading}
                  className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
                <div className="flex items-center mb-2">
                  {getStatusIcon()}
                  <span className="ml-3 font-medium">{getStatusText()}</span>
                </div>

                {status.connectionState === 'READY' && (
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Active Sessions:</span>
                      <span className="font-medium">{status.activeSessions}</span>
                    </div>
                    {status.lastConnected && (
                      <div className="flex justify-between">
                        <span>Last Connected:</span>
                        <span className="font-medium">
                          {new Date(status.lastConnected).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-4">
                {status.connectionState === 'DISCONNECTED' || status.connectionState === 'ERROR' ? (
                  <button
                    onClick={handleInitialize}
                    disabled={isLoading}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Smartphone className="h-4 w-4 mr-2" />
                    )}
                    Connect WhatsApp
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleDisconnect}
                      disabled={isLoading}
                      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      <WifiOff className="h-4 w-4 mr-2" />
                      Disconnect
                    </button>
                    <button
                      onClick={handleForceLogout}
                      disabled={isLoading}
                      className="flex items-center px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 disabled:opacity-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Force Logout
                    </button>
                  </>
                )}

                {status.connectionState === 'READY' && (
                  <>
                    <button
                      onClick={() => {
                        setShowSessions(true);
                        fetchSessionInfo();
                      }}
                      className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Sessions ({sessionInfo.activeCount})
                    </button>

                    {sessionInfo.activeCount > 0 && (
                      <button
                        onClick={handleClearSessions}
                        disabled={isLoading}
                        className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear Sessions
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* QR Code Display */}
            {status.connectionState === 'CONNECTING' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <QrCode className="h-5 w-5 text-blue-600 mr-2" />
                  Scan QR Code
                </h3>

                <div className="text-center">
                  {status.qrCode ? (
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 inline-block">
                        <img
                          src={`data:image/png;base64,${status.qrCode}`}
                          alt="WhatsApp QR Code"
                          className="w-64 h-64"
                        />
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p className="font-medium">How to connect:</p>
                        <p>1. Open WhatsApp on your phone</p>
                        <p>2. Go to Settings → Linked Devices</p>
                        <p>3. Tap "Link a Device"</p>
                        <p>4. Scan this QR code</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                      <p className="text-gray-600">Generating QR Code...</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Setup Instructions</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p>• Click "Connect WhatsApp" to start the connection process</p>
                <p>• A QR code will appear that you need to scan with your WhatsApp</p>
                <p>• Use "Disconnect" to temporarily disconnect while keeping auth</p>
                <p>• Use "Force Logout" to completely clear auth and connect different account</p>
                <p>• Sessions are automatically cleared when disconnecting</p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Statistics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Users className="h-5 w-5 text-purple-600 mr-2" />
                Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium capitalize">
                    {status.connectionState.toLowerCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Chats:</span>
                  <span className="font-medium">{status.activeSessions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium">
                    {status.isReady ? 'Running' : 'Stopped'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sessions:</span>
                  <span className="font-medium">{sessionInfo.activeCount}</span>
                </div>
              </div>
            </div>

            {/* Connection Log */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Connection Log</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {connectionLog.length > 0 ? (
                  connectionLog.map((log, index) => (
                    <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      {log}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No recent activity</p>
                )}
              </div>
            </div>

            {/* Tips */}
            <div className="bg-yellow-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Important Notes
              </h3>
              <div className="space-y-2 text-sm text-yellow-800">
                <p>• Keep the admin panel open during initial setup</p>
                <p>• QR code expires after 2 minutes</p>
                <p>• Only one device can be connected at a time</p>
                <p>• Service will auto-restart if disconnected</p>
                <p>• Sessions are cleared on disconnect to prevent issues</p>
              </div>
            </div>
          </div>
        </div>

        {/* Session Management Modal */}
        {showSessions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Active WhatsApp Sessions</h3>
                <button
                  onClick={fetchSessionInfo}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              {sessionInfo.sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessionInfo.sessions.map((session, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Phone: {session.phone}</p>
                          <p className="text-sm text-gray-600">Session: {session.sessionId}</p>
                          <p className="text-sm text-gray-600">Status: {session.duration}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="text-sm text-gray-600">
                      Total: {sessionInfo.activeCount} active sessions
                    </span>
                    <button
                      onClick={handleClearSessions}
                      disabled={isLoading}
                      className="flex items-center px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear All
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No active sessions</p>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowSessions(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}