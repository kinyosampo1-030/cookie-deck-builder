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
  Languages,
  Globe, // 新增：地球圖示用於切換語言
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

// --- 翻譯字典 ---
const TRANSLATIONS = {
  zh: {
    appTitle: "Cookierun: Braverse Deck Builder",
    appSubtitle: "先行測試版本，有Bug請私訊樂多綠YT或粉絲專頁",
    searchPlaceholder: "搜尋名稱或編號...",
    types: {
      ALL: "全部種類",
      COOKIE: "餅乾卡",
      ITEM: "道具卡",
      TRAP: "陷阱卡",
      SCENE: "場景卡",
    },
    colors: {
      ALL: "全部顏色",
      RED: "紅色",
      YELLOW: "黃色",
      GREEN: "綠色",
      BLUE: "藍色",
      PURPLE: "紫色",
      COLORLESS: "無色",
    },
    series: "全部系列",
    levelRarity: {
      ALL: "全部等級/稀有度",
      LEVEL_LABEL: "等級 (Levels)",
      RARITY_LABEL: "稀有度 (Rarities)"
    },
    filters: {
      extra: "EXTRA",
      flip: "FLIP",
      ancient: "上古",
      dragon: "龍族",
      beast: "野獸",
      soulJam: "靈魂果醬",
    },
    rarities: {
      C: "C (Common)",
      R: "R (Rare)",
      SR: "SR (Super Rare)",
      UR: "UR (Ultra Rare)",
      EXR: "EXR (Extra Rare)",
    },
    stats: {
      main: "主牌組",
      extra: "額外",
      flip: "Flip",
    },
    deckCheck: {
      title: "牌組檢查",
      limit4: "※相同編號卡最多4張",
      limitFlip16: "※FLIP卡最多16張",
      minCookie20: "主牌組建議至少 20 張餅乾卡",
      maxMain60: "主牌組已超過上限",
      maxExtra: "額外牌組已達上限",
      maxFlip: "Flip 卡片已達上限",
      banned: "此牌組包含超過數量上限的禁止與限制卡，正式比賽將無法使用。",
      valid: "牌組目前合規",
      notIncludeFlip: "(不含 FLIP)"
    },
    actions: {
      add: "新增",
      import: "匯入",
      export: "輸出與分享",
      clear: "清空",
      login: "管理員登入",
      logout: "登出",
      adminTool: "管理員操作",
      testTool: "測試工具箱",
      firstDraw: "手牌測試",
      packOpener: "開卡包",
      loading: "正在從雲端載入卡片資料...",
      copy: "複製",
      generateShortLink: "產生短連結",
      downloadImage: "下載圖片",
      printList: "列印牌組清單",
      generating: "生成中...",
      opening: "開封中...",
      openPack: "開啟卡包",
      reShuffle: "重新洗牌並抽牌",
    },
    modal: {
      editCard: "編輯卡片",
      addCard: "新增自定義卡片",
      cardNameZh: "卡片名稱 (中文)",
      cardNameEn: "Card Name (English)",
      cardId: "卡片編號 (ID)",
      type: "種類",
      color: "顏色",
      level: "等級 (Level)",
      rarity: "稀有度",
      image: "圖片",
      upload: "上傳圖片",
      effectText: "英文效果文本 (English Effect)",
      enableEffect: "啟用效果文本顯示",
      forbidden: "禁止卡",
      limit1: "限制卡 (Limit 1)",
      save: "確認上傳並同步",
      update: "更新卡片資訊",
      packSelectSeries: "選擇系列並點擊「開啟卡包」",
      packRate: "配率：4 張餅乾卡 (含1張稀有位) + 1 張其他卡片",
      drawTestTitle: "起始手牌測試 (First Draw)",
      drawTestDesc: "模擬真實洗牌 (Fisher-Yates) 後抽取前 6 張卡片，卡片將依序翻開",
      exportTitle: "輸出與分享",
      exportTabImage: "圖片輸出",
      exportTabLink: "連結分享",
      exportTabList: "列印牌組清單",
      shareDesc: "關於分享連結",
      shareInfo: "產生短連結會將您的牌組資訊儲存至雲端，讓網址更簡短美觀，方便在社群媒體分享！",
    },
    labels: {
        creator: "製作者：樂多綠Gamecaster",
        youtube: "YouTube",
        facebook: "樂多綠Facebook",
        group: "薑餅人對戰卡牌/台灣"
    }
  },
  en: {
    appTitle: "Cookierun: Braverse Deck Builder",
    appSubtitle: "Beta version. Please report bugs to Gamecaster YT/FB.",
    searchPlaceholder: "Search name or ID...",
    types: {
      ALL: "All Types",
      COOKIE: "Cookie",
      ITEM: "Item",
      TRAP: "Trap",
      SCENE: "Stage",
    },
    colors: {
      ALL: "All Colors",
      RED: "Red",
      YELLOW: "Yellow",
      GREEN: "Green",
      BLUE: "Blue",
      PURPLE: "Purple",
      COLORLESS: "Colorless",
    },
    series: "All Series",
    levelRarity: {
      ALL: "All Level/Rarity",
      LEVEL_LABEL: "Level",
      RARITY_LABEL: "Rarity"
    },
    filters: {
      extra: "EXTRA",
      flip: "FLIP",
      ancient: "Ancient",
      dragon: "Dragon",
      beast: "Beast",
      soulJam: "Soul Jam",
    },
    rarities: {
      C: "C (Common)",
      R: "R (Rare)",
      SR: "SR (Super Rare)",
      UR: "UR (Ultra Rare)",
      EXR: "EXR (Extra Rare)",
    },
    stats: {
      main: "Main",
      extra: "Extra",
      flip: "Flip",
    },
    deckCheck: {
      title: "Deck Check",
      limit4: "※Max 4 copies per card ID",
      limitFlip16: "※Max 16 FLIP cards",
      minCookie20: "Recommend at least 20 Cookies",
      maxMain60: "Main Deck exceeds limit",
      maxExtra: "Extra Deck maxed out",
      maxFlip: "FLIP cards maxed out",
      banned: "Deck contains banned/limited cards exceeding limits. Not tournament legal.",
      valid: "Deck is valid",
      notIncludeFlip: "(excl. FLIP)"
    },
    actions: {
      add: "Add",
      import: "Import",
      export: "Export/Share",
      clear: "Clear",
      login: "Admin Login",
      logout: "Logout",
      adminTool: "Admin Tools",
      testTool: "Test Toolkit",
      firstDraw: "First Draw",
      packOpener: "Pack Opener",
      loading: "Loading cards from cloud...",
      copy: "Copy",
      generateShortLink: "Get Short Link",
      downloadImage: "Download Image",
      printList: "Print Deck List",
      generating: "Generating...",
      opening: "Opening...",
      openPack: "Open Pack",
      reShuffle: "Reshuffle & Draw",
    },
    modal: {
      editCard: "Edit Card",
      addCard: "Add Custom Card",
      cardNameZh: "Card Name (Chinese)",
      cardNameEn: "Card Name (English)",
      cardId: "Card ID",
      type: "Type",
      color: "Color",
      level: "Level",
      rarity: "Rarity",
      image: "Image",
      upload: "Upload Image",
      effectText: "English Effect Text",
      enableEffect: "Enable Effect Display",
      forbidden: "Banned",
      limit1: "Limited (Limit 1)",
      save: "Save & Sync",
      update: "Update Card",
      packSelectSeries: "Select series and click 'Open Pack'",
      packRate: "Rates: 4 Cookies (1 Rare slot) + 1 Other",
      drawTestTitle: "First Hand Test",
      drawTestDesc: "Simulates a 6-card draw after Fisher-Yates shuffle.",
      exportTitle: "Export & Share",
      exportTabImage: "Image Export",
      exportTabLink: "Share Link",
      exportTabList: "Deck List",
      shareDesc: "About Sharing",
      shareInfo: "Generating a short link saves your deck to the cloud, creating a neat URL for easy sharing!",
    },
    labels: {
        creator: "Creator: Gamecaster (Ledoulu)",
        youtube: "YouTube",
        facebook: "Facebook",
        group: "CRTCG Taiwan Group"
    }
  }
};

