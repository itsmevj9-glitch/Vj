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
    <div className="min-h-screen bg-[#0a0e27] text-white relative overflow-hidden font-sans">
      {/* Cyberpunk Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>

      <div className="relative z-10 max-w-4xl mx-auto py-12 px-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-8 hover:bg-cyan-500/10 text-cyan-400 gap-2"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Base
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-black italic tracking-tighter bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent uppercase">
            Global Rankings
          </h1>
          <p className="text-cyan-500 font-mono text-sm mt-2 tracking-widest uppercase">
            Top Level 10 Operatives Only
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {leaders.map((player, index) => (
              <div
                key={index}
                className={`relative flex items-center justify-between p-5 rounded-2xl border transition-all duration-500 group
                  ${
                    index === 0
                      ? "bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.1)]"
                      : index === 1
                      ? "bg-gradient-to-r from-slate-400/10 to-transparent border-slate-400/30"
                      : index === 2
                      ? "bg-gradient-to-r from-orange-700/10 to-transparent border-orange-700/30"
                      : "bg-[#1a1d2e]/40 border-gray-800 hover:border-cyan-500/50"
                  }`}
              >
                <div className="flex items-center gap-6">
                  {/* Rank Badge */}
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-black italic text-xl
                    ${
                      index === 0
                        ? "bg-yellow-500 text-black shadow-[0_0_15px_#eab308]"
                        : index === 1
                        ? "bg-slate-400 text-black"
                        : index === 2
                        ? "bg-orange-700 text-black"
                        : "text-gray-500"
                    }`}
                  >
                    {index + 1}
                  </div>

                  {/* Player Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold tracking-tight group-hover:text-cyan-400 transition-colors">
                        {player.username}
                      </h3>
                      {index === 0 && (
                        <Crown className="w-5 h-5 text-yellow-500 animate-pulse" />
                      )}
                    </div>
                    <div className="flex gap-4 text-[10px] font-mono uppercase tracking-widest text-gray-500">
                      <span>Level {player.level}</span>
                      <span className="text-cyan-600">Verified operative</span>
                    </div>
                  </div>
                </div>

                {/* XP Visualizer */}
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400" />
                    <span className="text-2xl font-black italic text-white">
                      {player.xp}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-600 uppercase">
                    Points Secured
                  </p>
                </div>

                {/* Decorative scanning line */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Design */}
        <div className="mt-16 p-8 border border-dashed border-gray-800 rounded-3xl text-center">
          <Target className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 text-sm max-w-xs mx-auto italic">
            "Discipline is the master key to your potential."
          </p>
        </div>
      </div>
    </div>
  );
}
