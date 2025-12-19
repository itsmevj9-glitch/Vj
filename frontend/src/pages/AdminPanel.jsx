import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Shield,
  UserX,
  Activity,
  Trash2,
  LogOut,
  Search,
  Terminal,
  Crown,
} from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminPanel({ user, setUser }) {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  const fetchData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        axios.get(`${API}/admin/users`, getAuthHeader()),
        axios.get(`${API}/admin/stats`, getAuthHeader()),
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error("Access Denied");
      navigate("/");
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
      toast.success("Operative Purged");
      fetchData();
    } catch (error) {
      toast.error("Purge Failed");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    navigate("/auth");
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username &&
        u.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e27] relative overflow-x-hidden flex flex-col font-sans">
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>
      <div className="bg-shape bg-shape-1 opacity-20"></div>

      <div className="relative z-10 py-12 px-4 md:px-16 lg:px-24 w-full max-w-[1400px] mx-auto flex-grow">
        <div className="relative border-2 border-red-500/40 rounded-[2.5rem] p-6 md:p-10 shadow-[0_0_40px_rgba(239,68,68,0.15)] bg-[#0a0e27]/40 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent uppercase leading-tight">
                Admin
              </h1>
              <p className="text-white-500 font-mono text-[10px] uppercase tracking-[0.4em] mt-1">
                Authorized Root Access Only
              </p>
            </div>
            <Button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-8 py-6 text-lg font-bold shadow-lg shadow-red-600/30 transition-all hover:scale-105"
            >
              <LogOut className="w-5 h-5 mr-2" /> Logout
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {[
              {
                label: "Total Users",
                val: stats.total_users,
                icon: Users,
                color: "red",
              },
              {
                label: "Admin Team",
                val: stats.admin_users,
                icon: Shield,
                color: "orange",
              },
              {
                label: "Inactive",
                val: stats.inactive_users,
                icon: UserX,
                color: "yellow",
              },
              {
                label: "Total Quests",
                val: stats.total_habits,
                icon: Activity,
                color: "emerald",
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`bg-[#1a1d2e]/90 border-[3px] border-${item.color}-500/50 p-5 rounded-2xl shadow-lg shadow-${item.color}-500/10`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 bg-${item.color}-500/20 rounded-xl text-${item.color}-400`}
                  >
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-[9px] uppercase font-black tracking-widest">
                      {item.label}
                    </p>
                    <p className="text-2xl font-black text-white">{item.val}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#1a1d2e]/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-12 flex flex-wrap gap-6 items-center shadow-xl">
            <Button
              onClick={() => navigate("/leaderboard")}
              className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black uppercase px-6 h-12 shadow-lg shadow-purple-600/30 transition-all"
            >
              <Crown className="w-4 h-4 mr-2" /> View Leaderboard
            </Button>

            <div className="flex-1 min-w-[280px] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search Alias or Email..."
                className="pl-12 bg-black/60 border-gray-700 text-white focus:border-red-500 h-12 text-sm rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-[#1a1d2e]/90 rounded-[2rem] p-6 border border-white/10 shadow-2xl mb-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-[10px] uppercase font-black text-white tracking-[0.2em]">
                    <th className="text-left py-4 px-4">Operative Alias</th>
                    <th className="text-left py-4 px-4">Rank</th>
                    <th className="text-left py-4 px-4">XP Core</th>
                    <th className="text-left py-4 px-4">Status</th>
                    <th className="text-right py-4 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-red-500/10 transition-colors"
                    >
                      <td className="py-5 px-4">
                        <div className="text-white font-bold text-lg leading-tight">
                          {u.username || u.email}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          {u.email}
                        </div>
                      </td>
                      <td className="py-5 px-4">
                        <span className="text-red-500 font-black italic text-lg uppercase">
                          LVL {u.level}
                        </span>
                      </td>
                      <td className="py-5 px-4 text-white font-mono">
                        {u.xp} XP
                      </td>
                      <td className="py-5 px-4">
                        {u.is_admin ? (
                          <span className="px-4 py-1.5 bg-red-600 text-white rounded text-[9px] font-black uppercase tracking-tighter">
                            Admin
                          </span>
                        ) : (
                          <span className="px-4 py-1.5 bg-gray-800 text-gray-400 rounded text-[9px] font-black uppercase">
                            Operative
                          </span>
                        )}
                      </td>
                      <td className="py-5 px-4 text-right">
                        {!u.is_admin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button className="bg-red-600/10 text-red-500 border border-red-500/30 hover:bg-red-600 hover:text-white px-4 py-2">
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#1a1d2e] border-gray-700 text-white">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="font-black italic text-red-500 uppercase text-2xl">
                                  Purge Record?
                                </AlertDialogTitle>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-gray-800 text-white border-0">
                                  Abort
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="bg-red-600 text-white font-bold uppercase"
                                >
                                  Purge
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <footer className="relative z-20 mt-auto bg-[#050816] border-t-2 border-red-500/50 py-12 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h3 className="text-red-500 font-black italic text-2xl uppercase tracking-tighter leading-none mb-1">
              V Command Nexus
            </h3>
            <p className="text-white-400 font-mono text-[10px] uppercase tracking-[0.4em]">
              Authorized Root Access Protocol
            </p>
          </div>
          <div className="flex gap-10 text-gray-300 text-[10px] uppercase font-black tracking-[0.2em]">
            <span className="hover:text-red-500 cursor-pointer transition">
              Logs
            </span>
            <span className="hover:text-red-500 cursor-pointer transition">
              Sync
            </span>
            <span className="hover:text-red-500 cursor-pointer transition">
              Support
            </span>
          </div>
          <div className="text-[10px] text-white-700 font-mono italic tracking-widest uppercase">
            © 2025 // ROOT_TERMINAL
          </div>
        </div>
      </footer>
    </div>
  );
}
