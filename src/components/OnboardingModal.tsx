import React, { useState } from 'react';
import { WastaLogo } from './WastaLogo';
import { Search, GraduationCap, Briefcase, ArrowRight, ArrowLeft, Check } from 'lucide-react';

interface OnboardingModalProps {
  language?: 'fr' | 'ar';
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ 
  language = 'fr',
  onComplete 
}) => {
  const isAr = language === 'ar';
  const [currentStep, setCurrentStep] = useState(0);

  const slidesFr = [
    {
      title: 'Trouvez le bon professionnel près de chez vous',
      subtitle: 'Finies les pannes sans solution ou le recours aux connaissances lointaines. Comparez les plombiers, électriciens et artisans qualifiés à Fès et Meknès en toute transparence.',
      icon: <Search className="w-8 h-8 text-blue-500" />,
      accentColor: 'from-blue-600 to-indigo-600',
      badge: 'Artisans & Dépannage',
      highlight: 'Zéro Wasta. 100% Mérite.'
    },
    {
      title: 'Découvrez des étudiants et jeunes talents',
      subtitle: 'Soutenez les étudiants de l’USMBA Fès et de l’ENSAM Meknès. Bénéficiez de prestations de qualité à prix équitable pour vos designs Canva, cours de soutien et réseaux sociaux.',
      icon: <GraduationCap className="w-8 h-8 text-emerald-500" />,
      accentColor: 'from-emerald-600 to-teal-600',
      badge: 'Jeunes Talents & Freelance',
      highlight: 'Design, Cours, Digital'
    },
    {
      title: 'Proposez vos compétences et trouvez des missions',
      subtitle: 'Vous êtes artisan qualifié ou étudiant passionné ? Créez votre profil, publiez vos tarifs en Dirhams marocains (MAD) et répondez directement aux demandes des clients.',
      icon: <Briefcase className="w-8 h-8 text-amber-500" />,
      accentColor: 'from-amber-600 to-orange-600',
      badge: 'Gagnez votre vie',
      highlight: 'Rémunération directe sans commission cachée'
    }
  ];

  const slidesAr = [
    {
      title: 'اعثر على الحرفي أو المهني المناسب قربك',
      subtitle: 'لا داعي للبحث عن واسطة أو الاعتماد على معارف بعيدة. قارن أفضل السباكين، الكهربائيين والصناع المؤهلين في فاس ومكناس بكل شفافية وثقة.',
      icon: <Search className="w-8 h-8 text-blue-500" />,
      accentColor: 'from-blue-600 to-indigo-600',
      badge: 'حرفيون وصيانة',
      highlight: 'بدون واسطة. 100% كفاءة واستحقاق.'
    },
    {
      title: 'اكتشف مواهب وطلبة جامعيين متميزين',
      subtitle: 'ادعم طلبة جامعات فاس ومكناس. استفد من خدمات رقمية متميزة بأسعار مناسبة: تصاميم كانفا، دروس دعم، ترجمة وإدارة صفحات التواصل.',
      icon: <GraduationCap className="w-8 h-8 text-emerald-500" />,
      accentColor: 'from-emerald-600 to-teal-600',
      badge: 'مواهب شابة وعمل حر',
      highlight: 'تصميم، دروس، خدمات رقمية'
    },
    {
      title: 'اعرض مهاراتك واكسب دخلاً من مهنتك',
      subtitle: 'هل أنت حرفي متمرس أو طالب موهوب؟ أنشئ ملفك المهني، حدد أسعارك بالدرهم المغربي وأجب مباشرة عن طلبات الزبناء بدون وسطاء.',
      icon: <Briefcase className="w-8 h-8 text-amber-500" />,
      accentColor: 'from-amber-600 to-orange-600',
      badge: 'فرص عمل مباشرة',
      highlight: 'ربح مباشر 100% بدون عمولات خفية'
    }
  ];

  const slides = isAr ? slidesAr : slidesFr;

  const handleNext = () => {
    if (currentStep < slides.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const slide = slides[currentStep];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-100 dark:border-slate-800">
        
        {/* Top Header bar */}
        <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="dark:hidden">
            <WastaLogo size="sm" language={language} />
          </div>
          <div className="hidden dark:block">
            <WastaLogo size="sm" inverted language={language} />
          </div>
          <button 
            onClick={onComplete}
            className="text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            {isAr ? 'تخطي' : 'Passer'}
          </button>
        </div>

        {/* Dynamic Graphic Stage */}
        <div className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shadow-inner relative">
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-tr ${slide.accentColor} opacity-15`}></div>
            {slide.icon}
          </div>

          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 tracking-wider uppercase bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
            {slide.badge}
          </span>

          <h2 className="text-lg font-black text-[#0F2942] dark:text-white tracking-tight leading-snug">
            {slide.title}
          </h2>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs">
            {slide.subtitle}
          </p>

          <div className="inline-block bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
            {slide.highlight}
          </div>
        </div>

        {/* Stepper Dots & Action Controls */}
        <div className="p-6 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex justify-center items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStep ? 'w-6 bg-[#0F2942] dark:bg-blue-500' : 'w-2 bg-slate-300 dark:bg-slate-700'
                }`}
                aria-label={`Étape ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="py-3 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1"
              >
                {isAr ? (
                  <>
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>رجوع</span>
                  </>
                ) : (
                  <>
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Retour</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#0F2942] dark:bg-[#2563EB] hover:bg-[#1E3A8A] dark:hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              {currentStep === slides.length - 1 ? (
                <>
                  <span>{isAr ? 'ابدأ تجربة Wasta No' : 'Commencer l’expérience'}</span>
                  <Check className="w-4 h-4 text-emerald-400" />
                </>
              ) : (
                <>
                  <span>{isAr ? 'متابعة' : 'Continuer'}</span>
                  <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
