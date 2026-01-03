// @ts-nocheck
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Filter,
  Trash2,
  AlertCircle,
  Layers,
  Box,
  Zap,
  AlertTriangle,
  Palette,
  RotateCw,
  Plus,
  X,
  Image as ImageIcon,
  Upload,
  Eye,
  Share2,
  Download,
  Link as LinkIcon,
  Copy,
  Database,
  Cloud,
  Lock,
  Unlock,
  LogOut,
  RefreshCw,
  Pencil,
  Star,
  Youtube,
  FileJson,
  WifiOff,
  CheckCircle,
  Cookie,
  Ban,
  AlertOctagon,
  Menu,
  ChevronRight,
  ExternalLink,
  Facebook,
  UserCog,
  Dices,
  PackageOpen,
  Printer,
  Repeat,
  Gem,
} from "lucide-react";

// --- Firebase Imports ---
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  onSnapshot,
  query,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";

// --- Firebase 初始化變數 ---
let app = null;
let auth = null;
let db = null;
const appId = "my-deck-builder-v1";

// ==========================================
//  Firebase 設定
// ==========================================
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
    db = getFirestore(app);
  } else {
    console.warn("警告：未偵測到 Firebase API Key，請檢查 .env 設定。");
  }
} catch (e) {
  console.error("Firebase 初始化失敗:", e);
}

// --- 常數定義 ---
const CARD_TYPES = {
  COOKIE: "餅乾卡",
  ITEM: "道具卡",
  TRAP: "陷阱卡",
  SCENE: "場景卡",
};
const CARD_COLORS = {
  RED: "紅色",
  YELLOW: "黃色",
  GREEN: "綠色",
  BLUE: "藍色",
  PURPLE: "紫色",
  COLORLESS: "無色",
};
const CARD_LEVELS = { LV1: "LV.1", LV2: "LV.2", LV3: "LV.3" };
const CARD_SERIES_OPTIONS = [
  "ST",
  "BS1",
  "BS2",
  "BS3",
  "BS4",
  "BS5",
  "BS6",
  "BS7",
  "BS8",
  "BS9",
  "P",
];

// 稀有度定義
const CARD_RARITIES = {
  C: "C (Common)",
  R: "R (Rare)",
  SR: "SR (Super Rare)",
  UR: "UR (Ultra Rare)",
  SEC: "Extra (Secret)",
};

const CARD_BACK_URL = "https://static.wixstatic.com/media/2295bf_b9aee85e881243d99276b2f571927305~mv2.png";

const INITIAL_CARDS = [
  {
    id: "BS1-001",
    series: "BS1",
    number: "001",
    name: "勇氣餅乾",
    type: CARD_TYPES.COOKIE,
    color: CARD_COLORS.RED,
    level: CARD_LEVELS.LV1,
    rarity: "C", 
    isExtra: false,
    isFlip: true,
    isAncient: false,
    isDragon: false,
    isBeast: false,
    isSoulJam: false,
    isForbidden: false,
    isLimitOne: false,
    imageUrl: null,
  },
];

const isExtraDeckCard = (card) => card.isExtra === true;

const getCardColorStyles = (color) => {
  switch (color) {
    case CARD_COLORS.RED:
      return "bg-red-50 border-red-500 text-red-900";
    case CARD_COLORS.YELLOW:
      return "bg-yellow-50 border-yellow-500 text-yellow-900";
    case CARD_COLORS.GREEN:
      return "bg-emerald-50 border-emerald-500 text-emerald-900";
    case CARD_COLORS.BLUE:
      return "bg-blue-50 border-blue-500 text-blue-900";
    case CARD_COLORS.PURPLE:
      return "bg-purple-50 border-purple-500 text-purple-900";
    case CARD_COLORS.COLORLESS:
      return "bg-slate-100 border-slate-400 text-slate-800";
    default:
      return "bg-gray-100 border-gray-400 text-gray-800";
  }
};

