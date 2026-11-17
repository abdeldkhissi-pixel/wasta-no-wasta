import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';
import { auth, db, testConnection, handleFirestoreError, OperationType } from './firebase';

import { 
  UserDoc, 
  ProviderProfileDoc, 
  ServiceDoc, 
  ServiceRequestDoc, 
  ProposalDoc, 
  ConversationDoc, 
  MessageDoc, 
  ReviewDoc, 
  CommentDoc,
  AccountType, 
  MoroccanCity, 
  ServiceCategory 
} from './types';
import { SERVICE_CATEGORIES, MOROCCAN_CITIES } from './data/categories';
import { t, getCategoryTranslation, getCityTranslation } from './data/translations';

import { WastaLogo } from './components/WastaLogo';
import { SplashScreen } from './components/SplashScreen';
import { OnboardingModal } from './components/OnboardingModal';
import { AccountTypeSelectModal } from './components/AccountTypeSelectModal';
import { AuthModal } from './components/AuthModal';
import { PrestataireProfileEditorModal } from './components/PrestataireProfileEditorModal';
import { AdminDashboard } from './components/AdminDashboard';
import { compressProfileImage } from './utils/imageUpload';

import { 
  Search, MapPin, Star, ShieldCheck, PlusCircle, MessageSquare, 
  User, Home, ArrowLeft, Send, CheckCircle2, XCircle, Clock, 
  Briefcase, GraduationCap, Users, Filter, ChevronRight, AlertTriangle,
  SlidersHorizontal, Phone, Check, RefreshCw, Bell, BellRing, Globe, Sparkles,
  Lock, LogOut, Edit3, CheckCircle, Shield, AlertCircle, Loader2,
  Eye, FileText, Pencil, Trash2, X, Camera, Mic, Paperclip, Video, Heart, Map, PhoneCall, Play, Square,
  Wrench, Palette, Laptop, Truck, Zap, Sun, Moon
} from 'lucide-react';

