import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, onSnapshot, updateDoc, deleteDoc, arrayUnion, arrayRemove, getDoc, setDoc } from 'firebase/firestore';
import { Book, MessageSquare, Send, Crown, Bell, Sparkles, LogOut, Trash2, ChevronLeft, ChevronRight, X, Info, Heart, Camera, Settings, User } from 'lucide-react';

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

  const notify = (text) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profileRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'settings', 'profile');
        const docSnap = await getDoc(profileRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        } else {
          const initial = { nickname: currentUser.displayName, photo: currentUser.photoURL };
          await setDoc(profileRef, initial);
          setProfile(initial);
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

  const handleLogin = async () => { 
    try { await signInWithPopup(auth, provider); notify("Portal Aberto!"); } catch (e) { notify("Erro no Login."); } 
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile');
    await setDoc(profileRef, profile);
    setShowProfileModal(false);
    notify("Perfil Atualizado!");
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1000000) return notify("Imagem muito grande! (Máx 1MB)");
      const reader = new FileReader();
      reader.onloadend = () => setProfile({ ...profile, photo: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleAddManga = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const pages = f.get('pages').split(',').map(p => p.trim()).filter(p => p !== "");
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'mangas'), {
      title: f.get('title'),
      cover: f.get('cover') || 'https://via.placeholder.com/400x600',
      description: f.get('description'),
      pages: pages,
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    });
    notify("Obra Postada!");
    setView('home');
  };

  const handleComment = async (mangaId) => {
    if (!user || !commentText.trim()) return;
    const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', mangaId);
    const newComment = {
      id: Date.now().toString(),
      userId: user.uid,
      userName: profile.nickname || user.displayName,
      userPhoto: profile.photo || user.photoURL,
      text: commentText,
      date: new Date().toLocaleDateString(),
      likes: []
    };
    await updateDoc(mRef, { comments: arrayUnion(newComment) });
    setCommentText('');
    notify("Comentário Enviado!");
  };

  const toggleLikeManga = async (mId) => {
    if (!user) return notify("Faça Login!");
    const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', mId);
    const manga = mangas.find(m => m.id === mId);
    const hasLiked = manga.likes?.includes(user.uid);
    await updateDoc(mRef, { likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
  };

  if (isLoading) return <div className="h-screen bg-black flex items-center justify-center text-blue-500 font-black animate-pulse uppercase tracking-[0.4em]">Sincronizando Sistema...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200">
      
      {/* NOTIFICAÇÃO */}
      {notification && (
        <div className="fixed top-24 right-6 z-[100] bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-2xl animate-bounce border border-blue-400">
          <span className="text-[10px] font-black uppercase tracking-widest">{notification}</span>
        </div>
      )}

      {/* MODAL PERFIL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#0a0a0a] border border-white/5 w-full max-w-md rounded-[40px] p-10 space-y-8 relative">
            <X className="absolute top-8 right-8 cursor-pointer" onClick={() => setShowProfileModal(false)} />
            <h2 className="text-2xl font-black text-white uppercase flex items-center gap-3"><Settings className="text-blue-500" /> Perfil</h2>
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <img src={profile.photo || user.photoURL} className="w-24 h-24 rounded-3xl object-cover border-2 border-blue-500/20" />
                <label className="absolute inset-0 bg-black/60 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer">
                  <Camera className="text-white" />
                  <input type="file" hidden accept="image/*" onChange={handlePhotoUpload} />
                </label>
              </div>
              <input 
                value={profile.nickname} 
                onChange={(e) => setProfile({...profile, nickname: e.target.value})}
                placeholder="Seu Apelido" 
                className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-center font-bold"
              />
              <button onClick={handleUpdateProfile} className="w-full bg-blue-600 py-4 rounded-xl font-black uppercase tracking-widest">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MURAL */}
      {(announcement || isMonarch) && (
        <div className="bg-blue-600/10 border-b border-blue-500/20 py-3 px-6 flex items-center justify-center gap-4">
          <Bell className="w-4 h-4 text-blue-400" />
          {isMonarch ? (
            <input 
              value={announcement} 
              onChange={async (e) => { 
                setAnnouncement(e.target.value); 
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'announcement'), { text: e.target.value }); 
              }} 
              placeholder="Decreto do Monarca..." 
              className="bg-transparent border-none outline-none text-[10px] font-black text-white w-full max-w-2xl text-center uppercase tracking-widest"
            />
          ) : (
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">{announcement}</span>
          )}
        </div>
      )}

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><Book className="text-white w-6 h-6" /></div>
          <span className="text-xl font-black text-white">LUMI</span>
        </div>

        <div className="flex items-center gap-4">
          {isMonarch && <button onClick={() => setView('upload')} className="bg-white text-black px-4 py-2 rounded-full text-[10px] font-black uppercase">Postar</button>}
          {!user ? (
            <button onClick={handleLogin} className="bg-blue-600 px-6 py-2 rounded-full text-[10px] font-black uppercase">Entrar</button>
          ) : (
            <div className="flex items-center gap-3">
              <img 
                src={profile.photo || user.photoURL} 
                onClick={() => setShowProfileModal(true)}
                className="w-9 h-9 rounded-xl border border-blue-500/30 object-cover cursor-pointer hover:scale-110 transition-all" 
              />
              <LogOut onClick={() => signOut(auth)} className="w-5 h-5 text-slate-500 cursor-pointer hover:text-red-500" />
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {view === 'home' && (
          <div className="space-y-12">
            <div className="rounded-[40px] bg-blue-900/5 border border-white/5 p-16 text-center mt-4">
              <Sparkles className="text-blue-500 w-10 h-10 mx-auto mb-4" />
              <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter mb-2">REINO <span className="text-blue-600">JEAN</span></h1>
              <p className="text-slate-500 font-bold uppercase tracking-[0.5em] text-[9px] opacity-60">DOMÍNIO SOBERANO V4.1</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
              {mangas.map(m => (
                <div key={m.id} className="group relative" onClick={() => { setSelectedManga(m); setView('detail'); setCurrentPage(0); }}>
                  <div className="aspect-[3/4.5] rounded-3xl overflow-hidden border border-white/10 group-hover:border-blue-500 transition-all shadow-2xl cursor-pointer">
                    <img src={m.cover} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
                    <div className="absolute bottom-6 left-6 right-6 text-white font-black text-xs uppercase">{m.title}</div>
                  </div>
                  {isMonarch && (
                    <button onClick={async (e) => { e.stopPropagation(); await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mangas', m.id)); notify("Removido."); }} className="absolute -top-2 -right-2 bg-red-600 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4 text-white" /></button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'detail' && selectedManga && (
          <div className="space-y-12 mt-6">
            <button onClick={() => setView('home')} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:text-white"><ChevronLeft /> Voltar</button>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-4 space-y-6">
                <img src={selectedManga.cover} className="w-full rounded-[40px] shadow-2xl border border-white/10" />
                <button 
                  onClick={() => toggleLikeManga(selectedManga.id)}
                  className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs ${selectedManga.likes?.includes(user?.uid) ? 'bg-red-600' : 'bg-white text-black'}`}
                >
                  <Heart className={selectedManga.likes?.includes(user?.uid) ? 'fill-white' : ''} /> {selectedManga.likes?.length || 0} Curtidas
                </button>
              </div>
              <div className="lg:col-span-8 space-y-8">
                <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none">{selectedManga.title}</h1>
                <p className="text-slate-400 text-lg leading-relaxed">{selectedManga.description}</p>
                
                {selectedManga.pages?.length > 0 ? (
                  <div className="space-y-6 pt-10 border-t border-white/5">
                    <div className="aspect-[3/4.5] w-full max-w-xl mx-auto rounded-3xl overflow-hidden bg-black border border-white/10 relative">
                      <img src={selectedManga.pages[currentPage]} className="w-full h-full object-contain" />
                      <div className="absolute inset-y-0 left-0 w-1/2" onClick={() => setCurrentPage(p => Math.max(0, p - 1))}></div>
                      <div className="absolute inset-y-0 right-0 w-1/2" onClick={() => setCurrentPage(p => Math.min(selectedManga.pages.length - 1, p + 1))}></div>
                    </div>
                    <div className="flex items-center justify-center gap-8">
                      <ChevronLeft className="cursor-pointer" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} />
                      <span className="text-xs font-black uppercase text-blue-500">Página {currentPage + 1} / {selectedManga.pages.length}</span>
                      <ChevronRight className="cursor-pointer" onClick={() => setCurrentPage(p => Math.min(selectedManga.pages.length - 1, p + 1))} />
                    </div>
                  </div>
                ) : <div className="p-10 border border-white/5 rounded-3xl text-center text-[10px] uppercase font-black opacity-30">Nenhuma página disponível.</div>}

                <section className="pt-10 border-t border-white/5 space-y-6">
                  <h2 className="text-2xl font-black text-white uppercase flex items-center gap-3"><MessageSquare className="text-blue-500" /> Comentários</h2>
                  <div className="flex gap-4">
                    <input 
                      placeholder={user ? "Sussurre..." : "Entre para comentar..."} 
                      className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-blue-500" 
                      value={commentText} onChange={(e) => setCommentText(e.target.value)} disabled={!user}
                    />
                    <button onClick={() => handleComment(selectedManga.id)} className="bg-blue-600 p-4 rounded-2xl disabled:opacity-20" disabled={!user || !commentText.trim()}><Send /></button>
                  </div>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {selectedManga.comments?.map((c) => (
                      <div key={c.id} className="bg-white/5 p-5 rounded-3xl border border-white/5 relative group">
                        <div className="flex items-center gap-3 mb-2">
                          <img src={c.userPhoto} className="w-8 h-8 rounded-lg object-cover" />
                          <span className="text-[10px] font-black uppercase text-blue-400">{c.userName}</span>
                        </div>
                        <p className="text-slate-300 text-sm">{c.text}</p>
                        {(isMonarch || user?.uid === c.userId) && (
                          <Trash2 className="absolute top-5 right-5 w-4 h-4 text-slate-600 hover:text-red-500 cursor-pointer opacity-0 group-hover:opacity-100" onClick={async () => {
                            const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'mangas', selectedManga.id);
                            await updateDoc(mRef, { comments: selectedManga.comments.filter(com => com.id !== c.id) });
                            notify("Comentário Apagado.");
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
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-10 flex items-center gap-4"><Crown className="text-yellow-500" /> Nova Relíquia</h2>
            <form onSubmit={handleAddManga} className="space-y-6">
              <input name="title" required placeholder="Título" className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-blue-500 font-bold" />
              <input name="cover" placeholder="URL da Capa" className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-blue-500" />
              <textarea name="description" required rows="3" placeholder="Sinopse..." className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-blue-500"></textarea>
              <textarea name="pages" required rows="5" placeholder="URLs das páginas (separe por vírgula)..." className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-blue-500 text-xs font-mono"></textarea>
              <button type="submit" className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">Lançar no Reino</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

