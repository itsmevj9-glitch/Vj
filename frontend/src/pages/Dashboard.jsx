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
} from "lucide-react";

// --- IMPORT FIREBASE LOGIC ---
import { requestForToken } from "../lib/firebase";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard({ user, setUser }) {
  const [stats, setStats] = useState(null);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [intelOpen, setIntelOpen] = useState(false);
  const [completedToday, setCompletedToday] = useState(new Set());
  const [newUsername, setNewUsername] = useState("");
  const [habitForm, setHabitForm] = useState({
    name: "",
    description: "",
    frequency: "daily",
    notification_time: "",
  });
  const navigate = useNavigate();

  // --- NEURAL LINK: CONNECTS BROWSER TO PYTHON SERVER ---
  const handleEnableAlerts = async () => {
    if (!("Notification" in window)) {
      toast.error("HARDWARE ERROR", {
        description: "This browser does not support neural links.",
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        // 1. Audio Engine Test (Unlocks browser audio policy)
        const testAudio = new Audio(
          "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
        );
        testAudio.volume = 0.5;
        testAudio
          .play()
          .catch((e) => console.warn("Audio start suppressed:", e));

        toast.info("ESTABLISHING LINK...", { duration: 2000 });

        // 2. Get the unique Device ID (Token) from Firebase
        const currentToken = await requestForToken();

        if (currentToken) {
          // 3. Transmit Token to Python Backend
          await axios.post(
            `${API}/auth/fcm-token`,
            { token: currentToken },
            getAuthHeader()
          );

          toast.success("SYSTEM ONLINE", {
            description:
              "Background protocols active. You may now close this tab.",
            className: "bg-[#1a1d2e] border-2 border-cyan-500 text-white",
            icon: <Zap className="text-cyan-400 animate-pulse" />,
          });
        } else {
          toast.error("SIGNAL LOST", {
            description: "Could not generate device token.",
          });
        }
      } else {
        toast.error("ACCESS DENIED", {
          description: "Please enable notifications in your browser settings.",
        });
      }
    } catch (error) {
      console.error("Link Error:", error);
      toast.error("CONNECTION REFUSED", {
        description: "Server handshake failed.",
      });
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
      const [statsRes, habitsRes, completionsRes] = await Promise.all([
        axios.get(`${API}/stats`, getAuthHeader()),
        axios.get(`${API}/habits`, getAuthHeader()),
        axios.get(`${API}/habits/completions/today`, getAuthHeader()),
      ]);
      setStats(statsRes.data);
      setHabits(habitsRes.data);
      setCompletedToday(new Set(completionsRes.data.map((c) => c.habit_id)));
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
      toast.success("Habit Purged");
      fetchData();
    } catch (error) {
      toast.error("Deletion Failed");
    }
  };

  const handleCreateHabit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/habits`, habitForm, getAuthHeader());
      toast.success("New Mission Logged!");
      setHabitForm({
        name: "",
        description: "",
        frequency: "daily",
        notification_time: "",
      });
      setCreateDialogOpen(false);
      fetchData();
    } catch (error) {
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

      <div className="glow-container relative z-10 py-8 px-4 max-w-7xl mx-auto flex-grow w-full">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent uppercase tracking-tight">
              HABIT TRACKER
            </h1>
            <p className="text-gray-400 mt-1 font-mono text-xs tracking-widest uppercase opacity-70">
              {user?.username || user?.email.split("@")[0]} // Operative
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full md:w-auto md:flex">
            <button
              onClick={handleEnableAlerts}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl border transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] group w-full md:w-auto ${
                Notification.permission === "granted"
                  ? "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20"
                  : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500 hover:text-white"
              }`}
            >
              <Bell
                className={`w-4 h-4 ${
                  Notification.permission !== "granted" ? "animate-bounce" : ""
                }`}
              />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden sm:block">
                {Notification.permission === "granted"
                  ? "System Linked"
                  : "Link System"}
              </span>
            </button>

            {!isIdentityClaimed && (
              <Dialog>
                <DialogTrigger asChild>
                  <button className="flex items-center justify-center p-2 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/40 transition border border-cyan-500/30 relative shadow-[0_0_10px_rgba(6,182,212,0.3)] w-full md:w-auto">
                    <UserCircle className="w-6 h-6" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0a0e27] animate-pulse"></span>
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a1d2e] border-cyan-500/30 text-white">
                  <DialogHeader>
                    <DialogTitle>Claim Identity</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input
                      placeholder="Handle..."
                      className="bg-[#0a0e27] border-gray-700 text-white"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                    />
                    <Button
                      onClick={handleUpdateUsername}
                      className="w-full bg-cyan-600"
                    >
                      Verify Identity
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <button
              onClick={() => navigate("/leaderboard")}
              className="group relative flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 hover:scale-105 transition shadow-lg shadow-purple-500/40 w-full md:w-auto"
            >
              <Crown className="w-5 h-5 text-white" />
              <span className="text-white font-medium hidden sm:block">
                Leaderboard
              </span>
            </button>

            <Button
              onClick={handleLogout}
              className="bg-red-600/20 text-red-500 border border-red-500/40 hover:bg-red-600 hover:text-white rounded-xl px-4 py-2 transition-all w-full md:w-auto flex justify-center"
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
                  className="h-full bg-purple-500 shadow-[0_0_10px_#a855f7]"
                  style={{ width: `${stats.xp % 100}%` }}
                ></div>
              </div>
            </div>
          </div>
          <div className="bg-[#1a1d2e]/80 border-2 border-white/10 rounded-2xl p-6 flex flex-col justify-center">
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1 flex items-center gap-2">
              <Zap className="w-3 h-3 text-yellow-500" /> Daily Insight
            </p>
            <p className="text-xs italic text-gray-200 leading-relaxed font-serif">
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
              <DialogContent className="bg-[#1a1d2e] border-gray-700 text-white">
                <DialogHeader>
                  <DialogTitle>Habit Configuration</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateHabit} className="space-y-4 pt-4">
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
                  <select
                    className="w-full bg-[#0a0e27] border border-gray-800 rounded-md p-2 text-white"
                    value={habitForm.frequency}
                    onChange={(e) =>
                      setHabitForm({ ...habitForm, frequency: e.target.value })
                    }
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
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
                  <Button type="submit" className="w-full bg-cyan-600">
                    Start Mission
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-6">
            {habits.map((habit) => (
              <div
                key={habit.id}
                className="p-5 bg-[#0a0e27]/60 backdrop-blur-md rounded-2xl flex justify-between items-center border border-gray-800 hover:border-cyan-500/40 transition group"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition uppercase italic">
                    {habit.name}
                  </h3>
                  {habit.notification_time && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Bell className="w-3 h-3 text-cyan-500/40" />
                      <span className="text-sm text-cyan-500/60 font-mono italic tracking-tight">
                        {habit.notification_time.slice(0, 5)}
                      </span>
                      <span className="text-gray-800/40 mx-1">|</span>
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      defaultValue={habit.description}
                      className="bg-transparent text-sm text-gray-500 font-mono italic outline-none border-b border-transparent focus:border-cyan-500/30 w-full max-w-xs"
                      onBlur={(e) =>
                        e.target.value !== habit.description &&
                        handleUpdateDescription(habit.id, e.target.value)
                      }
                      onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                    />
                    <Edit3 className="w-3 h-3 text-gray-700 opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCompleteHabit(habit.id)}
                    disabled={completedToday.has(habit.id)}
                    className={
                      completedToday.has(habit.id)
                        ? "bg-gray-700 opacity-50"
                        : "bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg"
                    }
                  >
                    <Check className="w-5 h-5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="bg-red-600/10 text-red-500 border border-red-500/20">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#1a1d2e] border-gray-700 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Habit?</AlertDialogTitle>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-gray-700 text-white">
                          Go Back
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteHabit(habit.id)}
                          className="bg-red-600"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
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
                    {/* RANKS SECTION */}
                    <div className="relative">
                      <h4 className="text-[10px] font-mono uppercase text-cyan-500/60 tracking-[0.4em] mb-6 flex items-center gap-3">
                        <span className="h-[1px] w-8 bg-cyan-500/40"></span>{" "}
                        Ranks & Titles
                      </h4>
                      <div className="grid gap-6">
                        {progressionGuide.ranks.map((r, i) => {
                          const isUnlocked = stats.level >= r.lvl;
                          const nextRank =
                            progressionGuide.ranks[i + 1]?.lvl || r.lvl + 5;
                          const progressToThis = Math.min(
                            100,
                            Math.max(0, (stats.level / r.lvl) * 100)
                          );

                          return (
                            <div
                              key={i}
                              className={`group relative p-5 rounded-2xl border transition-all duration-300 ${
                                isUnlocked
                                  ? "bg-cyan-500/5 border-cyan-500/40"
                                  : "bg-white/5 border-white/10 opacity-60"
                              }`}
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p
                                      className={`font-black uppercase italic tracking-tight text-xl ${
                                        isUnlocked
                                          ? "text-cyan-400"
                                          : "text-white"
                                      }`}
                                    >
                                      {r.title}
                                    </p>
                                    {isUnlocked && (
                                      <Check className="w-4 h-4 text-cyan-400" />
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 font-mono italic">
                                    {r.desc}
                                  </p>
                                </div>
                                <span className="text-sm font-black font-mono text-gray-400">
                                  REQ: LVL {r.lvl}
                                </span>
                              </div>

                              {/* Individual Rank Progress Bar */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-[9px] font-mono uppercase tracking-widest">
                                  <span className="text-gray-500">
                                    Sync Status
                                  </span>
                                  <span
                                    className={
                                      isUnlocked
                                        ? "text-cyan-400"
                                        : "text-gray-500"
                                    }
                                  >
                                    {isUnlocked
                                      ? "COMPLETE"
                                      : `${Math.floor(progressToThis)}%`}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                  <div
                                    className={`h-full transition-all duration-1000 ${
                                      isUnlocked
                                        ? "bg-cyan-500 shadow-[0_0_10px_#06b6d4]"
                                        : "bg-gray-700"
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

                    {/* TAGS SECTION */}
                    <div>
                      <h4 className="text-[10px] font-mono uppercase text-purple-500/60 tracking-[0.4em] mb-6 flex items-center gap-3">
                        <span className="h-[1px] w-8 bg-purple-500/40"></span>{" "}
                        Neural Tag Clearances
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {progressionGuide.tags.map((t, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center p-4 bg-[#1a1d2e] rounded-xl border border-white/5 shadow-inner hover:border-purple-500/30 transition-colors"
                          >
                            <span
                              className={`text-xs font-black uppercase tracking-widest ${t.color}`}
                            >
                              {t.name}
                            </span>
                            <span className="px-3 py-1 bg-white/5 rounded-md text-[9px] font-mono text-gray-500 border border-white/5">
                              {t.req}
                            </span>
                          </div>
                        ))}
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
          <div className="bg-[#1a1d2e]/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-[4px] border-white/5 relative overflow-hidden">
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
      </div>

      {/* UPDATED FOOTER SECTION */}
      <footer className="relative z-20 mt-auto bg-[#050816] border-t-2 border-cyan-500/50 py-12 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          {/* LEFT: Branding */}
          <div className="text-center md:text-left">
            <h3 className="text-cyan-400 font-black italic tracking-tighter text-xl uppercase mb-2">
              HABIT TRACKER
            </h3>
            <p className="text-gray-400 font-mono text-[10px] uppercase tracking-widest">
              Authorized Monitor // v2.5
            </p>
          </div>

          {/* CENTER: Copyright (Moved to middle for balance) */}
          <div className="text-[10px] text-white-600 font-mono italic order-3 md:order-2">
            © 2025 // SECURED CONNECTION
          </div>

          {/* RIGHT: Support Section */}
          <div className="flex flex-col items-center md:items-end gap-1 order-2 md:order-3">
            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to="
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
