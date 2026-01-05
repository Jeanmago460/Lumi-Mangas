import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, deleteDoc, query, getDocs } from 'firebase/firestore';

// CONFIGURAÇÃO REVISADA - NÚCLEO DE MANA
const firebaseConfig = {
  apiKey: "", // O ambiente injeta automaticamente
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

// ÍCONES SVG MANUAIS (Para evitar erros de biblioteca externa)
const IconBook = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>;
const IconPlus = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>;
const IconTrash = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>;

export default function App() {
  const [user, setUser] = useState(null);
  const [mangas, setMangas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('home');

  useEffect(() => {
    // 1. Iniciar Autenticação (Regra Obrigatória)
    const initAuth = async () => {
      try {
        // Tenta entrar anonimamente por padrão para carregar dados
        await signInAnonymously(auth);
      } catch (e) {
        console.error("Erro no Auth inicial");
      }
    };
    initAuth();

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    // 2. Escutar Dados (Regra 1: Caminho Estrito)
    const unsubMangas = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'mangas'), (s) => {
      setMangas(s.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Erro Firestore:", err));

    return () => { unsubAuth(); unsubMangas(); };
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      alert("Erro ao entrar com Google");
    }
  };

  const isMonarch = user && user.email === MONARCH_EMAIL;

  if (loading) return (
    <div className="h-screen bg-[#050505] flex items-center justify-center text-blue-500 font-black animate-pulse uppercase tracking-[0.4em]">
      Restauração do Reino...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans">
      {/* HEADER */}
      <nav className="p-6 border-b border-white/5 flex justify-between items-center max-w-7xl mx-auto">
        <div onClick={() => setView('home')} className="flex items-center gap-3 cursor-pointer">
          <div className="p-2 bg-blue-600 rounded-lg"><IconBook /></div>
          <span className="text-xl font-black italic tracking-tighter">LUMI MANGÁS</span>
        </div>
        <div className="flex items-center gap-4">
          {isMonarch && (
            <button onClick={() => setView('upload')} className="bg-white text-black px-4 py-2 rounded-full text-[10px] font-black uppercase">Postar</button>
          )}
          {!user || user.isAnonymous ? (
            <button onClick={handleLogin} className="bg-blue-600 px-6 py-2 rounded-full text-[10px] font-black uppercase">Entrar</button>
          ) : (
            <div className="flex items-center gap-3">
              <img src={user.photoURL} className="w-8 h-8 rounded-full border border-blue-500/30" />
              <button onClick={() => signOut(auth)} className="text-slate-500 hover:text-red-500 text-[10px] font-black uppercase">Sair</button>
            </div>
          )}
        </div>
      </nav>

      {/* CONTEÚDO */}
      <main className="max-w-7xl mx-auto p-6">
        {view === 'home' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {mangas.map(m => (
              <div key={m.id} className="group relative bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-blue-500 transition-all">
                <img src={m.cover} className="w-full aspect-[3/4.5] object-cover group-hover:scale-105 transition-transform" />
                <div className="p-4 bg-gradient-to-t from-black to-transparent absolute bottom-0 left-0 right-0">
                  <h3 className="text-xs font-black uppercase truncate">{m.title}</h3>
                </div>
                {isMonarch && (
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mangas', m.id));
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <IconTrash />
                  </button>
                )}
              </div>
            ))}
            {mangas.length === 0 && (
              <div className="col-span-full py-20 text-center opacity-20 font-black uppercase tracking-widest">
                Nenhuma relíquia encontrada no domínio.
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-xl mx-auto bg-white/5 p-10 rounded-[30px] border border-white/10">
            <h2 className="text-2xl font-black uppercase mb-8 text-blue-500">Nova Obra</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.target);
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'mangas'), {
                title: f.get('t'),
                cover: f.get('c'),
                createdAt: new Date().toISOString()
              });
              setView('home');
            }} className="space-y-4">
              <input name="t" placeholder="Título" required className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-blue-500 font-bold" />
              <input name="c" placeholder="URL da Capa" required className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-blue-500" />
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase">Lançar no Reino</button>
              <button type="button" onClick={() => setView('home')} className="w-full text-slate-600 font-black uppercase text-[10px]">Cancelar</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

