import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, setDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { Book, Sparkles, LogOut, Bell, Crown, Heart, MessageSquare, Send, ChevronLeft, Trash2, ThumbsUp, CornerDownRight, X, Info, ChevronRight, BellRing, Smartphone } from 'lucide-react';

const firebaseConfig = {
  apiKey: "", // O ambiente fornece a chave automaticamente
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
const MONARCH_EMAIL = "claudiojean345@gmail.com";
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  const [user, setUser] = useState(null);
  const [mangas, setMangas] = useState([]);
  const [announcement, setAnnouncement] = useState("");
  const [view, setView] = useState('home'); 
  const [selectedManga, setSelectedManga] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  
  const isInitialMount = useRef(true); // Para não notificar tudo o que já existe ao carregar

  useEffect(() => {
    onAuthStateChanged(auth, (u) => setUser(u));
    
    // Monitorar Obras e Disparar Notificações de Novos Lançamentos
    const unsubMangas = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'mangas'), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (!isInitialMount.current && data.length > mangas.length && pushEnabled) {
        const newest = data[data.length - 1];
        new Notification("NOVA RELÍQUIA NO REINO!", {
          body: `O Monarca Jean lançou: ${newest.title}`,
          icon: newest.cover
        });
      }
      setMangas(data);
      isInitialMount.current = false;
    });

    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'announcement'), (d) => {
      if (d.exists()) setAnnouncement(d.data().text);
    });

    if ("Notification" in window && Notification.permission === "granted") {
      setPushEnabled(true);
    }
    
    return () => unsubMangas();
  }, [pushEnabled]);

  // Monitor de Notificações Pessoais (Likes e Respostas)
  useEffect(() => {
    if (!user) return;
    const unsubNotif = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'notifications'), (s) => {
      const notifs = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.timestamp - a.timestamp);
      
      // Se chegar notificação nova e o app estiver em segundo plano, dispara Push
      if (notifs.length > notifications.length && pushEnabled && document.hidden) {
        const latest = notifs[0];
        new Notification("INTERAÇÃO NO REINO", {
          body: `${latest.fromName} ${latest.message}`,
          icon: "https://cdn-icons-png.flaticon.com/512/3119/3119338.png"
        });
      }
      setNotifications(notifs);
    });
    return () => unsubNotif();
  }, [user, notifications.length, pushEnabled]);

  const requestPermission = () => {
    if (!("Notification" in window)) return alert("Navegador incompatível.");
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        setPushEnabled(true);
        new Notification("LUMI SISTEMA", { body: "Teia de Alerta Total Conectada!", icon: "https://cdn-icons-png.flaticon.com/512/3119/3119338.png" });
      }
    });
  };

  const login = () => signInWithPopup(auth, provider);
  const isMonarch = user && user.email === MONARCH_EMAIL;

  const createNotification = async (targetUserId, message) => {
    if (!user || user.uid === targetUserId) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', targetUserId, 'notifications'), {
      fromName: isMonarch ? "👑 JEAN" : user.displayName,
      message,
      timestamp: Date.now()
    });
  };

  const handleCommentAction = async (e) => {
    e.preventDefault();
    if (!user || !commentText.trim()) return;
    const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', selectedManga.id);
    const newEntry = {
      id: Date.now(),
      userId: user.uid,
      userName: isMonarch ? "👑 JEAN (ADM)" : user.displayName,
      userPhoto: user.photoURL,
      text: commentText,
      date: new Date().toLocaleDateString(),
      likes: [],
      replies: []
    };

    if (replyTo) {
      const updatedComments = selectedManga.comments.map(c => c.id === replyTo.id ? { ...c, replies: [...(c.replies || []), newEntry] } : c);
      await updateDoc(mRef, { comments: updatedComments });
      await createNotification(replyTo.userId, `respondeu seu comentário.`);
      setReplyTo(null);
    } else {
      await updateDoc(mRef, { comments: arrayUnion(newEntry) });
    }
    setCommentText('');
  };

  const toggleLikeComment = async (mangaId, commentId, isReply = false, parentId = null) => {
    if (!user) return;
    const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', mangaId);
    const manga = mangas.find(m => m.id === mangaId);
    let targetId = null;
    const updatedComments = manga.comments.map(c => {
      if (!isReply && c.id === commentId) {
        targetId = c.userId;
        const hasLiked = c.likes?.includes(user.uid);
        return { ...c, likes: hasLiked ? c.likes.filter(id => id !== user.uid) : [...(c.likes || []), user.uid] };
      }
      if (isReply && c.id === parentId) {
        const updatedReplies = (c.replies || []).map(r => {
          if (r.id === commentId) {
            targetId = r.userId;
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
    if (targetId) createNotification(targetId, `curtiu seu comentário.`);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-blue-600/30">
      
      {/* MURAL */}
      {(announcement || isMonarch) && (
        <div className="bg-blue-600/10 border-b border-blue-500/20 py-3 px-6 flex items-center justify-center gap-4">
          <Bell className="w-3 h-3 text-blue-400" />
          {isMonarch ? (
            <input value={announcement} onChange={(e) => {
              setAnnouncement(e.target.value);
              setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'announcement'), { text: e.target.value });
            }} className="bg-transparent border-none outline-none text-[10px] font-black text-white w-full max-w-2xl text-center uppercase tracking-widest focus:text-blue-400 transition-colors" />
          ) : <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">{announcement}</span>}
        </div>
      )}

      {/* NAVBAR */}
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto sticky top-0 bg-[#050505]/80 backdrop-blur-md z-50">
        <div onClick={() => {setView('home'); setReplyTo(null);}} className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/50 transition-all"><Book className="text-white w-6 h-6" /></div>
          <span className="text-xl font-black tracking-tighter uppercase italic text-white">Lumi</span>
        </div>
        
        <div className="flex items-center gap-4 md:gap-8">
          {!pushEnabled && user && (
            <button onClick={requestPermission} className="hidden lg:flex items-center gap-2 text-blue-500 text-[9px] font-black uppercase border border-blue-500/30 px-4 py-2 rounded-full hover:bg-blue-600 hover:text-white transition-all">
              <Smartphone className="w-3 h-3" /> Receber no Celular
            </button>
          )}

          {isMonarch && <button onClick={() => setView('upload')} className="bg-white text-black px-5 py-2 rounded-full text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-colors">Postar</button>}
          
          {user && (
            <div className="relative">
              <button onClick={() => {setShowNotifications(!showNotifications); if(!showNotifications) notifications.forEach(n => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'notifications', n.id)))}} className="p-2 hover:bg-white/5 rounded-full relative">
                <Bell className={`w-5 h-5 ${notifications.length > 0 ? 'text-blue-500 animate-pulse' : 'text-slate-500'}`} />
                {notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-4 w-72 bg-[#0a0a0a] border border-white/10 rounded-[30px] shadow-2xl p-5 z-[60] animate-in fade-in zoom-in-95">
                  <div className="text-[9px] font-black uppercase text-slate-500 mb-4 tracking-widest">Registros de Mana</div>
                  {notifications.length === 0 ? <div className="text-[10px] py-8 text-center opacity-20 uppercase font-black italic">Sem novas vibrações...</div> : 
                    notifications.map(n => (
                      <div key={n.id} className="bg-white/5 p-3 rounded-2xl mb-3 border border-white/5 last:mb-0">
                        <span className="text-[9px] font-black text-blue-500 uppercase">{n.fromName}</span>
                        <p className="text-[10px] text-slate-400 leading-snug mt-1">{n.message}</p>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          )}

          {!user ? <button onClick={login} className="bg-blue-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:scale-105 transition-transform">Entrar</button> : (
            <div className="flex items-center gap-3 bg-white/5 p-1 rounded-full pr-4 border border-white/5">
              <img src={user.photoURL} className="w-8 h-8 rounded-full border border-blue-500/30" alt="P" />
              <LogOut onClick={() => signOut(auth)} className="w-4 h-4 text-slate-500 cursor-pointer hover:text-red-500 transition-colors" />
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {view === 'home' && (
          <div className="space-y-12 animate-in fade-in duration-1000">
            <div className="rounded-[50px] bg-gradient-to-br from-blue-900/10 to-transparent border border-white/5 p-20 text-center mt-4 relative overflow-hidden">
              <Sparkles className="text-blue-500 w-12 h-12 mx-auto mb-6 animate-pulse" />
              <h1 className="text-7xl md:text-9xl font-black text-white uppercase tracking-tighter mb-4 leading-none">REINO <span className="text-blue-600">JEAN</span></h1>
              <p className="text-slate-500 font-bold uppercase tracking-[0.5em] text-[10px] opacity-60">Matriz de Comunicação Total V1.8</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10">
              {mangas.map(m => (
                <div key={m.id} className="group relative" onClick={() => { setSelectedManga(m); setView('detail'); setCurrentPage(0); }}>
                  <div className="aspect-[3/4.6] rounded-[40px] overflow-hidden border border-white/10 group-hover:border-blue-500 transition-all duration-700 shadow-2xl relative bg-slate-900 cursor-pointer">
                    <img src={m.cover} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-1000" alt={m.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
                    {isMonarch && <button onClick={async (e) => { e.stopPropagation(); await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mangas', m.id)); }} className="absolute top-5 right-5 z-20 bg-red-600/80 p-2.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"><Trash2 className="w-4 h-4 text-white" /></button>}
                    <div className="absolute bottom-8 left-8 right-8 text-white font-black text-sm uppercase tracking-tight">{m.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'detail' && selectedManga && (
          <div className="max-w-5xl mx-auto space-y-16 animate-in slide-in-from-bottom-10 duration-700">
            <button onClick={() => {setView('home'); setReplyTo(null);}} className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all"><ChevronLeft className="w-5 h-5" /> Voltar ao Início</button>
            <div className="grid md:grid-cols-12 gap-16">
              <div className="md:col-span-4 space-y-8">
                <img src={selectedManga.cover} className="rounded-[50px] shadow-2xl border border-white/10 w-full" alt="C" />
                <button onClick={async () => {
                  if(!user) return;
                  const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', selectedManga.id);
                  const hasLiked = selectedManga.likes?.includes(user.uid);
                  await updateDoc(mRef, { likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
                }} className={`w-full flex items-center justify-center gap-3 py-5 rounded-3xl font-black text-xs uppercase transition-all shadow-xl ${selectedManga.likes?.includes(user?.uid) ? 'bg-red-600 text-white' : 'bg-white text-black'}`}>
                  <Heart className={selectedManga.likes?.includes(user?.uid) ? 'fill-white' : ''} /> {selectedManga.likes?.length || 0} Curtidas
                </button>
              </div>

              <div className="md:col-span-8 space-y-12">
                <h1 className="text-6xl font-black uppercase tracking-tighter leading-none text-white">{selectedManga.title}</h1>
                <p className="text-slate-400 text-xl leading-relaxed font-medium italic opacity-80">{selectedManga.description || "Nenhuma crônica registrada para esta obra."}</p>
                
                {/* LEITOR DE PÁGINAS */}
                <div className="pt-16 border-t border-white/5 space-y-8">
                  <h3 className="text-2xl font-black uppercase text-blue-500 flex items-center gap-4"><Info className="w-6 h-6" /> Pergaminhos da Obra</h3>
                  {selectedManga.pages && selectedManga.pages.length > 0 ? (
                    <div className="space-y-6">
                      <div className="aspect-[3/4.6] w-full max-w-lg mx-auto rounded-[40px] overflow-hidden bg-black relative border border-white/10 shadow-2xl group">
                        <img src={selectedManga.pages[currentPage]} className="w-full h-full object-contain select-none" alt="P" />
                        <div className="absolute inset-y-0 left-0 w-1/3 cursor-pointer" onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}></div>
                        <div className="absolute inset-y-0 right-0 w-1/3 cursor-pointer" onClick={() => setCurrentPage(prev => Math.min(selectedManga.pages.length - 1, prev + 1))}></div>
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl border border-white/10 px-6 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                           <span className="text-[10px] font-black uppercase text-white tracking-widest">{currentPage + 1} / {selectedManga.pages.length}</span>
                        </div>
                      </div>
                      <div className="flex justify-center items-center gap-12">
                        <ChevronLeft onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))} className="w-10 h-10 cursor-pointer text-slate-600 hover:text-blue-500 transition-all" />
                        <span className="text-xs font-black uppercase text-blue-500 tracking-[0.3em]">Lâmina {currentPage + 1}</span>
                        <ChevronRight onClick={() => setCurrentPage(prev => Math.min(selectedManga.pages.length - 1, prev + 1))} className="w-10 h-10 cursor-pointer text-slate-600 hover:text-blue-500 transition-all" />
                      </div>
                    </div>
                  ) : <div className="p-20 border border-white/5 rounded-[40px] text-center opacity-20 text-[10px] font-black uppercase tracking-widest italic">Acesso Negado: Sem dados de imagem.</div>}
                </div>

                {/* COMENTÁRIOS */}
                <section className="pt-16 border-t border-white/5 space-y-10">
                  <h3 className="text-2xl font-black uppercase text-blue-500 flex items-center gap-4"><MessageSquare className="w-6 h-6" /> Vozes do Reino</h3>
                  {replyTo && (
                    <div className="bg-blue-600/20 p-5 rounded-3xl flex justify-between items-center text-[10px] font-black uppercase border border-blue-500/30 animate-in fade-in slide-in-from-top-2">
                      <span className="flex items-center gap-3 text-blue-100"><CornerDownRight className="w-4 h-4" /> Respondendo a {replyTo.userName}</span>
                      <X onClick={() => setReplyTo(null)} className="cursor-pointer hover:text-white" />
                    </div>
                  )}
                  <form onSubmit={handleCommentAction} className="flex gap-4">
                    <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder={user ? "Sussurre ao reino..." : "Faça login para interagir..."} disabled={!user} className="flex-1 bg-white/5 border border-white/5 rounded-3xl px-8 py-5 outline-none focus:border-blue-500 transition-all text-lg shadow-inner" />
                    <button type="submit" disabled={!user || !commentText.trim()} className="bg-blue-600 p-5 rounded-3xl shadow-xl hover:scale-110 transition-transform active:scale-95"><Send className="w-6 h-6 text-white" /></button>
                  </form>
                  <div className="space-y-6 max-h-[1000px] overflow-y-auto pr-6 custom-scroll">
                    {(selectedManga.comments || []).map(c => (
                      <div key={c.id} className="space-y-4">
                        <div className="bg-white/5 p-8 rounded-[40px] border border-white/5 relative group hover:bg-white/10 transition-all shadow-lg">
                          <div className="flex justify-between items-start">
                            <div className="flex gap-5">
                              <img src={c.userPhoto} className="w-14 h-14 rounded-2xl object-cover shadow-xl" alt="P" />
                              <div className="space-y-2">
                                <div className="text-[11px] font-black text-blue-400 uppercase tracking-tighter">{c.userName} <span className="text-slate-600 ml-4">{c.date}</span></div>
                                <div className="text-lg text-slate-200 font-medium leading-relaxed">{c.text}</div>
                                <div className="flex gap-8 pt-2">
                                  <button onClick={() => toggleLikeComment(selectedManga.id, c.id)} className={`flex items-center gap-2 text-[10px] font-black uppercase transition-all ${c.likes?.includes(user?.uid) ? 'text-blue-500 scale-110' : 'text-slate-600 hover:text-white'}`}><ThumbsUp className={`w-4 h-4 ${c.likes?.includes(user?.uid) ? 'fill-blue-500' : ''}`} /> {c.likes?.length || 0}</button>
                                  <button onClick={() => setReplyTo(c)} className="text-[10px] font-black uppercase text-slate-600 hover:text-blue-400 transition-colors">Responder</button>
                                </div>
                              </div>
                            </div>
                            {isMonarch && <Trash2 onClick={async () => { const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', selectedManga.id); await updateDoc(mRef, { comments: selectedManga.comments.filter(com => com.id !== c.id) }); }} className="w-5 h-5 text-slate-700 hover:text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" />}
                          </div>
                        </div>
                        {c.replies?.map(r => (
                          <div key={r.id} className="ml-16 bg-blue-900/5 p-6 rounded-[35px] border-l-4 border-blue-600/30 flex justify-between items-start group shadow-md">
                            <div className="flex gap-4">
                              <img src={r.userPhoto} className="w-10 h-10 rounded-xl object-cover" alt="P" />
                              <div className="space-y-1">
                                <div className="text-[9px] font-black text-indigo-400 uppercase">{r.userName} <span className="text-slate-700 ml-3 italic">{r.date}</span></div>
                                <div className="text-base text-slate-300 font-medium">{r.text}</div>
                                <button onClick={() => toggleLikeComment(selectedManga.id, r.id, true, c.id)} className={`flex items-center gap-2 text-[9px] font-black mt-2 transition-all ${r.likes?.includes(user?.uid) ? 'text-blue-400' : 'text-slate-700 hover:text-slate-200'}`}><ThumbsUp className={`w-3 h-3 ${r.likes?.includes(user?.uid) ? 'fill-blue-400' : ''}`} /> {r.likes?.length || 0}</button>
                              </div>
                            </div>
                            {isMonarch && <Trash2 onClick={async () => { const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', selectedManga.id); const updated = selectedManga.comments.map(com => com.id === c.id ? { ...com, replies: com.replies.filter(rep => rep.id !== r.id) } : com); await updateDoc(mRef, { comments: updated }); }} className="w-4 h-4 text-slate-800 hover:text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" />}
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

        {view === 'upload' && isMonarch && (
          <div className="max-w-2xl mx-auto bg-white/5 p-16 rounded-[60px] border border-white/5 mt-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500">
            <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-12 flex items-center gap-6"><Crown className="text-yellow-500 w-12 h-12" /> Forja de Relíquias</h2>
            <form onSubmit={handleAddManga} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-[0.3em]">Identificador da Obra</label>
                <input name="t" placeholder="Título Épico" required className="w-full bg-white/10 border border-white/10 rounded-3xl px-8 py-5 text-white font-bold text-xl outline-none focus:border-blue-600 transition-all" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-[0.3em]">Portal de Capa (URL)</label>
                <input name="c" placeholder="Link da Imagem" required className="w-full bg-white/10 border border-white/10 rounded-3xl px-8 py-5 text-white outline-none focus:border-blue-600" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-[0.3em]">Sinopse da Crônica</label>
                <textarea name="d" placeholder="A lenda que será contada..." className="w-full bg-white/10 border border-white/10 rounded-3xl px-8 py-5 text-white h-32 outline-none focus:border-blue-600 font-medium" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-[0.3em]">Pergaminhos (Páginas - URL separada por vírgula)</label>
                <textarea name="p" placeholder="Página 1, Página 2, Página 3..." className="w-full bg-white/10 border border-white/10 rounded-3xl px-8 py-5 text-white h-48 text-xs font-mono outline-none focus:border-blue-600" />
              </div>
              <button type="submit" className="w-full bg-white text-black py-6 rounded-3xl font-black uppercase tracking-[0.4em] shadow-2xl shadow-blue-900/40 hover:bg-blue-600 hover:text-white transition-all duration-700 hover:scale-[1.02]">Imortalizar e Notificar</button>
            </form>
          </div>
        )}
      </main>
      <footer className="py-24 text-center opacity-10 text-[8px] font-black uppercase tracking-[1em] border-t border-white/5 mt-40">Lumi Mangás • Soberania Total de Jean • 2026</footer>
    </div>
  );
}

