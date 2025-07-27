// src/components/admin/KnowledgeManager.tsx
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Lightbulb, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { keywordExtractor } from '@/lib/keyword-extractor';

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  medicalReviewed: boolean;
  createdAt: string;
}

export default function KnowledgeManager() {
  const { logout } = useAuth(); // Add this hook

  // Helper function to make authenticated requests
  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      // User will be redirected automatically due to auth state change
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [additionalKeywords, setAdditionalKeywords] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    keywords: '',
    medicalReviewed: false
  });

  useEffect(() => {
    fetchEntries();
  }, [selectedCategory]);

  const fetchEntries = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);

      const response = await fetch(`/api/knowledge?${params}`);
      const data = await response.json();

      if (response.ok) {
        setEntries(data.entries);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const payload = {
        ...formData,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k)
      };

      const url = editingEntry ? `/api/knowledge/${editingEntry.id}` : '/api/knowledge';
      const response = await makeAuthenticatedRequest(url, {
        method: editingEntry ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchEntries();
        setMessage({ 
          type: 'success', 
          text: editingEntry ? 'Entry updated successfully!' : 'Entry created successfully!' 
        });
        resetForm();
        // Clear success message after 3 seconds
        setTimeout(() => setMessage(null), 3000);
      } else {
        const errorData = await response.json();
        setMessage({ 
          type: 'error', 
          text: errorData.error || 'Failed to save entry' 
        });
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      setMessage({ 
        type: 'error', 
        text: 'Network error occurred while saving entry' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: '',
      keywords: '',
      medicalReviewed: false
    });
    setEditingEntry(null);
    setShowForm(false);
    setSuggestedKeywords([]);
    setAdditionalKeywords([]);
    setShowSuggestions(false);
  };

  const startEdit = (entry: KnowledgeEntry) => {
    setFormData({
      title: entry.title,
      content: entry.content,
      category: entry.category,
      keywords: entry.keywords.join(', '),
      medicalReviewed: entry.medicalReviewed
    });
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleDelete = async (entry: KnowledgeEntry) => {
    // Enhanced confirmation dialog with more context
    const confirmMessage = `Are you sure you want to delete "${entry.title}"?\n\nThis action will permanently remove:\n• The knowledge entry\n• All version history\n• Related search analytics\n\nThis cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setMessage({ 
        type: 'success', 
        text: `Deleting "${entry.title}"...` 
      });

      const response = await makeAuthenticatedRequest(`/api/knowledge/${entry.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        await fetchEntries();
        
        // Show detailed success message
        const deletedInfo = result.deletedCounts 
          ? ` (${result.deletedCounts.queryMatches} analytics records and ${result.deletedCounts.versions} versions removed)`
          : '';
        
        setMessage({ 
          type: 'success', 
          text: `Successfully deleted "${entry.title}"${deletedInfo}` 
        });
        // Clear success message after 5 seconds for longer message
        setTimeout(() => setMessage(null), 5000);
      } else {
        const errorData = await response.json();
        console.error('Delete error response:', errorData);
        
        // Provide user-friendly error messages
        let errorMessage = 'Failed to delete entry';
        if (response.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
          // Auto-logout if unauthorized
          setTimeout(() => {
            logout();
          }, 2000);
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to delete entries.';
        } else if (response.status === 404) {
          errorMessage = 'Entry not found. It may have already been deleted.';
        } else if (response.status === 400) {
          errorMessage = 'Cannot delete entry due to database constraints. Please contact support.';
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        setMessage({ 
          type: 'error', 
          text: errorMessage
        });
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      setMessage({ 
        type: 'error', 
        text: 'Network error occurred while deleting entry. Please check your connection and try again.' 
      });
    }
  };

  // Extract keywords from content
  const extractKeywordsFromContent = () => {
    const textToAnalyze = `${formData.title} ${formData.content}`.trim();
    
    if (textToAnalyze.length < 10) {
      setMessage({ 
        type: 'error', 
        text: 'Please add more content to extract keywords' 
      });
      return;
    }

    const result = keywordExtractor.extractKeywordsWithSuggestions(textToAnalyze);
    const categoryKeywords = formData.category 
      ? keywordExtractor.suggestKeywordsByCategory(formData.category)
      : [];

    // Combine extracted keywords with category-specific ones
    const combinedSuggested = [...new Set([...result.suggested, ...categoryKeywords.slice(0, 3)])];
    
    setSuggestedKeywords(combinedSuggested.slice(0, 8));
    setAdditionalKeywords(result.additional);
    setShowSuggestions(true);

    setMessage({ 
      type: 'success', 
      text: `Found ${combinedSuggested.length} keyword suggestions!` 
    });
    setTimeout(() => setMessage(null), 3000);
  };

  // Add suggested keyword to form
  const addKeyword = (keyword: string) => {
    const currentKeywords = formData.keywords.split(',').map(k => k.trim()).filter(k => k);
    
    if (!currentKeywords.includes(keyword)) {
      const newKeywords = [...currentKeywords, keyword].join(', ');
      setFormData({ ...formData, keywords: newKeywords });
    }
  };

  // Remove keyword from form
  const removeKeyword = (keywordToRemove: string) => {
    const currentKeywords = formData.keywords.split(',').map(k => k.trim()).filter(k => k);
    const filteredKeywords = currentKeywords.filter(k => k !== keywordToRemove);
    setFormData({ ...formData, keywords: filteredKeywords.join(', ') });
  };

  // Auto-extract keywords when content or category changes
  useEffect(() => {
    if (showForm && !editingEntry && formData.content.length > 100 && formData.title.length > 5) {
      // Auto-extract for new entries when content is substantial
      const timeoutId = setTimeout(() => {
        extractKeywordsFromContent();
      }, 2000); // Debounce to avoid too many calls

      return () => clearTimeout(timeoutId);
    }
  }, [formData.content, formData.category, showForm, editingEntry]);

  const filteredEntries = entries.filter(entry =>
    entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-6 text-gray-900">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Knowledge Base Management</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Entry</span>
          </button>
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

      {/* Success/Error Message */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-300' 
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex space-x-4">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Categories</option>
          <option value="symptoms">Symptoms</option>
          <option value="conditions">Conditions</option>
          <option value="treatments">Treatments</option>
          <option value="general">General Health</option>
          <option value="emergency">Emergency</option>
        </select>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingEntry ? 'Edit Entry' : 'Add New Entry'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">Keywords (comma-separated)</label>
                  <button
                    type="button"
                    onClick={extractKeywordsFromContent}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                    title="Automatically extract relevant keywords from the title and content"
                  >
                    <Lightbulb className="h-4 w-4" />
                    <span>Extract Keywords</span>
                  </button>
                </div>
                
                <textarea
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  placeholder="headache, fever, pain"
                  rows={2}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />

                {/* Current Keywords Display */}
                {formData.keywords && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-600 mb-1">Current Keywords:</div>
                    <div className="flex flex-wrap gap-1">
                      {formData.keywords.split(',').map((keyword, index) => {
                        const trimmedKeyword = keyword.trim();
                        if (!trimmedKeyword) return null;
                        return (
                          <span
                            key={index}
                            className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                          >
                            {trimmedKeyword}
                            <button
                              type="button"
                              onClick={() => removeKeyword(trimmedKeyword)}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Keyword Suggestions */}
                {showSuggestions && (suggestedKeywords.length > 0 || additionalKeywords.length > 0) && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      💡 Suggested Keywords (click to add):
                    </div>
                    
                    {/* Primary Suggestions */}
                    {suggestedKeywords.length > 0 && (
                      <div className="mb-2">
                        <div className="text-xs text-gray-600 mb-1">Recommended:</div>
                        <div className="flex flex-wrap gap-1">
                          {suggestedKeywords.map((keyword, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => addKeyword(keyword)}
                              className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs hover:bg-green-200 transition-colors"
                            >
                              + {keyword}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Additional Suggestions */}
                    {additionalKeywords.length > 0 && (
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Additional Options:</div>
                        <div className="flex flex-wrap gap-1">
                          {additionalKeywords.map((keyword, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => addKeyword(keyword)}
                              className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs hover:bg-gray-200 transition-colors"
                            >
                              + {keyword}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowSuggestions(false)}
                      className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                    >
                      Hide suggestions
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="medicalReviewed"
                  checked={formData.medicalReviewed}
                  onChange={(e) => setFormData({ ...formData, medicalReviewed: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="medicalReviewed" className="text-sm">
                  Medical Professional Reviewed
                </label>
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`px-4 py-2 rounded-lg ${
                    isSaving 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  {isSaving 
                    ? (editingEntry ? 'Updating...' : 'Creating...') 
                    : (editingEntry ? 'Update' : 'Create')} Entry
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSaving}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Entries List */}
      <div className="grid gap-4">
        {filteredEntries.map((entry) => (
          <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold">{entry.title}</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => startEdit(entry)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleDelete(entry)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4 mb-2">
              <span className="bg-gray-100 px-2 py-1 rounded text-sm">
                {entry.category.charAt(0).toUpperCase() + entry.category.slice(1)}
              </span>
              {entry.medicalReviewed && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                  ✓ Medical Reviewed
                </span>
              )}
            </div>

            <p className="text-gray-700 mb-2 line-clamp-3">{entry.content}</p>

            <div className="flex flex-wrap gap-1">
              {entry.keywords.map((keyword, index) => (
                <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}