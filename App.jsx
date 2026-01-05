import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';

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

export default function App() {
  const [user, setUser] = useState(null);
  const [mangas, setMangas] = useState([]);
  const [view, setView] = useState('home');

  useEffect(() => {
    onAuthStateChanged(auth, (u) => setUser(u));
    onSnapshot(collection(db, 'mangas'), (s) => {
      setMangas(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const login = () => signInWithPopup(auth, provider);
  const isMonarch = user && user.email === MONARCH_EMAIL;

  return (
    <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif', padding: '20px' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
        <h1 onClick={() => setView('home')} style={{ cursor: 'pointer', color: '#3b82f6' }}>LUMI</h1>
        <div>
          {isMonarch && <button onClick={() => setView('upload')} style={{ marginRight: '10px' }}>Postar</button>}
          {!user ? <button onClick={login}>Entrar</button> : <button onClick={() => signOut(auth)}>Sair</button>}
        </div>
      </nav>

      {view === 'home' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
          {mangas.map(m => (
            <div key={m.id} style={{ border: '1px solid #333', borderRadius: '10px', overflow: 'hidden' }}>
              <img src={m.cover} style={{ width: '100%', height: '200px', objectCover: 'cover' }} />
              <div style={{ padding: '10px', fontSize: '12px' }}>{m.title}</div>
            </div>
          ))}
        </div>
      ) : (
        <form onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
          await addDoc(collection(db, 'mangas'), { title: f.get('t'), cover: f.get('c') });
          setView('home');
        }}>
          <input name="t" placeholder="Título" required style={{ display: 'block', marginBottom: '10px' }} />
          <input name="c" placeholder="Link da Capa" required style={{ display: 'block', marginBottom: '10px' }} />
          <button type="submit">Lançar</button>
        </form>
      )}
    </div>
  );
}