// --- 常數定義 ---
// 為了相容性，這裡的值必須對應資料庫儲存的中文，顯示時再透過 map 轉換
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
  EXR: "EXR (Extra Rare)", 
};

// 牌背圖片路徑
const CARD_BACK_URL = "https://static.wixstatic.com/media/2295bf_b9aee85e881243d99276b2f571927305~mv2.png";

const INITIAL_CARDS = [
  {
    id: "BS1-001",
    series: "BS1",
    number: "001",
    name: "勇氣餅乾",
    name_en: "GingerBrave", // 新增英文名欄位
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
    effectText: "", 
    showEffect: false, 
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

const fisherYatesShuffle = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// --- Helper: Translation Hook or simple function ---
const useTranslation = (lang) => {
    const t = (key) => {
        const keys = key.split('.');
        let val = TRANSLATIONS[lang];
        for (const k of keys) {
            val = val?.[k];
        }
        return val || key;
    };
    
    // Helper to translate Types and Colors (reverse lookup map style)
    const tType = (typeVal) => {
        const entry = Object.entries(CARD_TYPES).find(([k, v]) => v === typeVal);
        if (entry) return TRANSLATIONS[lang].types[entry[0]];
        return typeVal;
    };
    
    const tColor = (colorVal) => {
        const entry = Object.entries(CARD_COLORS).find(([k, v]) => v === colorVal);
        if (entry) return TRANSLATIONS[lang].colors[entry[0]];
        return colorVal;
    }

    return { t, tType, tColor };
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

const LoginModal = ({ onClose, onLogin, t }) => {
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
      setError("Login Failed: " + (err.message || "Check credentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <UserCog className="text-blue-600" /> {t('actions.login')}
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
            {loading ? "..." : t('actions.login')}
          </button>
        </form>
      </div>
    </div>
  );
};

const DrawTestModal = ({ deck, onClose, t, lang }) => {
  const [hand, setHand] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState({});

  const drawCards = useCallback(() => {
    if (deck.main.length === 0) {
        alert("Main deck empty!");
        return;
    }
    const shuffled = fisherYatesShuffle(deck.main);
    setHand(shuffled.slice(0, 6));
    setFlippedIndices({}); 

    for (let i = 0; i < 6; i++) {
        setTimeout(() => {
            setFlippedIndices(prev => ({ ...prev, [i]: true }));
        }, (i + 1) * 300); 
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
            <Dices className="text-blue-600" /> {t('modal.drawTestTitle')}
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
                    <div className="absolute inset-0 backface-hidden rounded-lg overflow-hidden border-2 border-slate-300 shadow-md">
                        <img src={CARD_BACK_URL} className="w-full h-full object-cover" alt="Card Back" />
                    </div>
                    <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-lg overflow-hidden border border-slate-300 shadow-md bg-white">
                        {card.imageUrl ? (
                            <img src={card.imageUrl} alt={lang === 'en' ? (card.name_en || card.name) : card.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className={`w-full h-full p-2 text-xs flex flex-col ${getCardColorStyles(card.color)}`}>
                                <span className="font-bold">{lang === 'en' ? (card.name_en || card.name) : card.name}</span>
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
            <RefreshCw size={20} /> {t('actions.reShuffle')}
          </button>
        </div>
        <p className="text-center text-slate-500 text-sm mt-4">
            {t('modal.drawTestDesc')}
        </p>
      </div>
    </div>
  );
};

const PackOpenerModal = ({ allCards, onClose, t, lang }) => {
  const [selectedSeries, setSelectedSeries] = useState("ALL");
  const [openedCards, setOpenedCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState({});
  const [isOpening, setIsOpening] = useState(false); 

  const availableSeries = useMemo(() => {
    const seriesSet = new Set(allCards
        .filter(c => !['ST', 'P'].includes(c.series))
        .map(c => c.series)
    );
    return Array.from(seriesSet).sort();
  }, [allCards]);

  const getRarityProb = () => {
    const r = Math.random() * 100;
    if (r < 1) return 'EXR';  
    if (r < 6) return 'UR';   
    if (r < 16) return 'SR'; 
    if (r < 36) return 'R';  
    return 'C';               
  };

  const openPack = () => {
    let pool = allCards.filter(c => !['ST', 'P'].includes(c.series));
    
    if (selectedSeries !== "ALL") {
      pool = pool.filter(c => c.series === selectedSeries);
    }

    const cookieCards = pool.filter(c => c.type === CARD_TYPES.COOKIE);
    const otherCards = pool.filter(c => c.type !== CARD_TYPES.COOKIE);

    if (otherCards.length < 1) {
        alert("Not enough non-cookie cards.");
        return;
    }
    if (cookieCards.length < 4) {
        alert("Not enough cookie cards.");
        return;
    }

    setIsOpening(true);
    setOpenedCards([]); 
    
    setTimeout(() => {
        const shuffledOthers = fisherYatesShuffle(otherCards);
        const selectedOther = shuffledOthers[0]; 

        const selectedIDs = new Set();
        if (selectedOther) selectedIDs.add(selectedOther.id);

        const selectedCookies = [];

        const targetRarity = getRarityProb();
        let targetPool = cookieCards.filter(c => (c.rarity || 'C') === targetRarity);
        
        if (targetPool.length === 0) {
            targetPool = cookieCards; 
        }

        const rareCard = targetPool[Math.floor(Math.random() * targetPool.length)];
        if (rareCard) {
            selectedCookies.push(rareCard);
            selectedIDs.add(rareCard.id);
        }

        let commonPool = cookieCards.filter(c => (c.rarity || 'C') === 'C' && !selectedIDs.has(c.id));
        
        if (commonPool.length < 3) {
            commonPool = cookieCards.filter(c => !selectedIDs.has(c.id));
        }

        const shuffledCommons = fisherYatesShuffle(commonPool);
        const commonsToTake = shuffledCommons.slice(0, 3);
        selectedCookies.push(...commonsToTake);

        while (selectedCookies.length < 4) {
             const randomC = cookieCards[Math.floor(Math.random() * cookieCards.length)];
             selectedCookies.push(randomC);
        }

        const finalPack = fisherYatesShuffle([...selectedCookies, selectedOther]);

        setOpenedCards(finalPack);
        setFlippedIndices({});
        setIsOpening(false); 
    }, 1200); 
  };

  const handleCardClick = (index) => {
    setFlippedIndices(prev => ({ ...prev, [index]: true }));
  };

  const renderCard = (card, index) => (
    <div 
        key={index} 
        onClick={() => handleCardClick(index)}
        className="w-[30vw] h-[40vw] md:w-48 md:h-64 cursor-pointer perspective-1000 group relative flex-shrink-0 animate-in zoom-in duration-500"
    >
        <div className={`w-full h-full transition-all duration-500 transform-style-3d relative ${flippedIndices[index] ? 'rotate-y-180' : ''}`}>
            <div className="absolute inset-0 backface-hidden rounded-lg overflow-hidden border-2 border-slate-600 shadow-xl group-hover:scale-105 transition-transform">
                <img src={CARD_BACK_URL} className="w-full h-full object-cover" alt="Card Back" />
            </div>
            <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-lg overflow-hidden border-2 border-white/20 shadow-2xl bg-white relative">
                {card.imageUrl ? (
                    <img src={card.imageUrl} className="w-full h-full object-cover" alt={lang === 'en' ? (card.name_en || card.name) : card.name} />
                ) : (
                    <div className={`w-full h-full p-2 flex flex-col justify-between ${getCardColorStyles(card.color)}`}>
                        <span className="font-bold text-sm">{lang === 'en' ? (card.name_en || card.name) : card.name}</span>
                        <span className="font-mono text-xs">{card.id}</span>
                    </div>
                )}
                {card.rarity && card.rarity !== 'C' && (
                    <div className={`absolute top-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded shadow border ${getRarityStyle(card.rarity)}`}>
                        {card.rarity}
                    </div>
                )}
            </div>
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-5xl p-6 min-h-[600px] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 text-white">
          <h2 className="text-2xl font-black flex items-center gap-2">
            <PackageOpen className="text-yellow-400" /> {t('actions.packOpener')}
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
            disabled={isOpening}
          >
            <option value="ALL">ALL Series</option>
            {availableSeries.map(s => <option key={s} value={s}>{s} Series</option>)}
          </select>
          <button 
            onClick={openPack}
            disabled={isOpening}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-yellow-700 disabled:text-slate-500 text-slate-900 px-6 py-2 rounded-lg font-black flex items-center gap-2 shadow-lg transition-transform active:scale-95"
          >
            {isOpening ? t('actions.opening') : <><PackageOpen size={20} /> {t('actions.openPack')}</>}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          {isOpening ? (
             <div className="animate-bounce">
                <div className="w-48 h-64 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-xl border-4 border-yellow-400 shadow-2xl flex items-center justify-center animate-pulse">
                    <img src={CARD_BACK_URL} className="w-full h-full object-cover rounded-lg opacity-80" alt="Pack" />
                </div>
             </div>
          ) : openedCards.length === 0 ? (
            <div className="text-slate-500 flex flex-col items-center">
                <PackageOpen size={64} className="mb-4 opacity-20" />
                <p>{t('modal.packSelectSeries')}</p>
                <p className="text-xs mt-2 opacity-60">{t('modal.packRate')}</p>
            </div>
          ) : (
             <div className="flex flex-col items-center gap-4 md:gap-6 w-full">
                <div className="flex justify-center gap-2 md:gap-6">
                    {openedCards.slice(0, 3).map((card, index) => renderCard(card, index))}
                </div>
                <div className="flex justify-center gap-2 md:gap-6">
                    {openedCards.slice(3, 5).map((card, index) => renderCard(card, index + 3))}
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BulkImportModal = ({ onClose, onImport, isProcessing, t }) => {
  const [jsonInput, setJsonInput] = useState("");

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        alert("Input must be a JSON array.");
        return;
      }
      if (
        !confirm(
          `Found ${parsed.length} cards. Import?`
        )
      ) {
        return;
      }
      onImport(parsed);
    } catch (e) {
      alert("JSON Syntax Error: " + e.message);
    }
  };

  const sampleFormat = `[
  {
    "id": "BS1-999",
    "series": "BS1",
    "number": "999",
    "name": "範例餅乾",
    "name_en": "Example Cookie",
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
    "isLimitOne": false,
    "effectText": "On play...",
    "showEffect": true
  }
]`;

  return (
    <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileJson className="text-green-600" /> {t('actions.import')}
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
            <p className="font-bold mb-1">Usage:</p>
            <p>
               Paste your JSON array here. Supported fields: name_en, rarity (C, R, SR, UR, EXR), etc.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
            <div className="flex flex-col gap-2">
              <label className="font-bold text-slate-700">JSON Input:</label>
              <textarea
                className="flex-1 w-full border rounded-lg p-3 font-mono text-xs bg-slate-50 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Paste JSON here..."
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-bold text-slate-700">Example:</label>
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
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isProcessing || !jsonInput}
            className="px-6 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg font-bold disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? "..." : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
};

const CardDetailModal = ({ card, onClose, t, lang, tType, tColor }) => {
  const [showTranslation, setShowTranslation] = useState(false);

  if (!card) return null;
  return (
    <div
      className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors"
        >
          <X size={32} />
        </button>

        {card.showEffect && (
           <button
             onClick={(e) => {
               e.stopPropagation();
               setShowTranslation(!showTranslation);
             }}
             className="absolute top-4 right-4 bg-white/90 text-slate-800 p-2 rounded-full shadow-lg z-50 hover:bg-blue-50 transition-colors flex items-center gap-2 font-bold text-xs border border-slate-200"
             title="Toggle Effect"
           >
             <Languages size={18} className="text-blue-600" />
             {showTranslation ? "Image" : "Effect"}
           </button>
        )}

        {showTranslation && card.effectText ? (
           <div className={`w-full aspect-[3/4] rounded-xl p-6 flex flex-col shadow-2xl border-8 ${getCardColorStyles(card.color)} bg-white overflow-y-auto relative`}>
              <div className="mt-8">
                  <h2 className="text-2xl font-bold mb-4 border-b pb-2 flex items-center gap-2 text-slate-800">
                     <Languages className="text-blue-500"/> English Effect
                  </h2>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="whitespace-pre-wrap text-lg leading-relaxed font-serif text-slate-800">
                         {card.effectText}
                      </p>
                  </div>
              </div>
              
              <div className="mt-auto pt-4 border-t border-slate-200">
                 <h1 className="text-xl font-bold text-slate-400">{lang === 'en' ? (card.name_en || card.name) : card.name}</h1>
                 <p className="text-sm font-mono text-slate-400">{card.id}</p>
              </div>
           </div>
        ) : (
           card.imageUrl ? (
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
                <h1 className="text-4xl font-bold mb-2">{lang === 'en' ? (card.name_en || card.name) : card.name}</h1>
                <p className="text-xl font-mono opacity-60 mb-8">{card.id}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {card.rarity && <span className={`px-3 py-1 rounded-full font-bold text-xs border shadow-sm ${getRarityStyle(card.rarity)}`}>{CARD_RARITIES[card.rarity]}</span>}
                  {card.level && (
                    <span className="px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full font-bold">
                      {card.level}
                    </span>
                  )}
                   {card.isAncient && <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded font-bold text-xs border border-amber-300">{t('filters.ancient')}</span>}
                   {card.isDragon && <span className="px-2 py-1 bg-red-100 text-red-800 rounded font-bold text-xs border border-red-300">{t('filters.dragon')}</span>}
                   {card.isBeast && <span className="px-2 py-1 bg-stone-800 text-stone-100 rounded font-bold text-xs border border-stone-600">{t('filters.beast')}</span>}
                   {card.isSoulJam && <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded font-bold text-xs border border-pink-300">{t('filters.soulJam')}</span>}
                   {card.isForbidden && <span className="px-2 py-1 bg-red-600 text-white rounded font-bold text-xs flex items-center gap-1"><Ban size={12}/> {t('modal.forbidden')}</span>}
                   {card.isLimitOne && <span className="px-2 py-1 bg-orange-500 text-white rounded font-bold text-xs flex items-center gap-1"><AlertOctagon size={12}/> {t('modal.limit1')}</span>}
                </div>
                <div className="text-2xl opacity-40 text-center mt-20">
                  No Image
                </div>
              </div>
            )
        )}
      </div>
    </div>
  );
};

const ExportModal = ({ deck, deckName, onClose, t, lang, tType }) => {
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

  const handleGenerateShortLink = async () => {
    if (!db) {
        alert("Database not connected.");
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
        console.error("Link Gen Failed", error);
        alert("Failed to generate link.");
    } finally {
        setIsCreatingLink(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!window.html2canvas) {
      alert("Loading libs...");
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
      link.download = `${deckName || "deck"}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (err) {
      console.error(err);
      alert("Image Gen Failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    alert("Copied!");
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
            <Share2 className="text-blue-600" /> {t('modal.exportTitle')}
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
            {t('modal.exportTabImage')}
          </button>
          <button
            onClick={() => setActiveTab("link")}
            className={`flex-1 py-3 font-bold text-sm ${
              activeTab === "link"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {t('modal.exportTabLink')}
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
            {t('modal.exportTabList')}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 print:bg-white print:p-0 print:overflow-visible">
          {activeTab === "image" && (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded shadow w-full flex flex-col md:flex-row justify-between items-center gap-4">
                <span className="text-slate-600 text-sm">
                  PNG Export
                </span>
                <button
                  onClick={handleDownloadImage}
                  disabled={isGenerating}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 shrink-0"
                >
                  {isGenerating ? "..." : <><Download size={18} /> {t('actions.downloadImage')}</>}
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
                            alt={lang === 'en' ? (group.name_en || group.name) : group.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-full h-full flex flex-col p-1 text-[8px] ${getCardColorStyles(
                              group.color
                            )}`}
                          >
                            <span className="font-bold leading-tight line-clamp-2">
                              {lang === 'en' ? (group.name_en || group.name) : group.name}
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
                              alt={lang === 'en' ? (group.name_en || group.name) : group.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className={`w-full h-full flex flex-col p-1 text-[8px] ${getCardColorStyles(
                                group.color
                              )}`}
                            >
                              <span className="font-bold leading-tight line-clamp-2">
                                {lang === 'en' ? (group.name_en || group.name) : group.name}
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
                  <p className="font-bold mb-1">{t('modal.shareDesc')}</p>
                  <p>
                    {t('modal.shareInfo')}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Link
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
                            <Copy size={18} /> {t('actions.copy')}
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
                                ...
                            </>
                        ) : (
                            <>
                                <LinkIcon size={18} /> {t('actions.generateShortLink')}
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
                        <p className="font-bold">Deck List (A4)</p>
                        <p>Print via browser.</p>
                    </div>
                    <button 
                        onClick={handlePrint}
                        className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-700"
                    >
                        <Printer size={18} /> {t('actions.printList')}
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
                                            <td className="py-1">{lang === 'en' ? (card.name_en || card.name) : card.name}</td>
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
                                                    <td className="py-1">{lang === 'en' ? (card.name_en || card.name) : card.name}</td>
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

const AddCardModal = ({ onClose, onAdd, isProcessing, initialData, t, lang }) => {
  const [formData, setFormData] = useState({
    series: "BS1",
    number: "",
    name: "",
    name_en: "", // 新增
    color: CARD_COLORS.RED,
    type: CARD_TYPES.COOKIE,
    level: CARD_LEVELS.LV1,
    rarity: "C", 
    isFlip: false,
    isExtra: false,
    isAncient: false,
    isDragon: false,
    isBeast: false,
    isSoulJam: false,
    isForbidden: false,
    isLimitOne: false,
    effectText: "", 
    showEffect: false, 
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
        rarity: initialData.rarity || "C", 
        name_en: initialData.name_en || "", // 新增
        effectText: initialData.effectText || "", 
        showEffect: initialData.showEffect || false, 
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
        alert("Image too big.");
      }
      try {
        const compressedBase64 = await compressImage(file);
        setPreviewUrl(compressedBase64);
        setFormData({ ...formData, imageUrl: compressedBase64 });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Name required");
      return;
    }
    // name_en not required

    let fullId;
    if (initialData && initialData.id) {
      fullId = initialData.id;
    } else {
      if (!formData.number) {
        alert("ID required");
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
                <Pencil className="text-blue-600" /> {t('modal.editCard')}
              </>
            ) : (
              <>
                <Plus className="text-blue-600" /> {t('modal.addCard')}
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
                {t('modal.cardId')} {initialData && <span className="text-xs text-red-500 font-normal ml-2">(Read Only)</span>}
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
                {t('modal.cardNameZh')}
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('modal.cardNameEn')}
              </label>
              <input
                type="text"
                className="w-full border rounded p-2"
                placeholder="Optional"
                value={formData.name_en}
                onChange={(e) =>
                  setFormData({ ...formData, name_en: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('modal.type')}
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
                  {t('modal.color')}
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
                  {t('modal.level')}
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

            {/* 稀有度選擇 */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                  {t('modal.rarity')} <Gem size={14} className="text-purple-500"/>
                </label>
                <select
                  className="w-full border rounded p-2"
                  value={formData.rarity}
                  onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                >
                  {Object.entries(CARD_RARITIES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
            </div>
            
            {/* 新增：效果文本輸入 */}
            <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <Languages size={16} /> {t('modal.effectText')}
                </label>
                <textarea
                    className="w-full border rounded p-2 h-24 text-sm font-sans"
                    placeholder="Enter English effect text here..."
                    value={formData.effectText}
                    onChange={(e) => setFormData({...formData, effectText: e.target.value})}
                />
                <div className="flex items-center gap-2 mt-2">
                    <input
                        type="checkbox"
                        id="showEffect"
                        checked={formData.showEffect}
                        onChange={(e) => setFormData({...formData, showEffect: e.target.checked})}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="showEffect" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                        {t('modal.enableEffect')}
                    </label>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border col-span-1 md:col-span-2">
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
                    <span>{t('filters.ancient')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5" checked={formData.isDragon} onChange={(e) => setFormData({ ...formData, isDragon: e.target.checked })} />
                    <span>{t('filters.dragon')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5" checked={formData.isBeast} onChange={(e) => setFormData({ ...formData, isBeast: e.target.checked })} />
                    <span>{t('filters.beast')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5" checked={formData.isSoulJam} onChange={(e) => setFormData({ ...formData, isSoulJam: e.target.checked })} />
                    <span>{t('filters.soulJam')}</span>
                  </label>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-y-3 gap-x-4">
                    <label className="flex items-center gap-2 cursor-pointer text-red-600 font-bold">
                        <input type="checkbox" className="w-5 h-5 accent-red-600" checked={formData.isForbidden} onChange={(e) => setFormData({ ...formData, isForbidden: e.target.checked })} />
                        <span>🚫 {t('modal.forbidden')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-orange-600 font-bold">
                        <input type="checkbox" className="w-5 h-5 accent-orange-600" checked={formData.isLimitOne} onChange={(e) => setFormData({ ...formData, isLimitOne: e.target.checked })} />
                        <span>⚠️ {t('modal.limit1')}</span>
                    </label>
                </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('modal.image')}
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
                    <span className="text-sm mt-2">{t('modal.upload')}</span>
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
                ? "..."
                : initialData
                ? t('modal.update')
                : t('modal.save')}
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
  lang, // 傳入 lang prop
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
  
  const displayName = lang === 'en' ? (card.name_en || card.name) : card.name;

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
              {displayName}
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
                  title="View"
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
              {card.rarity && card.rarity !== 'C' && (
                <span className={`text-[10px] md:text-xs font-bold px-1.5 rounded shadow-sm border ${getRarityStyle(card.rarity)}`}>
                  {card.rarity}
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
              
              {card.isForbidden && <span className="flex items-center gap-0.5 text-[10px] bg-red-600 text-white px-1.5 rounded font-bold"><Ban size={10}/></span>}
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
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(card);
            }}
            className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 shadow-sm"
            title="Delete"
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
    series: "ALL",
    levelOrRarity: "ALL", // 合併後的狀態
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
  const [showDrawTestModal, setShowDrawTestModal] = useState(false); 
  const [showPackOpenerModal, setShowPackOpenerModal] = useState(false); 
  
  const [viewingCard, setViewingCard] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false); 
  
  const [isMobileDeckOpen, setIsMobileDeckOpen] = useState(false);
   
  const [isOffline, setIsOffline] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const loadMoreRef = useRef(null);
  
  // 語言狀態：預設 zh
  const [language, setLanguage] = useState('zh');
  const { t, tType, tColor } = useTranslation(language);

  const LIMITS = { MAIN: 60, EXTRA: 6, COPY: 4, FLIP: 16 };

  const closeToast = useCallback(() => {
    setToastMsg(null);
  }, []);

  // --- SEO & Metadata ---
  useEffect(() => {
    document.title = "Cookierun: Braverse Deck Builder | 薑餅人對戰卡牌組構建器";
    // ... rest of SEO setup
  }, []);

  // ... (Tailwind Injection and Firebase Auth effects remain same)
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
      setLoadingError("Firebase Config Error");
      return;
    }
    const timeoutId = setTimeout(() => {
      if (!user && !isOffline) setLoadingError("Connection timeout");
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
            setToastMsg(`${t('actions.login')} Success`);
        } else {
            setIsAdmin(false);
        }
      } else {
        signInAnonymously(auth).catch(err => setLoadingError(`Login Failed: ${err.message}`));
      }
    });
    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [isOffline, t]);

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
      if (confirm("Logout Admin?")) {
          await signOut(auth);
          setToastMsg("Logged out");
      }
  };

  useEffect(() => {
    if (isOffline) {
        if (allCards.length === 0) {
            setAllCards(INITIAL_CARDS);
            setIsDataLoaded(true);
            setToastMsg("Offline Mode Loaded");
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
    }, (error) => { console.error("Firestore sync error:", error); setToastMsg("Database Error"); });
    return () => unsubscribe();
  }, [user, isOffline]);

  // Load deck from URL (same logic)
  // ... (Load deck useEffect) ... 
  // (Assuming same code as previous, just update for brevity)
  useEffect(() => {
    if (allCards.length === 0) return; 
    const params = new URLSearchParams(window.location.search);
    const shortId = params.get('s');
    if (shortId && db) {
        getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shared_decks', shortId)).then(snap => {
            if(snap.exists()) {
                 const d = snap.data();
                 const m = [], e = [];
                 d.m.forEach(id => { const c = allCards.find(x => x.id === id); if(c) m.push(c); });
                 d.e.forEach(id => { const c = allCards.find(x => x.id === id); if(c) e.push(c); });
                 setDeck({main:m, extra:e});
                 if(d.n) setDeckName(d.n);
                 setToastMsg('Deck Loaded!');
            }
        });
        return;
    }
    const deckData = params.get('d');
    if (deckData) {
        try {
            const decoded = JSON.parse(decodeURIComponent(atob(deckData)));
             const m = [], e = [];
             decoded.m.forEach(id => { const c = allCards.find(x => x.id === id); if(c) m.push(c); });
             decoded.e.forEach(id => { const c = allCards.find(x => x.id === id); if(c) e.push(c); });
             setDeck({main:m, extra:e});
             if(decoded.n) setDeckName(decoded.n);
             setToastMsg('Deck Loaded!');
        } catch(e) {}
    }
  }, [allCards, db]);

  // ... getCardCount, getFlipCount etc. (same) ...
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
    // ... Logic same ...
    const isExtra = isExtraDeckCard(card);
    const targetDeckKey = isExtra ? "extra" : "main";
    const currentCount = getCardCount(card.id);
    if(currentCount >= LIMITS.COPY) { setToastMsg(t('deckCheck.limit4')); return; }
    
    setDeck((prev) => ({
      ...prev,
      [targetDeckKey]: [...prev[targetDeckKey], card].sort((a, b) => a.id.localeCompare(b.id)),
    }));
  }, [deck, t, getCardCount]); // Added t dependency

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
    if (confirm("Clear Deck?")) setDeck({ main: [], extra: [] });
  };

  // ... Handlers (Save, Import, Delete) same ...
  const handleSaveCard = async (cardData) => {
     if(!db) return;
     try {
         await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'cards', cardData.id), cardData);
         setToastMsg("Saved!");
         setShowAddModal(false);
         setEditingCard(null);
     } catch(e) { console.error(e); }
  };
  
  const handleDeleteCard = async (card) => {
      if(!confirm("Delete?")) return;
      try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'cards', card.id));
          setToastMsg("Deleted");
      } catch(e) {}
  }

  const handleBulkImport = async (data) => {
      if(!db) return;
      const batch = writeBatch(db);
      data.forEach(c => {
          if(c.id) batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'cards', c.id), c);
      });
      await batch.commit();
      setToastMsg(`Imported ${data.length} cards`);
      setShowBulkModal(false);
  }

  const filteredCards = useMemo(
    () =>
      allCards.filter((card) => {
        const search = filters.search.toLowerCase();
        // Updated Search Logic: Check Name(ZH), Name(EN), ID
        const matchSearch =
          card.name.toLowerCase().includes(search) ||
          (card.name_en && card.name_en.toLowerCase().includes(search)) ||
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

        // 合併等級與稀有度篩選
        const matchLevelOrRarity = (() => {
          if (filters.levelOrRarity === "ALL") return true;
          // Check if it's a level
          if (Object.values(CARD_LEVELS).includes(filters.levelOrRarity)) {
              return card.level === filters.levelOrRarity;
          }
          // Check if it's a rarity key
          if (Object.keys(CARD_RARITIES).includes(filters.levelOrRarity)) {
             return card.rarity === filters.levelOrRarity;
          }
          return false;
        })();

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
          matchLevelOrRarity && 
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

  // Loading state
  if (loadingError && !isOffline) {
    return <div className="flex h-screen items-center justify-center p-4">Error: {loadingError}</div>;
  }
  if (!user && !isOffline) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <div className="flex fixed inset-0 flex-col md:flex-row bg-slate-50 overflow-hidden font-sans text-slate-900 overscroll-contain h-[100dvh]">
      {viewingCard && (
        <CardDetailModal
          card={viewingCard}
          onClose={() => setViewingCard(null)}
          t={t} lang={lang} tType={tType} tColor={tColor}
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
          t={t} lang={language}
        />
      )}

      {showBulkModal && <BulkImportModal onClose={() => setShowBulkModal(false)} onImport={handleBulkImport} isProcessing={isProcessing} t={t} />}

      {showExportModal && <ExportModal deck={deck} deckName={deckName} onClose={() => setShowExportModal(false)} t={t} lang={language} />}

      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)} 
          onLogin={handleAdminLogin} 
          t={t}
        />
      )}

      {showDrawTestModal && <DrawTestModal deck={deck} onClose={() => setShowDrawTestModal(false)} t={t} lang={language} />}
      
      {showPackOpenerModal && <PackOpenerModal allCards={allCards} onClose={() => setShowPackOpenerModal(false)} t={t} lang={language} />}

      {/* 左側：卡片清單 (手機上為滿版，桌面版在左側) */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 min-h-0">
        {/* Header 區域 */}
        <div className="p-3 md:p-4 bg-white border-b border-slate-200 shadow-sm z-10 space-y-2 md:space-y-3 shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
                <h1 className="text-lg md:text-2xl font-black flex items-center gap-2 text-slate-800">
                    <Cloud className={isOffline ? "text-slate-400" : "text-blue-600"} size={24} />
                    {t('appTitle')}
                </h1>
                <p className="text-xs md:text-sm text-slate-500 font-bold ml-1 mt-1">
                    {t('appSubtitle')}
                </p>
            </div>
            
            <div className="flex gap-2 items-center">
               {/* 語言切換按鈕 */}
               <button 
                 onClick={() => setLanguage(l => l === 'zh' ? 'en' : 'zh')}
                 className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs flex items-center gap-1"
               >
                 <Globe size={16} /> {language.toUpperCase()}
               </button>

              {isAdmin ? (
                <>
                  <button onClick={() => { setEditingCard(null); setShowAddModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 shadow transition-colors"><Plus size={16} /> <span className="hidden md:inline">{t('actions.add')}</span></button>
                  <button onClick={() => setShowBulkModal(true)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 shadow transition-colors"><FileJson size={16} /> <span className="hidden md:inline">{t('actions.import')}</span></button>
                </>
              ) : (
                <div className="flex items-center gap-1 text-slate-400 text-xs bg-slate-100 px-2 py-1 rounded"><Lock size={12} /></div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder={t('searchPlaceholder')} className="w-full pl-10 pr-4 py-1.5 md:py-2 bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} />
            </div>
            {/* 篩選器 */}
            <div className="flex gap-2">
              <div className="relative flex-1"><Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><select className="w-full pl-10 pr-4 py-1.5 md:py-2 bg-slate-100 border-none rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})}>
                <option value="ALL">{t('types.ALL')}</option>
                {Object.values(CARD_TYPES).map(v => <option key={v} value={v}>{tType(v)}</option>)}
              </select></div>
              <div className="relative flex-1"><Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><select className="w-full pl-10 pr-4 py-1.5 md:py-2 bg-slate-100 border-none rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" value={filters.color} onChange={(e) => setFilters({...filters, color: e.target.value})}>
                <option value="ALL">{t('colors.ALL')}</option>
                {Object.values(CARD_COLORS).map(c => <option key={c} value={c}>{tColor(c)}</option>)}
              </select></div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1"><Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><select className="w-full pl-10 pr-4 py-1.5 md:py-2 bg-slate-100 border-none rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" value={filters.series} onChange={(e) => setFilters({...filters, series: e.target.value})}>
                  <option value="ALL">{t('series')}</option>
                  {CARD_SERIES_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select></div>
              <div className="relative flex-1"><Gem className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><select className="w-full pl-10 pr-4 py-1.5 md:py-2 bg-slate-100 border-none rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" value={filters.levelOrRarity} onChange={(e) => setFilters({...filters, levelOrRarity: e.target.value})}>
                  <option value="ALL">{t('levelRarity.ALL')}</option>
                  <optgroup label={t('levelRarity.LEVEL_LABEL')}>
                    {Object.values(CARD_LEVELS).map((l) => (<option key={l} value={l}>{l}</option>))}
                  </optgroup>
                  <optgroup label={t('levelRarity.RARITY_LABEL')}>
                    {Object.entries(CARD_RARITIES).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                  </optgroup>
                </select></div>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-2 pl-1 select-none">
               {/* 簡化 Checkbox 渲染 */}
               {[
                 {key:'showExtra', label: t('filters.extra'), style: "bg-purple-200 text-purple-900 border-purple-300"},
                 {key:'showFlip', label: t('filters.flip'), style: "bg-slate-800 text-white"},
                 {key:'showAncient', label: t('filters.ancient'), style: "bg-amber-100 text-amber-800 border-amber-300"},
                 {key:'showDragon', label: t('filters.dragon'), style: "bg-red-100 text-red-800 border-red-300"},
                 {key:'showBeast', label: t('filters.beast'), style: "bg-stone-800 text-stone-100 border-stone-600"},
                 {key:'showSoulJam', label: t('filters.soulJam'), style: "bg-pink-100 text-pink-800 border-pink-300"},
               ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95">
                    <input type="checkbox" className="hidden peer" checked={filters[opt.key]} onChange={(e) => setFilters({ ...filters, [opt.key]: e.target.checked })} />
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border font-bold peer-checked:ring-2 peer-checked:ring-offset-1 peer-checked:opacity-100 opacity-60 ${opt.style}`}>{opt.label}</span>
                  </label>
               ))}
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {!isDataLoaded ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
               <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
               <p className="font-bold text-sm">{t('actions.loading')}</p>
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
                    onEdit={isAdmin ? () => {setEditingCard(card); setShowAddModal(true);} : null}
                    onDelete={isAdmin ? handleDeleteCard : null}
                    lang={language}
                  />
                ))}
                <div ref={loadMoreRef} className="col-span-full h-10"></div>
              </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 text-xs text-slate-500 p-2 md:p-3">
          <div className="md:hidden flex flex-col gap-1.5">
              <div className="font-bold">{t('labels.creator')}</div>
              <div className="flex items-center gap-4">
                  <a href="https://www.youtube.com/@%E6%A8%82%E5%A4%9A%E7%B6%A0" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-red-600 font-bold"><Youtube size={14} /> {t('labels.youtube')}</a>
                  <a href="https://www.facebook.com/midaylovesworld/" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-600 font-bold"><Facebook size={14} /> {t('labels.facebook')}</a>
              </div>
              <div className="flex items-center justify-between">
                  <a href="https://www.facebook.com/groups/CookieRunBraverseTW" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-600 font-bold"><ExternalLink size={14} /> {t('labels.group')}</a>
                  {isAdmin ? <button onClick={handleLogout} className="p-1 hover:text-red-500"><LogOut size={16}/></button> : <button onClick={() => setShowLoginModal(true)} className="p-1 hover:text-slate-700"><Lock size={16}/></button>}
              </div>
          </div>

          <div className="hidden md:flex flex-row justify-between items-center gap-4">
              <span className="font-bold">{t('labels.creator')}</span>
              <div className="flex gap-4">
                  <a href="https://www.youtube.com/@%E6%A8%82%E5%A4%9A%E7%B6%A0" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-red-600 font-bold"><Youtube size={14} /> {t('labels.youtube')}</a>
                  <a href="https://www.facebook.com/midaylovesworld/" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-600 font-bold"><Facebook size={14} /> {t('labels.facebook')}</a>
                  <a href="https://www.facebook.com/groups/CookieRunBraverseTW" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-600 font-bold"><ExternalLink size={14} /> {t('labels.group')}</a>
              </div>
              <div className="flex justify-end">
                {isAdmin ? <button onClick={handleLogout} className="p-1 hover:text-red-500" title={t('actions.logout')}><LogOut size={16}/></button> : <button onClick={() => setShowLoginModal(true)} className="p-1 hover:text-slate-700" title={t('actions.login')}><Lock size={16}/></button>}
              </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        className="md:hidden fixed bottom-6 right-6 z-40 bg-blue-600 text-white p-4 rounded-full shadow-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 ring-2 ring-white"
        onClick={() => setIsMobileDeckOpen(true)}
      >
        <Layers size={24} />
        <span className="font-bold text-lg">{deck.main.length}</span>
      </button>

      {isMobileDeckOpen && (
        <div 
            className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDeckOpen(false)}
        />
      )}

      {/* Right Drawer / Sidebar */}
      <div className={`
          bg-white shadow-2xl z-50 flex flex-col border-l border-slate-300
          md:relative md:w-80 lg:w-96 md:h-auto md:translate-x-0 md:flex md:shadow-none
          fixed inset-y-0 right-0 w-[85vw] max-w-sm transition-transform duration-300 ease-in-out
          ${isMobileDeckOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="p-4 bg-slate-800 text-white border-b border-slate-700 shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2 flex-1"><Box size={20} className="text-blue-400"/> {t('deckCheck.title')}</h2>
            <div className="flex gap-2">
              <button onClick={handleShareClick} className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded" title={t('actions.export')}><Share2 size={18} /></button>
              <button onClick={clearDeck} className="bg-red-600 hover:bg-red-500 text-white px-2 py-1.5 rounded text-sm font-bold flex items-center gap-1">
                <Trash2 size={14} />
              </button>
              <button onClick={() => setIsMobileDeckOpen(false)} className="md:hidden bg-slate-700 hover:bg-slate-600 text-white p-1.5 rounded ml-2">
                <X size={18} />
              </button>
            </div>
          </div>
          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            className="bg-transparent text-lg font-bold text-white border-b border-white/20 focus:border-white outline-none w-full placeholder-slate-400 mb-2"
            placeholder="Deck Name..."
          />
          <div className="flex flex-wrap gap-2">
            <StatBadge icon={Layers} label={t('stats.main')} current={deck.main.length} max={LIMITS.MAIN} color="blue" warningAtFull={false} />
            <StatBadge icon={Zap} label={t('stats.extra')} current={deck.extra.length} max={LIMITS.EXTRA} color="purple" />
            <StatBadge icon={RotateCw} label={t('stats.flip')} current={flipCount} max={LIMITS.FLIP} color="orange" />
          </div>
        </div>
        
        <div className="p-2 bg-slate-700 border-b border-slate-600">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-2 flex items-center gap-1">
                <UserCog size={12} /> {t('actions.testTool')}
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={() => setShowDrawTestModal(true)}
                    className="bg-slate-600 hover:bg-blue-600 text-white py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-colors"
                >
                    <Dices size={16} /> 
                    <span>{t('actions.firstDraw')}</span>
                </button>
                <button 
                    onClick={() => setShowPackOpenerModal(true)}
                    className="bg-slate-600 hover:bg-yellow-600 text-white py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-colors"
                >
                    <PackageOpen size={16} /> 
                    <span>{t('actions.packOpener')}</span>
                </button>
            </div>
        </div>

        {isAdmin && (
            <div className="p-2 bg-slate-800 border-b border-slate-700">
                <div className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-2 px-2 flex items-center gap-1">
                    <UserCog size={12} /> {t('actions.adminTool')}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2 text-center text-xs text-slate-500 italic">
                        Integrated in Top Bar
                    </div>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-6 bg-slate-50 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <section>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 px-1 flex justify-between ${deck.main.length > 60 ? "text-red-600" : "text-slate-400"}`}>
                {t('stats.main')} <span>{deck.main.length} / {LIMITS.MAIN}</span>
            </h3>
            <div className={`space-y-2 min-h-[100px] ${deck.main.length > 60 ? "border-2 border-red-100 rounded-lg p-1 bg-red-50/30" : ""}`}>
              {groupedMainDeck.length === 0 ? <div className="h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 text-sm bg-slate-100"><Layers size={24} className="mb-1 opacity-50"/><span>Empty</span></div> : 
               groupedMainDeck.map(group => <CardItem key={`main-group-${group.id}`} card={group} compact={true} count={group.stackCount} onClick={(c) => removeFromDeck(c, false)} onView={setViewingCard} lang={language} />)}
            </div>
          </section>
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1 flex justify-between">{t('stats.extra')} <span>{deck.extra.length} / {LIMITS.EXTRA}</span></h3>
            <div className="space-y-2">
                 {groupedExtraDeck.length === 0 ? <div className="h-16 border-2 border-dashed border-purple-200 rounded-lg flex items-center justify-center text-purple-400 text-sm bg-purple-50"><span>Empty</span></div> : 
                 groupedExtraDeck.map(group => <CardItem key={`extra-group-${group.id}`} card={group} compact={true} count={group.stackCount} onClick={(c) => removeFromDeck(c, true)} onView={setViewingCard} lang={language} />)}
            </div>
          </section>
          <section className="bg-orange-50 p-3 rounded-lg border border-orange-200">
              <h4 className="flex items-center gap-2 text-orange-800 font-bold text-sm mb-1"><AlertTriangle size={14} /> {t('deckCheck.title')}</h4>
              <div className="text-[11px] text-orange-800/70 font-mono mb-2 border-b border-orange-200 pb-2 leading-relaxed">
               {t('deckCheck.limit4')}<br/>
               {t('deckCheck.limitFlip16')}
              </div>
              <ul className="text-xs text-orange-700 space-y-1 list-disc pl-4">
                {nonFlipCookieCount < 20 && <li>{t('deckCheck.minCookie20')} (Currently {nonFlipCookieCount}) <span className="text-[10px] opacity-75 ml-1">{t('deckCheck.notIncludeFlip')}</span></li>}
                {deck.main.length > LIMITS.MAIN && <li className="text-red-600 font-bold">{t('deckCheck.maxMain60')} ({deck.main.length}/60)</li>}
                {deck.extra.length === LIMITS.EXTRA && <li className="text-red-600 font-bold">{t('deckCheck.maxExtra')}</li>}
                {flipCount === LIMITS.FLIP && <li className="text-red-600 font-bold">{t('deckCheck.maxFlip')} ({LIMITS.FLIP})</li>}
                {(forbiddenCount > 0 || limitOneViolation) && (
                    <li className="text-red-600 font-bold flex items-start gap-1 -ml-1">
                        <Ban size={14} className="shrink-0 mt-0.5" />
                        <span>{t('deckCheck.banned')}</span>
                    </li>
                )}
                {nonFlipCookieCount >= 20 && deck.main.length <= LIMITS.MAIN && deck.extra.length < LIMITS.EXTRA && flipCount < LIMITS.FLIP && forbiddenCount === 0 && !limitOneViolation && <li className="text-emerald-600 list-none -ml-4 flex items-center gap-1 font-bold"><CheckCircle size={14}/> {t('deckCheck.valid')}</li>}
              </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
