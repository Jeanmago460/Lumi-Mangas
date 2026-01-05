import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Book, LogOut, Heart, MessageSquare, Send, ChevronLeft, Trash2, ChevronRight, Crown } from 'lucide-react';

const firebaseConfig = {
  apiKey: "", 
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
  const [view, setView] = useState('home'); 
  const [selectedManga, setSelectedManga] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    onAuthStateChanged(auth, (u) => setUser(u));
    return onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'mangas'), (s) => {
      setMangas(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const login = () => signInWithPopup(auth, provider);
  const isMonarch = user && user.email === MONARCH_EMAIL;

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans">
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto border-b border-white/5">
        <div onClick={() => {setView('home'); setSelectedManga(null);}} className="flex items-center gap-3 cursor-pointer">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center"><Book className="text-white" /></div>
          <span className="text-xl font-black uppercase tracking-tighter italic">LUMI</span>
        </div>
        <div className="flex items-center gap-4">
          {isMonarch && <button onClick={() => setView('upload')} className="bg-white text-black px-4 py-2 rounded-full text-[10px] font-black uppercase">Postar</button>}
          {user ? (
            <div className="flex items-center gap-3">
              <img src={user.photoURL} className="w-8 h-8 rounded-lg border border-blue-500/30" />
              <LogOut onClick={() => signOut(auth)} className="w-5 h-5 text-slate-500 cursor-pointer hover:text-red-500" />
            </div>
          ) : (
            <button onClick={login} className="bg-blue-600 px-6 py-2 rounded-full text-[10px] font-black uppercase">Entrar</button>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {view === 'home' && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {mangas.map(m => (
              <div key={m.id} className="group relative" onClick={() => { setSelectedManga(m); setView('detail'); setCurrentPage(0); }}>
                <div className="aspect-[3/4.5] rounded-3xl overflow-hidden border border-white/10 group-hover:border-blue-500 transition-all shadow-2xl relative bg-slate-900 cursor-pointer">
                  <img src={m.cover} className="w-full h-full object-cover group-hover:scale-110 transition-all" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-90" />
                  {isMonarch && <button onClick={async (e) => { e.stopPropagation(); await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mangas', m.id)); }} className="absolute top-4 right-4 bg-red-600 p-2 rounded-xl"><Trash2 className="w-4 h-4 text-white" /></button>}
                  <div className="absolute bottom-6 left-6 right-6 text-white font-black text-xs uppercase">{m.title}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'detail' && selectedManga && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500">
            <button onClick={() => setView('home')} className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">← Voltar</button>
            <div className="grid md:grid-cols-12 gap-10">
              <div className="md:col-span-4 space-y-6">
                <img src={selectedManga.cover} className="rounded-3xl shadow-2xl border border-white/10 w-full" />
                <button onClick={async () => {
                  if(!user) return;
                  const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', selectedManga.id);
                  const hasLiked = (selectedManga.likes || []).includes(user.uid);
                  await updateDoc(mRef, { likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
                }} className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase ${selectedManga.likes?.includes(user?.uid) ? 'bg-red-600 text-white' : 'bg-white text-black'}`}>
                  <Heart className={selectedManga.likes?.includes(user?.uid) ? 'fill-white' : ''} /> {selectedManga.likes?.length || 0} Curtidas
                </button>
              </div>
              <div className="md:col-span-8 space-y-10">
                <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">{selectedManga.title}</h1>
                <p className="text-slate-400">{selectedManga.description || "Sem sinopse."}</p>
                {selectedManga.pages?.length > 0 ? (
                  <div className="space-y-6 pt-10 border-t border-white/5 text-center">
                    <div className="aspect-[3/4.5] w-full max-w-lg mx-auto rounded-3xl overflow-hidden bg-black relative border border-white/5 shadow-2xl">
                      <img src={selectedManga.pages[currentPage]} className="w-full h-full object-contain" />
                      <div className="absolute inset-y-0 left-0 w-1/4" onClick={() => setCurrentPage(p => Math.max(0, p - 1))}></div>
                      <div className="absolute inset-y-0 right-0 w-1/4" onClick={() => setCurrentPage(p => Math.min(selectedManga.pages.length - 1, p + 1))}></div>
                    </div>
                    <div className="flex justify-center items-center gap-8">
                      <ChevronLeft onClick={() => setCurrentPage(p => Math.max(0, p - 1))} className="cursor-pointer" />
                      <span className="text-xs font-black uppercase text-blue-500 tracking-widest">Página {currentPage + 1} / {selectedManga.pages.length}</span>
                      <ChevronRight onClick={() => setCurrentPage(p => Math.min(selectedManga.pages.length - 1, p + 1))} className="cursor-pointer" />
                    </div>
                  </div>
                ) : <div className="p-10 border border-white/5 rounded-3xl text-center opacity-20 text-xs font-black uppercase">Obra sem páginas.</div>}
              </div>
            </div>
          </div>
        )}

        {view === 'upload' && isMonarch && (
          <div className="max-w-xl mx-auto bg-white/5 p-10 rounded-[40px] border border-white/5 mt-10">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8"><Crown className="inline text-yellow-500" /> Nova Relíquia</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.target);
              const pages = f.get('p') ? f.get('p').split(',').map(s => s.trim()).filter(s => s !== "") : [];
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'mangas'), {
                title: f.get('t'), cover: f.get('c'), description: f.get('d'), pages, likes: [], createdAt: new Date().toISOString()
              });
              setView('home');
            }} className="space-y-6">
              <input name="t" placeholder="Título" required className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold" />
              <input name="c" placeholder="Link da Capa" required className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white" />
              <textarea name="d" placeholder="Sinopse" className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white h-24" />
              <textarea name="p" placeholder="Páginas (URL1, URL2...)" className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white h-32 text-xs" />
              <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase shadow-lg">Lançar no Mundo</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

