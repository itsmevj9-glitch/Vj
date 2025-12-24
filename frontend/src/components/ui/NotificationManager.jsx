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
    audio.play().catch(() => console.warn("Audio blocked"));
  }, []);

  const triggerAlert = useCallback(
    (title, body) => {
      // 1. Check Mute Switch
      if (localStorage.getItem("notifications_disabled") === "true") return;

      // 2. Play Sound
      triggerSound();

      // 🛑 I DELETED THE "new Notification()" BLOCK HERE.
      // This ensures only ONE system banner appears (via Chrome).

      // 3. In-App Toast (Visual popup inside the website ONLY)
      toast.info(title, {
        description: (
          <div className="flex flex-col gap-1">
            <p className="font-bold text-cyan-400 uppercase tracking-tighter">
              {body}
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
    // ✅ FIREBASE LISTENER
    onMessageListener()
      .then((payload) => {
        const title = payload.data?.title || payload.notification?.title;
        const body = payload.data?.body || payload.notification?.body;
        console.log("📩 INCOMING:", title);
        triggerAlert(title, body);
      })
      .catch((err) => console.log("Firebase listener error: ", err));

    // --- NETWORK STATUS LISTENERS ---
    const handleOffline = () => toast.error("Offline Mode");
    const handleOnline = () => toast.success("Online Mode");

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [triggerAlert]);

  return null;
}
