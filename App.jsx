import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, addDoc, onSnapshot, updateDoc, deleteDoc,
  arrayUnion, arrayRemove, getDoc, setDoc
} from 'firebase/firestore';
import { 
  Book, Upload, Search, ChevronRight, Eye, Heart, MessageSquare, 
  User, Send, ShieldCheck, Trash2, LogIn, LogOut, Crown, Plus, 
  X, Sparkles, Flame, ThumbsUp, Bell, Award, Zap, Smile, CornerDownRight
} from 'lucide-react';

// ==========================================
// 👑 CONFIGURAÇÃO REAL DO MONARCA JEAN
// ==========================================
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

// E-mail do Soberano para permissões administrativas
const MONARCH_EMAIL = "claudiojean345@gmail.com"; 

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({ xp: 0, rank: 'E', badges: [] });
  const [mangas, setMangas] = useState([]);
  const [announcement, setAnnouncement] = useState("");
  const [view, setView] = useState('home'); 
  const [selectedManga, setSelectedManga] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [likeAnimate, setLikeAnimate] = useState(null);

  // 1. MONITOR DE USUÁRIO E RANKING
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'stats', 'profile');
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        } else {
          const initialStats = { xp: 0, rank: 'E', badges: ['Iniciante'], name: currentUser.displayName };
          await setDoc(userRef, initialStats);
          setUserData(initialStats);
        }
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. SINCRONIZAÇÃO DE MANGÁS E ANÚNCIOS
  useEffect(() => {
    const mangasRef = collection(db, 'artifacts', appId, 'public', 'data', 'mangas');
    const unsubMangas = onSnapshot(mangasRef, (snapshot) => {
      setMangas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Erro ao sincronizar mangás:", err));

    const announceRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'announcement');
    const unsubAnnounce = onSnapshot(announceRef, (doc) => {
      if (doc.exists()) setAnnouncement(doc.data().text);
    }, (err) => console.error("Erro ao sincronizar anúncios:", err));

    return () => { unsubMangas(); unsubAnnounce(); };
  }, [selectedManga]);

  const isMonarch = user && user.email === MONARCH_EMAIL;

  const gainXP = async (amount) => {
    if (!user || isMonarch) return;
    const newXP = (userData.xp || 0) + amount;
    let newRank = 'E';
    if (newXP > 100) newRank = 'D';
    if (newXP > 300) newRank = 'C';
    if (newXP > 800) newRank = 'B';
    if (newXP > 1500) newRank = 'A';
    if (newXP > 3000) newRank = 'S';

    const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'stats', 'profile');
    const updated = { ...userData, xp: newXP, rank: newRank };
    await setDoc(userRef, updated);
    setUserData(updated);
  };

  const handleLogin = async () => { try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); } };
  
  const toggleMangaLike = async (mangaId) => {
    if (!user) return alert("Faça login para curtir!");
    setLikeAnimate(mangaId);
    setTimeout(() => setLikeAnimate(null), 1000);
    const mangaRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', mangaId);
    const manga = mangas.find(m => m.id === mangaId);
    const isLiked = manga.likes?.includes(user.uid);
    await updateDoc(mangaRef, { likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
    if (!isLiked) gainXP(10);
  };

  const handleComment = async (mangaId) => {
    if (!user || !commentText.trim()) return;
    const mangaRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', mangaId);
    const manga = mangas.find(m => m.id === mangaId);

    const newComment = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.uid,
      userName: user.email === MONARCH_EMAIL ? "👑 JEAN" : user.displayName,
      userPhoto: user.photoURL,
      text: commentText,
      date: new Date().toLocaleDateString(),
      likes: [],
      replies: []
    };

    if (replyTo) {
      const updatedComments = manga.comments.map(c => {
        if (c.id === replyTo) return { ...c, replies: [...(c.replies || []), newComment] };
        return c;
      });
      await updateDoc(mangaRef, { comments: updatedComments });
      setReplyTo(null);
    } else {
      await updateDoc(mangaRef, { comments: arrayUnion(newComment) });
    }
    setCommentText('');
    gainXP(20);
  };

  const handleAddManga = async (e) => {
    e.preventDefault();
    if (!isMonarch) return;
    const formData = new FormData(e.target);
    const newManga = {
      title: formData.get('title'),
      author: "Monarca Jean",
      authorEmail: user.email,
      cover: formData.get('cover') || 'https://images.unsplash.com/photo-1614728263952-84ea206f99b6?auto=format&fit=crop&q=80&w=400',
      description: formData.get('description'),
      views: 0,
      tags: formData.get('tags').split(',').map(t => t.trim()),
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    };
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'mangas'), newManga);
    setView('home');
  };

  const deleteManga = async (mangaId) => {
    if (!isMonarch) return;
    if (!confirm("Tem certeza que deseja apagar esta obra?")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mangas', mangaId));
    setView('home');
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-blue-500 font-black animate-pulse uppercase tracking-[0.5em]">Lumi: Sincronizando Sistema...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-blue-600/30 overflow-x-hidden">
      <style>{`
        @keyframes mana-pulse { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); } 70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }
        .mana-pulse { animation: mana-pulse 1.5s infinite; }
        .glass { background: rgba(15, 15, 15, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.05); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e40af; border-radius: 10px; }
      `}</style>

      {/* MURAL DO MONARCA */}
      {(announcement || isMonarch) && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-900 py-3 px-6 flex items-center justify-center gap-4 border-b border-blue-500/30">
          <Bell className="w-4 h-4 text-blue-400 animate-bounce" />
          {isMonarch ? (
            <input 
              value={announcement} 
              onChange={async (e) => {
                setAnnouncement(e.target.value);
                const announceRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'announcement');
                await setDoc(announceRef, { text: e.target.value });
              }}
              placeholder="Poste um aviso para o reino..."
              className="bg-transparent border-none outline-none text-xs font-black text-white w-full max-w-2xl text-center placeholder:text-blue-300/30"
            />
          ) : (
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">{announcement}</span>
          )}
          <Crown className="w-4 h-4 text-yellow-500" />
        </div>
      )}

      {/* NAVBAR */}
      <nav className="glass sticky top-0 z-50 px-6 md:px-16 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setView('home')}>
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl group-hover:rotate-12 transition-all">
            <Book className="text-white w-7 h-7" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent tracking-tighter">LUMI</span>
            <span className="text-[9px] font-black text-blue-500/60 uppercase tracking-widest">Soberania Digital</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {isMonarch && (
            <button onClick={() => setView('upload')} className="bg-white text-black px-6 py-2.5 rounded-full text-[10px] font-black uppercase hover:scale-105 transition-all">Postar Obra</button>
          )}
          {!user ? (
            <button onClick={handleLogin} className="bg-blue-600 px-6 py-2.5 rounded-full text-[10px] font-black uppercase">Entrar</button>
          ) : (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded ${userData.rank === 'S' || isMonarch ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                    {isMonarch ? 'S-RANK' : `${userData.rank}-RANK`}
                  </span>
                  <span className="text-xs font-black text-white uppercase">{user.displayName.split(' ')[0]}</span>
                </div>
                {!isMonarch && <div className="w-20 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden"><div className="h-full bg-blue-600" style={{width: `${userData.xp % 100}%`}}></div></div>}
              </div>
              <img src={user.photoURL} onClick={() => signOut(auth)} className="w-11 h-11 rounded-2xl border-2 border-blue-500/20 cursor-pointer hover:border-red-500 transition-all shadow-lg" />
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-16 min-h-screen">
        {view === 'home' && (
          <div className="space-y-16 animate-in fade-in duration-1000">
            <div className="relative rounded-[40px] overflow-hidden bg-gradient-to-br from-blue-900/10 to-transparent border border-white/5 p-12 md:p-20 text-center">
              <Sparkles className="text-blue-500 w-12 h-12 mx-auto mb-6 animate-pulse" />
              <h1 className="text-6xl md:text-9xl font-black text-white uppercase tracking-tighter mb-6 leading-none">Domínio de <span className="text-blue-600">Jean</span></h1>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Portal Oficial das Obras do Soberano</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
              {mangas.map(manga => (
                <div key={manga.id} onClick={() => { setSelectedManga(manga); setView('detail'); }} className="group relative cursor-pointer">
                  <div className="aspect-[3/4.5] rounded-[32px] overflow-hidden border border-white/10 group-hover:border-blue-500 transition-all duration-500 shadow-2xl">
                    <img src={manga.cover} className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" />
                    {likeAnimate === manga.id && <div className="absolute inset-0 flex items-center justify-center"><Heart className="w-20 h-20 text-red-500 fill-red-500 animate-ping" /></div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                    <div className="absolute bottom-5 left-5 right-5">
                      <h3 className="text-white font-black text-sm uppercase tracking-tighter line-clamp-1 group-hover:text-blue-400">{manga.title}</h3>
                      <div className="flex justify-between mt-2 text-[10px] font-black text-slate-500 uppercase">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3 fill-red-500 text-red-500" /> {manga.likes?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'detail' && selectedManga && (
          <div className="animate-in slide-in-from-right-10 duration-700">
             <button onClick={() => setView('home')} className="text-slate-500 hover:text-white font-black uppercase text-[10px] mb-12 flex items-center gap-2"><ChevronRight className="rotate-180 w-4 h-4" /> Retornar</button>
             
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                <div className="lg:col-span-4 flex flex-col items-center">
                  <div className="relative group w-full">
                    <img src={selectedManga.cover} className="w-full h-[550px] object-cover rounded-[40px] shadow-2xl border border-white/10" />
                    <button onClick={() => toggleMangaLike(selectedManga.id)} className={`absolute -bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-2xl ${selectedManga.likes?.includes(user?.uid) ? 'bg-red-500 text-white mana-pulse' : 'bg-white text-black'}`}>
                      <Heart className={`w-10 h-10 ${selectedManga.likes?.includes(user?.uid) ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                  {isMonarch && (
                    <button onClick={() => deleteManga(selectedManga.id)} className="mt-20 text-red-500 flex items-center gap-2 text-[10px] font-black uppercase hover:opacity-70 transition-opacity"><Trash2 className="w-4 h-4" /> Eliminar Obra</button>
                  )}
                </div>

                <div className="lg:col-span-8 space-y-12">
                  <div>
                    <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter mb-8 leading-none">{selectedManga.title}</h1>
                    <p className="text-slate-400 text-xl font-medium leading-relaxed">{selectedManga.description}</p>
                    <div className="flex gap-4 mt-8">
                       {selectedManga.tags?.map(t => <span key={t} className="bg-blue-600/10 text-blue-400 text-[10px] font-black uppercase px-4 py-1.5 rounded-full border border-blue-500/20">{t}</span>)}
                    </div>
                  </div>

                  <section className="pt-12 border-t border-white/5 space-y-10">
                    <h2 className="text-3xl font-black text-white uppercase flex items-center gap-4"><MessageSquare className="text-blue-500 w-8 h-8" /> Diálogo de Sombras</h2>
                    
                    <div className="flex gap-4">
                      <input 
                        placeholder={user ? "Sua mensagem... (+20 XP)" : "Desperte (Login) para comentar..."}
                        className="flex-1 glass rounded-2xl px-6 py-4 text-white outline-none focus:border-blue-500 transition-all"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleComment(selectedManga.id)}
                        disabled={!user}
                      />
                      <button onClick={() => handleComment(selectedManga.id)} className="bg-blue-600 p-4 rounded-2xl shadow-xl shadow-blue-900/40 hover:bg-blue-500 transition-all active:scale-90"><Send className="w-6 h-6" /></button>
                    </div>

                    <div className="space-y-6 custom-scrollbar max-h-[600px] overflow-y-auto pr-4">
                      {selectedManga.comments?.map((c) => (
                        <div key={c.id} className="space-y-4 animate-in fade-in duration-500">
                          <div className="glass p-6 rounded-[32px]">
                            <div className="flex gap-4">
                              <img src={c.userPhoto} className="w-12 h-12 rounded-2xl border border-white/10" />
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <span className={`text-[10px] font-black uppercase tracking-widest ${c.userName.includes('JEAN') ? 'text-yellow-500' : 'text-blue-400'}`}>{c.userName}</span>
                                  <span className="text-[8px] text-slate-700 font-bold uppercase">{c.date}</span>
                                </div>
                                <p className="text-slate-300 font-medium">{c.text}</p>
                                <button onClick={() => setReplyTo(c.id)} className="mt-3 text-[9px] font-black uppercase text-slate-600 hover:text-blue-400 transition-all flex items-center gap-1"><CornerDownRight className="w-3 h-3" /> Responder</button>
                              </div>
                            </div>
                          </div>
                          {c.replies?.map(r => (
                            <div key={r.id} className="ml-12 md:ml-20 glass p-5 rounded-[28px] border-l-2 border-blue-600/50 flex gap-4 animate-in slide-in-from-left-4 duration-300">
                              <img src={r.userPhoto} className="w-8 h-8 rounded-xl opacity-80" />
                              <div className="flex-1">
                                <span className={`text-[9px] font-black uppercase ${r.userName.includes('JEAN') ? 'text-yellow-500' : 'text-indigo-400'}`}>{r.userName}</span>
                                <p className="text-slate-400 text-sm mt-1">{r.text}</p>
                              </div>
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
          <div className="max-w-3xl mx-auto glass p-12 md:p-20 rounded-[60px] animate-in zoom-in-95 duration-500">
            <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-10 flex items-center gap-4"><Crown className="text-yellow-500 w-12 h-12" /> Gravar Registro</h2>
            <form onSubmit={handleAddManga} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <input name="title" required placeholder="Título do Mangá" className="w-full bg-white/5 border border-white/5 rounded-3xl px-8 py-5 text-white font-bold outline-none focus:border-blue-500" />
                <input name="cover" placeholder="URL da Capa" className="w-full bg-white/5 border border-white/5 rounded-3xl px-8 py-5 text-white outline-none focus:border-blue-500" />
              </div>
              <textarea name="description" required rows="5" placeholder="Sinopse do Despertar..." className="w-full bg-white/5 border border-white/5 rounded-[32px] px-8 py-6 text-white outline-none focus:border-blue-500 resize-none"></textarea>
              <input name="tags" required placeholder="Ação, Fantasia, Rank-S (separado por vírgula)" className="w-full bg-white/5 border border-white/5 rounded-3xl px-8 py-5 text-white outline-none focus:border-blue-500" />
              <button type="submit" className="w-full bg-white text-black py-6 rounded-[32px] font-black uppercase text-lg tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-2xl">Publicar no Registro Eterno</button>
            </form>
          </div>
        )}
      </main>

      <footer className="py-20 text-center border-t border-white/5 bg-[#080808]">
        <div className="flex flex-col items-center gap-4 opacity-40 hover:opacity-100 transition-opacity duration-700">
           <div className="flex items-center gap-3">
             <Book className="w-5 h-5 text-blue-500" />
             <span className="font-black text-[11px] uppercase tracking-[0.5em] text-white">LUMI MANGÁS v6.0</span>
           </div>
           <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest leading-loose">
            Propriedade Intelectual do Soberano Cláudio Jean<br/>
            © 2026 - O Despertar do Legado
          </p>
        </div>
      </footer>
    </div>
  );
}

