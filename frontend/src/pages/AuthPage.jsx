import { useState } from "react";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AuthPage({ setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    phone: "",
  });
  const navigate = useNavigate();

  const handlePhoneInput = (e) => {
    const onlyNums = e.target.value.replace(/[^0-9]/g, "");
    setFormData({ ...formData, phone: onlyNums });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLogin) {
      if (formData.password.length < 6) {
        toast.error("SECURITY VULNERABILITY", {
          description: "Password must be at least 6 characters.",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;
      const response = await axios.post(`${API}${endpoint}`, payload);
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      setUser(response.data.user);
      toast.success(
        isLogin ? "Welcome back!" : "Account created successfully!"
      );
      setTimeout(
        () => navigate(response.data.user.is_admin ? "/admin" : "/dashboard"),
        500
      );
    } catch (error) {
      toast.error(error.response?.data?.detail || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* --- ORIGINAL NEURAL PULSE BACKGROUND --- */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 -left-10 w-[500px] h-[500px] bg-cyan-500/30 blur-[130px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-10 w-[500px] h-[500px] bg-blue-600/20 blur-[130px] rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent -rotate-45 animate-[shimmer_3s_infinite] opacity-60"></div>
        <div className="absolute bottom-0 right-0 w-full h-[3px] bg-gradient-to-r from-transparent via-blue-400 to-transparent rotate-45 animate-[shimmer_5s_infinite] opacity-40"></div>
        <div className="absolute left-1/4 top-0 w-[2px] h-full bg-gradient-to-b from-transparent via-cyan-500/40 to-transparent animate-[shimmer_4s_infinite] opacity-30"></div>
      </div>

      {/* --- ORIGINAL SLIM & TALL BOX --- */}
      <div className="relative z-10 w-full max-w-[400px] mx-auto group">
        <div className="absolute -inset-[3px] bg-cyan-400 rounded-2xl blur-[10px] opacity-50 animate-pulse group-hover:opacity-70"></div>
        <div className="absolute -inset-[1px] bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 rounded-2xl z-0 shadow-[0_0_20px_#22d3ee]"></div>

        <div className="relative bg-[#0a0e27]/95 backdrop-blur-2xl rounded-[15px] p-12 border border-white/10">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-3 tracking-tighter">
              Habit Tracker
            </h1>
            <p className="text-gray-400 text-xs uppercase tracking-widest font-mono">
              Level Up Your Life, One Habit at a Time.
            </p>
          </div>

          <div className="flex gap-2 mb-8">
            <Button
              onClick={() => setIsLogin(true)}
              className={`flex-1 rounded-xl py-3 font-bold transition-all text-[12px] tracking-widest uppercase ${
                isLogin
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                  : "bg-transparent border border-gray-800 text-gray-500"
              }`}
            >
              Login
            </Button>
            <Button
              onClick={() => setIsLogin(false)}
              className={`flex-1 rounded-xl py-3 font-bold transition-all text-[12px] tracking-widest uppercase ${
                !isLogin
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                  : "bg-transparent border border-gray-700 text-gray-400"
              }`}
            >
              Register
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="text-gray-300 mb-2 block text-[10px] uppercase font-bold tracking-widest">
                Email Identity
              </Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full bg-[#0a0e27] border-gray-700 text-white rounded-xl p-4 focus:border-cyan-400 font-mono transition-all placeholder:text-gray-600"
                required
                placeholder="USER@PROTOCOL.COM"
              />
            </div>

            <div>
              <Label className="text-gray-300 mb-2 block text-[10px] uppercase font-bold tracking-widest flex justify-between">
                Password
                {!isLogin &&
                  formData.password.length > 0 &&
                  formData.password.length < 6 && (
                    <span className="text-red-500 animate-pulse italic text-[8px]">
                      ! MIN 6 CHARS
                    </span>
                  )}
              </Label>
              <div className="relative group">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full bg-[#0a0e27] border-gray-700 text-white rounded-xl p-4 pr-12 focus:border-cyan-400 font-mono transition-all placeholder:text-gray-700"
                  required
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-cyan-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="animate-in fade-in slide-in-from-top-1">
                <Label className="text-gray-300 mb-2 block text-[10px] uppercase font-bold tracking-widest flex justify-between">
                  Phone No
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={formData.phone}
                  maxLength={10}
                  onChange={handlePhoneInput}
                  className="w-full bg-[#0a0e27] border-gray-700 text-white rounded-xl p-4 focus:border-cyan-400 font-mono transition-all placeholder:text-gray-600"
                  placeholder="PH_1234567890"
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-125 text-white rounded-xl py-5 uppercase shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all mt-6"
            >
              {loading
                ? "LINKING..."
                : isLogin
                ? "Initialize Session"
                : "Create Identity"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
