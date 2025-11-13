import { useState } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AuthPage({ setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: ''
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(`${API}${endpoint}`, payload);
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setUser(response.data.user);
      
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
      
      setTimeout(() => {
        navigate(response.data.user.is_admin ? '/admin' : '/dashboard');
      }, 500);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1d2e] to-[#0a0e27] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background shapes */}
      <div className="bg-shape bg-shape-1"></div>
      <div className="bg-shape bg-shape-2"></div>
      <div className="bg-shape bg-shape-3"></div>

      <div className="glow-container relative z-10 py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-[#1a1d2e]/80 backdrop-blur-xl rounded-2xl p-8 shadow-lg shadow-cyan-500/20">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
                QuestHacker
              </h1>
              <p className="text-gray-400">Level up your life, one habit at a time</p>
            </div>

            <div className="flex gap-2 mb-6">
              <Button
                data-testid="login-tab-btn"
                onClick={() => setIsLogin(true)}
                className={`flex-1 rounded-xl py-3 font-medium transition-all ${
                  isLogin
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/50'
                    : 'bg-transparent border border-gray-700 text-gray-400 hover:bg-gray-800'
                }`}
              >
                Login
              </Button>
              <Button
                data-testid="register-tab-btn"
                onClick={() => setIsLogin(false)}
                className={`flex-1 rounded-xl py-3 font-medium transition-all ${
                  !isLogin
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/50'
                    : 'bg-transparent border border-gray-700 text-gray-400 hover:bg-gray-800'
                }`}
              >
                Register
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-gray-300 mb-2 block">Email</Label>
                <Input
                  id="email"
                  data-testid="email-input"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#0a0e27] border-gray-700 text-white rounded-xl p-3 focus:border-cyan-500"
                  required
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-gray-300 mb-2 block">Password</Label>
                <Input
                  id="password"
                  data-testid="password-input"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-[#0a0e27] border-gray-700 text-white rounded-xl p-3 focus:border-cyan-500"
                  required
                  placeholder="••••••••"
                />
              </div>

              {!isLogin && (
                <div>
                  <Label htmlFor="phone" className="text-gray-300 mb-2 block">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    data-testid="phone-input"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#0a0e27] border-gray-700 text-white rounded-xl p-3 focus:border-cyan-500"
                    placeholder="+1234567890"
                  />
                </div>
              )}

              <Button
                data-testid="auth-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl py-3 font-medium shadow-lg shadow-cyan-500/50 disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="spinner w-5 h-5"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-400">
              <p>Admin users automatically get access to the admin panel</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}