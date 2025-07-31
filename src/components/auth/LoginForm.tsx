import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface FormData {
  email: string;
  password: string;
}

export default function LoginForm() {
  // State management
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();

  // Event handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const validateForm = (): boolean => {
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        setSuccess('Login successful!');
      } else {
        setError(result.error || 'An error occurred');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Render helpers
  const renderAlert = (type: 'error' | 'success', message: string) => {
    const isError = type === 'error';
    const Icon = isError ? AlertCircle : CheckCircle;
    const bgColor = isError ? 'bg-red-50' : 'bg-green-50';
    const borderColor = isError ? 'border-red-200' : 'border-green-200';
    const iconColor = isError ? 'text-red-500' : 'text-green-500';
    const textColor = isError ? 'text-red-700' : 'text-green-700';

    return (
      <div className={`mb-4 p-4 ${bgColor} border ${borderColor} rounded-lg flex items-center gap-2`}>
        <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0`} />
        <span className={`${textColor} text-sm`}>{message}</span>
      </div>
    );
  };

  const renderHeader = () => (
    <div className="text-center mb-8">
      <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
        <Lock className="w-8 h-8 text-blue-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">
        Welcome Back
      </h1>
      <p className="text-gray-600 mt-2">
        Sign in to your account
      </p>
    </div>
  );

  const renderEmailField = () => (
    <div>
      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
        Email Address
      </label>
      <div className="relative">
        <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
          placeholder="Enter your email"
          required
          disabled={isLoading}
        />
      </div>
    </div>
  );

  const renderPasswordField = () => (
    <div>
      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
        Password
      </label>
      <div className="relative">
        <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        <input
          type={showPassword ? 'text' : 'password'}
          id="password"
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
          placeholder="Enter your password"
          required
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          disabled={isLoading}
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );

  const renderSubmitButton = () => (
    <button
      onClick={handleSubmit}
      disabled={isLoading}
      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
          Signing In...
        </div>
      ) : (
        'Sign In'
      )}
    </button>
  );

  const renderFooter = () => (
    <>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {renderHeader()}

        {error && renderAlert('error', error)}
        {success && renderAlert('success', success)}

        <form onSubmit={handleSubmit} className="space-y-6">
          {renderEmailField()}
          {renderPasswordField()}
          {renderSubmitButton()}
        </form>

        {renderFooter()}
      </div>
    </div>
  );
}