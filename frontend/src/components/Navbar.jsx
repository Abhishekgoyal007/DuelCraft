// src/components/Navbar.jsx
import ConnectWallet from "./ConnectWallet";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="w-full bg-gradient-to-r from-sky-500/90 via-sky-400/90 to-emerald-500/90 backdrop-blur-sm border-b-4 border-amber-600 shadow-lg">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-6">
        <Link to="/" className="flex items-center gap-3 hover:scale-105 transition-transform">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold shadow-lg border-2 border-amber-300">
            DC
          </div>
          <div>
            <div className="text-xl font-bold text-white drop-shadow-lg" style={{ fontFamily: "'Press Start 2P', system-ui" }}>
              DuelCraft
            </div>
            <div className="text-xs text-white/80 font-semibold">1v1 Physics Arena — Mantle</div>
          </div>
        </Link>

        <nav className="ml-8 flex gap-2 text-sm font-bold">
          <Link 
            className={`px-4 py-2 rounded-lg transition-all hover:scale-105 ${
              isActive('/') 
                ? 'bg-white text-sky-600 shadow-md' 
                : 'text-white hover:bg-white/20'
            }`} 
            to="/"
          >
            Home
          </Link>
          <Link 
            className={`px-4 py-2 rounded-lg transition-all hover:scale-105 ${
              isActive('/hub') 
                ? 'bg-white text-sky-600 shadow-md' 
                : 'text-white hover:bg-white/20'
            }`} 
            to="/hub"
          >
            Hub
          </Link>
          <Link 
            className={`px-4 py-2 rounded-lg transition-all hover:scale-105 ${
              isActive('/creator') 
                ? 'bg-white text-sky-600 shadow-md' 
                : 'text-white hover:bg-white/20'
            }`} 
            to="/creator"
          >
            Creator
          </Link>
          <Link 
            className={`px-4 py-2 rounded-lg transition-all hover:scale-105 ${
              isActive('/shop') 
                ? 'bg-white text-sky-600 shadow-md' 
                : 'text-white hover:bg-white/20'
            }`} 
            to="/shop"
          >
            Shop
          </Link>
          <Link 
            className={`px-4 py-2 rounded-lg transition-all hover:scale-105 ${
              isActive('/leaderboard') 
                ? 'bg-white text-sky-600 shadow-md' 
                : 'text-white hover:bg-white/20'
            }`} 
            to="/leaderboard"
          >
            Leaderboard
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* Back button - shows when not on home/hub */}
          {location.pathname !== '/' && location.pathname !== '/hub' && (
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold transition-all hover:scale-105 border-2 border-white/30"
            >
              ← Back
            </button>
          )}
          
          {/* Play button - always visible unless on arena page */}
          {location.pathname !== '/arena' && (
            <Link
              to="/arena"
              className="px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-bold transition-all hover:scale-105 shadow-lg border-2 border-green-300"
            >
              ⚔️ Play
            </Link>
          )}
          
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}
