import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, UserX, Activity, Trash2, LogOut } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminPanel({ user, setUser }) {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const fetchData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        axios.get(`${API}/admin/users`, getAuthHeader()),
        axios.get(`${API}/admin/stats`, getAuthHeader())
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to load admin data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`${API}/admin/users/${userId}`, getAuthHeader());
      toast.success('User deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1d2e] to-[#0a0e27] flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1d2e] to-[#0a0e27] relative overflow-hidden">
      <div className="bg-shape bg-shape-1"></div>
      <div className="bg-shape bg-shape-2"></div>
      <div className="bg-shape bg-shape-3"></div>

      <div className="glow-container relative z-10 py-8 px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-400 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
              Admin Panel
            </h1>
            <p className="text-gray-400 mt-1">Manage users and system stats</p>
          </div>
          <Button
            data-testid="admin-logout-btn"
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div data-testid="total-users-card" className="bg-[#1a1d2e]/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-red-500/20 card-hover">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-white">{stats.total_users}</p>
              </div>
            </div>
          </div>

          <div data-testid="admin-users-card" className="bg-[#1a1d2e]/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-orange-500/20 card-hover">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-xl">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Admin Users</p>
                <p className="text-3xl font-bold text-white">{stats.admin_users}</p>
              </div>
            </div>
          </div>

          <div data-testid="inactive-users-card" className="bg-[#1a1d2e]/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-yellow-500/20 card-hover">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Inactive Users</p>
                <p className="text-3xl font-bold text-white">{stats.inactive_users}</p>
              </div>
            </div>
          </div>

          <div data-testid="activity-card" className="bg-[#1a1d2e]/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-amber-500/20 card-hover">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-red-600 rounded-xl">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Activity</p>
                <p className="text-3xl font-bold text-white">{stats.total_completions}</p>
                <p className="text-xs text-gray-500">{stats.total_habits} active habits</p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-[#1a1d2e]/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-red-500/20">
          <h2 className="text-2xl font-bold text-white mb-6">User Management</h2>
          
          {users.length === 0 ? (
            <div data-testid="no-users-message" className="text-center py-12">
              <p className="text-gray-400 text-lg">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-400 font-medium py-3 px-4">Email</th>
                    <th className="text-left text-gray-400 font-medium py-3 px-4">Level</th>
                    <th className="text-left text-gray-400 font-medium py-3 px-4">XP</th>
                    <th className="text-left text-gray-400 font-medium py-3 px-4">Streak</th>
                    <th className="text-left text-gray-400 font-medium py-3 px-4">Role</th>
                    <th className="text-left text-gray-400 font-medium py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} data-testid={`user-row-${u.id}`} className="border-b border-gray-800 hover:bg-[#0a0e27]/50">
                      <td className="py-4 px-4 text-white">{u.email}</td>
                      <td className="py-4 px-4 text-white">{u.level}</td>
                      <td className="py-4 px-4 text-white">{u.xp}</td>
                      <td className="py-4 px-4 text-white">{u.current_streak} days</td>
                      <td className="py-4 px-4">
                        {u.is_admin ? (
                          <span className="px-3 py-1 bg-gradient-to-r from-red-500 to-orange-600 rounded-full text-xs font-medium shadow-lg shadow-red-500/30">
                            Admin
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-gray-700 rounded-full text-xs font-medium text-gray-300">
                            User
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {!u.is_admin ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                data-testid={`delete-user-btn-${u.id}`}
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-3 py-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#1a1d2e] border-gray-700 text-white">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-400">
                                  This will permanently delete the user and all their data. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-gray-700 hover:bg-gray-600 text-white border-0">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  data-testid={`confirm-delete-user-${u.id}`}
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <span className="text-gray-500 text-sm">Protected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}