const getRarityStyle = (rarity) => {
    switch (rarity) {
        case 'SEC': return "bg-gradient-to-r from-rose-400 to-red-500 text-white border-rose-600 shadow-rose-200";
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

const getExportSortWeight = (card) => {
  if (card.isFlip) return 900;
  if (card.type === CARD_TYPES.COOKIE) {
    if (card.level === CARD_LEVELS.LV1) return 100;
    if (card.level === CARD_LEVELS.LV2) return 110;
    if (card.level === CARD_LEVELS.LV3) return 120;
    return 130;
  }
  if (card.type === CARD_TYPES.ITEM) return 200;
  if (card.type === CARD_TYPES.TRAP) return 300;
  if (card.type === CARD_TYPES.SCENE) return 400;
  return 800;
};

const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 400;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// --- Fisher-Yates Shuffle Utility ---
const fisherYatesShuffle = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// --- Modals & Components ---

const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] animate-bounce pointer-events-none">
      <div className="bg-slate-800 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-2 font-bold border border-slate-600 pointer-events-auto cursor-pointer" onClick={onClose}>
        <AlertCircle size={20} className="text-blue-400" />
        {message}
      </div>
    </div>
  );
};

const LoginModal = ({ onClose, onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onLogin(email, password);
      onClose();
    } catch (err) {
      setError("登入失敗：" + (err.message || "請檢查帳號密碼"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <UserCog className="text-blue-600" /> 管理員登入
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              required 
              className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              required 
              className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-800 text-white py-2 rounded-lg font-bold hover:bg-slate-900 disabled:opacity-50"
          >
            {loading ? "驗證中..." : "登入"}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- 功能 1: 起始牌組測試器 (First Draw) ---
const DrawTestModal = ({ deck, onClose }) => {
  const [hand, setHand] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState({});

  // 洗牌並抽 6 張
  const drawCards = useCallback(() => {
    if (deck.main.length === 0) {
        alert("主牌組沒有卡片！");
        return;
    }
    const shuffled = fisherYatesShuffle(deck.main);
    setHand(shuffled.slice(0, 6));
    setFlippedIndices({}); // 重置翻牌狀態

    // 自動慢慢翻牌
    for (let i = 0; i < 6; i++) {
        setTimeout(() => {
            setFlippedIndices(prev => ({ ...prev, [i]: true }));
        }, (i + 1) * 300); // 每 300ms 翻一張
    }
  }, [deck.main]);

  useEffect(() => {
    drawCards();
  }, [drawCards]);

  const handleCardClick = (index) => {
    setFlippedIndices(prev => ({ ...prev, [index]: true }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-4xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Dices className="text-blue-600" /> 起始手牌測試 (First Draw)
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full">
            <X size={24} />
          </button>
        </div>
        
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
          {hand.map((card, index) => (
            <div 
                key={`${card.id}-${index}`} 
                onClick={() => handleCardClick(index)}
                className="aspect-[3/4] cursor-pointer perspective-1000 group relative"
            >
               <div className={`w-full h-full transition-transform duration-700 transform-style-3d relative ${flippedIndices[index] ? 'rotate-y-180' : ''}`}>
                    {/* 背面 (Card Back) */}
                    <div className="absolute inset-0 backface-hidden rounded-lg overflow-hidden border-2 border-slate-300 shadow-md">
                        <img src={CARD_BACK_URL} className="w-full h-full object-cover" alt="Card Back" />
                    </div>
                    {/* 正面 (Card Face) */}
                    <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-lg overflow-hidden border border-slate-300 shadow-md bg-white">
                        {card.imageUrl ? (
                            <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className={`w-full h-full p-2 text-xs flex flex-col ${getCardColorStyles(card.color)}`}>
                                <span className="font-bold">{card.name}</span>
                                <span className="text-[10px] mt-1">{card.id}</span>
                            </div>
                        )}
                        <div className="absolute top-1 left-1 bg-black/50 text-white text-[10px] px-1.5 rounded font-bold">#{index + 1}</div>
                    </div>
               </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button 
            onClick={drawCards}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-transform active:scale-95"
          >
            <RefreshCw size={20} /> 重新洗牌並抽牌
          </button>
        </div>
        <p className="text-center text-slate-500 text-sm mt-4">
            模擬真實洗牌 (Fisher-Yates) 後抽取前 6 張卡片，卡片將依序翻開
        </p>
      </div>
    </div>
  );
};

// --- 功能 2: 開卡包模擬器 ---
const PackOpenerModal = ({ allCards, onClose }) => {
  const [selectedSeries, setSelectedSeries] = useState("ALL");
  const [openedCards, setOpenedCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState({});

  const availableSeries = useMemo(() => {
    const seriesSet = new Set(allCards.map(c => c.series));
    return Array.from(seriesSet).sort();
  }, [allCards]);

  const getRarityProb = () => {
    const r = Math.random() * 100;
    if (r < 1) return 'SEC';  // 1%
    if (r < 6) return 'UR';   // 1 + 5 = 6%
    if (r < 16) return 'SR';  // 6 + 10 = 16%
    if (r < 36) return 'R';   // 16 + 20 = 36%
    return 'C';               // 64% (剩餘機率)
  };

  const openPack = () => {
    let pool = allCards;
    if (selectedSeries !== "ALL") {
      pool = allCards.filter(c => c.series === selectedSeries);
    }

    // 分類：餅乾卡 與 非餅乾卡
    const cookieCards = pool.filter(c => c.type === CARD_TYPES.COOKIE);
    const otherCards = pool.filter(c => c.type !== CARD_TYPES.COOKIE);

    if (otherCards.length < 1) {
        alert(`該系列非餅乾卡不足 1 張，無法模擬開包！`);
        return;
    }
    if (cookieCards.length < 4) {
        alert(`該系列餅乾卡不足 4 張，無法模擬開包！`);
        return;
    }

    // 1. 隨機抽取 1 張非餅乾卡 (任意稀有度，隨機)
    const shuffledOthers = fisherYatesShuffle(otherCards);
    const selectedOther = shuffledOthers[0]; 

    // 用來追蹤已選的卡片ID，避免同一包開出兩張一樣的 (如果卡池允許)
    // 這裡我們盡量避免，但如果卡池過小則不得不重複
    const selectedIDs = new Set();
    if (selectedOther) selectedIDs.add(selectedOther.id);

    const selectedCookies = [];

    // 2. 決定 4 張餅乾卡
    // 規則：1 張為「稀有位」(機率判定)，3 張為固定 Common (C)

    // 2.1 稀有位 (Rare Slot)
    const targetRarity = getRarityProb();
    let targetPool = cookieCards.filter(c => (c.rarity || 'C') === targetRarity);
    
    // 保底：如果該系列沒有抽到的那種稀有度 (例如 BS1 可能沒有 SEC)，則放寬從所有餅乾卡選
    if (targetPool.length === 0) {
        targetPool = cookieCards; 
    }

    const rareCard = targetPool[Math.floor(Math.random() * targetPool.length)];
    if (rareCard) {
        selectedCookies.push(rareCard);
        selectedIDs.add(rareCard.id);
    }

    // 2.2 Common 位 (3 張)
    // 優先選 C 卡，且盡量不重複
    let commonPool = cookieCards.filter(c => (c.rarity || 'C') === 'C' && !selectedIDs.has(c.id));
    
    // 如果 C 卡不夠 (小系列)，則放寬從所有餅乾卡選 (排除已選)
    if (commonPool.length < 3) {
        commonPool = cookieCards.filter(c => !selectedIDs.has(c.id));
    }

    const shuffledCommons = fisherYatesShuffle(commonPool);
    const commonsToTake = shuffledCommons.slice(0, 3);
    selectedCookies.push(...commonsToTake);

    // 防呆：如果還是沒湊滿 4 張 (極端情況)，隨機補滿
    while (selectedCookies.length < 4) {
         const randomC = cookieCards[Math.floor(Math.random() * cookieCards.length)];
         selectedCookies.push(randomC);
    }

    // 合併並洗牌 (讓非餅乾卡和稀有卡的位置隨機)
    const finalPack = fisherYatesShuffle([...selectedCookies, selectedOther]);

    setOpenedCards(finalPack);
    setFlippedIndices({}); // 重置翻牌狀態
  };

  const handleCardClick = (index) => {
    setFlippedIndices(prev => ({ ...prev, [index]: true }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-5xl p-6 min-h-[600px] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 text-white">
          <h2 className="text-2xl font-black flex items-center gap-2">
            <PackageOpen className="text-yellow-400" /> 開卡包模擬器
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full">
            <X size={24} />
          </button>
        </div>

        <div className="flex gap-4 mb-8 justify-center">
          <select 
            className="bg-slate-700 text-white border border-slate-600 rounded-lg px-4 py-2 outline-none font-bold"
            value={selectedSeries}
            onChange={(e) => setSelectedSeries(e.target.value)}
          >
            <option value="ALL">全部卡池</option>
            {availableSeries.map(s => <option key={s} value={s}>{s} 系列</option>)}
          </select>
          <button 
            onClick={openPack}
            className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 px-6 py-2 rounded-lg font-black flex items-center gap-2 shadow-lg transition-transform active:scale-95"
          >
            <PackageOpen size={20} /> 開啟卡包
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          {openedCards.length === 0 ? (
            <div className="text-slate-500 flex flex-col items-center">
                <PackageOpen size={64} className="mb-4 opacity-20" />
                <p>選擇系列並點擊「開啟卡包」</p>
                <p className="text-xs mt-2 opacity-60">配率：4 張餅乾卡 (含1張稀有位) + 1 張其他卡片</p>
                <div className="flex gap-2 mt-2 text-[10px] opacity-50">
                    <span>SEC: 1%</span>
                    <span>UR: 5%</span>
                    <span>SR: 10%</span>
                    <span>R: 20%</span>
                </div>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2 md:gap-4 w-full px-2 md:px-10">
              {openedCards.map((card, index) => (
                <div 
                    key={index} 
                    onClick={() => handleCardClick(index)}
                    className="aspect-[3/4] cursor-pointer perspective-1000 group relative"
                >
                    <div className={`w-full h-full transition-all duration-500 transform-style-3d relative ${flippedIndices[index] ? 'rotate-y-180' : ''}`}>
                        {/* 背面 (Face Down) */}
                        <div className="absolute inset-0 backface-hidden rounded-lg overflow-hidden border-2 border-slate-600 shadow-xl group-hover:scale-105 transition-transform">
                            <img src={CARD_BACK_URL} className="w-full h-full object-cover" alt="Card Back" />
                        </div>
                        {/* 正面 (Face Up) */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-lg overflow-hidden border-2 border-white/20 shadow-2xl bg-white relative">
                            {card.imageUrl ? (
                                <img src={card.imageUrl} className="w-full h-full object-cover" alt={card.name} />
                            ) : (
                                <div className={`w-full h-full p-2 flex flex-col justify-between ${getCardColorStyles(card.color)}`}>
                                    <span className="font-bold text-sm">{card.name}</span>
                                    <span className="font-mono text-xs">{card.id}</span>
                                </div>
                            )}
                            {/* 稀有度特效標籤 (僅在正面顯示) */}
                            {card.rarity && card.rarity !== 'C' && (
                                <div className={`absolute top-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded shadow border ${getRarityStyle(card.rarity)}`}>
                                    {card.rarity}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BulkImportModal = ({ onClose, onImport, isProcessing }) => {
  const [jsonInput, setJsonInput] = useState("");

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        alert("格式錯誤：輸入的內容必須是一個 JSON 陣列 [...]");
        return;
      }
      if (
        !confirm(
          `解析成功！共發現 ${parsed.length} 張卡片。\n確定要寫入資料庫嗎？`
        )
      ) {
        return;
      }
      onImport(parsed);
    } catch (e) {
      alert("JSON 格式錯誤，請檢查語法。\n" + e.message);
    }
  };

  const sampleFormat = `[
  {
    "id": "BS1-999",
    "series": "BS1",
    "number": "999",
    "name": "範例餅乾",
    "type": "餅乾卡",
    "color": "紅色",
    "level": "LV.1",
    "rarity": "C",
    "isFlip": true,
    "isExtra": false,
    "isAncient": false,
    "isDragon": false,
    "isBeast": false,
    "isSoulJam": false,
    "isForbidden": false,
    "isLimitOne": false
  }
]`;

  return (
    <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileJson className="text-green-600" /> 批量匯入卡片 (JSON)
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-full"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
          <div className="bg-blue-50 p-4 rounded text-sm text-blue-800 border border-blue-200">
            <p className="font-bold mb-1">使用說明：</p>
            <p>
              請將您的卡片資料整理為 <strong>JSON 陣列</strong> 格式貼入下方。
              <br />
              支援欄位：id, series, number, name, type, color, level, rarity (C, R, SR, UR, SEC), isFlip, isExtra...
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
            <div className="flex flex-col gap-2">
              <label className="font-bold text-slate-700">輸入 JSON:</label>
              <textarea
                className="flex-1 w-full border rounded-lg p-3 font-mono text-xs bg-slate-50 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="在此貼上 JSON..."
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-bold text-slate-700">格式範例:</label>
              <pre className="flex-1 w-full border rounded-lg p-3 font-mono text-xs bg-slate-100 overflow-auto select-all text-slate-600">
                {sampleFormat}
              </pre>
            </div>
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={isProcessing || !jsonInput}
            className="px-6 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg font-bold disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? "匯入中..." : "開始匯入"}
          </button>
        </div>
      </div>
    </div>
  );
};

const CardDetailModal = ({ card, onClose }) => {
  if (!card) return null;
  return (
    <div
      className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors"
        >
          <X size={32} />
        </button>
        {card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt={card.name}
            className="w-full h-auto rounded-lg shadow-2xl border-2 border-white/20"
          />
        ) : (
          <div
            className={`w-full aspect-[3/4] rounded-xl p-8 flex flex-col shadow-2xl border-8 ${getCardColorStyles(
              card.color
            )} bg-white`}
          >
            <h1 className="text-4xl font-bold mb-2">{card.name}</h1>
            <p className="text-xl font-mono opacity-60 mb-8">{card.id}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {card.rarity && <span className={`px-3 py-1 rounded-full font-bold text-xs border shadow-sm ${getRarityStyle(card.rarity)}`}>{CARD_RARITIES[card.rarity]}</span>}
              {card.level && (
                <span className="px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full font-bold">
                  {card.level}
                </span>
              )}
               {card.isAncient && <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded font-bold text-xs border border-amber-300">上古</span>}
               {card.isDragon && <span className="px-2 py-1 bg-red-100 text-red-800 rounded font-bold text-xs border border-red-300">龍族</span>}
               {card.isBeast && <span className="px-2 py-1 bg-stone-800 text-stone-100 rounded font-bold text-xs border border-stone-600">野獸</span>}
               {card.isSoulJam && <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded font-bold text-xs border border-pink-300">靈魂果醬</span>}
               {card.isForbidden && <span className="px-2 py-1 bg-red-600 text-white rounded font-bold text-xs flex items-center gap-1"><Ban size={12}/> 禁止卡</span>}
               {card.isLimitOne && <span className="px-2 py-1 bg-orange-500 text-white rounded font-bold text-xs flex items-center gap-1"><AlertOctagon size={12}/> Limit 1</span>}
            </div>
            <div className="text-2xl opacity-40 text-center mt-20">
              無圖片預覽
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ExportModal = ({ deck, deckName, onClose }) => {
  const [activeTab, setActiveTab] = useState("image");
  const exportRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    if (!window.html2canvas) {
      const script = document.createElement("script");
      script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const generateLongUrl = () => {
    const mainIds = deck.main.map((c) => c.id);
    const extraIds = deck.extra.map((c) => c.id);
    const data = JSON.stringify({ m: mainIds, e: extraIds, n: deckName });
    const encoded = btoa(encodeURIComponent(data));
    const baseUrl = window.location.href.split("?")[0];
    return `${baseUrl}?d=${encoded}`;
  };

  const handleGenerateShortLink = async () => {
    if (!db) {
        alert("無法連線至資料庫，請檢查網路");
        return;
    }
    setIsCreatingLink(true);
    try {
        const deckData = {
            m: deck.main.map(c => c.id),
            e: deck.extra.map(c => c.id),
            n: deckName,
            createdAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'shared_decks'), deckData);
        const baseUrl = window.location.href.split("?")[0];
        setShareUrl(`${baseUrl}?s=${docRef.id}`);
    } catch (error) {
        console.error("建立短網址失敗", error);
        alert("短網址建立失敗，將使用長網址替代");
        setShareUrl(generateLongUrl());
    } finally {
        setIsCreatingLink(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!window.html2canvas) {
      alert("組件載入中，請稍後再試...");
      return;
    }
    setIsGenerating(true);
    try {
      const canvas = await window.html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `${deckName || "deck"}-${new Date()
        .toISOString()
        .slice(0, 10)}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (err) {
      console.error(err);
      alert("圖片生成失敗，請重試");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    alert("連結已複製到剪貼簿！");
  };

  const handlePrint = () => {
    window.print();
  };

  const sortedMain = useMemo(() => {
    const groups = groupCards(deck.main);
    return groups.sort((a, b) => {
        const wA = getExportSortWeight(a);
        const wB = getExportSortWeight(b);
        if (wA !== wB) return wA - wB;
        return a.id.localeCompare(b.id);
    });
  }, [deck.main]);

  const sortedExtra = useMemo(() => groupCards(deck.extra), [deck.extra]);
  
  const flipCount = deck.main.filter(c => c.isFlip).length;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 print:p-0 print:bg-white print:static"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col print:shadow-none print:w-full print:max-h-none print:h-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start md:items-center p-4 border-b print:hidden">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Share2 className="text-blue-600" /> 輸出與分享
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-full"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex border-b print:hidden">
          <button
            onClick={() => setActiveTab("image")}
            className={`flex-1 py-3 font-bold text-sm ${
              activeTab === "image"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            圖片輸出
          </button>
          <button
            onClick={() => setActiveTab("link")}
            className={`flex-1 py-3 font-bold text-sm ${
              activeTab === "link"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            連結分享
          </button>
          {/* --- 功能 3: 牌組清單分頁 --- */}
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-3 font-bold text-sm ${
              activeTab === "list"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            列印牌組清單
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 print:bg-white print:p-0 print:overflow-visible">
          {activeTab === "image" && (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded shadow w-full flex flex-col md:flex-row justify-between items-center gap-4">
                <span className="text-slate-600 text-sm">
                  將牌組匯出為高解析度 PNG 圖片 (包含完整卡片縮圖)
                </span>
                <button
                  onClick={handleDownloadImage}
                  disabled={isGenerating}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 shrink-0"
                >
                  {isGenerating ? "生成中..." : <><Download size={18} /> 下載圖片</>}
                </button>
              </div>

              <div
                ref={exportRef}
                className="bg-white p-8 rounded-lg shadow-lg w-full max-w-[1000px] border border-slate-200"
              >
                <div className="flex flex-col items-center border-b-2 border-slate-800 pb-6 mb-6">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 uppercase text-center tracking-tight mb-3">
                      {deckName || "My Deck"}
                    </h1>
                    <div className="flex gap-6 text-sm font-bold text-slate-500 uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                            <Layers size={16} /> Total: {deck.main.length}
                        </span>
                        <span className="flex items-center gap-1">
                            <RotateCw size={16} /> Flip: {flipCount}
                        </span>
                        {deck.extra.length > 0 && (
                            <span className="flex items-center gap-1 text-purple-600">
                                <Zap size={16} /> Extra: {deck.extra.length}
                            </span>
                        )}
                    </div>
                </div>

                <div className="mb-4">
                  <div className="grid grid-cols-6 md:grid-cols-8 gap-1">
                    {sortedMain.map((group) => (
                      <div
                        key={group.id}
                        className="relative aspect-[3/4] rounded overflow-hidden border border-slate-200 shadow-sm bg-slate-50 group"
                      >
                        {group.imageUrl ? (
                          <img
                            src={group.imageUrl}
                            alt={group.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-full h-full flex flex-col p-1 text-[8px] ${getCardColorStyles(
                              group.color
                            )}`}
                          >
                            <span className="font-bold leading-tight line-clamp-2">
                              {group.name}
                            </span>
                            <span className="mt-0.5 font-mono opacity-70 font-bold scale-90 origin-left">
                              {group.id}
                            </span>
                          </div>
                        )}
                        <div className="absolute bottom-0.5 right-0.5 bg-black text-white text-[9px] font-bold w-5 h-4 rounded shadow-md border border-white/20 z-10 flex items-center justify-center opacity-90 leading-none">
                          x{group.stackCount}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {sortedExtra.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <h3 className="font-bold text-purple-900 text-sm uppercase mb-3 flex items-center gap-2">
                        <Zap size={16} /> Extra Deck
                    </h3>
                    <div className="grid grid-cols-6 md:grid-cols-8 gap-1">
                      {sortedExtra.map((group) => (
                        <div
                          key={group.id}
                          className="relative aspect-[3/4] rounded overflow-hidden border border-slate-200 shadow-sm bg-slate-50 group"
                        >
                          {group.imageUrl ? (
                            <img
                              src={group.imageUrl}
                              alt={group.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className={`w-full h-full flex flex-col p-1 text-[8px] ${getCardColorStyles(
                                group.color
                              )}`}
                            >
                              <span className="font-bold leading-tight line-clamp-2">
                                {group.name}
                              </span>
                              <span className="mt-0.5 font-mono opacity-70 font-bold scale-90 origin-left">
                                {group.id}
                              </span>
                            </div>
                          )}
                          <div className="absolute bottom-0.5 right-0.5 bg-black text-white text-[9px] font-bold w-5 h-4 rounded shadow-md border border-white/20 z-10 flex items-center justify-center opacity-90 leading-none">
                            x{group.stackCount}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-8 pt-4 border-t-2 border-slate-100 flex justify-end items-center">
                    <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            CREATED WITH
                        </div>
                        <div className="text-lg font-black text-slate-300">
                            Braverse Deck Builder
                        </div>
                    </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === "link" && (
            <div className="flex flex-col gap-6 max-w-lg mx-auto mt-8">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-3 items-start">
                <AlertTriangle
                  className="text-blue-600 shrink-0 mt-0.5"
                  size={20}
                />
                <div className="text-sm text-blue-800">
                  <p className="font-bold mb-1">關於分享連結</p>
                  <p>
                    產生短連結會將您的牌組資訊儲存至雲端，讓網址更簡短美觀，方便在社群媒體分享！
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  牌組分享連結
                </label>
                <div className="flex gap-2">
                  {shareUrl ? (
                    <>
                        <input
                            type="text"
                            readOnly
                            value={shareUrl}
                            className="flex-1 border rounded-lg px-3 py-2 text-slate-600 bg-white select-all font-mono text-sm"
                        />
                        <button
                            onClick={handleCopyLink}
                            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                        >
                            <Copy size={18} /> 複製
                        </button>
                    </>
                  ) : (
                    <button
                        onClick={handleGenerateShortLink}
                        disabled={isCreatingLink}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isCreatingLink ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                產生中...
                            </>
                        ) : (
                            <>
                                <LinkIcon size={18} /> 產生短連結
                            </>
                        )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          {activeTab === "list" && (
            <div className="p-4 print:p-0">
                <div className="print:hidden bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6 flex justify-between items-center">
                    <div className="text-yellow-800 text-sm">
                        <p className="font-bold">比賽用牌組清單</p>
                        <p>此頁面設計為 A4 列印格式，可直接列印繳交。請使用瀏覽器列印功能。</p>
                    </div>
                    <button 
                        onClick={handlePrint}
                        className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-700"
                    >
                        <Printer size={18} /> 列印此清單
                    </button>
                </div>

                <div className="bg-white p-8 max-w-[210mm] mx-auto border border-slate-200 print:border-none print:p-0">
                    <h1 className="text-2xl font-bold text-center mb-6 uppercase border-b-2 border-black pb-2">
                        Deck List Registration Sheet
                    </h1>
                    
                    <div className="flex justify-between mb-6 text-sm">
                        <div><strong>Player Name:</strong> ________________________</div>
                        <div><strong>Date:</strong> ________________________</div>
                    </div>
                    <div className="mb-6 text-sm">
                        <strong>Deck Name:</strong> {deckName}
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-bold border-b border-black mb-2 flex justify-between">
                                Main Deck Cards <span>Total: {deck.main.length}</span>
                            </h3>
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-300 text-left">
                                        <th className="py-1 w-12">Count</th>
                                        <th className="py-1 w-20">ID</th>
                                        <th className="py-1">Card Name</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedMain.map(card => (
                                        <tr key={card.id} className="border-b border-slate-100">
                                            <td className="py-1 text-center font-bold">{card.stackCount}</td>
                                            <td className="py-1 font-mono text-xs">{card.id}</td>
                                            <td className="py-1">{card.name}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div>
                            {sortedExtra.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="font-bold border-b border-black mb-2 flex justify-between">
                                        Extra Deck Cards <span>Total: {deck.extra.length}</span>
                                    </h3>
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-300 text-left">
                                                <th className="py-1 w-12">Count</th>
                                                <th className="py-1 w-20">ID</th>
                                                <th className="py-1">Card Name</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedExtra.map(card => (
                                                <tr key={card.id} className="border-b border-slate-100">
                                                    <td className="py-1 text-center font-bold">{card.stackCount}</td>
                                                    <td className="py-1 font-mono text-xs">{card.id}</td>
                                                    <td className="py-1">{card.name}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            
                            <div className="border-2 border-slate-300 p-4 rounded h-40 text-slate-400 text-sm flex items-center justify-center">
                                (Judge Use Only)
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
}
