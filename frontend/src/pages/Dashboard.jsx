import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
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
  Award,
  Flame,
  Trophy,
  Target,
  Plus,
  Check,
  Trash2,
  LogOut,
  Bell,
} from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard({ user, setUser }) {
  const [stats, setStats] = useState(null);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [completedToday, setCompletedToday] = useState(new Set());
  const [habitForm, setHabitForm] = useState({
    name: "",
    description: "",
    frequency: "daily",
    notification_time: "",
  });
  const navigate = useNavigate();

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

      // Track which habits were completed today
      const completedIds = new Set(completionsRes.data.map((c) => c.habit_id));
      setCompletedToday(completedIds);
    } catch (error) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Setup notification scheduler
    const checkNotifications = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;

      habits.forEach((habit) => {
        if (
          habit.notification_time === currentTime &&
          !completedToday.has(habit.id)
        ) {
          if (Notification.permission === "granted") {
            new Notification("⏰ Habit Reminder", {
              body: `Time to complete: ${habit.name}`,
              icon: "/favicon.ico",
              tag: habit.id,
            });
          }
        }
      });
    };

    // Check every minute
    const interval = setInterval(checkNotifications, 60000);

    return () => clearInterval(interval);
  }, [habits, completedToday]);

  const handleCreateHabit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/habits`, habitForm, getAuthHeader());
      toast.success("Habit created successfully!");
      setHabitForm({
        name: "",
        description: "",
        frequency: "daily",
        notification_time: "",
      });
      setCreateDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to create habit");
      console.error(error);
    }
  };

  const handleCompleteHabit = async (habitId) => {
    try {
      const response = await axios.post(
        `${API}/habits/${habitId}/complete`,
        {},
        getAuthHeader()
      );
      toast.success(`+${response.data.xp_earned} XP! 🎉`);

      // Mark as completed today
      setCompletedToday((prev) => new Set([...prev, habitId]));

      // Show level up notification
      if (response.data.new_level > stats.level) {
        toast.success(
          `🎊 Level Up! You're now level ${response.data.new_level}!`
        );

        // Browser notification
        if (Notification.permission === "granted") {
          new Notification("🎊 Level Up!", {
            body: `You've reached level ${response.data.new_level}!`,
            icon: "/favicon.ico",
          });
        }
      }

      fetchData();

      // Update user in localStorage
      const updatedUser = {
        ...user,
        xp: response.data.new_xp,
        level: response.data.new_level,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to complete habit");
    }
  };

  const handleDeleteHabit = async (habitId) => {
    try {
      await axios.delete(`${API}/habits/${habitId}`, getAuthHeader());
      toast.success("Habit deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete habit");
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/auth");
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        toast.success("Notifications enabled!");
      } else {
        toast.error("Notification permission denied");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1d2e] to-[#0a0e27] flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  const xpForNextLevel = stats.level * 100;
  const xpProgress = ((stats.xp % 100) / 100) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1d2e] to-[#0a0e27] relative overflow-hidden">
      <div className="bg-shape bg-shape-1"></div>
      <div className="bg-shape bg-shape-2"></div>
      <div className="bg-shape bg-shape-3"></div>

      <div className="glow-container relative z-10 py-8 px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              QuestHacker
            </h1>
            <p className="text-gray-400 mt-1">{user.email}</p>
          </div>
          <div className="flex gap-2">
            {Notification.permission !== "granted" && (
              <Button
                data-testid="enable-notifications-btn"
                onClick={requestNotificationPermission}
                className="bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl px-4 py-2"
              >
                <Bell className="w-5 h-5 mr-2" />
                Enable Notifications
              </Button>
            )}
            <Button
              data-testid="logout-btn"
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div
            data-testid="level-card"
            className="bg-[#1a1d2e]/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-cyan-500/20 card-hover"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Level</p>
                <p className="text-3xl font-bold text-white">{stats.level}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-2">
                <span>{stats.xp % 100} XP</span>
                <span>{xpForNextLevel} XP</span>
              </div>
              <div className="h-2 bg-[#0a0e27] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 progress-fill"
                  style={{
                    "--progress-width": `${xpProgress}%`,
                    width: `${xpProgress}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div
            data-testid="streak-card"
            className="bg-[#1a1d2e]/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-orange-500/20 card-hover"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Current Streak</p>
                <p className="text-3xl font-bold text-white">
                  {stats.current_streak}
                </p>
                <p className="text-xs text-gray-500">
                  Best: {stats.longest_streak} days
                </p>
              </div>
            </div>
          </div>

          <div
            data-testid="xp-card"
            className="bg-[#1a1d2e]/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-purple-500/20 card-hover"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total XP</p>
                <p className="text-3xl font-bold text-white">{stats.xp}</p>
                <p className="text-xs text-gray-500">
                  {stats.badges.length} badges
                </p>
              </div>
            </div>
          </div>

          <div
            data-testid="habits-card"
            className="bg-[#1a1d2e]/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-green-500/20 card-hover"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Today's Progress</p>
                <p className="text-3xl font-bold text-white">
                  {stats.completed_today}/{stats.total_habits}
                </p>
                <p className="text-xs text-gray-500">habits completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div
          data-testid="badges-section"
          className="bg-[#1a1d2e]/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-cyan-500/20 mb-8"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Your Badges</h2>
          <div className="flex flex-wrap gap-3">
            {stats.badges.map((badge) => (
              <div
                key={badge}
                data-testid={`badge-${badge.toLowerCase()}`}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full text-sm font-medium shadow-lg shadow-cyan-500/30"
              >
                {badge}
              </div>
            ))}
          </div>
        </div>

        {/* Habits */}
        <div className="bg-[#1a1d2e]/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-cyan-500/20">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Your Habits</h2>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  data-testid="create-habit-btn"
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl px-4 py-2 shadow-lg shadow-cyan-500/50"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Habit
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a1d2e] border-gray-700 text-white">
                <DialogHeader>
                  <DialogTitle>Create New Habit</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateHabit} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="name" className="text-gray-300">
                      Habit Name
                    </Label>
                    <Input
                      id="name"
                      data-testid="habit-name-input"
                      value={habitForm.name}
                      onChange={(e) =>
                        setHabitForm({ ...habitForm, name: e.target.value })
                      }
                      className="bg-[#0a0e27] border-gray-700 text-white mt-2"
                      required
                      placeholder="e.g., Morning Exercise"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-gray-300">
                      Description
                    </Label>
                    <Input
                      id="description"
                      data-testid="habit-description-input"
                      value={habitForm.description}
                      onChange={(e) =>
                        setHabitForm({
                          ...habitForm,
                          description: e.target.value,
                        })
                      }
                      className="bg-[#0a0e27] border-gray-700 text-white mt-2"
                      placeholder="Optional description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="frequency" className="text-gray-300">
                      Frequency
                    </Label>
                    <select
                      id="frequency"
                      data-testid="habit-frequency-select"
                      value={habitForm.frequency}
                      onChange={(e) =>
                        setHabitForm({
                          ...habitForm,
                          frequency: e.target.value,
                        })
                      }
                      className="w-full bg-[#0a0e27] border border-gray-700 text-white rounded-xl p-3 mt-2"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div>
                    <Label
                      htmlFor="notification_time"
                      className="text-gray-300"
                    >
                      Notification Time
                    </Label>
                    <Input
                      id="notification_time"
                      data-testid="habit-notification-time-input"
                      type="time"
                      value={habitForm.notification_time}
                      onChange={(e) =>
                        setHabitForm({
                          ...habitForm,
                          notification_time: e.target.value,
                        })
                      }
                      className="bg-[#0a0e27] border-gray-700 text-white mt-2"
                    />
                  </div>
                  <Button
                    data-testid="submit-habit-btn"
                    type="submit"
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl py-3"
                  >
                    Create Habit
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {habits.length === 0 ? (
            <div data-testid="no-habits-message" className="text-center py-12">
              <p className="text-gray-400 text-lg">
                No habits yet. Create your first one!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {habits.map((habit) => (
                <div
                  key={habit.id}
                  data-testid={`habit-card-${habit.id}`}
                  className="bg-[#0a0e27]/50 backdrop-blur-xl rounded-xl p-4 flex items-center justify-between hover:bg-[#0a0e27]/70 transition-all"
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">
                      {habit.name}
                    </h3>
                    {habit.description && (
                      <p className="text-gray-400 text-sm mt-1">
                        {habit.description}
                      </p>
                    )}
                    <div className="flex gap-3 mt-2">
                      <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full">
                        {habit.frequency}
                      </span>
                      {habit.notification_time && (
                        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                          🔔 {habit.notification_time}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      data-testid={`complete-habit-btn-${habit.id}`}
                      onClick={() => handleCompleteHabit(habit.id)}
                      disabled={completedToday.has(habit.id)}
                      className={`${
                        completedToday.has(habit.id)
                          ? "bg-gray-600 cursor-not-allowed opacity-60"
                          : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                      } text-white rounded-xl px-4 py-2`}
                    >
                      <Check className="w-5 h-5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          data-testid={`delete-habit-btn-${habit.id}`}
                          className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#1a1d2e] border-gray-700 text-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Habit?</AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-400">
                            Are you sure you want to delete "{habit.name}"? This
                            action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-gray-700 hover:bg-gray-600 text-white border-0">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            data-testid={`confirm-delete-habit-${habit.id}`}
                            onClick={() => handleDeleteHabit(habit.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
