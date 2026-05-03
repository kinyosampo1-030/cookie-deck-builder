// @ts-nocheck
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Search, Filter, Trash2, AlertCircle, Layers, Box, Zap, AlertTriangle, Palette, RotateCw, Plus, Minus, X, Image as ImageIcon, Upload, Eye, Share2, Download, Link as LinkIcon, Copy, Database, Cloud, Lock, Unlock, LogOut, RefreshCw, Pencil, Star, Youtube, FileJson, WifiOff, CheckCircle, Cookie, Ban, AlertOctagon, Menu, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ExternalLink, Facebook, UserCog, Dices, PackageOpen, Printer, Repeat, Gem, Languages, Crown, Flame, PawPrint, Sparkles, Swords, Save, Globe, MessageCircle, Heart, Send, Clock 
} from "lucide-react";

import { initializeApp } from "firebase/app";
import {
  getAuth, signInAnonymously, signInWithCustomToken, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore, initializeFirestore, persistentLocalCache, collection, doc, setDoc, getDoc, addDoc, onSnapshot, query, writeBatch, deleteDoc, where, getDocs, orderBy, updateDoc, increment, runTransaction, limit
} from "firebase/firestore";

// 👇 [Storage 第一步]：新增這行，引入 Storage 相關功能
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

// --- Firebase Initialization ---
let app = null; let auth = null; let db = null;
let storage = null; // 👇 [Storage 第二步 A]：宣告 storage 變數
const appId = "my-deck-builder-v1";

const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "AIzaSyDK-feks4M0aZaJY4-gFcP_TxVcJLfMuxo",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "cookierunbraverse.firebaseapp.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "cookierunbraverse",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "cookierunbraverse.firebasestorage.app",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "1061622650816",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:1061622650816:web:b61e2490336b244bf01a25",
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || "G-YK70VGHNRN",
};

try {
  if (firebaseConfig.apiKey) { 
    app = initializeApp(firebaseConfig); 
    auth = getAuth(app); 
    
    // 🌟 啟動本地快取魔法 (Local Cache) (您已經完美完成了！)
    db = initializeFirestore(app, {
      localCache: persistentLocalCache()
    });

    // 👇 [Storage 第二步 B]：初始化 Storage
    storage = getStorage(app);
  } 
  else { console.warn("Firebase API Key not found."); }
} catch (e) { console.error("Firebase initialization failed:", e); }

// --- 🌟 雙語翻譯字典 (Translation Engine) ---
const t = (text, lang) => {
  if (lang === 'zh') return text;
  const dict = {
    // Types
    "餅乾卡": "Cookie", "道具卡": "Item", "陷阱卡": "Trap", "場景卡": "Stage",
    // Colors
    "紅色": "Red", "黃色": "Yellow", "綠色": "Green", "藍色": "Blue", "紫色": "Purple", "無色": "Pure",
    // Skills (包含最新的暈倒時、無技能等)
    "登場時": "On Play", "一回合一次": "Once per turn", "啟動": "Activate", "回合結束時": "Turn ends", "阻擋": "Blocker", "被動效果": "Passive", "在自己回合中": "Your turn", "暈倒時": "Faints", "無技能": "No Skill", "純白板": "Vanilla",
    // UI & Attributes
    "上古": "Ancient", "龍族": "Dragon", "野獸": "Beast", "靈魂果醬": "Soul Jam", "競技場": "Arena", "禁止": "Banned", "Limit 1": "Limit 1"
  };
  return dict[text] || text;
};

// 🌟 取得卡片名稱 (若為英文版且有填寫英文名稱，則顯示英文)
const cName = (card, lang) => (lang === 'en' && card.nameEn) ? card.nameEn : card.name;

// --- Constants ---
const CARD_TYPES = { COOKIE: "餅乾卡", ITEM: "道具卡", TRAP: "陷阱卡", SCENE: "場景卡" };
const CARD_COLORS = { RED: "紅色", YELLOW: "黃色", GREEN: "綠色", BLUE: "藍色", PURPLE: "紫色", COLORLESS: "無色" };
const CARD_LEVELS = { LV1: "LV.1", LV2: "LV.2", LV3: "LV.3" };
// 包含 BS10
const CARD_SERIES_OPTIONS = ["ST", "BS1", "BS2", "BS3", "BS4", "BS5", "BS6", "BS7", "BS8", "BS9", "BS10", "P"];

const CARD_RARITIES = { C: "C (Common)", R: "R (Rare)", SR: "SR (Super Rare)", UR: "UR (Ultra Rare)", EXR: "EXR (Extra Rare)" };

// 🌟 餅乾技能標籤清單
const COOKIE_SKILLS = ["登場時", "一回合一次", "啟動", "在自己回合中","回合結束時", "暈倒時", "阻擋", "被動效果", "無技能", "純白板"];

const CARD_BACK_URL = "https://static.wixstatic.com/media/2295bf_b9aee85e881243d99276b2f571927305~mv2.png";

const INITIAL_CARDS = [
  {
    id: "BS1-001", series: "BS1", number: "001", name: "勇氣餅乾", nameEn: "GingerBrave", type: CARD_TYPES.COOKIE, color: CARD_COLORS.RED, level: CARD_LEVELS.LV1, rarity: "C", 
    skills: ["無技能"], isExtra: false, isFlip: true, isAncient: false, isDragon: false, isBeast: false, isSoulJam: false, isForbidden: false, isLimitOne: false, effectText: "", showEffect: false, imageUrl: null,
  },
];

const isExtraDeckCard = (card) => card.isExtra === true;

const getCardColorStyles = (color) => {
  switch (color) {
    case CARD_COLORS.RED: return "bg-red-50 border-red-500 text-red-900";
    case CARD_COLORS.YELLOW: return "bg-yellow-50 border-yellow-500 text-yellow-900";
    case CARD_COLORS.GREEN: return "bg-emerald-50 border-emerald-500 text-emerald-900";
    case CARD_COLORS.BLUE: return "bg-blue-50 border-blue-500 text-blue-900";
    case CARD_COLORS.PURPLE: return "bg-purple-50 border-purple-500 text-purple-900";
    case CARD_COLORS.COLORLESS: return "bg-slate-100 border-slate-400 text-slate-800";
    default: return "bg-gray-100 border-gray-400 text-gray-800";
  }
};

const getRarityStyle = (rarity) => {
    switch (rarity) {
        case 'EXR': return "bg-gradient-to-r from-rose-400 to-red-500 text-white border-rose-600 shadow-rose-200"; 
        case 'UR': return "bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-amber-600 shadow-amber-200";
        case 'SR': return "bg-slate-700 text-white border-slate-800";
        case 'R': return "bg-blue-100 text-blue-800 border-blue-300";
        default: return "bg-slate-100 text-slate-600 border-slate-300";
    }
};

const groupCards = (cardList) => {
  const groups = {};
  cardList.forEach((card) => {
    const key = card.id;
    if (!groups[key]) groups[key] = { ...card, stackCount: 0 };
    groups[key].stackCount += 1;
  });
  return Object.values(groups).sort((a, b) => a.id.localeCompare(b.id));
};

const getDisplaySortWeight = (card) => {
    if (card.isFlip) return 100;
    if (card.type === CARD_TYPES.COOKIE) {
        if (card.level === CARD_LEVELS.LV1) return 1;
        if (card.level === CARD_LEVELS.LV2) return 2;
        if (card.level === CARD_LEVELS.LV3) return 3;
        return 4;
    }
    if (card.type === CARD_TYPES.ITEM) return 5;
    if (card.type === CARD_TYPES.TRAP) return 6;
    if (card.type === CARD_TYPES.SCENE) return 7;
    return 8;
};

const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image(); img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas"); const MAX_WIDTH = 400; const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext("2d"); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const fisherYatesShuffle = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
};

// --- Components ---

const Toast = ({ message, onClose }) => {
  useEffect(() => { const timer = setTimeout(onClose, 5000); return () => clearTimeout(timer); }, [message, onClose]);
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] animate-bounce pointer-events-none">
      <div className="bg-slate-800 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-2 font-bold border border-slate-600 pointer-events-auto cursor-pointer" onClick={onClose}><AlertCircle size={20} className="text-blue-400" />{message}</div>
    </div>
  );
};

