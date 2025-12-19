import { useEffect } from "react";
import { toast } from "sonner";
import { Bell, WifiOff, Wifi, Volume2 } from "lucide-react";

// Using a reliable high-tech "ping" from a public assets library
const NOTIFICATION_SOUND_URL =
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const audio = new Audio(NOTIFICATION_SOUND_URL);

export default function NotificationManager({ habits }) {
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const handleOffline = () => {
      triggerSound();
      toast.error("LINK SEVERED", {
        description: "Operating in offline mode.",
        icon: <WifiOff className="text-red-500" />,
        className: "bg-[#1a1d2e] border-2 border-red-500 text-white",
      });
    };

    const handleOnline = () => {
      toast.success("LINK ESTABLISHED", {
        description: "Syncing with Nexus...",
        icon: <Wifi className="text-green-500" />,
        className: "bg-[#1a1d2e] border-2 border-green-500 text-white",
      });
    };

    const triggerSound = () => {
      audio.currentTime = 0;
      audio.play().catch(() => {
        console.warn(
          "Sound blocked. Click anywhere on the page to enable audio alerts."
        );
      });
    };

    const checkSchedule = () => {
      const now = new Date();
      const currentTime =
        now.getHours().toString().padStart(2, "0") +
        ":" +
        now.getMinutes().toString().padStart(2, "0");

      habits?.forEach((habit) => {
        // Ensure habit has a time and it matches HH:MM
        if (
          habit.notification_time &&
          habit.notification_time.slice(0, 5) === currentTime
        ) {
          const lastNotified = localStorage.getItem(`notified_${habit.id}`);
          const today = new Date().toDateString();

          if (lastNotified !== today) {
            triggerAlert(habit, today);
          }
        }
      });
    };

    const triggerAlert = (habit, today) => {
      triggerSound();

      if (Notification.permission === "granted") {
        new Notification("QUEST ALERT", {
          body: `Time to execute: ${habit.name}`,
          icon: "/favicon.ico",
        });
      }

      toast.info("MISSION READY", {
        description: `Mission: ${habit.name}`,
        icon: <Bell className="text-cyan-400 animate-pulse" />,
        className: "bg-[#1a1d2e] border-2 border-cyan-500 text-white",
        duration: 8000,
      });

      localStorage.setItem(`notified_${habit.id}`, today);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    const interval = setInterval(checkSchedule, 10000); // Check every 10 seconds for better accuracy

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      clearInterval(interval);
    };
  }, [habits]);

  return null;
}
