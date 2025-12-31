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
  Dices, // 新增：骰子圖示 (用於抽牌測試)
  PackageOpen, // 新增：開包裹圖示 (用於卡包模擬)
  Printer, // 新增：印表機圖示
  Repeat, // 新增：重複圖示
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

const INITIAL_CARDS = [
  {
    id: "BS1-001",
    series: "BS1",
    number: "001",
    name: "勇氣餅乾",
    type: CARD_TYPES.COOKIE,
    color: CARD_COLORS.RED,
    level: CARD_LEVELS.LV1,
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

  // 洗牌並抽 6 張
  const drawCards = useCallback(() => {
    if (deck.main.length === 0) {
        alert("主牌組沒有卡片！");
        return;
    }
    const shuffled = fisherYatesShuffle(deck.main);
    setHand(shuffled.slice(0, 6));
  }, [deck.main]);

  useEffect(() => {
    drawCards();
  }, [drawCards]);

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
            <div key={`${card.id}-${index}`} className="aspect-[3/4] rounded-lg overflow-hidden border border-slate-300 shadow-md bg-white relative animate-in fade-in zoom-in duration-300" style={{ animationDelay: `${index * 100}ms` }}>
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
            模擬真實洗牌 (Fisher-Yates) 後抽取前 6 張卡片
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

  const openPack = () => {
    let pool = allCards;
    if (selectedSeries !== "ALL") {
      pool = allCards.filter(c => c.series === selectedSeries);
    }

    if (pool.length < 5) {
      alert("該系列卡池卡片不足 5 張，無法開包！");
      return;
    }

    // 隨機抽 5 張 (簡單隨機，不考慮稀有度配率)
    const shuffled = fisherYatesShuffle(pool);
    setOpenedCards(shuffled.slice(0, 5));
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
                        <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-blue-900 to-slate-900 rounded-lg border-2 border-slate-600 flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
                            <Cookie size={48} className="text-white/20 animate-pulse" />
                        </div>
                        {/* 正面 (Face Up) */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-lg overflow-hidden border-2 border-white/20 shadow-2xl">
                            {card.imageUrl ? (
                                <img src={card.imageUrl} className="w-full h-full object-cover" alt={card.name} />
                            ) : (
                                <div className={`w-full h-full p-2 flex flex-col justify-between ${getCardColorStyles(card.color)} bg-white`}>
                                    <span className="font-bold text-sm">{card.name}</span>
                                    <span className="font-mono text-xs">{card.id}</span>
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
              支援欄位：id, series, number, name, type, color, level, isFlip, isExtra, 
              isAncient, isDragon, isBeast, isSoulJam, isForbidden, isLimitOne。
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
};

const AddCardModal = ({ onClose, onAdd, isProcessing, initialData }) => {
  const [formData, setFormData] = useState({
    series: "BS1",
    number: "",
    name: "",
    color: CARD_COLORS.RED,
    type: CARD_TYPES.COOKIE,
    level: CARD_LEVELS.LV1,
    isFlip: false,
    isExtra: false,
    isAncient: false,
    isDragon: false,
    isBeast: false,
    isSoulJam: false,
    isForbidden: false,
    isLimitOne: false,
    imageUrl: "",
  });

  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (initialData) {
      let derivedSeries = "BS1";
      let derivedNumber = "";

      if (initialData.id && initialData.id.includes("-")) {
        const parts = initialData.id.split("-");
        derivedSeries = parts[0] || "BS1";
        derivedNumber = parts[1] || "";
      } else {
        derivedNumber = initialData.id || "";
      }

      setFormData((prev) => ({
        ...prev,
        ...initialData,
        series: derivedSeries,
        number: derivedNumber,
      }));

      if (initialData.imageUrl) {
        setPreviewUrl(initialData.imageUrl);
      }
    }
  }, [initialData]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("圖片過大！請使用 1MB 以下的圖片，系統將嘗試自動壓縮。");
      }
      try {
        const compressedBase64 = await compressImage(file);
        setPreviewUrl(compressedBase64);
        setFormData({ ...formData, imageUrl: compressedBase64 });
      } catch (err) {
        console.error("圖片處理失敗", err);
        alert("圖片處理失敗，請換一張試試");
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert("請填寫卡片名稱");
      return;
    }
    if (formData.imageUrl && formData.imageUrl.length > 1048400) {
      alert("圖片壓縮後依然過大！請更換一張解析度較低的圖片。");
      return;
    }

    let fullId;
    if (initialData && initialData.id) {
      fullId = initialData.id;
    } else {
      if (!formData.number) {
        alert("請填寫編號");
        return;
      }
      fullId = `${formData.series}-${formData.number}`;
    }

    const submitData = {
      ...formData,
      id: fullId,
      level: formData.type === CARD_TYPES.COOKIE ? formData.level : null,
    };

    onAdd(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {initialData ? (
              <>
                <Pencil className="text-blue-600" /> 編輯卡片
              </>
            ) : (
              <>
                <Plus className="text-blue-600" /> 新增自定義卡片
              </>
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-full"
          >
            <X size={24} />
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="space-y-4">
            <div
              className={`bg-slate-50 p-3 rounded border ${
                initialData ? "opacity-70 pointer-events-none" : ""
              }`}
            >
              <label className="block text-sm font-bold text-slate-700 mb-2">
                卡片編號 (ID){" "}
                {initialData && (
                  <span className="text-xs text-red-500 font-normal ml-2">
                    編輯模式下無法修改
                  </span>
                )}
              </label>
              <div className="flex gap-2 items-center">
                <select
                  className="border rounded p-2 bg-white flex-1"
                  value={formData.series}
                  onChange={(e) =>
                    setFormData({ ...formData, series: e.target.value })
                  }
                >
                  {CARD_SERIES_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <span className="font-bold text-slate-400">-</span>
                <input
                  type="text"
                  placeholder="001"
                  required={!initialData}
                  className="border rounded p-2 flex-1"
                  value={formData.number}
                  onChange={(e) =>
                    setFormData({ ...formData, number: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                卡片名稱
              </label>
              <input
                type="text"
                required
                className="w-full border rounded p-2"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  種類
                </label>
                <select
                  className="w-full border rounded p-2"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                >
                  {Object.values(CARD_TYPES).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  顏色
                </label>
                <select
                  className="w-full border rounded p-2"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                >
                  {Object.values(CARD_COLORS).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formData.type === CARD_TYPES.COOKIE && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  等級 (Level)
                </label>
                <select
                  className="w-full border rounded p-2"
                  value={formData.level}
                  onChange={(e) =>
                    setFormData({ ...formData, level: e.target.value })
                  }
                >
                  {Object.values(CARD_LEVELS).map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-lg border">
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5" checked={formData.isFlip} onChange={(e) => setFormData({ ...formData, isFlip: e.target.checked })} />
                    <span>FLIP</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5" checked={formData.isExtra} onChange={(e) => setFormData({ ...formData, isExtra: e.target.checked })} />
                    <span>Extra Deck</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5" checked={formData.isAncient} onChange={(e) => setFormData({ ...formData, isAncient: e.target.checked })} />
                    <span>上古餅乾</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5" checked={formData.isDragon} onChange={(e) => setFormData({ ...formData, isDragon: e.target.checked })} />
                    <span>龍族</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5" checked={formData.isBeast} onChange={(e) => setFormData({ ...formData, isBeast: e.target.checked })} />
                    <span>野獸餅乾</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5" checked={formData.isSoulJam} onChange={(e) => setFormData({ ...formData, isSoulJam: e.target.checked })} />
                    <span>靈魂果醬</span>
                  </label>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-y-3 gap-x-4">
                    <label className="flex items-center gap-2 cursor-pointer text-red-600 font-bold">
                        <input type="checkbox" className="w-5 h-5 accent-red-600" checked={formData.isForbidden} onChange={(e) => setFormData({ ...formData, isForbidden: e.target.checked })} />
                        <span>🚫 禁止卡</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-orange-600 font-bold">
                        <input type="checkbox" className="w-5 h-5 accent-orange-600" checked={formData.isLimitOne} onChange={(e) => setFormData({ ...formData, isLimitOne: e.target.checked })} />
                        <span>⚠️ 限制卡 (Limit 1)</span>
                    </label>
                </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                圖片{" "}
                {initialData && (
                  <span className="text-xs text-gray-500">
                    (不更換則維持原圖)
                  </span>
                )}
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 relative h-64 flex items-center justify-center bg-slate-100">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-slate-400 flex flex-col items-center">
                    <ImageIcon size={48} />
                    <span className="text-sm mt-2">上傳圖片</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold disabled:opacity-50"
            >
              {isProcessing
                ? "處理中..."
                : initialData
                ? "更新卡片資訊"
                : "確認上傳並同步"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 使用 React.memo 優化卡片組件，減少列表重繪
const CardItem = React.memo(({
  card,
  onClick,
  onView,
  onEdit,
  onDelete,
  count = 0,
  compact = false,
}) => {
  const colorClass = getCardColorStyles(card.color);
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);

  const handleTouchStart = () => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (navigator.vibrate) navigator.vibrate(50);
      onView(card);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = (e) => {
    if (isLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick(card);
  };

  return (
    <div
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      className={`relative cursor-pointer transition-all duration-200 border-2 rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] select-none overflow-hidden group ${colorClass} ${
        compact
          ? "p-2 flex items-center justify-between text-sm min-h-[3.5rem]"
          : "p-3 flex flex-col gap-1"
      }`}
    >
      {card.imageUrl && !compact && (
        <div className="absolute inset-0 opacity-30 pointer-events-none group-hover:opacity-40 transition-opacity">
          <img
            src={card.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {!compact && card.isForbidden && (
        <div className="absolute inset-0 bg-red-900/10 pointer-events-none z-0"></div>
      )}

      <div
        className={`relative z-10 w-full ${
          compact ? "flex items-center gap-3" : ""
        }`}
      >
        {compact && card.imageUrl && (
          <div className="shrink-0 w-8 h-11 rounded border border-slate-300 overflow-hidden bg-white">
            <img
              src={card.imageUrl}
              className="w-full h-full object-cover"
              alt=""
              loading="lazy"
            />
          </div>
        )}

        <div className={`flex-1 ${compact ? "" : ""}`}>
          <div
            className={`flex justify-between items-start ${
              compact ? "flex-col-reverse justify-center" : "mb-1"
            }`}
          >
            <h3
              className={`font-bold ${
                compact
                  ? `truncate w-full text-slate-700 text-xs ${card.isForbidden || card.isLimitOne ? 'text-red-700' : ''}`
                  : "text-lg md:text-xl line-clamp-1 leading-snug" // 放大字體
              }`}
            >
              {card.name}
            </h3>

            <div
              className={`flex items-center gap-1 ${
                compact ? "w-full mb-0.5" : ""
              }`}
            >
              {!compact && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(card);
                  }}
                  className="p-1 text-current opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-white/50 rounded-full transition-all"
                  title="檢視詳細大圖"
                >
                  <Eye size={16} />
                </button>
              )}

              {!compact && (
                <span className="text-xs md:text-xl font-mono font-black bg-white/80 px-2 rounded border border-current/20 whitespace-nowrap ml-1 shadow-sm">
                  {card.id}
                </span>
              )}
              {compact && (
                <span className="font-mono font-black text-black text-sm bg-white/50 px-1 rounded -ml-0.5">
                  {card.id}
                </span>
              )}
            </div>
          </div>

          {!compact && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs md:text-sm opacity-90 font-semibold">
              <span className="text-[10px] md:text-xs font-bold border border-current px-1 rounded opacity-80 uppercase bg-white/30">
                {card.color}
              </span>
              <span className="bg-white/50 px-2 py-0.5 rounded text-current border border-current/20">
                {card.type}
              </span>
              {card.level && (
                <span className="text-[10px] md:text-xs font-bold bg-yellow-400 text-yellow-900 px-1 rounded shadow-sm">
                  {card.level}
                </span>
              )}
              {card.isFlip && (
                <span className="flex items-center gap-0.5 text-[10px] md:text-xs bg-slate-800 text-white px-1.5 rounded font-bold tracking-wider">
                  FLIP
                </span>
              )}
              {card.isExtra && (
                <span className="text-[10px] md:text-xs uppercase tracking-wider bg-purple-200 text-purple-900 px-1 rounded border border-purple-300">
                  EXTRA
                </span>
              )}
              {card.isAncient && <span className="text-[10px] md:text-xs font-bold bg-amber-100 text-amber-800 px-1 rounded border border-amber-300">上古</span>}
              {card.isDragon && <span className="text-[10px] md:text-xs font-bold bg-red-100 text-red-800 px-1 rounded border border-red-300">龍族</span>}
              {card.isBeast && <span className="text-[10px] md:text-xs font-bold bg-stone-800 text-stone-100 px-1 rounded border border-stone-600">野獸</span>}
              {card.isSoulJam && <span className="text-[10px] md:text-xs font-bold bg-pink-100 text-pink-800 px-1 rounded border border-pink-300">靈魂果醬</span>}
              
              {card.isForbidden && <span className="flex items-center gap-0.5 text-[10px] bg-red-600 text-white px-1.5 rounded font-bold"><Ban size={10}/> 禁止</span>}
              {card.isLimitOne && <span className="flex items-center gap-0.5 text-[10px] bg-orange-500 text-white px-1.5 rounded font-bold"><AlertOctagon size={10}/> Limit 1</span>}
            </div>
          )}
        </div>
      </div>

      {!compact && onEdit && onDelete && (
        <div className="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(card);
            }}
            className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 shadow-sm"
            title="編輯卡片"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(card);
            }}
            className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 shadow-sm"
            title="刪除卡片"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {count > 0 && (
        <div className="absolute -top-2 -right-2 bg-slate-800 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white z-10">
          {count}
        </div>
      )}
    </div>
  );
});

const StatBadge = ({
  icon: Icon,
  label,
  current,
  max,
  color = "blue",
  warningAtFull = true,
}) => {
  const isFull = current >= max;
  const colorStyle =
    isFull && warningAtFull
      ? "bg-red-50 text-red-600 border-red-200"
      : `bg-${color}-50 text-${color}-700 border-${color}-200`;
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${colorStyle}`}
    >
      <Icon size={16} />
      <span>{label}:</span>
      <span className={isFull ? "font-bold" : ""}>
        {current} / {max}
      </span>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingError, setLoadingError] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [deck, setDeck] = useState({ main: [], extra: [] });
  // Deck Name State
  const [deckName, setDeckName] = useState("我的餅乾牌組");
  const [filters, setFilters] = useState({
    search: "",
    type: "ALL",
    color: "ALL",
    level: "ALL",
    series: "ALL",
    showExtra: false, 
    showFlip: false, 
    showAncient: false,
    showDragon: false,
    showBeast: false,
    showSoulJam: false,
  });
  const [toastMsg, setToastMsg] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false); 
  const [showDrawTestModal, setShowDrawTestModal] = useState(false); // 新增
  const [showPackOpenerModal, setShowPackOpenerModal] = useState(false); // 新增
  
  const [viewingCard, setViewingCard] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false); 
  
  const [isMobileDeckOpen, setIsMobileDeckOpen] = useState(false);
   
  const [isOffline, setIsOffline] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const loadMoreRef = useRef(null);

  const LIMITS = { MAIN: 60, EXTRA: 6, COPY: 4, FLIP: 16 };

  const closeToast = useCallback(() => {
    setToastMsg(null);
  }, []);

  // --- SEO & Metadata ---
  useEffect(() => {
    document.title = "Cookierun: Braverse Deck Builder | 薑餅人對戰卡牌組構建器";
    const setFavicon = () => {
      const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/svg+xml';
      link.rel = 'icon';
      link.href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍪</text></svg>`;
      document.getElementsByTagName('head')[0].appendChild(link);
    };
    setFavicon();
    const setMeta = (name, content) => {
      let element = document.querySelector(`meta[name='${name}']`);
      if (!element) {
        element = document.createElement('meta');
        element.name = name;
        document.head.appendChild(element);
      }
      element.content = content;
    };
    const setOgMeta = (property, content) => {
      let element = document.querySelector(`meta[property='${property}']`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('property', property);
        document.head.appendChild(element);
      }
      element.content = content;
    };
    setMeta('description', '專為薑餅人對戰卡牌 (Cookierun: Braverse) 打造的牌組構建器。提供卡片搜尋、牌組組建、圖片輸出與短網址分享功能。');
    setOgMeta('og:title', 'Cookierun: Braverse Deck Builder');
    setOgMeta('og:description', '快速組建你的薑餅人對戰卡牌牌組！支援圖片輸出與雲端分享。');
    setOgMeta('og:image', 'https://cookie-run-braverse-deck-builder.vercel.app/og-image.png');
    setOgMeta('og:type', 'website');
  }, []);

  useEffect(() => {
    if (!document.querySelector('script[src="https://cdn.tailwindcss.com"]')) {
      const script = document.createElement("script");
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (isOffline) return;
    if (!auth) {
      setLoadingError("Firebase 設定錯誤");
      return;
    }
    const timeoutId = setTimeout(() => {
      if (!user && !isOffline) setLoadingError("連線逾時，請檢查瀏覽器設定");
    }, 10000);
    const initAuth = async () => {};
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        clearTimeout(timeoutId);
        setLoadingError(null);
        if (!u.isAnonymous) {
            setIsAdmin(true);
            setToastMsg(`歡迎管理員：${u.email}`);
        } else {
            setIsAdmin(false);
        }
      } else {
        signInAnonymously(auth).catch(err => setLoadingError(`登入失敗: ${err.message}`));
      }
    });
    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [isOffline]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cookieadmin") === "true" && !isAdmin) {
      // setIsAdmin(true); 
    }
  }, [isAdmin]);

  const handleAdminLogin = async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
  };

  const handleLogout = async () => {
      if (confirm("確定要登出管理員模式嗎？")) {
          await signOut(auth);
          setToastMsg("已登出管理員模式");
      }
  };

  useEffect(() => {
    if (isOffline) {
        if (allCards.length === 0) {
            setAllCards(INITIAL_CARDS);
            setIsDataLoaded(true);
            setToastMsg("已載入離線模擬資料");
        }
        return;
    }
    if (!user || !db) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'cards'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cards = snapshot.docs.map(doc => doc.data());
      cards.sort((a, b) => a.id.localeCompare(b.id));
      setAllCards(cards);
      setIsDataLoaded(true); 
    }, (error) => { console.error("Firestore sync error:", error); setToastMsg("連線資料庫失敗，請檢查網路"); });
    return () => unsubscribe();
  }, [user, isOffline]);

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
    return deck.main.filter(
      (c) => c.type === CARD_TYPES.COOKIE && c.isFlip === false
    ).length;
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
    if (card.isForbidden) {
        setToastMsg("❌ 加入了禁止卡 (正式比賽無法使用)");
    }
    const currentCount = deck.main.filter(c => c.id === card.id).length + deck.extra.filter(c => c.id === card.id).length;
    if (card.isLimitOne && currentCount >= 1) {
        setToastMsg("⚠️ 加入了第二張限制卡 (正式比賽無法使用)");
    }
    const isExtra = isExtraDeckCard(card);
    const targetDeckKey = isExtra ? "extra" : "main";
    const limit = isExtra ? LIMITS.EXTRA : LIMITS.MAIN;
    const current = deck[targetDeckKey];
    const flipCountCurrent = deck.main.filter(c => c.isFlip).length;
    if (isExtra && current.length >= limit) {
      setToastMsg(`額外牌組已滿 (${LIMITS.EXTRA}張)`);
      return;
    }
    if (currentCount >= LIMITS.COPY) {
      setToastMsg(`同名卡片最多 ${LIMITS.COPY} 張`);
      return;
    }
    if (card.isFlip && !isExtra && flipCountCurrent >= LIMITS.FLIP) {
      setToastMsg(`Flip 卡片上限 ${LIMITS.FLIP} 張`);
      return;
    }
    setDeck((prev) => ({
      ...prev,
      [targetDeckKey]: [...prev[targetDeckKey], card].sort((a, b) =>
        a.id.localeCompare(b.id)
      ),
    }));
  }, [deck]);

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
      if (window.confirm("主牌組張數已超過 60 張上限，確定要繼續分享/輸出嗎？")) {
        setShowExportModal(true);
      }
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
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "cards", cardData.id),
        cardData
      );
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
            cardsData.forEach(c => cardMap.set(c.id, c));
            return Array.from(cardMap.values()).sort((a, b) => a.id.localeCompare(b.id));
        });
        setShowBulkModal(false);
        setToastMsg(`離線模式：已匯入 ${cardsData.length} 張卡片`);
        return;
    }
    if (!user || !db) return;
    setIsProcessing(true);
    const batch = writeBatch(db);
    let count = 0;
    try {
      cardsData.forEach((card) => {
        if (!card.id || !card.name) return; 
        const ref = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "cards",
          card.id
        );
        batch.set(ref, card);
        count++;
      });
      await batch.commit();
      setToastMsg(`成功匯入 ${count} 張卡片！`);
      setShowBulkModal(false);
    } catch (err) {
      console.error(err);
      setToastMsg("匯入失敗，請檢查 JSON 格式或網路");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCard = async (card) => {
    if (!confirm(`確定要永久刪除「${card.name}」嗎？此動作無法復原。`)) return;
    try {
      await deleteDoc(
        doc(db, "artifacts", appId, "public", "data", "cards", card.id)
      );
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

  const initializeDatabase = async () => {
    if (isOffline) {
        setAllCards(INITIAL_CARDS);
        setToastMsg("離線模式：已重置為預設資料");
        return;
    }
    if (!user || !db || !confirm("確定匯入預設資料？")) return;
    setIsProcessing(true);
    const batch = writeBatch(db);
    try {
      INITIAL_CARDS.forEach((card) =>
        batch.set(
          doc(db, "artifacts", appId, "public", "data", "cards", card.id),
          card
        )
      );
      await batch.commit();
      setToastMsg("匯入成功");
    } catch (err) {
      console.error(err);
      setToastMsg("匯入失敗");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredCards = useMemo(
    () =>
      allCards.filter((card) => {
        const search = filters.search.toLowerCase();
        const matchSearch =
          card.name.toLowerCase().includes(search) ||
          card.id.toLowerCase().includes(search);
        const matchType = filters.type === "ALL" || card.type === filters.type;
        const matchColor =
          filters.color === "ALL" || card.color === filters.color;
        
        const matchSeries =
          filters.series === "ALL"
            ? true
            : filters.series === "ST"
            ? card.series.startsWith("ST")
            : card.series === filters.series;

        const matchLevel =
          filters.level === "ALL" || card.level === filters.level;

        const matchExtra = filters.showExtra ? card.isExtra : true;
        const matchFlip = filters.showFlip ? card.isFlip : true;
        const matchAncient = filters.showAncient ? card.isAncient : true;
        const matchDragon = filters.showDragon ? card.isDragon : true;
        const matchBeast = filters.showBeast ? card.isBeast : true;
        const matchSoulJam = filters.showSoulJam ? card.isSoulJam : true;

        return (
          matchSearch &&
          matchType &&
          matchColor &&
          matchSeries &&
          matchLevel &&
          matchExtra &&
          matchFlip &&
          matchAncient &&
          matchDragon &&
          matchBeast &&
          matchSoulJam
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

  const groupedMainDeck = useMemo(() => groupCards(deck.main), [deck.main]);
  const groupedExtraDeck = useMemo(() => groupCards(deck.extra), [deck.extra]);
  const flipCount = getFlipCount();

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
    <div className="flex fixed inset-0 flex-col md:flex-row bg-slate-50 overflow-hidden font-sans text-slate-900 overscroll-contain h-[100dvh]">
      {viewingCard && (
        <CardDetailModal
          card={viewingCard}
          onClose={() => setViewingCard(null)}
        />
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

      {showExportModal && <ExportModal deck={deck} allCards={allCards} onClose={() => setShowExportModal(false)} deckName={deckName} />}

      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)} 
          onLogin={handleAdminLogin} 
        />
      )}

      {showDrawTestModal && <DrawTestModal deck={deck} onClose={() => setShowDrawTestModal(false)} />}
      
      {showPackOpenerModal && <PackOpenerModal allCards={allCards} onClose={() => setShowPackOpenerModal(false)} />}

      {/* 左側：卡片清單 (手機上為滿版，桌面版在左側) */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 min-h-0">
        {/* Header 區域 */}
        <div className="p-3 md:p-4 bg-white border-b border-slate-200 shadow-sm z-10 space-y-2 md:space-y-3 shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
                <h1 className="text-lg md:text-2xl font-black flex items-center gap-2 text-slate-800">
                    <Cloud className={isOffline ? "text-slate-400" : "text-blue-600"} size={24} />
                    Cookierun: Braverse Deck Builder
                </h1>
                <p className="text-xs md:text-sm text-slate-500 font-bold ml-1 mt-1">
                    先行測試版本，有Bug請私訊樂多綠YT或粉絲專頁
                </p>
            </div>
            
            <div className="flex gap-2">
              {isAdmin ? (
                <>
                  <button onClick={() => { setEditingCard(null); setShowAddModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 shadow transition-colors"><Plus size={16} /> <span className="hidden md:inline">新增</span></button>
                  <button onClick={() => setShowBulkModal(true)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 shadow transition-colors"><FileJson size={16} /> <span className="hidden md:inline">匯入</span></button>
                </>
              ) : (
                <div className="flex items-center gap-1 text-slate-400 text-xs bg-slate-100 px-2 py-1 rounded"><Lock size={12} /> 僅供瀏覽</div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="搜尋名稱或編號..." className="w-full pl-10 pr-4 py-1.5 md:py-2 bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} />
            </div>
            {/* 篩選器 */}
            <div className="flex gap-2">
              <div className="relative flex-1"><Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><select className="w-full pl-10 pr-4 py-1.5 md:py-2 bg-slate-100 border-none rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})}>{['ALL', ...Object.values(CARD_TYPES)].map(t => <option key={t} value={t}>{t === 'ALL' ? '全部種類' : t}</option>)}</select></div>
              <div className="relative flex-1"><Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><select className="w-full pl-10 pr-4 py-1.5 md:py-2 bg-slate-100 border-none rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" value={filters.color} onChange={(e) => setFilters({...filters, color: e.target.value})}>{['ALL', ...Object.values(CARD_COLORS)].map(c => <option key={c} value={c}>{c === 'ALL' ? '全部顏色' : c}</option>)}</select></div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1"><Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><select className="w-full pl-10 pr-4 py-1.5 md:py-2 bg-slate-100 border-none rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" value={filters.series} onChange={(e) => setFilters({...filters, series: e.target.value})}>
                  <option value="ALL">全部系列</option>
                  {CARD_SERIES_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select></div>
              <div className="relative flex-1"><Star className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><select className="w-full pl-10 pr-4 py-1.5 md:py-2 bg-slate-100 border-none rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" value={filters.level} onChange={(e) => setFilters({...filters, level: e.target.value})}>
                  <option value="ALL">全部等級</option>
                  {Object.values(CARD_LEVELS).map((l) => (<option key={l} value={l}>{l}</option>))}
                </select></div>
            </div>
            {/* checkbox 篩選列 */}
            <div className="flex flex-wrap gap-3 mt-2 pl-1 select-none">
              <label className="flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95">
                <input type="checkbox" className="hidden peer" checked={filters.showExtra} onChange={(e) => setFilters({ ...filters, showExtra: e.target.checked })} />
                <span className="text-[10px] uppercase tracking-wider bg-purple-200 text-purple-900 px-2 py-1 rounded border border-purple-300 peer-checked:ring-2 peer-checked:ring-purple-500 opacity-60 peer-checked:opacity-100 font-bold">[EXTRA]</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95">
                <input type="checkbox" className="hidden peer" checked={filters.showFlip} onChange={(e) => setFilters({ ...filters, showFlip: e.target.checked })} />
                <span className="text-[10px] bg-slate-800 text-white px-2 py-1 rounded font-bold tracking-wider peer-checked:ring-2 peer-checked:ring-slate-500 opacity-60 peer-checked:opacity-100">[FLIP]</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95">
                <input type="checkbox" className="hidden peer" checked={filters.showAncient} onChange={(e) => setFilters({ ...filters, showAncient: e.target.checked })} />
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-1 rounded font-bold border border-amber-300 peer-checked:ring-2 peer-checked:ring-amber-500 opacity-60 peer-checked:opacity-100">上古</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95">
                <input type="checkbox" className="hidden peer" checked={filters.showDragon} onChange={(e) => setFilters({ ...filters, showDragon: e.target.checked })} />
                <span className="text-[10px] bg-red-100 text-red-800 px-2 py-1 rounded font-bold border border-red-300 peer-checked:ring-2 peer-checked:ring-red-500 opacity-60 peer-checked:opacity-100">龍族</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95">
                <input type="checkbox" className="hidden peer" checked={filters.showBeast} onChange={(e) => setFilters({ ...filters, showBeast: e.target.checked })} />
                <span className="text-[10px] bg-stone-800 text-stone-100 px-2 py-1 rounded font-bold border border-stone-600 peer-checked:ring-2 peer-checked:ring-stone-500 opacity-60 peer-checked:opacity-100">野獸</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95">
                <input type="checkbox" className="hidden peer" checked={filters.showSoulJam} onChange={(e) => setFilters({ ...filters, showSoulJam: e.target.checked })} />
                <span className="text-[10px] bg-pink-100 text-pink-800 px-2 py-1 rounded font-bold border border-pink-300 peer-checked:ring-2 peer-checked:ring-pink-500 opacity-60 peer-checked:opacity-100">靈魂果醬</span>
              </label>
            </div>
          </div>
        </div>
        
        {/* 卡片列表 */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {!isDataLoaded ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
               <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
               <p className="font-bold text-sm">正在從雲端載入卡片資料... (可能需要一些時間)</p>
            </div>
          ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 pb-20">
                {displayedCards.map(card => (
                  <CardItem 
                    key={card.id} 
                    card={card} 
                    onClick={addToDeck} 
                    onView={setViewingCard} 
                    count={getCardCount(card.id)}
                    onEdit={isAdmin ? openEditModal : null}
                    onDelete={isAdmin ? handleDeleteCard : null}
                  />
                ))}
                {/* Lazy Loading Sentinel */}
                <div ref={loadMoreRef} className="col-span-full h-10 flex items-center justify-center text-slate-400 text-sm">
                    {displayedCards.length < filteredCards.length ? "載入更多..." : "已顯示所有卡片"}
                </div>
              </div>
          )}
        </div>

        {/* Footer 區域 */}
        <div className="bg-white border-t border-slate-200 text-xs text-slate-500 p-2 md:p-3">
          {/* 手機版佈局 */}
          <div className="md:hidden flex flex-col gap-1.5">
              <div className="font-bold">製作者：樂多綠Gamecaster</div>
              <div className="flex items-center gap-4">
                  <a href="https://www.youtube.com/@%E6%A8%82%E5%A4%9A%E7%B6%A0" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-red-600 transition-colors font-bold">
                      <Youtube size={14} /> YouTube
                  </a>
                  <a href="https://www.facebook.com/midaylovesworld/" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-600 transition-colors font-bold">
                      <Facebook size={14} /> 樂多綠Facebook
                  </a>
              </div>
              <div className="flex items-center justify-between">
                  <a href="https://www.facebook.com/groups/CookieRunBraverseTW" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-600 transition-colors font-bold">
                      <ExternalLink size={14} /> 薑餅人對戰卡牌/台灣
                  </a>
                  {isAdmin ? (
                    <button onClick={handleLogout} className="p-1 text-slate-400 hover:text-red-500 transition-colors"><LogOut size={16}/></button>
                  ) : (
                    <button onClick={() => setShowLoginModal(true)} className="p-1 text-slate-300 hover:text-slate-500 transition-colors"><Lock size={16}/></button>
                  )}
              </div>
          </div>

          {/* 桌面版佈局 */}
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
                {isAdmin ? (
                  <button onClick={handleLogout} className="p-1 text-slate-400 hover:text-red-500 transition-colors" title="登出"><LogOut size={16}/></button>
                ) : (
                  <button onClick={() => setShowLoginModal(true)} className="p-1 text-slate-300 hover:text-slate-500 transition-colors" title="管理員登入"><Lock size={16}/></button>
                )}
              </div>
          </div>
        </div>
      </div>

      {/* 手機版：懸浮按鈕 (FAB) 開啟牌組清單 */}
      <button
        className="md:hidden fixed bottom-6 right-6 z-40 bg-blue-600 text-white p-4 rounded-full shadow-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 ring-2 ring-white"
        onClick={() => setIsMobileDeckOpen(true)}
      >
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

      {/* 右側：牌組清單 (桌面版固定，手機版為側邊抽屜) */}
      <div className={`
          bg-white shadow-2xl z-50 flex flex-col border-l border-slate-300
          md:relative md:w-80 lg:w-96 md:h-auto md:translate-x-0 md:flex md:shadow-none
          fixed inset-y-0 right-0 w-[85vw] max-w-sm transition-transform duration-300 ease-in-out
          ${isMobileDeckOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="p-4 bg-slate-800 text-white border-b border-slate-700 shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2 flex-1"><Box size={20} className="text-blue-400"/> 目前牌組</h2>
            <div className="flex gap-2">
              <button onClick={handleShareClick} className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded transition-colors" title="分享/輸出"><Share2 size={18} /></button>
              <button onClick={clearDeck} className="bg-red-600 hover:bg-red-500 text-white px-2 py-1.5 rounded transition-colors text-sm font-bold flex items-center gap-1">
                <Trash2 size={14} />
              </button>
              {/* 手機版關閉按鈕 */}
              <button onClick={() => setIsMobileDeckOpen(false)} className="md:hidden bg-slate-700 hover:bg-slate-600 text-white p-1.5 rounded transition-colors ml-2">
                <X size={18} />
              </button>
            </div>
          </div>
          {/* 牌組名稱輸入框 */}
          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            className="bg-transparent text-lg font-bold text-white border-b border-white/20 focus:border-white outline-none w-full placeholder-slate-400 mb-2"
            placeholder="命名你的牌組..."
          />
          <div className="flex flex-wrap gap-2">
            <StatBadge icon={Layers} label="主牌組" current={deck.main.length} max={LIMITS.MAIN} color="blue" warningAtFull={false} />
            <StatBadge icon={Zap} label="額外" current={deck.extra.length} max={LIMITS.EXTRA} color="purple" />
            <StatBadge icon={RotateCw} label="Flip" current={flipCount} max={LIMITS.FLIP} color="orange" />
          </div>
        </div>
        
        {/* 新增：管理員工具箱 (僅限管理員可見) */}
        {isAdmin && (
            <div className="p-2 bg-slate-700 border-b border-slate-600">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-2 flex items-center gap-1">
                    <UserCog size={12} /> 管理員工具箱
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => setShowDrawTestModal(true)}
                        className="bg-slate-600 hover:bg-blue-600 text-white py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-colors"
                    >
                        <Dices size={16} /> 起始手牌測試
                    </button>
                    <button 
                        onClick={() => setShowPackOpenerModal(true)}
                        className="bg-slate-600 hover:bg-yellow-600 text-white py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-colors"
                    >
                        <PackageOpen size={16} /> 開卡包模擬
                    </button>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-6 bg-slate-50 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <section>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 px-1 flex justify-between ${deck.main.length > 60 ? "text-red-600" : "text-slate-400"}`}>
                主牌組清單 <span>{deck.main.length} / {LIMITS.MAIN}</span>
            </h3>
            <div className={`space-y-2 min-h-[100px] ${deck.main.length > 60 ? "border-2 border-red-100 rounded-lg p-1 bg-red-50/30" : ""}`}>
              {groupedMainDeck.length === 0 ? <div className="h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 text-sm bg-slate-100"><Layers size={24} className="mb-1 opacity-50"/><span>點擊左側卡片加入</span></div> : 
               groupedMainDeck.map(group => <CardItem key={`main-group-${group.id}`} card={group} compact={true} count={group.stackCount} onClick={(c) => removeFromDeck(c, false)} onView={setViewingCard} />)}
            </div>
          </section>
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1 flex justify-between">額外牌組 <span>{deck.extra.length} / {LIMITS.EXTRA}</span></h3>
            <div className="space-y-2">
                 {groupedExtraDeck.length === 0 ? <div className="h-16 border-2 border-dashed border-purple-200 rounded-lg flex items-center justify-center text-purple-400 text-sm bg-purple-50"><span>加入額外牌組卡片</span></div> : 
                 groupedExtraDeck.map(group => <CardItem key={`extra-group-${group.id}`} card={group} compact={true} count={group.stackCount} onClick={(c) => removeFromDeck(c, true)} onView={setViewingCard} />)}
            </div>
          </section>
          <section className="bg-orange-50 p-3 rounded-lg border border-orange-200">
              <h4 className="flex items-center gap-2 text-orange-800 font-bold text-sm mb-1"><AlertTriangle size={14} /> 牌組檢查</h4>
              <div className="text-[11px] text-orange-800/70 font-mono mb-2 border-b border-orange-200 pb-2 leading-relaxed">
               ※相同編號卡最多4張<br/>
               ※FLIP卡最多16張
              </div>
              <ul className="text-xs text-orange-700 space-y-1 list-disc pl-4">
                {nonFlipCookieCount < 20 && <li>主牌組建議至少 20 張餅乾卡 (目前 {nonFlipCookieCount})<span className="text-[10px] opacity-75 ml-1">(不含 FLIP)</span></li>}
                {deck.main.length > LIMITS.MAIN && <li className="text-red-600 font-bold">主牌組已超過上限 ({deck.main.length}/60)</li>}
                {deck.extra.length === LIMITS.EXTRA && <li className="text-red-600 font-bold">額外牌組已達上限</li>}
                {flipCount === LIMITS.FLIP && <li className="text-red-600 font-bold">Flip 卡片已達上限 ({LIMITS.FLIP})</li>}
                {/* 新增的常駐警告 */}
                {(forbiddenCount > 0 || limitOneViolation) && (
                    <li className="text-red-600 font-bold flex items-start gap-1 -ml-1">
                        <Ban size={14} className="shrink-0 mt-0.5" />
                        <span>此牌組包含超過數量上限的禁止與限制卡，正式比賽將無法使用。</span>
                    </li>
                )}
                {nonFlipCookieCount >= 20 && deck.main.length <= LIMITS.MAIN && deck.extra.length < LIMITS.EXTRA && flipCount < LIMITS.FLIP && forbiddenCount === 0 && !limitOneViolation && <li className="text-emerald-600 list-none -ml-4 flex items-center gap-1 font-bold"><CheckCircle size={14}/> 牌組目前合規</li>}
              </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
