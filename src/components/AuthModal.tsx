import React, { useState, useEffect, useRef } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { AccountType, MoroccanCity, UserDoc, ProviderProfileDoc } from '../types';
import { MOROCCAN_CITIES } from '../data/categories';
import { getCityTranslation } from '../data/translations';
import { WastaLogo } from './WastaLogo';
import { compressProfileImage } from '../utils/imageUpload';
import { 
  X, Mail, Lock, User, Phone, MapPin, Eye, EyeOff, 
  CheckCircle2, AlertCircle, Briefcase, Loader2,
  ExternalLink, Camera 
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'forgot';
  selectedAccountType?: AccountType;
  onSuccess: (userDoc: UserDoc, providerProfile?: ProviderProfileDoc | null) => void;
  onOpenAccountTypeSelect?: () => void;
  language?: 'fr' | 'ar';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  selectedAccountType = 'particulier',
  onSuccess,
  onOpenAccountTypeSelect,
  language = 'fr'
}) => {
  const isAr = language === 'ar';
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [accountType, setAccountType] = useState<AccountType>(selectedAccountType);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState<MoroccanCity>('Fès');
  const [profileImage, setProfileImage] = useState<string>('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // CRITICAL: Sync internal state whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setAccountType(selectedAccountType);
      setProfileImage('');
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsOperationNotAllowed(false);
    }
  }, [isOpen, initialMode, selectedAccountType]);

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg(null);
    setPhotoUploading(true);
    try {
      const compressed = await compressProfileImage(file);
      setProfileImage(compressed);
    } catch (err: any) {
      if (err?.message === 'INVALID_IMAGE_TYPE') {
        setErrorMsg(isAr ? 'يرجى اختيار ملف صورة صالح (JPG أو PNG).' : 'Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).');
      } else {
        setErrorMsg(isAr ? 'تعذر تحميل الصورة. يرجى تجربة صورة أخرى.' : "Impossible de traiter l'image. Veuillez en essayer une autre.");
      }
    } finally {
      setPhotoUploading(false);
    }
  };

  // Ensure error/success feedback is always visible on mobile screens
  useEffect(() => {
    if ((errorMsg || successMsg) && modalScrollRef.current) {
      modalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [errorMsg, successMsg]);

  if (!isOpen) return null;

  // Friendly error mapper for Firebase Auth
  const mapAuthError = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/operation-not-allowed') {
      setIsOperationNotAllowed(true);
      return isAr
        ? 'تسجيل الدخول بالبريد الإلكتروني غير مفعّل بعد في لوحة تحكم Firebase للمشروع (singular-vim-701dl). يمكنك تفعيله أو استخدام زر المتابعة مع Google أدناه.'
        : 'L’authentification par Email/Mot de passe n’est pas encore activée dans la console Firebase de votre projet (singular-vim-701dl). Activez-la dans la console Firebase ou utilisez la connexion Google ci-dessous.';
    }
    if (code === 'auth/unauthorized-domain') {
      return isAr
        ? 'هذا النطاق غير مصرح به بعد في Firebase Authentication. أضف النطاق الحالي في Firebase Console > Authentication > Settings > Authorized domains.'
        : 'Ce nom de domaine n’est pas encore autorisé dans Firebase Authentication. Ajoutez le domaine actuel dans Firebase Console > Authentication > Paramètres (Settings) > Domaines autorisés (Authorized domains).';
    }
    setIsOperationNotAllowed(false);
    switch (code) {
      case 'auth/email-already-in-use':
        return isAr
          ? 'هذا البريد الإلكتروني مسجل مسبقاً في Wasta No. يرجى تسجيل الدخول.'
          : 'Cette adresse email est déjà enregistrée sur Wasta No. Veuillez vous connecter.';
      case 'auth/invalid-email':
        return isAr ? 'عنوان البريد الإلكتروني المدخل غير صالح.' : 'L’adresse email saisie est invalide.';
      case 'auth/weak-password':
        return isAr ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' : 'Le mot de passe doit comporter au moins 6 caractères.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return isAr ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Email ou mot de passe incorrect.';
      case 'auth/too-many-requests':
        return isAr ? 'تم تسجيل محاولات كثيرة جداً. يرجى المحاولة لاحقاً.' : 'Trop de tentatives infructueuses. Veuillez réessayer plus tard.';
      case 'auth/popup-closed-by-user':
        return isAr ? 'تم إغلاق نافذة تسجيل الدخول عبر Google قبل الإتمام.' : 'La fenêtre de connexion Google a été fermée avant la fin.';
      case 'auth/popup-blocked':
        return isAr ? 'قام المتصفح بحظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.' : 'La fenêtre Google a été bloquée par votre navigateur. Veuillez autoriser les pop-ups.';
      default:
        return err?.message || (isAr ? 'حدث خطأ أثناء المصادقة.' : 'Une erreur est survenue lors de l’authentification.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsOperationNotAllowed(false);

    // Validation
    if (!fullName.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال اسمك الكامل.' : 'Veuillez renseigner votre nom complet.');
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg(isAr ? 'يرجى إدخال عنوان بريد إلكتروني صالح.' : 'Veuillez renseigner une adresse email valide.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg(isAr ? 'يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل.' : 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg(isAr ? 'كلمتا المرور غير متطابقتين.' : 'Les mots de passe ne correspondent pas.');
      return;
    }
    if (!acceptedTerms) {
      setErrorMsg(isAr ? 'يرجى الموافقة على الشروط والأحكام العامة لاستخدام Wasta No.' : 'Veuillez accepter les conditions générales d’utilisation de Wasta No.');
      return;
    }

    setLoading(true);

    try {
      // 1. Create real Firebase Auth account
      const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const uid = cred.user.uid;

      // 2. Prepare real Firestore user document
      const nowIso = new Date().toISOString();
      const normalizedEmail = trimmedEmail.toLowerCase();
      const isAdminEmail = normalizedEmail === 'dkhissiabdelamine@gmail.com';

      const userDoc: UserDoc = {
        uid,
        fullName: fullName.trim(),
        email: normalizedEmail,
        phone: phone.trim() ? (phone.startsWith('+212') ? phone.trim() : `+212 ${phone.trim().replace(/^0/, '')}`) : '',
        city,
        accountType,
        profileImage: profileImage || '',
        accountStatus: 'active',
        role: isAdminEmail ? 'admin' : 'user',
        createdAt: nowIso,
        updatedAt: nowIso
      };

      try {
        await setDoc(doc(db, 'users', uid), userDoc);
      } catch (fsErr) {
        handleFirestoreError(fsErr, OperationType.CREATE, `users/${uid}`);
      }

      // 3. If Prestataire, initialize their provider_profile
      let createdProviderProfile: ProviderProfileDoc | null = null;
      if (accountType === 'prestataire') {
        const providerProfileDoc: ProviderProfileDoc = {
          userId: uid,
          fullName: fullName.trim(),
          professionalTitle: '',
          description: '',
          categories: [],
          skills: [],
          experience: '',
          city,
          serviceArea: city,
          availability: 'Disponible',
          profileCompleted: false,
          isPublished: false,
          isVerified: false,
          rating: 5.0,
          reviewCount: 0,
          profileImage: profileImage || '',
          createdAt: nowIso,
          updatedAt: nowIso
        };
        try {
          await setDoc(doc(db, 'provider_profiles', uid), providerProfileDoc);
          createdProviderProfile = providerProfileDoc;
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.CREATE, `provider_profiles/${uid}`);
        }
      }

      // If admin email, also register in admins collection
      if (isAdminEmail) {
        try {
          await setDoc(doc(db, 'admins', uid), {
            email: normalizedEmail,
            role: 'admin',
            createdAt: nowIso
          });
        } catch (fsErr) {
          console.warn('Admin doc write skipped:', fsErr);
        }
      }

      setSuccessMsg(
        isAr
          ? (accountType === 'prestataire' ? 'تم إنشاء حساب المهني بنجاح ! مرحباً بك في Wasta No.' : 'تم إنشاء حسابك بنجاح ! مرحباً بك في Wasta No.')
          : (accountType === 'prestataire' ? 'Compte Prestataire créé avec succès ! Bienvenue sur Wasta No.' : 'Compte créé avec succès ! Bienvenue sur Wasta No.')
      );
      setTimeout(() => {
        onSuccess(userDoc, createdProviderProfile);
        onClose();
      }, 600);

    } catch (err: any) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsOperationNotAllowed(false);

    if (!email.trim() || !password) {
      setErrorMsg(isAr ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور.' : 'Veuillez renseigner votre email et mot de passe.');
      return;
    }

    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;

      // Fetch user profile from Firestore
      const userSnap = await getDoc(doc(db, 'users', uid));

      if (userSnap.exists()) {
        const data = userSnap.data() as UserDoc;
        if (data.accountStatus === 'suspended') {
          setErrorMsg(isAr ? 'تم تعليق حسابك من طرف إدارة Wasta No.' : 'Votre compte a été suspendu par l’administration Wasta No.');
          await auth.signOut();
          setLoading(false);
          return;
        }
        let loadedProvider: ProviderProfileDoc | null = null;
        if (data.accountType === 'prestataire') {
          const pSnap = await getDoc(doc(db, 'provider_profiles', uid));
          if (pSnap.exists()) {
            loadedProvider = pSnap.data() as ProviderProfileDoc;
          }
        }
        setSuccessMsg(isAr ? `أهلاً بعودتك، ${data.fullName} !` : `Ravi de vous revoir, ${data.fullName} !`);
        setTimeout(() => {
          onSuccess(data, loadedProvider);
          onClose();
        }, 500);
      } else {
        // Fallback create user document if account exists in Auth but missing in DB
        const nowIso = new Date().toISOString();
        const normalizedEmail = email.trim().toLowerCase();
        const isAdmin = normalizedEmail === 'dkhissiabdelamine@gmail.com';
        const fallbackDoc: UserDoc = {
          uid,
          fullName: cred.user.displayName || email.split('@')[0],
          email: normalizedEmail,
          city: 'Fès',
          accountType: accountType || 'particulier',
          accountStatus: 'active',
          role: isAdmin ? 'admin' : 'user',
          createdAt: nowIso,
          updatedAt: nowIso
        };
        await setDoc(doc(db, 'users', uid), fallbackDoc);
        onSuccess(fallbackDoc, null);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg(isAr ? 'يرجى إدخال عنوان بريد إلكتروني صالح.' : 'Veuillez renseigner une adresse email valide.');
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMsg(
        isAr
          ? 'تم إرسال رابط آمن لإعادة تعيين كلمة المرور إلى بريدك الإلكتروني.'
          : 'Un email de réinitialisation sécurisé a été envoyé à votre adresse.'
      );
    } catch (err: any) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsOperationNotAllowed(false);
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const uid = cred.user.uid;
      const userEmail = cred.user.email || '';
      const userName = cred.user.displayName || userEmail.split('@')[0] || (isAr ? 'مستخدم' : 'Utilisateur');

      const userSnap = await getDoc(doc(db, 'users', uid));
      if (userSnap.exists()) {
        const data = userSnap.data() as UserDoc;
        if (data.accountStatus === 'suspended') {
          setErrorMsg(isAr ? 'تم تعليق حسابك من طرف إدارة Wasta No.' : 'Votre compte a été suspendu par l’administration Wasta No.');
          await auth.signOut();
          setGoogleLoading(false);
          return;
        }
        let loadedProvider: ProviderProfileDoc | null = null;
        if (data.accountType === 'prestataire') {
          const pSnap = await getDoc(doc(db, 'provider_profiles', uid));
          if (pSnap.exists()) {
            loadedProvider = pSnap.data() as ProviderProfileDoc;
          }
        }
        setSuccessMsg(isAr ? `أهلاً بعودتك، ${data.fullName} !` : `Ravi de vous revoir, ${data.fullName} !`);
        setTimeout(() => {
          onSuccess(data, loadedProvider);
          onClose();
        }, 500);
      } else {
        const nowIso = new Date().toISOString();
        const normalizedEmail = userEmail.toLowerCase();
        const isAdmin = normalizedEmail === 'dkhissiabdelamine@gmail.com';
        const effectiveType: AccountType = accountType || 'particulier';
        const newUserDoc: UserDoc = {
          uid,
          fullName: userName,
          email: normalizedEmail,
          city: 'Fès',
          accountType: effectiveType,
          profileImage: profileImage || cred.user.photoURL || '',
          accountStatus: 'active',
          role: isAdmin ? 'admin' : 'user',
          createdAt: nowIso,
          updatedAt: nowIso
        };
        try {
          await setDoc(doc(db, 'users', uid), newUserDoc);
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.CREATE, `users/${uid}`);
        }

        let createdProviderProfile: ProviderProfileDoc | null = null;
        if (effectiveType === 'prestataire') {
          const providerProfileDoc: ProviderProfileDoc = {
            userId: uid,
            fullName: userName,
            professionalTitle: '',
            description: '',
            categories: [],
            skills: [],
            experience: '',
            city: 'Fès',
            serviceArea: 'Fès',
            availability: 'Disponible',
            profileCompleted: false,
            isPublished: false,
            isVerified: false,
            rating: 5.0,
            reviewCount: 0,
            profileImage: profileImage || cred.user.photoURL || '',
            createdAt: nowIso,
            updatedAt: nowIso
          };
          try {
            await setDoc(doc(db, 'provider_profiles', uid), providerProfileDoc);
            createdProviderProfile = providerProfileDoc;
          } catch (fsErr) {
            handleFirestoreError(fsErr, OperationType.CREATE, `provider_profiles/${uid}`);
          }
        }

        if (isAdmin) {
          try {
            await setDoc(doc(db, 'admins', uid), {
              email: normalizedEmail,
              role: 'admin',
              createdAt: nowIso
            });
          } catch (fsErr) {
            console.warn('Admin doc write skipped:', fsErr);
          }
        }

        setSuccessMsg(
          isAr
            ? 'تم إنشاء الحساب عبر Google بنجاح ! مرحباً بك في Wasta No.'
            : 'Compte créé avec Google ! Bienvenue sur Wasta No.'
        );
        setTimeout(() => {
          onSuccess(newUserDoc, createdProviderProfile);
          onClose();
        }, 500);
      }
    } catch (err: any) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn" dir={isAr ? 'rtl' : 'ltr'}>
      <div ref={modalScrollRef} className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-100">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <WastaLogo size="sm" showSlogan={false} language={language} />
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label={isAr ? "إغلاق" : "Fermer"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        {mode !== 'forgot' ? (
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); setIsOperationNotAllowed(false); }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'login' ? 'bg-white text-[#0F2942] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAr ? 'تسجيل الدخول' : 'Se connecter'}
            </button>
            <button
              onClick={() => { setMode('signup'); setErrorMsg(null); setSuccessMsg(null); setIsOperationNotAllowed(false); }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'signup' ? 'bg-white text-[#0F2942] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAr ? 'إنشاء حساب جديد' : 'Créer un compte'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              {isAr ? 'استرجاع كلمة المرور' : 'Mot de passe oublié'}
            </h3>
            <button 
              onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); setIsOperationNotAllowed(false); }}
              className="text-xs text-[#2563EB] font-bold hover:underline cursor-pointer"
            >
              {isAr ? 'العودة لتسجيل الدخول' : 'Retour à la connexion'}
            </button>
          </div>
        )}

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>

            {/* If operation-not-allowed, show step-by-step guidance */}
            {isOperationNotAllowed && (
              <div className="mt-1 pt-2 border-t border-rose-200 text-[11px] text-slate-700 bg-white/80 p-2.5 rounded-lg space-y-1.5">
                <span className="font-bold text-slate-900 block">
                  {isAr ? 'تفعيل البريد الإلكتروني في Firebase :' : 'Comment activer Email/Mot de passe dans Firebase :'}
                </span>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>
                    {isAr 
                      ? <>افتح لوحة تحكم Firebase للمشروع <b className="text-slate-800 font-mono">singular-vim-701dl</b>.</>
                      : <>Ouvrez la console Firebase du projet <b className="text-slate-800 font-mono">singular-vim-701dl</b>.</>}
                  </li>
                  <li>
                    {isAr
                      ? <>انتقل إلى <b>Authentication</b> ثم تبويب <b>Sign-in method</b>.</>
                      : <>Allez dans <b>Authentication</b> &gt; onglet <b>Sign-in method</b>.</>}
                  </li>
                  <li>
                    {isAr
                      ? <>اضغط على <b>Email/Password</b> &gt; حدد <b>تمكين</b> &gt; <b>حفظ</b>.</>
                      : <>Cliquez sur <b>Adresse e-mail/Mot de passe</b> &gt; cochez <b>Activer</b> &gt; <b>Enregistrer</b>.</>}
                  </li>
                </ol>
                <div className="pt-1">
                  <a
                    href="https://console.firebase.google.com/project/singular-vim-701dl/authentication/providers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#2563EB] font-bold hover:underline text-xs"
                  >
                    <span>{isAr ? 'فتح صفحة المصادقة في Firebase' : 'Ouvrir la page Authentication Firebase'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-snug font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Google Sign-in CTA (Active by default with Firebase!) */}
        {mode !== 'forgot' && (
          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                  <span>{isAr ? 'جاري الاتصال بـ Google...' : 'Connexion Google en cours...'}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{isAr ? 'المتابعة باستخدام Google' : 'Continuer avec Google'}</span>
                </>
              )}
            </button>

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-slate-200"></div>
              <span className="absolute bg-white px-2 text-[10px] uppercase font-bold text-slate-400">
                {isAr ? 'أو عبر البريد الإلكتروني' : 'ou avec email'}
              </span>
            </div>
          </div>
        )}

        {/* ----------------- LOGIN FORM ----------------- */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} noValidate className="space-y-3.5 pt-1">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {isAr ? 'البريد الإلكتروني' : 'Adresse Email'}
              </label>
              <div className="relative">
                <Mail className={`w-4 h-4 text-slate-400 absolute ${isAr ? 'right-3' : 'left-3'} top-3`} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={isAr ? "barid@mithal.ma" : "votre.email@exemple.ma"}
                  className={`w-full text-xs ${isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'} py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]`}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">
                  {isAr ? 'كلمة المرور' : 'Mot de passe'}
                </label>
                <button 
                  type="button" 
                  onClick={() => { setMode('forgot'); setErrorMsg(null); setSuccessMsg(null); }}
                  className="text-[11px] text-[#2563EB] font-bold hover:underline cursor-pointer"
                >
                  {isAr ? 'نسيت كلمة المرور؟' : 'Mot de passe oublié ?'}
                </button>
              </div>
              <div className="relative">
                <Lock className={`w-4 h-4 text-slate-400 absolute ${isAr ? 'right-3' : 'left-3'} top-3`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full text-xs ${isAr ? 'pr-9 pl-10 text-right' : 'pl-9 pr-10 text-left'} py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute ${isAr ? 'left-3' : 'right-3'} top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0F2942] hover:bg-[#1E3A8A] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? 'جاري تسجيل الدخول...' : 'Connexion en cours...'}</span>
                </>
              ) : (
                <span>{isAr ? 'تسجيل الدخول' : 'Se connecter'}</span>
              )}
            </button>

            <div className="text-center pt-2">
              <p className="text-xs text-slate-500">
                {isAr ? 'ليس لديك حساب بعد؟ ' : "Vous n'avez pas encore de compte ? "}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenAccountTypeSelect) {
                      onOpenAccountTypeSelect();
                    } else {
                      setMode('signup');
                    }
                  }}
                  className="font-bold text-[#2563EB] hover:underline cursor-pointer"
                >
                  {isAr ? 'إنشاء حساب جديد' : 'Créer un compte'}
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ----------------- SIGN UP FORM ----------------- */}
        {mode === 'signup' && (
          <form onSubmit={handleRegister} noValidate className="space-y-3 pt-1">
            {/* Interactive Account Type Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">
                  {isAr ? 'اختر نوع الحساب' : 'Type de compte'}
                </span>
                {onOpenAccountTypeSelect && (
                  <button
                    type="button"
                    onClick={onOpenAccountTypeSelect}
                    className="text-[11px] font-bold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    {isAr ? 'عرض التفاصيل' : 'Changer'}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAccountType('particulier')}
                  className={`p-2.5 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    accountType === 'particulier'
                      ? 'bg-blue-50 border-[#2563EB] text-[#0F2942] shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <User className={`w-3.5 h-3.5 ${accountType === 'particulier' ? 'text-[#2563EB]' : 'text-slate-400'}`} />
                  <span>{isAr ? 'زبون' : 'Particulier'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('prestataire')}
                  className={`p-2.5 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    accountType === 'prestataire'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Briefcase className={`w-3.5 h-3.5 ${accountType === 'prestataire' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{isAr ? 'مقدم خدمات' : 'Prestataire'}</span>
                </button>
              </div>
            </div>

            {/* Profile Photo Upload */}
            <div className="flex flex-col items-center justify-center py-2 bg-slate-50/70 rounded-2xl border border-slate-200/80">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelected}
                className="hidden"
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploading}
                  className="w-20 h-20 rounded-full bg-white border-2 border-dashed border-slate-300 hover:border-[#2563EB] flex items-center justify-center overflow-hidden shadow-sm transition-all cursor-pointer group"
                  aria-label={isAr ? 'إضافة صورة شخصية' : 'Ajouter une photo de profil'}
                >
                  {photoUploading ? (
                    <Loader2 className="w-6 h-6 text-[#2563EB] animate-spin" />
                  ) : profileImage ? (
                    <img
                      src={profileImage}
                      alt={fullName || 'Profil'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400 group-hover:text-[#2563EB] transition-colors">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                </button>
                {profileImage ? (
                  <button
                    type="button"
                    onClick={() => setProfileImage('')}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow cursor-pointer"
                    title={isAr ? 'إزالة الصورة' : 'Supprimer la photo'}
                    aria-label={isAr ? 'إزالة الصورة' : 'Supprimer la photo'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white flex items-center justify-center shadow-md border-2 border-white cursor-pointer"
                    aria-label={isAr ? 'اختيار صورة' : 'Choisir une photo'}
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="mt-1.5 text-[11px] font-bold text-[#2563EB] hover:underline cursor-pointer"
              >
                {profileImage
                  ? (isAr ? 'تغيير الصورة الشخصية' : 'Changer la photo de profil')
                  : (isAr ? 'إضافة صورة شخصية (اختياري)' : 'Ajouter une photo de profil (Optionnel)')}
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {isAr ? 'الاسم الكامل' : 'Nom complet'}
              </label>
              <div className="relative">
                <User className={`w-4 h-4 text-slate-400 absolute ${isAr ? 'right-3' : 'left-3'} top-3`} />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder={isAr ? "مثال: عمر برادة" : "Ex: Omar Berrada"}
                  className={`w-full text-xs ${isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'} py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]`}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {isAr ? 'البريد الإلكتروني' : 'Adresse Email'}
              </label>
              <div className="relative">
                <Mail className={`w-4 h-4 text-slate-400 absolute ${isAr ? 'right-3' : 'left-3'} top-3`} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={isAr ? "barid@mithal.ma" : "votre.email@exemple.ma"}
                  className={`w-full text-xs ${isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'} py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]`}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {isAr ? 'الهاتف (اختياري)' : 'Téléphone (Optionnel)'}
                </label>
                <div className="relative">
                  <Phone className={`w-3.5 h-3.5 text-slate-400 absolute ${isAr ? 'right-2.5' : 'left-2.5'} top-3`} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="06 12 34 56 78"
                    className={`w-full text-xs ${isAr ? 'pr-8 pl-2.5 text-right' : 'pl-8 pr-2.5 text-left'} py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {isAr ? 'المدينة' : 'Ville'}
                </label>
                <div className="relative">
                  <MapPin className={`w-3.5 h-3.5 text-slate-400 absolute ${isAr ? 'right-2.5' : 'left-2.5'} top-3`} />
                  <select
                    value={city}
                    onChange={e => setCity(e.target.value as MoroccanCity)}
                    className={`w-full text-xs ${isAr ? 'pr-8 pl-2 text-right' : 'pl-8 pr-2 text-left'} py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium`}
                  >
                    {MOROCCAN_CITIES.map(c => (
                      <option key={c} value={c}>{getCityTranslation(c, language)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {isAr ? 'كلمة المرور' : 'Mot de passe'}
              </label>
              <div className="relative">
                <Lock className={`w-4 h-4 text-slate-400 absolute ${isAr ? 'right-3' : 'left-3'} top-3`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isAr ? "6 أحرف على الأقل" : "Au moins 6 caractères"}
                  className={`w-full text-xs ${isAr ? 'pr-9 pl-10 text-right' : 'pl-9 pr-10 text-left'} py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute ${isAr ? 'left-3' : 'right-3'} top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {isAr ? 'تأكيد كلمة المرور' : 'Confirmer le mot de passe'}
              </label>
              <div className="relative">
                <Lock className={`w-4 h-4 text-slate-400 absolute ${isAr ? 'right-3' : 'left-3'} top-3`} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={isAr ? "أعد إدخال كلمة المرور" : "Répétez le mot de passe"}
                  className={`w-full text-xs ${isAr ? 'pr-9 pl-10 text-right' : 'pl-9 pr-10 text-left'} py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute ${isAr ? 'left-3' : 'right-3'} top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer`}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={e => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 rounded text-[#2563EB] focus:ring-0 cursor-pointer"
                required
              />
              <label htmlFor="terms" className="text-[11px] text-slate-600 leading-tight cursor-pointer">
                {isAr 
                  ? 'أوافق على الشروط والأحكام العامة وسياسة الخصوصية لمنصة واسطة لا المغرب.'
                  : "J'accepte les conditions générales d'utilisation et la politique de confidentialité de Wasta No Maroc."}
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                accountType === 'prestataire' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#0F2942] hover:bg-[#1E3A8A]'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? 'جاري إنشاء الحساب...' : 'Création du compte...'}</span>
                </>
              ) : (
                <span>
                  {isAr 
                    ? `إنشاء حساب ${accountType === 'prestataire' ? 'مهني' : 'زبون'}`
                    : `Créer mon compte ${accountType === 'prestataire' ? 'Prestataire' : 'Particulier'}`}
                </span>
              )}
            </button>

            <div className="text-center pt-1">
              <p className="text-xs text-slate-500">
                {isAr ? 'هل لديك حساب بالفعل؟ ' : 'Vous avez déjà un compte ? '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
                  className="font-bold text-[#2563EB] hover:underline cursor-pointer"
                >
                  {isAr ? 'تسجيل الدخول' : 'Se connecter'}
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ----------------- FORGOT PASSWORD ----------------- */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} noValidate className="space-y-3.5 pt-1">
            <p className="text-xs text-slate-600 leading-relaxed">
              {isAr
                ? 'أدخل عنوان بريدك الإلكتروني المسجل في واسطة لا. ستتلقى رابطاً آمناً لإعادة تعيين كلمة المرور.'
                : 'Saisissez l\'adresse email associée à votre compte Wasta No. Vous recevrez un lien pour réinitialiser votre mot de passe en toute sécurité.'}
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {isAr ? 'البريد الإلكتروني' : 'Adresse Email'}
              </label>
              <div className="relative">
                <Mail className={`w-4 h-4 text-slate-400 absolute ${isAr ? 'right-3' : 'left-3'} top-3`} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={isAr ? "barid@mithal.ma" : "votre.email@exemple.ma"}
                  className={`w-full text-xs ${isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'} py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0F2942] hover:bg-[#1E3A8A] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? 'جاري الإرسال...' : 'Envoi en cours...'}</span>
                </>
              ) : (
                <span>{isAr ? 'إرسال رابط استرجاع كلمة المرور' : 'Envoyer le lien de réinitialisation'}</span>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
