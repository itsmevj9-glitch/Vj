import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import NotificationManager from "../components/ui/NotificationManager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Award,
  Flame,
  Trophy,
  Target,
  Plus,
  Check,
  Trash2,
  LogOut,
  Bell,
  Crown,
  Edit3,
  Zap,
  Gift,
  Lock,
  UserCircle,
  Info,
  Terminal,
  CalendarDays,
  ChevronDown,
  Menu,
  X,
  Minus,
  ShieldCheck,
} from "lucide-react";

// --- IMPORT FIREBASE LOGIC ---
import { getMessaging, getToken } from "firebase/messaging";
import { messaging } from "../lib/firebase";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard({ user, setUser }) {
  const [stats, setStats] = useState(null);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [intelOpen, setIntelOpen] = useState(false);
  const [completedToday, setCompletedToday] = useState(new Set());
  const [weeklyCompletions, setWeeklyCompletions] = useState([]);
  const [newUsername, setNewUsername] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  // Updated state for day selection
  const [trackingHabit, setTrackingHabit] = useState(null); // The habit being updated
  const [progressValue, setProgressValue] = useState(0);
  const submitProgressReport = async () => {
    try {
      const val = parseFloat(progressValue);

      await axios.patch(
        `${API}/habits/${trackingHabit.id}`,
        {
          current_value: val,
        },
        getAuthHeader()
      );

      setHabits((prev) =>
        prev.map((h) =>
          h.id === trackingHabit.id ? { ...h, current_value: val } : h
        )
      );

      toast.success("REPORT GENERATED", {
        description: `Current Status: ${(
          (val / trackingHabit.target_value) *
          100
        ).toFixed(1)}% complete.`,
        icon: <Zap className="text-yellow-400 animate-pulse" />,
      });

      setTrackingHabit(null);
      fetchData();
    } catch (error) {
      toast.error("SYNC FAILED", {
        description: "Could not upload progress to the Python server.",
      });
    }
  };

  const [showDayPicker, setShowDayPicker] = useState(false);
  const [habitForm, setHabitForm] = useState({
    name: "",
    description: "",
    frequency: "daily",
    notification_time: "",
    is_measurable: false,
    target_value: "",
    starting_point: 0,
    unit: "",
  });

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const handleSaveEdit = async () => {
    try {
      await axios.patch(
        `${API}/habits/${editingHabit.id}`,
        {
          name: editingHabit.name,
          notification_time: editingHabit.notification_time,
          frequency: editingHabit.frequency,
        },
        getAuthHeader()
      );

      toast.success("CONFIGURATION UPDATED");
      setIsEditDialogOpen(false);
      setEditingHabit(null);
      fetchData(); // Refresh the list to show new name/time
    } catch (error) {
      toast.error("Update Failed");
    }
  };

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const toggleDay = (day) => {
    let currentDays =
      habitForm.frequency === "daily" ? [] : habitForm.frequency.split(",");
    if (currentDays.includes(day)) {
      currentDays = currentDays.filter((d) => d !== day);
    } else {
      currentDays.push(day);
    }

    const newFrequency =
      currentDays.length === 0 ? "daily" : currentDays.join(",");
    setHabitForm({ ...habitForm, frequency: newFrequency });
  };

  const navigate = useNavigate();

  // --- HELPER: TOGGLE DAYS FOR EDITING ---
  const toggleEditDay = (day) => {
    if (!editingHabit) return;
    let currentFreq = editingHabit.frequency || "daily";
    let currentDays =
      currentFreq === "daily"
        ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        : currentFreq.split(",");

    if (currentDays.includes(day)) {
      currentDays = currentDays.filter((d) => d !== day);
    } else {
      currentDays.push(day);
    }

    const newFreq =
      currentDays.length === 7 || currentDays.length === 0
        ? "daily"
        : currentDays.join(",");

    setEditingHabit({ ...editingHabit, frequency: newFreq });
  };

  // --- NEURAL LINK: CONNECTS BROWSER TO PYTHON SERVER ---
  const handleEnableAlerts = async () => {
    if (user?.fcm_token) {
      try {
        await axios.delete(`${API}/auth/fcm-token`, getAuthHeader());
        setUser({ ...user, fcm_token: null });
        toast.success("Neural Link Deactivated");
      } catch (e) {
        console.error(e);
        toast.error("Disconnect Failed");
      }
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const token = await getToken(messaging, {
          vapidKey:
            "BDNIleLzdXrxJvBcpAHINCpv7mX1YmZwXmp6ChG_q_Sdt-PklKBwicPX_AQHH7oZjWt1kF1nYiWT-H-koo5GABo",
        });

        if (token) {
          await axios.post(`${API}/auth/fcm-token`, { token }, getAuthHeader());
          setUser({ ...user, fcm_token: token });
          toast.success("Neural Link Established");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Connection Failed");
    }
  };

  const handleBuyShield = async () => {
    try {
      const res = await axios.post(
        `${API}/shop/buy-shield`,
        {},
        getAuthHeader()
      );
      setUser({
        ...user,
        xp: res.data.new_xp,
        shields: res.data.shields,
        level: Math.floor(res.data.new_xp / 100) + 1,
      });
      setStats((prev) => ({
        ...prev,
        xp: res.data.new_xp,
        shields: res.data.shields,
      }));
      toast.success("SHIELD SECURED");
    } catch (error) {
      toast.error("Insufficient XP");
    }
  };

  const dailyQuote = useMemo(() => {
    const quotes = [
      "Small wins every day lead to big results every year.",
      "The secret of your future is hidden in your daily routine.",
      "Don't wait for motivation. Design a system that works without it.",
      "Your habits define your future. Make them count today.",
      "Consistency is the bridge between goals and accomplishment.",
      "Discipline is choosing between what you want now and what you want most.",
      "You don't have to be great to start, but you have to start to be great.",
      "Success is the sum of small efforts, repeated day in and day out.",
      "The best way to predict your future is to create it.",
      "Everything you’ve ever wanted is on the other side of consistency.",
    ];
    const now = new Date();
    const dateString = `${now.getFullYear()}${now.getMonth()}${now.getDate()}`;
    return quotes[parseInt(dateString) % quotes.length];
  }, []);

  const progressionGuide = {
    ranks: [
      {
        lvl: 0,
        title: "Novice Adventurer",
        desc: "Just starting the journey.",
      },
      { lvl: 5, title: "Elite Scout", desc: "Proven consistency in missions." },
      {
        lvl: 15,
        title: "Legendary Master",
        desc: "Total mastery of daily discipline.",
      },
    ],
    tags: [
      { name: "Beginner", req: "Level 1", color: "text-slate-400" },
      { name: "Novice", req: "Level 5", color: "text-green-400" },
      { name: "Intermediate", req: "Level 10", color: "text-cyan-400" },
      { name: "Expert", req: "Level 15", color: "text-purple-400" },
      { name: "Master", req: "Level 20+", color: "text-yellow-400" },
    ],
  };

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  const fetchData = async () => {
    try {
      const [statsRes, habitsRes, completionsRes, weeklyRes] =
        await Promise.all([
          axios.get(`${API}/stats`, getAuthHeader()),
          axios.get(`${API}/habits`, getAuthHeader()),
          axios.get(`${API}/habits/completions/today`, getAuthHeader()),
          axios.get(`${API}/habits/completions/weekly`, getAuthHeader()), // Add this
        ]);
      setStats(statsRes.data);
      setHabits(habitsRes.data);
      setCompletedToday(new Set(completionsRes.data.map((c) => c.habit_id)));
      setWeeklyCompletions(weeklyRes.data); // Add this
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isIdentityClaimed =
    user?.username && user.username !== user.email.split("@")[0];

  async function handleUpdateUsername() {
    try {
      await axios.patch(
        `${API}/auth/username`,
        { username: newUsername },
        getAuthHeader()
      );
      toast.success("IDENTITY VERIFIED");
      const updatedUser = { ...user, username: newUsername };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Update Failed");
    }
  }
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(user?.username || "");

  const handleSaveUsername = async () => {
    const nameToSave = tempName.trim();

    const isValid = /^[a-zA-Z0-9]+$/.test(nameToSave);

    if (!nameToSave) return setIsEditingName(false);

    if (!isValid) {
      toast.error("INVALID IDENTITY", {
        description:
          "Only alphabets and numbers are allowed. No spaces or symbols.",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        "http://127.0.0.1:8000/api/auth/username",
        { username: nameToSave },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUser((prev) => ({ ...prev, username: nameToSave }));
      toast.success("IDENTITY UPDATED");
      setIsEditingName(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    }
  };
  const handleUpdateDescription = async (habitId, newDesc) => {
    try {
      await axios.patch(
        `${API}/habits/${habitId}`,
        { description: newDesc },
        getAuthHeader()
      );
      toast.success("MISSION DATA SYNCED");
      fetchData();
    } catch (error) {
      toast.error("DATA LINK INTERRUPTED");
    }
  };

  const handleCompleteHabit = async (habitId) => {
    try {
      const response = await axios.post(
        `${API}/habits/${habitId}/complete`,
        {},
        getAuthHeader()
      );
      toast.success(`+${response.data.xp_earned} XP SECURED! 🎉`);
      setCompletedToday((prev) => new Set([...prev, habitId]));
      if (response.data.new_level > stats.level)
        toast.success(`LEVEL UP: Rank ${response.data.new_level}`);
      fetchData();

      const updatedUser = {
        ...user,
        xp: response.data.new_xp,
        level: response.data.new_level,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      toast.error("Action Denied");
    }
  };

  const handleDeleteHabit = async (habitId) => {
    try {
      await axios.delete(`${API}/habits/${habitId}`, getAuthHeader());
      toast.success("Habit Deleted");
      fetchData();
    } catch (error) {
      toast.error("Deletion Failed");
    }
  };

  const handleCreateHabit = async (e) => {
    e.preventDefault();

    if (habitForm.is_measurable) {
      if (!habitForm.target_value || Number(habitForm.target_value) <= 0) {
        toast.error("INVALID TARGET", {
          description: "Target goal must be greater than 0.",
        });
        return;
      }
    }

    const payload = {
      ...habitForm,
      target_value: habitForm.is_measurable
        ? Number(habitForm.target_value)
        : 0,
      starting_point: habitForm.is_measurable
        ? Number(habitForm.starting_point)
        : 0,
      current_value: habitForm.is_measurable
        ? Number(habitForm.starting_point)
        : 0,
      unit: habitForm.is_measurable ? habitForm.unit : "",
      frequency: habitForm.frequency || "daily",
    };

    try {
      await axios.post(`${API}/habits`, payload, getAuthHeader());
      toast.success("New Mission Logged!");

      setHabitForm({
        name: "",
        description: "",
        frequency: "daily",
        notification_time: "",
        is_measurable: false,
        target_value: "",
        starting_point: 0,
        unit: "",
      });
      setCreateDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("System Override Failed");
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, getAuthHeader());
    } catch (error) {
      console.error("Logout log failed", error);
    }
    localStorage.clear();
    setUser(null);
    navigate("/auth");
  };

  if (loading || !stats)
    return (
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
        <NotificationManager habits={habits} />
        <div className="spinner"></div>
      </div>
    );

  const xpProgress = ((stats.xp % 100) / 100) * 100;
  const isOnFire = stats.current_streak >= 3;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1d2e] to-[#0a0e27] relative overflow-hidden flex flex-col font-sans">
      <NotificationManager habits={habits} />

      {/* BACKGROUND ELEMENTS (Keep your existing background code here) */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>
      <div className="fixed inset-0 z-0 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black_100%)]"></div>
      <div className="bg-shape bg-shape-1"></div>
      <div className="bg-shape bg-shape-2"></div>
      <div className="bg-shape bg-shape-3"></div>

      {/* SIDE MENU OVERLAY */}
      <div
        className={`fixed inset-0 z-[100] transition-visibility duration-300 ${
          menuOpen ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop blur effect */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMenuOpen(false)}
        ></div>

        {/* The Sliding Panel */}
        <div
          className={`absolute right-0 top-0 w-80 h-full bg-[#0a0e27] border-l border-cyan-500/30 p-8 flex flex-col gap-6 shadow-[[-20px_0_50px_rgba(6,182,212,0.15)]] transition-transform duration-500 ease-out transform ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">
                System
              </h2>
              <h2 className="text-xl font-black text-cyan-400 italic tracking-tighter uppercase mt-[-8px]">
                Menu
              </h2>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 bg-white/5 rounded-full text-gray-500 hover:text-white transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Evolution Button */}
          <button
            onClick={() => {
              navigate("/evolution");
              setMenuOpen(false);
            }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-purple-600/10 border border-purple-500/30 text-purple-400 hover:bg-purple-600/20 transition-all hover:scale-[1.02] group"
          >
            <div className="p-3 bg-purple-500/20 rounded-xl group-hover:bg-purple-500/30">
              <Zap className="w-6 h-6 group-hover:animate-pulse" />
            </div>
            <div className="text-left">
              <span className="block font-black uppercase tracking-widest text-xs">
                Identity
              </span>
              <span className="block text-sm font-bold text-white">
                Evolution
              </span>
            </div>
          </button>

          {/* Leaderboard Button */}
          <button
            onClick={() => {
              navigate("/leaderboard");
              setMenuOpen(false);
            }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all hover:scale-[1.02] group"
          >
            <div className="p-3 bg-cyan-500/20 rounded-xl group-hover:bg-cyan-500/30">
              <Crown className="w-6 h-6" />
            </div>
            <div className="text-left">
              <span className="block font-black uppercase tracking-widest text-xs">
                Global
              </span>
              <span className="block text-sm font-bold text-white">
                Leaderboard
              </span>
            </div>
          </button>

          {/* Shield Shop Button */}
          <Button
            onClick={handleBuyShield}
            className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-cyan-500/50 transition-all group p-4 h-auto"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="bg-cyan-500/10 p-2 rounded-lg group-hover:bg-cyan-500/20 transition-colors">
                  <ShieldCheck className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white uppercase tracking-wider">
                    Streak Shield
                  </p>
                  <p className="text-[12px] text-green-500 font-mono">
                    OWNED:{" "}
                    <span className="text-cyan-400 font-bold text-xs">
                      {stats?.shields || 0}
                    </span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-yellow-400">200 XP</p>
                <p className="text-[10px] text-yellow-500 uppercase tracking-widest">
                  Purchase
                </p>
              </div>
            </div>
          </Button>
          {/* --- SIMPLE SHIELD COUNTER --- */}
          <div className="px-6 pb-2">
            <p className="text-xs font-mono text-cyan-500/100 uppercase tracking-widest">
              Shields Used:{" "}
              <span className="text-white font-bold">
                {stats?.shields || 0}
              </span>
            </p>
          </div>

          <div className="mt-auto pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] text-gray-600 font-mono">
              OPERATIVE STATUS: ACTIVE
            </p>
          </div>
        </div>
      </div>

      <div className="glow-container relative z-10 py-8 px-4 max-w-7xl mx-auto flex-grow w-full">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
          <div className="relative z-30 flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
            <div className="text-center md:text-left">
              <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent uppercase tracking-tight">
                HABIT TRACKER
              </h1>

              <div className="flex items-center justify-center md:justify-start gap-4 mt-2">
                {isEditingName ? (
                  <div className="flex items-center gap-2 bg-[#1a1d2e] border-2 border-cyan-500/50 p-1.5 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] relative z-40">
                    <input
                      autoFocus
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSaveUsername()
                      }
                      className="bg-transparent text-white font-mono text-base font-black outline-none px-2 w-40 uppercase"
                    />
                    <button
                      onClick={handleSaveUsername}
                      className="text-green-400 hover:text-green-300 transition-colors pointer-events-auto cursor-pointer"
                    >
                      <Check size={20} />
                    </button>
                    <button
                      onClick={() => setIsEditingName(false)}
                      className="text-red-400 hover:text-red-300 transition-colors pointer-events-auto cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-5 scale-110 origin-left">
                    {" "}
                    {/* Scaled up the whole group */}
                    <div className="flex flex-col">
                      {/* Username Line */}
                      <span className="text-gray-500 text-[10px] font-mono tracking-[0.4em] uppercase mb-1">
                        Authenticated Operative
                      </span>

                      <div className="flex items-center gap-4">
                        <p className="burning-title-3d text-2xl font-black">
                          {user?.username || user?.email.split("@")[0]}
                          <span className="text-cyan-500 mx-2 opacity-50 font-light">
                            //
                          </span>
                          <span className="bg-gradient-to-r from-white via-cyan-200 to-blue-400 bg-clip-text text-transparent">
                            {user?.title || "NEON PHANTOM"}
                          </span>
                        </p>

                        {/* Edit Button with enhanced glow */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setTempName(
                              user?.username || user?.email.split("@")[0]
                            );
                            setIsEditingName(true);
                          }}
                          className="relative z-50 text-cyan-400 hover:text-white transition-all hover:scale-150 cursor-pointer p-2 drop-shadow-[0_0_10px_#22d3ee]"
                        >
                          <Edit3 size={15} className="pointer-events-none" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            {/* Main Menu Button */}
            <button
              onClick={() => setMenuOpen(true)}
              className="flex flex-1 md:flex-none items-center justify-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 text-white shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all border border-cyan-400/30"
            >
              <Menu className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest">
                Open Menu
              </span>
            </button>

            <Button
              variant="ghost"
              className={`w-auto justify-start transition-all ${
                user?.fcm_token
                  ? "text-green-400 bg-green-900/20 hover:bg-green-900/30"
                  : "text-gray-400 hover:text-cyan-400 hover:bg-cyan-950/30"
              }`}
              onClick={handleEnableAlerts}
            >
              <Zap
                className={`mr-2 h-4 w-4 ${
                  user?.fcm_token ? "fill-current" : ""
                }`}
              />
              {user?.fcm_token ? "Link Active" : "Neural Link"}
            </Button>

            <Button
              onClick={handleLogout}
              className="bg-red-600/20 text-red-500 border border-red-500/40 hover:bg-red-600 hover:text-white rounded-xl px-4 py-2 flex justify-center"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_15px_#06b6d4] opacity-40 mb-10"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border-2 border-cyan-500/50 rounded-2xl p-6 flex items-center gap-4 shadow-lg shadow-cyan-500/10">
            <div className="p-3 bg-cyan-500 rounded-full shadow-[0_0_15px_#06b6d4]">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-cyan-400 tracking-widest">
                Your Rank
              </p>
              <h3 className="text-xl font-black italic text-white uppercase">
                {stats.level < 5
                  ? "Novice Adventurer"
                  : stats.level < 15
                  ? "Elite Scout"
                  : "Legendary Master"}
              </h3>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-2 border-purple-500/50 rounded-2xl p-6 flex items-center gap-4 shadow-lg shadow-purple-500/10">
            <div className="p-3 bg-purple-500 rounded-full shadow-[0_0_15px_#a855f7]">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase font-bold text-purple-400 tracking-widest">
                Next Milestone
              </p>
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs font-bold text-white uppercase">
                  Rank {stats.level + 1}
                </span>
                <span className="text-[10px] text-purple-300">
                  {100 - (stats.xp % 100)} XP to go
                </span>
              </div>
              <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 shadow-[0_0_10px_#a855f7]"
                  style={{ width: `${stats.xp % 100}%` }}
                ></div>
              </div>
            </div>
          </div>
          <div className="bg-[#FFFDD0] border-2 border-white/10 rounded-2xl p-6 flex flex-col justify-center shadow-lg">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1 flex items-center gap-2">
              <Zap className="w-3 h-3 text-yellow-500" /> Daily Insight
            </p>
            <p className="text-xs italic text-slate-800 leading-relaxed font-serif font-medium">
              "{dailyQuote}"
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="bg-[#1a1d2e]/90 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-cyan-500/20 card-hover border border-gray-800 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Level</p>
                <p className="text-3xl font-bold text-white">{stats.level}</p>
              </div>
            </div>
            <div className="mt-4 h-2 bg-[#0a0e27] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600"
                style={{ width: `${xpProgress}%` }}
              ></div>
            </div>
          </div>
          <div
            className={`bg-[#1a1d2e]/90 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-800 transition-all duration-500 ${
              isOnFire
                ? "shadow-orange-600/50 border-orange-500 scale-105"
                : "shadow-orange-500/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl transition-all duration-500 ${
                  isOnFire
                    ? "bg-gradient-to-br from-orange-400 to-red-600 animate-pulse shadow-[0_0_15px_#f97316]"
                    : "bg-gradient-to-br from-orange-500 to-red-600"
                }`}
              >
                <Flame
                  className={`w-6 h-6 text-white ${
                    isOnFire ? "fill-white" : ""
                  }`}
                />
              </div>
              <div>
                <p className="text-gray-400 text-sm">
                  {isOnFire ? "On Fire!" : "Streak"}
                </p>
                <p
                  className={`text-3xl font-bold ${
                    isOnFire ? "text-orange-400 italic" : "text-white"
                  }`}
                >
                  {stats.current_streak}d
                </p>
              </div>
            </div>
          </div>
          <div className="bg-[#1a1d2e]/90 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-purple-500/20 card-hover border border-gray-800 transition-all">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total XP</p>
                <p className="text-3xl font-bold text-white">{stats.xp}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1a1d2e]/90 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-green-500/20 card-hover border border-gray-800 transition-all">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Today</p>
                <p className="text-3xl font-bold text-white">
                  {stats.completed_today}/{stats.total_habits}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ACTIVE QUESTS SECTION */}
        <div className="bg-[#1a1d2e]/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-gray-800 mb-20">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-2xl font-bold text-white uppercase italic tracking-tighter">
              Active Habits
            </h2>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl px-6 py-3 shadow-lg shadow-cyan-500/50 hover:scale-105 transition uppercase font-bold text-xs tracking-widest">
                  <Plus className="w-5 h-5 mr-2" /> New Habit
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a1d2e] border-cyan-500/30 text-white">
                <DialogHeader>
                  <DialogTitle>Habit Configuration</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateHabit} className="space-y-6 pt-4">
                  <Input
                    placeholder="Habit Name"
                    className="bg-[#0a0e27] border-gray-700 text-white"
                    value={habitForm.name}
                    onChange={(e) =>
                      setHabitForm({ ...habitForm, name: e.target.value })
                    }
                    required
                  />
                  <Input
                    placeholder="Note"
                    className="bg-[#0a0e27] border-gray-700 text-white"
                    value={habitForm.description}
                    onChange={(e) =>
                      setHabitForm({
                        ...habitForm,
                        description: e.target.value,
                      })
                    }
                  />

                  {/* Day Selection Bar */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setShowDayPicker(!showDayPicker)}
                      className="w-full flex items-center justify-between p-3 bg-[#0a0e27] border border-gray-700 rounded-xl hover:border-cyan-500/50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <CalendarDays className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs uppercase font-black tracking-widest">
                          Frequency:{" "}
                          {habitForm.frequency === "daily"
                            ? "Every Day"
                            : habitForm.frequency}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-500 transition-transform ${
                          showDayPicker ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {showDayPicker && (
                      <div className="flex gap-1 p-1 bg-[#0a0e27] border border-gray-800 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {weekDays.map((day) => {
                          const isSelected =
                            habitForm.frequency === "daily" ||
                            habitForm.frequency.split(",").includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleDay(day)}
                              className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
                                isSelected
                                  ? "bg-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                  : "text-gray-500 hover:bg-gray-800"
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Notification Time with Label */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-gray-500 tracking-[0.2em] ml-1">
                      Set Mission Time
                    </label>
                    <Input
                      type="time"
                      className="bg-[#0a0e27] border-gray-700 text-white"
                      value={habitForm.notification_time}
                      onChange={(e) =>
                        setHabitForm({
                          ...habitForm,
                          notification_time: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="p-4 bg-cyan-500/5 rounded-2xl border border-cyan-500/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono text-cyan-400 tracking-[0.3em] uppercase">
                        Enable Progress Tracking?
                      </label>
                      <input
                        type="checkbox"
                        className="w-5 h-5 accent-cyan-500 rounded border-gray-700 bg-gray-900"
                        checked={habitForm.is_measurable}
                        onChange={(e) =>
                          setHabitForm({
                            ...habitForm,
                            is_measurable: e.target.checked,
                          })
                        }
                      />
                    </div>

                    {habitForm.is_measurable && (
                      <div className="grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-1">
                          <span className="text-[8px] uppercase text-gray-500">
                            Start
                          </span>
                          <Input
                            type="number"
                            placeholder="0"
                            value={habitForm.starting_point}
                            onChange={(e) =>
                              setHabitForm({
                                ...habitForm,
                                starting_point: e.target.value,
                              })
                            }
                            className="bg-[#0a0e27] border-gray-800 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] uppercase text-gray-500">
                            Target
                          </span>
                          <Input
                            type="number"
                            placeholder="target"
                            value={habitForm.target_value}
                            onChange={(e) =>
                              setHabitForm({
                                ...habitForm,
                                target_value: e.target.value,
                              })
                            }
                            className="bg-[#0a0e27] border-gray-800 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] uppercase text-gray-500">
                            Unit
                          </span>
                          <Input
                            placeholder="UNITS"
                            value={habitForm.unit}
                            onChange={(e) =>
                              setHabitForm({
                                ...habitForm,
                                unit: e.target.value,
                              })
                            }
                            className="bg-[#0a0e27] border-gray-800 text-xs uppercase"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-cyan-600 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                  >
                    Start Mission
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {habits.map((habit) => {
              // Robust checks
              const isDone = Array.from(completedToday).some(
                (id) => String(id) === String(habit.id)
              );
              const isMeasurable = Boolean(habit.is_measurable);

              return (
                <div
                  key={habit.id}
                  className="p-4 bg-[#0a0e27]/50 rounded-xl border border-gray-800 flex justify-between items-center group transition-all hover:border-cyan-500/30"
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">
                      {habit.name}
                    </h3>
                    {habit.notification_time && (
                      <div className="flex items-center gap-1 text-xs text-cyan-200/80 font-mono mt-1 mb-1">
                        <Bell className="w-3 h-3" />
                        <span>{habit.notification_time}</span>
                      </div>
                    )}

                    {/* 1. EDITABLE DESCRIPTION (Visible for ALL habits) */}
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        defaultValue={habit.description}
                        className="bg-transparent text-sm text-gray-500 outline-none border-b border-transparent focus:border-cyan-500 w-full max-w-xs transition-colors"
                        onBlur={(e) =>
                          handleUpdateDescription(habit.id, e.target.value)
                        }
                      />
                      <Edit3 className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100" />
                    </div>

                    {/* 2. TEXT STATUS (Only for measurable habits) */}
                    {isMeasurable && (
                      <p className="text-[10px] text-cyan-500 font-mono mt-1 font-bold tracking-wider">
                        PROGRESS: {habit.current_value || 0} /{" "}
                        {habit.target_value} {habit.unit}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* CHECK BUTTON */}
                    <Button
                      onClick={() => handleCompleteHabit(habit.id)}
                      disabled={isDone}
                      className={
                        isDone
                          ? "bg-gray-700 opacity-50 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900/20"
                      }
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingHabit(habit);
                        setIsEditDialogOpen(true);
                      }}
                      className="bg-cyan-900/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 hover:text-white transition-all"
                    >
                      <Edit3 size={18} />
                    </Button>

                    {/* LOG BUTTON (Shows only if Done + Measurable) */}
                    {isDone && isMeasurable && (
                      <Button
                        onClick={() => {
                          setTrackingHabit(habit);
                          setProgressValue(habit.current_value || 0);
                        }}
                        className="bg-purple-600 hover:bg-purple-500 text-xs px-3 shadow-[0_0_15px_rgba(168,85,247,0.4)] animate-in zoom-in duration-300"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Log
                      </Button>
                    )}

                    {/* DELETE BUTTON */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="bg-red-900/20 text-red-500 hover:bg-red-600 hover:text-white transition-colors border border-red-900/30">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#1a1d2e] border-gray-700 text-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Habit?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-gray-700 text-white border-none hover:bg-gray-600">
                            No
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteHabit(habit.id)}
                            className="bg-red-600 hover:bg-red-500"
                          >
                            Yes
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ACHIEVEMENT & TROPHY GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-24 pt-16 border-t border-white/5">
          {/* ACH TAGS */}
          <div className="bg-[#1a1d2e]/90 backdrop-blur-xl rounded-3xl p-8 border-[4px] border-cyan-500/40 relative overflow-hidden group shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-white flex items-center gap-3 uppercase tracking-tight">
                <Award className="text-cyan-400 w-6 h-6" /> Achievement Tags
              </h2>
              <Dialog open={intelOpen} onOpenChange={setIntelOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0 rounded-full hover:bg-cyan-500/20 text-cyan-400"
                  >
                    <Info className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0a0e27]/95 border-[3px] border-cyan-500/30 text-white max-w-2xl max-h-[80vh] overflow-y-auto shadow-[0_0_50px_rgba(6,182,212,0.2)] backdrop-blur-2xl">
                  <DialogHeader className="border-b border-white/10 pb-4">
                    <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 flex items-center gap-3">
                      <Terminal className="w-8 h-8 text-cyan-400" /> Progression
                      Intel
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-10 py-8 font-sans">
                    <div className="relative">
                      <h4 className="text-[10px] font-mono uppercase text-cyan-400 tracking-[0.4em] mb-6 flex items-center gap-3">
                        <span className="h-[1px] w-8 bg-cyan-400 shadow-[0_0_4px_#22d3ee]"></span>{" "}
                        Ranks & Titles
                      </h4>
                      <div className="grid gap-6">
                        {progressionGuide.ranks.map((r, i) => {
                          const isUnlocked = stats.level >= r.lvl;
                          const progressToThis = Math.min(
                            100,
                            Math.max(0, (stats.level / r.lvl) * 100)
                          );
                          return (
                            <div
                              key={i}
                              className={`group relative p-5 rounded-2xl border transition-all duration-300 ${
                                isUnlocked
                                  ? "bg-cyan-950/30 border-cyan-400 shadow-[inset_0_0_15px_rgba(34,211,238,0.15)]"
                                  : "bg-white/10 border-white/20"
                              }`}
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p
                                      className={`font-black uppercase italic tracking-tight text-xl ${
                                        isUnlocked
                                          ? "text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]"
                                          : "text-white"
                                      }`}
                                    >
                                      {r.title}
                                    </p>
                                    {isUnlocked && (
                                      <Check className="w-5 h-5 text-cyan-300 drop-shadow-[0_0_2px_#22d3ee]" />
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-300 font-mono italic mt-1">
                                    {r.desc}
                                  </p>
                                </div>
                                <span className="text-sm font-black font-mono text-cyan-200/80">
                                  REQ: LVL {r.lvl}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-[9px] font-mono uppercase tracking-widest">
                                  <span className="text-gray-300">
                                    Sync Status
                                  </span>
                                  <span
                                    className={
                                      isUnlocked
                                        ? "text-cyan-300"
                                        : "text-gray-300"
                                    }
                                  >
                                    {isUnlocked
                                      ? "COMPLETE"
                                      : `${Math.floor(progressToThis)}%`}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden border border-white/20">
                                  <div
                                    className={`h-full transition-all duration-1000 ${
                                      isUnlocked
                                        ? "bg-cyan-400 shadow-[0_0_12px_#22d3ee]"
                                        : "bg-gray-500"
                                    }`}
                                    style={{
                                      width: `${
                                        isUnlocked ? 100 : progressToThis
                                      }%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex flex-wrap gap-4 relative z-10">
              {(() => {
                const level = stats.level;
                const currentBadges = [];
                if (level >= 0)
                  currentBadges.push({
                    name: "Beginner",
                    style: "bg-slate-700 shadow-[0_0_15px_rgba(71,85,105,0.4)]",
                  });
                if (level >= 5)
                  currentBadges.push({
                    name: "Novice",
                    style: "bg-green-700 shadow-[0_0_20px_rgba(34,197,94,0.5)]",
                  });
                if (level >= 10)
                  currentBadges.push({
                    name: "Intermediate",
                    style:
                      "bg-cyan-700 shadow-[0_0_20px_rgba(6,182,212,0.5)] border-cyan-400/50",
                  });
                if (level >= 15)
                  currentBadges.push({
                    name: "Expert",
                    style:
                      "bg-purple-700 shadow-[0_0_25px_rgba(168,85,247,0.6)] border-purple-400/50",
                  });
                if (level >= 20)
                  currentBadges.push({
                    name: "Master",
                    style:
                      "bg-gradient-to-r from-yellow-500 to-orange-600 shadow-[0_0_30px_rgba(234,179,8,0.8)] animate-pulse border-yellow-400",
                  });
                return currentBadges.map((badge, idx) => (
                  <div
                    key={idx}
                    className={`px-6 py-2.5 rounded-xl text-white text-[11px] font-black uppercase flex items-center gap-2 border border-white/20 transition-all duration-500 hover:-translate-y-1 ${badge.style}`}
                  >
                    <Zap className="w-3 h-3 fill-white" /> {badge.name}
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* TROPHIES */}
          <div className="bg-[#2a2438]/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-purple-900/20 border-[4px] border-purple-400 shadow-[0_0_15px_#c084fc] relative overflow-hidden">
            <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-3 uppercase tracking-tight">
              <Gift className="text-purple-400 w-6 h-6" /> Progress Trophies
            </h2>
            <div className="grid grid-cols-3 gap-5 relative z-10">
              {[
                {
                  lvl: 5,
                  name: "Bronze",
                  unlockedStyle:
                    "bg-gradient-to-br from-orange-400 to-orange-700 shadow-orange-500/50",
                },
                {
                  lvl: 10,
                  name: "Silver",
                  unlockedStyle:
                    "bg-gradient-to-br from-slate-300 to-slate-500 shadow-slate-400/50",
                },
                {
                  lvl: 20,
                  name: "Neon",
                  unlockedStyle:
                    "bg-gradient-to-br from-pink-500 to-purple-600 shadow-pink-500/50",
                },
              ].map((r, i) => (
                <div
                  key={i}
                  className={`p-5 rounded-2xl border-2 text-center relative transition-all duration-500 flex flex-col justify-center items-center h-32 ${
                    stats.level >= r.lvl
                      ? `${r.unlockedStyle} border-white/30 scale-105 shadow-xl`
                      : "bg-white/5 border-white/10 opacity-60 backdrop-blur-md"
                  }`}
                >
                  {stats.level < r.lvl ? (
                    <>
                      <Lock className="w-6 h-6 text-white mb-2" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                        LVL {r.lvl}
                      </p>
                      <p className="text-[12px] uppercase font-black text-white">
                        {r.name}
                      </p>
                    </>
                  ) : (
                    <>
                      <Trophy className="w-8 h-8 text-white mb-2 drop-shadow-md" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/90">
                        Unlocked
                      </p>
                      <p className="text-[14px] uppercase font-black text-white drop-shadow-lg">
                        {r.name}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* WEEKLY MISSION PROGRESS CALENDAR */}
        <div className="bg-[#1a1d2e]/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-gray-800 mb-20 overflow-hidden">
          <h2 className="text-xl font-bold text-white uppercase italic tracking-tighter mb-6 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-cyan-400" /> Weekly Mission
            Status
          </h2>
          <div className="bg-[#fdfcf0]/10 backdrop-blur-md rounded-2xl p-6 overflow-x-auto border-4 border-cyan-500/20 shadow-inner">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="pb-4 text-xs uppercase font-black text-white-500 px-4">
                    Quest
                  </th>
                  {weekDays.map((day) => (
                    <th
                      key={day}
                      className="pb-4 text-xs uppercase font-black text-center text-white-500"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {habits.map((habit) => (
                  <tr
                    key={habit.id}
                    className="border-b border-slate-200 hover:bg-slate-200/50 transition-colors"
                  >
                    <td className="py-5 px-4">
                      <span className="text-sm font-black text-white-700 uppercase">
                        {habit.name}
                      </span>
                    </td>
                    {weekDays.map((dayName, index) => {
                      // Identify if habit is active on this day
                      const isScheduled =
                        habit.frequency === "daily" ||
                        habit.frequency.includes(dayName);

                      // Find completion in the data
                      const hasCompleted = weeklyCompletions.some((comp) => {
                        const compDate = new Date(comp.completed_at);
                        const compDayName =
                          weekDays[(compDate.getUTCDay() + 6) % 7];
                        return (
                          comp.habit_id === habit.id && compDayName === dayName
                        );
                      });

                      // Check if the day is in the past
                      const todayIndex = (new Date().getUTCDay() + 6) % 7;
                      const isPastDay = index <= todayIndex;

                      return (
                        <td key={dayName} className="py-5 text-center">
                          {hasCompleted ? (
                            <div className="bg-green-100 p-1.5 rounded-full inline-block border-2 border-green-500 shadow-sm">
                              <Check className="w-4 h-4 text-green-600 font-black" />
                            </div>
                          ) : isScheduled && isPastDay ? (
                            <X className="w-5 h-5 text-red-500 mx-auto" />
                          ) : (
                            <Minus className="w-4 h-4 text-slate-300 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Dialog
        open={!!trackingHabit}
        onOpenChange={() => setTrackingHabit(null)}
      >
        <DialogContent className="bg-[#0a0e27]/95 border border-cyan-500/30 text-white backdrop-blur-2xl max-w-sm shadow-[0_0_50px_rgba(6,182,212,0.15)]">
          <DialogHeader className="text-center pb-2 border-b border-white/5">
            <DialogTitle className="text-xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-400">
              Sync Mission Data
            </DialogTitle>
            <p className="text-[15px] text-cyan-500/70 font-mono tracking-[0.2em] uppercase mt-1">
              Target: {trackingHabit?.name}
            </p>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-4 space-y-5">
            <div className="relative w-48 h-48 group">
              <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-2xl animate-pulse" />
              <svg className="w-full h-full transform -rotate-90 relative z-10">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  className="text-gray-800"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 80}
                  strokeDashoffset={
                    2 * Math.PI * 80 -
                    ((progressValue - (trackingHabit?.starting_point || 0)) /
                      ((trackingHabit?.target_value || 1) -
                        (trackingHabit?.starting_point || 0))) *
                      (2 * Math.PI * 80)
                  }
                  strokeLinecap="round"
                  className="text-cyan-400 transition-all duration-1000 ease-out drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                <span className="text-5xl font-black text-white tracking-tighter drop-shadow-2xl">
                  {progressValue}
                </span>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest bg-cyan-900/30 px-2 py-0.5 rounded-full border border-cyan-500/30 mt-1">
                  {trackingHabit?.unit || "UNITS"}
                </span>
              </div>
            </div>

            <div className="w-full space-y-4 px-2">
              <div className="relative w-full h-6 flex items-center">
                <input
                  type="range"
                  min={trackingHabit?.starting_point || 0}
                  max={trackingHabit?.target_value || 100}
                  value={progressValue}
                  onChange={(e) => setProgressValue(e.target.value)}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 z-20 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gray-700 -z-10 flex justify-between px-1">
                  {[...Array(11)].map((_, i) => (
                    <div key={i} className="w-[1px] h-1.5 bg-gray-600" />
                  ))}
                </div>
              </div>

              <div className="flex justify-between w-full text-[12px] text-gray-400 font-mono uppercase tracking-widest font-bold">
                <span>Start: {trackingHabit?.starting_point}</span>
                <span className="text-cyan-400">
                  {Math.min(
                    100,
                    ((progressValue - trackingHabit?.starting_point) /
                      (trackingHabit?.target_value -
                        trackingHabit?.starting_point)) *
                      100
                  ).toFixed(0)}
                  %
                </span>
                <span>Goal: {trackingHabit?.target_value}</span>
              </div>

              <Button
                onClick={submitProgressReport}
                className="w-full h-12 text-sm bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-black uppercase tracking-[0.15em] shadow-[0_0_20px_rgba(8,145,178,0.3)] border border-cyan-400/30 transition-all hover:scale-[1.01]"
              >
                Confirm Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-[#1a1d2e] border border-gray-700 text-white max-w-sm shadow-2xl">
          <DialogHeader className="pb-2 border-b border-gray-800">
            <DialogTitle className="text-xl font-bold text-white tracking-tight">
              Edit Habit Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide ml-1">
                Habit Name
              </label>
              <Input
                value={editingHabit?.name || ""}
                onChange={(e) =>
                  setEditingHabit({ ...editingHabit, name: e.target.value })
                }
                className="bg-black/40 border-gray-700 text-white font-medium focus:border-cyan-500 h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide ml-1">
                Frequency
              </label>
              <div className="flex justify-between gap-1 bg-black/40 p-1.5 rounded-lg border border-gray-700">
                {weekDays.map((day) => {
                  const isActive =
                    editingHabit?.frequency === "daily" ||
                    (editingHabit?.frequency || "").includes(day);

                  return (
                    <button
                      key={day}
                      onClick={() => toggleEditDay(day)}
                      className={`w-8 h-8 rounded-md text-[10px] font-bold transition-all ${
                        isActive
                          ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/50"
                          : "text-gray-500 hover:bg-white/5"
                      }`}
                    >
                      {day.charAt(0)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide ml-1">
                Reminder Time
              </label>
              <Input
                type="time"
                value={editingHabit?.notification_time || ""}
                onChange={(e) =>
                  setEditingHabit({
                    ...editingHabit,
                    notification_time: e.target.value,
                  })
                }
                className="bg-black/40 border-gray-700 text-white h-10"
              />
            </div>

            <div className="pt-2">
              <Button
                onClick={handleSaveEdit}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 shadow-lg shadow-cyan-900/20 transition-all"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <footer className="relative z-20 mt-auto bg-[#050816] border-t-2 border-cyan-500/50 py-12 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h3 className="text-cyan-400 font-black italic tracking-tighter text-xl uppercase mb-2">
              HABIT TRACKER
            </h3>
            <p className="text-gray-400 font-mono text-[10px] uppercase tracking-widest">
              Authorized Monitor // v2.5
            </p>
          </div>
          <div className="text-[10px] text-white-600 font-mono italic order-3 md:order-2">
            © 2025 // SECURED CONNECTION
          </div>
          <div className="flex flex-col items-center md:items-end gap-1 order-2 md:order-3">
            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=admin@admin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white-400 hover:text-purple-400 text-[10px] uppercase font-black tracking-[0.2em] transition cursor-pointer flex items-center gap-2"
            >
              Support Center
            </a>
            <span className="text-white-600 font-mono text-[10px] tracking-wider">
              admin@admin.com
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
