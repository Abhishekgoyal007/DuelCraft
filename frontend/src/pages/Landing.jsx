import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

// Floating particle component
function Particle({ delay, duration, startX, startY, size }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        width: `${size}px`,
        height: `${size}px`,
        background: 'radial-gradient(circle, rgba(255,215,0,0.8) 0%, rgba(255,165,0,0.4) 50%, transparent 70%)',
        animation: `particle-float ${duration}s ease-in-out infinite ${delay}s`,
        filter: 'blur(1px)',
        zIndex: 2
      }}
    />
  );
}

// Floating cloud component with interactive hover
function Cloud({ initialX, y, speed, size, delay }) {
  const [x, setX] = useState(initialX);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setX(prev => {
        const newX = prev + speed;
        return newX > 120 ? -20 : newX;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [speed]);

  return (
    <div
      className="absolute cursor-pointer transition-transform duration-300"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `scale(${isHovered ? size * 1.2 : size})`,
        transition: 'transform 0.3s ease, left 0.05s linear',
        zIndex: 5,
        animation: `float 3s ease-in-out infinite ${delay}s`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img
        src="/assets/landingpage/cloud.png"
        alt="cloud"
        className="w-32 h-auto drop-shadow-lg"
        style={{
          filter: isHovered ? 'brightness(1.2) drop-shadow(0 0 10px rgba(255,255,255,0.5))' : 'none'
        }}
      />
    </div>
  );
}

// Tree component - stable, no animation
function Tree({ src, position, size, marginBottom }) {
  return (
    <div
      className="absolute"
      style={{
        [position]: '0',
        bottom: `${marginBottom}px`,
        width: `${size}px`,
        zIndex: 3
      }}
    >
      <img
        src={src}
        alt="tree"
        className="w-full h-auto drop-shadow-2xl"
      />
    </div>
  );
}

// Falling leaf component from trees
function Leaf({ delay, duration, startX, marginBottom }) {
  return (
    <div
      className="absolute text-2xl opacity-70"
      style={{
        bottom: `${marginBottom + 150}px`,
        left: `${startX}%`,
        animation: `fallLeaf ${duration}s linear infinite ${delay}s`,
        zIndex: 4
      }}
    >
      🍂
    </div>
  );
}

// Animated Mantle badge
function MantleBadge() {
  return (
    <div className="absolute top-6 right-6 z-20">
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-80 transition-opacity" />
        <div className="relative glass-dark px-5 py-3 rounded-2xl flex items-center gap-3 border border-white/20 hover:border-cyan-400/50 transition-all cursor-pointer hover:scale-105">
          <img
            src="/assets/logos/mantle.png"
            alt="Mantle"
            className="w-8 h-8 object-contain"
          />
          <div>
            <div className="text-white font-bold text-sm font-display">Built on Mantle</div>
            <div className="text-cyan-300 text-xs">Layer 2 • Low Fees</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stats counter component
function StatCounter({ icon, value, label, delay }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;

      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(interval);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <div className="text-center group cursor-default">
      <div className="text-4xl mb-2 group-hover:scale-125 transition-transform">{icon}</div>
      <div className="text-3xl font-black text-white font-display">{count.toLocaleString()}+</div>
      <div className="text-sm text-white/70 font-semibold">{label}</div>
    </div>
  );
}

export default function Landing() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div
      className="h-screen w-screen fixed inset-0 overflow-hidden"
      style={{
        backgroundImage: 'url(/assets/landingpage/landingpagebg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Premium gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/40" />

      {/* Animated particles */}
      {[...Array(15)].map((_, i) => (
        <Particle
          key={i}
          delay={i * 0.5}
          duration={6 + (i % 4)}
          startX={10 + (i * 6)}
          startY={20 + (i % 5) * 15}
          size={4 + (i % 3) * 2}
        />
      ))}

      {/* Mantle badge */}
      <MantleBadge />

      {/* Animated clouds */}
      <Cloud initialX={10} y={8} speed={0.08} size={1} delay={0} />
      <Cloud initialX={35} y={15} speed={0.05} size={1.3} delay={0.5} />
      <Cloud initialX={60} y={5} speed={0.06} size={0.9} delay={1} />
      <Cloud initialX={85} y={20} speed={0.07} size={1.1} delay={1.5} />
      <Cloud initialX={50} y={25} speed={0.04} size={0.8} delay={2} />
      <Cloud initialX={70} y={25} speed={0.02} size={1} delay={5} />
      <Cloud initialX={20} y={25} speed={0.04} size={0.9} delay={2} />
      <Cloud initialX={30} y={25} speed={0.04} size={1} delay={2} />

      {/* Trees at bottom - lifted above the road */}
      <Tree src="/assets/landingpage/tree1.png" position="left" size={250} marginBottom={80} />
      <Tree src="/assets/landingpage/tree2.png" position="right" size={280} marginBottom={100} />
      <Tree src="/assets/landingpage/tree3.png" position="left" size={200} marginBottom={60} />

      {/* Falling leaves from trees */}
      <Leaf delay={0} duration={6} startX={8} marginBottom={80} />
      <Leaf delay={2} duration={7} startX={12} marginBottom={80} />
      <Leaf delay={4} duration={6.5} startX={5} marginBottom={60} />
      <Leaf delay={1.5} duration={7.5} startX={10} marginBottom={60} />
      <Leaf delay={1} duration={6} startX={92} marginBottom={100} />
      <Leaf delay={3} duration={7} startX={88} marginBottom={100} />
      <Leaf delay={5} duration={6.5} startX={95} marginBottom={100} />

      {/* Main content */}
      <div className={`relative z-10 h-full w-full flex flex-col items-center justify-center px-4 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="text-center max-w-6xl w-full">
          {/* Title */}
          <div className="flex justify-center animate-slide-down">
            <img
              src="/assets/landingpage/tag.png"
              alt="DuelCraft"
              className="w-full max-w-md lg:max-w-xl h-auto drop-shadow-2xl hover:scale-105 transition-transform duration-300"
              style={{ filter: 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.3))' }}
            />
          </div>

          {/* Tagline */}
          <div className="-mt-12 mb-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <p className="text-white/90 font-display text-lg md:text-xl tracking-wide" style={{ textShadow: '2px 2px 10px rgba(0,0,0,0.8)' }}>
              ⚔️ Blockchain-Powered 1v1 Fighting Arena ⚔️
            </p>
          </div>

          {/* Banner */}
          <div className="-mt-20 flex justify-center animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <img
              src="/assets/landingpage/banner.png"
              alt="Fast-paced battles"
              className="w-full max-w-sm lg:max-w-md h-auto drop-shadow-xl"
            />
          </div>

          {/* CTA Buttons */}
          <div className="-mt-16 flex flex-col sm:flex-row gap-4 justify-center relative z-20 animate-slide-up" style={{ animationDelay: '0.7s' }}>
            <Link to="/hub">
              <button
                className="group relative px-10 py-5 rounded-2xl font-black text-xl text-white transition-all hover:scale-110 active:scale-95 bg-gradient-to-br from-red-500 via-red-600 to-red-700 border-4 border-red-800 shadow-2xl overflow-hidden"
                style={{
                  textShadow: '3px 3px 0 rgba(0,0,0,0.5)',
                  boxShadow: '0 10px 0 #7F1D1D, 0 15px 30px rgba(0,0,0,0.4)'
                }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                <span className="flex items-center gap-3 relative z-10">
                  <span className="text-2xl animate-pulse">🎮</span>
                  PLAY NOW
                  <span className="group-hover:translate-x-2 transition-transform text-2xl">→</span>
                </span>
              </button>
            </Link>

            <Link to="/creator">
              <button
                className="group relative px-10 py-5 rounded-2xl font-bold text-xl text-amber-900 transition-all hover:scale-110 active:scale-95 bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 border-4 border-yellow-700 shadow-2xl overflow-hidden"
                style={{
                  boxShadow: '0 10px 0 #8B6914, 0 15px 30px rgba(0,0,0,0.3)'
                }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                <span className="flex items-center gap-3 relative z-10">
                  <span className="text-2xl group-hover:rotate-12 transition-transform">✨</span>
                  Create Fighter
                </span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes sway {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-2deg); }
          75% { transform: rotate(2deg); }
        }
        
        @keyframes fallLeaf {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.7;
          }
          50% {
            transform: translateY(150px) translateX(30px) rotate(180deg);
            opacity: 0.5;
          }
          100% {
            transform: translateY(300px) translateX(-20px) rotate(360deg);
            opacity: 0;
          }
        }
        
        @keyframes particle-float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-100px) translateX(30px);
            opacity: 1;
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}