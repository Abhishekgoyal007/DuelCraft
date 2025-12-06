import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

const GAME_MODES = [
  {
    id: "arena",
    name: "1v1 Arena",
    icon: "⚔️",
    description: "Classic duel! First to knock out their opponent wins.",
    color: "from-red-500 to-red-700",
    border: "border-red-800",
    available: true,
    path: "/arena"
  },
  {
    id: "sudden_death",
    name: "Sudden Death",
    icon: "💀",
    description: "One hit = one kill. No second chances!",
    color: "from-purple-600 to-purple-900",
    border: "border-purple-950",
    available: false,
    comingSoon: true
  },
  {
    id: "physics_madness",
    name: "Physics Madness",
    icon: "💣",
    description: "Crazy gravity, bouncy walls, explosive action!",
    color: "from-orange-500 to-yellow-600",
    border: "border-orange-700",
    available: false,
    comingSoon: true
  },
  {
    id: "tournament",
    name: "Tournament",
    icon: "🏆",
    description: "8-player bracket. Winner takes all!",
    color: "from-yellow-500 to-amber-600",
    border: "border-yellow-700",
    available: false,
    comingSoon: true
  },
  {
    id: "practice",
    name: "Practice Mode",
    icon: "🎯",
    description: "Train your skills against AI opponents.",
    color: "from-blue-500 to-blue-700",
    border: "border-blue-800",
    available: false,
    comingSoon: true
  },
  {
    id: "ranked",
    name: "Ranked Battle",
    icon: "📊",
    description: "Climb the ranks! Earn exclusive rewards.",
    color: "from-emerald-500 to-green-700",
    border: "border-green-800",
    available: false,
    comingSoon: true
  },
];

export default function GameModes() {
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}>
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 
            className="text-6xl font-black text-transparent bg-clip-text mb-4"
            style={{ 
              backgroundImage: "linear-gradient(135deg, #FFD700, #FF6B35)",
              textShadow: "0 4px 30px rgba(255, 215, 0, 0.3)"
            }}
          >
            🎮 GAME MODES
          </h1>
          <p className="text-xl text-gray-300">Choose your battlefield!</p>
        </div>

        {/* Game mode cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAME_MODES.map((mode) => (
            <div key={mode.id} className="relative">
              {mode.available ? (
                <Link to={mode.path}>
                  <div 
                    className={`bg-gradient-to-br ${mode.color} p-6 rounded-2xl shadow-2xl border-4 ${mode.border} transition-all hover:scale-105 hover:-translate-y-2 cursor-pointer group`}
                  >
                    <div className="text-6xl mb-4 group-hover:animate-bounce">{mode.icon}</div>
                    <h3 className="text-2xl font-black text-white mb-2">{mode.name}</h3>
                    <p className="text-white/80">{mode.description}</p>
                    <div className="mt-4 text-sm font-bold text-white/90 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      PLAY NOW
                    </div>
                  </div>
                </Link>
              ) : (
                <div 
                  className={`bg-gradient-to-br ${mode.color} p-6 rounded-2xl shadow-2xl border-4 ${mode.border} opacity-60 relative overflow-hidden`}
                >
                  <div className="text-6xl mb-4 grayscale">{mode.icon}</div>
                  <h3 className="text-2xl font-black text-white mb-2">{mode.name}</h3>
                  <p className="text-white/80">{mode.description}</p>
                  {mode.comingSoon && (
                    <div className="absolute top-4 right-4 bg-black/50 px-3 py-1 rounded-full text-xs font-bold text-yellow-400">
                      🔒 COMING SOON
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Back button */}
        <div className="mt-12 text-center">
          <Link to="/hub">
            <button className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition border-2 border-white/20">
              ← Back to Hub
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
