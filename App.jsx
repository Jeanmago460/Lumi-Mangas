import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc } from 'firebase/firestore';

// CONFIGURAÇÃO DO SISTEMA - NÚCLEO DE MANA
const firebaseConfig = {
  apiKey: "", // O sistema injeta automaticamente
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

// ÍCONES EM SVG PURO (IMUNES A ERROS DE BUILD)
const IconBook = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>;
const IconTrash = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>;

export default function App() {
  const [user, setUser] = useState(null);
  const [mangas, setMangas] = useState([]);
  const [view, setView] = useState('home');
  const [selectedManga, setSelectedManga] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsLoading(false);
    });

    const unsubMangas = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'mangas'), (s) => {
      setMangas(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubAuth(); unsubMangas(); };
  }, []);

  const login = async () => { try { await signInWithPopup(auth, provider); } catch(e) { console.error(e); } };
  const isMonarch = user && user.email === MONARCH_EMAIL;

  if (isLoading) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="text-blue-500 font-black animate-pulse uppercase tracking-widest">Lumi: Restaurando Núcleo...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans">
      {/* HEADER */}
      <nav className="p-6 border-b border-white/5 flex justify-between items-center max-w-7xl mx-auto">
        <div onClick={() => {setView('home'); setSelectedManga(null);}} className="flex items-center gap-3 cursor-pointer">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center"><IconBook /></div>
          <span className="text-xl font-black italic tracking-tighter">LUMI</span>
        </div>
        <div className="flex items-center gap-4">
          {isMonarch && <button onClick={() => setView('upload')} className="bg-white text-black px-4 py-2 rounded-full text-[10px] font-black uppercase">Postar</button>}
          {user ? (
            <div className="flex items-center gap-3">
              <img src={user.photoURL} className="w-8 h-8 rounded-full border border-blue-500/30" />
              <button onClick={() => signOut(auth)} className="text-slate-500 text-[10px] font-black uppercase">Sair</button>
            </div>
          ) : (
            <button onClick={login} className="bg-blue-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Entrar</button>
          )}
        </div>
      </nav>

      {/* CONTEÚDO */}
      <main className="max-w-7xl mx-auto p-6">
        {view === 'home' && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 animate-in fade-in duration-500">
            {mangas.map(m => (
              <div key={m.id} className="group relative" onClick={() => { setSelectedManga(m); setView('detail'); setCurrentPage(0); }}>
                <div className="aspect-[3/4.5] rounded-3xl overflow-hidden border border-white/10 group-hover:border-blue-500 transition-all shadow-2xl relative bg-slate-900 cursor-pointer">
                  <img src={m.cover} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt={m.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-90" />
                  {isMonarch && (
                    <button 
                      onClick={async (e) => { e.stopPropagation(); await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mangas', m.id)); }} 
                      className="absolute top-4 right-4 bg-red-600 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <IconTrash />
                    </button>
                  )}
                  <div className="absolute bottom-6 left-6 right-6 text-white font-black text-xs uppercase truncate">{m.title}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'detail' && selectedManga && (
          <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-4">
            <button onClick={() => setView('home')} className="text-xs font-black uppercase text-slate-500 hover:text-white">← Voltar</button>
            <div className="grid md:grid-cols-3 gap-10">
              <img src={selectedManga.cover} className="rounded-3xl shadow-2xl border border-white/10 w-full" alt="C" />
              <div className="md:col-span-2 space-y-6">
                <h1 className="text-5xl font-black uppercase tracking-tighter">{selectedManga.title}</h1>
                <p className="text-slate-400">{selectedManga.description || "Nenhuma sinopse disponível."}</p>
                
                {selectedManga.pages?.length > 0 ? (
                  <div className="space-y-6 pt-10 border-t border-white/5 text-center">
                    <div className="aspect-[3/4.5] w-full max-w-lg mx-auto rounded-3xl overflow-hidden bg-black relative border border-white/5">
                      <img src={selectedManga.pages[currentPage]} className="w-full h-full object-contain" alt="P" />
                      <div className="absolute inset-y-0 left-0 w-1/2 cursor-pointer" onClick={() => setCurrentPage(p => Math.max(0, p - 1))}></div>
                      <div className="absolute inset-y-0 right-0 w-1/2 cursor-pointer" onClick={() => setCurrentPage(p => Math.min(selectedManga.pages.length - 1, p + 1))}></div>
                    </div>
                    <div className="text-xs font-black uppercase text-blue-500 tracking-widest">Página {currentPage + 1} / {selectedManga.pages.length}</div>
                  </div>
                ) : <div className="p-10 border border-white/5 rounded-3xl text-center opacity-20 text-xs font-black uppercase">Sem pergaminhos vinculados.</div>}
              </div>
            </div>
          </div>
        )}

        {view === 'upload' && isMonarch && (
          <div className="max-w-xl mx-auto bg-white/5 p-12 rounded-[40px] border border-white/5 mt-10">
            <h2 className="text-3xl font-black text-white uppercase mb-10">Nova Relíquia</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.target);
              const pStr = f.get('p');
              const pages = pStr ? pStr.split(',').map(p => p.trim()).filter(p => p !== "") : [];
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'mangas'), {
                title: f.get('t'), cover: f.get('c'), description: f.get('d'), pages, createdAt: new Date().toISOString()
              });
              setView('home');
            }} className="space-y-6">
              <input name="t" placeholder="Título" required className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold" />
              <input name="c" placeholder="Capa (URL)" required className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white" />
              <textarea name="d" placeholder="Sinopse" className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white h-24" />
              <textarea name="p" placeholder="Páginas (Link1, Link2...)" className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white h-32 text-xs" />
              <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest">Lançar no Reino</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

