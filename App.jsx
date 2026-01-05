import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, onSnapshot, updateDoc, deleteDoc, arrayUnion, arrayRemove, getDoc, setDoc } from 'firebase/firestore';
import { Book, MessageSquare, Send, Crown, Bell, Sparkles, LogOut, Trash2, ChevronLeft, ChevronRight, X, Info, ThumbsUp, CornerDownRight, Heart, User, Camera, Save, Settings } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyDHoYGVe2PbZW_yRWOLMlGAGMa-uncmxPM",
  authDomain: "lumimangas-a209a.firebaseapp.com",
  projectId: "lumimangas-a209a",
  storageBucket: "lumimangas-a209a.firebasestorage.app",
  messagingSenderId: "445672496100",
  appId: "1:445672496100:web:48f5d8fd7a5190065785f1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const MONARCH_EMAIL = "claudiojean345@gmail.com"; 

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ nickname: '', photo: '' });
  const [mangas, setMangas] = useState([]);
  const [announcement, setAnnouncement] = useState("");
  const [view, setView] = useState('home'); 
  const [selectedManga, setSelectedManga] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const notify = (text) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 3000);
  };

  // 1. Monitoramento de Auth e Perfil
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Carregar perfil customizado do Firestore
        const profileRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'settings', 'profile');
        const docSnap = await getDoc(profileRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        } else {
          // Criar perfil inicial se não existir
          const initial = { nickname: currentUser.displayName, photo: currentUser.photoURL };
          await setDoc(profileRef, initial);
          setProfile(initial);
        }
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Sincronização de Dados Públicos
  useEffect(() => {
    const unsubMangas = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'mangas'), (snap) => {
      setMangas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubAnnounce = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'announcement'), (d) => {
      if (d.exists()) setAnnouncement(d.data().text);
    });
    return () => { unsubMangas(); unsubAnnounce(); };
  }, []);

  const isMonarch = user && user.email === MONARCH_EMAIL;

  const handleLogin = async () => { 
    try { await signInWithPopup(auth, provider); notify("Invocação Bem-sucedida!"); } catch (e) { notify("Falha no Portal."); } 
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile');
    await updateDoc(profileRef, profile);
    setShowProfileModal(false);
    notify("Identidade Atualizada.");
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, photo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleAddManga = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const pages = f.get('pages').split(',').map(p => p.trim()).filter(p => p !== "");
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'mangas'), {
      title: f.get('title'),
      cover: f.get('cover') || 'https://via.placeholder.com/400x600?text=Lumi+Mangas',
      description: f.get('description'),
      pages: pages,
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    });
    notify("Relíquia Adicionada.");
    setView('home');
  };

  const toggleLikeManga = async (mangaId) => {
    if (!user) return notify("Acesse o sistema primeiro.");
    const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', mangaId);
    const manga = mangas.find(m => m.id === mangaId);
    const hasLiked = manga.likes?.includes(user.uid);
    await updateDoc(mRef, { likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
  };

  const handleComment = async (mangaId) => {
    if (!user || !commentText.trim()) return;
    const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', mangaId);
    const manga = mangas.find(m => m.id === mangaId);
    
    const newComment = {
      id: Date.now().toString(),
      userId: user.uid,
      userName: isMonarch ? "👑 JEAN" : (profile.nickname || user.displayName),
      userPhoto: profile.photo || user.photoURL,
      text: commentText,
      date: new Date().toLocaleDateString(),
      likes: [],
      replies: []
    };

    if (replyTo) {
      const updatedComments = manga.comments.map(c => {
        if (c.id === replyTo.id) return { ...c, replies: [...(c.replies || []), newComment] };
        return c;
      });
      await updateDoc(mRef, { comments: updatedComments });
      setReplyTo(null);
    } else {
      await updateDoc(mRef, { comments: arrayUnion(newComment) });
    }
    setCommentText('');
    notify("Sussurro Registrado.");
  };

  const toggleLikeComment = async (mangaId, commentId, isReply = false, parentId = null) => {
    if (!user) return notify("Acesse o sistema.");
    const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', mangaId);
    const manga = mangas.find(m => m.id === mangaId);
    const updatedComments = manga.comments.map(c => {
      if (!isReply && c.id === commentId) {
        const hasLiked = c.likes?.includes(user.uid);
        return { ...c, likes: hasLiked ? c.likes.filter(id => id !== user.uid) : [...(c.likes || []), user.uid] };
      }
      if (isReply && c.id === parentId) {
        const updatedReplies = c.replies.map(r => {
          if (r.id === commentId) {
            const hasLikedR = r.likes?.includes(user.uid);
            return { ...r, likes: hasLikedR ? r.likes.filter(id => id !== user.uid) : [...(r.likes || []), user.uid] };
          }
          return r;
        });
        return { ...c, replies: updatedReplies };
      }
      return c;
    });
    await updateDoc(mRef, { comments: updatedComments });
  };

  if (isLoading) return <div className="h-screen bg-[#050505] flex flex-col items-center justify-center gap-6">
    <Sparkles className="text-blue-600 w-16 h-16 animate-spin" />
    <span className="text-blue-500 font-black uppercase tracking-[0.5em] animate-pulse">Invocando Domínio...</span>
  </div>;

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-blue-600/40">
      
      {/* NOTIFICAÇÃO */}
      {notification && (
        <div className="fixed top-24 right-6 z-[100] bg-blue-600 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-10 border border-blue-400/30">
          <Sparkles className="w-5 h-5 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest">{notification}</span>
        </div>
      )}

      {/* MODAL DE PERFIL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/5 w-full max-w-md rounded-[40px] p-10 space-y-8 relative shadow-3xl">
            <button onClick={() => setShowProfileModal(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white"><X /></button>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3"><Settings className="text-blue-500" /> Identidade</h2>
            
            <div className="flex flex-col items-center gap-6">
              <div className="relative group">
                <img src={profile.photo || 'https://via.placeholder.com/150'} className="w-32 h-32 rounded-[35px] border-4 border-blue-600/20 object-cover shadow-2xl" />
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-[35px] opacity-0 group-hover:opacity-100 cursor-pointer transition-all">
                  <Camera className="text-white w-8 h-8" />
                  <input type="file" hidden accept="image/*" onChange={handlePhotoUpload} />
                </label>
              </div>
              <p className="text-[9px] font-black uppercase text-slate-500">Mude sua face para o Reino</p>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-blue-500 ml-4">Apelido (Alcunha)</label>
                <input 
                  value={profile.nickname} 
                  onChange={(e) => setProfile({...profile, nickname: e.target.value})}
                  placeholder="Como quer ser chamado?" 
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <button type="submit" className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all duration-500 flex items-center justify-center gap-3">
                <Save className="w-5 h-5" /> Selar Identidade
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MURAL */}
      {(announcement || isMonarch) && (
        <div className="bg-gradient-to-r from-blue-900/30 via-blue-600/10 to-blue-900/30 border-b border-blue-500/20 py-4 px-6 flex items-center justify-center gap-6">
          <Bell className="w-4 h-4 text-blue-400" />
          {isMonarch ? (
            <input 
              value={announcement} 
              onChange={async (e) => { 
                setAnnouncement(e.target.value); 
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'announcement'), { text: e.target.value }); 
              }} 
              placeholder="Decreto do Monarca..." 
              className="bg-transparent border-none outline-none text-[11px] font-black text-white w-full max-w-2xl text-center uppercase tracking-widest"
            />
          ) : (
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">{announcement}</span>
          )}
          <Crown className="w-4 h-4 text-yellow-500" />
        </div>
      )}

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-black/60 backdrop-blur-2xl border-b border-white/5 px-6 md:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setView('home')}>
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
            <Book className="text-white w-6 h-6" />
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-2xl font-black text-white leading-none">LUMI</span>
            <span className="text-[8px] font-bold text-blue-500 tracking-[0.4em]">MANGÁS</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {isMonarch && <button onClick={() => setView('upload')} className="bg-white text-black px-6 py-2.5 rounded-full text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">Postar</button>}
          
          {!user ? (
            <button onClick={handleLogin} className="bg-blue-600 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all">Entrar</button>
          ) : (
            <div className="flex items-center gap-3">
              <div 
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-3 bg-white/5 p-1.5 pr-4 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/10 transition-all"
              >
                <img src={profile.photo || user.photoURL} className="w-9 h-9 rounded-xl border border-blue-500/30 object-cover" alt="Perfil" />
                <span className="text-[10px] font-black text-white uppercase">{profile.nickname || user.displayName}</span>
              </div>
              <button 
                onClick={() => { signOut(auth); notify("Portal Fechado."); }} 
                className="p-3 bg-red-900/10 rounded-2xl text-red-500 hover:bg-red-600 hover:text-white transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-12">
        {/* HOME VIEW */}
        {view === 'home' && (
          <div className="space-y-16">
            <div className="rounded-[50px] bg-gradient-to-br from-blue-900/10 to-transparent border border-white/5 p-16 text-center mt-4 relative overflow-hidden">
              <Sparkles className="text-blue-500 w-12 h-12 mx-auto mb-6" />
              <h1 className="text-7xl md:text-9xl font-black text-white uppercase tracking-tighter mb-4 leading-none">REINO <span className="text-blue-600">JEAN</span></h1>
              <p className="text-slate-500 font-bold uppercase tracking-[0.5em] text-[10px] opacity-60">Sincronia Global • V4.0</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10">
              {mangas.map(m => (
                <div key={m.id} className="group relative">
                  <div 
                    onClick={() => { setSelectedManga(m); setView('detail'); setCurrentPage(0); }} 
                    className="aspect-[3/4.6] rounded-[40px] overflow-hidden border border-white/5 group-hover:border-blue-500 transition-all duration-700 shadow-2xl cursor-pointer bg-slate-900 relative"
                  >
                    <img src={m.cover} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-1000" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
                    <div className="absolute top-5 right-5 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2">
                       <Heart className={`w-3 h-3 ${m.likes?.includes(user?.uid) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                       <span className="text-[10px] font-black text-white">{m.likes?.length || 0}</span>
                    </div>
                    <div className="absolute bottom-8 left-8 right-8 text-white font-black text-xs uppercase leading-tight tracking-tight">{m.title}</div>
                  </div>
                  {isMonarch && (
                    <button onClick={async (e) => { e.stopPropagation(); await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mangas', m.id)); notify("Obra Removida."); }} className="absolute -top-3 -right-3 bg-red-600 p-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-all shadow-xl">
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DETAIL & READER VIEW */}
        {view === 'detail' && selectedManga && (
          <div className="space-y-16 animate-in fade-in duration-700">
            <button onClick={() => setView('home')} className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-500 hover:text-blue-400 transition-all">
              <ChevronLeft className="w-5 h-5" /> Retornar ao Reino
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
              <div className="lg:col-span-4 space-y-10 text-center">
                <img src={selectedManga.cover} className="w-full rounded-[50px] shadow-2xl border border-white/10" alt="Capa" />
                <button 
                  onClick={() => toggleLikeManga(selectedManga.id)}
                  className={`px-10 py-5 rounded-full flex items-center gap-3 mx-auto shadow-2xl transition-all hover:scale-110 ${selectedManga.likes?.includes(user?.uid) ? 'bg-red-600 text-white' : 'bg-white text-black font-black'}`}
                >
                  <Heart className={`w-5 h-5 ${selectedManga.likes?.includes(user?.uid) ? 'fill-white' : ''}`} />
                  <span className="text-xs uppercase font-black">{selectedManga.likes?.length || 0} Curtidas</span>
                </button>
              </div>

              <div className="lg:col-span-8 space-y-12">
                <h1 className="text-7xl md:text-9xl font-black text-white uppercase tracking-tighter leading-none mb-6">{selectedManga.title}</h1>
                <p className="text-slate-400 text-xl leading-relaxed font-medium opacity-80">{selectedManga.description}</p>
                
                <div className="space-y-10 pt-16 border-t border-white/5">
                  <h2 className="text-3xl font-black text-white uppercase flex items-center gap-5"><Book className="text-blue-500 w-8 h-8" /> Leitura</h2>
                  
                  {selectedManga.pages && selectedManga.pages.length > 0 ? (
                    <div className="space-y-8">
                      <div className="aspect-[3/4.5] w-full max-w-2xl mx-auto rounded-[40px] overflow-hidden bg-black border border-white/10 relative group">
                        <img src={selectedManga.pages[currentPage]} className="w-full h-full object-contain" alt={`Lâmina ${currentPage + 1}`} />
                        <div className="absolute inset-y-0 left-0 w-1/4 cursor-pointer" onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}></div>
                        <div className="absolute inset-y-0 right-0 w-1/4 cursor-pointer" onClick={() => setCurrentPage(prev => Math.min(selectedManga.pages.length - 1, prev + 1))}></div>
                      </div>
                      <div className="flex items-center justify-center gap-10">
                        <ChevronLeft className="w-10 h-10 cursor-pointer text-slate-500 hover:text-blue-500" onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))} />
                        <span className="text-xs font-black uppercase tracking-widest text-blue-500">Página {currentPage + 1} / {selectedManga.pages.length}</span>
                        <ChevronRight className="w-10 h-10 cursor-pointer text-slate-500 hover:text-blue-500" onClick={() => setCurrentPage(prev => Math.min(selectedManga.pages.length - 1, prev + 1))} />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-500/5 p-16 rounded-[40px] border border-red-500/10 text-center uppercase font-black text-red-500 text-xs tracking-widest">Nenhuma página vinculada.</div>
                  )}
                </div>

                {/* COMENTÁRIOS */}
                <section className="pt-20 border-t border-white/5 space-y-12">
                  <h2 className="text-3xl font-black text-white uppercase flex items-center gap-5"><MessageSquare className="text-blue-500 w-8 h-8" /> Diálogo Social</h2>
                  
                  {replyTo && (
                    <div className="bg-blue-600/20 p-4 rounded-2xl flex items-center justify-between border border-blue-500/30">
                      <span className="text-[10px] font-black uppercase text-blue-100">Respondendo a {replyTo.userName}</span>
                      <X className="w-4 h-4 cursor-pointer" onClick={() => setReplyTo(null)} />
                    </div>
                  )}

                  <div className="flex gap-6 items-center">
                    <img src={profile.photo || user?.photoURL || 'https://via.placeholder.com/150'} className="w-14 h-14 rounded-2xl object-cover" />
                    <input 
                      placeholder={user ? "Diga algo para o Reino..." : "Entre para comentar..."} 
                      className="flex-1 bg-white/5 border border-white/5 rounded-3xl px-8 py-5 text-white outline-none focus:border-blue-500 font-medium text-lg" 
                      value={commentText} 
                      onChange={(e) => setCommentText(e.target.value)}
                      disabled={!user}
                    />
                    <button 
                      onClick={() => handleComment(selectedManga.id)} 
                      className="bg-blue-600 p-5 rounded-3xl shadow-xl disabled:opacity-20"
                      disabled={!user || !commentText.trim()}
                    >
                      <Send className="w-6 h-6 text-white" />
                    </button>
                  </div>

                  <div className="space-y-10 max-h-[1000px] overflow-y-auto pr-4 custom-scroll">
                    {selectedManga.comments?.map((c) => (
                      <div key={c.id} className="space-y-4">
                        <div className="bg-white/5 p-8 rounded-[40px] border border-white/5 relative group hover:bg-white/[0.08] transition-all">
                          <div className="flex items-center gap-4 mb-4">
                            <img src={c.userPhoto} className="w-12 h-12 rounded-xl object-cover" />
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black uppercase text-blue-400">{c.userName}</span>
                              <span className="text-[8px] text-slate-600 uppercase font-black">{c.date}</span>
                            </div>
                          </div>
                          <p className="text-slate-300 text-lg mb-6 leading-relaxed">{c.text}</p>
                          <div className="flex items-center gap-8">
                            <button onClick={() => toggleLikeComment(selectedManga.id, c.id)} className={`flex items-center gap-2 text-[10px] font-black uppercase ${c.likes?.includes(user?.uid) ? 'text-blue-400' : 'text-slate-600'}`}>
                              <ThumbsUp className="w-4 h-4" /> {c.likes?.length || 0}
                            </button>
                            <button onClick={() => setReplyTo(c)} className="text-[10px] font-black uppercase text-slate-600 hover:text-white">Responder</button>
                          </div>
                          {(isMonarch || user?.uid === c.userId) && (
                            <button 
                              onClick={async () => {
                                const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', selectedManga.id);
                                await updateDoc(mRef, { comments: selectedManga.comments.filter(comm => comm.id !== c.id) });
                                notify("Comentário Dissolvido.");
                              }}
                              className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {c.replies?.map((r) => (
                          <div key={r.id} className="ml-16 bg-white/5 p-6 rounded-[35px] border-l-4 border-blue-600/40 relative group">
                            <div className="flex items-center gap-3 mb-3">
                              <img src={r.userPhoto} className="w-9 h-9 rounded-lg object-cover" />
                              <span className="text-[10px] font-black uppercase text-indigo-400">{r.userName}</span>
                            </div>
                            <p className="text-slate-400 text-md mb-4 leading-relaxed">{r.text}</p>
                            <button onClick={() => toggleLikeComment(selectedManga.id, r.id, true, c.id)} className={`flex items-center gap-2 text-[10px] font-black uppercase ${r.likes?.includes(user?.uid) ? 'text-indigo-400' : 'text-slate-600'}`}>
                              <ThumbsUp className="w-3.5 h-3.5" /> {r.likes?.length || 0}
                            </button>
                          </div>
                        ))}
                      </div>
                    )).reverse()}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* UPLOAD VIEW */}
        {view === 'upload' && isMonarch && (
          <div className="max-w-3xl mx-auto bg-white/5 p-16 rounded-[60px] border border-white/5 mt-10 shadow-3xl">
            <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-12 flex items-center gap-5"><Crown className="text-yellow-500" /> Nova Relíquia</h2>
            <form onSubmit={handleAddManga} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <input name="title" required placeholder="Título" className="bg-white/10 border border-white/10 rounded-3xl px-8 py-5 text-white outline-none focus:border-blue-500 font-bold" />
                <input name="cover" placeholder="URL da Capa" className="bg-white/10 border border-white/10 rounded-3xl px-8 py-5 text-white outline-none focus:border-blue-500" />
              </div>
              <textarea name="description" required rows="4" placeholder="Sinopse..." className="w-full bg-white/10 border border-white/10 rounded-[35px] px-8 py-6 text-white outline-none focus:border-blue-500"></textarea>
              <textarea name="pages" required rows="6" placeholder="URLs das páginas (separe por vírgula)..." className="w-full bg-white/10 border border-white/10 rounded-[35px] px-8 py-6 text-white outline-none focus:border-blue-500 text-xs font-mono"></textarea>
              <button type="submit" className="w-full bg-white text-black py-6 rounded-[35px] font-black uppercase tracking-[0.3em] hover:bg-blue-600 hover:text-white transition-all duration-700 shadow-2xl">Lançar no Reino</button>
            </form>
          </div>
        )}
      </main>

      <footer className="py-24 text-center opacity-40 text-[10px] font-black uppercase tracking-[0.5em] mt-32 border-t border-white/5">
        Lumi Mangás • Soberania de Jean • 2026
      </footer>
    </div>
  );
}

