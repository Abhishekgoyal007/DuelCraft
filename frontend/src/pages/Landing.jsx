import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

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
        bottom: `${marginBottom + 150}px`, // Start from tree canopy height
        left: `${startX}%`,
        animation: `fallLeaf ${duration}s linear infinite ${delay}s`,
        zIndex: 4
      }}
    >
      🍂
    </div>
  );
}

export default function Landing() {
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
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/20" />
      
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
      {/* Leaves from left trees (tree1 and tree3) */}
      <Leaf delay={0} duration={6} startX={8} startFromTree marginBottom={80} />
      <Leaf delay={2} duration={7} startX={12} startFromTree marginBottom={80} />
      <Leaf delay={4} duration={6.5} startX={5} startFromTree marginBottom={60} />
      <Leaf delay={1.5} duration={7.5} startX={10} startFromTree marginBottom={60} />
      {/* Leaves from right tree (tree2) */}
      <Leaf delay={1} duration={6} startX={92} startFromTree marginBottom={100} />
      <Leaf delay={3} duration={7} startX={88} startFromTree marginBottom={100} />
      <Leaf delay={5} duration={6.5} startX={95} startFromTree marginBottom={100} />
      
      {/* Main content */}
      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-4">
        <div className="text-center animate-fadeIn max-w-6xl w-full">
          {/* Title */}
          <div className="flex justify-center">
            <img 
              src="/assets/landingpage/tag.png" 
              alt="DuelCraft" 
              className="w-full max-w-md lg:max-w-xl h-auto drop-shadow-2xl"
            />
          </div>
          
          {/* Banner */}
          <div className="-mt-35 flex justify-center">
            <img 
              src="/assets/landingpage/banner.png" 
              alt="Fast-paced battles" 
              className="w-full max-w-sm lg:max-w-md h-auto drop-shadow-xl"
            />
          </div>
          
          {/* CTA Buttons */}
          <div className="-mt-20 flex flex-col sm:flex-row gap-2 justify-center relative z-20">
            <Link to="/hub">
              <button 
                className="group px-6 py-3 rounded-lg font-black text-lg text-white transition-all hover:scale-105 active:scale-95 bg-gradient-to-br from-red-500 to-red-700 border-4 border-red-800 shadow-2xl"
                style={{
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
                className="px-6 py-3 rounded-lg font-bold text-lg text-amber-900 transition-all hover:scale-105 active:scale-95 bg-gradient-to-br from-yellow-400 to-yellow-600 border-4 border-yellow-700 shadow-2xl"
              >
                ✨ Create Fighter
              </button>
            </Link>
          </div>
          
          {/* Feature badges */}
          <div className="flex flex-wrap justify-center gap-2">
            {['🏆 Leaderboards', '💰 Token Rewards', '🎨 Custom Avatars', '⚡ Real-time PvP'].map((feature, i) => (
              <div 
                key={i}
                className="px-3 py-1.5 bg-white/90 rounded-full text-xs font-bold text-slate-700 shadow-lg backdrop-blur-sm"
              >
                {feature}
              </div>
            ))}
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
        
        .animate-fadeIn {
          animation: fadeIn 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}