import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, onSnapshot, updateDoc, deleteDoc, arrayUnion, getDoc, setDoc } from 'firebase/firestore';
import { Book, MessageSquare, Send, Crown, Bell, Sparkles, LogOut } from 'lucide-react';

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
  const [mangas, setMangas] = useState([]);
  const [announcement, setAnnouncement] = useState("");
  const [view, setView] = useState('home'); 
  const [selectedManga, setSelectedManga] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
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
      createdAt: new Date().toISOString(),
      comments: []
    });
    setView('home');
  };

  const handleComment = async (id) => {
    if (!user || !commentText.trim()) return;
    const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', id);
    const comm = { userName: isMonarch ? "👑 JEAN" : user.displayName, text: commentText, date: new Date().toLocaleDateString() };
    await updateDoc(mRef, { comments: arrayUnion(comm) });
    setCommentText('');
  };

  if (isLoading) return <div className="h-screen bg-black flex items-center justify-center text-blue-500 font-black animate-pulse uppercase tracking-widest">Sincronizando Sistema...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200">
      {(announcement || isMonarch) && (
        <div className="bg-blue-600/10 border-b border-blue-500/20 py-3 px-6 flex items-center justify-center gap-4">
          <Bell className="w-4 h-4 text-blue-400" />
          {isMonarch ? (
            <input value={announcement} onChange={async (e) => { setAnnouncement(e.target.value); await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'announcement'), { text: e.target.value }); }} className="bg-transparent border-none outline-none text-xs font-black text-white w-full max-w-2xl text-center" />
          ) : (
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">{announcement}</span>
          )}
        </div>
      )}

      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView('home')}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><Book className="text-white w-6 h-6" /></div>
          <span className="text-xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">LUMI</span>
        </div>
        <div className="flex items-center gap-4">
          {isMonarch && <button onClick={() => setView('upload')} className="bg-white text-black px-4 py-2 rounded-full text-[10px] font-black uppercase">Postar</button>}
          {!user ? <button onClick={handleLogin} className="bg-blue-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Entrar</button> : <LogOut onClick={() => signOut(auth)} className="w-6 h-6 text-slate-500 cursor-pointer hover:text-red-500 transition-colors" />}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {view === 'home' && (
          <div className="space-y-12">
            <div className="rounded-3xl bg-blue-900/5 border border-white/5 p-12 text-center mt-8">
              <Sparkles className="text-blue-500 w-8 h-8 mx-auto mb-4" />
              <h1 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter mb-2">Domínio de <span className="text-blue-600">Jean</span></h1>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">O SISTEMA DE MANGÁS SUPREMO</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {mangas.map(m => (
                <div key={m.id} onClick={() => { setSelectedManga(m); setView('detail'); }} className="group cursor-pointer">
                  <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 group-hover:border-blue-500 transition-all relative">
                    <img src={m.cover} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-80" />
                    <div className="absolute bottom-4 left-4 right-4 text-white font-black text-xs uppercase">{m.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'detail' && selectedManga && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-10">
            <div className="lg:col-span-4"><img src={selectedManga.cover} className="w-full rounded-2xl shadow-2xl border border-white/5" /></div>
            <div className="lg:col-span-8 space-y-6">
              <h1 className="text-5xl font-black text-white uppercase tracking-tighter">{selectedManga.title}</h1>
              <p className="text-slate-400 text-lg">{selectedManga.description}</p>
              <section className="pt-8 border-t border-white/5 space-y-6">
                <div className="flex gap-4">
                  <input placeholder="Comente..." className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                  <button onClick={() => handleComment(selectedManga.id)} className="bg-blue-600 p-3 rounded-xl"><Send className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  {selectedManga.comments?.map((c, i) => (
                    <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <span className="text-[9px] font-black uppercase text-blue-400 block mb-1">{c.userName}</span>
                      <p className="text-slate-300 text-sm">{c.text}</p>
                    </div>
                  )).reverse()}
                </div>
              </section>
            </div>
          </div>
        )}

        {view === 'upload' && isMonarch && (
          <div className="max-w-xl mx-auto bg-white/5 p-10 rounded-3xl border border-white/5 mt-10">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3"><Crown className="text-yellow-500" /> Nova Obra</h2>
            <form onSubmit={handleAddManga} className="space-y-4">
              <input name="title" required placeholder="Título" className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" />
              <input name="cover" placeholder="URL da Capa" className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" />
              <textarea name="description" required rows="3" placeholder="Sinopse..." className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"></textarea>
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 transition-colors">Publicar no Reino</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

