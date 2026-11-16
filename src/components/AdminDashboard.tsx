import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  query,
  orderBy 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { 
  UserDoc, 
  ProviderProfileDoc, 
  ServiceDoc, 
  ServiceRequestDoc, 
  ProposalDoc, 
  ConversationDoc, 
  ReviewDoc 
} from '../types';
import { WastaLogo } from './WastaLogo';
import { 
  ShieldCheck, Users, Briefcase, FileText, Star, Database, 
  Search, Filter, Trash2, CheckCircle2, XCircle, AlertTriangle, 
  ArrowLeft, RefreshCw, Eye, Edit2, ShieldAlert, Sparkles, Check, X,
  Activity, BarChart3, Layers, Lock
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: UserDoc | null;
  onClose: () => void;
  onRefreshData?: () => void;
}

type AdminTab = 'overview' | 'users' | 'providers' | 'services' | 'requests' | 'reviews' | 'database';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onClose,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Real database collections state
  const [usersList, setUsersList] = useState<UserDoc[]>([]);
  const [providersList, setProvidersList] = useState<ProviderProfileDoc[]>([]);
  const [servicesList, setServicesList] = useState<ServiceDoc[]>([]);
  const [requestsList, setRequestsList] = useState<ServiceRequestDoc[]>([]);
  const [proposalsList, setProposalsList] = useState<ProposalDoc[]>([]);
  const [conversationsList, setConversationsList] = useState<ConversationDoc[]>([]);
  const [reviewsList, setReviewsList] = useState<ReviewDoc[]>([]);

  // Action status message
  const [actionAlert, setActionAlert] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Inspector modal state (for Database Browser or details)
  const [inspectModal, setInspectModal] = useState<{ title: string; data: any; collectionName?: string; docId?: string } | null>(null);

  // User edit modal
  const [editingUser, setEditingUser] = useState<UserDoc | null>(null);

  const showAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setActionAlert({ text, type });
    setTimeout(() => setActionAlert(null), 3500);
  };

  // Fetch all collections from Firestore
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [uSnap, pSnap, sSnap, rSnap, propSnap, cSnap, revSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'provider_profiles')),
        getDocs(collection(db, 'services')),
        getDocs(collection(db, 'service_requests')),
        getDocs(collection(db, 'proposals')),
        getDocs(collection(db, 'conversations')),
        getDocs(collection(db, 'reviews'))
      ]);

      setUsersList(uSnap.docs.map(d => ({ ...d.data() } as UserDoc)));
      setProvidersList(pSnap.docs.map(d => ({ ...d.data() } as ProviderProfileDoc)));
      setServicesList(sSnap.docs.map(d => ({ ...d.data() } as ServiceDoc)));
      setRequestsList(rSnap.docs.map(d => ({ ...d.data() } as ServiceRequestDoc)));
      setProposalsList(propSnap.docs.map(d => ({ ...d.data() } as ProposalDoc)));
      setConversationsList(cSnap.docs.map(d => ({ ...d.data() } as ConversationDoc)));
      setReviewsList(revSnap.docs.map(d => ({ ...d.data() } as ReviewDoc)));
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      showAlert(err.message || 'Erreur lors du chargement des données administratives.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Check admin authorization
  const isAuthorizedAdmin = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.email === 'dkhissiabdelamine@gmail.com') return true;
    if (auth.currentUser?.email === 'dkhissiabdelamine@gmail.com') return true;
    return false;
  }, [currentUser]);

  // Operations
  const handleToggleUserStatus = async (user: UserDoc) => {
    const newStatus = user.accountStatus === 'active' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        accountStatus: newStatus,
        updatedAt: new Date().toISOString()
      });
      setUsersList(usersList.map(u => u.uid === user.uid ? { ...u, accountStatus: newStatus } : u));
      showAlert(`Compte de ${user.fullName} ${newStatus === 'active' ? 'réactivé' : 'suspendu'}.`);
    } catch (err: any) {
      showAlert(err.message || 'Erreur lors de la modification du statut.', 'error');
    }
  };

  const handleToggleProviderVerification = async (provider: ProviderProfileDoc) => {
    const newVerified = !provider.isVerified;
    try {
      await updateDoc(doc(db, 'provider_profiles', provider.userId), {
        isVerified: newVerified,
        updatedAt: new Date().toISOString()
      });
      setProvidersList(providersList.map(p => p.userId === provider.userId ? { ...p, isVerified: newVerified } : p));
      showAlert(`Badge de vérification de ${provider.fullName} ${newVerified ? 'accordé' : 'retiré'}.`);
    } catch (err: any) {
      showAlert(err.message || 'Erreur lors de la mise à jour de la vérification.', 'error');
    }
  };

  const handleToggleProviderPublished = async (provider: ProviderProfileDoc) => {
    const newPublished = !provider.isPublished;
    try {
      await updateDoc(doc(db, 'provider_profiles', provider.userId), {
        isPublished: newPublished,
        updatedAt: new Date().toISOString()
      });
      setProvidersList(providersList.map(p => p.userId === provider.userId ? { ...p, isPublished: newPublished } : p));
      showAlert(`Profil de ${provider.fullName} ${newPublished ? 'publié en ligne' : 'dépublié'}.`);
    } catch (err: any) {
      showAlert(err.message || 'Erreur lors de la mise à jour du statut de publication.', 'error');
    }
  };

  const handleToggleServiceStatus = async (service: ServiceDoc) => {
    const newStatus = service.status === 'active' ? 'flagged' : 'active';
    try {
      await updateDoc(doc(db, 'services', service.serviceId), {
        status: newStatus
      });
      setServicesList(servicesList.map(s => s.serviceId === service.serviceId ? { ...s, status: newStatus } : s));
      showAlert(`Service "${service.title}" passé en statut: ${newStatus}.`);
    } catch (err: any) {
      showAlert(err.message || 'Erreur lors de la mise à jour du service.', 'error');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer définitivement ce service ?')) return;
    try {
      await deleteDoc(doc(db, 'services', serviceId));
      setServicesList(servicesList.filter(s => s.serviceId !== serviceId));
      showAlert('Service supprimé avec succès.');
    } catch (err: any) {
      showAlert(err.message || 'Erreur lors de la suppression du service.', 'error');
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette demande client ?')) return;
    try {
      await deleteDoc(doc(db, 'service_requests', requestId));
      setRequestsList(requestsList.filter(r => r.requestId !== requestId));
      showAlert('Demande client supprimée avec succès.');
    } catch (err: any) {
      showAlert(err.message || 'Erreur lors de la suppression de la demande.', 'error');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Supprimer cet avis ?')) return;
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      setReviewsList(reviewsList.filter(r => r.reviewId !== reviewId));
      showAlert('Avis modéré et supprimé.');
    } catch (err: any) {
      showAlert(err.message || 'Erreur lors de la suppression de l’avis.', 'error');
    }
  };

  const handleDeleteDocGeneric = async (collectionName: string, docId: string) => {
    if (!window.confirm(`Supprimer définitivement le document ${docId} de la collection ${collectionName} ?`)) return;
    try {
      await deleteDoc(doc(db, collectionName, docId));
      showAlert(`Document supprimé de ${collectionName}.`);
      setInspectModal(null);
      fetchAllData();
    } catch (err: any) {
      showAlert(err.message || 'Erreur lors de la suppression.', 'error');
    }
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, 'users', editingUser.uid), {
        fullName: editingUser.fullName,
        phone: editingUser.phone || '',
        city: editingUser.city,
        accountStatus: editingUser.accountStatus,
        role: editingUser.role,
        updatedAt: new Date().toISOString()
      });
      setUsersList(usersList.map(u => u.uid === editingUser.uid ? editingUser : u));
      showAlert(`Informations de ${editingUser.fullName} mises à jour.`);
      setEditingUser(null);
    } catch (err: any) {
      showAlert(err.message || 'Erreur lors de la mise à jour.', 'error');
    }
  };

  // If unauthorized
  if (!isAuthorizedAdmin) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto my-12 bg-white rounded-3xl shadow-xl border border-slate-200">
        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Accès Administrateur Restreint</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Cette interface de supervision de base de données est strictement réservée aux administrateurs autorisés de Wasta No.
        </p>
        <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
          Connecté en tant que : <span className="font-bold text-slate-800">{currentUser?.email || auth.currentUser?.email || 'Non connecté'}</span>
        </p>
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-[#0F2942] text-white text-xs font-bold rounded-xl"
        >
          Retourner à l'application
        </button>
      </div>
    );
  }

  // Filtered lists
  const filteredUsers = usersList.filter(u => {
    const matchSearch = !searchTerm || 
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.uid.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCity = filterCity === 'all' || u.city === filterCity;
    const matchStatus = filterStatus === 'all' || u.accountStatus === filterStatus;
    return matchSearch && matchCity && matchStatus;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row antialiased">
      
      {/* ----------------- SIDEBAR NAVIGATION ----------------- */}
      <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-800 flex flex-col p-4 shrink-0">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-tight">Admin Console</h1>
              <span className="text-[10px] text-emerald-400 font-semibold">Wasta No Cloud DB</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            title="Quitter la console admin"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 py-4 space-y-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overview' ? 'bg-[#2563EB] text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Vue d'ensemble</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'users' ? 'bg-[#2563EB] text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4" />
              <span>Utilisateurs</span>
            </div>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-full">{usersList.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('providers')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'providers' ? 'bg-[#2563EB] text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Briefcase className="w-4 h-4" />
              <span>Prestataires</span>
            </div>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-full">{providersList.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'services' ? 'bg-[#2563EB] text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4" />
              <span>Services en ligne</span>
            </div>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-full">{servicesList.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'requests' ? 'bg-[#2563EB] text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4" />
              <span>Demandes clients</span>
            </div>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-full">{requestsList.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'reviews' ? 'bg-[#2563EB] text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Star className="w-4 h-4" />
              <span>Avis & Modération</span>
            </div>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-full">{reviewsList.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'database' ? 'bg-[#2563EB] text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Explorateur Collections</span>
          </button>
        </nav>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center justify-between">
            <span>Admin :</span>
            <span className="font-bold text-white truncate max-w-[120px]">{currentUser?.fullName || 'Super Admin'}</span>
          </div>
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="w-full mt-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser Firestore</span>
          </button>
        </div>
      </aside>

      {/* ----------------- MAIN CONTENT AREA ----------------- */}
      <main className="flex-1 p-5 md:p-8 overflow-y-auto space-y-6">
        
        {/* Toast Alert */}
        {actionAlert && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg ${
            actionAlert.type === 'success' ? 'bg-emerald-950 border border-emerald-500 text-emerald-200' : 'bg-rose-950 border border-rose-500 text-rose-200'
          }`}>
            <span>{actionAlert.text}</span>
            <button onClick={() => setActionAlert(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ----------------- TAB: OVERVIEW ----------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-xl font-black text-white">Tableau de bord Général</h2>
              <p className="text-xs text-slate-400">Statistiques temps réel calculées depuis les collections Cloud Firestore.</p>
            </div>

            {/* Metric KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 font-bold block mb-1">Total Utilisateurs</span>
                <span className="text-2xl font-black text-white">{usersList.length}</span>
                <div className="flex gap-2 text-[10px] text-slate-400 mt-2">
                  <span>Particuliers: <b className="text-blue-400">{usersList.filter(u => u.accountType === 'particulier').length}</b></span>
                  <span>·</span>
                  <span>Prestataires: <b className="text-emerald-400">{usersList.filter(u => u.accountType === 'prestataire').length}</b></span>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 font-bold block mb-1">Services en ligne</span>
                <span className="text-2xl font-black text-emerald-400">
                  {servicesList.filter(s => s.status === 'active').length}
                </span>
                <div className="text-[10px] text-slate-400 mt-2">
                  Total créés : {servicesList.length}
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 font-bold block mb-1">Demandes Clients</span>
                <span className="text-2xl font-black text-blue-400">
                  {requestsList.length}
                </span>
                <div className="text-[10px] text-slate-400 mt-2">
                  En cours: {requestsList.filter(r => r.status === 'in_progress').length} · Ouvertes: {requestsList.filter(r => r.status === 'open').length}
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 font-bold block mb-1">Comptes Suspendus</span>
                <span className="text-2xl font-black text-rose-400">
                  {usersList.filter(u => u.accountStatus === 'suspended').length}
                </span>
                <div className="text-[10px] text-slate-400 mt-2">
                  Avis enregistrés : {reviewsList.length}
                </div>
              </div>
            </div>

            {/* Quick summary of recent activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-slate-800/60 border border-slate-700/60 p-5 rounded-2xl space-y-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Derniers Inscrits</h3>
                {usersList.length === 0 ? (
                  <p className="text-xs text-slate-500">Aucun utilisateur enregistré pour l’instant.</p>
                ) : (
                  <div className="space-y-2">
                    {usersList.slice(0, 5).map(u => (
                      <div key={u.uid} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-700/40">
                        <div>
                          <span className="font-bold text-white block">{u.fullName}</span>
                          <span className="text-[10px] text-slate-400">{u.email} • {u.city}</span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          u.accountType === 'prestataire' ? 'bg-emerald-950 text-emerald-300' : 'bg-blue-950 text-blue-300'
                        }`}>
                          {u.accountType}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-800/60 border border-slate-700/60 p-5 rounded-2xl space-y-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Derniers Services Publiés</h3>
                {servicesList.length === 0 ? (
                  <p className="text-xs text-slate-500">Aucun service publié pour le moment.</p>
                ) : (
                  <div className="space-y-2">
                    {servicesList.slice(0, 5).map(s => (
                      <div key={s.serviceId} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-700/40">
                        <div className="truncate pr-2">
                          <span className="font-bold text-white block truncate">{s.title}</span>
                          <span className="text-[10px] text-slate-400">{s.providerName} • {s.city}</span>
                        </div>
                        <span className="font-black text-emerald-400 shrink-0">{s.price} MAD</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB: USERS MANAGEMENT ----------------- */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h2 className="text-xl font-black text-white">Gestion des Utilisateurs</h2>
                <p className="text-xs text-slate-400">Recherche, modification, suspension et suppression d'utilisateurs.</p>
              </div>

              {/* Filters & Search */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Nom, email, UID..."
                    className="bg-slate-800 text-xs text-white pl-8 pr-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="bg-slate-800 text-xs text-slate-200 p-2 rounded-xl border border-slate-700"
                >
                  <option value="all">Tous statuts</option>
                  <option value="active">Actif</option>
                  <option value="suspended">Suspendu</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                    <tr>
                      <th className="p-3">Utilisateur</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Téléphone</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Ville</th>
                      <th className="p-3">Statut</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          Aucun utilisateur ne correspond aux critères.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => (
                        <tr key={u.uid} className="hover:bg-slate-750 transition-colors">
                          <td className="p-3 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span>{u.fullName}</span>
                              {u.role === 'admin' && (
                                <span className="bg-purple-900/60 text-purple-300 text-[9px] px-1.5 py-0.2 rounded font-extrabold">ADMIN</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono block">{u.uid.slice(0, 8)}...</span>
                          </td>
                          <td className="p-3">{u.email}</td>
                          <td className="p-3">{u.phone || '—'}</td>
                          <td className="p-3 capitalize">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.accountType === 'prestataire' ? 'bg-emerald-950 text-emerald-300' : 'bg-blue-950 text-blue-300'
                            }`}>
                              {u.accountType}
                            </span>
                          </td>
                          <td className="p-3">{u.city}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.accountStatus === 'active' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-rose-900/40 text-rose-400'
                            }`}>
                              {u.accountStatus === 'active' ? 'Actif' : 'Suspendu'}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-1.5">
                            <button
                              onClick={() => setEditingUser(u)}
                              className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200"
                              title="Modifier"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`p-1.5 rounded-lg text-xs font-bold ${
                                u.accountStatus === 'active' 
                                  ? 'bg-rose-950 hover:bg-rose-900 text-rose-300' 
                                  : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300'
                              }`}
                              title={u.accountStatus === 'active' ? 'Suspendre' : 'Réactiver'}
                            >
                              {u.accountStatus === 'active' ? 'Suspendre' : 'Réactiver'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB: PROVIDERS MANAGEMENT ----------------- */}
        {activeTab === 'providers' && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h2 className="text-xl font-black text-white">Gestion des Prestataires & Talents</h2>
              <p className="text-xs text-slate-400">Examen des profils professionnels, approbation du badge certifié, modération.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providersList.length === 0 ? (
                <div className="col-span-full p-8 text-center bg-slate-800 rounded-2xl text-slate-500">
                  Aucun profil de prestataire enregistré pour le moment.
                </div>
              ) : (
                providersList.map(p => (
                  <div key={p.userId} className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-2xl space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-black text-white">{p.fullName}</h4>
                        <span className="text-[11px] text-emerald-400 font-bold block">{p.professionalTitle || 'Prestataire non qualifié'}</span>
                        <span className="text-[10px] text-slate-400">{p.city} • {p.serviceArea || p.city}</span>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        p.isVerified ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {p.isVerified ? '✓ Certifié' : 'Non certifié'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 bg-slate-900/60 p-2.5 rounded-xl">
                      {p.description || 'Aucune description rédigée.'}
                    </p>

                    <div className="flex flex-wrap gap-1">
                      {(p.categories || []).map(c => (
                        <span key={c} className="text-[9px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md">
                          {c}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 text-xs">
                      <button
                        onClick={() => handleToggleProviderVerification(p)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs ${
                          p.isVerified ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {p.isVerified ? 'Retirer badge' : 'Approuver Vérifié'}
                      </button>

                      <button
                        onClick={() => handleToggleProviderPublished(p)}
                        className="text-[11px] text-slate-400 hover:text-white underline font-semibold"
                      >
                        {p.isPublished ? 'Dépublier' : 'Mettre en ligne'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ----------------- TAB: SERVICES MANAGEMENT ----------------- */}
        {activeTab === 'services' && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h2 className="text-xl font-black text-white">Modération des Services</h2>
              <p className="text-xs text-slate-400">Contrôle des tarifs en MAD, descriptions et suppression des contenus non conformes.</p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="p-3">Titre du service</th>
                    <th className="p-3">Prestataire</th>
                    <th className="p-3">Catégorie</th>
                    <th className="p-3">Prix</th>
                    <th className="p-3">Ville</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {servicesList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Aucun service enregistré dans la base de données.
                      </td>
                    </tr>
                  ) : (
                    servicesList.map(s => (
                      <tr key={s.serviceId} className="hover:bg-slate-750">
                        <td className="p-3 font-bold text-white max-w-xs truncate">{s.title}</td>
                        <td className="p-3">{s.providerName}</td>
                        <td className="p-3">{s.category}</td>
                        <td className="p-3 font-bold text-emerald-400">{s.price} MAD ({s.pricingType})</td>
                        <td className="p-3">{s.city}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === 'active' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1.5">
                          <button
                            onClick={() => handleToggleServiceStatus(s)}
                            className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200"
                            title={s.status === 'active' ? 'Signaler/Suspendre' : 'Réactiver'}
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(s.serviceId)}
                            className="p-1.5 bg-rose-950 hover:bg-rose-900 rounded-lg text-rose-300"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- TAB: SERVICE REQUESTS ----------------- */}
        {activeTab === 'requests' && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h2 className="text-xl font-black text-white">Demandes Clients (Missions)</h2>
              <p className="text-xs text-slate-400">Surveillance des besoins publiés par les particuliers à Fès, Meknès et autres villes.</p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="p-3">Titre de la demande</th>
                    <th className="p-3">Client</th>
                    <th className="p-3">Catégorie</th>
                    <th className="p-3">Budget</th>
                    <th className="p-3">Ville</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {requestsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Aucune demande client enregistrée.
                      </td>
                    </tr>
                  ) : (
                    requestsList.map(r => (
                      <tr key={r.requestId} className="hover:bg-slate-750">
                        <td className="p-3 font-bold text-white max-w-xs truncate">{r.title}</td>
                        <td className="p-3">{r.clientName}</td>
                        <td className="p-3">{r.category}</td>
                        <td className="p-3 font-bold text-emerald-400">~{r.budget} MAD</td>
                        <td className="p-3">{r.city}</td>
                        <td className="p-3 capitalize">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-950 text-blue-300 font-bold">
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1.5">
                          <button
                            onClick={() => handleDeleteRequest(r.requestId)}
                            className="p-1.5 bg-rose-950 hover:bg-rose-900 rounded-lg text-rose-300"
                            title="Supprimer la demande"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- TAB: REVIEWS & MODERATION ----------------- */}
        {activeTab === 'reviews' && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h2 className="text-xl font-black text-white">Avis & Évaluations Clients</h2>
              <p className="text-xs text-slate-400">Modération des commentaires et respect de la politique anti-diffamation.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviewsList.length === 0 ? (
                <div className="col-span-full p-8 text-center bg-slate-800 rounded-2xl text-slate-500">
                  Aucun avis rédigé pour le moment.
                </div>
              ) : (
                reviewsList.map(rev => (
                  <div key={rev.reviewId} className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{rev.clientName}</span>
                      <div className="flex text-amber-400">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 stroke-none" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 italic">"{rev.comment}"</p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-700 text-[10px] text-slate-400">
                      <span>{rev.createdAt}</span>
                      <button
                        onClick={() => handleDeleteReview(rev.reviewId)}
                        className="text-rose-400 hover:text-rose-300 font-bold underline"
                      >
                        Supprimer cet avis
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ----------------- TAB: DATABASE BROWSER (Section 7.G) ----------------- */}
        {activeTab === 'database' && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h2 className="text-xl font-black text-white">Explorateur de Base de Données Firestore</h2>
              <p className="text-xs text-slate-400">Inspection directe des 7 collections principales avec vue JSON et suppression sécurisée.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: 'users', count: usersList.length, label: 'Users' },
                { name: 'provider_profiles', count: providersList.length, label: 'Profiles' },
                { name: 'services', count: servicesList.length, label: 'Services' },
                { name: 'service_requests', count: requestsList.length, label: 'Requests' },
                { name: 'proposals', count: proposalsList.length, label: 'Proposals' },
                { name: 'conversations', count: conversationsList.length, label: 'Conversations' },
                { name: 'reviews', count: reviewsList.length, label: 'Reviews' }
              ].map(col => (
                <div key={col.name} className="p-3 bg-slate-800/70 border border-slate-700 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{col.name}</span>
                  <span className="text-xl font-black text-white block mt-0.5">{col.count} docs</span>
                </div>
              ))}
            </div>

            {/* Quick Document Inspector */}
            <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Examen des documents de la collection <span className="text-emerald-400 font-mono">users</span>
              </h3>
              <div className="space-y-2">
                {usersList.slice(0, 10).map(u => (
                  <div key={u.uid} className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-xl border border-slate-700/40 text-xs">
                    <div className="font-mono text-slate-300">
                      <span className="text-blue-400 font-bold">{u.uid}</span>
                      <span className="text-slate-500 ml-2">({u.fullName} - {u.email})</span>
                    </div>
                    <button
                      onClick={() => setInspectModal({ title: `users / ${u.uid}`, data: u, collectionName: 'users', docId: u.uid })}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg font-bold"
                    >
                      Inspecter JSON
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ----------------- JSON INSPECTOR MODAL ----------------- */}
      {inspectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 text-slate-100 w-full max-w-lg rounded-2xl border border-slate-700 p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-mono font-bold text-emerald-400">{inspectModal.title}</h3>
              <button onClick={() => setInspectModal(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            
            <pre className="flex-1 overflow-auto bg-slate-950 p-3 rounded-xl text-[11px] font-mono text-slate-300">
              {JSON.stringify(inspectModal.data, null, 2)}
            </pre>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              {inspectModal.collectionName && inspectModal.docId && (
                <button
                  onClick={() => handleDeleteDocGeneric(inspectModal.collectionName!, inspectModal.docId!)}
                  className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer de Firestore</span>
                </button>
              )}
              <button
                onClick={() => setInspectModal(null)}
                className="ml-auto px-4 py-1.5 bg-slate-800 text-slate-200 rounded-lg text-xs font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- USER EDIT MODAL ----------------- */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 text-slate-100 w-full max-w-md rounded-2xl border border-slate-700 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Modifier l'utilisateur</h3>
              <button onClick={() => setEditingUser(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Nom complet</label>
                <input
                  type="text"
                  value={editingUser.fullName}
                  onChange={e => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Téléphone</label>
                <input
                  type="text"
                  value={editingUser.phone || ''}
                  onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Ville</label>
                  <select
                    value={editingUser.city}
                    onChange={e => setEditingUser({ ...editingUser, city: e.target.value as any })}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="Fès">Fès</option>
                    <option value="Meknès">Meknès</option>
                    <option value="Rabat">Rabat</option>
                    <option value="Casablanca">Casablanca</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Statut du compte</label>
                  <select
                    value={editingUser.accountStatus}
                    onChange={e => setEditingUser({ ...editingUser, accountStatus: e.target.value as any })}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="active">Actif</option>
                    <option value="suspended">Suspendu</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2 bg-slate-800 text-xs font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
