import React, { useState, useEffect } from 'react';
import { 
  X, Smartphone, Download, CheckCircle2, 
  FileCode, Sparkles 
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'fr' | 'ar';
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({ 
  isOpen, 
  onClose,
  language = 'fr' 
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk'>('pwa');
  const [installing, setInstalling] = useState(false);

  const isAr = language === 'ar';

  useEffect(() => {
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setInstalling(false);
    } else {
      alert(
        isAr 
          ? "على هاتفك أندرويد:\n1. اضغط على القائمة (النقاط الثلاث ⋮ أعلى المتصفح)\n2. اختر 'تثبيت التطبيق' أو 'إضافة إلى الشاشة الرئيسية'."
          : "Sur votre téléphone Android :\n1. Appuyez sur le menu (les 3 points ⋮ en haut à droite de Google Chrome)\n2. Choisissez 'Installer l'application' ou 'Ajouter à l'écran d'accueil'."
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isAr ? 'تثبيت التطبيق على هاتف أندرويد' : 'Installation sur Téléphone Android'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isAr ? 'واسطة لا - فاس ومكناس' : 'Wasta No - Fès & Meknès'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label={isAr ? "إغلاق" : "Fermer"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'pwa' ? 'bg-white text-[#0F2942] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAr ? 'تثبيت مباشر (نقرة واحدة)' : 'Installation directe (1 clic)'}</span>
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'apk' ? 'bg-white text-[#0F2942] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>{isAr ? 'ملف ومشروع أندرويد' : 'Dossier & Fichier Android'}</span>
          </button>
        </div>

        {/* Tab 1: Direct phone installation */}
        {activeTab === 'pwa' && (
          <div className="space-y-4 pt-1">
            <div className="bg-gradient-to-br from-[#0F2942] to-[#1E3A8A] text-white p-4 rounded-2xl flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 p-2 shrink-0 flex items-center justify-center border border-white/20">
                <img src="/pwa-192x192.png" alt="Wasta No" className="w-9 h-9 rounded-xl object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-white">
                  {isAr ? 'تطبيق واسطة لا للهواتف' : 'Application Wasta No Android'}
                </h4>
                <p className="text-[11px] text-slate-300 truncate">
                  {isAr ? 'الإصدار 1.0.0 • مجاني وسريع' : 'Version 1.0.0 • Gratuit • Rapide'}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> {isAr ? 'تطبيق معتمد PWA' : 'PWA Certifiée'}
                  </span>
                  <span className="text-[10px] text-slate-300">{isAr ? 'فاس ومكناس' : 'Fès & Meknès'}</span>
                </div>
              </div>
            </div>

            {isInstalled ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {isAr ? 'التطبيق مثبت بالفعل على جهازك!' : "L'application est déjà installée sur votre appareil !"}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={installing}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {deferredPrompt 
                    ? (isAr ? 'تثبيت واسطة لا على هاتفي' : 'Installer Wasta No sur mon téléphone')
                    : (isAr ? 'إضافة إلى الشاشة الرئيسية للهاتف' : "Ajouter à l'écran d'accueil Android")}
                </span>
              </button>
            )}

            {/* Step-by-step instructions for Android */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs text-slate-700">
              <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {isAr ? 'خطوات التثبيت من متصفح هاتفك :' : "Comment l'installer depuis votre navigateur Android :"}
                </span>
              </h5>
              
              <div className="space-y-2 text-[11px] text-slate-600">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#0F2942] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    {isAr 
                      ? 'افتح رابط المنصة على هاتفك في متصفح Google Chrome أو متصفح سامسونج.'
                      : 'Ouvrez le lien de l’application sur votre téléphone dans Google Chrome (ou Samsung Internet).'}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#0F2942] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    {isAr
                      ? 'اضغط على النقاط الثلاث العمودية (⋮) في أعلى زاوية المتصفح.'
                      : 'Appuyez sur les trois points verticaux (⋮) situés en haut à droite du navigateur.'}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#0F2942] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    {isAr
                      ? 'اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».'
                      : 'Sélectionnez « Installer l’application » ou « Ajouter à l’écran d’accueil ».'}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div className="text-emerald-800 font-medium">
                    {isAr
                      ? 'ستظهر أيقونة واسطة لا فوراً ضمن تطبيقات هاتفك وتفتح بملء الشاشة كتطبيق أصلي!'
                      : 'L’icône Wasta No s’ajoute immédiatement parmi vos applications avec ouverture en plein écran !'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Android Project & APK File info */}
        {activeTab === 'apk' && (
          <div className="space-y-3.5 pt-1 text-xs">
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#2563EB]" />
                <span>
                  {isAr ? 'مشروع وملف أندرويد متوفر في مجلد التطبيق' : 'Le dossier et fichier Android sont créés dans le projet !'}
                </span>
              </div>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                {isAr
                  ? 'تم إنشاء مجلد android الكامل مع ملف AndroidManifest.xml وإعدادات Gradle لتطبيق ma.wastano.app.'
                  : 'Le dossier complet /android avec son fichier AndroidManifest.xml et ses scripts Gradle est configuré pour l’application ma.wastano.app.'}
              </p>
            </div>

            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50 text-[11px]">
              <span className="font-bold text-slate-800 block">
                {isAr ? 'ملفات أندرويد المتضمنة :' : 'Fichiers Android intégrés :'}
              </span>
              <ul className="space-y-1.5 font-mono text-slate-600">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <code>/android/AndroidManifest.xml</code>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <code>/android/app/src/main/AndroidManifest.xml</code>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <code>/android/app/build.gradle</code>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <code>/capacitor.config.json</code>
                </li>
              </ul>
            </div>

            <div className="p-3 bg-slate-100 rounded-xl space-y-1.5 text-[11px] text-slate-700">
              <span className="font-bold text-slate-900">
                {isAr ? 'لاستخراج ملف APK لتثبيته يدوياً :' : 'Pour générer le fichier .apk physique :'}
              </span>
              <ol className="list-decimal list-inside space-y-1 text-slate-600">
                <li>
                  {isAr 
                    ? 'افتح مجلد android في برنامج Android Studio المجاني.' 
                    : 'Ouvrez le dossier android/ dans Android Studio.'}
                </li>
                <li>
                  {isAr 
                    ? 'اضغط على Build ثم Build APK(s).' 
                    : 'Cliquez sur Build > Build APK(s).'}
                </li>
                <li>
                  {isAr 
                    ? 'سيكون ملف app-debug.apk جاهزاً للإرسال والتثبيت على أي هاتف أندرويد!' 
                    : 'Votre fichier app-debug.apk sera prêt à être envoyé sur n’importe quel téléphone !'}
                </li>
              </ol>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>{isAr ? 'متوافق مع أندرويد 8 إلى أندرويد 15+' : 'Compatible Android 8.0 à Android 15+'}</span>
          <button
            onClick={onClose}
            className="font-bold text-[#0F2942] hover:underline cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Fermer'}
          </button>
        </div>

      </div>
    </div>
  );
};
