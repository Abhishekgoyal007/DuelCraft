// src/pages/Landing.jsx
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

// Floating cloud component
function Cloud({ initialX, y, speed, size }) {
  const [x, setX] = useState(initialX);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setX(prev => {
        const newX = prev + speed;
        return newX > 110 ? -20 : newX;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [speed]);

  return (
    <div 
      className="absolute opacity-90"
      style={{ 
        left: `${x}%`, 
        top: `${y}%`,
        transform: `scale(${size})`,
        transition: 'left 0.05s linear'
      }}
    >
      <div className="flex">
        <div className="w-8 h-6 bg-white rounded-full" />
        <div className="w-12 h-8 bg-white rounded-full -ml-4 -mt-2" />
        <div className="w-8 h-6 bg-white rounded-full -ml-4" />
      </div>
    </div>
  );
}

// Floating star/sparkle
function Sparkle({ x, y, delay }) {
  return (
    <div 
      className="absolute text-yellow-300 text-xl"
      style={{ 
        left: `${x}%`, 
        top: `${y}%`,
        animation: `sparkle 2s ease-in-out infinite ${delay}s`
      }}
    >
      ✦
    </div>
  );
}

// Ground with grass tufts - pre-computed to avoid Math.random in render
const GRASS_TUFTS = Array.from({ length: 30 }, (_, i) => ({
  x: (i * 3.5) + (i % 3) * 0.5,
  height: 8 + (i % 5) * 3,
  delay: (i % 7) * 0.3
}));

function Ground() {
  return (
    <div className="absolute bottom-0 left-0 right-0">
      {/* Grass tufts */}
      <div className="absolute bottom-8 left-0 right-0 h-20 overflow-hidden">
        {GRASS_TUFTS.map((tuft, i) => (
          <div
            key={i}
            className="absolute bottom-0 w-1 bg-green-500 rounded-t origin-bottom"
            style={{
              left: `${tuft.x}%`,
              height: `${tuft.height}px`,
              animation: `sway 2s ease-in-out infinite ${tuft.delay}s`
            }}
          />
        ))}
      </div>
      {/* Main ground */}
      <div className="h-12 bg-green-600" />
      <div className="h-4 bg-amber-800" />
    </div>
  );
}

// Main title with animated effects
function AnimatedTitle() {
  const [shake, setShake] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setShake(true);
      setTimeout(() => setShake(false), 200);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`relative ${shake ? 'animate-shake' : ''}`}>
      <h1 
        className="text-7xl md:text-8xl font-black tracking-tight"
        style={{
          textShadow: '4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 6px 0 rgba(0,0,0,0.3)',
          color: '#FFD700',
          fontFamily: '"Press Start 2P", system-ui, sans-serif'
        }}
      >
        DUEL
      </h1>
      <h1 
        className="text-7xl md:text-8xl font-black tracking-tight -mt-2"
        style={{
          textShadow: '4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 6px 0 rgba(0,0,0,0.3)',
          color: '#FF6B35',
          fontFamily: '"Press Start 2P", system-ui, sans-serif'
        }}
      >
        CRAFT
      </h1>
      {/* VS badge */}
      <div 
        className="absolute -right-4 top-1/2 -translate-y-1/2 bg-red-600 text-white font-black text-2xl w-14 h-14 rounded-full flex items-center justify-center border-4 border-red-800"
        style={{ 
          animation: 'pulse 2s ease-in-out infinite',
          textShadow: '2px 2px 0 #000'
        }}
      >
        VS
      </div>
    </div>
  );
}

export default function Landing() {
  // Content is always visible - animations handle entrance
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Sky gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #87CEEB 0%, #98D8E8 40%, #B8E6B8 70%, #90EE90 100%)'
        }}
      />
      
      {/* Animated clouds */}
      <Cloud initialX={10} y={8} speed={0.05} size={1} />
      <Cloud initialX={40} y={15} speed={0.08} size={1.3} />
      <Cloud initialX={70} y={5} speed={0.04} size={0.9} />
      <Cloud initialX={85} y={20} speed={0.06} size={1.1} />
      
      {/* Sparkles */}
      <Sparkle x={15} y={25} delay={0} />
      <Sparkle x={85} y={30} delay={0.5} />
      <Sparkle x={50} y={15} delay={1} />
      <Sparkle x={25} y={40} delay={1.5} />
      <Sparkle x={75} y={35} delay={2} />
      
      {/* Ground */}
      <Ground />
      
      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Center content */}
        <div 
          className="text-center animate-fadeIn"
        >
          <AnimatedTitle />
          
          {/* Tagline in wooden sign style */}
          <div 
            className="mt-8 px-8 py-4 rounded-lg max-w-xl mx-auto"
            style={{
              background: 'linear-gradient(180deg, #8B4513 0%, #654321 100%)',
              border: '4px solid #3D2914',
              boxShadow: '0 8px 0 #3D2914, inset 0 2px 0 rgba(255,255,255,0.1)'
            }}
          >
            <p 
              className="text-lg md:text-xl text-amber-100 font-bold"
              style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.5)' }}
            >
              ⚔️ Fast-paced 1v1 physics battles ⚔️
            </p>
            <p 
              className="text-amber-200/80 mt-1"
              style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}
            >
              Customize your fighter • Earn tokens • Climb the leaderboard
            </p>
          </div>
          
          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/hub">
              <button 
                className="group px-8 py-4 rounded-lg font-black text-xl text-white transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(180deg, #FF6B35 0%, #E74C3C 100%)',
                  border: '4px solid #C0392B',
                  boxShadow: '0 6px 0 #8B0000, 0 8px 10px rgba(0,0,0,0.3)',
                  textShadow: '2px 2px 0 rgba(0,0,0,0.5)'
                }}
              >
                <span className="flex items-center gap-2">
                  🎮 PLAY NOW
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </button>
            </Link>
            
            <Link to="/creator">
              <button 
                className="px-8 py-4 rounded-lg font-bold text-xl text-amber-900 transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 100%)',
                  border: '4px solid #B8860B',
                  boxShadow: '0 6px 0 #8B6914, 0 8px 10px rgba(0,0,0,0.3)',
                  textShadow: '1px 1px 0 rgba(255,255,255,0.3)'
                }}
              >
                ✨ Create Fighter
              </button>
            </Link>
          </div>
          
          {/* Feature badges */}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {['🏆 Leaderboards', '💰 Token Rewards', '🎨 Custom Avatars', '⚡ Real-time PvP'].map((feature, i) => (
              <div 
                key={i}
                className="px-4 py-2 bg-white/90 rounded-full text-sm font-bold text-slate-700 shadow-lg"
                style={{
                  animation: `float 3s ease-in-out infinite ${i * 0.2}s`
                }}
              >
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes sparkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        
        @keyframes sway {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        
        @keyframes swing {
          0%, 100% { transform: rotate(-15deg); }
          50% { transform: rotate(15deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: translateY(-50%) scale(1); }
          50% { transform: translateY(-50%) scale(1.1); }
        }
        
        @keyframes punch {
          0% { transform: scaleX(0); }
          50% { transform: scaleX(1.2); }
          100% { transform: scaleX(1); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 1s ease-out forwards;
        }
        
        .animate-shake {
          animation: shake 0.2s ease-in-out;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px) rotate(-2deg); }
          75% { transform: translateX(5px) rotate(2deg); }
        }
      `}</style>
    </div>
  );
}
