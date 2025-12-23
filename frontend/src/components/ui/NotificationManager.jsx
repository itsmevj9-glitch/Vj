import { useEffect, useCallback } from "react";
import { toast } from "sonner";
import { WifiOff, Wifi, Zap } from "lucide-react";
import { onMessageListener } from "../../lib/firebase";

// Sound Effect
const NOTIFICATION_SOUND_URL =
  "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3";
const audio = new Audio(NOTIFICATION_SOUND_URL);

export default function NotificationManager({ habits }) {
  // Debug Log
  useEffect(() => {
    console.log("🚀 SYSTEM HEARTBEAT: Listening for Backend Signals...");
  }, []);

  const triggerSound = useCallback(() => {
    if (localStorage.getItem("notifications_disabled") === "true") return;
    audio.currentTime = 0;
    audio.volume = 0.4;
    audio
      .play()
      .catch(() => console.warn("Audio blocked (User interaction needed)"));
  }, []);

  const triggerAlert = useCallback(
    (title, body) => {
      // 1. Check Mute Switch
      if (localStorage.getItem("notifications_disabled") === "true") return;

      // 2. Play Sound
      triggerSound();

      // 3. Browser Notification (If in background)
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
          body: body,
          icon: "/favicon.ico",
        });
      }

      // 4. In-App Toast (If in foreground)
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
        duration: 8000,
      });
    },
    [triggerSound]
  );

  useEffect(() => {
    // -----------------------------------------------------------
    // ❌ REMOVED: The Local 'checkSchedule' & 'setInterval'
    // We no longer guess the time here. We trust the Backend.
    // -----------------------------------------------------------

    // ✅ FIREBASE LISTENER (The only source of truth)
    // This wakes up ONLY when the Python backend sends a message.
    onMessageListener()
      .then((payload) => {
        console.log("📩 INCOMING TRANSMISSION:", payload);
        triggerAlert(payload.notification.title, payload.notification.body);
      })
      .catch((err) => console.log("Firebase listener error: ", err));

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

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [triggerAlert]);

  return null;
}
