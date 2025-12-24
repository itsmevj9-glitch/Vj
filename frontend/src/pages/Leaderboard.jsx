import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Trophy, ChevronLeft, Zap, Crown, Target } from "lucide-react";
import { Button } from "../components/ui/button";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const res = await axios.get(`${API}/leaderboard`);
        setLeaders(res.data);
      } catch (err) {
        console.error("Leaderboard Offline");
      } finally {
        setLoading(false);
      }
    };
    fetchLeaders();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white relative overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* 1. NEW: Ambient Top Spotlight (Glow Effect) */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-cyan-500/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>

      {/* Cyberpunk Background Grid (Slightly brighter) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>

      <div className="relative z-10 max-w-4xl mx-auto py-12 px-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-8 hover:bg-cyan-500/10 text-cyan-400 gap-2 border border-transparent hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Base
        </Button>

        <div className="text-center mb-12 relative">
          {/* 2. UPGRADE: Title Glow */}
          <h1 className="text-5xl font-black italic tracking-tighter bg-gradient-to-b from-white via-gray-200 to-gray-500 bg-clip-text text-transparent uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            Global Rankings
          </h1>
          <p className="text-cyan-400 font-mono text-sm mt-2 tracking-widest uppercase drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
            Top Level 10 Operatives Only
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spinner border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {leaders.map((player, index) => (
              <div
                key={index}
                // 3. UPGRADE: Enhanced Borders and Shadows for Cards
                className={`relative flex items-center justify-between p-5 rounded-2xl border transition-all duration-500 group backdrop-blur-sm
                  ${
                    index === 0
                      ? "bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/60 shadow-[0_0_35px_-5px_rgba(234,179,8,0.3)] hover:shadow-[0_0_50px_-5px_rgba(234,179,8,0.5)]"
                      : index === 1
                      ? "bg-gradient-to-r from-slate-400/10 to-transparent border-slate-400/40 shadow-[0_0_25px_-5px_rgba(148,163,184,0.2)]"
                      : index === 2
                      ? "bg-gradient-to-r from-orange-700/10 to-transparent border-orange-700/40 shadow-[0_0_25px_-5px_rgba(194,65,12,0.2)]"
                      : "bg-[#1a1d2e]/40 border-gray-800 hover:border-cyan-500/50 hover:shadow-[0_0_20px_-5px_rgba(6,182,212,0.2)]"
                  }`}
              >
                <div className="flex items-center gap-6">
                  {/* Rank Badge - Increased Glow */}
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-black italic text-xl shadow-lg
                    ${
                      index === 0
                        ? "bg-yellow-500 text-black shadow-[0_0_20px_#eab308] ring-2 ring-yellow-400/50"
                        : index === 1
                        ? "bg-slate-300 text-black shadow-[0_0_15px_#94a3b8]"
                        : index === 2
                        ? "bg-orange-600 text-black shadow-[0_0_15px_#c2410c]"
                        : "text-gray-500 bg-gray-800/50"
                    }`}
                  >
                    {index + 1}
                  </div>

                  {/* Player Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-xl font-bold tracking-tight transition-colors ${
                          index === 0
                            ? "text-yellow-100 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]"
                            : "group-hover:text-cyan-400"
                        }`}
                      >
                        {player.username}
                      </h3>
                      {index === 0 && (
                        <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400 animate-pulse drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
                      )}
                    </div>
                    <div className="flex gap-4 text-[10px] font-mono uppercase tracking-widest text-gray-500">
                      <span>Level {player.level}</span>
                      <span className="text-cyan-600 drop-shadow-[0_0_3px_rgba(8,145,178,0.5)]">
                        Verified operative
                      </span>
                    </div>
                  </div>
                </div>

                {/* XP Visualizer - Neon Text Effect */}
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Zap
                      className={`w-4 h-4 ${
                        index === 0
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-cyan-400 fill-cyan-400"
                      } drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]`}
                    />
                    <span className="text-2xl font-black italic text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                      {player.xp}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-600 uppercase">
                    Points Secured
                  </p>
                </div>

                {/* Decorative scanning line (Brighter) */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Design */}
        <div className="mt-16 p-8 border border-dashed border-gray-800 rounded-3xl text-center hover:border-gray-700 transition-colors">
          <Target className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 text-sm max-w-xs mx-auto italic">
            "Discipline is the master key to your potential."
          </p>
        </div>
      </div>
    </div>
  );
}
