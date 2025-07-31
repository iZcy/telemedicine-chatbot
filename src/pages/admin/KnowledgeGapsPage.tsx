// src/pages/admin/KnowledgeGapsPage.tsx
import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Check, Clock, TrendingUp, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface KnowledgeGap {
  id: string;
  query: string;
  frequency: number;
  needsContent: boolean;
  createdAt: string;
  updatedAt: string;
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  assignedTo?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  relatedEntries?: KnowledgeEntry[];
}

interface KnowledgeEntry {
  id: string;
  title: string;
  category: string;
  content: string;
  keywords: string[];
}

interface GapResolutionStats {
  totalGaps: number;
  resolvedGaps: number;
  inProgressGaps: number;
  averageResolutionTime: number;
  topCategories: Array<{ category: string; count: number }>;
}

export default function KnowledgeGapsPage() {
  const { logout } = useAuth();
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [stats, setStats] = useState<GapResolutionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('open');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGap, setSelectedGap] = useState<KnowledgeGap | null>(null);
  
  const [newEntryForm, setNewEntryForm] = useState({
    title: '',
    content: '',
    category: '',
    keywords: '',
    medicalReviewed: false
  });

  useEffect(() => {
    fetchKnowledgeGaps();
    fetchGapStats();
  }, [filter]);

  const fetchKnowledgeGaps = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/knowledge-gaps?filter=${filter}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGaps(data.gaps || []);
      } else {
        console.error('Failed to fetch knowledge gaps:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching knowledge gaps:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGapStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/knowledge-gaps/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Failed to fetch gap stats:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching gap stats:', error);
    }
  };

  const handleCreateKnowledgeEntry = async (gapId: string) => {
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...newEntryForm,
        keywords: newEntryForm.keywords.split(',').map(k => k.trim()).filter(k => k),
        resolveGapId: gapId // Link to the gap being resolved
      };

      const response = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Trigger gap re-evaluation
        await evaluateGapResolution(gapId);
        
        // Reset form and refresh data
        setNewEntryForm({
          title: '',
          content: '',
          category: '',
          keywords: '',
          medicalReviewed: false
        });
        setShowCreateForm(false);
        setSelectedGap(null);
        await fetchKnowledgeGaps();
        await fetchGapStats();
      }
    } catch (error) {
      console.error('Error creating knowledge entry:', error);
    }
  };

  const evaluateGapResolution = async (gapId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/knowledge-gaps/${gapId}/evaluate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error evaluating gap resolution:', error);
    }
  };

  const updateGapStatus = async (gapId: string, status: string, assignedTo?: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/knowledge-gaps/${gapId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, assignedTo })
      });

      if (response.ok) {
        await fetchKnowledgeGaps();
      }
    } catch (error) {
      console.error('Error updating gap status:', error);
    }
  };

  const startContentCreation = (gap: KnowledgeGap) => {
    setSelectedGap(gap);
    setNewEntryForm({
      title: `Informasi: ${gap.query}`,
      content: '',
      category: suggestCategory(gap.query),
      keywords: extractKeywords(gap.query),
      medicalReviewed: false
    });
    setShowCreateForm(true);
    updateGapStatus(gap.id, 'in_progress');
  };

  const suggestCategory = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('sakit') || lowerQuery.includes('nyeri')) return 'symptoms';
    if (lowerQuery.includes('obat') || lowerQuery.includes('pengobatan')) return 'treatments';
    if (lowerQuery.includes('demam') || lowerQuery.includes('panas')) return 'symptoms';
    if (lowerQuery.includes('darurat') || lowerQuery.includes('emergency')) return 'emergency';
    return 'general';
  };

  const extractKeywords = (query: string): string => {
    return query.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter(word => word.length > 2)
      .join(', ');
  };

  const filteredGaps = gaps.filter(gap => 
    gap.query.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="p-6">Loading knowledge gaps...</div>;
  }

  return (
    <div className="p-6 text-gray-900">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <AlertTriangle className="h-6 w-6 text-orange-500 mr-2" />
            Knowledge Gap Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage unresolved user queries and create new knowledge entries
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Gaps</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalGaps}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Check className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.resolvedGaps}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inProgressGaps}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageResolutionTime}h</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search knowledge gaps..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        
        <div className="flex space-x-2">
          {['all', 'open', 'in_progress', 'resolved'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`px-4 py-2 rounded-lg ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Knowledge Gaps List */}
      <div className="space-y-4">
        {filteredGaps.map((gap) => (
          <div key={gap.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  "{gap.query}"
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Frequency: {gap.frequency}
                  </span>
                  <span>First seen: {new Date(gap.createdAt).toLocaleDateString()}</span>
                  <span>Last seen: {new Date(gap.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  gap.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                  gap.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {gap.status ? gap.status.toLowerCase().replace('_', ' ') : 'open'}
                </span>
                
                {(!gap.status || gap.status === 'OPEN') && (
                  <button
                    onClick={() => startContentCreation(gap)}
                    className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create Content
                  </button>
                )}
                
                {gap.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => updateGapStatus(gap.id, 'open')}
                    className="bg-gray-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-gray-700"
                  >
                    Reset to Open
                  </button>
                )}
              </div>
            </div>
            
            {gap.relatedEntries && gap.relatedEntries.length > 0 && (
              <div className="mt-3 p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium text-gray-700 mb-2">Related Knowledge Entries:</p>
                {gap.relatedEntries.map((entry) => (
                  <div key={entry.id} className="text-sm text-gray-600">
                    • {entry.title} ({entry.category})
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Knowledge Entry Modal */}
      {showCreateForm && selectedGap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              Create Knowledge Entry for: "{selectedGap.query}"
            </h2>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleCreateKnowledgeEntry(selectedGap.id);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={newEntryForm.title}
                  onChange={(e) => setNewEntryForm({ ...newEntryForm, title: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={newEntryForm.category}
                  onChange={(e) => setNewEntryForm({ ...newEntryForm, category: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="symptoms">Symptoms</option>
                  <option value="conditions">Conditions</option>
                  <option value="treatments">Treatments</option>
                  <option value="general">General Health</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Content</label>
                <textarea
                  value={newEntryForm.content}
                  onChange={(e) => setNewEntryForm({ ...newEntryForm, content: e.target.value })}
                  rows={6}
                  placeholder="Provide comprehensive information that answers the user's query..."
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Keywords (comma-separated)</label>
                <input
                  type="text"
                  value={newEntryForm.keywords}
                  onChange={(e) => setNewEntryForm({ ...newEntryForm, keywords: e.target.value })}
                  placeholder="keyword1, keyword2, keyword3"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="medicalReviewed"
                  checked={newEntryForm.medicalReviewed}
                  onChange={(e) => setNewEntryForm({ ...newEntryForm, medicalReviewed: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="medicalReviewed" className="text-sm">
                  Medical Professional Reviewed (check this to make it immediately available)
                </label>
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Create Entry & Resolve Gap
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setSelectedGap(null);
                    if (selectedGap) updateGapStatus(selectedGap.id, 'open');
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {filteredGaps.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No knowledge gaps found</h3>
          <p className="text-gray-600">
            {filter === 'all' ? 'No knowledge gaps have been identified yet.' : 
             `No ${filter.replace('_', ' ')} knowledge gaps found.`}
          </p>
        </div>
      )}
    </div>
  );
}