<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lumi Mangás - Reino de Jean</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
        import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

        const firebaseConfig = {
            apiKey: "", // O ambiente fornece a chave
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

        // Elementos do DOM
        const appContent = document.getElementById('app-content');
        const loginBtn = document.getElementById('login-btn');
        const userArea = document.getElementById('user-area');
        const mangaGrid = document.getElementById('manga-grid');
        const adminPanel = document.getElementById('admin-panel');

        let currentUser = null;

        // Autenticação
        loginBtn.onclick = () => signInWithPopup(auth, provider);
        window.logout = () => signOut(auth);

        onAuthStateChanged(auth, (user) => {
            currentUser = user;
            if (user) {
                loginBtn.classList.add('hidden');
                userArea.classList.remove('hidden');
                userArea.innerHTML = `
                    <img src="${user.photoURL}" class="w-10 h-10 rounded-full border-2 border-blue-500">
                    <button onclick="logout()" class="text-[10px] font-bold uppercase text-slate-500 hover:text-red-500">Sair</button>
                `;
                if (user.email === MONARCH_EMAIL) {
                    adminPanel.classList.remove('hidden');
                }
            } else {
                loginBtn.classList.remove('hidden');
                userArea.classList.add('hidden');
                adminPanel.classList.add('hidden');
            }
        });

        // Carregar Mangás
        onSnapshot(collection(db, "mangas"), (snapshot) => {
            mangaGrid.innerHTML = '';
            snapshot.forEach((docSnap) => {
                const manga = docSnap.data();
                const id = docSnap.id;
                const card = document.createElement('div');
                card.className = "group relative bg-white/5 rounded-3xl overflow-hidden border border-white/10 hover:border-blue-500 transition-all cursor-pointer";
                card.innerHTML = `
                    <img src="${manga.cover}" class="w-full aspect-[3/4.5] object-cover group-hover:scale-105 transition-transform">
                    <div class="p-4 bg-gradient-to-t from-black to-transparent absolute bottom-0 left-0 right-0">
                        <h3 class="text-xs font-black uppercase truncate">${manga.title}</h3>
                    </div>
                    ${currentUser && currentUser.email === MONARCH_EMAIL ? `
                        <button onclick="event.stopPropagation(); deleteManga('${id}')" class="absolute top-2 right-2 p-2 bg-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    ` : ''}
                `;
                mangaGrid.appendChild(card);
            });
        });

        // Funções Admin
        window.deleteManga = async (id) => {
            if (confirm("Deseja banir esta obra do reino?")) {
                await deleteDoc(doc(db, "mangas", id));
            }
        };

        window.addManga = async (e) => {
            e.preventDefault();
            const title = document.getElementById('manga-title').value;
            const cover = document.getElementById('manga-cover').value;
            await addDoc(collection(db, "mangas"), {
                title, cover, createdAt: new Date().toISOString()
            });
            alert("Obra Imortalizada!");
            e.target.reset();
        };

        document.getElementById('manga-form').onsubmit = addManga;

    </script>
    <style>
        body { background-color: #050505; color: #e2e8f0; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #2563eb; border-radius: 10px; }
    </style>
</head>
<body class="min-h-screen font-sans">

    <!-- NAVBAR -->
    <nav class="max-w-7xl mx-auto p-6 flex justify-between items-center border-b border-white/5 sticky top-0 bg-black/80 backdrop-blur-md z-50">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            </div>
            <span class="text-xl font-black italic tracking-tighter uppercase">Lumi Mangás</span>
        </div>
        
        <div class="flex items-center gap-4">
            <button id="login-btn" class="bg-blue-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all">Entrar</button>
            <div id="user-area" class="hidden flex items-center gap-4"></div>
        </div>
    </nav>

    <!-- MAIN -->
    <main class="max-w-7xl mx-auto p-6">
        <header class="text-center py-16">
            <h1 class="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter mb-4 leading-none">REINO <span class="text-blue-600">JEAN</span></h1>
            <p class="text-slate-500 font-bold uppercase tracking-[0.5em] text-[10px] opacity-60">Protocolo de Restauração V2.3</p>
        </header>

        <!-- ADMIN PANEL -->
        <section id="admin-panel" class="hidden mb-12 max-w-xl mx-auto bg-white/5 p-8 rounded-[40px] border border-blue-500/20">
            <h2 class="text-2xl font-black uppercase text-blue-500 mb-6 flex items-center gap-2">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path></svg>
                Forja do Monarca
            </h2>
            <form id="manga-form" class="space-y-4">
                <input id="manga-title" placeholder="Título da Obra" required class="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-blue-500 font-bold">
                <input id="manga-cover" placeholder="URL da Capa" required class="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-blue-500">
                <button type="submit" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-900/40">Imortalizar</button>
            </form>
        </section>

        <!-- GRID DE MANGÁS -->
        <div id="manga-grid" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
            <!-- Carregado via Firebase -->
        </div>
    </main>

    <footer class="py-24 text-center opacity-10 text-[8px] font-black uppercase tracking-[1em]">
        Lumi Mangás • Soberania de Jean • 2026
    </footer>

</body>
</html>

