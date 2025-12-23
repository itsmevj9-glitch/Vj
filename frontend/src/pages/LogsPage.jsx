import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, ShieldAlert } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${API}/admin/logs`, getAuthHeader());
      setLogs(res.data);
    } catch (error) {
      toast.error("Access Denied: Admin Clearance Required");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatDate = (isoStr) => {
    return new Date(isoStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e27] relative overflow-x-hidden flex flex-col font-sans text-white">
      {/* Background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>

      <div className="relative z-10 py-12 px-4 md:px-16 lg:px-24 w-full max-w-[1400px] mx-auto flex-grow">
        <div className="relative border-2 border-red-500/40 rounded-[2.5rem] p-6 md:p-10 shadow-[0_0_40px_rgba(239,68,68,0.15)] bg-[#0a0e27]/40 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
              {/* FIX: Added 'pr-4' (padding-right) so the italic 's' doesn't get cut off */}
              <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent uppercase leading-tight pb-2 pr-4">
                System Logs
              </h1>
              <p className="text-gray-400 font-mono text-[10px] uppercase tracking-[0.4em] mt-1">
                Access History // Encrypted
              </p>
            </div>

            <Button
              onClick={() => navigate("/admin")}
              className="bg-gray-800 hover:bg-gray-700 text-white rounded-xl px-6 py-6 border border-white/10 w-full md:w-auto"
            >
              <ArrowLeft className="w-5 h-5 mr-2" /> Back
            </Button>
          </div>

          <div className="bg-[#1a1d2e]/90 rounded-[2rem] p-6 border border-white/10 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-[10px] uppercase font-black text-white tracking-[0.2em]">
                    <th className="text-left py-4 px-4">Timestamp</th>
                    <th className="text-left py-4 px-4">Operative</th>
                    <th className="text-left py-4 px-4">Event</th>
                    <th className="text-right py-4 px-4">Clearance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-red-500/5 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-gray-400 font-mono text-xs whitespace-nowrap">
                          <Clock className="w-3 h-3" />{" "}
                          {formatDate(log.timestamp)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-white font-bold">
                          {log.username}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          {log.email}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                            log.action === "LOGIN"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : log.action === "REGISTER"
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {log.role === "ADMIN" ? (
                            <span className="text-red-500 font-black text-[10px] uppercase flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" /> ROOT
                            </span>
                          ) : (
                            <span className="text-gray-500 font-bold text-[10px] uppercase">
                              USER
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && (
                <div className="text-center py-12 text-gray-500 font-mono text-sm">
                  NO LOGS FOUND IN SYSTEM CORE
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
