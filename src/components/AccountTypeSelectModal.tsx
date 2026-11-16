import React from 'react';
import { AccountType } from '../types';
import { User, Briefcase, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { WastaLogo } from './WastaLogo';

interface AccountTypeSelectModalProps {
  isOpen: boolean;
  onSelectType: (type: AccountType) => void;
  onGoToLogin: () => void;
  onClose?: () => void;
  language?: 'fr' | 'ar';
}

export const AccountTypeSelectModal: React.FC<AccountTypeSelectModalProps> = ({
  isOpen,
  onSelectType,
  onGoToLogin,
  onClose,
  language = 'fr'
}) => {
  if (!isOpen) return null;

  const isAr = language === 'ar';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto p-6 space-y-5 shadow-2xl border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <WastaLogo size="sm" showSlogan={false} language={language} />
          {onClose && (
            <button 
              onClick={onClose} 
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              aria-label={isAr ? "إغلاق" : "Fermer"}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="text-center space-y-1.5 pt-1">
          <h2 className="text-xl font-black text-[#0F2942] tracking-tight">
            {isAr ? 'مرحباً بك في واسطة لا' : 'Bienvenue sur Wasta No'}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {isAr ? 'كيف ترغب في استخدام تطبيقنا؟' : 'Comment souhaitez-vous utiliser notre application ?'}
          </p>
        </div>

        {/* 2 Options */}
        <div className="space-y-3.5 pt-1">
          {/* OPTION 1: PARTICULIER */}
          <div 
            onClick={() => onSelectType('particulier')}
            className="p-5 rounded-3xl border-2 border-blue-200/90 bg-gradient-to-br from-blue-50/70 to-slate-50 hover:border-[#2563EB] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#0F2942] text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <User className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-[#2563EB] uppercase tracking-wider block">
                  {isAr ? 'الخيار 1' : 'Option 1'}
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-0.5">
                  {isAr ? 'زبون (باحث عن خدمة)' : 'Particulier (Client)'}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {isAr 
                    ? 'تبحث عن حرفي مؤهل، مهني متخصص أو طالب موهوب لإنجاز أشغالك وتلبية احتياجاتك.'
                    : 'Vous recherchez un professionnel ou un service pour répondre à vos besoins.'}
                </p>
              </div>
            </div>

            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectType('particulier');
              }}
              className="w-full py-2.5 px-4 bg-[#0F2942] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 group-hover:bg-[#1E3A8A] transition-colors shadow-sm cursor-pointer"
            >
              <span>{isAr ? 'المتابعة كزبون باحث عن خدمات' : 'Continuer en tant que particulier'}</span>
              {isAr ? <ArrowLeft className="w-4 h-4 text-emerald-400" /> : <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />}
            </button>
          </div>

          {/* OPTION 2: PRESTATAIRE */}
          <div 
            onClick={() => onSelectType('prestataire')}
            className="p-5 rounded-3xl border-2 border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 to-slate-50 hover:border-emerald-600 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <Briefcase className="w-6 h-6 text-emerald-200" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                  {isAr ? 'الخيار 2' : 'Option 2'}
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-0.5">
                  {isAr ? 'مهني وحرفي ومقدم خدمات' : 'Prestataire de services'}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {isAr
                    ? 'ترغب في عرض مهاراتك، نشر أسعار خدماتك وجلب زبناء جدد بانتظام في مدينتك.'
                    : 'Vous souhaitez proposer vos compétences, publier vos services et trouver des clients.'}
                </p>
              </div>
            </div>

            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectType('prestataire');
              }}
              className="w-full py-2.5 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 group-hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
            >
              <span>{isAr ? 'المتابعة كمهني مقدم خدمات' : 'Continuer en tant que prestataire'}</span>
              {isAr ? <ArrowLeft className="w-4 h-4 text-white" /> : <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />}
            </button>
          </div>
        </div>

        {/* Existing account link */}
        <div className="pt-2 text-center border-t border-slate-100">
          <p className="text-xs text-slate-500">
            {isAr ? 'هل لديك حساب بالفعل؟ ' : 'Vous avez déjà un compte ? '}
            <button
              onClick={onGoToLogin}
              className="font-bold text-[#2563EB] hover:underline cursor-pointer"
            >
              {isAr ? 'تسجيل الدخول' : 'Se connecter'}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};
