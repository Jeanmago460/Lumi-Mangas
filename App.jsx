import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Book, Sparkles, LogOut, Bell, Crown, Heart, MessageSquare, Send, ChevronLeft, Trash2 } from 'lucide-react';

// CONFIGURAÇÃO DO JEAN - O SISTEMA RECONHECE SUA CHAVE
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

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    
    // Sincronizar Mangás com a Trilha Correta do Artefato
    const unsubMangas = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'mangas'), (s) => {
      setMangas(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Sincronizar Mural
    const unsubAnnounce = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'announcement'), (d) => {
      if (d.exists()) setAnnouncement(d.data().text);
    });

    return () => { unsubAuth(); unsubMangas(); unsubAnnounce(); };
  }, []);

  const login = () => signInWithPopup(auth, provider);
  const isMonarch = user && user.email === MONARCH_EMAIL;

  const updateMural = async (text) => {
    setAnnouncement(text);
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'announcement'), { text });
  };

  const toggleLike = async (manga) => {
    if (!user) return;
    const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', manga.id);
    const hasLiked = manga.likes?.includes(user.uid);
    await updateDoc(mRef, {
      likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user || !commentText.trim()) return;
    const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', selectedManga.id);
    const newComment = {
      id: Date.now(),
      userName: user.displayName,
      userPhoto: user.photoURL,
      text: commentText,
      date: new Date().toLocaleDateString()
    };
    await updateDoc(mRef, {
      comments: arrayUnion(newComment)
    });
    setCommentText('');
  };

  const deleteManga = async (id) => {
    if (!isMonarch) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mangas', id));
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* MURAL DE AVISOS */}
      {(announcement || isMonarch) && (
        <div className="bg-blue-600/10 border-b border-blue-500/20 py-3 px-6 flex items-center justify-center gap-4">
          <Bell className="w-3 h-3 text-blue-400" />
          {isMonarch ? (
            <input 
              value={announcement} 
              onChange={(e) => updateMural(e.target.value)} 
              placeholder="Digite um decreto real..." 
              className="bg-transparent border-none outline-none text-[10px] font-black text-white w-full max-w-2xl text-center uppercase tracking-widest"
            />
          ) : (
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">{announcement}</span>
          )}
        </div>
      )}

      {/* NAVBAR */}
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto sticky top-0 bg-[#050505]/80 backdrop-blur-md z-50">
        <div onClick={() => setView('home')} className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/50 transition-all"><Book className="text-white w-6 h-6" /></div>
          <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent uppercase">Lumi</span>
        </div>
        <div className="flex items-center gap-4">
          {isMonarch && <button onClick={() => setView('upload')} className="bg-white text-black px-5 py-2 rounded-full text-[10px] font-black uppercase hover:bg-blue-500 hover:text-white transition-colors">Postar</button>}
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
              <p className="text-slate-500 font-bold uppercase tracking-[0.5em] text-[9px] opacity-60">Sincronia Estabilizada V1.2</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
              {mangas.map(m => (
                <div key={m.id} className="group relative" onClick={() => { setSelectedManga(m); setView('detail'); }}>
                  <div className="aspect-[3/4.5] rounded-3xl overflow-hidden border border-white/10 group-hover:border-blue-500 transition-all shadow-2xl relative bg-slate-900 cursor-pointer">
                    <img src={m.cover} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt={m.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
                    <div className="absolute bottom-6 left-6 right-6 text-white">
                      <div className="font-black text-xs uppercase mb-1">{m.title}</div>
                      <div className="flex items-center gap-3 text-[10px] opacity-60">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {m.likes?.length || 0}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {m.comments?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'detail' && selectedManga && (
          <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-4 duration-500">
            <button onClick={() => setView('home')} className="flex items-center gap-2 text-xs font-black uppercase text-slate-500 hover:text-white"><ChevronLeft className="w-4 h-4" /> Voltar</button>
            <div className="grid md:grid-cols-3 gap-10">
              <img src={selectedManga.cover} className="rounded-3xl shadow-2xl border border-white/10 w-full" alt="Capa" />
              <div className="md:col-span-2 space-y-6">
                <h1 className="text-5xl font-black uppercase tracking-tighter">{selectedManga.title}</h1>
                <div className="flex gap-4">
                  <button onClick={() => toggleLike(selectedManga)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all ${selectedManga.likes?.includes(user?.uid) ? 'bg-red-600 text-white' : 'bg-white text-black'}`}>
                    <Heart className={`w-4 h-4 ${selectedManga.likes?.includes(user?.uid) ? 'fill-white' : ''}`} /> {selectedManga.likes?.length || 0} Curtidas
                  </button>
                </div>
                
                {/* SEÇÃO DE COMENTÁRIOS */}
                <div className="pt-10 border-t border-white/5 space-y-6">
                  <h3 className="text-xl font-black uppercase flex items-center gap-2"><MessageSquare className="text-blue-500" /> Diálogo de Súditos</h3>
                  <form onSubmit={handleComment} className="flex gap-3">
                    <input 
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={user ? "Sussurre ao reino..." : "Faça login para comentar"}
                      disabled={!user}
                      className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-5 py-3 outline-none focus:border-blue-500 transition-all text-sm"
                    />
                    <button type="submit" disabled={!user} className="bg-blue-600 p-3 rounded-2xl disabled:opacity-30"><Send className="w-5 h-5" /></button>
                  </form>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {selectedManga.comments?.map((c, i) => (
                      <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex gap-4">
                        <img src={c.userPhoto} className="w-10 h-10 rounded-xl" alt="Perfil" />
                        <div>
                          <div className="text-[10px] font-black text-blue-400 uppercase mb-1">{c.userName} • <span className="text-slate-600">{c.date}</span></div>
                          <div className="text-sm text-slate-300">{c.text}</div>
                        </div>
                      </div>
                    )).reverse()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'upload' && isMonarch && (
          <div className="max-w-xl mx-auto bg-white/5 p-12 rounded-[40px] border border-white/5 mt-10 animate-in zoom-in-95 duration-500">
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
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Título da Obra</label>
                <input name="t" required className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Link da Imagem de Capa</label>
                <input name="c" required className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-blue-500" />
              </div>
              <button type="submit" className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all duration-500">Lançar no Reino</button>
            </form>
          </div>
        )}
      </main>
      
      <footer className="py-20 text-center opacity-30 text-[9px] font-black uppercase tracking-[0.6em] border-t border-white/5 mt-20">Lumi Mangás • Domínio de Jean • 2026</footer>
    </div>
  );
}

