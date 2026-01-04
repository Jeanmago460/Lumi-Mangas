import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, onSnapshot, updateDoc, deleteDoc, arrayUnion, arrayRemove, getDoc, setDoc } from 'firebase/firestore';
import { Book, Heart, MessageSquare, Send, Crown, Plus, Trash2, Bell, Sparkles, Zap, ChevronRight, LogOut, Award, Flame, CornerDownRight } from 'lucide-react';

// CONFIGURAÇÃO REAL DO JEAN
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
  const [userData, setUserData] = useState({ xp: 0, rank: 'E' });
  const [mangas, setMangas] = useState([]);
  const [announcement, setAnnouncement] = useState("");
  const [view, setView] = useState('home'); 
  const [selectedManga, setSelectedManga] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'stats', 'profile');
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) setUserData(docSnap.data());
        else {
          const initial = { xp: 0, rank: 'E', name: currentUser.displayName };
          await setDoc(userRef, initial);
          setUserData(initial);
        }
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  const handleLogin = async () => { try { await signInWithPopup(auth, provider); } catch (e) {} };
  
  const handleAddManga = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'mangas'), {
      title: f.get('title'),
      cover: f.get('cover') || 'https://images.unsplash.com/photo-1614728263952-84ea206f99b6?w=400',
      description: f.get('description'),
      tags: f.get('tags').split(','),
      likes: [], comments: [], createdAt: new Date().toISOString()
    });
    setView('home');
  };

  const handleComment = async (id) => {
    if (!user || !commentText.trim()) return;
    const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', id);
    const comm = { id: Math.random().toString(36).substr(2,9), userName: isMonarch ? "👑 JEAN" : user.displayName, userPhoto: user.photoURL, text: commentText, date: new Date().toLocaleDateString(), replies: [] };
    await updateDoc(mRef, { comments: arrayUnion(comm) });
    setCommentText('');
  };

  if (isLoading) return <div className="h-screen bg-black flex items-center justify-center text-blue-500 font-black animate-pulse uppercase tracking-[0.3em]">Carregando Sistema...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200">
      
      {/* ANÚNCIO */}
      {(announcement || isMonarch) && (
        <div className="bg-blue-600/10 border-b border-blue-500/20 py-3 px-6 flex items-center justify-center gap-4">
          <Bell className="w-4 h-4 text-blue-400" />
          {isMonarch ? (
            <input value={announcement} onChange={async (e) => { setAnnouncement(e.target.value); await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'announcement'), { text: e.target.value }); }} placeholder="Poste um aviso..." className="bg-transparent border-none outline-none text-xs font-black text-white w-full max-w-2xl text-center" />
          ) : (
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">{announcement}</span>
          )}
        </div>
      )}

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 md:px-16 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView('home')}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40"><Book className="text-white w-6 h-6" /></div>
          <span className="text-xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">LUMI</span>
        </div>
        <div className="flex items-center gap-4">
          {isMonarch && <button onClick={() => setView('upload')} className="bg-white text-black px-4 py-2 rounded-full text-[10px] font-black uppercase">Postar</button>}
          {!user ? <button onClick={handleLogin} className="bg-blue-600 px-6 py-2 rounded-full text-[10px] font-black uppercase">Entrar</button> : <img src={user.photoURL} onClick={() => signOut(auth)} className="w-10 h-10 rounded-xl border border-blue-500/30 cursor-pointer" />}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-16">
        {view === 'home' && (
          <div className="space-y-16">
            <div className="rounded-[40px] bg-blue-900/5 border border-white/5 p-12 text-center">
              <Sparkles className="text-blue-500 w-10 h-10 mx-auto mb-4" />
              <h1 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter mb-2">Domínio de <span className="text-blue-600">Jean</span></h1>
              <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">As Crônicas do Soberano</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {mangas.map(m => (
                <div key={m.id} onClick={() => { setSelectedManga(m); setView('detail'); }} className="group cursor-pointer">
                  <div className="aspect-[3/4.5] rounded-3xl overflow-hidden border border-white/10 group-hover:border-blue-500 transition-all shadow-2xl relative">
                    <img src={m.cover} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                    <div className="absolute bottom-4 left-4 right-4 text-white font-black text-xs uppercase">{m.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'detail' && selectedManga && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4"><img src={selectedManga.cover} className="w-full rounded-3xl shadow-2xl border border-white/5" /></div>
            <div className="lg:col-span-8 space-y-8">
              <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter">{selectedManga.title}</h1>
              <p className="text-slate-400 text-lg leading-relaxed">{selectedManga.description}</p>
              <section className="pt-8 border-t border-white/5 space-y-6">
                <h2 className="text-xl font-black text-white uppercase flex items-center gap-3"><MessageSquare className="text-blue-500" /> Comentários</h2>
                <div className="flex gap-4">
                  <input placeholder="Comente algo..." className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                  <button onClick={() => handleComment(selectedManga.id)} className="bg-blue-600 p-3 rounded-xl"><Send className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  {selectedManga.comments?.map((c, i) => (
                    <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-2 mb-1"><span className="text-[9px] font-black uppercase text-blue-400">{c.userName}</span></div>
                      <p className="text-slate-300 text-sm">{c.text}</p>
                    </div>
                  )).reverse()}
                </div>
              </section>
            </div>
          </div>
        )}

        {view === 'upload' && isMonarch && (
          <div className="max-w-xl mx-auto bg-white/5 p-10 rounded-[40px] border border-white/5">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3"><Crown className="text-yellow-500" /> Nova Obra</h2>
            <form onSubmit={handleAddManga} className="space-y-4">
              <input name="title" required placeholder="Título" className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" />
              <input name="cover" placeholder="URL da Capa" className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" />
              <textarea name="description" required rows="3" placeholder="Sinopse..." className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"></textarea>
              <input name="tags" required placeholder="Ação, Fantasia" className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" />
              <button type="submit" className="w-full bg-white text-black py-4 rounded-xl font-black uppercase">Publicar</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

