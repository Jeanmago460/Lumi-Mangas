import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, setDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc, getDoc } from 'firebase/firestore';

// CONFIGURAÇÃO DO SISTEMA LUMI
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

// ÍCONES EM SVG PARA EVITAR ERROS DE IMPORTAÇÃO
const Icons = {
  Book: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>,
  Heart: (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={props.fill || "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  User: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
};

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ nickname: '', photo: '' });
  const [mangas, setMangas] = useState([]);
  const [announcement, setAnnouncement] = useState("");
  const [view, setView] = useState('home'); 
  const [selectedManga, setSelectedManga] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // INICIALIZAÇÃO DE SEGURANÇA
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const pRef = doc(db, 'artifacts', appId, 'users', u.uid, 'settings', 'profile');
        const snap = await getDoc(pRef);
        if (snap.exists()) setProfile(snap.data());
        else {
          const init = { nickname: u.displayName || 'Player', photo: u.photoURL || '' };
          await setDoc(pRef, init);
          setProfile(init);
        }
      }
      setIsLoading(false);
    });

    const unsubMangas = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'mangas'), (s) => {
      setMangas(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubAnnounce = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'announcement'), (d) => {
      if (d.exists()) setAnnouncement(d.data().text);
    });

    return () => { unsubAuth(); unsubMangas(); unsubAnnounce(); };
  }, []);

  const login = () => signInWithPopup(auth, provider);
  const isMonarch = user && user.email === MONARCH_EMAIL;

  if (isLoading) return (
    <div className="h-screen bg-black flex items-center justify-center text-blue-500 font-bold uppercase tracking-widest animate-pulse">
      Restaurando Sistema Lumi...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 p-4 md:p-8">
      {/* NAVBAR */}
      <nav className="max-w-7xl mx-auto flex justify-between items-center mb-10 bg-white/5 p-4 rounded-3xl border border-white/10">
        <div onClick={() => {setView('home'); setSelectedManga(null);}} className="flex items-center gap-2 cursor-pointer">
          <div className="p-2 bg-blue-600 rounded-lg text-white"><Icons.Book /></div>
          <span className="text-2xl font-black italic">LUMI</span>
        </div>
        
        <div className="flex items-center gap-4">
          {isMonarch && (
            <button onClick={() => setView('upload')} className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold uppercase">Postar</button>
          )}
          {user ? (
            <div className="flex items-center gap-4">
              <img 
                src={profile.photo || user.photoURL} 
                onClick={() => setShowProfileModal(true)}
                className="w-10 h-10 rounded-full border-2 border-blue-500 cursor-pointer object-cover" 
              />
              <button onClick={() => signOut(auth)} className="text-slate-500 hover:text-red-500 text-xs font-bold uppercase">Sair</button>
            </div>
          ) : (
            <button onClick={login} className="bg-blue-600 text-white px-6 py-2 rounded-full text-xs font-bold uppercase">Entrar</button>
          )}
        </div>
      </nav>

      {/* ANÚNCIO DO MONARCA */}
      {announcement && (
        <div className="max-w-7xl mx-auto mb-8 p-4 bg-blue-600/20 border border-blue-500/30 rounded-2xl text-center text-xs font-bold uppercase tracking-widest text-blue-100">
          {announcement}
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto">
        {view === 'home' && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {mangas.map(m => (
              <div 
                key={m.id} 
                onClick={() => {setSelectedManga(m); setView('detail'); setCurrentPage(0);}}
                className="group bg-white/5 rounded-3xl overflow-hidden border border-white/10 cursor-pointer hover:border-blue-500 transition-all relative"
              >
                <img src={m.cover} className="w-full aspect-[3/4.5] object-cover group-hover:scale-105 transition-transform" />
                <div className="p-4 bg-gradient-to-t from-black to-transparent absolute bottom-0 left-0 right-0">
                  <h3 className="text-sm font-black uppercase truncate">{m.title}</h3>
                </div>
                {isMonarch && (
                  <button 
                    onClick={async (e) => { e.stopPropagation(); await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mangas', m.id)); }}
                    className="absolute top-2 right-2 p-2 bg-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icons.Trash />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {view === 'detail' && selectedManga && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <button onClick={() => setView('home')} className="text-slate-500 hover:text-white text-xs font-bold uppercase">← Voltar</button>
            <div className="grid md:grid-cols-3 gap-10">
              <img src={selectedManga.cover} className="w-full rounded-3xl shadow-2xl" />
              <div className="md:col-span-2 space-y-6">
                <h1 className="text-4xl font-black uppercase tracking-tighter">{selectedManga.title}</h1>
                <p className="text-slate-400 leading-relaxed">{selectedManga.description || "Nenhuma crônica."}</p>
                
                {selectedManga.pages?.length > 0 ? (
                  <div className="space-y-6 pt-10 border-t border-white/5">
                    <div className="bg-black aspect-[3/4.5] max-w-lg mx-auto rounded-3xl overflow-hidden border border-white/10 relative">
                      <img src={selectedManga.pages[currentPage]} className="w-full h-full object-contain" />
                      <div className="absolute inset-y-0 left-0 w-1/2" onClick={() => setCurrentPage(p => Math.max(0, p - 1))}></div>
                      <div className="absolute inset-y-0 right-0 w-1/2" onClick={() => setCurrentPage(p => Math.min(selectedManga.pages.length - 1, p + 1))}></div>
                    </div>
                    <div className="flex justify-center gap-8 items-center font-black text-xs uppercase text-blue-500">
                      <span>Página {currentPage + 1} de {selectedManga.pages.length}</span>
                    </div>
                  </div>
                ) : <div className="p-10 border border-white/5 rounded-3xl text-center opacity-30 text-xs font-black uppercase italic">Sem páginas.</div>}
              </div>
            </div>
          </div>
        )}

        {view === 'upload' && isMonarch && (
          <div className="max-w-2xl mx-auto bg-white/5 p-10 rounded-3xl border border-white/5">
            <h2 className="text-3xl font-black uppercase mb-8">Nova Obra</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.target);
              const p = f.get('p') ? f.get('p').split(',').map(s => s.trim()).filter(s => s !== "") : [];
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'mangas'), {
                title: f.get('t'), cover: f.get('c'), description: f.get('d'), pages: p, likes: [], comments: [], createdAt: new Date().toISOString()
              });
              setView('home');
            }} className="space-y-6">
              <input name="t" placeholder="Título" required className="w-full bg-white/5 p-4 rounded-xl border border-white/10 text-white font-bold" />
              <input name="c" placeholder="Capa (URL)" required className="w-full bg-white/5 p-4 rounded-xl border border-white/10" />
              <textarea name="d" placeholder="Sinopse" className="w-full bg-white/5 p-4 rounded-xl border border-white/10 h-24" />
              <textarea name="p" placeholder="Páginas (URL1, URL2...)" className="w-full bg-white/5 p-4 rounded-xl border border-white/10 h-32 text-xs" />
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase">Imortalizar</button>
            </form>
          </div>
        )}
      </main>

      {/* MODAL PERFIL */}
      {showProfileModal && user && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6">
          <div className="bg-[#0a0a0a] border border-white/5 w-full max-w-md rounded-[40px] p-10 text-center space-y-6">
            <h2 className="text-2xl font-black uppercase flex items-center justify-center gap-2 text-white">Perfil</h2>
            <img src={profile.photo || user.photoURL} className="w-24 h-24 rounded-full mx-auto border-4 border-blue-600" />
            <input 
              value={profile.nickname} 
              onChange={(e) => setProfile({...profile, nickname: e.target.value})}
              className="w-full bg-white/5 p-4 rounded-xl border border-white/10 text-white text-center font-bold"
              placeholder="Apelido"
            />
            <button 
              onClick={async () => {
                await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), profile);
                setShowProfileModal(false);
              }}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase"
            >
              Salvar
            </button>
            <button onClick={() => setShowProfileModal(false)} className="text-slate-500 uppercase font-bold text-[10px]">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}

