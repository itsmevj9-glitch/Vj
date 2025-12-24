import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  Trophy,
  Flame,
  Quote,
  Lock,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Maximize2,
  X,
} from "lucide-react";

export default function Evolution({ user }) {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [freshStats, setFreshStats] = useState(null);

  useEffect(() => {
    const fetchFreshData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const response = await axios.get("http://127.0.0.1:8000/api/stats", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setFreshStats(response.data);
        }
      } catch (error) {
        console.error("Stats refresh failed", error);
      }
    };
    fetchFreshData();
  }, []);

  const streak = freshStats
    ? freshStats.current_streak
    : user?.current_streak || 0;
  const best = freshStats
    ? freshStats.longest_streak
    : user?.longest_streak || 0;
  const shields = freshStats ? freshStats.shields : user?.shields || 0;

  const mountainImg =
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2000";

  const dailyQuote = useMemo(() => {
    const quotes = [
      "Your current life is the result of your previous standards. Raise them now.",
      "A missed day isn't a break; it's a vote for the person you are trying to kill.",
      "The version of you that wins hasn't been born yet. Suffer the birth pains.",
      "You don't need more time; you need more discipline. The peak doesn't wait.",
      "Every 'no' to a distraction is a 'yes' to your future empire.",
      "Pain is temporary, but the regret of 'what if' lasts a lifetime.",
      "Improvement is a choice you make every single hour. Choose wisely.",
    ];
    return quotes[new Date().getDate() % quotes.length];
  }, []);

  const PuzzlePiece = ({ index, isUnlocked, isLarge = false }) => {
    const colCount = 5;
    const rowCount = 4;
    const row = Math.floor(index / colCount);
    const col = index % colCount;

    return (
      <div
        className={`relative w-full overflow-hidden transition-all duration-700 
          ${
            isLarge
              ? "border-[0.5px] border-white/20"
              : "border-[0.5px] border-black/10"
          }`}
        style={{ aspectRatio: "5/4" }}
      >
        <div
          className={`absolute inset-0 transition-all duration-1000 ${
            isUnlocked ? "opacity-100 blur-0" : "opacity-30 blur-2xl grayscale"
          }`}
          style={{
            backgroundImage: `url('${mountainImg}')`,
            backgroundSize: "500% 400%",
            backgroundPosition: `${(col * 100) / (colCount - 1)}% ${
              (row * 100) / (rowCount - 1)
            }%`,
            backgroundRepeat: "no-repeat",
          }}
        />
        {!isUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <Lock
              className={`${isLarge ? "w-6 h-6" : "w-4 h-4"} text-white/40`}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans p-4 md:p-8 pb-12">
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 z-[110] p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all"
          >
            <X size={24} />
          </button>
          <div className="w-full max-w-5xl">
            <div className="grid grid-cols-5 gap-0 border border-white/20 shadow-2xl overflow-hidden rounded-xl bg-black">
              {[...Array(20)].map((_, i) => (
                <PuzzlePiece
                  key={i}
                  index={i}
                  isUnlocked={i < streak}
                  isLarge={true}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[880px] mx-auto w-full flex justify-between items-center mb-6 px-2">
        <button
          onClick={() => navigate("/")}
          className="p-3 bg-white shadow-sm border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl shadow-md border-2 border-amber-100 scale-105">
          <Trophy className="w-8 h-8 text-amber-500" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">
              All-Time Peak
            </span>
            <span className="text-2xl font-black italic text-slate-800 leading-none">
              {best} Days
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[880px] mx-auto w-full mb-8">
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 relative overflow-hidden group">
          <Quote
            className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700"
            size={120}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="text-amber-500 w-4 h-4" />
              <span className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-400">
                Daily Directive
              </span>
            </div>
            <p className="text-xl md:text-3xl font-serif italic text-slate-800 leading-tight">
              "{dailyQuote}"
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[880px] mx-auto w-full mb-10 px-2">
        <div className="flex justify-between items-end mb-4 px-2">
          <p className="text-[12px] font-black uppercase tracking-widest text-slate-400 font-mono">
            Module_Evolution_Active
          </p>
          <button
            onClick={() => setIsFullscreen(true)}
            className="flex items-center gap-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-all"
          >
            <Maximize2 size={14} /> VIEW FULLSCREEN
          </button>
        </div>

        <div
          onClick={() => setIsFullscreen(true)}
          className="grid grid-cols-5 gap-0 bg-slate-200 shadow-2xl border border-slate-300 rounded-[2.5rem] overflow-hidden cursor-pointer hover:shadow-blue-900/10 transition-shadow"
        >
          {[...Array(20)].map((_, i) => (
            <PuzzlePiece key={i} index={i} isUnlocked={i < streak} />
          ))}
        </div>
      </div>

      <div className="max-w-[880px] mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 px-2">
        {(() => {
          let flameColor = "text-slate-400";
          let bgColor = "bg-white";
          let shadow = "shadow-lg";
          let fireAnimation = "";
          let intensityText = "Spark";

          if (streak >= 15) {
            flameColor = "text-cyan-400";
            bgColor = "bg-slate-900 border-cyan-500/50";
            shadow = "shadow-[0_0_40px_rgba(34,211,238,0.6)]";
            fireAnimation =
              "animate-pulse drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]";
            intensityText = "PLASMA INFERNO";
          } else if (streak >= 7) {
            flameColor = "text-red-600";
            bgColor = "bg-red-50 border-red-200";
            shadow = "shadow-[0_0_30px_rgba(220,38,38,0.4)]";
            fireAnimation =
              "animate-bounce drop-shadow-[0_0_10px_rgba(220,38,38,0.6)]";
            intensityText = "RAGING BLAZE";
          } else if (streak >= 3) {
            flameColor = "text-orange-500";
            bgColor = "bg-orange-50/50 border-orange-100";
            shadow = "shadow-orange-200/50";
            fireAnimation = "animate-pulse";
            intensityText = "BURNING";
          }

          return (
            <div
              className={`relative p-8 rounded-[2.5rem] border text-center overflow-hidden transition-all duration-700 group ${bgColor} ${shadow}`}
            >
              <div
                className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity bg-gradient-to-t from-current to-transparent ${flameColor}`}
              />
              <Flame
                className={`w-10 h-10 mx-auto mb-2 transition-all duration-500 ${flameColor} ${fireAnimation}`}
              />
              <p
                className={`text-[10px] font-black uppercase tracking-widest ${
                  streak >= 15 ? "text-cyan-200" : "text-slate-400"
                }`}
              >
                {intensityText}
              </p>
              <p
                className={`text-4xl font-black italic drop-shadow-sm ${flameColor}`}
              >
                {streak} Days
              </p>
            </div>
          );
        })()}

        <div
          className={`p-8 rounded-[2.5rem] shadow-lg border text-center transition-all duration-700 flex flex-col items-center justify-center
          ${
            shields > 0
              ? "bg-emerald-500 border-emerald-400 text-white shadow-emerald-200/50 shadow-xl"
              : "bg-red-600 border-red-500 text-white animate-pulse shadow-red-200/50 shadow-xl"
          }`}
        >
          <ShieldCheck className="w-8 h-8 mb-2" />
          <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">
            Vault Status
          </p>
          <p className="text-4xl font-black italic tracking-tighter">
            {shields} <span className="text-lg">Left</span>
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-100 text-center flex flex-col justify-center items-center">
          <AlertTriangle className="w-8 h-8 text-blue-600 mb-2" />
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
            Integrity
          </p>
          <p className="text-xl font-bold text-slate-700 uppercase tracking-tighter leading-none">
            48H Failsafe Active
          </p>
        </div>
      </div>
    </div>
  );
}
