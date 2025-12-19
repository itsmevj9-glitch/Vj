import { useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Bell, WifiOff, Wifi, Zap } from "lucide-react";
import { onMessageListener } from "../../lib/firebase"; // Ensure this path is correct

// Softer, modern "UI-confirm" sound
const NOTIFICATION_SOUND_URL =
  "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3";
const audio = new Audio(NOTIFICATION_SOUND_URL);

export default function NotificationManager({ habits }) {
  useEffect(() => {
    console.log("🚀 SYSTEM HEARTBEAT: Notification Manager is Alive");
    console.log("Current Habits in Memory:", habits);
  }, [habits]);
  const triggerSound = useCallback(() => {
    // Only play if not in Silent Mode
    if (localStorage.getItem("notifications_disabled") === "true") return;

    audio.currentTime = 0;
    audio.volume = 0.4;
    audio.play().catch(() => {
      console.warn("Audio blocked. System requires user interaction first.");
    });
  }, []);

  const triggerAlert = useCallback(
    (title, body, habitId = null) => {
      // 1. Check Global Disable Switch
      if (localStorage.getItem("notifications_disabled") === "true") {
        console.log("System Muted: Alert suppressed.");
        return;
      }

      const today = new Date().toDateString();

      // 2. Play Audio Ping
      triggerSound();

      // 3. Browser Native Popup (For background/minimized)
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
          body: body,
          icon: "/favicon.ico",
        });
      }

      // 4. In-App UI Toast
      toast.info(title, {
        description: (
          <div className="flex flex-col gap-1">
            <p className="font-bold text-cyan-400 uppercase tracking-tighter">
              {body}
            </p>
            <p className="text-[10px] italic text-gray-400">
              "Victory belongs to the most persevering."
            </p>
          </div>
        ),
        icon: <Zap className="text-cyan-400 animate-pulse" />,
        className:
          "bg-[#0a0e27]/90 border-2 border-cyan-500/50 text-white backdrop-blur-xl",
        duration: 10000,
      });

      // 5. Mark as notified for today
      if (habitId) {
        localStorage.setItem(`notified_${habitId}`, today);
      }
    },
    [triggerSound]
  );

  useEffect(() => {
    // --- LOCAL SCHEDULER (When tab is open) ---
    const checkSchedule = () => {
      const now = new Date();
      const currentTime =
        now.getHours().toString().padStart(2, "0") +
        ":" +
        now.getMinutes().toString().padStart(2, "0");

      habits?.forEach((habit) => {
        if (!habit.notification_time) return;
        const habitTime = habit.notification_time.slice(0, 5);

        if (habitTime === currentTime) {
          const lastNotified = localStorage.getItem(`notified_${habit.id}`);
          const today = new Date().toDateString();
          if (lastNotified !== today) {
            triggerAlert(
              `MISSION READY: ${habit.name}`,
              "Execute your daily quest.",
              habit.id
            );
          }
        }
      });
    };

    // --- FIREBASE FOREGROUND LISTENER ---
    // This catches messages sent from Firebase while the app is open
    onMessageListener()
      .then((payload) => {
        triggerAlert(payload.notification.title, payload.notification.body);
      })
      .catch((err) => console.log("Firebase listener failed: ", err));

    // --- NETWORK STATUS LISTENERS ---
    const handleOffline = () => {
      toast.error("LINK SEVERED", {
        description: "Operating in offline mode.",
        icon: <WifiOff className="text-red-500" />,
        className: "bg-[#1a1d2e] border-2 border-red-500 text-white",
      });
    };

    const handleOnline = () => {
      toast.success("LINK ESTABLISHED", {
        description: "Neural sync complete.",
        icon: <Wifi className="text-green-500" />,
        className: "bg-[#1a1d2e] border-2 border-green-500 text-white",
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    const interval = setInterval(checkSchedule, 15000);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      clearInterval(interval);
    };
  }, [habits, triggerAlert]);

  return null;
}
