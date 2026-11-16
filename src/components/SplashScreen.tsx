import React, { useEffect, useState } from 'react';
import { WastaLogo } from './WastaLogo';
import { MapPin, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(onFinish, 400);
    }, 1800);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div 
      onClick={() => { setFading(true); setTimeout(onFinish, 200); }}
      className={`fixed inset-0 z-50 bg-gradient-to-b from-[#0F2942] via-[#0D2338] to-[#0A1B2B] text-white flex flex-col items-center justify-between p-8 transition-opacity duration-300 cursor-pointer ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="w-full flex justify-end pt-4">
        <span className="text-[11px] font-medium text-slate-400 bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
          Passer l'intro
        </span>
      </div>

      <div className="flex flex-col items-center text-center space-y-5 max-w-xs">
        {/* Animated Central Logo */}
        <div className="relative bg-white/95 px-5 py-4 rounded-3xl shadow-2xl border border-white/40">
          <WastaLogo size="lg" showSlogan />
        </div>

        <div className="space-y-2">
          <p className="text-xs text-slate-300 pt-1 leading-relaxed">
            Trouvez les meilleurs artisans et talents étudiants au Maroc sans intermédiaire.
          </p>
        </div>

        {/* City tags */}
        <div className="flex items-center gap-2 pt-2 text-xs text-slate-400">
          <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
            <MapPin className="w-3.5 h-3.5 text-blue-400" /> Fès
          </span>
          <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Meknès
          </span>
        </div>
      </div>

      {/* Footer loading pulse */}
      <div className="flex flex-col items-center gap-2 pb-6">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Chargement</span>
      </div>
    </div>
  );
};
