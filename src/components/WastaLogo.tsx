import React from 'react';

interface WastaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSlogan?: boolean;
  inverted?: boolean;
  language?: 'fr' | 'ar';
}

export const WastaLogo: React.FC<WastaLogoProps> = ({ 
  size = 'md', 
  showSlogan = false,
  inverted = false,
  language = 'fr'
}) => {
  const iconDimensions = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20'
  }[size];

  const dividerHeight = {
    sm: 'h-5',
    md: 'h-7',
    lg: 'h-9',
    xl: 'h-12'
  }[size];

  const titleSizes = {
    sm: 'text-base font-black',
    md: 'text-xl font-black',
    lg: 'text-2xl font-black',
    xl: 'text-3xl font-black'
  }[size];

  const gapSizes = {
    sm: 'gap-2',
    md: 'gap-2.5',
    lg: 'gap-3',
    xl: 'gap-4'
  }[size];

  return (
    <div dir="ltr" className={`inline-flex items-center ${gapSizes} select-none shrink-0`}>
      {/* New Brand Emblem */}
      <div
        className={`${iconDimensions} relative shrink-0 flex items-center justify-center ${
          inverted ? 'bg-white rounded-2xl p-1.5 shadow-md' : ''
        }`}
      >
        <img
          src="/wasta-emblem.png"
          alt="Wasta No"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Subtle Vertical Divider matching brand lockup */}
      <div className={`w-px ${dividerHeight} ${inverted ? 'bg-white/25' : 'bg-slate-200'} shrink-0`} />

      {/* Brand Wordmark: Wasta No */}
      <div className="flex flex-col justify-center text-left">
        <div className="flex items-baseline leading-none tracking-tight">
          <span className={`${titleSizes} ${inverted ? 'text-white' : 'text-[#0A1E3D]'}`}>
            Wasta
          </span>
          <span className={`${titleSizes} ml-1 ${inverted ? 'text-[#60A5FA]' : 'text-[#0057FF]'}`}>
            No
          </span>
        </div>
        {showSlogan && (
          <div className="flex flex-col mt-0.5">
            <span className={`text-[10px] font-semibold tracking-tight ${inverted ? 'text-slate-300' : 'text-slate-500'}`}>
              {language === 'ar' ? 'الخدمة المناسبة. الشخص المناسب.' : 'Le bon service. La bonne personne.'}
            </span>
            <svg viewBox="0 0 100 8" className="w-16 h-1.5 self-end mt-0.5" fill="none">
              <path d="M4 6C32 1.5 68 1.5 96 5" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
