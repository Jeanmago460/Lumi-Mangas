import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, setDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { Book, Sparkles, LogOut, Bell, Crown, Heart, MessageSquare, Send, ChevronLeft, Trash2, ThumbsUp, CornerDownRight, X } from 'lucide-react';

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
const MONARCH_EMAIL = "claudiojean345@gmail.com";
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  const [user, setUser] = useState(null);
  const [mangas, setMangas] = useState([]);
  const [announcement, setAnnouncement] = useState("");
  const [view, setView] = useState('home'); 
  const [selectedManga, setSelectedManga] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null); // Estado para saber quem estamos respondendo

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    const unsubMangas = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'mangas'), (s) => {
      setMangas(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubAnnounce = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'announcement'), (d) => {
      if (d.exists()) setAnnouncement(d.data().text);
    });
    return () => { unsubAuth(); unsubMangas(); unsubAnnounce(); };
  }, []);

  useEffect(() => {
    if (selectedManga) {
      const updated = mangas.find(m => m.id === selectedManga.id);
      if (updated) setSelectedManga(updated);
    }
  }, [mangas]);

  const login = () => signInWithPopup(auth, provider);
  const isMonarch = user && user.email === MONARCH_EMAIL;

  const updateMural = async (text) => {
    setAnnouncement(text);
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'announcement'), { text });
  };

  const toggleLikeManga = async (manga) => {
    if (!user) return;
    const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', manga.id);
    const hasLiked = manga.likes?.includes(user.uid);
    await updateDoc(mRef, { likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
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
      // Se estivermos respondendo a um comentário
      const updatedComments = selectedManga.comments.map(c => {
        if (c.id === replyTo.id) {
          return { ...c, replies: [...(c.replies || []), newEntry] };
        }
        return c;
      });
      await updateDoc(mRef, { comments: updatedComments });
      setReplyTo(null);
    } else {
      // Comentário novo principal
      await updateDoc(mRef, { comments: arrayUnion(newEntry) });
    }
    setCommentText('');
  };

  const toggleLikeComment = async (mangaId, commentId, isReply = false, parentId = null) => {
    if (!user) return;
    const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', mangaId);
    const manga = mangas.find(m => m.id === mangaId);
    
    const updatedComments = manga.comments.map(c => {
      if (!isReply && c.id === commentId) {
        const hasLiked = c.likes?.includes(user.uid);
        return { ...c, likes: hasLiked ? c.likes.filter(id => id !== user.uid) : [...(c.likes || []), user.uid] };
      }
      if (isReply && c.id === parentId) {
        const updatedReplies = (c.replies || []).map(r => {
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

  const handleDeleteManga = async (id, e) => {
    e.stopPropagation();
    if (!isMonarch) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mangas', id));
  };

  const handleDeleteComment = async (mangaId, commentId, isReply = false, parentId = null) => {
    if (!isMonarch) return;
    const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', mangaId);
    const manga = mangas.find(m => m.id === mangaId);
    
    let updatedComments;
    if (isReply) {
      updatedComments = manga.comments.map(c => {
        if (c.id === parentId) {
          return { ...c, replies: c.replies.filter(r => r.id !== commentId) };
        }
        return c;
      });
    } else {
      updatedComments = manga.comments.filter(c => c.id !== commentId);
    }
    
    await updateDoc(mRef, { comments: updatedComments });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* MURAL */}
      {(announcement || isMonarch) && (
        <div className="bg-blue-600/10 border-b border-blue-500/20 py-3 px-6 flex items-center justify-center gap-4">
          <Bell className="w-3 h-3 text-blue-400" />
          {isMonarch ? (
            <input 
              value={announcement} 
              onChange={(e) => updateMural(e.target.value)} 
              placeholder="Digite um decreto..." 
              className="bg-transparent border-none outline-none text-[10px] font-black text-white w-full max-w-2xl text-center uppercase tracking-widest"
            />
          ) : (
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">{announcement}</span>
          )}
        </div>
      )}

      {/* NAVBAR */}
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto sticky top-0 bg-[#050505]/80 backdrop-blur-md z-50">
        <div onClick={() => {setView('home'); setReplyTo(null);}} className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/50 transition-all"><Book className="text-white w-6 h-6" /></div>
          <span className="text-xl font-black tracking-tighter uppercase">Lumi</span>
        </div>
        <div className="flex items-center gap-4">
          {isMonarch && <button onClick={() => setView('upload')} className="bg-white text-black px-5 py-2 rounded-full text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-colors">Postar</button>}
          {!user ? (
            <button onClick={login} className="bg-blue-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Entrar</button>
          ) : (
            <div className="flex items-center gap-3 bg-white/5 p-1 rounded-full pr-4 border border-white/5">
              <img src={user.photoURL} className="w-8 h-8 rounded-full border border-blue-500/30" alt="Perfil" />
              <LogOut onClick={() => signOut(auth)} className="w-4 h-4 text-slate-500 cursor-pointer hover:text-red-500 transition-colors" />
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {view === 'home' && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <div className="rounded-[40px] bg-gradient-to-br from-blue-900/10 to-transparent border border-white/5 p-16 text-center mt-4 relative overflow-hidden">
              <Sparkles className="text-blue-500 w-10 h-10 mx-auto mb-4 animate-pulse" />
              <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter mb-2 leading-none">REINO <span className="text-blue-600">JEAN</span></h1>
              <p className="text-slate-500 font-bold uppercase tracking-[0.5em] text-[9px] opacity-60">Sincronia Estabilizada V1.4</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
              {mangas.map(m => (
                <div key={m.id} className="group relative">
                  <div onClick={() => { setSelectedManga(m); setView('detail'); }} className="aspect-[3/4.5] rounded-3xl overflow-hidden border border-white/10 group-hover:border-blue-500 transition-all shadow-2xl relative bg-slate-900 cursor-pointer">
                    <img src={m.cover} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt={m.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
                    {isMonarch && (
                      <button onClick={(e) => handleDeleteManga(m.id, e)} className="absolute top-4 right-4 z-20 bg-red-600/80 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"><Trash2 className="w-4 h-4 text-white" /></button>
                    )}
                    <div className="absolute bottom-6 left-6 right-6 text-white font-black text-xs uppercase tracking-tight">{m.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'detail' && selectedManga && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in slide-in-from-bottom-4 duration-500">
            <button onClick={() => {setView('home'); setReplyTo(null);}} className="flex items-center gap-2 text-xs font-black uppercase text-slate-500 hover:text-white transition-all"><ChevronLeft className="w-4 h-4" /> Voltar</button>
            <div className="grid md:grid-cols-12 gap-12">
              <div className="md:col-span-4 space-y-6">
                <img src={selectedManga.cover} className="rounded-3xl shadow-2xl border border-white/10 w-full" alt="Capa" />
                <button onClick={() => toggleLikeManga(selectedManga)} className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase transition-all ${selectedManga.likes?.includes(user?.uid) ? 'bg-red-600 text-white' : 'bg-white text-black'}`}>
                  <Heart className={`w-4 h-4 ${selectedManga.likes?.includes(user?.uid) ? 'fill-white' : ''}`} /> {selectedManga.likes?.length || 0} Curtidas
                </button>
              </div>

              <div className="md:col-span-8 space-y-10">
                <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">{selectedManga.title}</h1>
                
                {/* ÁREA DE COMENTÁRIOS SOCIAIS */}
                <div className="pt-10 border-t border-white/5 space-y-8">
                  <h3 className="text-xl font-black uppercase flex items-center gap-3"><MessageSquare className="text-blue-500" /> Ressonância Social</h3>
                  
                  {/* INDICADOR DE RESPOSTA */}
                  {replyTo && (
                    <div className="bg-blue-600/20 p-4 rounded-2xl flex items-center justify-between border border-blue-500/30">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-200">
                        <CornerDownRight className="w-4 h-4" /> Respondendo a {replyTo.userName}
                      </div>
                      <X className="w-4 h-4 text-slate-500 cursor-pointer" onClick={() => setReplyTo(null)} />
                    </div>
                  )}

                  <form onSubmit={handleCommentAction} className="flex gap-3">
                    <input 
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={user ? "Sussurre para o reino..." : "Aceda ao sistema para comentar"}
                      disabled={!user}
                      className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 transition-all text-sm"
                    />
                    <button type="submit" disabled={!user || !commentText.trim()} className="bg-blue-600 p-4 rounded-2xl disabled:opacity-30 hover:scale-105 transition-transform"><Send className="w-5 h-5" /></button>
                  </form>

                  <div className="space-y-8 max-h-[800px] overflow-y-auto pr-4 custom-scroll">
                    {(selectedManga.comments || []).map((c) => (
                      <div key={c.id} className="space-y-4">
                        {/* COMENTÁRIO PRINCIPAL */}
                        <div className="bg-white/5 p-6 rounded-[30px] border border-white/5 relative group hover:bg-white/10 transition-all">
                          <div className="flex justify-between items-start">
                            <div className="flex gap-4">
                              <img src={c.userPhoto} className="w-12 h-12 rounded-2xl shadow-lg" alt="Perfil" />
                              <div>
                                <div className="text-[10px] font-black text-blue-400 uppercase mb-1">{c.userName} <span className="text-slate-600 ml-2">{c.date}</span></div>
                                <div className="text-slate-200 font-medium mb-3">{c.text}</div>
                                <div className="flex items-center gap-6">
                                  <button onClick={() => toggleLikeComment(selectedManga.id, c.id)} className={`flex items-center gap-2 text-[10px] font-black uppercase transition-colors ${c.likes?.includes(user?.uid) ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}>
                                    <ThumbsUp className={`w-3.5 h-3.5 ${c.likes?.includes(user?.uid) ? 'fill-blue-400' : ''}`} /> {c.likes?.length || 0}
                                  </button>
                                  <button onClick={() => setReplyTo(c)} className="text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Responder</button>
                                </div>
                              </div>
                            </div>
                            {isMonarch && (
                              <button onClick={() => handleDeleteComment(selectedManga.id, c.id)} className="text-slate-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </div>
                        </div>

                        {/* RESPOSTAS (THREADS) */}
                        {c.replies?.map((r) => (
                          <div key={r.id} className="ml-12 bg-blue-900/5 p-5 rounded-[25px] border-l-4 border-blue-600/30 relative group hover:bg-blue-900/10 transition-all">
                            <div className="flex justify-between items-start">
                              <div className="flex gap-4">
                                <img src={r.userPhoto} className="w-10 h-10 rounded-xl" alt="Perfil" />
                                <div>
                                  <div className="text-[10px] font-black text-indigo-400 uppercase mb-1">{r.userName} <span className="text-slate-700 ml-2">{r.date}</span></div>
                                  <div className="text-slate-300 text-sm mb-2">{r.text}</div>
                                  <button onClick={() => toggleLikeComment(selectedManga.id, r.id, true, c.id)} className={`flex items-center gap-2 text-[10px] font-black uppercase transition-colors ${r.likes?.includes(user?.uid) ? 'text-blue-400' : 'text-slate-600 hover:text-white'}`}>
                                    <ThumbsUp className={`w-3 h-3 ${r.likes?.includes(user?.uid) ? 'fill-blue-400' : ''}`} /> {r.likes?.length || 0}
                                  </button>
                                </div>
                              </div>
                              {isMonarch && (
                                <button onClick={() => handleDeleteComment(selectedManga.id, r.id, true, c.id)} className="text-slate-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )).reverse()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'upload' && isMonarch && (
          <div className="max-w-xl mx-auto bg-white/5 p-12 rounded-[40px] border border-white/5 mt-10 shadow-3xl">
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-10 flex items-center gap-4"><Crown className="text-yellow-500 w-10 h-10" /> Nova Relíquia</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.target);
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'mangas'), {
                title: f.get('t'),
                cover: f.get('c'),
                likes: [],
                comments: [],
                createdAt: new Date().toISOString()
              });
              setView('home');
            }} className="space-y-6">
              <input name="t" placeholder="Título da Obra" required className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-blue-500 font-bold" />
              <input name="c" placeholder="Link da Imagem de Capa" required className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-blue-500" />
              <button type="submit" className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all duration-700">Lançar no Mundo</button>
            </form>
          </div>
        )}
      </main>
      
      <footer className="py-24 text-center opacity-30 text-[9px] font-black uppercase tracking-[0.6em] border-t border-white/5 mt-32">Lumi Mangás • Soberania de Jean • 2026</footer>
    </div>
  );
}