const ProfileModal = ({ user, onClose, onUpdateProfile, onLogout, lang }) => {
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) return alert(lang==='en'?"Please enter a display name":"請輸入暱稱");
    setIsUpdating(true);
    try { await onUpdateProfile(displayName); onClose(); } catch (error) { alert("Error: " + error.message); } finally { setIsUpdating(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800"><UserCog className="text-blue-600" /> {lang==='en'?'Profile':'會員資料管理'}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800 rounded-full transition-colors"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div><label className="block text-xs font-bold text-slate-700 mb-1">{lang==='en'?'Display Name':'顯示名稱 (暱稱)'}</label><input type="text" required className="w-full border-2 border-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button type="submit" disabled={isUpdating} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm active:scale-95">{isUpdating ? "..." : (lang==='en'?'Save':'儲存修改')}</button>
            <button type="button" onClick={() => { onClose(); if (onLogout) onLogout(); }} className="flex-none bg-red-50 text-red-600 px-4 py-2.5 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1 border border-red-100 active:scale-95"><LogOut size={18} /> {lang==='en'?'Logout':'登出'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AuthModal = ({ onClose, onLogin, onRegister, lang }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      if (isRegister) {
        if (password.length < 6) throw new Error(lang==='en'?"Password too short":"密碼長度需大於6位");
        if (!displayName.trim()) throw new Error(lang==='en'?"Name required":"請輸入玩家暱稱");
        await onRegister(email, password, displayName);
      } else { await onLogin(email, password); }
      onClose();
    } catch (err) {
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') msg = lang==='en'?"Email in use":"此 Email 已被註冊";
      if (err.code === 'auth/invalid-credential') msg = lang==='en'?"Wrong credentials":"帳號或密碼錯誤";
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800"><UserCog className={isRegister ? "text-green-600" : "text-blue-600"} /> {isRegister ? (lang==='en'?'Register':'註冊新帳號') : (lang==='en'?'Login':'會員登入')}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800 rounded-full transition-colors"><X size={24} /></button>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
          <button type="button" onClick={() => { setIsRegister(false); setError(null); }} className={`flex-1 py-2 text-sm font-black rounded-md transition-all ${!isRegister ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{lang==='en'?'Login':'登入'}</button>
          <button type="button" onClick={() => { setIsRegister(true); setError(null); }} className={`flex-1 py-2 text-sm font-black rounded-md transition-all ${isRegister ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{lang==='en'?'Register':'註冊'}</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-600 text-xs font-bold bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}
          {isRegister && (<div><label className="block text-xs font-bold text-slate-700 mb-1">{lang==='en'?'Display Name':'玩家暱稱'}</label><input type="text" required={isRegister} className="w-full border-2 border-slate-200 rounded-lg p-2.5 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>)}
          <div><label className="block text-xs font-bold text-slate-700 mb-1">Email</label><input type="email" required className="w-full border-2 border-slate-200 rounded-lg p-2.5 outline-none transition-all" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><label className="block text-xs font-bold text-slate-700 mb-1">Password</label><input type="password" required className="w-full border-2 border-slate-200 rounded-lg p-2.5 outline-none transition-all" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <button type="submit" disabled={loading} className={`w-full text-white py-3 rounded-xl font-black text-lg transition-all shadow-lg active:scale-95 disabled:opacity-50 mt-2 ${isRegister ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{loading ? "..." : (isRegister ? (lang==='en'?'Register':'立即註冊') : (lang==='en'?'Login':'確認登入'))}</button>
        </form>
      </div>
    </div>
  );
};

const DeckDetailView = ({ deckData, allCards, onClose, onLoadDeck, user, lang }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isLiking, setIsLiking] = useState(false);
    const [hasLiked, setHasLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(deckData.likes || 0);

    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'community_comments'), where('deckId', '==', deckData.id));
        const unsubscribe = onSnapshot(q, (snap) => {
            let loadedComments = snap.docs.map(d => ({id: d.id, ...d.data()}));
            loadedComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setComments(loadedComments);
        });
        if (user && !user.isAnonymous) {
            const checkLike = async () => {
                const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'community_likes', `${deckData.id}_${user.uid}`);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) setHasLiked(true);
            };
            checkLike();
        }
        return () => unsubscribe();
    }, [deckData.id, user]);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!user || user.isAnonymous) return alert(lang==='en'?"Please login":"請先登入會員");
        if (!newComment.trim()) return;
        setIsSending(true);
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'community_comments'), { deckId: deckData.id, userId: user.uid, userName: user.displayName || "Player", content: newComment.trim(), createdAt: new Date().toISOString() });
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'community_decks', deckData.id), { commentCount: increment(1) });
            setNewComment("");
        } catch (err) { alert("Error"); } finally { setIsSending(false); }
    };

    const handleToggleLike = async () => {
        if (!user || user.isAnonymous) return;
        if (isLiking) return;
        setIsLiking(true);
        const likeRef = doc(db, 'artifacts', appId, 'public', 'data', 'community_likes', `${deckData.id}_${user.uid}`);
        const deckRef = doc(db, 'artifacts', appId, 'public', 'data', 'community_decks', deckData.id);
        try {
            if (hasLiked) { await deleteDoc(likeRef); await updateDoc(deckRef, { likes: increment(-1) }); setHasLiked(false); setLikesCount(p => p - 1); } 
            else { await setDoc(likeRef, { deckId: deckData.id, userId: user.uid }); await updateDoc(deckRef, { likes: increment(1) }); setHasLiked(true); setLikesCount(p => p + 1); }
        } catch (err) {} finally { setIsLiking(false); }
    };

    const handleCopyDeck = async () => {
        try { if (db) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'community_decks', deckData.id), { copyCount: increment(1) }); } catch (err) {}
        onLoadDeck({main: rawM, extra: rawE}, deckData.name);
        onClose();
    };

    const getSortedGroups = (cardList) => {
        const cookies = groupCards(cardList.filter(c => c.type === CARD_TYPES.COOKIE && !c.isFlip));
        cookies.sort((a, b) => {
            const getLevelVal = (lvl) => { if (lvl === CARD_LEVELS.LV1) return 1; if (lvl === CARD_LEVELS.LV2) return 2; if (lvl === CARD_LEVELS.LV3) return 3; return 99; }
            return getLevelVal(a.level) - getLevelVal(b.level) || a.id.localeCompare(b.id);
        });
        const others = groupCards(cardList.filter(c => c.type !== CARD_TYPES.COOKIE && !c.isFlip));
        others.sort((a, b) => {
             const getTypeVal = (t) => { if (t === CARD_TYPES.ITEM) return 1; if (t === CARD_TYPES.TRAP) return 2; if (t === CARD_TYPES.SCENE) return 3; return 4; }
             return getTypeVal(a.type) - getTypeVal(b.type) || a.id.localeCompare(b.id);
        });
        const flips = groupCards(cardList.filter(c => c.isFlip));
        flips.sort((a, b) => a.id.localeCompare(b.id));
        return { cookies, others, flips };
    };

    const getDeckCards = () => {
        const m = (deckData.m || []).map(id => allCards.find(c => c.id === id)).filter(Boolean);
        const e = (deckData.e || []).map(id => allCards.find(c => c.id === id)).filter(Boolean);
        const { cookies, others, flips } = getSortedGroups(m);
        const extras = groupCards(e).sort((a, b) => a.id.localeCompare(b.id));
        return { cookies, others, flips, extras, rawM: m, rawE: e };
    };
    const { cookies, others, flips, extras, rawM, rawE } = getDeckCards();

    const renderMiniCard = (group) => (
        <div key={group.id} className="relative aspect-[3/4] bg-slate-200 rounded border border-slate-300 overflow-hidden group shadow-sm">
             {group.imageUrl ? <img src={group.imageUrl} alt={group.name} className="w-full h-full object-cover"/> : <div className={`w-full h-full p-1 text-[8px] flex flex-col ${getCardColorStyles(group.color)}`}><span className="font-bold leading-tight line-clamp-3">{cName(group, lang)}</span></div>}
             <div className="absolute bottom-1 right-1 bg-black text-white text-xs md:text-sm font-black w-6 h-6 md:w-8 md:h-8 rounded shadow-md border border-white/50 z-10 flex items-center justify-center leading-none pb-0.5">x{group.stackCount}</div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-white p-4 border-b flex justify-between items-center shrink-0">
                    <div><h2 className="text-xl font-bold text-slate-800">{deckData.name}</h2><p className="text-xs text-slate-500">Author: <span className="font-bold text-slate-700">{deckData.authorName}</span> · {new Date(deckData.createdAt).toLocaleDateString()}</p></div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={24}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                             <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                                <div className="flex gap-2">
                                    <button onClick={handleToggleLike} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-colors shadow-sm ${hasLiked ? 'bg-pink-100 text-pink-600 border border-pink-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'}`}><Heart size={16} className={hasLiked ? "fill-pink-600" : ""} /> {likesCount}</button>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-sm font-bold border border-blue-100 shadow-sm"><MessageCircle size={16} /> {comments.length}</div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-sm font-bold border border-emerald-100 shadow-sm"><Copy size={16} /> {deckData.copyCount || 0}</div>
                                </div>
                                <button onClick={handleCopyDeck} className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2 rounded-lg font-bold hover:from-blue-700 hover:to-blue-600 shadow-md flex items-center gap-2 transition-transform active:scale-95"><Copy size={16}/> {lang==='en'?'Copy Deck':'複製並編輯'}</button>
                             </div>
                             <div className="space-y-6">
                                {cookies.length > 0 && (<div><h4 className="font-bold text-slate-700 text-sm mb-2 border-l-4 border-yellow-400 pl-2">Cookies</h4><div className="grid grid-cols-6 sm:grid-cols-8 gap-2">{cookies.map(renderMiniCard)}</div></div>)}
                                {others.length > 0 && (<div><h4 className="font-bold text-slate-700 text-sm mb-2 border-l-4 border-blue-400 pl-2">Items / Traps / Stages</h4><div className="grid grid-cols-6 sm:grid-cols-8 gap-2">{others.map(renderMiniCard)}</div></div>)}
                                {flips.length > 0 && (<div><h4 className="font-bold text-slate-700 text-sm mb-2 border-l-4 border-slate-600 pl-2">FLIP</h4><div className="grid grid-cols-6 sm:grid-cols-8 gap-2">{flips.map(renderMiniCard)}</div></div>)}
                                {extras.length > 0 && (<div><h4 className="font-bold text-slate-700 text-sm mb-2 border-l-4 border-purple-500 pl-2">Extra Deck</h4><div className="grid grid-cols-6 sm:grid-cols-8 gap-2">{extras.map(renderMiniCard)}</div></div>)}
                             </div>
                        </div>
                    </div>
                    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
                        <div className="p-3 border-b bg-slate-50 font-bold text-slate-700 flex items-center gap-2"><MessageCircle size={16}/> {lang==='en'?'Comments':'留言板'}</div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {comments.length === 0 ? <div className="text-center text-slate-400 text-sm py-4">{lang==='en'?'No comments yet!':'還沒有留言，搶頭香！'}</div> : comments.map(c => {
                                const isAuthor = c.userId === deckData.authorId;
                                return (
                                <div key={c.id} className={`text-sm border-b border-slate-100 pb-3 last:border-0 ${isAuthor ? 'bg-blue-50/50 p-2 rounded-lg border-blue-100' : ''}`}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <div className="flex items-center gap-1.5"><span className={`font-bold ${isAuthor ? 'text-blue-700' : 'text-slate-800'}`}>{c.userName}</span>{isAuthor && <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold tracking-wider">Author</span>}</div>
                                        <span className="text-[10px] text-slate-400 font-mono">{new Date(c.createdAt).toLocaleString()}</span>
                                    </div>
                                    <p className={`break-words leading-relaxed ${isAuthor ? 'text-blue-900' : 'text-slate-600'}`}>{c.content}</p>
                                </div>
                            )})}
                        </div>
                        <form onSubmit={handleAddComment} className="p-3 border-t bg-slate-50 flex gap-2">
                            <input className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder={user && !user.isAnonymous ? "..." : (lang==='en'?'Please login...':'請先登入...')} value={newComment} onChange={e => setNewComment(e.target.value)} disabled={!user || user.isAnonymous || isSending} />
                            <button type="submit" disabled={!user || user.isAnonymous || isSending} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"><Send size={18}/></button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CommunityModal = ({ allCards, onClose, onLoadDeck, user, isAdmin, lang }) => {
    const [decks, setDecks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterColor, setFilterColor] = useState("ALL");
    const [sortBy, setSortBy] = useState("latest");
    const [selectedDeck, setSelectedDeck] = useState(null);

    useEffect(() => {
        if (!db) return;
        const fetchDecks = async () => {
            setLoading(true);
            try {
                let q = query(collection(db, 'artifacts', appId, 'public', 'data', 'community_decks'), limit(200)); 
                const snapshot = await getDocs(q);
                let loadedDecks = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
                if (filterColor !== "ALL") loadedDecks = loadedDecks.filter(x => x.colors?.includes(filterColor));
                loadedDecks.sort((a, b) => {
                    if (sortBy === 'likes') return (b.likes || 0) - (a.likes || 0) || new Date(b.createdAt) - new Date(a.createdAt);
                    if (sortBy === 'copies') return (b.copyCount || 0) - (a.copyCount || 0) || new Date(b.createdAt) - new Date(a.createdAt);
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
                setDecks(loadedDecks);
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        fetchDecks();
    }, [filterColor, sortBy]);
    
    const getCoverImage = (deck) => {
        if (deck.coverId) { const card = allCards.find(c => c.id === deck.coverId); if (card && card.imageUrl) return card.imageUrl; }
        if (deck.m && deck.m.length > 0) { const firstCard = allCards.find(c => c.id === deck.m[0]); if (firstCard && firstCard.imageUrl) return firstCard.imageUrl; }
        return CARD_BACK_URL;
    };

    const handleDeleteCommunityDeck = async (deckId, deckName) => {
    if (!confirm(`確定要刪除「${deckName}」這份牌組嗎？此動作無法復原。`)) return;

    try {
      // 指向資料庫中該份牌組的路徑
      const deckRef = doc(db, "artifacts", appId, "public", "data", "community_decks", deckId);
      await deleteDoc(deckRef);
      alert("牌組已成功從社群廣場移除。");
      // 刪除後不需要重新整理，Firestore 的 onSnapshot 會自動更新畫面
    } catch (error) {
      console.error("刪除失敗:", error);
      alert("刪除失敗：您並沒有權限刪除此牌組，或請聯絡管理員。");
    }
  };

    return (
        <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-100 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-white p-4 border-b flex justify-between items-center shrink-0">
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Globe className="text-blue-500" /> {lang==='en'?'Community':'牌組社群廣場'}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={24}/></button>
                </div>
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex gap-2 overflow-x-auto shrink-0 shadow-inner">
                    <button onClick={() => setSortBy('latest')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${sortBy === 'latest' ? 'bg-white text-blue-700 shadow border border-blue-200' : 'text-slate-500 hover:bg-slate-200 border border-transparent'}`}><Clock size={16}/> {lang==='en'?'Latest':'最新發布'}</button>
                    <button onClick={() => setSortBy('likes')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${sortBy === 'likes' ? 'bg-white text-pink-700 shadow border border-pink-200' : 'text-slate-500 hover:bg-slate-200 border border-transparent'}`}><Flame size={16}/> {lang==='en'?'Most Liked':'最多按讚'}</button>
                    <button onClick={() => setSortBy('copies')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${sortBy === 'copies' ? 'bg-white text-emerald-700 shadow border border-emerald-200' : 'text-slate-500 hover:bg-slate-200 border border-transparent'}`}><Copy size={16}/> {lang==='en'?'Most Copied':'最多複製'}</button>
                </div>
                <div className="bg-white p-3 border-b flex gap-2 overflow-x-auto shrink-0">
                    <button onClick={() => setFilterColor("ALL")} className={`px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${filterColor === "ALL" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{lang==='en'?'ALL':'全部'}</button>
                    {Object.values(CARD_COLORS).map(c => (
                         <button key={c} onClick={() => setFilterColor(c)} className={`px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${filterColor === c ? "ring-2 ring-offset-1 ring-slate-400" : "opacity-60 hover:opacity-100"}`} style={{backgroundColor: c === '紅色' ? '#fee2e2' : c === '黃色' ? '#fef9c3' : c === '綠色' ? '#d1fae5' : c === '藍色' ? '#dbeafe' : c === '紫色' ? '#f3e8ff' : '#f1f5f9', color: '#334155'}}>{t(c, lang)}</button>
                    ))}
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (<div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>) : decks.length === 0 ? (<div className="flex flex-col items-center justify-center h-full text-slate-400"><Box size={64} className="mb-4 opacity-20"/><p>No decks found.</p></div>) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {decks.map(d => (
                                <div key={d.id} onClick={() => setSelectedDeck(d)} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden flex flex-col group h-full relative">
                                    {sortBy === 'likes' && d.likes > 0 && <div className="absolute top-2 right-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-md z-10 flex items-center gap-1"><Flame size={12}/> HOT</div>}
                                    <div className="h-32 bg-slate-200 overflow-hidden relative">
                                        <img src={getCoverImage(d)} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Deck Cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                        <div className="absolute bottom-2 left-2 flex gap-1">
                                             {d.colors && d.colors.map(c => <div key={c} className="w-3 h-3 rounded-full border border-white" style={{backgroundColor: c === '紅色' ? '#ef4444' : c === '黃色' ? '#eab308' : c === '綠色' ? '#10b981' : c === '藍色' ? '#3b82f6' : c === '紫色' ? '#a855f7' : '#94a3b8'}}></div>)}
                                        </div>
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col">
                                        <h3 className="font-bold text-lg text-slate-800 line-clamp-1 mb-1 group-hover:text-blue-600">{d.name}</h3>
                                        <div className="text-xs text-slate-400 mb-4 flex items-center gap-2"><span className="font-bold text-slate-500">{d.authorName}</span><span>•</span><span>{new Date(d.createdAt).toLocaleDateString()}</span></div>
                                        <div className="mt-auto flex justify-between items-center text-sm text-slate-500">
                                            <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded font-bold text-xs"><Layers size={12}/> {d.m?.length || 0}</span>
                                            <div className="flex gap-3 items-center">
                                                {(isAdmin || (user && d.authorId === user.uid)) && (
        <button 
            onClick={(e) => {
                e.stopPropagation(); // 防止點到卡片背後的開啟事件
                handleDeleteCommunityDeck(d.id, d.name);
            }} 
            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-full transition-colors z-10"
            title="刪除牌組"
        >
            <Trash2 size={14}/>
        </button>
    )}
                                                <span className="flex items-center gap-1 font-bold text-pink-600"><Heart size={14} className={d.likes > 0 ? "fill-pink-600" : ""}/> {d.likes || 0}</span>
                                                <span className="flex items-center gap-1 text-slate-400"><MessageCircle size={14}/> {d.commentCount || 0}</span>
                                                <span className="flex items-center gap-1 text-emerald-600 font-bold"><Copy size={14}/> {d.copyCount || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {selectedDeck && <DeckDetailView deckData={selectedDeck} allCards={allCards} onClose={() => setSelectedDeck(null)} onLoadDeck={onLoadDeck} user={user} lang={lang} />}
        </div>
    );
};

const DeckStorageModal = ({ userId, currentDeck, currentDeckName, allCards, onClose, onLoadDeck, onPublish, lang }) => {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveName, setSaveName] = useState(currentDeckName);
  const [selectedCover, setSelectedCover] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const deckUniqueCards = useMemo(() => {
      const uniqueIds = [...new Set((currentDeck?.main || []).map(c => c.id))];
      return uniqueIds.map(id => allCards.find(c => c.id === id)).filter(Boolean);
  }, [currentDeck, allCards]);

  useEffect(() => { if (deckUniqueCards.length > 0 && !selectedCover) setSelectedCover(deckUniqueCards[0].id); }, [deckUniqueCards]);

  useEffect(() => {
    if (!userId || !db) return;
    const fetchDecks = async () => {
       try {
         const q = query(collection(db, 'artifacts', appId, 'users', userId, 'decks'), orderBy('updatedAt', 'desc'));
         const snapshot = await getDocs(q);
         setDecks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
       } catch (e) {
         if (e.code === 'failed-precondition') {
             const q2 = query(collection(db, 'artifacts', appId, 'users', userId, 'decks'));
             const snapshot = await getDocs(q2);
             const loadedDecks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
             loadedDecks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
             setDecks(loadedDecks);
         }
       } finally { setLoading(false); }
    };
    fetchDecks();
  }, [userId]);

  const handleSave = async () => {
    if (!saveName.trim()) return alert(lang==='en'?"Enter Name":"請輸入牌組名稱");
    setIsSaving(true);
    try {
        const deckData = { name: saveName, m: (currentDeck?.main || []).map(c => c.id), e: (currentDeck?.extra || []).map(c => c.id), coverId: selectedCover, updatedAt: new Date().toISOString() };
        const existing = decks.find(d => d.name === saveName);
        if (existing) {
            if (!confirm(lang==='en'?"Overwrite?":`確定要覆蓋 "${saveName}" 嗎？`)) { setIsSaving(false); return; }
            await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'decks', existing.id), deckData);
        } else { await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'decks'), deckData); }
        const q = query(collection(db, 'artifacts', appId, 'users', userId, 'decks'), orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        const loadedDecks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        loadedDecks.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        setDecks(loadedDecks);
        alert("Saved!");
    } catch (e) { alert("Error"); } finally { setIsSaving(false); }
  };

  const handleDelete = async (e, deckId) => {
      e.stopPropagation();
      if (!confirm("Delete?")) return;
      try { await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'decks', deckId)); setDecks(prev => prev.filter(d => d.id !== deckId)); } catch (e) {}
  };

  const handlePublish = async (e, deck) => {
      e.stopPropagation();
      if (!confirm(lang==='en'?"Publish to community?":`確定要發布 "${deck.name}" 到社群嗎？`)) return;
      await onPublish(deck);
  };

  const handleLoadDeckClick = (savedDeck) => {
     if (currentDeck?.main?.length > 0 && !confirm(lang==='en'?"Overwrite current deck?":"目前的牌組將被覆蓋，確定要載入嗎？")) return;
     const mainCards = []; const extraCards = [];
     (savedDeck.m || []).forEach(id => { const c = allCards.find(card => card.id === id); if (c) mainCards.push(c); });
     (savedDeck.e || []).forEach(id => { const c = allCards.find(card => card.id === id); if (c) extraCards.push(c); });
     onLoadDeck({ main: mainCards, extra: extraCards }, savedDeck.name);
     onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
         <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white rounded-t-xl"><h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Save className="text-blue-600"/> {lang==='en'?'My Cloud Decks':'我的雲端牌組'}</h2><button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={24}/></button></div>
         <div className="p-4 bg-blue-50 border-b border-blue-100 shrink-0 space-y-3">
             <div className="flex flex-col gap-1"><label className="text-xs font-bold text-blue-800">{lang==='en'?'Deck Name':'1. 輸入牌組名稱'}</label><input type="text" value={saveName} onChange={e => setSaveName(e.target.value)} className="border border-blue-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
             {deckUniqueCards.length > 0 && (
                <div className="flex flex-col gap-1"><label className="text-xs font-bold text-blue-800">{lang==='en'?'Cover Card':'2. 選擇封面卡片'}</label><select value={selectedCover} onChange={e => setSelectedCover(e.target.value)} className="border border-blue-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">{deckUniqueCards.map(c => (<option key={c.id} value={c.id}>{cName(c, lang)} ({c.id})</option>))}</select></div>
             )}
             <button onClick={handleSave} disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold text-sm flex items-center justify-center gap-1 disabled:opacity-50 mt-2">{isSaving ? "..." : <><Save size={16}/> {lang==='en'?'Save Deck':'儲存目前的配置'}</>}</button>
         </div>
         <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
             <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">{lang==='en'?'Saved Decks':'已儲存的牌組'} ({decks.length})</h3>
             {loading ? <div className="text-center py-8 text-slate-400">...</div> : decks.length === 0 ? <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">Empty</div> : (
                 <div className="space-y-2">{decks.map(d => (
                         <div key={d.id} onClick={() => handleLoadDeckClick(d)} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md cursor-pointer transition-all flex justify-between items-center group">
                             <div><div className="font-bold text-slate-800 text-sm md:text-base">{d.name}</div><div className="text-[10px] md:text-xs text-slate-400 mt-1 flex gap-2"><span>{d.updatedAt ? new Date(d.updatedAt).toLocaleDateString() : ''}</span><span>·</span><span>{d.m ? d.m.length : 0}</span></div></div>
                             <div className="flex gap-1"><button onClick={(e) => handlePublish(e, d)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-all"><Globe size={16}/></button><button onClick={(e) => handleDelete(e, d.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button></div>
                         </div>
                     ))}</div>
             )}
         </div>
      </div>
    </div>
  );
};

const ExportModal = ({ deck, deckName, onClose, lang }) => {
  const [activeTab, setActiveTab] = useState("image");
  const exportRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [generatedImage, setGeneratedImage] = useState(null);

  useEffect(() => {
    if (!window.html2canvas) {
      const script = document.createElement("script");
      script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const generateLongUrl = () => {
    const mainIds = deck.main.map((c) => c.id); const extraIds = deck.extra.map((c) => c.id);
    const data = JSON.stringify({ m: mainIds, e: extraIds, n: deckName });
    return `${window.location.href.split("?")[0]}?d=${btoa(encodeURIComponent(data))}`;
  };

  const handleGenerateShortLink = async () => {
    if (!db) return;
    setIsCreatingLink(true);
    try {
        const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'shared_decks'), { m: deck.main.map(c => c.id), e: deck.extra.map(c => c.id), n: deckName, createdAt: new Date().toISOString() });
        setShareUrl(`${window.location.href.split("?")[0]}?s=${docRef.id}`);
    } catch (error) { setShareUrl(generateLongUrl()); } finally { setIsCreatingLink(false); }
  };

  const handleDownloadImage = async () => {
    if (!window.html2canvas) return;
    setIsGenerating(true);
    try {
      const canvas = await window.html2canvas(exportRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true, windowWidth: 1200 });
      const imgData = canvas.toDataURL("image/png");
      setGeneratedImage(imgData);
      const link = document.createElement("a");
      link.download = `${deckName || "deck"}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = imgData;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (err) {} finally { setIsGenerating(false); }
  };

  const handleCopyLink = () => { if (!shareUrl) return; navigator.clipboard.writeText(shareUrl); alert(lang==='en'?"Copied!":"已複製！"); };
  const handlePrint = () => { window.print(); };

const grouped = useMemo(() => {
    const processGroup = (list) => groupCards(list).sort((a, b) => a.id.localeCompare(b.id));
    
    // 1. 餅乾卡的排序邏輯 (原本的，依 LV 排序)
    const cookiesRaw = deck.main.filter(c => c.type === CARD_TYPES.COOKIE && !c.isFlip);
    const cookiesGrouped = groupCards(cookiesRaw).sort((a, b) => {
        const getLvlVal = (lvl) => { if (lvl === CARD_LEVELS.LV1) return 1; if (lvl === CARD_LEVELS.LV2) return 2; if (lvl === CARD_LEVELS.LV3) return 3; return 99; };
        return getLvlVal(a.level) - getLvlVal(b.level) || a.id.localeCompare(b.id);
    });

    // 🌟 2. 新增：道具/陷阱/場景的專屬排序邏輯
    const othersRaw = deck.main.filter(c => c.type !== CARD_TYPES.COOKIE && !c.isFlip);
    const othersGrouped = groupCards(othersRaw).sort((a, b) => {
        // 給予不同種類權重：道具(1) -> 陷阱(2) -> 場景(3)
        const getTypeVal = (t) => { 
            if (t === CARD_TYPES.ITEM) return 1; 
            if (t === CARD_TYPES.TRAP) return 2; 
            if (t === CARD_TYPES.SCENE) return 3; 
            return 4; 
        };
        // 先比對種類權重，如果種類相同，才繼續比對卡片編號 (id)
        return getTypeVal(a.type) - getTypeVal(b.type) || a.id.localeCompare(b.id);
    });

    return {
        cookies: cookiesGrouped,
        items: processGroup(deck.main.filter(c => c.type === CARD_TYPES.ITEM)),
        traps: processGroup(deck.main.filter(c => c.type === CARD_TYPES.TRAP)),
        stages: processGroup(deck.main.filter(c => c.type === CARD_TYPES.SCENE)),
        flips: processGroup(deck.main.filter(c => c.isFlip)),
        extras: processGroup(deck.extra),
        // 🌟 3. 將原本的 processGroup 替換成我們寫好的 othersGrouped
        others: othersGrouped 
    };
  }, [deck]);

  const getSectionCount = (groups) => groups.reduce((acc, g) => acc + g.stackCount, 0);
  const flipCount = deck.main.filter(c => c.isFlip).length;

  const renderMiniCard = (group) => (
    <div key={group.id} className="relative aspect-[3/4] rounded overflow-hidden border border-slate-200 shadow-sm bg-slate-50 group">
        {group.imageUrl ? (<img src={group.imageUrl} alt={group.name} crossOrigin="anonymous" className="w-full h-full object-cover" />) : (<div className={`w-full h-full flex flex-col p-1 text-[8px] ${getCardColorStyles(group.color)}`}><span className="font-bold leading-tight line-clamp-3">{cName(group, lang)}</span></div>)}
        <div className="absolute bottom-1 right-1 bg-black text-white text-sm font-black w-7 h-7 md:w-8 md:h-8 rounded shadow-md border border-white/50 z-10 flex items-center justify-center leading-none pb-0.5">x{group.stackCount}</div>
    </div>
  );

  const renderPrintSection = (title, engTitle, groups, colorClass) => (
      <div className="mb-2 break-inside-avoid">
          <div className={`flex justify-between items-center px-2 py-1 mb-1 border-b-2 ${colorClass}`}><h3 className="font-bold text-sm text-slate-800">{lang==='en'?engTitle:title} <span className="text-[10px] font-normal text-slate-500 scale-90 origin-left inline-block">({engTitle})</span></h3><span className="font-bold text-xs bg-white px-2 rounded border border-slate-200">Total: {groups.reduce((a, g)=>a+g.stackCount, 0)}</span></div>
          <table className="w-full text-xs border-collapse">
              <thead><tr className="border-b border-slate-300 text-left text-[10px] text-slate-500"><th className="py-0.5 w-10 text-center">QTY</th><th className="py-0.5 w-20">ID</th><th className="py-0.5">{lang==='en'?'Card Name':'卡片名稱'}</th></tr></thead>
              <tbody>{groups.length === 0 ? (<tr><td colSpan="3" className="py-2 text-center text-slate-300 italic text-[10px]">-</td></tr>) : (groups.map(card => (<tr key={card.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50"><td className="py-1 text-center font-bold text-slate-700">{card.stackCount}</td><td className="py-1 font-mono text-slate-600">{card.id}</td><td className="py-1 text-slate-800 font-medium">{cName(card, lang)}</td></tr>)))}</tbody>
          </table>
      </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 print:p-0 print:bg-white print:static" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col print:shadow-none print:w-full print:max-h-none print:h-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start md:items-center p-4 border-b print:hidden">
          <h2 className="text-xl font-bold flex items-center gap-2"><Share2 className="text-blue-600" /> {lang==='en'?'Share / Export':'輸出與分享'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={24} /></button>
        </div>
        <div className="flex border-b print:hidden">
          <button onClick={() => setActiveTab("image")} className={`flex-1 py-3 font-bold text-sm ${activeTab === "image" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:bg-slate-50"}`}>Image</button>
          <button onClick={() => setActiveTab("link")} className={`flex-1 py-3 font-bold text-sm ${activeTab === "link" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:bg-slate-50"}`}>Link</button>
          <button onClick={() => setActiveTab("list")} className={`flex-1 py-3 font-bold text-sm ${activeTab === "list" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:bg-slate-50"}`}>Print List</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 print:bg-white print:p-0 print:overflow-visible">
          {activeTab === "image" && (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded shadow w-full flex flex-col md:flex-row justify-between items-center gap-4">
                <button onClick={handleDownloadImage} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 shrink-0">{isGenerating ? "..." : <><Download size={18} /> {lang==='en'?'Download Image':'下載圖片'}</>}</button>
              </div>
              {generatedImage ? (
                  <div className="w-full flex flex-col items-center gap-4 animate-in fade-in">
                      <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg text-sm w-full font-bold shadow-sm flex flex-col gap-2">
                         <p className="text-green-700">{lang==='en'?'If it didn’t download automatically on iOS, long-press the image to save.':'若 iOS 未自動下載，請長按圖片儲存。'}</p>
                         <button onClick={() => setGeneratedImage(null)} className="mt-2 text-blue-600 underline text-xs self-start">Back</button>
                      </div>
                      <img src={generatedImage} alt="Generated Deck" className="w-full max-w-3xl rounded-lg shadow-2xl border-4 border-slate-200" />
                  </div>
              ) : (
                  <div className="w-full overflow-x-auto pb-4">
                    <div ref={exportRef} className="bg-white p-4 md:p-8 rounded-lg shadow-lg min-w-[800px] lg:min-w-0 w-full mx-auto border border-slate-200">
                  
                  {/* 1. 標題與右上角數據看板 */}
                  <div className="flex justify-between items-end border-b-4 border-slate-800 pb-4 mb-6">
                      <div className="flex-1"><h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight leading-none">{deckName}</h1></div>
                      
                      <div className="flex flex-col items-end gap-2 text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider min-w-max ml-4">
                          
                          {/* 第一排：Total, Extra */}
                          <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1 bg-slate-800 text-white px-2 py-0.5 rounded shadow-sm"><Layers size={14} /> TOTAL: {deck.main.length}</span>
                              <span className="flex items-center gap-1 text-purple-600"><Zap size={14} /> EXTRA: {deck.extra.length}</span>
                          </div>
                          
                          {/* 第二排：Cookie, FLIP */}
                          <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1 text-yellow-600"><Cookie size={14} /> Cookie: {grouped.cookies.reduce((acc, g) => acc + g.stackCount, 0)}</span>
                              <span className="flex items-center gap-1 text-orange-600"><RotateCw size={14} /> FLIP: {deck.main.filter(c => c.isFlip).length}</span>
                          </div>
                          
                          {/* 第三排：Item, Trap, Stage */}
                          <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1 text-blue-600"><Box size={14} /> Item: {grouped.items.reduce((acc, g) => acc + g.stackCount, 0)}</span>
                              <span className="flex items-center gap-1 text-red-600"><Zap size={14} /> Trap: {grouped.traps.reduce((acc, g) => acc + g.stackCount, 0)}</span>
                              <span className="flex items-center gap-1 text-emerald-600"><Globe size={14} /> Stage: {grouped.stages.reduce((acc, g) => acc + g.stackCount, 0)}</span>
                          </div>

                  {/* 2. 中間的卡片清單區塊 */}
                  <div className="space-y-6">
                      {grouped.cookies.length > 0 && (<div><h3 className="font-bold text-slate-700 text-sm uppercase mb-2 border-l-4 border-yellow-400 pl-2">{lang==='en'?'Cookies':'餅乾卡'}</h3><div className="grid grid-cols-8 gap-1">{grouped.cookies.map(renderMiniCard)}</div></div>)}
                      {grouped.others.length > 0 && (<div><h3 className="font-bold text-slate-700 text-sm uppercase mb-2 border-l-4 border-blue-400 pl-2">{lang==='en'?'Items / Traps / Stages':'道具 / 陷阱 / 場景'}</h3><div className="grid grid-cols-8 gap-1">{grouped.others.map(renderMiniCard)}</div></div>)}
                      {grouped.flips.length > 0 && (<div><h3 className="font-bold text-slate-700 text-sm uppercase mb-2 border-l-4 border-slate-600 pl-2">FLIP Cards</h3><div className="grid grid-cols-8 gap-1">{grouped.flips.map(renderMiniCard)}</div></div>)}
                      {grouped.extras.length > 0 && (<div><h3 className="font-bold text-purple-900 text-sm uppercase mb-2 border-l-4 border-purple-400 pl-2">Extra Deck</h3><div className="grid grid-cols-8 gap-1">{grouped.extras.map(renderMiniCard)}</div></div>)}
                  </div>

                  {/* 3. 底部的商標區塊 (放在這裡才正確！) */}
                  <div className="mt-10 pt-4 border-t-2 border-slate-900 flex justify-between items-end">
                      <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Designed by</span>
                          <span className="text-sm font-bold text-slate-800">樂多綠 Gamecaster</span>
                      </div>
                      <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1.5 text-blue-600 font-black text-base md:text-lg tracking-tight">
                              <Cookie size={20} className="fill-blue-600" />
                              <span>Cookierun Braverse Deck Builder</span>
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono italic">All images © Devsisters Corp.</span>
                      </div>
                  </div>

              </div>
                        <div className="space-y-6">
                            {grouped.cookies.length > 0 && (<div><h3 className="font-bold text-slate-700 text-sm uppercase mb-2 border-l-4 border-yellow-400 pl-2">{lang==='en'?'Cookies':'餅乾卡'}</h3><div className="grid grid-cols-8 gap-1">{grouped.cookies.map(renderMiniCard)}</div></div>)}
                            {grouped.others.length > 0 && (<div><h3 className="font-bold text-slate-700 text-sm uppercase mb-2 border-l-4 border-blue-400 pl-2">{lang==='en'?'Items / Traps / Stages':'道具 / 陷阱 / 場景'}</h3><div className="grid grid-cols-8 gap-1">{grouped.others.map(renderMiniCard)}</div></div>)}
                            {grouped.flips.length > 0 && (<div><h3 className="font-bold text-slate-700 text-sm uppercase mb-2 border-l-4 border-slate-600 pl-2">FLIP Cards</h3><div className="grid grid-cols-8 gap-1">{grouped.flips.map(renderMiniCard)}</div></div>)}
                            {grouped.extras.length > 0 && (<div><h3 className="font-bold text-purple-900 text-sm uppercase mb-2 border-l-4 border-purple-400 pl-2">Extra Deck</h3><div className="grid grid-cols-8 gap-1">{grouped.extras.map(renderMiniCard)}</div></div>)}
                        </div>
                    </div>
              )}
            </div>
          )}
          {activeTab === "link" && (
            <div className="flex flex-col gap-6 max-w-lg mx-auto mt-8 min-h-[400px]">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
                    {/* 標題與圖示 */}
                    <div className="flex items-center gap-3 text-blue-600 border-b border-slate-100 pb-3">
                        <LinkIcon size={24} />
                        <h3 className="text-lg font-bold">
                            {lang === 'en' ? 'Permanent Share Link' : '製作永久分享連結'}
                        </h3>
                    </div>
                    
                    {/* 功能詳細說明 */}
                    <div className="space-y-3">
                        <p className="text-sm text-slate-600 leading-relaxed font-medium">
                            {lang === 'en' 
                              ? 'This function converts your current deck into a permanent cloud link.' 
                              : '此功能會將您目前的牌組配置轉換為一個專屬的雲端代碼。'}
                        </p>
                        <p className="text-sm text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border-l-4 border-blue-400">
                            {lang === 'en' 
                              ? 'Other players can use this link to directly view your deck and continue editing it in their own builder!' 
                              : '產生連結後，其他餅友可以直接透過連結查看您的配牌，並能以此為基礎繼續進行編輯與調整，非常適合分享給隊友或社群討論！'}
                        </p>
                    </div>

                    {/* 按鈕與結果區塊 */}
                    <div className="pt-4">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            {lang === 'en' ? 'Deck Secret Link' : '牌組專屬分享連結'}
                        </label>
                        <div className="flex gap-2">
                            {shareUrl ? (
                                <>
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={shareUrl} 
                                        className="flex-1 border-2 border-slate-100 rounded-lg px-3 py-2 text-slate-600 bg-slate-50 font-mono text-sm focus:outline-none" 
                                    />
                                    <button 
                                        onClick={handleCopyLink} 
                                        className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all active:scale-95 shrink-0"
                                    >
                                        <Copy size={18} /> {lang === 'en' ? 'Copy' : '複製'}
                                    </button>
                                </>
                            ) : (
                                <button 
                                    onClick={handleGenerateShortLink} 
                                    disabled={isCreatingLink} 
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                                >
                                    {isCreatingLink ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                            {lang === 'en' ? 'Saving to Cloud...' : '正在同步至雲端...'}
                                        </>
                                    ) : (
                                        <>
                                            <LinkIcon size={20} />
                                            {lang === 'en' ? 'Generate Permanent Link' : '立即產生永久連結'}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 底部小提示 */}
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3 items-start shrink-0">
                    <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    <div className="text-xs text-amber-800 leading-relaxed">
                        <p className="font-bold mb-1">{lang === 'en' ? 'Note:' : '溫馨小提示：'}</p>
                        <p>
                            {lang === 'en' 
                              ? 'The shared link is a static snapshot. If you modify your deck later, you will need to generate a new link to share the updated version.' 
                              : '分享連結是該時間點的快照。如果您之後修改了牌組，需要重新產生一個新連結才能分享最新的版本喔！'}
                        </p>
                    </div>
                </div>
            </div>
          )}
          {activeTab === "list" && (
            <div className="p-4 print:p-0">
                <div className="print:hidden bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6 flex justify-between items-center">
                    <div className="text-yellow-800 text-sm">
                        <p className="font-bold">{lang === 'en' ? 'Tournament Decklist' : '比賽用牌組清單'}</p>
                        <p>{lang === 'en' ? 'Designed for A4 printing (Ctrl+P).' : '此頁面設計為 A4 列印格式，可直接列印繳交。請使用瀏覽器列印功能 (Ctrl+P)。'}</p>
                    </div>
                    <button onClick={handlePrint} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-700">
                        <Printer size={18} /> {lang === 'en' ? 'Print' : '列印此清單'}
                    </button>
                </div>
                
                {/* 🌟 修改 1：新增 overflow-x-auto 容器，讓手機可以左右滑動查看完整版面 */}
                <div className="overflow-x-auto w-full pb-8 print:overflow-visible print:pb-0">
                    {/* 🌟 修改 2：將 w-full 改為 min-w-[800px]，強制撐開 A4 比例，防止手機版擠壓變形 */}
                    <div className="bg-white p-6 sm:p-8 min-w-[800px] max-w-[210mm] mx-auto border border-slate-200 print:border-none print:p-0 font-sans text-slate-900 flex flex-col">
                        
                        <div className="text-center mb-4 sm:mb-6 border-b-2 border-slate-800 pb-3 sm:pb-4 shrink-0">
                            <h1 className="text-xl sm:text-2xl font-black tracking-wide">
                                {lang === 'en' ? 'Cookierun: Braverse Decklist' : '薑餅人對戰卡牌 比賽用牌表'}
                            </h1>
                        </div>

                        <div className="flex gap-4 mb-6 shrink-0">
                            <div className="flex-1 flex flex-col gap-1">
                                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">{lang === 'en' ? 'Player Name' : '玩家名稱'}</span>
                                <div className="border border-slate-300 rounded h-8 sm:h-10 bg-slate-50"></div>
                            </div>
                            <div className="flex-1 flex flex-col gap-1">
                                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">{lang === 'en' ? 'Phone No.' : '電話號碼'}</span>
                                <div className="border border-slate-300 rounded h-8 sm:h-10 bg-slate-50"></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 sm:gap-8 items-start flex-1 mb-6">
                            <div className="flex flex-col gap-3 sm:gap-4">
                                 {renderPrintSection("餅乾卡", "Cookie Cards", grouped.cookies, "border-yellow-400 bg-yellow-50 text-yellow-800")}
                                 {renderPrintSection("Flip 卡", "Flip Cards", grouped.flips, "border-slate-400 bg-slate-100 text-slate-800")}
                            </div>
                            <div className="flex flex-col gap-3 sm:gap-4">
                                 {renderPrintSection("道具卡", "Item Cards", grouped.items, "border-blue-400 bg-blue-50 text-blue-800")}
                                 {renderPrintSection("陷阱卡", "Trap Cards", grouped.traps, "border-red-400 bg-red-50 text-red-800")}
                                 {renderPrintSection("場景卡", "Stage Cards", grouped.stages, "border-green-400 bg-green-50 text-green-800")}
                                 {renderPrintSection("Extra卡", "Extra Cards", grouped.extras, "border-purple-400 bg-purple-50 text-purple-800")}
                            </div>
                        </div>

                        <div className="pt-4 sm:pt-6 border-t-2 border-slate-800 flex justify-between items-end shrink-0 break-inside-avoid">
                             <div className="flex gap-4 sm:gap-8">
                                 <div className="flex flex-col gap-1">
                                     <span className="font-bold text-xs sm:text-sm">
                                         {lang === 'en' ? 'Main Deck Count' : '主牌組數量'} 
                                         <span className="text-[8px] sm:text-[10px] font-normal text-slate-500 uppercase block">(Main Deck Total)</span>
                                     </span>
                                     <div className="border border-slate-400 h-10 w-20 sm:h-12 sm:w-24 rounded bg-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-inner text-slate-800">
                                         {deck.main.length}
                                     </div>
                                 </div>
                                 <div className="flex flex-col gap-1">
                                     <span className="font-bold text-xs sm:text-sm">
                                         {lang === 'en' ? 'Extra Deck Count' : 'Extra數量'} 
                                         <span className="text-[8px] sm:text-[10px] font-normal text-slate-500 uppercase block">(Extra Deck Total)</span>
                                     </span>
                                     <div className="border border-slate-400 h-10 w-20 sm:h-12 sm:w-24 rounded bg-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-inner text-slate-800">
                                         {deck.extra.length}
                                     </div>
                                 </div>
                             </div>
                             <div className="text-[8px] sm:text-[10px] text-slate-500 font-bold mb-1 text-right max-w-[200px] sm:max-w-[250px] leading-relaxed">
                                 {lang === 'en' 
                                     ? 'Created by Miday Gamecaster. Please check your decklist carefully before submission.' 
                                     : '牌表格式由樂多綠Gamecaster製作，請繳出前確實檢查牌組正確性。'}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AddCardModal = ({ onClose, onAdd, isProcessing, initialData }) => {
  const [formData, setFormData] = useState({
    series: "BS1", number: "", name: "", nameEn: "", color: CARD_COLORS.RED, type: CARD_TYPES.COOKIE, level: CARD_LEVELS.LV1, rarity: "C", 
    skills: [], isFlip: false, isExtra: false, isAncient: false, isDragon: false, isBeast: false, isSoulJam: false, isArena: false,
    isForbidden: false, isLimitOne: false, effectText: "", showEffect: false, imageUrl: "",
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // 🌟 已加上 BS10 選項
  const editorSeriesOptions = useMemo(() => { const stSeries = Array.from({ length: 15 }, (_, i) => `ST${i + 1}`); const bsSeries = ["BS1", "BS2", "BS3", "BS4", "BS5", "BS6", "BS7", "BS8", "BS9", "BS10"]; const other = ["P"]; return [...stSeries, ...bsSeries, ...other]; }, []);
  
  useEffect(() => {
    if (initialData) {
      let derivedSeries = "BS1"; let derivedNumber = "";
      if (initialData.id && initialData.id.includes("-")) { const parts = initialData.id.split("-"); derivedSeries = parts[0] || "BS1"; derivedNumber = parts[1] || ""; } else { derivedNumber = initialData.id || ""; }
      setFormData((prev) => ({ 
          ...prev, ...initialData, series: derivedSeries, number: derivedNumber, rarity: initialData.rarity || "C", 
          skills: initialData.skills || [], nameEn: initialData.nameEn || "", effectText: initialData.effectText || "", 
          showEffect: initialData.showEffect || false, isArena: initialData.isArena || false 
      }));
      if (initialData.imageUrl) { setPreviewUrl(initialData.imageUrl); }
    }
  }, [initialData]);

  const handleFileChange = async (e) => { const file = e.target.files[0]; if (file) { if (file.size > 1024 * 1024) { alert("圖片過大！"); } try { const compressedBase64 = await compressImage(file); setPreviewUrl(compressedBase64); setFormData({ ...formData, imageUrl: compressedBase64 }); } catch (err) { alert("圖片處理失敗"); } } };
  const handleSkillToggle = (skill) => { setFormData(prev => { const currentSkills = prev.skills || []; if (currentSkills.includes(skill)) { return { ...prev, skills: currentSkills.filter(s => s !== skill) }; } else { return { ...prev, skills: [...currentSkills, skill] }; } }); };

  const handleSubmit = (e) => { 
      e.preventDefault(); 
      if (!formData.name) { alert("請填寫卡片名稱"); return; } 
      let fullId; 
      if (initialData && initialData.id) { fullId = initialData.id; } 
      else { if (!formData.number) { alert("請填寫編號"); return; } const finalSeries = formData.series.toUpperCase(); fullId = `${finalSeries}-${formData.number}`; } 
      const submitData = { ...formData, id: fullId, series: formData.series.toUpperCase(), level: formData.type === CARD_TYPES.COOKIE ? formData.level : null, skills: formData.type === CARD_TYPES.COOKIE ? formData.skills : [] }; 
      onAdd(submitData); 
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b shrink-0 bg-slate-50 rounded-t-xl"><h2 className="text-xl font-bold flex items-center gap-2">{initialData ? (<><Pencil className="text-blue-600" /> 編輯卡片</>) : (<><Plus className="text-blue-600" /> 新增自定義卡片</>)}</h2><button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X size={24} /></button></div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className={`col-span-1 md:col-span-2 ${initialData ? "opacity-70 pointer-events-none" : ""}`}>
                <label className="block text-sm font-bold text-slate-700 mb-1">卡片編號 (ID) {initialData && (<span className="text-xs text-red-500 font-normal ml-2">編輯模式下無法修改</span>)}</label>
                <div className="flex gap-2 items-center"><input list="series-options" type="text" className="border border-slate-300 rounded p-2 bg-white flex-1 font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none" value={formData.series} onChange={(e) => setFormData({ ...formData, series: e.target.value })} placeholder="選擇系列" /><span className="font-bold text-slate-400">-</span><input type="text" placeholder="001" required={!initialData} className="border border-slate-300 rounded p-2 flex-1 font-mono focus:ring-2 focus:ring-blue-500 outline-none" value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} /></div>
              </div>
              <div className="col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">卡片名稱 (中)</label>
                  <input type="text" required className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="col-span-1">
                  {/* 🌟 擴充方案 B：英文卡名欄位 */}
                  <label className="block text-sm font-bold text-slate-700 mb-1 text-blue-800">English Name (英)</label>
                  <input type="text" className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.nameEn} onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })} placeholder="GingerBrave" />
              </div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">種類</label><select className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>{Object.values(CARD_TYPES).map((t) => (<option key={t} value={t}>{t}</option>))}</select></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">顏色</label><select className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })}>{Object.values(CARD_COLORS).map((c) => (<option key={c} value={c}>{c}</option>))}</select></div>
              {formData.type === CARD_TYPES.COOKIE && (<div><label className="block text-sm font-bold text-slate-700 mb-1">等級 (Level)</label><select className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })}>{Object.values(CARD_LEVELS).map((lvl) => (<option key={lvl} value={lvl}>{lvl}</option>))}</select></div>)}
              <div><label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">稀有度 <Gem size={14} className="text-purple-500"/></label><select className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.rarity} onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}>{Object.entries(CARD_RARITIES).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}</select></div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1"><Languages size={16} className="text-blue-600"/> 英文效果文本 (English Effect)</label>
              <textarea className="w-full border border-slate-300 rounded p-3 h-24 text-sm font-sans focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter English effect text here..." value={formData.effectText} onChange={(e) => setFormData({...formData, effectText: e.target.value})} />
              <div className="flex items-center gap-2 mt-3 bg-white p-2 rounded border border-slate-100 shadow-sm w-max"><input type="checkbox" id="showEffect" checked={formData.showEffect} onChange={(e) => setFormData({...formData, showEffect: e.target.checked})} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" /><label htmlFor="showEffect" className="text-sm font-bold text-slate-700 cursor-pointer select-none">啟用效果文本顯示 (Enable Display)</label></div>
          </div>
          {formData.type === CARD_TYPES.COOKIE && (
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <label className="block text-sm font-bold text-amber-900 mb-3 flex items-center gap-1.5"><Zap size={16} className="text-amber-600"/> 餅乾技能標籤 (可複選)</label>
                  <div className="flex flex-wrap gap-2">
                      {COOKIE_SKILLS.map(skill => (
                          <label key={skill} className="flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-amber-200 shadow-sm hover:bg-amber-100 transition-colors">
                              <input type="checkbox" className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-amber-300" checked={(formData.skills || []).includes(skill)} onChange={() => handleSkillToggle(skill)} />
                              <span className="text-sm font-bold text-amber-900">{skill}</span>
                          </label>
                      ))}
                  </div>
              </div>
          )}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <label className="block text-sm font-bold text-slate-700 mb-3">特殊屬性 (Special Attributes)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-4">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" checked={formData.isFlip} onChange={(e) => setFormData({ ...formData, isFlip: e.target.checked })} /><span className="text-sm font-bold text-slate-700">FLIP</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" checked={formData.isExtra} onChange={(e) => setFormData({ ...formData, isExtra: e.target.checked })} /><span className="text-sm font-bold text-slate-700">Extra Deck</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500" checked={formData.isAncient} onChange={(e) => setFormData({ ...formData, isAncient: e.target.checked })} /><span className="text-sm font-bold text-slate-700">上古餅乾</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-5 h-5 rounded text-red-500 focus:ring-red-500" checked={formData.isDragon} onChange={(e) => setFormData({ ...formData, isDragon: e.target.checked })} /><span className="text-sm font-bold text-slate-700">龍族</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-5 h-5 rounded text-stone-600 focus:ring-stone-500" checked={formData.isBeast} onChange={(e) => setFormData({ ...formData, isBeast: e.target.checked })} /><span className="text-sm font-bold text-slate-700">野獸餅乾</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-5 h-5 rounded text-pink-500 focus:ring-pink-500" checked={formData.isSoulJam} onChange={(e) => setFormData({ ...formData, isSoulJam: e.target.checked })} /><span className="text-sm font-bold text-slate-700">靈魂果醬</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-5 h-5 rounded text-cyan-500 focus:ring-cyan-500" checked={formData.isArena} onChange={(e) => setFormData({ ...formData, isArena: e.target.checked })} /><span className="text-sm font-bold text-slate-700">競技場 (Arena)</span></label>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-y-3 gap-x-4">
                  <label className="flex items-center gap-2 cursor-pointer text-red-600 font-bold"><input type="checkbox" className="w-5 h-5 accent-red-600" checked={formData.isForbidden} onChange={(e) => setFormData({ ...formData, isForbidden: e.target.checked })} /><span>🚫 禁止卡</span></label>
                  <label className="flex items-center gap-2 cursor-pointer text-orange-600 font-bold"><input type="checkbox" className="w-5 h-5 accent-orange-600" checked={formData.isLimitOne} onChange={(e) => setFormData({ ...formData, isLimitOne: e.target.checked })} /><span>⚠️ 限制卡 (Limit 1)</span></label>
              </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">卡片預覽圖 (Image)</label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 relative h-64 flex items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
              {previewUrl ? (<img src={previewUrl} className="absolute inset-0 w-full h-full object-contain p-2" />) : (<div className="text-slate-400 flex flex-col items-center group-hover:text-blue-500 transition-colors"><ImageIcon size={48} className="mb-2" /><span className="text-sm font-bold">點擊或拖曳上傳圖片</span></div>)}
              <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
          </div>
        </form>
        <div className="p-4 border-t bg-white shrink-0"><button type="submit" onClick={handleSubmit} disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold text-lg disabled:opacity-50 shadow-lg shadow-blue-500/30 transition-all active:scale-95">{isProcessing ? "處理中..." : initialData ? "更新卡片資訊" : "確認上傳並同步至資料庫"}</button></div>
      </div>
    </div>
  );
};

const CardDetailModal = ({ card, onClose, lang }) => {
  if (!card) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm md:max-w-md flex flex-col gap-3" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="fixed top-4 right-4 md:top-6 md:right-6 p-2 text-white bg-black/40 hover:bg-black/80 rounded-full transition-colors z-[120]"><X size={32} /></button>
        {card.imageUrl ? (<img src={card.imageUrl} alt={card.name} className="w-full h-auto rounded-xl shadow-2xl object-contain max-h-[85vh]" />) : (
          <div className={`w-full aspect-[3/4] rounded-xl shadow-2xl p-6 flex flex-col ${getCardColorStyles(card.color)}`}>
             <h2 className="text-3xl font-black mb-2 leading-tight">{cName(card, lang)}</h2>
             <p className="font-mono text-lg opacity-80 mb-6 font-bold">{card.id}</p>
             <div className="space-y-3 text-base font-bold flex-1">
                <p className="flex justify-between border-b border-current/20 pb-1"><span>{lang==='en'?'Type':'種類'}</span> <span>{t(card.type, lang)}</span></p>
                <p className="flex justify-between border-b border-current/20 pb-1"><span>{lang==='en'?'Color':'顏色'}</span> <span>{t(card.color, lang)}</span></p>
                {card.level && <p className="flex justify-between border-b border-current/20 pb-1"><span>{lang==='en'?'Level':'等級'}</span> <span>{card.level}</span></p>}
                <p className="flex justify-between border-b border-current/20 pb-1"><span>{lang==='en'?'Rarity':'稀有度'}</span> <span>{card.rarity || 'C'}</span></p>
             </div>
             <div className="flex flex-wrap gap-2 mt-4">
                {card.isFlip && <span className="bg-slate-800 text-white px-2 py-1 rounded text-xs font-bold">FLIP</span>}
                {card.isExtra && <span className="bg-purple-200 text-purple-900 px-2 py-1 rounded text-xs font-bold border border-purple-300">EXTRA</span>}
                {card.isForbidden && <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">{t('禁止', lang)}</span>}
                {card.isLimitOne && <span className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">{t('Limit 1', lang)}</span>}
                {(card.skills || []).map(skill => (<span key={`skill-${skill}`} className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold border border-amber-300 flex items-center gap-1"><Zap size={10}/> {t(skill, lang)}</span>))}
             </div>
          </div>
        )}
        {card.showEffect && card.effectText && (
           <div className="bg-white/95 backdrop-blur rounded-xl p-4 shadow-xl border-l-4 border-blue-500 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-bottom-4">
               <h4 className="text-blue-800 font-bold text-sm mb-1.5 flex items-center gap-1.5"><Languages size={16}/> English Translation</h4>
               <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{card.effectText}</p>
           </div>
        )}
      </div>
    </div>
  );
};

const BulkImportModal = ({ onClose, onImport, isProcessing }) => {
  const [jsonText, setJsonText] = useState("");
  const [showHint, setShowHint] = useState(false); 
  const handleSubmit = () => { try { const data = JSON.parse(jsonText); if (!Array.isArray(data)) throw new Error("JSON format error"); onImport(data); } catch (err) { alert("JSON format error"); } };
  const exampleJson = `[\n  {\n    "id": "BS1-001",\n    "series": "BS1",\n    "number": "001",\n    "name": "勇氣餅乾",\n    "nameEn": "GingerBrave",\n    "type": "餅乾卡",\n    "color": "紅色",\n    "level": "LV.1",\n    "rarity": "C",\n    "skills": ["登場時"],\n    "isFlip": true,\n    "isExtra": false,\n    "isAncient": false,\n    "isDragon": false,\n    "isBeast": false,\n    "isSoulJam": false,\n    "isArena": false,\n    "isForbidden": false,\n    "isLimitOne": false,\n    "effectText": "",\n    "showEffect": false,\n    "imageUrl": ""\n  }\n]`;
  return (
    <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 shrink-0"><h2 className="text-xl font-bold flex items-center gap-2"><FileJson className="text-blue-600"/> 批量匯入卡片 (管理員)</h2><button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={24}/></button></div>
        <div className="flex justify-between items-center mb-2 shrink-0"><p className="text-xs md:text-sm text-slate-600 font-bold">請貼上包含卡片物件的 JSON 陣列。</p><button onClick={() => setShowHint(!showHint)} className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md transition-colors">{showHint ? "隱藏格式範例" : "查看 JSON 格式範例"}</button></div>
        {showHint && (<div className="bg-slate-800 text-green-400 p-3 rounded-lg text-xs font-mono mb-3 overflow-y-auto max-h-48 shrink-0 shadow-inner"><pre>{exampleJson}</pre></div>)}
        <textarea className="w-full flex-1 min-h-[200px] border border-slate-300 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none shadow-inner" placeholder={exampleJson} value={jsonText} onChange={e => setJsonText(e.target.value)} />
        <div className="flex gap-3 mt-4 shrink-0"><button onClick={onClose} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg font-bold hover:bg-slate-200 transition-colors">取消</button><button onClick={handleSubmit} disabled={isProcessing || !jsonText.trim()} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">{isProcessing ? "處理中..." : "確認匯入並同步"}</button></div>
      </div>
    </div>
  );
};

const DrawTestModal = ({ deck, onClose, lang }) => {
  const [drawCount, setDrawCount] = useState(1);
  const [hands, setHands] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState({});

  const drawCards = useCallback(() => {
    if (deck.main.length === 0) return;
    const newHands = [];
    for (let i = 0; i < drawCount; i++) { const shuffled = fisherYatesShuffle(deck.main); newHands.push(shuffled.slice(0, 6)); }
    setHands(newHands); setFlippedIndices({});
    let delay = 0;
    newHands.forEach((_, handIdx) => { for (let i = 0; i < 6; i++) { delay += 50; setTimeout(() => { setFlippedIndices(prev => ({ ...prev, [`${handIdx}-${i}`]: true })); }, delay); } });
  }, [deck.main, drawCount]);
  useEffect(() => { drawCards(); }, [drawCards]);
  const handleCardClick = (handIdx, cardIdx) => { setFlippedIndices(prev => ({ ...prev, [`${handIdx}-${cardIdx}`]: true })); };

  return (
    <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-5xl p-6 h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 shrink-0"><h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Dices className="text-blue-600" /> {lang==='en'?'Draw Test':'起始手牌測試'}</h2><button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full"><X size={24} /></button></div>
        <div className="flex gap-4 mb-4 justify-center shrink-0">
          <select className="px-4 py-2 rounded-lg border border-slate-300 font-bold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={drawCount} onChange={(e) => setDrawCount(Number(e.target.value))}>
            <option value={1}>{lang==='en'?'Draw 1 Hand':'測試 1 組'}</option>
            <option value={3}>{lang==='en'?'Draw 3 Hands':'測試 3 組'}</option>
            <option value={5}>{lang==='en'?'Draw 5 Hands':'測試 5 組'}</option>
          </select>
          <button onClick={drawCards} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-transform active:scale-95"><RefreshCw size={20} /> {lang==='en'?'Reshuffle':'重新洗牌並抽牌'}</button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-6 p-2 bg-slate-100 rounded-lg border border-slate-200 shadow-inner">
          {hands.map((hand, handIdx) => (
            <div key={handIdx} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
               <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest border-b border-slate-100 pb-1">Hand #{handIdx + 1}</div>
               <div className="grid grid-cols-6 gap-2 md:gap-4">
                  {hand.map((card, cardIdx) => (
                    <div key={`${handIdx}-${card.id}-${cardIdx}`} onClick={() => handleCardClick(handIdx, cardIdx)} className="aspect-[3/4] cursor-pointer perspective-1000 group relative">
                       <div className={`w-full h-full transition-transform duration-500 transform-style-3d relative ${flippedIndices[`${handIdx}-${cardIdx}`] ? 'rotate-y-180' : ''}`}>
                            <div className="absolute inset-0 backface-hidden rounded-lg overflow-hidden border-2 border-slate-300 shadow-md"><img src={CARD_BACK_URL} className="w-full h-full object-cover" alt="Card Back" /></div>
                            <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-lg overflow-hidden border border-slate-300 shadow-md bg-white">
                                {card.imageUrl ? (<img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />) : (<div className={`w-full h-full p-2 text-xs flex flex-col ${getCardColorStyles(card.color)}`}><span className="font-bold leading-tight line-clamp-3">{cName(card, lang)}</span><span className="text-[10px] mt-1">{card.id}</span></div>)}
                                <div className="absolute top-1 left-1 bg-black/50 text-white text-[9px] px-1.5 rounded font-bold">#{cardIdx + 1}</div>
                            </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PackOpenerModal = ({ allCards, onClose, lang }) => {
  const [selectedSeries, setSelectedSeries] = useState("ALL");
  const [openedCards, setOpenedCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState({});
  const [isOpening, setIsOpening] = useState(false); 
  const availableSeries = useMemo(() => Array.from(new Set(allCards.filter(c => !c.series.startsWith('ST') && c.series !== 'P').map(c => c.series))).sort(), [allCards]);
  
  const openPack = () => {
    let pool = allCards.filter(c => !c.series.startsWith('ST') && c.series !== 'P');
    if (selectedSeries !== "ALL") pool = pool.filter(c => c.series === selectedSeries);
    const cookieCards = pool.filter(c => c.type === CARD_TYPES.COOKIE); const otherCards = pool.filter(c => c.type !== CARD_TYPES.COOKIE);
    if (otherCards.length < 1 || cookieCards.length < 4) return alert("Not enough cards for this series.");
    setIsOpening(true); setOpenedCards([]); 
    setTimeout(() => {
        const selectedOther = fisherYatesShuffle(otherCards)[0]; const selectedIDs = new Set([selectedOther.id]);
        const selectedCookies = [];
        const targetRarity = (() => { const r = Math.random() * 100; if (r < 1) return 'EXR'; if (r < 6) return 'UR'; if (r < 16) return 'SR'; if (r < 36) return 'R'; return 'C'; })();
        let targetPool = cookieCards.filter(c => (c.rarity || 'C') === targetRarity); if (targetPool.length === 0) targetPool = cookieCards; 
        const rareCard = targetPool[Math.floor(Math.random() * targetPool.length)]; if (rareCard) { selectedCookies.push(rareCard); selectedIDs.add(rareCard.id); }
        let commonPool = cookieCards.filter(c => (c.rarity || 'C') === 'C' && !selectedIDs.has(c.id)); if (commonPool.length < 3) commonPool = cookieCards.filter(c => !selectedIDs.has(c.id));
        selectedCookies.push(...fisherYatesShuffle(commonPool).slice(0, 3));
        while (selectedCookies.length < 4) selectedCookies.push(cookieCards[Math.floor(Math.random() * cookieCards.length)]);
        setOpenedCards(fisherYatesShuffle([...selectedCookies, selectedOther])); setFlippedIndices({}); setIsOpening(false); 
    }, 1200); 
  };
  
  const renderCard = (card, index) => (
    <div key={index} onClick={() => setFlippedIndices(p => ({ ...p, [index]: true }))} className="w-[30vw] h-[40vw] md:w-48 md:h-64 cursor-pointer perspective-1000 group relative flex-shrink-0 animate-in zoom-in duration-500">
        <div className={`w-full h-full transition-all duration-500 transform-style-3d relative ${flippedIndices[index] ? 'rotate-y-180' : ''}`}>
            <div className="absolute inset-0 backface-hidden rounded-lg overflow-hidden border-2 border-slate-600 shadow-xl group-hover:scale-105 transition-transform"><img src={CARD_BACK_URL} className="w-full h-full object-cover" alt="Card Back" /></div>
            <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-lg overflow-hidden border-2 border-white/20 shadow-2xl bg-white relative">
                {card.imageUrl ? (<img src={card.imageUrl} className="w-full h-full object-cover" alt={card.name} />) : (<div className={`w-full h-full p-2 flex flex-col justify-between ${getCardColorStyles(card.color)}`}><span className="font-bold text-sm leading-tight line-clamp-3">{cName(card, lang)}</span><span className="font-mono text-xs">{card.id}</span></div>)}
                {card.rarity && card.rarity !== 'C' && (<div className={`absolute top-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded shadow border ${getRarityStyle(card.rarity)}`}>{card.rarity}</div>)}
            </div>
        </div>
    </div>
  );
  
  return (
    <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-5xl p-6 min-h-[600px] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 text-white"><h2 className="text-2xl font-black flex items-center gap-2"><PackageOpen className="text-yellow-400" /> {lang==='en'?'Pack Opener':'開卡包模擬器'}</h2><button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full"><X size={24} /></button></div>
        <div className="flex gap-4 mb-8 justify-center">
          <select className="bg-slate-700 text-white border border-slate-600 rounded-lg px-4 py-2 outline-none font-bold" value={selectedSeries} onChange={(e) => setSelectedSeries(e.target.value)} disabled={isOpening}>
            <option value="ALL">{lang==='en'?'All':'全部卡池'}</option>
            {availableSeries.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={openPack} disabled={isOpening} className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-yellow-700 disabled:text-slate-500 text-slate-900 px-6 py-2 rounded-lg font-black flex items-center gap-2 shadow-lg transition-transform active:scale-95">{isOpening ? "..." : <><PackageOpen size={20} /> {lang==='en'?'Open Pack':'開啟卡包'}</>}</button>
        </div>
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          {isOpening ? (<div className="animate-bounce"><div className="w-48 h-64 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-xl border-4 border-yellow-400 shadow-2xl flex items-center justify-center animate-pulse"><img src={CARD_BACK_URL} className="w-full h-full object-cover rounded-lg opacity-80" alt="Pack" /></div></div>) : openedCards.length === 0 ? (<div className="text-slate-500 flex flex-col items-center"><PackageOpen size={64} className="mb-4 opacity-20" /></div>) : (<div className="flex flex-col items-center gap-4 md:gap-6 w-full"><div className="flex justify-center gap-2 md:gap-6">{openedCards.slice(0, 3).map((card, index) => renderCard(card, index))}</div><div className="flex justify-center gap-2 md:gap-6">{openedCards.slice(3, 5).map((card, index) => renderCard(card, index + 3))}</div></div>)}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 🌟 核心組件：單張卡片
// ==========================================
const CardItem = React.memo(({ card, onClick, onView, onEdit, onDelete, onIncrement, onDecrement, count = 0, compact = false, onHoverStart, onHoverMove, onHoverEnd, lang }) => {
  const colorClass = getCardColorStyles(card.color);
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);
  const handleTouchStart = () => { isLongPress.current = false; longPressTimer.current = setTimeout(() => { isLongPress.current = true; if (navigator.vibrate) navigator.vibrate(50); onView(card); }, 500); };
  const handleTouchEnd = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } };
  const handleTouchMove = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } };
  const handleClick = (e) => { if (isLongPress.current) { e.preventDefault(); e.stopPropagation(); return; } if (compact) { onView(card); } else { onClick(card); } };

  return (
    <div 
        onClick={handleClick} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchMove={handleTouchMove} 
        onMouseEnter={(e) => onHoverStart && onHoverStart(card, e)} onMouseMove={(e) => onHoverMove && onHoverMove(e)} onMouseLeave={() => onHoverEnd && onHoverEnd()}
        className={`relative cursor-pointer transition-all duration-200 border-2 rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] select-none overflow-hidden group ${colorClass} ${compact ? "p-2 pr-1 flex items-center justify-between text-sm min-h-[4rem]" : "p-3 flex flex-col gap-1"}`}
    >
      {card.imageUrl && !compact && (<div className="absolute inset-0 opacity-30 pointer-events-none group-hover:opacity-40 transition-opacity"><img src={card.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" /></div>)}
      {!compact && card.isForbidden && (<div className="absolute inset-0 bg-red-900/10 pointer-events-none z-0"></div>)}
      <div className={`relative z-10 w-full ${compact ? "flex items-center gap-3" : ""}`}>
        {compact && card.imageUrl && (<div className="shrink-0 w-10 h-14 rounded border border-slate-300 overflow-hidden bg-white shadow-sm"><img src={card.imageUrl} className="w-full h-full object-cover" alt="" loading="lazy" /></div>)}
        <div className={`flex-1 min-w-0 ${compact ? "" : ""}`}>
          <div className={`flex justify-between items-start ${compact ? "flex-col justify-center" : "mb-1"}`}>
            {/* 🌟 根據語言顯示名稱 */}
            <h3 className={`font-bold leading-tight ${compact ? `line-clamp-2 w-full text-slate-800 text-sm ${card.isForbidden || card.isLimitOne ? 'text-red-700' : ''}` : "text-lg md:text-xl line-clamp-1 leading-snug"}`}>{cName(card, lang)}</h3>
            <div className={`flex items-center gap-1 ${compact ? "w-full mt-0.5" : ""}`}>
              {!compact && (<button onClick={(e) => { e.stopPropagation(); onView(card); }} className="p-1 text-current opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-white/50 rounded-full transition-all"><Eye size={16} /></button>)}
              <span className={`font-mono font-black ${compact ? "text-xs text-slate-500" : "text-xs md:text-xl bg-white/80 px-2 rounded border border-current/20 shadow-sm"}`}>{card.id}</span>
            </div>
          </div>
          {!compact && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs md:text-sm opacity-90 font-semibold">
              <span className="text-[10px] md:text-xs font-bold border border-current px-1 rounded opacity-80 uppercase bg-white/30">{t(card.color, lang)}</span>
              <span className="bg-white/50 px-2 py-0.5 rounded text-current border border-current/20">{t(card.type, lang)}</span>
              {card.level && (<span className="text-[10px] md:text-xs font-bold bg-yellow-400 text-yellow-900 px-1 rounded shadow-sm">{card.level}</span>)}
              {card.rarity && card.rarity !== 'C' && (<span className={`text-[10px] md:text-xs font-bold px-1.5 rounded shadow-sm border ${getRarityStyle(card.rarity)}`}>{card.rarity}</span>)}
              {card.isFlip && (<span className="flex items-center gap-0.5 text-[10px] md:text-xs bg-slate-800 text-white px-1.5 rounded font-bold tracking-wider">FLIP</span>)}
              {card.isExtra && (<span className="text-[10px] md:text-xs uppercase tracking-wider bg-purple-200 text-purple-900 px-1 rounded border border-purple-300">EXTRA</span>)}
              {/* 🌟 翻譯屬性標籤 */}
              {card.isAncient && <span className="text-[10px] md:text-xs font-bold bg-amber-100 text-amber-800 px-1 rounded border border-amber-300">{t('上古', lang)}</span>}
              {card.isDragon && <span className="text-[10px] md:text-xs font-bold bg-red-100 text-red-800 px-1 rounded border border-red-300">{t('龍族', lang)}</span>}
              {card.isBeast && <span className="text-[10px] md:text-xs font-bold bg-stone-800 text-stone-100 px-1 rounded border border-stone-600">{t('野獸', lang)}</span>}
              {card.isSoulJam && <span className="text-[10px] md:text-xs font-bold bg-pink-100 text-pink-800 px-1 rounded border border-pink-300">{t('靈魂果醬', lang)}</span>}
              {card.isArena && <span className="text-[10px] md:text-xs font-bold bg-cyan-100 text-cyan-800 px-1 rounded border border-cyan-300">{t('競技場', lang)}</span>}
              {card.isForbidden && <span className="flex items-center gap-0.5 text-[10px] bg-red-600 text-white px-1.5 rounded font-bold"><Ban size={10}/> {t('禁止', lang)}</span>}
              {card.isLimitOne && <span className="flex items-center gap-0.5 text-[10px] bg-orange-500 text-white px-1.5 rounded font-bold"><AlertOctagon size={10}/> Limit 1</span>}
            </div>
          )}
        </div>
        {compact && (
            <div className="flex items-center gap-1 bg-white/50 rounded-lg p-1 border border-black/5 shadow-sm" onClick={e => e.stopPropagation()}>
                <button onClick={() => onDecrement && onDecrement(card)} className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-700 rounded hover:bg-red-200 active:scale-95 transition-all"><Minus size={16} strokeWidth={3} /></button>
                <div className="w-8 text-center font-black text-lg text-slate-800 leading-none">{count}</div>
                <button onClick={() => onIncrement && onIncrement(card)} className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded hover:bg-blue-200 active:scale-95 transition-all"><Plus size={16} strokeWidth={3} /></button>
            </div>
        )}
      </div>
      {!compact && onEdit && onDelete && (<div className="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); onEdit(card); }} className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 shadow-sm"><Pencil size={14} /></button><button onClick={(e) => { e.stopPropagation(); onDelete(card); }} className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 shadow-sm"><Trash2 size={14} /></button></div>)}
      {!compact && count > 0 && (<div className="absolute -top-2 -right-2 bg-slate-800 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white z-10">{count}</div>)}
    </div>
  );
});

const StatBadge = ({ icon: Icon, label, current, max, color = "blue", warningAtFull = true }) => {
  const isFull = current >= max;
  const colorStyle = isFull && warningAtFull ? "bg-red-50 text-red-600 border-red-200" : `bg-${color}-50 text-${color}-700 border-${color}-200`;
  return (<div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${colorStyle}`}><Icon size={16} /><span>{label}:</span><span className={isFull ? "font-bold" : ""}>{current} / {max}</span></div>);
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingError, setLoadingError] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [deck, setDeck] = useState({ main: [], extra: [] });
  const [deckName, setDeckName] = useState("我的餅乾牌組");
  
  // 🌟 全域語言狀態
  const [lang, setLang] = useState('zh'); // 'zh' or 'en'
  const [showGlobalBanner, setShowGlobalBanner] = useState(true);
  
  const [filters, setFilters] = useState({
    search: "", type: "ALL", color: "ALL", level: "ALL", series: "ALL", rarity: "ALL", levelOrRarity: "ALL",
    skills: [], 
    showExtra: false, showFlip: false, showAncient: false, showDragon: false, showBeast: false, showSoulJam: false, showArena: false,
  });
  
  const [toastMsg, setToastMsg] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false); 
  const [showDrawTestModal, setShowDrawTestModal] = useState(false); 
  const [showPackOpenerModal, setShowPackOpenerModal] = useState(false); 
  const [viewingCard, setViewingCard] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false); 
  const [isMobileDeckOpen, setIsMobileDeckOpen] = useState(false);
  const [isDesktopDeckOpen, setIsDesktopDeckOpen] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const loadMoreRef = useRef(null);
  const hasShownWelcome = useRef(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFilters, setShowFilters] = useState(true); 

  const hoverPreviewRef = useRef(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  const updateHoverPosition = useCallback((x, y) => {
    if (hoverPreviewRef.current) {
        let left = x + 20;
        let top = y + 20;
        if (left + 280 > window.innerWidth) left = x - 280;
        if (top + 400 > window.innerHeight) top = window.innerHeight - 420;
        hoverPreviewRef.current.style.transform = `translate(${Math.max(0, left)}px, ${Math.max(0, top)}px)`;
    }
  }, []);

  const handleHoverStart = useCallback((card, e) => {
    if (window.innerWidth >= 768) {
        setHoveredCard(card);
        requestAnimationFrame(() => updateHoverPosition(e.clientX, e.clientY));
    }
  }, [updateHoverPosition]);

  const handleHoverMove = useCallback((e) => {
    updateHoverPosition(e.clientX, e.clientY);
  }, [updateHoverPosition]);

  const handleHoverEnd = useCallback(() => {
    setHoveredCard(null);
  }, []);

  const handleUpdateProfile = async (displayName) => {
      await updateProfile(user, { displayName: displayName });
      setUser({ ...user, displayName });
      setToastMsg("暱稱已更新！");
  };

  useEffect(() => {
    if (!db) {
        console.error("Firestore db has not been initialized.");
        setToastMsg("資料庫未連線，請檢查 API Key 設定");
        setIsDataLoaded(true);
        return;
    }
    if (!user) return;
    setIsDataLoaded(false);
    let q;
    try {
        q = query(collection(db, 'artifacts', appId, 'public', 'data', 'cards')); 
    } catch (e) {
        console.error("Query Creation Error:", e);
        setToastMsg("查詢語法錯誤，請聯繫管理員");
        setIsDataLoaded(true);
        return;
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cards = snapshot.docs.map(doc => doc.data());
      cards.sort((a, b) => a.id.localeCompare(b.id));
      setAllCards(cards);
      setIsDataLoaded(true);
      if (!hasShownWelcome.current) { 
          setToastMsg("🚀 卡片資料庫已完全載入！"); 
          hasShownWelcome.current = true; 
      }
    }, (error) => { 
        console.error("Firestore sync error:", error); 
        setIsDataLoaded(true);
        if (error.code === 'permission-denied') {
            setToastMsg("權限不足：無法讀取卡片資料");
        } else { 
            setToastMsg(`資料庫讀取失敗: ${error.message}`); 
        }
    });
    return () => unsubscribe();
  }, [user]);

  const [showHeader, setShowHeader] = useState(true);
  const scrollContainerRef = useRef(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker 註冊成功', reg.scope))
        .catch(err => console.error('Service Worker 註冊失敗', err));
    }
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('玩家已安裝 PWA App');
        }
        setDeferredPrompt(null);
      });
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const currentScrollY = container.scrollTop;
      const diff = currentScrollY - lastScrollY.current;
      if (diff > 10 && currentScrollY > 50) { setShowHeader(false); } 
      else if (diff < -10) { setShowHeader(true); }
      lastScrollY.current = currentScrollY;
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const LIMITS = { MAIN: 60, EXTRA: 6, COPY: 4, FLIP: 16 };

  const closeToast = useCallback(() => { setToastMsg(null); }, []);

  useEffect(() => { 
    document.title = "Cookierun: Braverse Deck Builder"; 
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link'); 
    link.type = 'image/svg+xml'; 
    link.rel = 'icon'; 
    link.href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍪</text></svg>`; 
    document.getElementsByTagName('head')[0].appendChild(link); 
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.name = "viewport";
        document.head.appendChild(viewportMeta);
    }
    viewportMeta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
  }, []);

  useEffect(() => { if (!document.querySelector('script[src="https://cdn.tailwindcss.com"]')) { const script = document.createElement("script"); script.src = "https://cdn.tailwindcss.com"; document.head.appendChild(script); } }, []);
  
  useEffect(() => {
    if (!auth) { setLoadingError("Firebase 設定錯誤"); return; }
    const ADMIN_EMAILS = ["kinyosampo1@gmail.com"]; 
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setLoadingError(null);
        if (!u.isAnonymous && u.email && ADMIN_EMAILS.includes(u.email)) {
            setIsAdmin(true);
            setToastMsg(`歡迎管理員：${u.displayName || u.email}`);
        } else {
            setIsAdmin(false);
        }
      } else {
        console.log("未偵測到使用者，執行匿名登入...");
        signInAnonymously(auth).catch(err => {
            console.error("匿名登入失敗", err);
            setLoadingError(`登入失敗: ${err.message}`);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUserLogin = async (email, password) => { await signInWithEmailAndPassword(auth, email, password); };
  const handleUserRegister = async (email, password, displayName) => {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: displayName });
      setUser({ ...userCredential.user, displayName });
  };
  const handleLogout = async () => {
      if (confirm("確定要登出嗎？")) {
          await signOut(auth);
          setToastMsg("已登出，切換回訪客模式");
          signInAnonymously(auth).catch(e => console.error(e));
      }
  };

  const handleLoadDeckFromStorage = (loadedDeckObj, newName) => { 
      setDeck({ main: loadedDeckObj?.main || [], extra: loadedDeckObj?.extra || [] }); 
      setDeckName(newName || "我的餅乾牌組"); 
      setToastMsg("牌組載入成功！"); 
  };

  const handleLoadDeckFromCommunity = (loadedDeckObj, newName) => {
      if (deck.main.length > 0 || deck.extra.length > 0) {
          if (!confirm("確定要複製並載入這副牌組嗎？\n⚠️ 警告：目前的牌組將被清空覆蓋！")) return; 
      }
      setDeck({ main: loadedDeckObj?.main || [], extra: loadedDeckObj?.extra || [] });
      setDeckName(newName || "社群牌組");
      setToastMsg("✨ 社群牌組載入成功！");
      setShowCommunityModal(false);
  };

  const handlePublishDeck = async (deckToPublish) => {
      try {
          const cardIds = [...(deckToPublish.m || [])];
          const cards = cardIds.map(id => allCards.find(c => c.id === id)).filter(Boolean);
          const colors = [...new Set(cards.map(c => c.color).filter(Boolean))];
          const publicData = {
              name: deckToPublish.name,
              authorId: user.uid,
              authorName: user.displayName || "匿名玩家",
              m: deckToPublish.m,
              e: deckToPublish.e,
              colors: colors,
              likes: 0,
              commentCount: 0,
              copyCount: 0,
              coverId: deckToPublish.coverId || null,
              createdAt: new Date().toISOString()
          };
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'community_decks'), publicData);
          alert("發布成功！大家可以在社群廣場看到你的牌組了。");
          setShowStorageModal(false);
          setShowCommunityModal(true);
      } catch (e) {
          console.error(e);
          alert("發布失敗: " + e.message);
      }
  };

  useEffect(() => {
    if (allCards.length === 0) return; 
    const params = new URLSearchParams(window.location.search);
    const shortId = params.get('s');
    if (shortId && db) {
        const loadSharedDeck = async () => {
            try {
                const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'shared_decks', shortId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const decoded = docSnap.data();
                    if (decoded.m && decoded.e) {
                        const mainCards = [], extraCards = [];
                        decoded.m.forEach(id => { const c = allCards.find(c => c.id === id); if (c) mainCards.push(c); });
                        decoded.e.forEach(id => { const c = allCards.find(c => c.id === id); if (c) extraCards.push(c); });
                        setDeck({ main: mainCards, extra: extraCards });
                        if (decoded.n) setDeckName(decoded.n);
                        setToastMsg('已成功載入分享的牌組！');
                    }
                } else {
                    setToastMsg('找不到該分享的牌組，可能已被刪除');
                }
            } catch (e) {
                console.error("載入短網址失敗", e);
                setToastMsg('載入牌組時發生錯誤');
            }
        };
        loadSharedDeck();
        return;
    }
    const deckData = params.get('d');
    if (deckData) {
      try {
        const decodedString = decodeURIComponent(atob(deckData));
        const decoded = JSON.parse(decodedString);
        if (decoded.m && decoded.e) {
          const mainCards = [], extraCards = [];
          decoded.m.forEach(id => { const c = allCards.find(c => c.id === id); if (c) mainCards.push(c); });
          decoded.e.forEach(id => { const c = allCards.find(c => c.id === id); if (c) extraCards.push(c); });
          setDeck({ main: mainCards, extra: extraCards });
          if (decoded.n) setDeckName(decoded.n);
          setToastMsg('已成功載入分享的牌組！');
        }
      } catch (e) { console.error("牌組載入失敗", e); }
    }
  }, [allCards, db]);
  
  const getCardCount = useCallback((cardId) => {
     return deck.main.filter(c => c.id === cardId).length + deck.extra.filter(c => c.id === cardId).length;
  }, [deck]);
  
  const getFlipCount = () => deck.main.filter(c => c.isFlip).length;

  const nonFlipCookieCount = useMemo(() => {
    return deck.main.filter((c) => c.type === CARD_TYPES.COOKIE && c.isFlip === false).length;
  }, [deck.main]);

  const forbiddenCount = useMemo(() => {
    return deck.main.filter(c => c.isForbidden).length + deck.extra.filter(c => c.isForbidden).length;
  }, [deck]);

  const limitOneViolation = useMemo(() => {
    const allLimitCards = [...deck.main, ...deck.extra].filter(c => c.isLimitOne);
    const counts = {};
    let violation = false;
    allLimitCards.forEach(c => {
        counts[c.id] = (counts[c.id] || 0) + 1;
        if (counts[c.id] > 1) violation = true;
    });
    return violation;
  }, [deck]);

  const addToDeck = useCallback((card) => {
    if (card.isForbidden) setToastMsg(lang==='en'?"Banned card added":"❌ 加入了禁止卡");
    const currentCount = deck.main.filter(c => c.id === card.id).length + deck.extra.filter(c => c.id === card.id).length;
    if (card.isLimitOne && currentCount >= 1) setToastMsg(lang==='en'?"Exceeded Limit 1":"⚠️ 加入了第二張限制卡");
    const isExtra = isExtraDeckCard(card);
    const targetDeckKey = isExtra ? "extra" : "main";
    const limit = isExtra ? LIMITS.EXTRA : LIMITS.MAIN;
    const current = deck[targetDeckKey];
    const flipCountCurrent = deck.main.filter(c => c.isFlip).length;
    if (isExtra && current.length >= limit) { setToastMsg(lang==='en'?"Extra Deck Full":`額外牌組已滿 (${LIMITS.EXTRA}張)`); return; }
    if (currentCount >= LIMITS.COPY) { setToastMsg(lang==='en'?`Max ${LIMITS.COPY} copies`:`同名卡片最多 ${LIMITS.COPY} 張`); return; }
    if (card.isFlip && !isExtra && flipCountCurrent >= LIMITS.FLIP) { setToastMsg(lang==='en'?`Max ${LIMITS.FLIP} FLIPs`:`Flip 卡片上限 ${LIMITS.FLIP} 張`); return; }
    setDeck((prev) => ({
      ...prev,
      [targetDeckKey]: [...prev[targetDeckKey], card].sort((a, b) => a.id.localeCompare(b.id)),
    }));
  }, [deck, lang]);

  const removeFromDeck = (card, fromExtra) => {
    const deckKey = fromExtra ? "extra" : "main";
    setDeck((prev) => {
      const newList = [...prev[deckKey]];
      const index = newList.findIndex((c) => c.id === card.id);
      if (index > -1) newList.splice(index, 1);
      return { ...prev, [deckKey]: newList };
    });
  };

  const clearDeck = () => {
    if (confirm("確定要清空所有牌組嗎？")) setDeck({ main: [], extra: [] });
  };

  const handleShareClick = () => {
    if (deck.main.length > LIMITS.MAIN) {
      if (window.confirm("主牌組張數已超過 60 張上限，確定要繼續分享/輸出嗎？")) setShowExportModal(true);
    } else {
      setShowExportModal(true);
    }
  };

  const handleSaveCard = async (cardData) => {
    if (isOffline) {
        setAllCards(prev => {
            const existingIndex = prev.findIndex(c => c.id === cardData.id);
            if (existingIndex >= 0) {
                const newCards = [...prev];
                newCards[existingIndex] = cardData;
                return newCards;
            } else {
                return [...prev, cardData].sort((a, b) => a.id.localeCompare(b.id));
            }
        });
        setShowAddModal(false);
        setEditingCard(null);
        setToastMsg("離線模式：已更新卡片 (未存入資料庫)");
        return;
    }
    if (!user || !db) return;
    if (!editingCard && allCards.some((c) => c.id === cardData.id)) {
      if (!confirm("ID 已存在，確定覆蓋？")) return;
    }
    setIsProcessing(true);
    try {
      await setDoc(doc(db, "artifacts", appId, "public", "data", "cards", cardData.id), cardData);
      setToastMsg(editingCard ? "卡片更新成功" : "卡片新增成功");
      setShowAddModal(false);
      setEditingCard(null);
    } catch (err) {
      console.error(err);
      setToastMsg("儲存失敗");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkImport = async (cardsData) => {
    if (isOffline) {
        setAllCards(prev => {
            const cardMap = new Map(prev.map(c => [c.id, c]));
            cardsData.forEach(c => {
                const existing = cardMap.get(c.id) || {};
                cardMap.set(c.id, { ...existing, ...c }); // 離線模式也使用合併
            });
            return Array.from(cardMap.values()).sort((a, b) => a.id.localeCompare(b.id));
        });
        setShowBulkModal(false);
        setToastMsg(`離線模式：已合併更新 ${cardsData.length} 張卡片`);
        return;
    }
    if (!user || !db) return;
    setIsProcessing(true);
    const batch = writeBatch(db);
    let count = 0;
    try {
      cardsData.forEach((card) => {
        if (!card.id) return; // 只要有 ID 就能更新
        const ref = doc(db, "artifacts", appId, "public", "data", "cards", card.id);
        
        // 🌟 關鍵修改：加上 { merge: true }
        // 這樣 Firebase 只會更新您提供的欄位 (例如 nameEn)，原本的圖片和技能都會安全保留！
        batch.set(ref, card, { merge: true });
        count++;
      });
      await batch.commit();
      setToastMsg(`成功更新/合併了 ${count} 張卡片！`);
      setShowBulkModal(false);
    } catch (err) {
      console.error(err);
      setToastMsg("匯入失敗，請檢查 JSON 格式或網路");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCardData = () => {
      // 只挑出 ID、中文名、英文名，避免檔案太大
      const exportData = allCards.map(c => ({
          id: c.id,
          name: c.name,
          nameEn: c.nameEn || ""
      }));
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cookie_cards_translation_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToastMsg("已下載待翻譯清單！");
  };
  
  const handleDeleteCard = async (card) => {
    if (!confirm(`確定要永久刪除「${card.name}」嗎？此動作無法復原。`)) return;
    try {
      await deleteDoc(doc(db, "artifacts", appId, "public", "data", "cards", card.id));
      setToastMsg(`已刪除 ${card.name}`);
    } catch (err) {
      console.error(err);
      setToastMsg("刪除失敗");
    }
  };

  const openEditModal = (card) => {
    setEditingCard(card);
    setShowAddModal(true);
  };

  const filteredCards = useMemo(
    () =>
      allCards.filter((card) => {
        const search = filters.search.toLowerCase();
        const matchSearch =
          (card.name || "").toLowerCase().includes(search) ||
          (card.id || "").toLowerCase().includes(search) ||
          (card.nameEn || "").toLowerCase().includes(search);
        const matchType = filters.type === "ALL" || card.type === filters.type;
        const matchColor =
          filters.color === "ALL" || card.color === filters.color;
        
        const matchSeries =
          filters.series === "ALL"
            ? true
            : filters.series === "ST"
            ? (card.series || "").startsWith("ST")
            : card.series === filters.series;

        const matchLevelOrRarity = (() => {
          if (filters.levelOrRarity === "ALL") return true;
          if (Object.values(CARD_LEVELS).includes(filters.levelOrRarity)) return card.level === filters.levelOrRarity;
          if (Object.keys(CARD_RARITIES).includes(filters.levelOrRarity)) return card.rarity === filters.levelOrRarity;
          return false;
        })();

        const matchSkills = filters.skills.length === 0 || 
            filters.skills.every(skill => (card.skills || []).includes(skill));

        const matchExtra = filters.showExtra ? card.isExtra : true;
        const matchFlip = filters.showFlip ? card.isFlip : true;
        const matchAncient = filters.showAncient ? card.isAncient : true;
        const matchDragon = filters.showDragon ? card.isDragon : true;
        const matchBeast = filters.showBeast ? card.isBeast : true;
        const matchSoulJam = filters.showSoulJam ? card.isSoulJam : true;
        const matchArena = filters.showArena ? card.isArena : true; 

        return (
          matchSearch &&
          matchType &&
          matchColor &&
          matchSeries &&
          matchLevelOrRarity && 
          matchSkills &&
          matchExtra &&
          matchFlip &&
          matchAncient &&
          matchDragon &&
          matchBeast &&
          matchSoulJam &&
          matchArena
        );
      }),
    [filters, allCards]
  );

  useEffect(() => {
    setVisibleCount(30);
  }, [filteredCards]);

  const displayedCards = useMemo(() => {
    return filteredCards.slice(0, visibleCount);
  }, [filteredCards, visibleCount]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 30);
        }
      },
      { threshold: 0.5 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [displayedCards]);

  const mainDeckNormal = useMemo(() => deck.main.filter(c => !c.isFlip), [deck.main]);
  const mainDeckFlip = useMemo(() => deck.main.filter(c => c.isFlip), [deck.main]);

  const groupedMainDeckNormal = useMemo(() => {
      const groups = groupCards(mainDeckNormal);
      return groups.sort((a, b) => {
          const wA = getDisplaySortWeight(a);
          const wB = getDisplaySortWeight(b);
          if (wA !== wB) return wA - wB;
          return a.id.localeCompare(b.id);
      });
  }, [mainDeckNormal]);

  const groupedMainDeckFlip = useMemo(() => groupCards(mainDeckFlip), [mainDeckFlip]);
  const groupedExtraDeck = useMemo(() => groupCards(deck.extra), [deck.extra]);
  
  const flipCount = getFlipCount();
  const levelStats = useMemo(() => {
    let lv1 = 0, lv2 = 0, lv3 = 0;
    deck.main.forEach(c => {
      if (c.type === CARD_TYPES.COOKIE && !c.isFlip) {
        if (c.level === CARD_LEVELS.LV1) lv1++;
        else if (c.level === CARD_LEVELS.LV2) lv2++;
        else if (c.level === CARD_LEVELS.LV3) lv3++;
      }
    });
    const total = lv1 + lv2 + lv3;
    const p1 = total ? (lv1 / total) * 100 : 0;
    const p2 = total ? (lv2 / total) * 100 : 0;
    const p3 = total ? (lv3 / total) * 100 : 0;
    
    return { lv1, lv2, lv3, total, p1, p2, p3 };
  }, [deck.main]);

  if (loadingError && !isOffline) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full border border-red-100">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">無法連線至資料庫</h2>
          <p className="text-slate-600 mb-6 bg-red-50 p-3 rounded text-sm">{loadingError}</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold w-full transition-colors flex items-center justify-center gap-2"><RefreshCw size={18} /> 重新整理頁面</button>
            <button onClick={() => { setIsOffline(true); setLoadingError(null); setUser({ uid: 'offline-user', isAnonymous: true }); setIsAdmin(true); }} className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-bold w-full transition-colors flex items-center justify-center gap-2"><WifiOff size={18} /> 進入離線模擬模式</button>
          </div>
        </div>
      </div>
    );
  }

  if (!user && !isOffline)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );

  return (
    <div className="flex w-full fixed inset-0 print:static print:h-auto print:overflow-visible print:bg-white flex-col md:flex-row bg-slate-50 overflow-hidden font-sans text-slate-900 overscroll-contain h-[100dvh]">
      {/* 🌟 電腦版懸停預覽 (Hover Preview) */}
      {hoveredCard && (
        <div
            ref={hoverPreviewRef}
            className="hidden md:block fixed top-0 left-0 z-[120] pointer-events-none will-change-transform"
            style={{ width: '260px' }}
        >
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-100">
                {hoveredCard.imageUrl ? (
                    <img src={hoveredCard.imageUrl} alt={hoveredCard.name} className="w-full h-auto object-contain" />
                ) : (
                    <div className={`w-full aspect-[3/4] p-5 flex flex-col ${getCardColorStyles(hoveredCard.color)}`}>
                        <h3 className="font-black text-2xl leading-tight mb-1">{cName(hoveredCard, lang)}</h3>
                        <p className="font-mono text-sm opacity-80 mb-4 font-bold">{hoveredCard.id}</p>
                        <div className="space-y-2 text-sm font-bold flex-1">
                            <p className="flex justify-between border-b border-current/20 pb-1"><span>{lang==='en'?'Type':'種類'}</span> <span>{t(hoveredCard.type, lang)}</span></p>
                            <p className="flex justify-between border-b border-current/20 pb-1"><span>{lang==='en'?'Color':'顏色'}</span> <span>{t(hoveredCard.color, lang)}</span></p>
                            {hoveredCard.level && <p className="flex justify-between border-b border-current/20 pb-1"><span>{lang==='en'?'Level':'等級'}</span> <span>{hoveredCard.level}</span></p>}
                            <p className="flex justify-between border-b border-current/20 pb-1"><span>{lang==='en'?'Rarity':'稀有度'}</span> <span>{hoveredCard.rarity || 'C'}</span></p>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {hoveredCard.isFlip && <span className="bg-slate-800 text-white px-2 py-0.5 rounded text-[10px] font-bold">FLIP</span>}
                            {hoveredCard.isExtra && <span className="bg-purple-200 text-purple-900 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-300">EXTRA</span>}
                            {hoveredCard.isForbidden && <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">{t('禁止', lang)}</span>}
                            {hoveredCard.isLimitOne && <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">{t('Limit 1', lang)}</span>}
                            {/* 預覽時也顯示技能 */}
                            {(hoveredCard.skills || []).map(skill => (
                                <span key={`hover-skill-${skill}`} className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-300">
                                    {t(skill, lang)}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {hoveredCard.showEffect && hoveredCard.effectText && (
                    <div className="bg-slate-50 border-t border-slate-200 p-3 text-xs text-slate-700 leading-relaxed font-sans max-h-32 overflow-y-auto">
                        <div className="font-bold text-blue-700 mb-1 flex items-center gap-1"><Languages size={12}/> Effect:</div>
                        {hoveredCard.effectText}
                    </div>
                )}
            </div>
        </div>
      )}

      {viewingCard && (
        <CardDetailModal card={viewingCard} onClose={() => setViewingCard(null)} lang={lang} />
      )}
      {toastMsg && (
        <Toast message={toastMsg} onClose={closeToast} />
      )}
       
      {showAddModal && (
        <AddCardModal 
          onClose={() => { setShowAddModal(false); setEditingCard(null); }} 
          onAdd={handleSaveCard} 
          isProcessing={isProcessing} 
          initialData={editingCard} 
        />
      )}

      {showBulkModal && <BulkImportModal onClose={() => setShowBulkModal(false)} onImport={handleBulkImport} isProcessing={isProcessing} />}

      {showExportModal && <ExportModal deck={deck} allCards={allCards} onClose={() => setShowExportModal(false)} deckName={deckName} lang={lang} />}

      {showLoginModal && (
        <AuthModal 
          onClose={() => setShowLoginModal(false)} 
          onLogin={handleUserLogin} 
          onRegister={handleUserRegister}
          lang={lang}
        />
      )}
      
      {showStorageModal && (
        <DeckStorageModal 
            userId={user.uid}
            currentDeck={deck}
            currentDeckName={deckName}
            allCards={allCards}
            onClose={() => setShowStorageModal(false)}
            onLoadDeck={handleLoadDeckFromStorage}
            onPublish={handlePublishDeck}
            lang={lang}
        />
      )}
      
      {showCommunityModal && (
        <CommunityModal 
            allCards={allCards} 
            onClose={() => setShowCommunityModal(false)} 
            onLoadDeck={handleLoadDeckFromCommunity} 
            user={user} 
            isAdmin={isAdmin}
            lang={lang}
        />
      )}

      {showDrawTestModal && <DrawTestModal deck={deck} onClose={() => setShowDrawTestModal(false)} lang={lang} />}
      
      {showPackOpenerModal && <PackOpenerModal allCards={allCards} onClose={() => setShowPackOpenerModal(false)} lang={lang} />}
      
      {showProfileModal && (
        <ProfileModal 
            user={user} 
            onClose={() => setShowProfileModal(false)} 
            onUpdateProfile={handleUpdateProfile} 
            onLogout={handleLogout} 
            lang={lang}
        />
      )}

      {/* 左側：卡片清單 */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 min-h-0 relative print:hidden">
        {showGlobalBanner && (
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-4 py-3 flex justify-between items-center shadow-sm z-50 print:hidden shrink-0">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 w-full">
                  <div className="flex items-center gap-2">
                      <Sparkles className="text-yellow-300 animate-pulse shrink-0" size={20} />
                      <span className="font-black tracking-wide text-sm md:text-base text-yellow-300 drop-shadow-md">
                          {lang === 'zh' ? '重大更新 MEGA UPDATE' : 'GLOBAL UPDATE'}
                      </span>
                  </div>
                  <p className="text-xs md:text-sm font-bold opacity-95 leading-relaxed">
                      {lang === 'zh' 
                          ? '全面支援英文！收錄超過 1380 張最新譯名卡片，與全球玩家一起組牌吧！' 
                          : 'Full English Support is here! Over 1400+ cards translated. Join the global community!'}
                  </p>
                  {lang === 'zh' && (
                      <button onClick={() => setLang('en')} className="mt-1 md:mt-0 bg-white/20 hover:bg-white/30 border border-white/40 text-white px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1 active:scale-95">
                          <Languages size={14}/> Switch to English
                      </button>
                  )}
              </div>
              <button onClick={() => setShowGlobalBanner(false)} className="p-1.5 hover:bg-white/20 rounded-full transition-colors shrink-0 ml-2" title="關閉">
                  <X size={18} />
              </button>
          </div>
        )}
        
        <div 
            className={`
              bg-white border-b border-slate-200 shadow-sm z-10 shrink-0 
              transition-all duration-300 ease-in-out overflow-hidden
              ${showHeader ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}
              md:max-h-none md:opacity-100 md:static md:overflow-visible
            `}
        >
             <div className="p-3 md:p-4 space-y-2 md:space-y-3">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                    <div className="flex flex-col">
                        <h1 className="text-lg md:text-2xl font-black flex items-center gap-2 text-slate-800">
                            <Cloud className={isOffline ? "text-slate-400" : "text-blue-600"} size={24} />
                            Cookierun: Braverse Deck Builder
                        </h1>
                        <p className="text-xs md:text-sm text-slate-500 font-bold ml-1 mt-1">
                            {lang === 'en' ? 'New Features: ' : '新功能：'}<span className="text-blue-600 font-black">{lang === 'en' ? 'Community' : '社群廣場'}</span> {lang === 'en' ? ' & ' : '與 '} <span className="text-emerald-600 font-black">{lang === 'en' ? 'Mobile App' : '手機APP'}</span>
                        </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 md:gap-4">
                        <button onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')} className="bg-slate-200 text-slate-800 px-3 py-1.5 md:py-2.5 rounded-xl font-bold flex items-center gap-1 shadow-sm transition-all border border-slate-300 hover:bg-slate-300 active:scale-95">
                            <Languages size={18}/> {lang === 'zh' ? '🌐 EN' : '🇹🇼 繁'}
                        </button>

                        {deferredPrompt && (
                            <button 
                                onClick={handleInstallPWA} 
                                className="relative bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-amber-950 px-4 py-2 md:py-2.5 rounded-xl text-sm font-black flex items-center gap-1.5 shadow-lg shadow-yellow-500/30 transition-transform active:scale-95 border border-yellow-300"
                            >
                                <Download size={18} className="animate-bounce" /> 
                                <span className="tracking-wide">{lang==='en'?'Install App':'安裝 App'}</span>
                            </button>
                        )}

                        <button 
                            onClick={() => setShowCommunityModal(true)} 
                            className="relative bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/40 transition-all hover:-translate-y-0.5 active:scale-95 border border-blue-400"
                        >
                            <Globe size={20} className="animate-pulse" /> 
                            <span className="tracking-wide">{lang==='en'?'Community':'社群廣場'}</span>
                            <span className="absolute -top-2.5 -right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-bounce shadow-md">HOT</span>
                        </button>

                        {user && !user.isAnonymous ? (
                            <button 
                                onClick={() => setShowProfileModal(true)} 
                                className="flex items-center gap-2 bg-white hover:bg-slate-50 border-2 border-emerald-200 px-3 py-1.5 rounded-xl text-slate-700 transition-all shadow-sm active:scale-95" 
                                title="點擊管理會員資料與登出"
                            >
                                <UserCog size={18} className="text-emerald-500"/>
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-xs font-bold truncate max-w-[100px]">{user.displayName || 'Set Name'}</span>
                                    <span className="text-[9px] text-emerald-600 font-black mt-0.5">Logged In</span>
                                </div>
                            </button>
                        ) : (
                            <button 
                                onClick={() => setShowLoginModal(true)} 
                                className="relative bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95 ring-2 ring-green-300 ring-offset-1"
                            >
                                <UserCog size={18} /> 
                                <span className="tracking-wide">{lang==='en'?'Login':'註冊 / 登入'}</span>
                                <span className="absolute -top-2.5 -right-2 bg-yellow-400 text-yellow-900 text-[10px] px-2 py-0.5 rounded-full font-black shadow-md border border-yellow-200">NEW</span>
                            </button>
                        )}

                        {isAdmin && (
  <div className="flex gap-2 border-l-2 border-slate-200 pl-3 items-center">
      <button onClick={() => { setEditingCard(null); setShowAddModal(true); }} className="bg-slate-700 hover:bg-slate-800 text-white p-2 rounded-lg text-sm font-bold flex items-center gap-1 shadow transition-colors" title="新增卡片"><Plus size={18} /></button>
      <button onClick={() => setShowBulkModal(true)} className="bg-slate-700 hover:bg-slate-800 text-white p-2 rounded-lg text-sm font-bold flex items-center gap-1 shadow transition-colors" title="匯入卡片"><FileJson size={18} /></button>
      
      <button onClick={handleExportCardData} className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg text-sm font-bold flex items-center gap-1 shadow transition-colors" title="下載精簡版資料 (翻譯專用)">
          <Download size={18} />
      </button>

  </div>
)}
                        {!isAdmin && user && user.isAnonymous && (
                            <div className="hidden sm:flex items-center gap-1 text-slate-400 text-xs bg-slate-100 px-2 py-1 rounded ml-1 border border-slate-200">
                                <Lock size={12} /> {lang==='en'?'Guest':'訪客模式'}
                            </div>
                        )}
                    </div>
                </div>
                                
                {/* --- 篩選與搜尋 --- */}
                <div className="w-full flex flex-col gap-2">
                    <button 
      onClick={() => setShowFilters(!showFilters)} 
      className="w-full flex items-center justify-between bg-slate-100 p-2 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors border border-slate-200 shadow-sm"
  >
                        <span className="flex items-center gap-2"><Filter size={16} className="text-blue-600" /> {lang==='en'?'Filters':'搜尋與進階篩選'}</span>
                        {showFilters ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
                    </button>
                    
                    <div className={`flex flex-col gap-2 transition-all duration-300 ease-in-out overflow-hidden origin-top ${showFilters ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="relative w-full"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder={lang==='en'?'Search name or ID...':'搜尋名稱或編號...'} className="w-full pl-10 pr-4 py-1.5 md:py-2 bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} /></div>
                        <div className="flex gap-2">
                          <div className="relative flex-1"><Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><select className="w-full pl-10 pr-4 py-1.5 md:py-2 bg-slate-100 border-none rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})}>{['ALL', ...Object.values(CARD_TYPES)].map(tVal => <option key={tVal} value={tVal}>{tVal === 'ALL' ? (lang==='en'?'All Types':'全部種類') : t(tVal, lang)}</option>)}</select></div>
                          <div className="relative flex-1"><Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><select className="w-full pl-10 pr-4 py-1.5 md:py-2 bg-slate-100 border-none rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" value={filters.color} onChange={(e) => setFilters({...filters, color: e.target.value})}>{['ALL', ...Object.values(CARD_COLORS)].map(c => <option key={c} value={c}>{c === 'ALL' ? (lang==='en'?'All Colors':'全部顏色') : t(c, lang)}</option>)}</select></div>
                        </div>
                        <div className="flex gap-2">
                          <div className="relative flex-1"><Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><select className="w-full pl-10 pr-4 py-1.5 md:py-2 bg-slate-100 border-none rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" value={filters.series} onChange={(e) => setFilters({...filters, series: e.target.value})}><option value="ALL">{lang==='en'?'All Series':'全部系列'}</option>{CARD_SERIES_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}</select></div>
                          <div className="relative flex-1"><Gem className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><select className="w-full pl-10 pr-4 py-1.5 md:py-2 bg-slate-100 border-none rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" value={filters.levelOrRarity} onChange={(e) => setFilters({...filters, levelOrRarity: e.target.value})}><option value="ALL">{lang==='en'?'All Level/Rarity':'全部等級/稀有度'}</option><optgroup label={lang==='en'?'Levels':'等級 (Levels)'}>{Object.values(CARD_LEVELS).map((l) => (<option key={l} value={l}>{l}</option>))}</optgroup><optgroup label={lang==='en'?'Rarities':'稀有度 (Rarities)'}>{Object.entries(CARD_RARITIES).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}</optgroup></select></div>
                        </div>

                        {/* 🌟 方案二實作：橫向滑動的技能標籤列 */}
                        <div className="w-full overflow-x-auto pb-2 mt-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            <div className="flex gap-2 w-max px-1">
                                {COOKIE_SKILLS.map(skill => {
                                    const isSelected = filters.skills.includes(skill);
                                    return (
                                        <button
                                            key={`filter-${skill}`}
                                            onClick={() => {
                                                setFilters(prev => ({
                                                    ...prev,
                                                    skills: isSelected 
                                                        ? prev.skills.filter(s => s !== skill)
                                                        : [...prev.skills, skill]
                                                }))
                                            }}
                                            className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all shadow-sm flex items-center gap-1.5 ${
                                                isSelected 
                                                ? 'bg-amber-100 text-amber-800 border-2 border-amber-400' 
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            {isSelected ? <CheckCircle size={14} className="text-amber-600" /> : <Zap size={14} className="text-slate-400" />}
                                            {t(skill, lang)}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

{/* 🌟 特殊屬性篩選列：橫向滑動容器 */}
                        <div className="w-full overflow-x-auto pb-2 mt-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            <div className="flex gap-3 w-max px-1 select-none items-center">
                                
                                <label className="flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95 shrink-0">
                                    <input type="checkbox" className="hidden peer" checked={filters.showExtra} onChange={(e) => setFilters({ ...filters, showExtra: e.target.checked })} />
                                    <span className="flex items-center gap-1.5 text-xs md:text-sm uppercase tracking-wider bg-purple-100 text-purple-900 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-purple-300 peer-checked:bg-purple-600 peer-checked:text-white peer-checked:ring-2 peer-checked:ring-purple-400 opacity-70 peer-checked:opacity-100 font-bold shadow-sm transition-all">
                                      <Zap size={16} className="w-3 h-3 md:w-4 md:h-4" /> EXTRA
                                    </span>
                                </label>

                                <label className="flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95 shrink-0">
                                    <input type="checkbox" className="hidden peer" checked={filters.showFlip} onChange={(e) => setFilters({ ...filters, showFlip: e.target.checked })} />
                                    <span className="flex items-center gap-1.5 text-xs md:text-sm bg-slate-200 text-slate-700 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-slate-300 peer-checked:bg-slate-800 peer-checked:text-white peer-checked:ring-2 peer-checked:ring-slate-500 opacity-70 peer-checked:opacity-100 font-bold tracking-wider shadow-sm transition-all">
                                      <RotateCw size={16} className="w-3 h-3 md:w-4 md:h-4" /> FLIP
                                    </span>
                                </label>

                                {/* 分隔線 */}
                                <div className="h-5 w-px bg-slate-300 mx-0.5 shrink-0"></div>

                                <label className="flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95 shrink-0">
                                    <input type="checkbox" className="hidden peer" checked={filters.showAncient} onChange={(e) => setFilters({ ...filters, showAncient: e.target.checked })} />
                                    <span className="flex items-center gap-1.5 text-xs md:text-sm bg-amber-100 text-amber-900 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-amber-300 peer-checked:bg-amber-600 peer-checked:text-white peer-checked:ring-2 peer-checked:ring-amber-500 opacity-70 peer-checked:opacity-100 font-bold shadow-sm transition-all">
                                      <Crown size={16} className="w-3 h-3 md:w-4 md:h-4" /> {t('上古', lang)}
                                    </span>
                                </label>

                                <label className="flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95 shrink-0">
                                    <input type="checkbox" className="hidden peer" checked={filters.showDragon} onChange={(e) => setFilters({ ...filters, showDragon: e.target.checked })} />
                                    <span className="flex items-center gap-1.5 text-xs md:text-sm bg-red-100 text-red-900 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-red-300 peer-checked:bg-red-600 peer-checked:text-white peer-checked:ring-2 peer-checked:ring-red-500 opacity-70 peer-checked:opacity-100 font-bold shadow-sm transition-all">
                                      <Flame size={16} className="w-3 h-3 md:w-4 md:h-4" /> {t('龍族', lang)}
                                    </span>
                                </label>

                                <label className="flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95 shrink-0">
                                    <input type="checkbox" className="hidden peer" checked={filters.showBeast} onChange={(e) => setFilters({ ...filters, showBeast: e.target.checked })} />
                                    <span className="flex items-center gap-1.5 text-xs md:text-sm bg-stone-200 text-stone-800 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-stone-300 peer-checked:bg-stone-700 peer-checked:text-white peer-checked:ring-2 peer-checked:ring-stone-500 opacity-70 peer-checked:opacity-100 font-bold shadow-sm transition-all">
                                      <PawPrint size={16} className="w-3 h-3 md:w-4 md:h-4" /> {t('野獸', lang)}
                                    </span>
                                </label>

                                <label className="flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95 shrink-0">
                                    <input type="checkbox" className="hidden peer" checked={filters.showSoulJam} onChange={(e) => setFilters({ ...filters, showSoulJam: e.target.checked })} />
                                    <span className="flex items-center gap-1.5 text-xs md:text-sm bg-pink-100 text-pink-900 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-pink-300 peer-checked:bg-pink-600 peer-checked:text-white peer-checked:ring-2 peer-checked:ring-pink-500 opacity-70 peer-checked:opacity-100 font-bold shadow-sm transition-all">
                                      <Sparkles size={16} className="w-3 h-3 md:w-4 md:h-4" /> {t('靈魂果醬', lang)}
                                    </span>
                                </label>

                                <label className="flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95 shrink-0">
                                    <input type="checkbox" className="hidden peer" checked={filters.showArena} onChange={(e) => setFilters({ ...filters, showArena: e.target.checked })} />
                                    <span className="flex items-center gap-1.5 text-xs md:text-sm bg-cyan-100 text-cyan-900 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-cyan-300 peer-checked:bg-cyan-600 peer-checked:text-white peer-checked:ring-2 peer-checked:ring-cyan-500 opacity-70 peer-checked:opacity-100 font-bold shadow-sm transition-all">
                                      <Swords size={16} className="w-3 h-3 md:w-4 md:h-4" /> {t('競技場', lang)}
                                    </span>
                                </label>
                                
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        {/* 左側卡片列表容器 */}
        <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-4 bg-slate-50 overscroll-contain" 
            style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {!isDataLoaded ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
               <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
               <p className="font-bold text-sm">正在從雲端載入卡片資料... (可能需要一些時間)</p>
            </div>
          ) : (
             <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 pb-20">
                {displayedCards.map(card => (
                  <CardItem 
                    key={card.id} 
                    card={card} 
                    onClick={addToDeck} 
                    onView={setViewingCard} 
                    count={getCardCount(card.id)}
                    onEdit={isAdmin ? openEditModal : null}
                    onDelete={isAdmin ? handleDeleteCard : null}
                    onHoverStart={handleHoverStart}
                    onHoverMove={handleHoverMove}
                    onHoverEnd={handleHoverEnd}
                    lang={lang}
                  />
                ))}
                <div ref={loadMoreRef} className="col-span-full h-10 flex items-center justify-center text-slate-400 text-sm">
                    {displayedCards.length < filteredCards.length ? "載入更多..." : "已顯示所有卡片"}
                </div>
              </div>
          )}
        </div>

        {/* Footer 區域 */}
        <div className="bg-white border-t border-slate-200 text-xs text-slate-500 p-2 md:p-3 shrink-0">
          {/* 手機版佈局 */}
          <div className="md:hidden flex flex-col gap-1">
              <div className="flex items-center justify-center gap-6">
                  <a href="https://www.youtube.com/@%E6%A8%82%E5%A4%9A%E7%B6%A0" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-red-600 transition-colors font-bold">
                      <Youtube size={14} /> YouTube
                  </a>
                  <a href="https://www.facebook.com/midaylovesworld/" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-600 transition-colors font-bold">
                      <Facebook size={14} /> 樂多綠Facebook
                  </a>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 mt-0.5">
                  <div className="flex items-center gap-2 overflow-hidden text-[10px] sm:text-xs">
                      <a href="https://www.facebook.com/groups/CookieRunBraverseTW" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-600 transition-colors font-bold whitespace-nowrap shrink-0">
                          <ExternalLink size={12} /> 薑餅人對戰卡牌/台灣
                      </a>
                      <span className="text-slate-300">|</span>
                      <span className="truncate text-slate-400">製作者：樂多綠Gamecaster</span>
                  </div>
                  {user && !user.isAnonymous ? (
                    <>
                    <button 
                        onClick={() => setShowProfileModal(true)} 
                        className="flex items-center gap-1 p-1 text-slate-500 hover:text-blue-500 transition-colors shrink-0 cursor-pointer" 
                        title="點擊修改暱稱"
                    >
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-[10px] font-bold truncate max-w-[80px]">{user.displayName || '設定暱稱'}</span>
                            <span className="text-[8px] opacity-50">已登入</span>
                        </div>
                        <UserCog size={14}/>
                    </button>
                    <button onClick={handleLogout} className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0" title="登出">
                        <LogOut size={14}/>
                    </button>
                    </>
                  ) : (
                    <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-1 p-1 text-blue-600 hover:text-blue-800 transition-colors shrink-0 font-bold" title="登入/註冊">
                        <span className="text-[10px]">{lang==='en'?'Login':'登入/註冊'}</span>
                        <UserCog size={14}/>
                    </button>
                  )}
              </div>
          </div>

          <div className="hidden md:flex flex-row justify-between items-center gap-4">
              <span className="font-bold">製作者：樂多綠Gamecaster</span>
              <div className="flex gap-4">
                  <a href="https://www.youtube.com/@%E6%A8%82%E5%A4%9A%E7%B6%A0" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-red-600 transition-colors font-bold">
                      <Youtube size={14} /> YouTube
                  </a>
                  <a href="https://www.facebook.com/midaylovesworld/" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-600 transition-colors font-bold">
                      <Facebook size={14} /> 樂多綠Facebook
                  </a>
                  <a href="https://www.facebook.com/groups/CookieRunBraverseTW" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-600 transition-colors font-bold">
                      <ExternalLink size={14} /> 薑餅人對戰卡牌/台灣
                  </a>
              </div>
              <div className="flex justify-end">
                {user && !user.isAnonymous ? (
                    <>
                    <button 
                        onClick={() => setShowProfileModal(true)} 
                        className="flex items-center gap-1 p-1 text-slate-500 hover:text-blue-500 transition-colors shrink-0 cursor-pointer" 
                        title="點擊修改暱稱"
                    >
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-[10px] font-bold truncate max-w-[80px]">{user.displayName || '設定暱稱'}</span>
                            <span className="text-[8px] opacity-50">已登入</span>
                        </div>
                        <UserCog size={14}/>
                    </button>
                    <button onClick={handleLogout} className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0" title="登出">
                        <LogOut size={14}/>
                    </button>
                    </>
                  ) : (
                    <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-1 p-1 text-blue-600 hover:text-blue-800 transition-colors shrink-0 font-bold" title="登入/註冊">
                        <span className="text-[10px]">{lang==='en'?'Login':'登入/註冊'}</span>
                        <UserCog size={14}/>
                    </button>
                  )}
              </div>
          </div>
        </div>
      </div>

      {/* 手機版：懸浮按鈕 (FAB) 開啟牌組清單 */}
      <button className="print:hidden md:hidden fixed bottom-6 right-6 z-40 bg-blue-600 text-white p-4 rounded-full shadow-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 ring-2 ring-white" onClick={() => setIsMobileDeckOpen(true)}>
        <Layers size={24} />
        <span className="font-bold text-lg">{deck.main.length}</span>
      </button>

      {/* 手機版：側邊欄遮罩 */}
      {isMobileDeckOpen && (
        <div 
            className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDeckOpen(false)}
        />
      )}

      {/* 右側：牌組清單 */}
      <div className={`print:hidden
          bg-white shadow-2xl z-50 flex flex-col border-l border-slate-300
          fixed inset-y-0 right-0 transition-all duration-300 ease-in-out
          w-[85vw] max-w-sm 
          ${isMobileDeckOpen ? 'translate-x-0' : 'translate-x-full'}
          
          md:relative md:w-80 lg:w-96 md:h-auto md:shadow-none md:translate-x-0
          ${isDesktopDeckOpen ? 'md:mr-0' : 'md:-mr-80 lg:-mr-96'}
      `}>
        
        {/* 🌟 電腦版專用的側邊收合按鈕 (已修正定位) */}
        <button 
            onClick={() => setIsDesktopDeckOpen(!isDesktopDeckOpen)}
            className="hidden md:flex absolute -left-8 top-1/2 -translate-y-1/2 bg-slate-800 text-white w-8 h-16 rounded-l-xl items-center justify-center shadow-md hover:bg-blue-600 transition-colors z-50"
            title={isDesktopDeckOpen ? "收起牌組面板" : "展開牌組面板"}
        >
            {isDesktopDeckOpen ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
        </button>

        <div className="p-4 bg-slate-800 text-white border-b border-slate-700 shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2 flex-1"><Box size={20} className="text-blue-400"/> {lang==='en'?'My Deck':'目前牌組'}</h2>
            <div className="flex gap-2">
              <button onClick={handleShareClick} className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded transition-colors" title="分享/輸出"><Share2 size={18} /></button>
              
              <button 
                onClick={() => {
                    if (user && !user.isAnonymous) {
                        setShowStorageModal(true);
                    } else {
                        if (confirm(lang==='en'?"Login required. Go to login?":"儲存牌組功能僅限註冊會員使用。\n是否前往登入/註冊？")) {
                            setShowLoginModal(true);
                        }
                    }
                }}
                className={`px-2 py-1.5 rounded transition-colors text-sm font-bold flex items-center gap-1 ${
                    user && !user.isAnonymous 
                    ? "bg-green-600 hover:bg-green-500 text-white" 
                    : "bg-slate-700 text-slate-500 hover:bg-slate-600 hover:text-slate-300"
                }`}
                title={user && !user.isAnonymous ? "儲存/讀取我的牌組" : "登入以使用雲端儲存功能"}
              >
                <Save size={14} />
              </button>

              <button onClick={clearDeck} className="bg-red-600 hover:bg-red-500 text-white px-2 py-1.5 rounded transition-colors text-sm font-bold flex items-center gap-1">
                <Trash2 size={14} />
              </button>
              <button onClick={() => setIsMobileDeckOpen(false)} className="md:hidden bg-slate-700 hover:bg-slate-600 text-white p-1.5 rounded transition-colors ml-2">
                <X size={18} />
              </button>
            </div>
          </div>
          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            className="bg-transparent text-lg font-bold text-white border-b border-white/20 focus:border-white outline-none w-full placeholder-slate-400 mb-2"
            placeholder={lang==='en'?'Deck Name...':'命名你的牌組...'}
          />
          <div className="flex flex-wrap gap-2">
            <StatBadge icon={Layers} label={lang==='en'?'Main':'主牌組'} current={deck.main.length} max={LIMITS.MAIN} color="blue" warningAtFull={false} />
            <StatBadge icon={Zap} label={lang==='en'?'Extra':'額外'} current={deck.extra.length} max={LIMITS.EXTRA} color="purple" />
            <StatBadge icon={RotateCw} label="Flip" current={flipCount} max={LIMITS.FLIP} color="orange" />
          </div>
          
          <div className="mt-4 w-full bg-slate-900/50 p-2.5 rounded-lg border border-slate-600/50 shadow-inner">
             <div className="flex justify-between items-center text-[10px] text-slate-300 mb-2 font-bold tracking-wider uppercase">
                <span className="flex items-center gap-1.5 text-white">
                  <Cookie size={12}/> Cookie Levels
                </span>
                <span className="opacity-60 bg-slate-800 px-1.5 py-0.5 rounded text-[9px]">
                  Total: {levelStats.total}
                </span>
             </div>
             
             <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-800 shadow-inner ring-1 ring-white/10">
                <div style={{ width: `${levelStats.p1}%` }} className="bg-yellow-400 h-full"></div>
                <div style={{ width: `${levelStats.p2}%` }} className="bg-orange-500 h-full"></div>
                <div style={{ width: `${levelStats.p3}%` }} className="bg-red-600 h-full"></div>
             </div>

             <div className="flex justify-between text-[10px] mt-1.5 font-mono font-bold leading-none text-slate-400">
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div> 
                   L1: <span className="text-white">{levelStats.lv1}</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> 
                   L2: <span className="text-white">{levelStats.lv2}</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div> 
                   L3: <span className="text-white">{levelStats.lv3}</span>
                </div>
             </div>
          </div>
        </div>
        
        <div className="p-2 bg-slate-700 border-b border-slate-600">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-2 flex items-center gap-1">
                <UserCog size={12} /> {lang==='en'?'Test Toolkit':'測試工具箱'}
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={() => setShowDrawTestModal(true)}
                    className="bg-slate-600 hover:bg-blue-600 text-white py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-colors"
                >
                    <Dices size={16} /> 
                    <span>{lang==='en'?'Draw Test':'手牌測試'}</span>
                    <span className="text-[10px] opacity-75 font-normal">First Draw</span>
                </button>
                <button 
                    onClick={() => setShowPackOpenerModal(true)}
                    className="bg-slate-600 hover:bg-yellow-600 text-white py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-colors"
                >
                    <PackageOpen size={16} /> 
                    <span>{lang==='en'?'Pack Opener':'開卡包'}</span>
                    <span className="text-[10px] opacity-75 font-normal">Pack Opener</span>
                </button>
            </div>
        </div>

        {isAdmin && (
            <div className="p-2 bg-slate-800 border-b border-slate-700">
                <div className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-2 px-2 flex items-center gap-1">
                    <UserCog size={12} /> 管理員操作
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2 text-center text-xs text-slate-500 italic">
                        目前管理功能整合於上方操作列
                    </div>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-6 bg-slate-50 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          
          <section className="bg-white rounded-lg border border-blue-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div className="bg-blue-50 px-3 py-2 border-b border-blue-100 flex justify-between items-center">
               <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-2"><Layers size={14} /> {lang==='en'?'Main Deck':'主要牌組 (一般)'} ({mainDeckNormal.length})</h3>
            </div>
            <div className={`p-2 space-y-2 min-h-[60px] ${deck.main.length > 60 ? "bg-red-50/50" : ""}`}>
              {groupedMainDeckNormal.length === 0 ? 
                <div className="h-full border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 text-sm py-4"><Layers size={24} className="mb-1 opacity-50"/></div> : 
                groupedMainDeckNormal.map(group => (
                  <CardItem 
                    key={`main-group-${group.id}`} 
                    card={group} 
                    compact={true} 
                    count={group.stackCount} 
                    onIncrement={() => addToDeck(group)}
                    onDecrement={() => removeFromDeck(group, false)}
                    onView={setViewingCard} 
                    onHoverStart={handleHoverStart}
                    onHoverMove={handleHoverMove}
                    onHoverEnd={handleHoverEnd}
                    lang={lang}
                  />
                ))
              }
            </div>
          </section>

          <section className="bg-white rounded-lg border border-slate-300 overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
               <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2"><RotateCw size={14} /> FLIP ({mainDeckFlip.length} / {LIMITS.FLIP})</h3>
            </div>
            <div className="p-2 space-y-2 min-h-[60px]">
                 {groupedMainDeckFlip.length === 0 ? 
                   <div className="h-full border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-xs py-4"></div> : 
                   groupedMainDeckFlip.map(group => (
                     <CardItem 
                       key={`flip-group-${group.id}`} 
                       card={group} 
                       compact={true} 
                       count={group.stackCount} 
                       onIncrement={() => addToDeck(group)}
                       onDecrement={() => removeFromDeck(group, false)} 
                       onView={setViewingCard} 
                       onHoverStart={handleHoverStart}
                       onHoverMove={handleHoverMove}
                       onHoverEnd={handleHoverEnd}
                       lang={lang}
                     />
                   ))
                 }
            </div>
          </section>

          <section className="bg-white rounded-lg border border-purple-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div className="bg-purple-50 px-3 py-2 border-b border-purple-100 flex justify-between items-center">
               <h3 className="text-xs font-bold text-purple-800 uppercase tracking-wider flex items-center gap-2"><Zap size={14} /> {lang==='en'?'Extra Deck':'額外牌組'} ({deck.extra.length} / {LIMITS.EXTRA})</h3>
            </div>
            <div className="p-2 space-y-2 min-h-[60px]">
                 {groupedExtraDeck.length === 0 ? 
                   <div className="h-full border-2 border-dashed border-purple-200/50 rounded-lg flex items-center justify-center text-purple-400 text-xs py-4"></div> : 
                   groupedExtraDeck.map(group => (
                     <CardItem 
                       key={`extra-group-${group.id}`} 
                       card={group} 
                       compact={true} 
                       count={group.stackCount} 
                       onIncrement={() => addToDeck(group)}
                       onDecrement={() => removeFromDeck(group, true)} 
                       onView={setViewingCard} 
                       onHoverStart={handleHoverStart}
                       onHoverMove={handleHoverMove}
                       onHoverEnd={handleHoverEnd}
                       lang={lang}
                     />
                   ))
                 }
            </div>
          </section>

          <section className="bg-orange-50 p-3 rounded-lg border border-orange-200 shadow-sm">
              <h4 className="flex items-center gap-2 text-orange-800 font-bold text-sm mb-1"><AlertTriangle size={14} /> {lang==='en'?'Deck Validation':'牌組檢查'}</h4>
              <div className="text-[11px] text-orange-800/70 font-mono mb-2 border-b border-orange-200 pb-2 leading-relaxed">{lang==='en'?'Max 4 per ID. Max 16 FLIP.':'※相同編號卡最多4張 / ※FLIP卡最多16張'}</div>
              <ul className="text-xs text-orange-700 space-y-1 list-disc pl-4">
                {nonFlipCookieCount < 20 && <li>{lang==='en'?`Recommendation: Need at least 20 Cookies (Current: ${nonFlipCookieCount})`:`主牌組建議至少 20 張餅乾卡 (目前 ${nonFlipCookieCount})`}<span className="text-[10px] opacity-75 ml-1">{lang==='en'?'(No FLIP)':'(不含 FLIP)'}</span></li>}
                {deck.main.length > LIMITS.MAIN && <li className="text-red-600 font-bold">{lang==='en'?`Main deck over limit (${deck.main.length}/60)`:`主牌組已超過上限 (${deck.main.length}/60)`}</li>}
                {deck.extra.length > LIMITS.EXTRA && <li className="text-red-600 font-bold">{lang==='en'?`Extra deck over limit (${deck.extra.length}/${LIMITS.EXTRA})`:`額外牌組已超過上限 (${deck.extra.length}/${LIMITS.EXTRA})`}</li>}
                {flipCount > LIMITS.FLIP && <li className="text-red-600 font-bold">{lang==='en'?`FLIP cards over limit (${flipCount}/${LIMITS.FLIP})`:`Flip 卡片已超過上限 (${flipCount}/${LIMITS.FLIP})`}</li>}
                {(forbiddenCount > 0 || limitOneViolation) && (<li className="text-red-600 font-bold flex items-start gap-1 -ml-1"><Ban size={14} className="shrink-0 mt-0.5" /><span>{lang==='en'?'Contains Banned/Limit violations. Cannot be used in official tournaments.':'此牌組包含超過數量上限的禁止與限制卡，正式比賽將無法使用。'}</span></li>)}
                {nonFlipCookieCount >= 20 && deck.main.length <= LIMITS.MAIN && deck.extra.length <= LIMITS.EXTRA && flipCount <= LIMITS.FLIP && forbiddenCount === 0 && !limitOneViolation && <li className="text-emerald-600 list-none -ml-4 flex items-center gap-1 font-bold"><CheckCircle size={14}/> {lang==='en'?'Deck Valid':'牌組目前合規'}</li>}
              </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
