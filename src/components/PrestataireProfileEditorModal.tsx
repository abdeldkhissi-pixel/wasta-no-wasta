import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ProviderProfileDoc, ServiceCategory, MoroccanCity } from '../types';
import { SERVICE_CATEGORIES, MOROCCAN_CITIES } from '../data/categories';
import { getCategoryTranslation, getCityTranslation } from '../data/translations';
import { X, Check, Loader2 } from 'lucide-react';

interface PrestataireProfileEditorModalProps {
  isOpen: boolean;
  language?: 'fr' | 'ar';
  onClose: () => void;
  providerProfile: ProviderProfileDoc;
  onSaved: (updatedProfile: ProviderProfileDoc) => void;
}

export const PrestataireProfileEditorModal: React.FC<PrestataireProfileEditorModalProps> = ({
  isOpen,
  language = 'fr',
  onClose,
  providerProfile,
  onSaved
}) => {
  const isAr = language === 'ar';
  const [professionalTitle, setProfessionalTitle] = useState(providerProfile.professionalTitle || '');
  const [description, setDescription] = useState(providerProfile.description || '');
  const [selectedCategories, setSelectedCategories] = useState<ServiceCategory[]>(providerProfile.categories || []);
  const [skillsText, setSkillsText] = useState((providerProfile.skills || []).join(', '));
  const [experience, setExperience] = useState(providerProfile.experience || '');
  const [city, setCity] = useState<MoroccanCity>(providerProfile.city || 'Fès');
  const [serviceArea, setServiceArea] = useState(providerProfile.serviceArea || providerProfile.city || 'Fès');
  const [availability, setAvailability] = useState(providerProfile.availability || (isAr ? 'متاح للعمل' : 'Disponible'));
  const [isPublished, setIsPublished] = useState(providerProfile.isPublished || false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleCategory = (cat: ServiceCategory) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!professionalTitle.trim()) {
      setErrorMsg(isAr ? 'يرجى تحديد مهنتك أو تخصصك المهني.' : 'Veuillez spécifier votre titre professionnel ou spécialité.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg(isAr ? 'يرجى كتابة نبذة توضح مهاراتك وخبرتك.' : 'Veuillez rédiger une description de vos compétences.');
      return;
    }
    if (selectedCategories.length === 0) {
      setErrorMsg(isAr ? 'يرجى اختيار قسم خدمة واحد على الأقل.' : 'Veuillez sélectionner au moins une catégorie de service.');
      return;
    }

    setSaving(true);

    const skillsArray = skillsText
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const updated: ProviderProfileDoc = {
      ...providerProfile,
      professionalTitle: professionalTitle.trim(),
      description: description.trim(),
      categories: selectedCategories,
      skills: skillsArray,
      experience: experience.trim(),
      city,
      serviceArea: serviceArea.trim(),
      availability: availability.trim(),
      profileCompleted: true,
      isPublished: isPublished,
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'provider_profiles', providerProfile.userId), updated, { merge: true });
      onSaved(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'حدث خطأ أثناء حفظ الملف المهني.' : 'Erreur lors de la sauvegarde du profil professionnel.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-black text-[#0F2942] dark:text-white">
              {providerProfile.profileCompleted 
                ? (isAr ? 'تعديل ملفي المهني' : 'Modifier mon profil professionnel') 
                : (isAr ? 'إكمال الملف المهني للمزود' : 'Compléter mon profil prestataire')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr ? 'حدد مهاراتك لتظهر مباشرة للزبناء في مدينتك.' : 'Renseignez vos compétences pour être visible auprès des clients de votre ville.'}
            </p>
          </div>
          <button onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Fermer'} className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {isAr ? 'المسمى المهني / الحرفة *' : 'Titre professionnel / Métier *'}
            </label>
            <input
              type="text"
              value={professionalTitle}
              onChange={e => setProfessionalTitle(e.target.value)}
              placeholder={isAr ? "مثال: معلم سباك وتدفئة مركزية، مصمم كانفا، كهربائي منازل..." : "Ex: Maître Plombier & Chauffagiste certifié, Designer Canva, etc."}
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              {isAr ? 'أقسام الخدمات المقدمة *' : 'Catégories de prestations proposées *'}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {SERVICE_CATEGORIES.map(cat => {
                const isSelected = selectedCategories.includes(cat.name);
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => toggleCategory(cat.name)}
                    className={`p-2 rounded-xl text-left text-xs font-semibold border flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-[#2563EB] text-[#0F2942] dark:text-blue-200' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/70'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span className="truncate">{getCategoryTranslation(cat.name, language).name}</span>
                    {isSelected && <Check className={`w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400 shrink-0 ${isAr ? 'mr-auto' : 'ml-auto'}`} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {isAr ? 'نبذة عن خدماتك وخبرتك *' : 'Description de vos services et expérience *'}
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={isAr ? 'اذكر مسارك المهني، ضماناتك، معداتك وطريقة تعاملك...' : "Présentez votre parcours, vos garanties, votre matériel et vos méthodes de travail..."}
              rows={3}
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {isAr ? 'المدينة الرئيسية *' : 'Ville principale *'}
              </label>
              <select
                value={city}
                onChange={e => setCity(e.target.value as MoroccanCity)}
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none cursor-pointer"
              >
                {MOROCCAN_CITIES.map(c => (
                  <option key={c} value={c}>
                    {getCityTranslation(c, language)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {isAr ? 'منطقة التدخل بالأحياء' : "Zone d'intervention"}
              </label>
              <input
                type="text"
                value={serviceArea}
                onChange={e => setServiceArea(e.target.value)}
                placeholder={isAr ? "مثال: المدينة الجديدة، النرجس، الأطلس..." : "Ex: Fès Ville Nouvelle, Narjiss, Atlas..."}
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {isAr ? 'سنوات الخبرة' : "Années d'expérience"}
              </label>
              <input
                type="text"
                value={experience}
                onChange={e => setExperience(e.target.value)}
                placeholder={isAr ? "مثال: 5 سنوات، طالب سنة ثانية..." : "Ex: 5 ans, Étudiante 2e année..."}
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {isAr ? 'أوقات العمل والتفرغ' : 'Disponibilité'}
              </label>
              <input
                type="text"
                value={availability}
                onChange={e => setAvailability(e.target.value)}
                placeholder={isAr ? "مثال: 7/7 أيام، المساء وعطلة الأسبوع..." : "Ex: 7j/7, Soirées & Weekends..."}
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {isAr ? 'المهارات الرئيسية (مفصولة بفواصل)' : 'Compétences clés (séparées par des virgules)'}
            </label>
            <input
              type="text"
              value={skillsText}
              onChange={e => setSkillsText(e.target.value)}
              placeholder={isAr ? "مثال: كشف التسربات، سخان الماء، تجديد، كانفا برو..." : "Ex: Recherche de fuite, Chauffe-eau, Rénovation, Canva Pro..."}
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
            />
          </div>

          {/* Visibility toggle */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                {isAr ? 'نشر الملف المهني لعموم الزبناء' : 'Publier mon profil professionnel'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                {isPublished 
                  ? (isAr ? 'ملفك ظاهر ومتاح حالياً في نتائج البحث وتصفح الزبناء.' : 'Votre profil est actuellement visible dans les résultats de recherche.') 
                  : (isAr ? 'ملفك خاص ولن يظهر في نتائج البحث حتى تقوم بتفعيله.' : 'Votre profil est actuellement privé et n’apparaît pas dans la recherche.')}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={e => setIsPublished(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? 'جاري الحفظ...' : 'Enregistrement...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isAr ? 'حفظ الملف المهني' : 'Enregistrer mon profil'}</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
