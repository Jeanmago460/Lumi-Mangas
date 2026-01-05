import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, onSnapshot, updateDoc, deleteDoc, arrayUnion, arrayRemove, getDoc, setDoc } from 'firebase/firestore';
import * as Lucide from 'lucide-react';

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
  const [profile, setProfile] = useState({ nickname: '', photo: '' });
  const [mangas, setMangas] = useState([]);
  const [announcement, setAnnouncement] = useState("");
  const [view, setView] = useState('home');
  const [selectedManga, setSelectedManga] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const pRef = doc(db, 'artifacts', appId, 'users', u.uid, 'settings', 'profile');
        const snap = await getDoc(pRef);
        if (snap.exists()) setProfile(snap.data());
        else {
          const init = { nickname: u.displayName, photo: u.photoURL };
          await setDoc(pRef, init);
          setProfile(init);
        }
      }
      setIsLoading(false);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    const unsubM = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'mangas'), (s) => {
      setMangas(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubA = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'announcement'), (d) => {
      if (d.exists()) setAnnouncement(d.data().text);
    });
    return () => { unsubM(); unsubA(); };
  }, []);

  const isMonarch = user && user.email === MONARCH_EMAIL;

  const handleLogin = async () => { try { await signInWithPopup(auth, provider); notify("Portal Aberto!"); } catch (e) { notify("Erro no Login."); } };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), profile);
    setShowProfileModal(false);
    notify("Perfil Salvo!");
  };

  const handleAddManga = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const pStr = f.get('pages');
    const pages = pStr ? pStr.split(',').map(p => p.trim()).filter(p => p !== "") : [];
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'mangas'), {
      title: f.get('title'),
      cover: f.get('cover') || 'https://via.placeholder.com/400x600',
      description: f.get('description'),
      pages: pages,
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    });
    notify("Obra Criada!");
    setView('home');
  };

  if (isLoading) return <div className="h-screen bg-black flex items-center justify-center text-blue-500 font-black animate-pulse">SINCRONIZANDO...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200">
      {notification && (
        <div className="fixed top-24 right-6 z-[100] bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-2xl border border-blue-400">
          <span className="text-[10px] font-black uppercase">{notification}</span>
        </div>
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-6">
          <div className="bg-[#0a0a0a] border border-white/5 w-full max-w-md rounded-[40px] p-10 space-y-6 relative">
            <Lucide.X className="absolute top-8 right-8 cursor-pointer" onClick={() => setShowProfileModal(false)} />
            <h2 className="text-2xl font-black uppercase flex items-center gap-3 text-white"><Lucide.Settings className="text-blue-500" /> Perfil</h2>
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <img src={profile.photo || user.photoURL} className="w-24 h-24 rounded-3xl object-cover border-2 border-blue-500/20" />
                <label className="absolute inset-0 bg-black/60 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer">
                  <Lucide.Camera className="text-white" />
                  <input type="file" hidden accept="image/*" onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setProfile({ ...profile, photo: reader.result });
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
              </div>
              <input value={profile.nickname} onChange={(e) => setProfile({...profile, nickname: e.target.value})} placeholder="Seu Apelido" className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-center font-bold" />
              <button onClick={handleUpdateProfile} className="w-full bg-blue-600 py-4 rounded-xl font-black uppercase">Salvar Identidade</button>
            </div>
          </div>
        </div>
      )}

      {(announcement || isMonarch) && (
        <div className="bg-blue-600/10 border-b border-blue-500/20 py-3 px-6 flex items-center justify-center gap-4">
          <Lucide.Bell className="w-4 h-4 text-blue-400" />
          {isMonarch ? (
            <input value={announcement} onChange={async (e) => { 
              setAnnouncement(e.target.value); 
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'announcement'), { text: e.target.value }); 
            }} placeholder="Decreto..." className="bg-transparent border-none outline-none text-[10px] font-black text-white w-full max-w-2xl text-center uppercase" />
          ) : <span className="text-[10px] font-black uppercase text-blue-100">{announcement}</span>}
        </div>
      )}

      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center"><Lucide.Book className="text-white w-6 h-6" /></div>
          <span className="text-xl font-black tracking-tighter">LUMI</span>
        </div>
        <div className="flex items-center gap-4">
          {isMonarch && <button onClick={() => setView('upload')} className="bg-white text-black px-4 py-2 rounded-full text-[10px] font-black uppercase">Postar</button>}
          {!user ? <button onClick={handleLogin} className="bg-blue-600 px-6 py-2 rounded-full text-[10px] font-black uppercase">Entrar</button> : (
            <div className="flex items-center gap-3">
              <img src={profile.photo || user.photoURL} onClick={() => setShowProfileModal(true)} className="w-9 h-9 rounded-xl border border-blue-500/30 object-cover cursor-pointer" />
              <Lucide.LogOut onClick={() => signOut(auth)} className="w-5 h-5 text-slate-500 cursor-pointer" />
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {view === 'home' && (
          <div className="space-y-12">
            <div className="rounded-[40px] bg-blue-900/5 border border-white/5 p-16 text-center mt-4">
              <Lucide.Sparkles className="text-blue-500 w-10 h-10 mx-auto mb-4" />
              <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter mb-2">REINO <span className="text-blue-600">JEAN</span></h1>
              <p className="text-slate-500 font-bold uppercase tracking-[0.5em] text-[9px] opacity-60">Sincronia V4.4</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
              {mangas.map(m => (
                <div key={m.id} className="group relative" onClick={() => { setSelectedManga(m); setView('detail'); setCurrentPage(0); }}>
                  <div className="aspect-[3/4.5] rounded-3xl overflow-hidden border border-white/10 group-hover:border-blue-500 transition-all shadow-2xl relative bg-slate-900">
                    <img src={m.cover} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
                    <div className="absolute bottom-6 left-6 right-6 text-white font-black text-xs uppercase">{m.title}</div>
                  </div>
                  {isMonarch && (
                    <button onClick={async (e) => { e.stopPropagation(); await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mangas', m.id)); notify("Removido."); }} className="absolute -top-2 -right-2 bg-red-600 p-2 rounded-lg"><Lucide.Trash2 className="w-4 h-4 text-white" /></button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'detail' && selectedManga && (
          <div className="space-y-12 mt-6">
            <button onClick={() => setView('home')} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500"><Lucide.ChevronLeft /> Voltar</button>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-4 space-y-6">
                <img src={selectedManga.cover} className="w-full rounded-[40px] shadow-2xl border border-white/10" />
                <button onClick={async () => {
                  if(!user) return notify("Entre primeiro!");
                  const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', selectedManga.id);
                  const likes = selectedManga.likes || [];
                  const hasLiked = likes.includes(user.uid);
                  await updateDoc(mRef, { likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
                }} className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs ${selectedManga.likes?.includes(user?.uid) ? 'bg-red-600' : 'bg-white text-black'}`}>
                  <Lucide.Heart className={selectedManga.likes?.includes(user?.uid) ? 'fill-white' : ''} /> {selectedManga.likes?.length || 0} Curtidas
                </button>
              </div>
              <div className="lg:col-span-8 space-y-8">
                <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none">{selectedManga.title}</h1>
                <p className="text-slate-400 text-lg">{selectedManga.description}</p>
                {selectedManga.pages?.length > 0 ? (
                  <div className="space-y-6 pt-10 border-t border-white/5 text-center">
                    <div className="aspect-[3/4.5] w-full max-w-xl mx-auto rounded-3xl overflow-hidden bg-black relative">
                      <img src={selectedManga.pages[currentPage]} className="w-full h-full object-contain" />
                      <div className="absolute inset-y-0 left-0 w-1/2" onClick={() => setCurrentPage(p => Math.max(0, p - 1))}></div>
                      <div className="absolute inset-y-0 right-0 w-1/2" onClick={() => setCurrentPage(p => Math.min(selectedManga.pages.length - 1, p + 1))}></div>
                    </div>
                    <div className="flex justify-center gap-8 items-center">
                      <Lucide.ChevronLeft onClick={() => setCurrentPage(p => Math.max(0, p - 1))} className="cursor-pointer" />
                      <span className="text-xs font-black uppercase text-blue-500 tracking-widest">Página {currentPage + 1} / {selectedManga.pages.length}</span>
                      <Lucide.ChevronRight onClick={() => setCurrentPage(p => Math.min(selectedManga.pages.length - 1, p + 1))} className="cursor-pointer" />
                    </div>
                  </div>
                ) : <div className="p-10 border border-white/5 rounded-3xl text-center font-black opacity-30 text-[10px] tracking-widest uppercase">Sem pergaminhos.</div>}
                <section className="pt-10 border-t border-white/5 space-y-6">
                  <h2 className="text-2xl font-black text-white uppercase flex items-center gap-3"><Lucide.MessageSquare className="text-blue-500" /> Diálogo</h2>
                  <div className="flex gap-4">
                    <input placeholder={user ? "Sussurre..." : "Entre para falar..."} className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-blue-500" value={commentText} onChange={(e) => setCommentText(e.target.value)} disabled={!user} />
                    <button onClick={async () => {
                      if (!user || !commentText.trim()) return;
                      const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', selectedManga.id);
                      const nC = { id: Date.now().toString(), userId: user.uid, userName: profile.nickname || user.displayName, userPhoto: profile.photo || user.photoURL, text: commentText, date: new Date().toLocaleDateString() };
                      await updateDoc(mRef, { comments: arrayUnion(nC) });
                      setCommentText(''); notify("Enviado!");
                    }} className="bg-blue-600 p-4 rounded-2xl disabled:opacity-20" disabled={!user || !commentText.trim()}><Lucide.Send className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {(selectedManga.comments || []).map((c) => (
                      <div key={c.id} className="bg-white/5 p-5 rounded-3xl border border-white/5 relative group">
                        <div className="flex items-center gap-3 mb-2">
                          <img src={c.userPhoto} className="w-8 h-8 rounded-lg object-cover" />
                          <span className="text-[10px] font-black uppercase text-blue-400">{c.userName}</span>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">{c.text}</p>
                        {(isMonarch || user?.uid === c.userId) && (
                          <Lucide.Trash2 className="absolute top-5 right-5 w-4 h-4 text-slate-500 hover:text-red-500 cursor-pointer opacity-0 group-hover:opacity-100" onClick={async () => {
                            const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', selectedManga.id);
                            await updateDoc(mRef, { comments: selectedManga.comments.filter(com => com.id !== c.id) });
                            notify("Apagado.");
                          }} />
                        )}
                      </div>
                    )).reverse()}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {view === 'upload' && isMonarch && (
          <div className="max-w-2xl mx-auto bg-white/5 p-12 rounded-[50px] border border-white/5 mt-10">
            <h2 className="text-4xl font-black text-white uppercase mb-10"><Lucide.Crown className="text-yellow-500" /> Nova Obra</h2>
            <form onSubmit={handleAddManga} className="space-y-6">
              <input name="title" required placeholder="Título" className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-blue-500 font-bold" />
              <input name="cover" placeholder="URL da Capa" className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-blue-500" />
              <textarea name="description" required rows="3" placeholder="Sinopse..." className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-blue-500"></textarea>
              <textarea name="pages" required rows="5" placeholder="Páginas (separe por vírgula)..." className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-blue-500 text-xs"></textarea>
              <button type="submit" className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">Lançar no Reino</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