export default function App() {
  // App Lifecycle States
  const [showSplash, setShowSplash] = useState(true);
  const [splashFinished, setSplashFinished] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAccountTypeSelect, setShowAccountTypeSelect] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType>('particulier');
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  // Authentication & Active User State
  const [currentUser, setCurrentUser] = useState<UserDoc | null>(null);
  const [providerProfile, setProviderProfile] = useState<ProviderProfileDoc | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Real-time Firestore Collections
  const [services, setServices] = useState<ServiceDoc[]>([]);
  const [requests, setRequests] = useState<ServiceRequestDoc[]>([]);
  const [proposals, setProposals] = useState<ProposalDoc[]>([]);
  const [conversations, setConversations] = useState<ConversationDoc[]>([]);
  const [reviews, setReviews] = useState<ReviewDoc[]>([]);
  const [comments, setComments] = useState<CommentDoc[]>([]);

  // Navigation, Theme & Localization
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'publish' | 'messages' | 'profile'>('home');
  const [discoveryTab, setDiscoveryTab] = useState<'services' | 'requests'>('services');
  const [selectedCity, setSelectedCity] = useState<MoroccanCity>('Fès');
  const [language, setLanguage] = useState<'fr' | 'ar'>('fr');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('wasta_theme') === 'dark') {
      return 'dark';
    }
    return 'light';
  });

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(2500);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sortBy, setSortBy] = useState<'relevant' | 'rating' | 'priceAsc' | 'recent'>('relevant');

  // Active Overlays
  const [activeDetailProvider, setActiveDetailProvider] = useState<ProviderProfileDoc | null>(null);
  const [activeRequestDetail, setActiveRequestDetail] = useState<ServiceRequestDoc | null>(null);
  const [activeServiceDetail, setActiveServiceDetail] = useState<ServiceDoc | null>(null);
  const [activeChatConv, setActiveChatConv] = useState<ConversationDoc | null>(null);
  const [chatMessages, setChatMessages] = useState<MessageDoc[]>([]);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishMode, setPublishMode] = useState<'service' | 'request'>('service');
  const [reviewModalTarget, setReviewModalTarget] = useState<ProviderProfileDoc | null>(null);

  // Toast & Message Notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [incomingNotif, setIncomingNotif] = useState<{ conv: ConversationDoc; senderName: string; preview: string } | null>(null);
  const [notifPermission, setNotifPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  const activeChatConvRef = useRef<ConversationDoc | null>(null);
  const languageRef = useRef<'fr' | 'ar'>('fr');
  const prevConvMapRef = useRef<Record<string, { updatedAt: string; lastMessageId?: string }>>({});
  const initialConvsLoadedRef = useRef(false);

  useEffect(() => {
    activeChatConvRef.current = activeChatConv;
  }, [activeChatConv]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3600);
  };

  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(784, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio playback blocked by browser autoplay policy; ignore silently
    }
  };

  const handleRequestNotifPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifPermission('unsupported');
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setNotifPermission(res);
      if (res === 'granted') {
        showToast(
          language === 'ar'
            ? 'تم تفعيل إشعارات الرسائل الفورية بنجاح!'
            : 'Notifications de messages activées !'
        );
      }
    } catch {
      // Ignore permission prompt errors
    }
  };

  const openConversation = async (conv: ConversationDoc) => {
    setActiveChatConv(conv);
    setIncomingNotif(null);
    if (currentUser && (conv.unreadCounts?.[currentUser.uid] || 0) > 0) {
      try {
        await updateDoc(doc(db, 'conversations', conv.conversationId), {
          [`unreadCounts.${currentUser.uid}`]: 0
        });
      } catch (err) {
        console.warn('Could not clear unread count:', err);
      }
    }
  };

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('wasta_theme', theme);
  }, [theme]);

  // Test Firestore Connection on Boot
  useEffect(() => {
    testConnection();
  }, []);

  // 1. Listen to Real Firebase Auth State (persisted until explicit logout)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      if (firebaseUser) {
        localStorage.setItem('wasta_onboarding_done', 'true');
        setShowAccountTypeSelect(false);
        try {
          let userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (!userSnap.exists()) {
            // Registration in AuthModal may still be writing users/{uid}; wait briefly and retry
            await new Promise(resolve => setTimeout(resolve, 900));
            userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
          }

          if (userSnap.exists()) {
            const uData = userSnap.data() as UserDoc;
            setCurrentUser(uData);
            setSelectedCity(uData.city || 'Fès');

            if (uData.accountType === 'prestataire') {
              const pSnap = await getDoc(doc(db, 'provider_profiles', firebaseUser.uid));
              if (pSnap.exists()) {
                setProviderProfile(pSnap.data() as ProviderProfileDoc);
              }
            } else {
              setProviderProfile(null);
            }
          } else {
            // Fallback only if user document does not exist after retry
            setCurrentUser({
              uid: firebaseUser.uid,
              fullName: firebaseUser.displayName || 'Utilisateur',
              email: firebaseUser.email || '',
              city: 'Fès',
              accountType: 'particulier',
              accountStatus: 'active',
              role: firebaseUser.email === 'dkhissiabdelamine@gmail.com' ? 'admin' : 'user',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error('Error fetching authenticated user document:', err);
        }
      } else {
        setCurrentUser(null);
        setProviderProfile(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore Subscriptions for Services and Requests
  useEffect(() => {
    // Services listener
    const unsubServices = onSnapshot(collection(db, 'services'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ ...d.data() } as ServiceDoc));
      setServices(list);
    }, (err) => {
      console.warn('Services snapshot:', err);
    });

    // Service Requests listener
    const unsubRequests = onSnapshot(collection(db, 'service_requests'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ ...d.data() } as ServiceRequestDoc));
      setRequests(list);
    }, (err) => {
      console.warn('Requests snapshot:', err);
    });

    // Reviews listener
    const unsubReviews = onSnapshot(collection(db, 'reviews'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ ...d.data() } as ReviewDoc));
      setReviews(list);
    }, (err) => {
      console.warn('Reviews snapshot:', err);
    });

    // Comments listener
    const unsubComments = onSnapshot(collection(db, 'comments'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ ...d.data() } as CommentDoc));
      setComments(list);
    }, (err) => {
      console.warn('Comments snapshot:', err);
    });

    return () => {
      unsubServices();
      unsubRequests();
      unsubReviews();
      unsubComments();
    };
  }, []);

  // 3. User-specific real-time subscriptions (proposals & conversations + message notifications)
  useEffect(() => {
    if (!currentUser) {
      setProposals([]);
      setConversations([]);
      prevConvMapRef.current = {};
      initialConvsLoadedRef.current = false;
      return;
    }

    // Proposals where current user is client or provider
    const unsubProposals = onSnapshot(collection(db, 'proposals'), (snapshot) => {
      const allProps = snapshot.docs.map(d => ({ ...d.data() } as ProposalDoc));
      const relevant = allProps.filter(p => p.clientId === currentUser.uid || p.providerId === currentUser.uid);
      setProposals(relevant);
    }, (err) => {
      console.warn('Proposals snapshot:', err);
    });

    // Conversations where current user is participant (scoped query for Firestore rules)
    const convsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid)
    );
    const unsubConversations = onSnapshot(convsQuery, (snapshot) => {
      const myConvs = snapshot.docs
        .map(d => ({ ...d.data() } as ConversationDoc))
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

      if (initialConvsLoadedRef.current) {
        myConvs.forEach(conv => {
          const prev = prevConvMapRef.current[conv.conversationId];
          const hasChanged = !prev ||
            prev.updatedAt !== conv.updatedAt ||
            (conv.lastMessageId && prev.lastMessageId !== conv.lastMessageId);

          const isFromOther = Boolean(conv.lastSenderId && conv.lastSenderId !== currentUser.uid);
          const isCurrentlyOpen = activeChatConvRef.current?.conversationId === conv.conversationId;

          if (hasChanged && isFromOther && !isCurrentlyOpen) {
            const otherId = conv.participants?.find(p => p !== currentUser.uid);
            const senderName = conv.participantNames?.[otherId || ''] || 'Wasta No';
            const preview = conv.lastMessage || (languageRef.current === 'ar' ? 'رسالة جديدة' : 'Nouveau message');

            setIncomingNotif({ conv, senderName, preview });
            playNotificationSound();

            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                const sysNotif = new Notification(
                  languageRef.current === 'ar' ? `رسالة جديدة من ${senderName}` : `Nouveau message de ${senderName}`,
                  { body: preview, icon: '/pwa-192x192.png' }
                );
                sysNotif.onclick = () => {
                  window.focus();
                  openConversation(conv);
                  sysNotif.close();
                };
              } catch {
                // Ignore browser notification errors in restricted iframes/webviews
              }
            }
          }
        });
      }

      const nextMap: Record<string, { updatedAt: string; lastMessageId?: string }> = {};
      myConvs.forEach(c => {
        nextMap[c.conversationId] = { updatedAt: c.updatedAt, lastMessageId: c.lastMessageId };
      });
      prevConvMapRef.current = nextMap;
      initialConvsLoadedRef.current = true;

      setConversations(myConvs);
    }, (err) => {
      console.warn('Conversations snapshot:', err);
    });

    return () => {
      unsubProposals();
      unsubConversations();
    };
  }, [currentUser]);

  // 4. Live Chat Messages Subcollection Listener
  useEffect(() => {
    if (!activeChatConv) {
      setChatMessages([]);
      return;
    }

    const convId = activeChatConv.conversationId;
    const unsubMessages = onSnapshot(
      collection(db, 'conversations', convId, 'messages'),
      (snapshot) => {
        const msgs = snapshot.docs.map(d => ({ ...d.data() } as MessageDoc));
        msgs.sort((a, b) => (a.createdAtIso || a.createdAt || '').localeCompare(b.createdAtIso || b.createdAt || ''));
        setChatMessages(msgs);

        // Automatically mark incoming unread messages as read while chat is open
        if (currentUser) {
          const unreadIncoming = msgs.filter(m => m.senderId !== currentUser.uid && !m.readStatus);
          if (unreadIncoming.length > 0) {
            unreadIncoming.forEach(m => {
              updateDoc(doc(db, 'conversations', convId, 'messages', m.messageId), {
                readStatus: true
              }).catch(() => {});
            });
            updateDoc(doc(db, 'conversations', convId), {
              [`unreadCounts.${currentUser.uid}`]: 0
            }).catch(() => {});
          }
        }
      },
      (err) => {
        console.warn('Messages snapshot:', err);
      }
    );

    return () => unsubMessages();
  }, [activeChatConv, currentUser]);

  // Handle Splash Screen finish
  const handleFinishSplash = () => {
    setShowSplash(false);
    setSplashFinished(true);
  };

  // Only show first-time onboarding after auth state is resolved and no user is signed in
  useEffect(() => {
    if (!splashFinished || authLoading) return;
    if (currentUser || auth.currentUser) {
      setShowOnboarding(false);
      setShowAccountTypeSelect(false);
      return;
    }
    const hasSeenOnboarding = localStorage.getItem('wasta_onboarding_done');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, [splashFinished, authLoading, currentUser]);

  // Handle Onboarding finish -> prompt account type selection only if still signed out
  const handleFinishOnboarding = () => {
    localStorage.setItem('wasta_onboarding_done', 'true');
    setShowOnboarding(false);
    if (!authLoading && !auth.currentUser && !currentUser) {
      setShowAccountTypeSelect(true);
    }
  };

  // Handle Account Type selected -> Open Register
  const handleSelectAccountType = (type: AccountType) => {
    setSelectedAccountType(type);
    setShowAccountTypeSelect(false);
    setAuthModalMode('signup');
    setShowAuthModal(true);
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setProviderProfile(null);
      showToast(language === 'ar' ? 'تم تسجيل الخروج بنجاح.' : 'Vous avez été déconnecté avec succès.', 'info');
      setActiveTab('home');
    } catch (err: any) {
      showToast(err.message || (language === 'ar' ? 'خطأ أثناء تسجيل الخروج.' : 'Erreur lors de la déconnexion.'), 'error');
    }
  };

  // Toggle Like Service
  const handleToggleLikeService = async (serviceId: string, likedBy: string[] = []) => {
    if (!currentUser) {
      setAuthModalMode('login');
      setShowAuthModal(true);
      showToast(language === 'ar' ? 'سجّل دخولك للإعجاب بالخدمات.' : 'Connectez-vous pour aimer les services.', 'info');
      return;
    }
    try {
      const isLiked = likedBy.includes(currentUser.uid);
      const updatedLikedBy = isLiked ? likedBy.filter(id => id !== currentUser.uid) : [...likedBy, currentUser.uid];
      const newCount = updatedLikedBy.length;
      await updateDoc(doc(db, 'services', serviceId), {
        likedBy: updatedLikedBy,
        likesCount: newCount
      });
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du like.', 'error');
    }
  };

  // Toggle Like Request
  const handleToggleLikeRequest = async (requestId: string, likedBy: string[] = []) => {
    if (!currentUser) {
      setAuthModalMode('login');
      setShowAuthModal(true);
      showToast(language === 'ar' ? 'سجّل دخولك للإعجاب بالطلبات.' : 'Connectez-vous pour aimer les demandes.', 'info');
      return;
    }
    try {
      const isLiked = likedBy.includes(currentUser.uid);
      const updatedLikedBy = isLiked ? likedBy.filter(id => id !== currentUser.uid) : [...likedBy, currentUser.uid];
      const newCount = updatedLikedBy.length;
      await updateDoc(doc(db, 'service_requests', requestId), {
        likedBy: updatedLikedBy,
        likesCount: newCount
      });
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du like.', 'error');
    }
  };

  // Toggle Like Provider or Associated Service
  const handleToggleLikeProviderOrService = async (provider: ProviderProfileDoc) => {
    if (!currentUser) {
      setAuthModalMode('login');
      setShowAuthModal(true);
      showToast(language === 'ar' ? 'سجّل دخولك للإعجاب بهذه الخدمة.' : 'Connectez-vous pour aimer ce service.', 'info');
      return;
    }

    const associatedService = provider.serviceId
      ? services.find(s => s.serviceId === provider.serviceId)
      : services.find(s => s.providerId === provider.userId);

    if (associatedService) {
      const targetServiceId = associatedService.serviceId;
      const currentLikedBy = associatedService.likedBy || [];
      const isLiked = currentLikedBy.includes(currentUser.uid);
      const updatedLikedBy = isLiked 
        ? currentLikedBy.filter(id => id !== currentUser.uid) 
        : [...currentLikedBy, currentUser.uid];
      const newCount = updatedLikedBy.length;

      // Optimistic update
      setActiveDetailProvider(prev => prev ? {
        ...prev,
        serviceId: targetServiceId,
        likedBy: updatedLikedBy,
        likesCount: newCount
      } : null);

      try {
        await updateDoc(doc(db, 'services', targetServiceId), {
          likedBy: updatedLikedBy,
          likesCount: newCount
        });
        showToast(
          isLiked 
            ? (language === 'ar' ? 'تمت إزالة الإعجاب.' : 'Mention J’aime retirée.')
            : (language === 'ar' ? 'أعجبتك هذه الخدمة ! ❤️' : 'Vous aimez ce service ! ❤️')
        );
      } catch (err: any) {
        showToast(err.message || 'Erreur lors du like.', 'error');
      }
    } else {
      // Like provider profile document
      const currentLikedBy = provider.likedBy || [];
      const isLiked = currentLikedBy.includes(currentUser.uid);
      const updatedLikedBy = isLiked 
        ? currentLikedBy.filter(id => id !== currentUser.uid) 
        : [...currentLikedBy, currentUser.uid];
      const newCount = updatedLikedBy.length;

      setActiveDetailProvider(prev => prev ? {
        ...prev,
        likedBy: updatedLikedBy,
        likesCount: newCount
      } : null);

      try {
        await updateDoc(doc(db, 'provider_profiles', provider.userId), {
          likedBy: updatedLikedBy,
          likesCount: newCount
        });
        showToast(
          isLiked 
            ? (language === 'ar' ? 'تمت إزالة الإعجاب.' : 'Mention J’aime retirée.')
            : (language === 'ar' ? 'أعجبتك هذه الخدمة ! ❤️' : 'Vous aimez ce service ! ❤️')
        );
      } catch (err: any) {
        showToast(err.message || 'Erreur lors du like.', 'error');
      }
    }
  };

  // Add Comment
  const handleAddComment = async (parentId: string, parentType: 'service' | 'request' | 'provider', content: string) => {
    if (!currentUser) {
      setAuthModalMode('login');
      setShowAuthModal(true);
      showToast(language === 'ar' ? 'سجّل دخولك لكتابة تعليق.' : 'Connectez-vous pour commenter.', 'info');
      return;
    }
    if (!content.trim()) return;
    const commentId = `comm_${Date.now()}`;
    try {
      const newComment: CommentDoc = {
        commentId,
        parentId,
        parentType,
        userId: currentUser.uid,
        userName: currentUser.fullName,
        userAvatar: currentUser.profileImage || '',
        content: content.trim(),
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString()
      };
      await setDoc(doc(db, 'comments', commentId), newComment);
      showToast(language === 'ar' ? 'تم إضافة تعليقك بنجاح.' : 'Commentaire publié avec succès.');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `comments/${commentId}`);
    }
  };
  const handleUpdateProfilePhoto = async (file: File) => {
    if (!currentUser) return;
    try {
      const compressed = await compressProfileImage(file);
      const nowIso = new Date().toISOString();
      await updateDoc(doc(db, 'users', currentUser.uid), {
        profileImage: compressed,
        updatedAt: nowIso
      });
      setCurrentUser(prev => prev ? { ...prev, profileImage: compressed, updatedAt: nowIso } : null);

      if (currentUser.accountType === 'prestataire') {
        await setDoc(doc(db, 'provider_profiles', currentUser.uid), {
          profileImage: compressed,
          updatedAt: nowIso
        }, { merge: true });
        setProviderProfile(prev => prev ? { ...prev, profileImage: compressed, updatedAt: nowIso } : null);
      }

      showToast(language === 'ar' ? 'تم تحديث صورتك الشخصية بنجاح !' : 'Votre photo de profil a été mise à jour !');
    } catch (err: any) {
      if (err?.message === 'INVALID_IMAGE_TYPE') {
        showToast(language === 'ar' ? 'يرجى اختيار ملف صورة صالح (JPG أو PNG).' : 'Veuillez sélectionner une image valide (JPG, PNG, WebP).', 'error');
      } else {
        showToast(language === 'ar' ? 'تعذر تحديث الصورة الشخصية.' : 'Impossible de mettre à jour la photo de profil.', 'error');
      }
    }
  };

  // Filtered Services Calculation from Real Firestore
  const filteredServices = useMemo(() => {
    return services.filter(srv => {
      if (srv.status === 'unpublished' || srv.status === 'flagged') return false;
      const matchCity = srv.city === selectedCity;
      const matchCategory = filterCategory === 'all' || srv.category === filterCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        srv.title.toLowerCase().includes(q) ||
        srv.providerName.toLowerCase().includes(q) ||
        srv.description.toLowerCase().includes(q) ||
        srv.category.toLowerCase().includes(q);
      const matchPrice = srv.price <= maxPriceFilter;
      return matchCity && matchCategory && matchSearch && matchPrice;
    }).sort((a, b) => {
      if (sortBy === 'priceAsc') return a.price - b.price;
      if (sortBy === 'recent') return (b.createdAt || '').localeCompare(a.createdAt || '');
      return 0;
    });
  }, [services, selectedCity, filterCategory, searchQuery, maxPriceFilter, sortBy]);

  // Filtered Client Requests Calculation from Real Firestore
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      if (req.status !== 'open') return false;
      const matchCity = req.city === selectedCity;
      const matchCategory = filterCategory === 'all' || req.category === filterCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        req.title.toLowerCase().includes(q) ||
        req.clientName.toLowerCase().includes(q) ||
        req.description.toLowerCase().includes(q) ||
        req.category.toLowerCase().includes(q);
      const matchPrice = req.budget <= maxPriceFilter;
      return matchCity && matchCategory && matchSearch && matchPrice;
    }).sort((a, b) => {
      if (sortBy === 'priceAsc') return a.budget - b.budget;
      if (sortBy === 'recent') return (b.createdAt || '').localeCompare(a.createdAt || '');
      return 0;
    });
  }, [requests, selectedCity, filterCategory, searchQuery, maxPriceFilter, sortBy]);

  // Accept Proposal flow (Real DB mutation)
  const handleAcceptProposal = async (proposal: ProposalDoc) => {
    try {
      await updateDoc(doc(db, 'proposals', proposal.proposalId), {
        status: 'accepted'
      });
      await updateDoc(doc(db, 'service_requests', proposal.requestId), {
        status: 'in_progress'
      });

      // Find or create conversation in Firestore
      const convId = `conv_${[proposal.clientId, proposal.providerId].sort().join('_')}`;
      const convRef = doc(db, 'conversations', convId);
      const convSnap = await getDoc(convRef);

      if (!convSnap.exists()) {
        const newConv: ConversationDoc = {
          conversationId: convId,
          participants: [proposal.clientId, proposal.providerId],
          participantNames: {
            [proposal.clientId]: currentUser?.fullName || 'Client',
            [proposal.providerId]: proposal.providerName
          },
          lastMessage: `Offre de ${proposal.proposedPrice} MAD acceptée.`,
          updatedAt: new Date().toISOString()
        };
        await setDoc(convRef, newConv);
      }

      // Add system message
      const msgId = `msg_${Date.now()}`;
      const nowIso = new Date().toISOString();
      await setDoc(doc(db, 'conversations', convId, 'messages', msgId), {
        messageId: msgId,
        conversationId: convId,
        senderId: currentUser?.uid || '',
        content: `Salam ! J’ai validé votre offre de ${proposal.proposedPrice} MAD pour ma demande.`,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAtIso: nowIso,
        readStatus: false
      });

      await updateDoc(convRef, {
        lastMessage: `Offre de ${proposal.proposedPrice} MAD acceptée.`,
        lastSenderId: currentUser?.uid || '',
        lastMessageId: msgId,
        [`unreadCounts.${proposal.providerId}`]: 1,
        updatedAt: nowIso
      });

      showToast(language === 'ar' ? `تم قبول عرض ${proposal.providerName} !` : `Proposition de ${proposal.providerName} acceptée !`);
    } catch (err: any) {
      showToast(err.message || (language === 'ar' ? 'خطأ أثناء قبول العرض.' : 'Erreur lors de la validation de l’offre.'), 'error');
    }
  };

  // Send message in active chat with support for rich media types
  const handleSendMessage = async (content: string, type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' = 'text', mediaUrl?: string, fileName?: string) => {
    if (!activeChatConv || !currentUser) return;

    try {
      const msgId = `msg_${Date.now()}`;
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const nowIso = new Date().toISOString();
      const otherId = activeChatConv.participants?.find(p => p !== currentUser.uid);

      let previewText = content;
      if (type === 'image') previewText = language === 'ar' ? '📷 صورة' : '📷 Photo';
      if (type === 'video') previewText = language === 'ar' ? '🎥 فيديو' : '🎥 Vidéo';
      if (type === 'audio') previewText = language === 'ar' ? '🎤 تسجيل صوتي' : '🎤 Message vocal';
      if (type === 'document') previewText = language === 'ar' ? `📄 مستند (${fileName || 'doc'})` : `📄 Document (${fileName || 'doc'})`;
      if (type === 'location') previewText = language === 'ar' ? '📍 موقع جغرافي' : '📍 Position GPS';

      const messageData: MessageDoc = {
        messageId: msgId,
        conversationId: activeChatConv.conversationId,
        senderId: currentUser.uid,
        content: previewText,
        createdAt: nowTime,
        createdAtIso: nowIso,
        readStatus: false,
        type,
        mediaUrl,
        fileName
      };

      await setDoc(doc(db, 'conversations', activeChatConv.conversationId, 'messages', msgId), messageData);

      const currentOtherUnread = otherId ? (activeChatConv.unreadCounts?.[otherId] || 0) : 0;
      const convUpdates: Record<string, any> = {
        lastMessage: previewText,
        lastSenderId: currentUser.uid,
        lastMessageId: msgId,
        updatedAt: nowIso
      };
      if (otherId) {
        convUpdates[`unreadCounts.${otherId}`] = currentOtherUnread + 1;
      }
      convUpdates[`unreadCounts.${currentUser.uid}`] = 0;

      await updateDoc(doc(db, 'conversations', activeChatConv.conversationId), convUpdates);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `conversations/${activeChatConv.conversationId}/messages`);
    }
  };

  // Edit an existing message sent by current user
  const handleEditMessage = async (messageId: string, newText: string) => {
    if (!activeChatConv || !currentUser || !newText.trim()) return;

    try {
      const trimmed = newText.trim();
      const editedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const msgRef = doc(db, 'conversations', activeChatConv.conversationId, 'messages', messageId);

      await updateDoc(msgRef, {
        content: trimmed,
        isEdited: true,
        editedAt
      });

      const latestMsg = chatMessages[chatMessages.length - 1];
      if (latestMsg?.messageId === messageId || activeChatConv.lastMessageId === messageId) {
        await updateDoc(doc(db, 'conversations', activeChatConv.conversationId), {
          lastMessage: trimmed
        });
      }

      showToast(language === 'ar' ? 'تم تعديل الرسالة بنجاح' : 'Message modifié avec succès');
    } catch (err: any) {
      showToast(err.message || (language === 'ar' ? 'تعذر تعديل الرسالة.' : 'Impossible de modifier le message.'), 'error');
    }
  };

  // Delete an existing message sent by current user
  const handleDeleteMessage = async (messageId: string) => {
    if (!activeChatConv || !currentUser) return;

    try {
      const msgRef = doc(db, 'conversations', activeChatConv.conversationId, 'messages', messageId);
      await deleteDoc(msgRef);

      const remaining = chatMessages.filter(m => m.messageId !== messageId);
      const newLast = remaining[remaining.length - 1];
      await updateDoc(doc(db, 'conversations', activeChatConv.conversationId), {
        lastMessage: newLast ? newLast.content : (language === 'ar' ? 'تم حذف الرسالة' : 'Message supprimé'),
        lastMessageId: newLast ? newLast.messageId : '',
        lastSenderId: newLast ? newLast.senderId : ''
      });

      showToast(language === 'ar' ? 'تم حذف الرسالة' : 'Message supprimé', 'info');
    } catch (err: any) {
      showToast(err.message || (language === 'ar' ? 'تعذر حذف الرسالة.' : 'Impossible de supprimer le message.'), 'error');
    }
  };

  // Total unread messages badge count across all conversations
  const totalUnreadCount = useMemo(() => {
    if (!currentUser) return 0;
    return conversations.reduce((sum, conv) => {
      const count = conv.unreadCounts?.[currentUser.uid] || 0;
      return sum + count;
    }, 0);
  }, [conversations, currentUser]);

  // Is Current user an Admin?
  const isAdmin = currentUser?.role === 'admin' || currentUser?.email === 'dkhissiabdelamine@gmail.com';

  return (
    <div 
      dir={language === 'ar' ? 'rtl' : 'ltr'} 
      className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center text-slate-800 dark:text-slate-100 font-sans selection:bg-blue-100 dark:selection:bg-blue-900 transition-colors"
    >
      {/* ----------------- SPLASH SCREEN ----------------- */}
      {showSplash && <SplashScreen onFinish={handleFinishSplash} />}

      {/* ----------------- TOP UTILITY STRIP ----------------- */}
      <aside aria-label="Contrôles utilisateur" className="w-full max-w-4xl px-4 py-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {currentUser.fullName} ({currentUser.accountType === 'prestataire'
                  ? (language === 'ar' ? 'مقدم خدمات' : 'Prestataire')
                  : (language === 'ar' ? 'زبون' : 'Particulier')})
              </span>
              {isAdmin && (
                <button
                  onClick={() => setShowAdminDashboard(true)}
                  className="px-2 py-0.5 bg-[#0F2942] dark:bg-[#2563EB] text-white rounded text-[10px] font-bold hover:bg-[#1E3A8A] transition-all ml-1 cursor-pointer"
                >
                  {language === 'ar' ? 'لوحة الإدارة' : 'Console Admin'}
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setAuthModalMode('login'); setShowAuthModal(true); }}
                className="text-[#2563EB] dark:text-blue-400 font-bold hover:underline cursor-pointer"
              >
                {language === 'ar' ? 'تسجيل الدخول' : 'Se connecter'}
              </button>
              <span>·</span>
              <button
                onClick={() => setShowAccountTypeSelect(true)}
                className="text-slate-600 dark:text-slate-300 font-bold hover:underline cursor-pointer"
              >
                {language === 'ar' ? 'إنشاء حساب' : 'Créer un compte'}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <button 
            onClick={() => {
              const nextLang = language === 'fr' ? 'ar' : 'fr';
              setLanguage(nextLang);
              showToast(nextLang === 'ar' ? 'تم تحويل التطبيق بالكامل إلى اللغة العربية' : 'Application passée en Français');
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-bold text-[11px] cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
            <span>{language === 'fr' ? 'العربية' : 'Français'}</span>
          </button>
        </div>
      </aside>

      {/* ----------------- APP CANVAS ----------------- */}
      <div 
        className={`w-full max-w-md my-0 sm:my-3 shadow-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-[92vh] flex flex-col relative pb-20 overflow-hidden transition-colors ${
          language === 'ar' ? 'font-[\'Noto_Sans_Arabic\',sans-serif]' : ''
        }`}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        
        {/* Global Toast */}
        {toastMessage && (
          <div className={`absolute top-4 left-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce border ${
            toastMessage.type === 'error' ? 'bg-rose-900 border-rose-500 text-white' : 'bg-[#0F2942] border-emerald-500 text-white'
          }`}>
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold leading-tight">{toastMessage.text}</span>
          </div>
        )}

        {/* Incoming Message Push Banner */}
        {incomingNotif && (
          <div className="absolute top-16 left-3 right-3 z-50 bg-[#0F2942] text-white border border-blue-400/50 rounded-2xl p-3 shadow-2xl flex items-center gap-3 animate-fadeIn">
            <div className="w-9 h-9 rounded-full bg-[#2563EB] flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div
              onClick={() => openConversation(incomingNotif.conv)}
              className="flex-1 min-w-0 cursor-pointer"
            >
              <p className="text-[11px] font-extrabold text-emerald-300 truncate">
                {language === 'ar'
                  ? `رسالة جديدة من ${incomingNotif.senderName}`
                  : `Nouveau message de ${incomingNotif.senderName}`}
              </p>
              <p className="text-xs text-slate-100 truncate">{incomingNotif.preview}</p>
            </div>
            <button
              onClick={() => openConversation(incomingNotif.conv)}
              className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg shrink-0 cursor-pointer"
            >
              {language === 'ar' ? 'عرض' : 'Voir'}
            </button>
            <button
              onClick={() => setIncomingNotif(null)}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              aria-label={language === 'ar' ? 'إغلاق' : 'Fermer'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ----------------- TOP STICKY BAR ----------------- */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-3.5 py-2.5 flex items-center justify-between">
          <div 
            onClick={() => { setShowAdminDashboard(false); setActiveTab('home'); }}
            className="cursor-pointer"
          >
            <WastaLogo size="sm" showSlogan={false} inverted={theme === 'dark'} language={language} />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* City Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[125px]">
              <MapPin className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400 mr-1 shrink-0" />
              <select 
                value={selectedCity} 
                onChange={(e) => {
                  setSelectedCity(e.target.value as MoroccanCity);
                  showToast(language === 'ar' ? `المدينة المختارة : ${getCityTranslation(e.target.value, 'ar')}` : `Ville sélectionnée : ${e.target.value}`);
                }}
                className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer truncate w-full dark:text-slate-100"
              >
                {MOROCCAN_CITIES.map(c => (
                  <option key={c} value={c} className="dark:bg-slate-900 dark:text-slate-100">{getCityTranslation(c, language)}</option>
                ))}
              </select>
            </div>

            {/* Message Notification Bell */}
            {currentUser && (
              <button
                onClick={() => {
                  setShowAdminDashboard(false);
                  const firstUnread = conversations.find(c => (c.unreadCounts?.[currentUser.uid] || 0) > 0);
                  if (firstUnread && totalUnreadCount > 0) {
                    setActiveTab('messages');
                    openConversation(firstUnread);
                  } else {
                    setActiveTab('messages');
                  }
                }}
                className="relative p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-[#0F2942] dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
                title={language === 'ar' ? 'إشعارات الرسائل' : 'Notifications de messages'}
                aria-label={language === 'ar' ? 'إشعارات الرسائل' : 'Notifications'}
              >
                {totalUnreadCount > 0 ? (
                  <BellRing className="w-4 h-4 text-[#2563EB] dark:text-blue-400 animate-pulse" />
                ) : (
                  <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                )}
                {totalUnreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shadow-sm">
                    {totalUnreadCount}
                  </span>
                )}
              </button>
            )}

            {/* Admin Console shortcut if Admin */}
            {isAdmin && (
              <button
                onClick={() => setShowAdminDashboard(true)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                title={language === 'ar' ? "لوحة الإدارة" : "Console Administration"}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </button>
            )}
          </div>
        </header>

        {/* Prestataire Incomplete Profile Alert Banner */}
        {currentUser?.accountType === 'prestataire' && (!providerProfile || !providerProfile.profileCompleted) && (
          <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-semibold text-[11px] leading-tight">
                {language === 'ar' 
                  ? `أكمل ملفك المهني لتكون مرئياً للزبناء في ${getCityTranslation(selectedCity, 'ar')}.`
                  : `Complétez votre profil professionnel pour être visible à ${selectedCity}.`}
              </span>
            </div>
            <button
              onClick={() => setShowProfileEditor(true)}
              className="text-[11px] font-bold text-amber-800 dark:text-amber-950 bg-amber-200/80 dark:bg-amber-400 px-2 py-1 rounded-lg shrink-0 ml-2 hover:bg-amber-300 cursor-pointer"
            >
              {language === 'ar' ? 'إكمال' : 'Compléter'}
            </button>
          </div>
        )}

        {/* ----------------- MAIN VIEW CONTAINER ----------------- */}
        <main className="flex-1 overflow-y-auto">
          {showAdminDashboard ? (
            <AdminDashboard 
              currentUser={currentUser}
              onClose={() => setShowAdminDashboard(false)}
            />
          ) : (
            <>
              {activeTab === 'home' && (
                <HomeView 
                  currentUser={currentUser}
                  selectedCity={selectedCity}
                  services={services}
                  requests={requests}
                  language={language}
                  onSelectCategory={(cat) => {
                    setFilterCategory(cat);
                    setDiscoveryTab('services');
                    setActiveTab('search');
                  }}
                  onOpenAvailableServices={() => {
                    setFilterCategory('all');
                    setDiscoveryTab('services');
                    setActiveTab('search');
                  }}
                  onOpenClientRequests={() => {
                    setFilterCategory('all');
                    setDiscoveryTab('requests');
                    setActiveTab('search');
                  }}
                  onNavigateSearch={() => {
                    setDiscoveryTab('services');
                    setActiveTab('search');
                  }}
                />
              )}

              {activeTab === 'search' && (
                <SearchView 
                  services={filteredServices}
                  requests={filteredRequests}
                  discoveryTab={discoveryTab}
                  setDiscoveryTab={setDiscoveryTab}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  filterCategory={filterCategory}
                  setFilterCategory={setFilterCategory}
                  maxPrice={maxPriceFilter}
                  setMaxPrice={setMaxPriceFilter}
                  onlyVerified={onlyVerified}
                  setOnlyVerified={setOnlyVerified}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  selectedCity={selectedCity}
                  language={language}
                  onSelectService={(srv) => {
                    const pDoc: ProviderProfileDoc = {
                      userId: srv.providerId,
                      fullName: srv.providerName,
                      professionalTitle: srv.title,
                      description: srv.description,
                      categories: [srv.category],
                      skills: [],
                      experience: '',
                      city: srv.city,
                      serviceArea: srv.city,
                      availability: 'Disponible',
                      profileCompleted: true,
                      isPublished: true,
                      isVerified: false,
                      rating: 5.0,
                      reviewCount: 0,
                      serviceId: srv.serviceId,
                      likesCount: srv.likesCount || 0,
                      likedBy: srv.likedBy || [],
                      createdAt: srv.createdAt,
                      updatedAt: srv.createdAt
                    };
                    setActiveDetailProvider(pDoc);
                  }}
                  onSelectRequest={(req) => setActiveRequestDetail(req)}
                  onQuickPublishRequest={() => {
                    if (!currentUser) {
                      setAuthModalMode('login');
                      setShowAuthModal(true);
                      showToast(language === 'ar' ? 'يرجى تسجيل الدخول للنشر.' : 'Veuillez vous connecter pour publier.', 'info');
                      return;
                    }
                    setPublishMode('request');
                    setIsPublishModalOpen(true);
                  }}
                />
              )}

              {activeTab === 'publish' && (
                <PublishHubView 
                  currentUser={currentUser}
                  language={language}
                  onOpenPublishModal={(mode) => {
                    if (!currentUser) {
                      setAuthModalMode('login');
                      setShowAuthModal(true);
                      showToast(language === 'ar' ? 'يرجى تسجيل الدخول لنشر إعلان.' : 'Connectez-vous pour publier une annonce.', 'info');
                      return;
                    }
                    setPublishMode(mode);
                    setIsPublishModalOpen(true);
                  }}
                />
              )}

              {activeTab === 'messages' && (
                <MessagesListView 
                  conversations={conversations}
                  currentUser={currentUser}
                  language={language}
                  notifPermission={notifPermission}
                  onRequestNotifPermission={handleRequestNotifPermission}
                  onSelectChat={(conv) => openConversation(conv)}
                  onOpenLogin={() => { setAuthModalMode('login'); setShowAuthModal(true); }}
                />
              )}

              {activeTab === 'profile' && (
                <UserProfileHubView 
                  currentUser={currentUser}
                  providerProfile={providerProfile}
                  myServices={services.filter(s => s.providerId === currentUser?.uid)}
                  myRequests={requests.filter(r => r.clientId === currentUser?.uid)}
                  myProposals={proposals}
                  onOpenAuthModal={(m) => {
                    if (m === 'signup') {
                      setShowAccountTypeSelect(true);
                    } else {
                      setAuthModalMode('login');
                      setShowAuthModal(true);
                    }
                  }}
                  onOpenProfileEditor={() => setShowProfileEditor(true)}
                  onOpenAdmin={() => setShowAdminDashboard(true)}
                  onUpdateProfilePhoto={handleUpdateProfilePhoto}
                  onLogout={handleLogout}
                  language={language}
                  setLanguage={setLanguage}
                  theme={theme}
                  setTheme={(next) => {
                    setTheme(next);
                    showToast(
                      language === 'ar'
                        ? (next === 'dark' ? 'تم تفعيل الوضع الداكن' : 'تم تفعيل الوضع الفاتح')
                        : (next === 'dark' ? 'Thème sombre activé' : 'Thème clair activé'),
                      'info'
                    );
                  }}
                />
              )}
            </>
          )}
        </main>

        {/* ----------------- BOTTOM NAV DOCK ----------------- */}
        <nav className="fixed bottom-0 w-full max-w-inherit bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-1.5 flex items-center justify-around z-40 shadow-lg">
          <NavButton 
            icon={<Home className="w-5 h-5" />} 
            label={language === 'ar' ? 'الرئيسية' : 'Accueil'} 
            active={activeTab === 'home' && !showAdminDashboard} 
            onClick={() => { setShowAdminDashboard(false); setActiveTab('home'); }} 
          />
          
          <NavButton 
            icon={<Search className="w-5 h-5" />} 
            label={language === 'ar' ? 'بحث' : 'Explorer'} 
            active={activeTab === 'search' && !showAdminDashboard} 
            onClick={() => { setShowAdminDashboard(false); setActiveTab('search'); }} 
          />
          
          {/* Central Prominent Publish Button */}
          <button 
            onClick={() => {
              if (!currentUser) {
                setAuthModalMode('login');
                setShowAuthModal(true);
                showToast(language === 'ar' ? 'يرجى تسجيل الدخول للنشر.' : 'Connectez-vous pour publier.', 'info');
                return;
              }
              if (currentUser.accountType === 'prestataire') {
                setPublishMode('service');
              } else {
                setPublishMode('request');
              }
              setIsPublishModalOpen(true);
            }}
            className="flex flex-col items-center justify-center -mt-5 group cursor-pointer"
            aria-label="Publier"
          >
            <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#0F2942] via-[#2563EB] to-emerald-500 text-white flex items-center justify-center shadow-xl group-hover:scale-105 transition-all border-3 border-white dark:border-slate-900">
              <PlusCircle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[10px] font-extrabold text-[#0F2942] dark:text-slate-200 mt-1">
              {language === 'ar' ? 'نشر' : 'Publier'}
            </span>
          </button>

          <NavButton 
            icon={<MessageSquare className="w-5 h-5" />} 
            label={language === 'ar' ? 'رسائل' : 'Messages'} 
            badge={totalUnreadCount > 0 ? totalUnreadCount : undefined}
            active={activeTab === 'messages' && !showAdminDashboard} 
            onClick={() => { setShowAdminDashboard(false); setActiveTab('messages'); }} 
          />

          <NavButton 
            icon={<User className="w-5 h-5" />} 
            label={language === 'ar' ? 'حسابي' : 'Mon Espace'} 
            active={activeTab === 'profile' && !showAdminDashboard} 
            onClick={() => { setShowAdminDashboard(false); setActiveTab('profile'); }} 
          />
        </nav>

        {/* ==========================================================================
            MODAL OVERLAYS
            ========================================================================== */}

        {/* 1. Onboarding Modal */}
        {showOnboarding && (
          <OnboardingModal 
            language={language}
            onComplete={handleFinishOnboarding} 
          />
        )}

        {/* 2. First Screen: Account Type Selection Modal */}
        <AccountTypeSelectModal 
          isOpen={showAccountTypeSelect}
          language={language}
          onSelectType={handleSelectAccountType}
          onGoToLogin={() => {
            setShowAccountTypeSelect(false);
            setAuthModalMode('login');
            setShowAuthModal(true);
          }}
          onClose={() => setShowAccountTypeSelect(false)}
        />

        {/* 3. Real Firebase Authentication Modal (Login / Sign up / Forgot Password) */}
        <AuthModal 
          isOpen={showAuthModal}
          language={language}
          onClose={() => setShowAuthModal(false)}
          initialMode={authModalMode}
          selectedAccountType={selectedAccountType}
          onOpenAccountTypeSelect={() => {
            setShowAuthModal(false);
            setShowAccountTypeSelect(true);
          }}
          onSuccess={async (uDoc, createdProviderProfile) => {
            setCurrentUser(uDoc);
            setSelectedCity(uDoc.city);
            if (uDoc.accountType === 'prestataire') {
              if (createdProviderProfile) {
                setProviderProfile(createdProviderProfile);
              } else {
                try {
                  const pSnap = await getDoc(doc(db, 'provider_profiles', uDoc.uid));
                  if (pSnap.exists()) {
                    setProviderProfile(pSnap.data() as ProviderProfileDoc);
                  }
                } catch (err) {
                  console.warn('Could not load provider profile:', err);
                }
              }
              setActiveTab('profile');
            } else {
              setProviderProfile(null);
              setActiveTab('home');
            }
            showToast(language === 'ar' ? `مرحباً بك، ${uDoc.fullName} !` : `Bienvenue, ${uDoc.fullName} !`);
          }}
        />

        {/* 4. Prestataire Professional Profile Editor */}
        {showProfileEditor && (
          <PrestataireProfileEditorModal 
            isOpen={showProfileEditor}
            language={language}
            onClose={() => setShowProfileEditor(false)}
            providerProfile={providerProfile || {
              userId: currentUser?.uid || '',
              fullName: currentUser?.fullName || '',
              professionalTitle: '',
              description: '',
              categories: [],
              skills: [],
              experience: '',
              city: selectedCity,
              serviceArea: selectedCity,
              availability: language === 'ar' ? 'متاح للعمل' : 'Disponible',
              profileCompleted: false,
              isPublished: false,
              isVerified: false,
              rating: 5.0,
              reviewCount: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }}
            onSaved={(updated) => {
              setProviderProfile(updated);
              showToast(language === 'ar' ? 'تم تحديث ملفك المهني بنجاح !' : 'Profil professionnel mis à jour avec succès !');
            }}
          />
        )}

        {/* 5. Service Detail Modal */}
        {activeServiceDetail && (
          <ServiceDetailModal 
            service={activeServiceDetail}
            comments={comments}
            currentUser={currentUser}
            language={language}
            onClose={() => setActiveServiceDetail(null)}
            onToggleLike={() => handleToggleLikeService(activeServiceDetail.serviceId, activeServiceDetail.likedBy || [])}
            onAddComment={handleAddComment}
            onOpenProvider={(srv) => {
              setActiveServiceDetail(null);
              const pDoc: ProviderProfileDoc = {
                userId: srv.providerId,
                fullName: srv.providerName,
                professionalTitle: srv.title,
                description: srv.description,
                categories: [srv.category],
                skills: [],
                experience: '',
                city: srv.city,
                serviceArea: srv.city,
                availability: 'Disponible',
                profileCompleted: true,
                isPublished: true,
                isVerified: false,
                rating: 5.0,
                reviewCount: 0,
                createdAt: srv.createdAt,
                updatedAt: srv.createdAt
              };
              setActiveDetailProvider(pDoc);
            }}
          />
        )}

        {/* 6. Provider Profile Details View */}
        {activeDetailProvider && (
          <ProviderProfileModal 
            provider={activeDetailProvider}
            reviews={reviews.filter(r => r.providerId === activeDetailProvider.userId)}
            comments={comments}
            currentUser={currentUser}
            services={services}
            language={language}
            onClose={() => setActiveDetailProvider(null)}
            onToggleLike={() => handleToggleLikeProviderOrService(activeDetailProvider)}
            onAddComment={handleAddComment}
            onDirectContact={async () => {
              if (!currentUser) {
                setAuthModalMode('login');
                setShowAuthModal(true);
                showToast(language === 'ar' ? 'يرجى تسجيل الدخول لمراسلة هذا المهني.' : 'Connectez-vous pour envoyer un message.', 'info');
                return;
              }
              const convId = `conv_${[currentUser.uid, activeDetailProvider.userId].sort().join('_')}`;
              const convRef = doc(db, 'conversations', convId);
              const existingSnap = await getDoc(convRef);
              let targetConv: ConversationDoc;
              if (existingSnap.exists()) {
                targetConv = existingSnap.data() as ConversationDoc;
              } else {
                targetConv = {
                  conversationId: convId,
                  participants: [currentUser.uid, activeDetailProvider.userId],
                  participantNames: {
                    [currentUser.uid]: currentUser.fullName,
                    [activeDetailProvider.userId]: activeDetailProvider.fullName
                  },
                  lastMessage: language === 'ar' ? 'السلام عليكم، أتواصل معك بخصوص خدماتك في Wasta No.' : 'Salam, je vous contacte depuis votre profil Wasta No.',
                  lastSenderId: currentUser.uid,
                  unreadCounts: {
                    [currentUser.uid]: 0,
                    [activeDetailProvider.userId]: 0
                  },
                  updatedAt: new Date().toISOString()
                };
                await setDoc(convRef, targetConv, { merge: true });
              }
              setActiveDetailProvider(null);
              setActiveTab('messages');
              await openConversation(targetConv);
            }}
          />
        )}

        {/* 6. Client Request Details & Proposals Modal */}
        {activeRequestDetail && (
          <RequestDetailModal 
            request={activeRequestDetail}
            proposals={proposals.filter(p => p.requestId === activeRequestDetail.requestId)}
            currentUser={currentUser}
            language={language}
            onClose={() => setActiveRequestDetail(null)}
            onSendProposal={async (price, message, eta) => {
              if (!currentUser) {
                setAuthModalMode('login');
                setShowAuthModal(true);
                return;
              }
              try {
                const propId = `prop_${Date.now()}`;
                const newProp: ProposalDoc = {
                  proposalId: propId,
                  requestId: activeRequestDetail.requestId,
                  providerId: currentUser.uid,
                  providerName: currentUser.fullName,
                  providerAvatar: currentUser.profileImage || '',
                  clientId: activeRequestDetail.clientId,
                  proposedPrice: price,
                  message,
                  eta,
                  status: 'pending',
                  createdAt: new Date().toISOString()
                };
                await setDoc(doc(db, 'proposals', propId), newProp);
                await updateDoc(doc(db, 'service_requests', activeRequestDetail.requestId), {
                  proposalsCount: (activeRequestDetail.proposalsCount || 0) + 1
                });
                showToast(language === 'ar' ? 'تم إرسال عرضك بنجاح للزبون !' : 'Votre offre a été soumise au client !');
                setActiveRequestDetail(null);
              } catch (err: any) {
                showToast(err.message || 'Erreur lors de l’envoi de la proposition.', 'error');
              }
            }}
            onAcceptProposal={handleAcceptProposal}
          />
        )}

        {/* 7. Live Real-time Chat Window */}
        {activeChatConv && (
          <ChatWindowModal 
            conv={activeChatConv}
            messages={chatMessages}
            currentUser={currentUser}
            language={language}
            onClose={() => setActiveChatConv(null)}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onCompleteMissionAndReview={() => {
              const otherId = activeChatConv.participants.find(p => p !== currentUser?.uid);
              const otherName = activeChatConv.participantNames?.[otherId || ''] || 'Prestataire';
              setReviewModalTarget({
                userId: otherId || '',
                fullName: otherName,
                professionalTitle: language === 'ar' ? 'مقدم خدمة' : 'Prestataire de service',
                description: '',
                categories: [],
                skills: [],
                experience: '',
                city: selectedCity,
                serviceArea: selectedCity,
                availability: '',
                profileCompleted: true,
                isPublished: true,
                isVerified: false,
                rating: 5.0,
                reviewCount: 0,
                createdAt: '',
                updatedAt: ''
              });
              setActiveChatConv(null);
            }}
          />
        )}

        {/* 8. Dual Publish Modal (Real Firestore Writes) */}
        {isPublishModalOpen && (
          <PublishModal 
            currentUser={currentUser}
            selectedCity={selectedCity}
            defaultMode={publishMode}
            language={language}
            onClose={() => setIsPublishModalOpen(false)}
            onCreateService={async (srvData) => {
              try {
                const srvId = `srv_${Date.now()}`;
                const newSrv: ServiceDoc = {
                  serviceId: srvId,
                  providerId: currentUser?.uid || '',
                  providerName: currentUser?.fullName || '',
                  status: 'active',
                  createdAt: new Date().toISOString(),
                  ...srvData
                };
                await setDoc(doc(db, 'services', srvId), newSrv);
                setIsPublishModalOpen(false);
                showToast(language === 'ar' ? 'تم نشر خدمتك بنجاح على Wasta No !' : 'Votre service a été publié avec succès sur Wasta No !');
                setActiveTab('search');
              } catch (err: any) {
                showToast(err.message || 'Erreur lors de la publication du service.', 'error');
              }
            }}
            onCreateRequest={async (reqData) => {
              try {
                const reqId = `req_${Date.now()}`;
                const newReq: ServiceRequestDoc = {
                  requestId: reqId,
                  clientId: currentUser?.uid || '',
                  clientName: currentUser?.fullName || 'Client',
                  clientAvatar: currentUser?.profileImage || '',
                  status: 'open',
                  proposalsCount: 0,
                  createdAt: new Date().toISOString(),
                  ...reqData
                };
                await setDoc(doc(db, 'service_requests', reqId), newReq);
                setIsPublishModalOpen(false);
                showToast(language === 'ar' ? 'تم نشر طلبك بنجاح ! سيتواصل معك المهنيون.' : 'Votre demande a été publiée ! Les prestataires peuvent vous répondre.');
                setActiveTab('home');
              } catch (err: any) {
                showToast(err.message || 'Erreur lors de la publication de la demande.', 'error');
              }
            }}
          />
        )}

        {/* 9. Verified Review Modal */}
        {reviewModalTarget && (
          <SubmitReviewModal 
            targetUser={reviewModalTarget}
            language={language}
            onClose={() => setReviewModalTarget(null)}
            onSubmitReview={async (stars, comment) => {
              if (!currentUser) return;
              try {
                const revId = `rev_${Date.now()}`;
                const newRev: ReviewDoc = {
                  reviewId: revId,
                  clientId: currentUser.uid,
                  clientName: currentUser.fullName,
                  providerId: reviewModalTarget.userId,
                  serviceId: 'mission_completed',
                  rating: stars,
                  comment,
                  createdAt: new Date().toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                };
                await setDoc(doc(db, 'reviews', revId), newRev);
                showToast(language === 'ar' ? 'تم تسجيل تقييمك بنجاح على Wasta No.' : 'Votre avis a été enregistré sur Wasta No.');
                setReviewModalTarget(null);
              } catch (err: any) {
                showToast(err.message || 'Erreur lors de l’enregistrement de l’avis.', 'error');
              }
            }}
          />
        )}

      </div>
    </div>
  );
}

/* ==========================================================================
   SUB-COMPONENTS & VIEWS
   ========================================================================== */

function NavButton({ icon, label, active, onClick, badge }: { 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center flex-1 py-1 transition-all relative cursor-pointer ${
        active
          ? 'text-[#0F2942] dark:text-blue-400 font-bold'
          : 'text-slate-400 dark:text-slate-500 font-medium hover:text-slate-600 dark:hover:text-slate-300'
      }`}
    >
      <div className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[10px] mt-0.5 tracking-tight">{label}</span>
      {active && <div className="w-3.5 h-0.5 bg-[#2563EB] dark:bg-blue-400 rounded-full mt-0.5" />}
    </button>
  );
}

function getCategoryVisual(category: ServiceCategory) {
  switch (category) {
    case 'Maison & Réparation':
      return {
        Icon: Wrench,
        gradient: 'from-blue-500 to-indigo-600',
        ring: 'ring-blue-500/20 dark:ring-blue-400/25',
        cardHover: 'hover:border-blue-400 dark:hover:border-blue-500/60',
      };
    case 'Digital & Créatif':
      return {
        Icon: Palette,
        gradient: 'from-fuchsia-500 to-rose-600',
        ring: 'ring-fuchsia-500/20 dark:ring-fuchsia-400/25',
        cardHover: 'hover:border-fuchsia-400 dark:hover:border-fuchsia-500/60',
      };
    case 'Cours & Formation':
      return {
        Icon: GraduationCap,
        gradient: 'from-emerald-500 to-teal-600',
        ring: 'ring-emerald-500/20 dark:ring-emerald-400/25',
        cardHover: 'hover:border-emerald-400 dark:hover:border-emerald-500/60',
      };
    case 'Ménage':
      return {
        Icon: Sparkles,
        gradient: 'from-cyan-500 to-sky-600',
        ring: 'ring-cyan-500/20 dark:ring-cyan-400/25',
        cardHover: 'hover:border-cyan-400 dark:hover:border-cyan-500/60',
      };
    case 'Informatique':
      return {
        Icon: Laptop,
        gradient: 'from-indigo-500 to-violet-600',
        ring: 'ring-indigo-500/20 dark:ring-indigo-400/25',
        cardHover: 'hover:border-indigo-400 dark:hover:border-indigo-500/60',
      };
    case 'Transport & Livraison':
      return {
        Icon: Truck,
        gradient: 'from-amber-500 to-orange-600',
        ring: 'ring-amber-500/20 dark:ring-amber-400/25',
        cardHover: 'hover:border-amber-400 dark:hover:border-amber-500/60',
      };
    case 'Événementiel':
      return {
        Icon: Camera,
        gradient: 'from-rose-500 to-pink-600',
        ring: 'ring-rose-500/20 dark:ring-rose-400/25',
        cardHover: 'hover:border-rose-400 dark:hover:border-rose-500/60',
      };
    case 'Autres services':
    default:
      return {
        Icon: Zap,
        gradient: 'from-teal-500 to-emerald-600',
        ring: 'ring-teal-500/20 dark:ring-teal-400/25',
        cardHover: 'hover:border-teal-400 dark:hover:border-teal-500/60',
      };
  }
}

/* --------------------------------------------------------------------------
   HOME VIEW
   -------------------------------------------------------------------------- */
function HomeView({
  currentUser,
  selectedCity,
  services,
  requests,
  language,
  onSelectCategory,
  onOpenAvailableServices,
  onOpenClientRequests,
  onNavigateSearch,
}: {
  currentUser: UserDoc | null;
  selectedCity: MoroccanCity;
  services: ServiceDoc[];
  requests: ServiceRequestDoc[];
  language: 'fr' | 'ar';
  onSelectCategory: (cat: ServiceCategory) => void;
  onOpenAvailableServices: () => void;
  onOpenClientRequests: () => void;
  onNavigateSearch: () => void;
}) {
  const isAr = language === 'ar';
  const cityServicesCount = services.filter(s => s.city === selectedCity && s.status === 'active').length;
  const cityRequestsCount = requests.filter(r => r.city === selectedCity && r.status === 'open').length;

  return (
    <div className="space-y-4 pb-6">
      {/* Hero Welcome Card */}
      <div className="bg-gradient-to-br from-[#0F2942] via-[#153A5F] to-[#2563EB] dark:from-slate-900 dark:via-[#0F2942] dark:to-blue-900 text-white p-5 rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold">
              {isAr ? 'مرحباً بك' : 'Marhaban bik'}
            </span>
            <h1 className="text-xl font-black tracking-tight">
              {currentUser ? currentUser.fullName : 'Wasta No Maroc'}
            </h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-black text-sm text-emerald-300 overflow-hidden shrink-0">
            {currentUser?.profileImage ? (
              <img src={currentUser.profileImage} alt={currentUser.fullName} className="w-full h-full object-cover" />
            ) : (
              currentUser ? currentUser.fullName.charAt(0) : 'W'
            )}
          </div>
        </div>

        <p className="text-xs text-slate-200 mb-3.5 max-w-sm leading-relaxed">
          {currentUser?.accountType === 'prestataire'
            ? (isAr
                ? `حساب مهني : اختر القسم المناسب لاستعراض الخدمات والطلبات في ${getCityTranslation(selectedCity, 'ar')}.`
                : `Espace Prestataire : Explorez les catégories ou consultez les demandes à ${selectedCity}.`)
            : (isAr
                ? `اختر قسم الخدمة الذي تحتاجه وتواصل مباشرة بدون وسيط في ${getCityTranslation(selectedCity, 'ar')}.`
                : `Choisissez une catégorie de service et contactez des talents qualifiés sans intermédiaire à ${selectedCity}.`)}
        </p>

        {/* Enhanced Quick-Access Buttons (Services disponibles & Demandes clients) */}
        <div className="grid grid-cols-2 gap-2.5 mb-3.5">
          <button
            type="button"
            onClick={onOpenAvailableServices}
            className="min-h-[48px] px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500/25 to-teal-500/25 hover:from-emerald-500/35 hover:to-teal-500/35 border border-emerald-400/40 backdrop-blur-md flex items-center justify-between gap-2.5 text-left transition-all cursor-pointer active:scale-[0.98] shadow-sm group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <Briefcase className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold block leading-none">
                  {isAr ? 'عروض' : 'Explorer'}
                </span>
                <span className="text-xs font-black text-white leading-tight truncate block mt-0.5">
                  {isAr ? 'الخدمات المتاحة' : 'Services dispo'}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-[11px] font-black text-white shrink-0 border border-emerald-400/40">
              {cityServicesCount}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenClientRequests}
            className="min-h-[48px] px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500/25 to-indigo-500/25 hover:from-blue-500/35 hover:to-indigo-500/35 border border-blue-400/40 backdrop-blur-md flex items-center justify-between gap-2.5 text-left transition-all cursor-pointer active:scale-[0.98] shadow-sm group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-blue-300 font-bold block leading-none">
                  {isAr ? 'طلبات' : 'Missions'}
                </span>
                <span className="text-xs font-black text-white leading-tight truncate block mt-0.5">
                  {isAr ? 'طلبات الزبناء' : 'Demandes clients'}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/30 text-[11px] font-black text-white shrink-0 border border-blue-400/40">
              {cityRequestsCount}
            </span>
          </button>
        </div>

        {/* Search trigger */}
        <div 
          onClick={onNavigateSearch}
          className="bg-white/10 backdrop-blur-md border border-white/20 p-2.5 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-white/20 transition-all shadow-inner"
        >
          <Search className="w-4 h-4 text-emerald-300 shrink-0" />
          <span className="text-xs text-slate-100 font-medium truncate">
            {isAr ? 'ما هي الخدمة التي تبحث عنها اليوم؟' : 'Quel service recherchez-vous aujourd’hui ?'}
          </span>
        </div>
      </div>

      {/* Center Section: Exclusively Service Categories with Vivid Professional Vector Icons */}
      <div className="px-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
              {isAr ? 'أقسام الخدمات' : 'Catégories de services'}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isAr ? `تصفح التخصصات المتوفرة في ${getCityTranslation(selectedCity, 'ar')}` : `Sélectionnez un domaine à ${selectedCity}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateSearch}
            className="text-xs text-[#2563EB] dark:text-blue-400 font-bold hover:underline cursor-pointer shrink-0"
          >
            {isAr ? 'عرض الكل' : 'Tout voir'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SERVICE_CATEGORIES.map((cat) => {
            const { Icon, gradient, ring, cardHover } = getCategoryVisual(cat.name);
            const translated = getCategoryTranslation(cat.name, language);
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => onSelectCategory(cat.name)}
                className={`group flex flex-col items-start justify-between p-3.5 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 ${cardHover} rounded-2xl shadow-sm hover:shadow-md transition-all text-start cursor-pointer active:scale-[0.98]`}
              >
                <div className="flex items-center justify-between w-full mb-2.5">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} ring-4 ${ring} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5 text-white stroke-[2.2]" />
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors ${isAr ? 'rotate-180' : ''}`} />
                </div>
                <div className="w-full">
                  <h3 className="text-[13px] font-extrabold text-slate-900 dark:text-white leading-snug">
                    {translated.name}
                  </h3>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                    {translated.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   SEARCH & DISCOVERY VIEW
   -------------------------------------------------------------------------- */
function SearchView({
  services,
  requests,
  discoveryTab,
  setDiscoveryTab,
  searchQuery,
  setSearchQuery,
  filterCategory,
  setFilterCategory,
  maxPrice,
  setMaxPrice,
  onlyVerified,
  setOnlyVerified,
  sortBy,
  setSortBy,
  selectedCity,
  language = 'fr',
  onSelectService,
  onSelectRequest,
  onQuickPublishRequest
}: {
  services: ServiceDoc[];
  requests: ServiceRequestDoc[];
  discoveryTab: 'services' | 'requests';
  setDiscoveryTab: (tab: 'services' | 'requests') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterCategory: string;
  setFilterCategory: (c: string) => void;
  maxPrice: number;
  setMaxPrice: (p: number) => void;
  onlyVerified: boolean;
  setOnlyVerified: (v: boolean) => void;
  sortBy: 'relevant' | 'rating' | 'priceAsc' | 'recent';
  setSortBy: (s: any) => void;
  selectedCity: MoroccanCity;
  language?: 'fr' | 'ar';
  onSelectService: (s: ServiceDoc) => void;
  onSelectRequest: (r: ServiceRequestDoc) => void;
  onQuickPublishRequest: () => void;
}) {
  const [showFilters, setShowFilters] = useState(false);
  const isAr = language === 'ar';

  return (
    <div className="p-4 space-y-3.5" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Switcher: Services disponibles vs Demandes de particuliers */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setDiscoveryTab('services')}
          className={`min-h-[40px] px-2.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            discoveryTab === 'services'
              ? 'bg-[#0F2942] dark:bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{isAr ? `الخدمات (${services.length})` : `Services (${services.length})`}</span>
        </button>
        <button
          type="button"
          onClick={() => setDiscoveryTab('requests')}
          className={`min-h-[40px] px-2.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            discoveryTab === 'requests'
              ? 'bg-[#0F2942] dark:bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{isAr ? `الطلبات (${requests.length})` : `Demandes (${requests.length})`}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className={`w-4 h-4 text-slate-400 absolute ${isAr ? 'right-3' : 'left-3'} top-3.5`} />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            discoveryTab === 'services'
              ? (isAr ? `البحث عن خدمة في ${getCityTranslation(selectedCity, 'ar')}...` : `Rechercher un service à ${selectedCity}...`)
              : (isAr ? `البحث عن طلب زبون في ${getCityTranslation(selectedCity, 'ar')}...` : `Rechercher une demande à ${selectedCity}...`)
          }
          className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl ${isAr ? 'pr-9 pl-10 text-right' : 'pl-9 pr-10 text-left'} py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white dark:focus:bg-slate-800`}
        />
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute ${isAr ? 'left-2' : 'right-2'} top-2 p-1.5 rounded-lg border cursor-pointer ${
            showFilters
              ? 'bg-[#0F2942] dark:bg-blue-600 text-white border-transparent'
              : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-600'
          }`}
          aria-label={isAr ? "خيارات التصفية" : "Filtres"}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter options */}
      {showFilters && (
        <div className="bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 space-y-3 animate-fadeIn">
          <div>
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block mb-1">
              {isAr ? 'القسم' : 'Catégorie'}
            </label>
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg p-2 focus:outline-none cursor-pointer"
            >
              <option value="all">{isAr ? 'جميع الأقسام' : 'Toutes les catégories'}</option>
              {SERVICE_CATEGORIES.map(c => (
                <option key={c.name} value={c.name}>
                  {getCategoryTranslation(c.name, language).name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
              <span>{isAr ? 'السعر الأقصى :' : 'Tarif maximum'}</span>
              <span className="text-[#2563EB] dark:text-blue-400 font-black">{maxPrice} {isAr ? 'درهم' : 'MAD'}</span>
            </div>
            <input 
              type="range" 
              min={50} 
              max={3000} 
              step={50}
              value={maxPrice} 
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-[#2563EB] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {isAr ? 'ترتيب حسب :' : 'Trier par :'}
            </span>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 font-bold cursor-pointer"
            >
              <option value="relevant">{isAr ? 'الأكثر ملائمة' : 'Pertinence'}</option>
              <option value="priceAsc">{isAr ? 'السعر: من الأقل للأعلى' : 'Prix croissant'}</option>
              <option value="recent">{isAr ? 'الأحدث أولاً' : 'Plus récent'}</option>
            </select>
          </div>
        </div>
      )}

      {/* Result list */}
      {discoveryTab === 'services' ? (
        <div className="space-y-3">
          {services.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800/70 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {isAr ? `لم يتم العثور على خدمات في ${getCityTranslation(selectedCity, 'ar')}` : `Aucun résultat trouvé à ${selectedCity}`}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? 'لا توجد خدمات تطابق بحثك حالياً في قاعدة البيانات.' : 'Aucun service ne correspond à votre recherche dans la base de données.'}
              </p>
            </div>
          ) : (
            services.map(srv => {
              let translatedPricingType: string = srv.pricingType;
              if (isAr) {
                if (srv.pricingType === 'Fixe') translatedPricingType = 'سعر محدد';
                if (srv.pricingType === 'Par heure') translatedPricingType = 'بالساعة';
                if (srv.pricingType === 'Négociable') translatedPricingType = 'قابل للتفاوض';
              }
              const { Icon, gradient } = getCategoryVisual(srv.category);

              return (
                <div 
                  key={srv.serviceId}
                  onClick={() => onSelectService(srv)}
                  className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-3.5 shadow-sm hover:border-[#2563EB] dark:hover:border-blue-500 transition-all cursor-pointer flex gap-3.5"
                >
                  <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-600 overflow-hidden">
                    {srv.images && srv.images.length > 0 ? (
                      <img src={srv.images[0]} alt={srv.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-sm`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-[#2563EB] dark:text-blue-400">
                          {getCategoryTranslation(srv.category, language).name} • {getCityTranslation(srv.city, language)}
                        </span>
                        <span className="text-xs font-black text-[#0F2942] dark:text-emerald-400">
                          {srv.price} {isAr ? 'درهم' : 'MAD'}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">{srv.title}</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{srv.providerName}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700 text-[11px]">
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-2 py-0.5 rounded-md">
                        {translatedPricingType}
                      </span>
                      <span className="text-[10px] text-[#2563EB] dark:text-blue-400 font-bold">
                        {isAr ? 'عرض التفاصيل' : 'Consulter'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {isAr ? 'مهام مفتوحة لعروض أسعار الحرفيين' : 'Missions ouvertes aux devis de prestataires'}
            </span>
            <button
              type="button"
              onClick={onQuickPublishRequest}
              className="text-[11px] bg-[#0F2942] dark:bg-blue-600 hover:bg-[#1E3A8A] dark:hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg font-bold cursor-pointer shrink-0"
            >
              {isAr ? '+ طلب خدمة' : '+ Demander'}
            </button>
          </div>

          {requests.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800/70 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 space-y-2">
              <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {isAr ? `لا توجد طلبات جارية حالياً في ${getCityTranslation(selectedCity, 'ar')}` : `Aucune demande en cours à ${selectedCity}`}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? 'انشر حاجتك لاستقبال عروض الأسعار.' : 'Publiez votre besoin pour recevoir des devis.'}
              </p>
            </div>
          ) : (
            requests.map(req => (
              <div 
                key={req.requestId}
                onClick={() => onSelectRequest(req)}
                className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-3.5 shadow-sm hover:border-[#2563EB] dark:hover:border-blue-500 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-[#2563EB] dark:text-blue-400 uppercase tracking-wider">
                    {getCategoryTranslation(req.category, language).name}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {req.preferredDate}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1 leading-snug">{req.title}</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mb-2">{req.description}</p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {req.clientAvatar ? (
                      <img src={req.clientAvatar} alt={req.clientName} className="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-slate-600 shrink-0" />
                    ) : null}
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{req.clientName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-emerald-700 dark:text-emerald-400 text-xs">
                      ~{req.budget} {isAr ? 'درهم' : 'MAD'}
                    </span>
                    <span className="text-[10px] bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-200 font-bold">
                      {req.proposalsCount || 0} {isAr ? 'عرض' : 'offre(s)'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   PUBLISH HUB
   -------------------------------------------------------------------------- */
function PublishHubView({ 
  currentUser, 
  language = 'fr',
  onOpenPublishModal 
}: { 
  currentUser: UserDoc | null; 
  language?: 'fr' | 'ar';
  onOpenPublishModal: (mode: 'service' | 'request') => void;
}) {
  const isAr = language === 'ar';

  return (
    <div className="p-4 space-y-4">
      <div className="text-center py-3">
        <h2 className="text-lg font-black text-[#0F2942] dark:text-white">
          {isAr ? 'ما الذي ترغب في نشره؟' : 'Que souhaitez-vous publier ?'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
          {isAr 
            ? 'يتم حفظ جميع الإعلانات والطلبات بشكل دائم في قاعدة البيانات.' 
            : 'Toutes les publications sont enregistrées de façon permanente dans la base Cloud Firestore.'}
        </p>
      </div>

      <div 
        onClick={() => onOpenPublishModal('request')}
        className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60 border-2 border-blue-200 dark:border-blue-800/70 rounded-3xl p-5 cursor-pointer hover:border-[#2563EB] dark:hover:border-blue-500 transition-all group shadow-sm"
      >
        <div className="w-12 h-12 bg-[#2563EB] text-white rounded-2xl flex items-center justify-center mb-3 shadow-md group-hover:scale-105 transition-transform">
          <Briefcase className="w-6 h-6" />
        </div>
        <span className="text-[10px] bg-[#2563EB] text-white font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          {isAr ? 'للزبناء والأفراد' : 'Pour les Particuliers'}
        </span>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2">
          {isAr ? 'نشر طلب خدمة أو عمالة' : 'Publier une demande de service'}
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
          {isAr
            ? 'صف حاجتك بدقة (سباكة، كهرباء، تنظيف، دروس خاصة، صباغة...) واستقبل عروضاً مباشرة من محترفين موثوقين.'
            : 'Décrivez votre besoin (plomberie, électricité, ménage, cours) et recevez des propositions de prestataires qualifiés.'}
        </p>
      </div>

      <div 
        onClick={() => onOpenPublishModal('service')}
        className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-2 border-emerald-200 dark:border-emerald-800/70 rounded-3xl p-5 cursor-pointer hover:border-emerald-500 transition-all group shadow-sm"
      >
        <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mb-3 shadow-md group-hover:scale-105 transition-transform">
          <GraduationCap className="w-6 h-6" />
        </div>
        <span className="text-[10px] bg-emerald-700 text-white font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          {isAr ? 'للمهنيين والحرفيين والطلبة' : 'Pour les Prestataires & Étudiants'}
        </span>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2">
          {isAr ? 'عرض مهاراتي أو خدماتي' : 'Proposer mes compétences ou services'}
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
          {isAr
            ? 'انشر عروضك بالدرهم المغربي، حدد مناطق تدخلك واكسب زبناء جدد في فاس، مكناس وباقي المدن.'
            : 'Publiez vos offres en MAD, définissez vos zones d’intervention et trouvez de nouveaux clients à Fès, Meknès et environs.'}
        </p>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   MESSAGES LIST VIEW
   -------------------------------------------------------------------------- */
function MessagesListView({ 
  conversations, 
  currentUser, 
  language = 'fr',
  notifPermission = 'default',
  onRequestNotifPermission,
  onSelectChat,
  onOpenLogin
}: { 
  conversations: ConversationDoc[]; 
  currentUser: UserDoc | null; 
  language?: 'fr' | 'ar';
  notifPermission?: 'default' | 'granted' | 'denied' | 'unsupported';
  onRequestNotifPermission?: () => void;
  onSelectChat: (conv: ConversationDoc) => void;
  onOpenLogin: () => void;
}) {
  const isAr = language === 'ar';

  if (!currentUser) {
    return (
      <div className="p-8 text-center space-y-3">
        <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
          {isAr ? 'الرسائل الخاصة' : 'Messagerie Privée'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          {isAr 
            ? 'سجّل دخولك للتواصل مباشرة وسرياً مع الزبناء أو الحرفيين والمهنيين على Wasta No.'
            : 'Connectez-vous pour échanger directement avec des clients ou des prestataires sur Wasta No.'}
        </p>
        <button
          onClick={onOpenLogin}
          className="py-2.5 px-5 bg-[#0F2942] dark:bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[#1E3A8A] dark:hover:bg-blue-700"
        >
          {isAr ? 'تسجيل الدخول' : 'Se connecter'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-black text-[#0F2942] dark:text-white">
          {isAr ? 'المحادثات المباشرة' : 'Messagerie directe'}
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
          {isAr ? `${conversations.length} محادثة` : `${conversations.length} conversation(s)`}
        </span>
      </div>

      {/* Browser / Phone Notification opt-in banner */}
      {notifPermission === 'default' && onRequestNotifPermission && (
        <div className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-2xl p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <BellRing className="w-4 h-4 text-[#2563EB] dark:text-blue-400 shrink-0" />
            <p className="text-[11px] text-slate-700 dark:text-slate-200 font-semibold leading-snug">
              {isAr
                ? 'فعّل التنبيهات لتتوصل بإشعار فوري عند استلام أي رسالة جديدة.'
                : 'Activez les alertes pour être prévenu dès qu’une personne vous envoie un message.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onRequestNotifPermission}
            className="px-2.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg shrink-0 cursor-pointer"
          >
            {isAr ? 'تفعيل' : 'Activer'}
          </button>
        </div>
      )}

      {conversations.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6">
          <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {isAr ? 'لا توجد محادثات بعد' : 'Aucune conversation'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr 
              ? 'ستظهر هنا جميع رسائلك المتبادلة مع الزبناء أو مقدمي الخدمات.' 
              : 'Les échanges avec vos clients ou prestataires apparaîtront ici.'}
          </p>
        </div>
      ) : (
        conversations.map(conv => {
          const otherId = conv.participants?.find(p => p !== currentUser.uid);
          const otherName = conv.participantNames?.[otherId || ''] || (isAr ? 'جهة اتصال Wasta No' : 'Contact Wasta No');
          const unreadCount = conv.unreadCounts?.[currentUser.uid] || 0;

          return (
            <div 
              key={conv.conversationId}
              onClick={() => onSelectChat(conv)}
              className={`border rounded-2xl p-3.5 shadow-sm flex items-center gap-3 cursor-pointer transition-all ${
                unreadCount > 0
                  ? 'bg-blue-50/60 dark:bg-blue-950/40 border-[#2563EB] dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/60'
                  : 'bg-white dark:bg-slate-800/90 border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500'
              }`}
            >
              <div className="relative w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-sm text-[#0F2942] dark:text-slate-100 shrink-0">
                {otherName.charAt(0)}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-white dark:border-slate-800" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5 gap-2">
                  <h4 className={`text-xs truncate ${unreadCount > 0 ? 'font-black text-[#0F2942] dark:text-white' : 'font-bold text-slate-900 dark:text-slate-100'}`}>
                    {otherName}
                  </h4>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-full shrink-0">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <p className={`text-xs truncate ${unreadCount > 0 ? 'font-bold text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                  {conv.lastMessage || (isAr ? 'محادثة جديدة' : 'Nouvelle conversation')}
                </p>
              </div>
              <ChevronRight className={`w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 ${isAr ? 'rotate-180' : ''}`} />
            </div>
          );
        })
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   USER PROFILE & HUB VIEW (Tailored for Particulier vs Prestataire)
   -------------------------------------------------------------------------- */
function UserProfileHubView({
  currentUser,
  providerProfile,
  myServices,
  myRequests,
  myProposals,
  onOpenAuthModal,
  onOpenProfileEditor,
  onOpenAdmin,
  onUpdateProfilePhoto,
  onLogout,
  language,
  setLanguage,
  theme,
  setTheme
}: {
  currentUser: UserDoc | null;
  providerProfile: ProviderProfileDoc | null;
  myServices: ServiceDoc[];
  myRequests: ServiceRequestDoc[];
  myProposals: ProposalDoc[];
  onOpenAuthModal: (mode: 'login' | 'signup') => void;
  onOpenProfileEditor: () => void;
  onOpenAdmin: () => void;
  onUpdateProfilePhoto: (file: File) => Promise<void>;
  onLogout: () => void;
  language: 'fr' | 'ar';
  setLanguage: (l: 'fr' | 'ar') => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
}) {
  const isAr = language === 'ar';
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingPhoto(true);
    try {
      await onUpdateProfilePhoto(file);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const themeToggleRow = (
    <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
        {theme === 'dark' ? (
          <Moon className="w-4 h-4 text-amber-400" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
        <span>{isAr ? 'مظهر التطبيق' : 'Thème d’affichage'}</span>
      </span>
      <div className="flex bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-xs font-bold">
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
            theme === 'light'
              ? 'bg-[#0F2942] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sun className="w-3 h-3" />
          <span>{isAr ? 'فاتح' : 'Clair'}</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
            theme === 'dark'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Moon className="w-3 h-3" />
          <span>{isAr ? 'داكن' : 'Sombre'}</span>
        </button>
      </div>
    </div>
  );

  if (!currentUser) {
    return (
      <div className="p-6 text-center space-y-4 my-6">
        <User className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto" />
        <h2 className="text-base font-black text-[#0F2942] dark:text-white">
          {isAr ? 'فضاء Wasta No الخاص بي' : 'Mon Espace Wasta No'}
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto leading-relaxed">
          {isAr
            ? 'سجّل دخولك أو أنشئ حسابك في ثوانٍ لإدارة خدماتك، طلباتك ومحادثاتك مع الزبناء.'
            : 'Connectez-vous ou créez votre compte en quelques secondes pour gérer vos services, demandes et messages.'}
        </p>
        <div className="flex flex-col gap-2 max-w-xs mx-auto">
          <button
            onClick={() => onOpenAuthModal('login')}
            className="w-full py-2.5 bg-[#0F2942] dark:bg-blue-600 hover:bg-[#1E3A8A] dark:hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            {isAr ? 'تسجيل الدخول' : 'Se connecter'}
          </button>
          <button
            onClick={() => onOpenAuthModal('signup')}
            className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
          >
            {isAr ? 'إنشاء حساب جديد' : 'Créer un compte'}
          </button>
        </div>

        <div className="max-w-xs mx-auto pt-2 text-start">
          {themeToggleRow}
        </div>
      </div>
    );
  }

  const isPrestataire = currentUser.accountType === 'prestataire';

  return (
    <div className="p-4 space-y-4 pb-8 animate-fadeIn">
      {/* Profile Header */}
      <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 rounded-3xl p-5 shadow-sm text-center relative overflow-hidden">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="hidden"
        />
        <div className="relative w-20 h-20 mx-auto mb-2.5">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-700 border-4 border-slate-50 dark:border-slate-800 shadow flex items-center justify-center font-black text-2xl text-[#0F2942] dark:text-white overflow-hidden">
            {uploadingPhoto ? (
              <Loader2 className="w-6 h-6 text-[#2563EB] animate-spin" />
            ) : currentUser.profileImage ? (
              <img
                src={currentUser.profileImage}
                alt={currentUser.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              currentUser.fullName.charAt(0)
            )}
          </div>
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-slate-800 cursor-pointer"
            title={isAr ? 'تغيير الصورة الشخصية' : 'Modifier la photo de profil'}
            aria-label={isAr ? 'تغيير الصورة الشخصية' : 'Modifier la photo de profil'}
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
        <h2 className="text-base font-extrabold text-[#0F2942] dark:text-white">{currentUser.fullName}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {currentUser.email} • {getCityTranslation(currentUser.city, language)}, {isAr ? 'المغرب' : 'Maroc'}
        </p>

        <span className={`inline-block mt-2 px-3 py-0.5 rounded-full text-[10px] font-bold ${
          isPrestataire
            ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
            : 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300'
        }`}>
          {isPrestataire 
            ? (isAr ? 'حساب مقدم خدمات / حرفي' : 'Compte Prestataire de Services') 
            : (isAr ? 'حساب زبون / فرد' : 'Compte Particulier')}
        </span>

        {isPrestataire && (
          <div className="mt-3">
            <button
              onClick={onOpenProfileEditor}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-100 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
              <span>{isAr ? 'تعديل ملفي المهني' : 'Modifier mon profil professionnel'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Prestataire: My Published Services */}
      {isPrestataire && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {isAr ? 'خدماتي المنشورة' : 'Mes Services en ligne'}
            </h3>
            <span className="text-[11px] font-bold text-[#2563EB] dark:text-blue-400">
              {isAr ? `${myServices.length} نشطة` : `${myServices.length} actif(s)`}
            </span>
          </div>

          {myServices.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/70 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              {isAr ? 'لم تقم بنشر أي خدمة بعد.' : "Vous n'avez pas encore publié de service."}
            </p>
          ) : (
            myServices.map(s => (
              <div key={s.serviceId} className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex justify-between items-center text-xs shadow-sm">
                <span className="font-semibold text-slate-800 dark:text-slate-100 truncate mr-2">{s.title}</span>
                <span className="font-bold text-[#0F2942] dark:text-emerald-400 shrink-0">{s.price} {isAr ? 'درهم' : 'MAD'}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Particulier: My Requests */}
      {!isPrestataire && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {isAr ? 'طلباتي المنشورة' : 'Mes Demandes Publiées'}
            </h3>
            <span className="text-[11px] font-bold text-[#2563EB] dark:text-blue-400">{myRequests.length}</span>
          </div>

          {myRequests.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/70 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              {isAr ? 'لا توجد طلبات مسجلة بعد.' : 'Aucune demande enregistrée.'}
            </p>
          ) : (
            myRequests.map(r => (
              <div key={r.requestId} className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs shadow-sm space-y-1">
                <div className="flex justify-between font-bold text-slate-800 dark:text-slate-100">
                  <span className="truncate mr-2">{r.title}</span>
                  <span className="text-emerald-700 dark:text-emerald-400 capitalize">
                    {isAr ? (r.status === 'open' ? 'مفتوح' : 'مكتمل') : r.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? `تم استلام ${r.proposalsCount || 0} عروض` : `Reçu ${r.proposalsCount || 0} devis`}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Account actions & preferences */}
      <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          {isAr ? 'الإعدادات والمظهر واللغة' : 'Paramètres'}
        </h3>

        {/* Light / Dark Theme Toggle */}
        {themeToggleRow}

        {/* In-profile language switch */}
        <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
            <span>{isAr ? 'لغة التطبيق' : "Langue de l'application"}</span>
          </span>
          <div className="flex bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setLanguage('fr')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                language === 'fr'
                  ? 'bg-[#0F2942] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Français
            </button>
            <button
              onClick={() => setLanguage('ar')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                language === 'ar'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              العربية
            </button>
          </div>
        </div>
        
        {currentUser.role === 'admin' || currentUser.email === 'dkhissiabdelamine@gmail.com' ? (
          <button
            onClick={onOpenAdmin}
            className="w-full text-left py-2.5 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/70 text-purple-900 dark:text-purple-200 border border-transparent dark:border-purple-800/50 text-xs font-bold flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>{isAr ? 'لوحة تحكم الإدارة (Firestore)' : 'Ouvrir la Console Administration'}</span>
            </span>
            <ChevronRight className={`w-4 h-4 text-purple-400 ${isAr ? 'rotate-180' : ''}`} />
          </button>
        ) : null}

        <button
          onClick={onLogout}
          className="w-full text-left py-2.5 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/70 text-rose-800 dark:text-rose-300 border border-transparent dark:border-rose-800/50 text-xs font-bold flex items-center justify-between cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>{isAr ? 'تسجيل الخروج من Wasta No' : 'Se déconnecter de Wasta No'}</span>
          </span>
          <ChevronRight className={`w-4 h-4 text-rose-400 ${isAr ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
}

function LikeButton({
  likesCount = 0,
  likedBy = [],
  currentUser,
  onToggleLike,
  language = 'fr'
}: {
  likesCount?: number;
  likedBy?: string[];
  currentUser: UserDoc | null;
  onToggleLike: () => void;
  language?: 'fr' | 'ar';
}) {
  const isAr = language === 'ar';
  const isLiked = currentUser ? likedBy.includes(currentUser.uid) : false;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggleLike();
      }}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
        isLiked 
          ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-700 text-rose-600 dark:text-rose-400 shadow-xs' 
          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
      title={isLiked ? (isAr ? 'إلغاء الإعجاب' : 'Je n’aime plus') : (isAr ? 'إعجاب' : 'J’aime')}
    >
      <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-slate-400 dark:text-slate-500'} transition-transform`} />
      <span>{likesCount}</span>
    </button>
  );
}

function CommentsSection({
  parentId,
  parentType,
  comments,
  currentUser,
  language = 'fr',
  onAddComment,
  likesCount,
  likedBy = [],
  onToggleLike
}: {
  parentId: string;
  parentType: 'service' | 'request' | 'provider';
  comments: CommentDoc[];
  currentUser: UserDoc | null;
  language?: 'fr' | 'ar';
  onAddComment: (parentId: string, parentType: 'service' | 'request' | 'provider', content: string) => void;
  likesCount?: number;
  likedBy?: string[];
  onToggleLike?: () => void;
}) {
  const isAr = language === 'ar';
  const [newCommentText, setNewCommentText] = useState('');
  const filteredComments = comments.filter(c => c.parentId === parentId);
  const isLiked = currentUser ? likedBy.includes(currentUser.uid) : false;

  return (
    <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
          <span>{isAr ? `التعليقات والآراء (${filteredComments.length})` : `Commentaires & Avis (${filteredComments.length})`}</span>
        </h4>
        {likesCount !== undefined && (
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {likesCount} {isAr ? 'إعجاب' : 'J’aime'}
          </span>
        )}
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {filteredComments.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
            {isAr ? 'كن أول من يكتب تعليقاً أو رأياً حول هذا المنشور.' : 'Soyez le premier à commenter cette publication.'}
          </p>
        ) : (
          filteredComments.map(c => (
            <div key={c.commentId} className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-xl p-2.5 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-[#0F2942] dark:text-blue-300 font-black flex items-center justify-center text-[10px] overflow-hidden">
                    {c.userAvatar ? <img src={c.userAvatar} alt={c.userName} className="w-full h-full object-cover" /> : c.userName.charAt(0)}
                  </div>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{c.userName}</span>
                </div>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">{c.createdAt}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-snug pl-8">{c.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Casier pour écrire un commentaire ET à côté un cœur à toucher */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newCommentText.trim()) return;
          onAddComment(parentId, parentType, newCommentText);
          setNewCommentText('');
        }}
        className="flex items-center gap-2 pt-1"
      >
        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            value={newCommentText}
            onChange={e => setNewCommentText(e.target.value)}
            placeholder={isAr ? 'اكتب تعليقاً أو رأيك...' : 'Écrire un commentaire ou avis...'}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-9 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-all"
          />
          <button
            type="submit"
            disabled={!newCommentText.trim()}
            className="absolute right-1.5 p-1.5 bg-[#0F2942] dark:bg-blue-600 hover:bg-[#1E3A8A] dark:hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 text-white disabled:text-slate-400 dark:disabled:text-slate-500 rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs"
            title={isAr ? 'نشر التعليق' : 'Publier'}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {onToggleLike && (
          <button
            type="button"
            onClick={onToggleLike}
            className={`px-3 py-2.5 rounded-xl border flex items-center gap-1.5 transition-all duration-200 cursor-pointer shrink-0 shadow-xs active:scale-95 select-none ${
              isLiked
                ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 shadow-sm'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-500 hover:border-red-200 hover:bg-red-50/50 dark:hover:bg-red-950/40'
            }`}
            title={isLiked ? (isAr ? 'إلغاء الإعجاب' : 'Je n’aime plus') : (isAr ? 'أعجبني هذا المنشور' : 'J’aime')}
          >
            <Heart
              className={`w-5 h-5 transition-transform duration-200 ${
                isLiked
                  ? 'fill-red-600 text-red-600 scale-110 drop-shadow-[0_1px_3px_rgba(220,38,38,0.4)] animate-pulse'
                  : 'text-slate-400 dark:text-slate-500 hover:text-red-500'
              }`}
            />
            <span className={`text-xs font-black ${isLiked ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
              {likesCount ?? 0}
            </span>
          </button>
        )}
      </form>
    </div>
  );
}

function ServiceDetailModal({
  service,
  comments,
  currentUser,
  language = 'fr',
  onClose,
  onToggleLike,
  onAddComment,
  onOpenProvider
}: {
  service: ServiceDoc;
  comments: CommentDoc[];
  currentUser: UserDoc | null;
  language?: 'fr' | 'ar';
  onClose: () => void;
  onToggleLike: () => void;
  onAddComment: (parentId: string, parentType: 'service' | 'request' | 'provider', content: string) => void;
  onOpenProvider: (srv: ServiceDoc) => void;
}) {
  const isAr = language === 'ar';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl border border-transparent dark:border-slate-800">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {isAr ? 'تفاصيل الخدمة المنشورة' : 'Détail du service'}
          </h3>
          <button onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Fermer'} className="cursor-pointer">
            <XCircle className="w-5 h-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
          </button>
        </div>

        {service.images && service.images.length > 0 && (
          <div className="rounded-2xl overflow-hidden h-48 border border-slate-200 dark:border-slate-700 shadow-inner">
            <img src={service.images[0]} alt={service.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-[#2563EB] dark:text-blue-400 uppercase">
              {getCategoryTranslation(service.category, language).name} • {getCityTranslation(service.city, language)}
            </span>
            <span className="text-sm font-black text-[#0F2942] dark:text-emerald-400">
              {service.price} {isAr ? 'درهم' : 'MAD'}
            </span>
          </div>
          <h2 className="text-base font-extrabold text-[#0F2942] dark:text-white">{service.title}</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700 leading-relaxed">
            {service.description}
          </p>
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => onOpenProvider(service)}
            className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer text-center"
          >
            {isAr ? `عرض الملف التعريفي لـ ${service.providerName}` : `Voir le profil de ${service.providerName}`}
          </button>
        </div>

        <CommentsSection
          parentId={service.serviceId}
          parentType="service"
          comments={comments}
          currentUser={currentUser}
          language={language}
          onAddComment={onAddComment}
          likesCount={service.likesCount || 0}
          likedBy={service.likedBy || []}
          onToggleLike={onToggleLike}
        />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   PROVIDER PROFILE MODAL
   -------------------------------------------------------------------------- */
function ProviderProfileModal({
  provider,
  reviews,
  comments = [],
  currentUser,
  services = [],
  language = 'fr',
  onClose,
  onDirectContact,
  onToggleLike,
  onAddComment
}: {
  provider: ProviderProfileDoc;
  reviews: ReviewDoc[];
  comments?: CommentDoc[];
  currentUser?: UserDoc | null;
  services?: ServiceDoc[];
  language?: 'fr' | 'ar';
  onClose: () => void;
  onDirectContact: () => void;
  onToggleLike?: () => void;
  onAddComment?: (parentId: string, parentType: 'service' | 'request' | 'provider', content: string) => void;
}) {
  const isAr = language === 'ar';
  const [commentInput, setCommentInput] = useState('');

  // Find associated service if exists
  const associatedService = provider.serviceId
    ? services.find(s => s.serviceId === provider.serviceId)
    : services.find(s => s.providerId === provider.userId);

  const effectiveLikesCount = associatedService?.likesCount ?? provider.likesCount ?? 0;
  const effectiveLikedBy = associatedService?.likedBy ?? provider.likedBy ?? [];
  const isLiked = currentUser ? effectiveLikedBy.includes(currentUser.uid) : false;

  const effectiveParentId = associatedService?.serviceId || provider.serviceId || provider.userId;
  const effectiveParentType = associatedService || provider.serviceId ? 'service' : 'provider';

  const filteredComments = comments.filter(c => 
    c.parentId === effectiveParentId || 
    c.parentId === provider.userId ||
    (provider.serviceId && c.parentId === provider.serviceId)
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl border border-transparent dark:border-slate-800">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {isAr ? 'الملف التعريفي للمهني' : 'Profil du prestataire'}
          </h3>
          <button onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Fermer'} className="cursor-pointer">
            <XCircle className="w-5 h-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
          </button>
        </div>

        <div className="flex gap-3.5 items-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-lg text-[#0F2942] dark:text-white overflow-hidden shrink-0">
            {provider.profileImage ? (
              <img src={provider.profileImage} alt={provider.fullName} className="w-full h-full object-cover" />
            ) : (
              provider.fullName.charAt(0)
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-extrabold text-[#0F2942] dark:text-white">{provider.fullName}</h2>
              {provider.isVerified && <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-300">{provider.professionalTitle || (isAr ? 'مهني / حرفي' : 'Prestataire')}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-400">
              {getCityTranslation(provider.city as any, language)}, {isAr ? 'المغرب' : 'Maroc'}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {isAr ? 'نبذة تعريفية' : 'Présentation'}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
            {provider.description || (isAr ? 'لا يوجد وصف محدد حالياً.' : 'Aucune description rédigée.')}
          </p>
        </div>

        {/* Section Commentaires & Cœur tactile J'aime */}
        <div className="bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200/90 dark:border-slate-700 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
              <span>{isAr ? `التعليقات والآراء (${filteredComments.length})` : `Commentaires & Avis (${filteredComments.length})`}</span>
            </h4>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {effectiveLikesCount} {isAr ? 'إعجاب' : 'J’aime'}
            </span>
          </div>

          {/* Liste des commentaires existants */}
          <div className="space-y-2 max-h-40 overflow-y-auto pr-0.5">
            {filteredComments.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic py-1 bg-white dark:bg-slate-900/70 p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
                {isAr ? 'لا توجد تعليقات بعد. كن أول من يكتب تعليقاً !' : 'Aucun commentaire pour l’instant. Soyez le premier à commenter !'}
              </p>
            ) : (
              filteredComments.map(c => (
                <div key={c.commentId} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-xl p-2.5 text-xs shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-[#0F2942] dark:text-blue-300 font-black flex items-center justify-center text-[10px] overflow-hidden shrink-0">
                        {c.userAvatar ? (
                          <img src={c.userAvatar} alt={c.userName} className="w-full h-full object-cover" />
                        ) : (
                          c.userName.charAt(0)
                        )}
                      </div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[140px]">{c.userName}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 shrink-0">{c.createdAt}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed pl-8">{c.content}</p>
                </div>
              ))
            )}
          </div>

          {/* Casier pour créer un commentaire ET à côté le cœur à toucher qui se transforme en rouge si on aime le service */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!commentInput.trim() || !onAddComment) return;
              onAddComment(effectiveParentId, effectiveParentType, commentInput.trim());
              setCommentInput('');
            }}
            className="flex items-center gap-2 pt-1"
          >
            {/* Casier pour écrire un commentaire */}
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={isAr ? 'اكتب تعليقاً أو رأياً...' : 'Écrire un commentaire ou un avis...'}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-3 pr-10 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all shadow-xs"
              />
              <button
                type="submit"
                disabled={!commentInput.trim()}
                className="absolute right-1.5 p-1.5 bg-[#0F2942] dark:bg-blue-600 hover:bg-[#1E3A8A] dark:hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 text-white disabled:text-slate-400 dark:disabled:text-slate-500 rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs"
                title={isAr ? 'نشر التعليق' : 'Envoyer'}
                aria-label={isAr ? 'نشر' : 'Envoyer'}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cœur à toucher qui se transforme en rouge si on aime le service */}
            {onToggleLike && (
              <button
                type="button"
                onClick={onToggleLike}
                className={`px-3 py-2.5 rounded-xl border flex items-center gap-1.5 transition-all duration-200 cursor-pointer shrink-0 shadow-xs active:scale-95 select-none ${
                  isLiked
                    ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-500 hover:border-red-200 hover:bg-red-50/50 dark:hover:bg-red-950/40'
                }`}
                title={isLiked ? (isAr ? 'إلغاء الإعجاب بالخدمة' : 'Je n’aime plus') : (isAr ? 'أعجبتني هذه الخدمة' : 'J’aime ce service')}
                aria-label={isLiked ? 'Je n’aime plus' : 'J’aime ce service'}
              >
                <Heart
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isLiked
                      ? 'fill-red-600 text-red-600 scale-110 drop-shadow-[0_1px_3px_rgba(220,38,38,0.4)] animate-pulse'
                      : 'text-slate-400 dark:text-slate-500 hover:text-red-500'
                  }`}
                />
                <span className={`text-xs font-black ${isLiked ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                  {effectiveLikesCount}
                </span>
              </button>
            )}
          </form>
        </div>

        {/* Customer reviews */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {isAr ? `تقييمات الزبناء المعتمدة (${reviews.length})` : `Avis vérifiés (${reviews.length})`}
          </h4>
          {reviews.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
              {isAr ? 'لا توجد تقييمات مسجلة بعد لهذا الملف.' : 'Aucun avis enregistré pour l’instant.'}
            </p>
          ) : (
            reviews.map(r => (
              <div key={r.reviewId} className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 dark:text-slate-100">{r.clientName}</span>
                  <div className="flex text-amber-400">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 stroke-none" />
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">{r.comment}</p>
              </div>
            ))
          )}
        </div>

        <button 
          onClick={onDirectContact}
          className="w-full bg-[#0F2942] dark:bg-blue-600 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#1E3A8A] dark:hover:bg-blue-700 cursor-pointer shadow-md"
        >
          <MessageSquare className="w-4 h-4" />
          <span>{isAr ? 'مراسلة وتواصل مباشر' : 'Contacter par message'}</span>
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   REQUEST DETAIL MODAL
   -------------------------------------------------------------------------- */
function RequestDetailModal({
  request,
  proposals,
  currentUser,
  language = 'fr',
  onClose,
  onSendProposal,
  onAcceptProposal
}: {
  request: ServiceRequestDoc;
  proposals: ProposalDoc[];
  currentUser: UserDoc | null;
  language?: 'fr' | 'ar';
  onClose: () => void;
  onSendProposal: (price: number, message: string, eta: string) => void;
  onAcceptProposal: (proposal: ProposalDoc) => void;
}) {
  const isAr = language === 'ar';
  const [offerPrice, setOfferPrice] = useState(request.budget);
  const [offerMsg, setOfferMsg] = useState('');
  const [offerEta, setOfferEta] = useState(isAr ? 'خلال 24 ساعة' : 'D’ici 24h');
  const [showOfferForm, setShowOfferForm] = useState(false);

  const isOwner = currentUser?.uid === request.clientId;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl border border-transparent dark:border-slate-800">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {isAr ? 'تفاصيل طلب الزبون' : 'Détail de la demande client'}
          </h3>
          <button onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Fermer'} className="cursor-pointer">
            <XCircle className="w-5 h-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
          </button>
        </div>

        <div>
          <span className="text-[10px] font-bold text-[#2563EB] dark:text-blue-400 uppercase">
            {getCategoryTranslation(request.category as any, language).name} • {getCityTranslation(request.city as any, language)}
          </span>
          <h2 className="text-base font-extrabold text-[#0F2942] dark:text-white mt-0.5">{request.title}</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
            {request.description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800/60 p-2.5 rounded-xl">
            <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold block">
              {isAr ? 'الميزانية التقديرية' : 'Budget estimé'}
            </span>
            <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">{request.budget} {isAr ? 'درهم' : 'MAD'}</span>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-800/60 p-2.5 rounded-xl">
            <span className="text-[10px] text-blue-800 dark:text-blue-300 font-bold block">
              {isAr ? 'الأجل المطلوب' : 'Délai souhaité'}
            </span>
            <span className="font-bold text-blue-700 dark:text-blue-300 text-xs">{request.preferredDate}</span>
          </div>
        </div>

        {/* Proposals List */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {isAr ? `العروض المستلمة (${proposals.length})` : `Offres reçues (${proposals.length})`}
          </h4>
          {proposals.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
              {isAr ? 'لا توجد عروض مقدمة على هذا الطلب حتى الآن.' : 'Aucune offre déposée pour le moment.'}
            </p>
          ) : (
            proposals.map(prop => (
              <div key={prop.proposalId} className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 min-w-0">
                    {prop.providerAvatar ? (
                      <img src={prop.providerAvatar} alt={prop.providerName} className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-600 shrink-0" />
                    ) : null}
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{prop.providerName}</span>
                  </div>
                  <span className="text-sm font-black text-[#0F2942] dark:text-emerald-400 shrink-0">{prop.proposedPrice} {isAr ? 'درهم' : 'MAD'}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">"{prop.message}"</p>

                {isOwner && prop.status === 'pending' && (
                  <button 
                    onClick={() => onAcceptProposal(prop)}
                    className="w-full bg-emerald-600 text-white font-bold py-2 rounded-xl text-xs hover:bg-emerald-700 transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isAr ? 'قبول هذا العرض وبدء العمل' : 'Accepter cette offre & débuter'}</span>
                  </button>
                )}
                {prop.status === 'accepted' && (
                  <div className="text-center font-bold text-emerald-700 dark:text-emerald-300 text-[11px] bg-emerald-100 dark:bg-emerald-950/60 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    {isAr ? 'تم قبول العرض • المهمة قيد التنفيذ' : 'Offre acceptée • Mission en cours'}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Proposal Form for Prestataire */}
        {!isOwner && currentUser?.accountType === 'prestataire' && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            {!showOfferForm ? (
              <button 
                onClick={() => setShowOfferForm(true)}
                className="w-full bg-[#0F2942] dark:bg-blue-600 hover:bg-[#1E3A8A] dark:hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-bold cursor-pointer shadow-md"
              >
                {isAr ? 'تقديم عرض أسعار بالدرهم (MAD)' : 'Proposer un devis chiffré (MAD)'}
              </button>
            ) : (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  onSendProposal(offerPrice, offerMsg, offerEta);
                }}
                className="space-y-3 bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      {isAr ? 'السعر المقترح (درهم)' : 'Prix proposé (MAD)'}
                    </label>
                    <input 
                      type="number" 
                      value={offerPrice} 
                      onChange={e => setOfferPrice(Number(e.target.value))}
                      className="w-full p-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      {isAr ? 'الأجل المقدر' : 'Délai estimé'}
                    </label>
                    <input 
                      type="text" 
                      value={offerEta} 
                      onChange={e => setOfferEta(e.target.value)}
                      className="w-full p-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    {isAr ? 'رسالتك وضماناتك للزبون' : 'Message au client'}
                  </label>
                  <textarea 
                    value={offerMsg} 
                    onChange={e => setOfferMsg(e.target.value)}
                    placeholder={isAr ? 'اذكر خبرتك وضمانات الجودة والالتزام بالوقت...' : 'Détaillez vos garanties et votre méthodologie...'}
                    className="w-full p-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg"
                    rows={2}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowOfferForm(false)} className="flex-1 py-2 text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg font-bold cursor-pointer">
                    {isAr ? 'إلغاء' : 'Annuler'}
                  </button>
                  <button type="submit" className="flex-1 py-2 text-xs bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer">
                    {isAr ? 'إرسال العرض' : 'Envoyer le devis'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   CHAT WINDOW MODAL
   -------------------------------------------------------------------------- */
/* --------------------------------------------------------------------------
   CHAT WINDOW MODAL
   -------------------------------------------------------------------------- */
function ChatWindowModal({
  conv,
  messages,
  currentUser,
  language = 'fr',
  onClose,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onCompleteMissionAndReview
}: {
  conv: ConversationDoc;
  messages: MessageDoc[];
  currentUser: UserDoc | null;
  language?: 'fr' | 'ar';
  onClose: () => void;
  onSendMessage: (content: string, type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location', mediaUrl?: string, fileName?: string) => void;
  onEditMessage: (messageId: string, newText: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onCompleteMissionAndReview: () => void;
}) {
  const isAr = language === 'ar';
  const [inputText, setInputText] = useState('');
  const [editingMsg, setEditingMsg] = useState<MessageDoc | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [recordingAudio, setRecordingAudio] = useState(false);
  const [showVideoCallModal, setShowVideoCallModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const otherId = conv.participants?.find(p => p !== currentUser?.uid);
  const otherName = conv.participantNames?.[otherId || ''] || (isAr ? 'جهة اتصال Wasta No' : 'Contact Wasta No');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const startEdit = (msg: MessageDoc) => {
    setConfirmDeleteId(null);
    setEditingMsg(msg);
    setInputText(msg.content);
  };

  const cancelEdit = () => {
    setEditingMsg(null);
    setInputText('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'video' | 'document') => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        onSendMessage(file.name, fileType, result, file.name);
      };
      reader.readAsDataURL(file);
    } catch {
      // ignore
    }
    setShowAttachMenu(false);
  };

  const shareGpsLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
          onSendMessage(isAr ? `موقعي الحالي: ${lat.toFixed(4)}, ${lng.toFixed(4)}` : `Position GPS actuelle: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'location', mapUrl);
        },
        (err) => {
          alert(isAr ? 'تعذر تحديد موقعك الجغرافي. يجدر التأكد من تفعيل GPS.' : 'Impossible d’obtenir votre position GPS. Vérifiez que la localisation est activée.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      alert(isAr ? 'خدمة تحديد الموقع غير متوفرة على هذا المتصفح.' : 'La géolocalisation n’est pas supportée par votre navigateur.');
    }
    setShowAttachMenu(false);
  };

  const startVoiceNote = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert(isAr ? 'التسجيل الصوتي غير مدعوم على متصفحك.' : 'L’enregistrement audio n’est pas supporté par votre navigateur.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          const audioBase64 = reader.result as string;
          onSendMessage(isAr ? 'تسجيل صوتي حقيقي' : 'Message vocal (Enregistré)', 'audio', audioBase64, 'voice_note.webm');
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setRecordingAudio(true);
    } catch (err: any) {
      alert(isAr ? 'تعذر الوصول إلى الميكروفون. يجدر السماح بالإذن في المتصفح.' : 'Accès au microphone refusé ou non autorisé.');
      setRecordingAudio(false);
    }
  };

  const stopVoiceNote = () => {
    if (mediaRecorderRef.current && recordingAudio) {
      mediaRecorderRef.current.stop();
      setRecordingAudio(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col max-w-md mx-auto shadow-2xl animate-fadeIn" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-[#0F2942] dark:bg-slate-950 text-white px-4 py-3 flex items-center justify-between shadow-md border-b border-transparent dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={onClose} aria-label={isAr ? 'رجوع' : 'Retour'} className="cursor-pointer">
            <ArrowLeft className={`w-5 h-5 text-slate-300 ${isAr ? 'rotate-180' : ''}`} />
          </button>
          <div>
            <h3 className="text-xs font-bold leading-tight">{otherName}</h3>
            <span className="text-[10px] text-emerald-400 font-semibold">
              {isAr ? 'محادثة مباشرة ومحفوظة' : 'Discussion Cloud Firestore'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              window.location.href = 'tel:+212600000000';
            }}
            className="p-2 bg-white/10 hover:bg-white/20 text-emerald-300 rounded-xl cursor-pointer transition-colors"
            title={isAr ? 'اتصال هاتفي' : 'Appel téléphonique'}
          >
            <PhoneCall className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowVideoCallModal(true)}
            className="p-2 bg-white/10 hover:bg-white/20 text-blue-300 rounded-xl cursor-pointer transition-colors"
            title={isAr ? 'اتصال فيديو' : 'Appel vidéo'}
          >
            <Video className="w-4 h-4" />
          </button>
          <button 
            onClick={onCompleteMissionAndReview}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm cursor-pointer ml-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'إنهاء وتقييم' : 'Clôturer & Noter'}</span>
          </button>
        </div>
      </div>

      {/* Video Call Modal Simulation */}
      {showVideoCallModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 text-white flex flex-col items-center justify-between p-6 animate-fadeIn">
          <div className="text-center pt-8 space-y-1">
            <div className="w-20 h-20 rounded-full bg-blue-600 border-4 border-white/20 flex items-center justify-center text-2xl font-black mx-auto shadow-xl">
              {otherName.charAt(0)}
            </div>
            <h3 className="text-sm font-bold pt-2">{otherName}</h3>
            <p className="text-xs text-emerald-400 animate-pulse">{isAr ? 'جاري الاتصال بالفيديو...' : 'Appel vidéo en cours...'}</p>
          </div>

          <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-3xl h-64 flex items-center justify-center relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
              <span className="text-[11px] text-slate-300 font-medium">{isAr ? 'الكاميرا نشطة • Wasta No Secure Stream' : 'Caméra active • Flux sécurisé'}</span>
            </div>
            <Video className="w-12 h-12 text-blue-400 animate-bounce" />
          </div>

          <div className="flex gap-4 pb-6">
            <button
              onClick={() => setShowVideoCallModal(false)}
              className="py-3 px-6 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-2xl shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>{isAr ? 'إنهاء المكالمة' : 'Raccrocher'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">
            {isAr ? 'لا توجد رسائل بعد. ابدأ المحادثة الآن أو أرسل مرفقاً!' : 'Aucun message. Envoyez le premier mot ou un fichier !'}
          </div>
        ) : (
          messages.map(m => {
            const isMe = m.senderId === currentUser?.uid;
            const isDeleting = confirmDeleteId === m.messageId;
            return (
              <div key={m.messageId} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-sm ${
                  isMe ? 'bg-[#2563EB] text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none'
                }`}>
                  {m.type === 'image' && m.mediaUrl ? (
                    <div className="mb-2 rounded-xl overflow-hidden max-h-48 border border-white/20">
                      <img src={m.mediaUrl} alt="Attachment" className="w-full h-full object-cover" />
                    </div>
                  ) : m.type === 'video' && m.mediaUrl ? (
                    <div className="mb-2 rounded-xl overflow-hidden max-h-48">
                      <video src={m.mediaUrl} controls className="w-full rounded-xl" />
                    </div>
                  ) : m.type === 'audio' && m.mediaUrl ? (
                    <div className="mb-2 flex items-center gap-2 bg-black/10 p-2 rounded-xl">
                      <audio src={m.mediaUrl} controls className="h-8 w-48" />
                    </div>
                  ) : m.type === 'document' && m.mediaUrl ? (
                    <div className="mb-2">
                      <a href={m.mediaUrl} download={m.fileName || 'document.pdf'} className={`underline font-bold flex items-center gap-1.5 ${isMe ? 'text-white' : 'text-[#2563EB]'}`}>
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="truncate">{m.fileName || (isAr ? 'تحميل المستند' : 'Télécharger le document')}</span>
                      </a>
                    </div>
                  ) : m.type === 'location' && m.mediaUrl ? (
                    <div className="mb-2">
                      <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className={`underline font-bold flex items-center gap-1.5 ${isMe ? 'text-white' : 'text-[#2563EB]'}`}>
                        <Map className="w-4 h-4 shrink-0" />
                        <span>{m.content}</span>
                      </a>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                  )}

                  <div className={`flex items-center justify-between gap-3 mt-1.5 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                    <span className="text-[9px]">
                      {m.createdAt}
                      {m.isEdited && (
                        <span className="mx-1 italic opacity-90">
                          {isAr ? '(معدّلة)' : '(modifié)'}
                        </span>
                      )}
                    </span>

                    {isMe && !isDeleting && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEdit(m)}
                          className="p-0.5 rounded hover:bg-white/20 text-blue-100 hover:text-white transition-colors cursor-pointer"
                          title={isAr ? 'تعديل الرسالة' : 'Modifier le message'}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(m.messageId)}
                          className="p-0.5 rounded hover:bg-rose-500/80 text-blue-100 hover:text-white transition-colors cursor-pointer"
                          title={isAr ? 'حذف الرسالة' : 'Supprimer le message'}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isMe && isDeleting && (
                    <div className="mt-2 pt-1.5 border-t border-blue-400/40 flex items-center justify-between gap-2 text-[10px]">
                      <span className="font-semibold text-blue-50">
                        {isAr ? 'حذف هذه الرسالة؟' : 'Supprimer ce message ?'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteMessage(m.messageId);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-0.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded cursor-pointer"
                        >
                          {isAr ? 'نعم' : 'Oui'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-0.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded cursor-pointer"
                        >
                          {isAr ? 'لا' : 'Non'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Popup Menu */}
      {showAttachMenu && (
        <div className="mx-3 mb-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl grid grid-cols-4 gap-2 animate-fadeIn text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={(e) => handleFileUpload(e, e.target.files?.[0]?.type.startsWith('video') ? 'video' : 'image')}
            className="hidden"
          />
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
            onChange={(e) => handleFileUpload(e, 'document')}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center p-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/70 rounded-xl text-[#2563EB] dark:text-blue-300 text-[11px] font-bold cursor-pointer"
          >
            <Camera className="w-5 h-5 mb-1" />
            <span>{isAr ? 'صورة/فيديو' : 'Photo/Vidéo'}</span>
          </button>

          <button
            type="button"
            onClick={() => docInputRef.current?.click()}
            className="flex flex-col items-center p-2 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/70 rounded-xl text-purple-700 dark:text-purple-300 text-[11px] font-bold cursor-pointer"
          >
            <FileText className="w-5 h-5 mb-1" />
            <span>{isAr ? 'مستند/ملف' : 'Document'}</span>
          </button>

          <button
            type="button"
            onClick={shareGpsLocation}
            className="flex flex-col items-center p-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 rounded-xl text-emerald-700 dark:text-emerald-300 text-[11px] font-bold cursor-pointer"
          >
            <Map className="w-5 h-5 mb-1" />
            <span>{isAr ? 'الموقع' : 'Position'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(false);
              if (recordingAudio) {
                stopVoiceNote();
              } else {
                startVoiceNote();
              }
            }}
            className={`flex flex-col items-center p-2 rounded-xl text-[11px] font-bold cursor-pointer ${
              recordingAudio
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/70 text-amber-700 dark:text-amber-300'
            }`}
          >
            <Mic className="w-5 h-5 mb-1" />
            <span>{recordingAudio ? (isAr ? 'إيقاف التسجيل' : 'Stop') : (isAr ? 'تسجيل صوتي' : 'Vocal')}</span>
          </button>
        </div>
      )}

      {/* Editing Indicator Bar */}
      {editingMsg && (
        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/60 border-t border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Pencil className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300 block">
                {isAr ? 'تعديل الرسالة' : 'Modification du message'}
              </span>
              <span className="text-[11px] text-amber-900/80 dark:text-amber-200/80 truncate block">{editingMsg.content}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={cancelEdit}
            className="p-1 text-amber-700 dark:text-amber-300 hover:bg-amber-200/70 dark:hover:bg-amber-900/70 rounded-lg cursor-pointer"
            aria-label={isAr ? 'إلغاء التعديل' : 'Annuler'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          if (!inputText.trim()) return;
          if (editingMsg) {
            onEditMessage(editingMsg.messageId, inputText);
            cancelEdit();
          } else {
            onSendMessage(inputText);
            setInputText('');
          }
        }}
        className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={() => setShowAttachMenu(!showAttachMenu)}
          className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors cursor-pointer shrink-0"
          title={isAr ? 'إرفاق ملف أو وسائط' : 'Joindre un fichier ou média'}
          aria-label={isAr ? 'إرفاق' : 'Joindre'}
        >
          <Paperclip className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
        </button>

        <input 
          type="text" 
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder={
            editingMsg
              ? (isAr ? 'عدّل نص الرسالة...' : 'Modifiez votre message...')
              : (isAr ? 'اكتب رسالتك هنا أو أرفق ملفاً...' : 'Écrivez votre message ou joignez un fichier...')
          }
          className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border-none rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
        />
        <button 
          type="submit" 
          className={`p-2 rounded-xl text-white transition-colors cursor-pointer shrink-0 ${
            editingMsg ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#0F2942] dark:bg-blue-600 hover:bg-[#2563EB] dark:hover:bg-blue-700'
          }`}
          aria-label={editingMsg ? (isAr ? 'حفظ التعديل' : 'Enregistrer') : (isAr ? 'إرسال' : 'Envoyer')}
        >
          {editingMsg ? <Check className="w-4 h-4" /> : <Send className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />}
        </button>
      </form>
    </div>
  );
}

/* --------------------------------------------------------------------------
   DUAL PUBLISH MODAL
   -------------------------------------------------------------------------- */
function PublishModal({
  currentUser,
  selectedCity,
  defaultMode,
  language = 'fr',
  onClose,
  onCreateService,
  onCreateRequest
}: {
  currentUser: UserDoc | null;
  selectedCity: MoroccanCity;
  defaultMode: 'service' | 'request';
  language?: 'fr' | 'ar';
  onClose: () => void;
  onCreateService: (srv: any) => void;
  onCreateRequest: (req: any) => void;
}) {
  const isAr = language === 'ar';
  const [mode, setMode] = useState<'service' | 'request'>(defaultMode);

  // Form inputs
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('Maison & Réparation');
  const [city, setCity] = useState<MoroccanCity>(selectedCity);
  const [price, setPrice] = useState(150);
  const [pricingType, setPricingType] = useState<'Fixe' | 'Par heure' | 'Négociable'>('Fixe');
  const [description, setDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState(isAr ? 'خلال هذا الأسبوع' : 'Dans la semaine');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    if (mode === 'service') {
      onCreateService({
        title,
        category,
        city,
        price,
        pricingType,
        description,
        images: []
      });
    } else {
      onCreateRequest({
        title,
        category,
        city,
        budget: price,
        preferredDate,
        description
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto p-5 space-y-4 shadow-2xl border border-transparent dark:border-slate-800">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex gap-2">
            <button 
              onClick={() => setMode('service')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                mode === 'service'
                  ? 'bg-[#0F2942] dark:bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {isAr ? 'عرض خدمة مهنية' : 'Proposer un Service'}
            </button>
            <button 
              onClick={() => setMode('request')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                mode === 'request'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {isAr ? 'نشر طلب خدمة' : 'Publier une Demande'}
            </button>
          </div>
          <button onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Fermer'} className="cursor-pointer">
            <XCircle className="w-5 h-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
              {isAr ? 'عنوان الإعلان أو الطلب' : "Titre de l'annonce"}
            </label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              placeholder={
                mode === 'service' 
                  ? (isAr ? "مثال: سباك محترف وإصلاح التدفئة فاس" : "Ex: Plombier chauffagiste certifié Fès") 
                  : (isAr ? "مثال: مطلوب صباغ لغرفة وصالون 25م²" : "Ex: Recherche peintre pour salon 25m²")
              }
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                {isAr ? 'القسم' : 'Catégorie'}
              </label>
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value as ServiceCategory)}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
              >
                {SERVICE_CATEGORIES.map(c => (
                  <option key={c.name} value={c.name}>
                    {getCategoryTranslation(c.name, language).name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                {isAr ? 'المدينة' : 'Ville'}
              </label>
              <select 
                value={city} 
                onChange={e => setCity(e.target.value as MoroccanCity)}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
              >
                {MOROCCAN_CITIES.map(c => (
                  <option key={c} value={c}>
                    {getCityTranslation(c, language)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                {mode === 'service' 
                  ? (isAr ? 'السعر (درهم)' : 'Tarif (MAD)') 
                  : (isAr ? 'الميزانية التقديرية (درهم)' : 'Budget estimé (MAD)')}
              </label>
              <input 
                type="number" 
                value={price} 
                onChange={e => setPrice(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl"
                required
              />
            </div>
            <div>
              {mode === 'service' ? (
                <>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    {isAr ? 'طريقة التسعير' : 'Type de tarif'}
                  </label>
                  <select 
                    value={pricingType} 
                    onChange={e => setPricingType(e.target.value as any)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
                  >
                    <option value="Fixe">{isAr ? 'سعر ثابت' : 'Prix Fixe'}</option>
                    <option value="Par heure">{isAr ? 'بالساعة' : 'Par heure'}</option>
                    <option value="Négociable">{isAr ? 'قابل للتفاوض' : 'Négociable'}</option>
                  </select>
                </>
              ) : (
                <>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    {isAr ? 'الأجل المفضل' : 'Délai souhaité'}
                  </label>
                  <input 
                    type="text" 
                    value={preferredDate} 
                    onChange={e => setPreferredDate(e.target.value)}
                    placeholder={isAr ? "مثال: عاجل اليوم" : "Ex: Urgent aujourd'hui"}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
              {isAr ? 'الوصف والتفاصيل' : 'Description complète'}
            </label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              placeholder={isAr ? 'اذكر المهارات، الأدوات، أو شروط المهمة بالتفصيل...' : "Détaillez les compétences, l'outillage ou les détails de la mission..."}
              rows={3}
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800"
              required
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-[#0F2942] dark:bg-blue-600 hover:bg-[#1E3A8A] dark:hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            {mode === 'service' 
              ? (isAr ? 'حفظ ونشر الخدمة في Wasta No' : 'Enregistrer le service dans Firestore') 
              : (isAr ? 'نشر طلبي الآن' : 'Publier ma demande dans Firestore')}
          </button>
        </form>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   SUBMIT REVIEW MODAL
   -------------------------------------------------------------------------- */
function SubmitReviewModal({
  targetUser,
  language = 'fr',
  onClose,
  onSubmitReview
}: {
  targetUser: ProviderProfileDoc;
  language?: 'fr' | 'ar';
  onClose: () => void;
  onSubmitReview: (stars: number, comment: string) => void;
}) {
  const isAr = language === 'ar';
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl border border-transparent dark:border-slate-800">
        <div className="text-center space-y-1">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {isAr ? 'تقييم الخدمة المنجزة' : 'Évaluer la prestation'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr ? 'لصالح ' : 'Pour '}
            <span className="font-bold text-[#0F2942] dark:text-white">{targetUser.fullName}</span>
          </p>
        </div>

        <div className="flex justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map(s => (
            <button key={s} type="button" onClick={() => setStars(s)} className="cursor-pointer">
              <Star className={`w-7 h-7 ${s <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
            </button>
          ))}
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
            {isAr ? 'رأيك الصادق في العمل' : 'Votre avis sincère'}
          </label>
          <textarea 
            value={comment} 
            onChange={e => setComment(e.target.value)}
            placeholder={isAr ? 'جودة العمل، الالتزام بالوقت، احترام السعر المتفق عليه...' : 'Qualité, respect du devis en MAD, ponctualité...'}
            rows={3}
            className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl"
            required
          />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold cursor-pointer">
            {isAr ? 'إلغاء' : 'Annuler'}
          </button>
          <button 
            onClick={() => {
              if (!comment.trim()) return;
              onSubmitReview(stars, comment);
            }} 
            className="flex-1 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm cursor-pointer"
          >
            {isAr ? 'نشر التقييم' : 'Publier l’avis'}
          </button>
        </div>
      </div>
    </div>
  );
}
