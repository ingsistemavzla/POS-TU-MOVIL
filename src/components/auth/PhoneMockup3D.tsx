import React from 'react';
import { MapPin } from 'lucide-react';

const MARKERS = [
  { x: 30, y: 40 },
  { x: 70, y: 30 },
  { x: 50, y: 70 },
  { x: 20, y: 80 },
  { x: 80, y: 60 }
];

export const PhoneMockup3D: React.FC = () => {
  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Top Text with Neon Flicker */}
      <div className="text-center">
        <h3 
          className="text-xs font-bold text-[#00FF7F] animate-neon-flicker"
          style={{ fontFamily: "'Press Start 2P', cursive" }}
        >
          TU MÓVIL MAGARTIA ZONA GAMER
        </h3>
      </div>

      {/* 3D Phone Container */}
      <div 
        className="relative mx-auto"
        style={{
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className="border-4 border-emerald-500/30 rounded-[3rem] p-4 bg-gradient-to-br from-slate-900 to-black shadow-2xl"
          style={{
            transform: 'rotateY(-10deg) rotateX(5deg)',
            width: '300px',
            height: '600px',
          }}
        >
          <div className="bg-slate-800 rounded-[2.5rem] overflow-hidden w-full h-full relative">
            {/* Phone Screen Content */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 to-slate-900 p-6 flex flex-col">
              {/* Status Bar */}
              <div className="flex justify-between items-center mb-4">
                <span className="text-emerald-400 text-xs font-semibold">Tu Móvil Margarita</span>
                <div className="flex space-x-1">
                  <div className="w-1 h-1 rounded-full bg-emerald-400" />
                  <div className="w-1 h-1 rounded-full bg-emerald-400" />
                  <div className="w-1 h-1 rounded-full bg-emerald-400" />
                </div>
              </div>
              
              {/* Map View with Markers */}
              <div className="flex-1 bg-slate-700/50 rounded-xl flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
                
                {/* Map Markers */}
                {MARKERS.map((marker, index) => (
                  <div
                    key={index}
                    className="absolute w-3 h-3 bg-[#00FF7F] rounded-full shadow-lg shadow-[#00FF7F]/50 animate-pulse-custom"
                    style={{
                      left: `${marker.x}%`,
                      top: `${marker.y}%`,
                      transform: 'translate(-50%, -50%)',
                      animationDelay: `${index * 0.2}s`,
                    }}
                  >
                    <div className="absolute inset-0 bg-[#00FF7F] rounded-full animate-ping opacity-75" />
                  </div>
                ))}
                
                {/* Center Logo with Pulse */}
                <div className="relative z-10 text-center space-y-2">
                  <div className="mx-auto w-16 h-16 animate-pulse-custom">
                    <img 
                      src="https://galenospro.com/wp-content/uploads/2025/05/FAVICON.png" 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <MapPin className="h-6 w-6 text-emerald-400 mx-auto" />
                  <p className="text-white/70 text-xs">Vista de Mapa</p>
                </div>
              </div>
              
              {/* Bottom Card: Orden #TEC-4582 */}
              <div className="mt-4 bg-slate-800/80 border border-emerald-500/30 rounded-lg p-3 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/60">Orden</p>
                    <p className="text-sm font-bold text-[#00FF7F]">#TEC-4582</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-[#00FF7F] animate-pulse" />
                </div>
              </div>
              
              {/* Bottom Navigation */}
              <div className="flex justify-around items-center mt-4 pt-4 border-t border-emerald-500/20">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-emerald-400" />
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-700/50" />
                <div className="w-8 h-8 rounded-full bg-slate-700/50" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Glow effect */}
        <div className="absolute -inset-4 bg-emerald-500/20 rounded-[3.5rem] blur-2xl -z-10 animate-pulse" />
      </div>
      
      {/* Text below phone */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-white">Tu Móvil Margarita</h3>
        <p className="text-sm text-white/60">Sistema de gestión multitienda</p>
      </div>
    </div>
  );
};

export default PhoneMockup3D;
