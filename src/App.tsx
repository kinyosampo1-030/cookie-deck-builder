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
} from "lucide-react";

// --- Firebase Imports ---
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
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
//  Firebase 設定 (Vite 環境變數版)
// ==========================================
// 這是 Vite 的標準寫法，會自動讀取 .env 檔案或是 Netlify 後台設定的環境變數
const firebaseConfig = {
  apiKey: "AIzaSyDK-feks4M0aZaJY4-gFcP_TxVcJLfMuxo",
  authDomain: "cookierunbraverse.firebaseapp.com",
  projectId: "cookierunbraverse",
  storageBucket: "cookierunbraverse.firebasestorage.app",
  messagingSenderId: "1061622650816",
  appId: "1:1061622650816:web:b61e2490336b244bf01a25",
  measurementId: "G-YK70VGHNRN",
};
// ==========================================

try {
  // 安全檢查：確認有讀取到 API Key 才初始化
  // 如果在 Netlify 沒有設定環境變數，這裡會抓不到 Key
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    // 這裡只會在 Console 顯示警告，不會讓程式直接崩潰 (白畫面)
    console.warn("注意：未偵測到環境變數。請確認您已在 Netlify 後台設定，或在本地建立了 .env 檔案。");
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
    case CARD_COLORS.RED: return "bg-red-50 border-red-500 text-red-900";
    case CARD_COLORS.YELLOW: return "bg-yellow-50 border-yellow-500 text-yellow-900";
    case CARD_COLORS.GREEN: return "bg-emerald-50 border-emerald-500 text-emerald-900";
    case CARD_COLORS.BLUE: return "bg-blue-50 border-blue-500 text-blue-900";
    case CARD_COLORS.PURPLE: return "bg-purple-50 border-purple-500 text-purple-900";
    case CARD_COLORS.COLORLESS: return "bg-slate-100 border-slate-400 text-slate-800";
    default: return "bg-gray-100 border-gray-400 text-gray-800";
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

// --- 元件 ---

// Toast 元件
const Toast = ({ message, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 2500); 
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[90] animate-bounce pointer-events-none w-full max-w-sm px-4">
      <div className="bg-slate-800/95 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 font-bold border border-slate-600 backdrop-blur-sm pointer-events-auto justify-center">
        {message.includes('成功') || message.includes('合規') ? (
            <CheckCircle size={24} className="text-green-400 shrink-0" />
        ) : (
            <AlertCircle size={24} className="text-yellow-400 shrink-0" />
        )}
        <span className="text-lg">{message}</span>
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
      if (!confirm(`解析成功！共發現 ${parsed.length} 張卡片。\n確定要寫入資料庫嗎？`)) {
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
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileJson className="text-green-600" /> 批量匯入卡片 (JSON)
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
          <div className="bg-blue-50 p-4 rounded text-base text-blue-800 border border-blue-200">
            <p className="font-bold mb-1">使用說明：</p>
            <p>請將您的卡片資料整理為 <strong>JSON 陣列</strong> 格式貼入下方。</p>
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
          <button onClick={onClose} className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold text-lg">取消</button>
          <button onClick={handleImport} disabled={isProcessing || !jsonInput} className="px-8 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg font-bold disabled:opacity-50 flex items-center gap-2 text-lg">
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
    <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors">
          <X size={32} />
        </button>
        {card.imageUrl ? (
          <img src={card.imageUrl} alt={card.name} className="w-full h-auto rounded-lg shadow-2xl border-2 border-white/20" />
        ) : (
          <div className={`w-full aspect-[3/4] rounded-xl p-8 flex flex-col shadow-2xl border-8 ${getCardColorStyles(card.color)} bg-white`}>
            <h1 className="text-4xl font-bold mb-2">{card.name}</h1>
            <p className="text-xl font-mono opacity-60 mb-8">{card.id}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {card.level && <span className="px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full font-bold">{card.level}</span>}
               {card.isAncient && <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded font-bold text-xs border border-amber-300">上古</span>}
               {card.isDragon && <span className="px-2 py-1 bg-red-100 text-red-800 rounded font-bold text-xs border border-red-300">龍族</span>}
               {card.isBeast && <span className="px-2 py-1 bg-stone-800 text-stone-100 rounded font-bold text-xs border border-stone-600">野獸</span>}
               {card.isSoulJam && <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded font-bold text-xs border border-pink-300">靈魂果醬</span>}
               {card.isForbidden && <span className="px-2 py-1 bg-red-600 text-white rounded font-bold text-xs flex items-center gap-1"><Ban size={12}/> 禁止卡</span>}
               {card.isLimitOne && <span className="px-2 py-1 bg-orange-500 text-white rounded font-bold text-xs flex items-center gap-1"><AlertOctagon size={12}/> Limit 1</span>}
            </div>
            <div className="text-2xl opacity-40 text-center mt-20">無圖片預覽</div>
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
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    if (!window.html2canvas) {
      const script = document.createElement("script");
      script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const mainIds = deck.main.map((c) => c.id);
    const extraIds = deck.extra.map((c) => c.id);
    const data = JSON.stringify({ m: mainIds, e: extraIds, n: deckName });
    const encoded = btoa(encodeURIComponent(data));
    const baseUrl = window.location.href.split("?")[0];
    const url = `${baseUrl}?d=${encoded}`;
    setShareUrl(url);
  }, [deck, deckName]);

  const handleDownloadImage = async () => {
    if (!window.html2canvas) {
      alert("組件載入中，請稍後再試...");
      return;
    }
    setIsGenerating(true);
    try {
      const canvas = await window.html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: "#f8fafc",
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `${deckName || "deck"}-${new Date().toISOString().slice(0, 10)}.png`;
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
    navigator.clipboard.writeText(shareUrl);
    alert("連結已複製到剪貼簿！");
  };
  const groupedMain = useMemo(() => groupCards(deck.main), [deck.main]);
  const groupedExtra = useMemo(() => groupCards(deck.extra), [deck.extra]);

  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2"><Share2 className="text-blue-600" /> 輸出與分享</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={24} /></button>
        </div>
        <div className="flex border-b">
          <button onClick={() => setActiveTab("image")} className={`flex-1 py-3 font-bold text-sm ${activeTab === "image" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:bg-slate-50"}`}>圖片輸出</button>
          <button onClick={() => setActiveTab("link")} className={`flex-1 py-3 font-bold text-sm ${activeTab === "link" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:bg-slate-50"}`}>連結分享</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
          {activeTab === "image" && (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded shadow w-full flex justify-between items-center">
                <span className="text-slate-600 text-sm">將牌組匯出為高解析度 PNG 圖片 (包含完整卡片縮圖)</span>
                <button onClick={handleDownloadImage} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50">
                  {isGenerating ? "生成中..." : <><Download size={18} /> 下載圖片</>}
                </button>
              </div>
              <div ref={exportRef} className="bg-white p-8 rounded-lg shadow-lg w-full max-w-[1000px] min-h-[600px] border border-slate-200">
                <div className="flex justify-between items-end border-b-2 border-slate-800 pb-4 mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900 uppercase">{deckName || "My Deck"}</h1>
                    <p className="text-slate-500 mt-1">Total Cards: {deck.main.length + deck.extra.length}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-400">CREATED WITH</div>
                    <div className="text-xl font-black text-blue-600">Braverse Deck Builder</div>
                  </div>
                </div>
                <div className="mb-8">
                  <h3 className="font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded inline-block mb-4 border-l-4 border-blue-500">MAIN DECK ({deck.main.length})</h3>
                  <div className="grid grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {groupedMain.map((group) => (
                      <div key={group.id} className="relative aspect-[3/4] rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-slate-50 group">
                        {group.imageUrl ? <img src={group.imageUrl} alt={group.name} className="w-full h-full object-cover" /> : 
                          <div className={`w-full h-full flex flex-col p-2 text-[10px] ${getCardColorStyles(group.color)}`}>
                            <span className="font-bold leading-tight line-clamp-2">{group.name}</span>
                            <span className="mt-1 font-mono opacity-70 font-bold">{group.id}</span>
                          </div>
                        }
                        <div className="absolute bottom-1 right-1 bg-black text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-md border border-white/20 z-10">x{group.stackCount}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {groupedExtra.length > 0 && (
                  <div>
                    <h3 className="font-bold text-slate-800 bg-purple-50 text-purple-900 px-3 py-1 rounded inline-block mb-4 border-l-4 border-purple-500">EXTRA DECK ({deck.extra.length})</h3>
                    <div className="grid grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                      {groupedExtra.map((group) => (
                        <div key={group.id} className="relative aspect-[3/4] rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-slate-50 group">
                          {group.imageUrl ? <img src={group.imageUrl} alt={group.name} className="w-full h-full object-cover" /> : 
                            <div className={`w-full h-full flex flex-col p-2 text-[10px] ${getCardColorStyles(group.color)}`}>
                              <span className="font-bold leading-tight line-clamp-2">{group.name}</span>
                              <span className="mt-1 font-mono opacity-70 font-bold">{group.id}</span>
                            </div>
                          }
                          <div className="absolute bottom-1 right-1 bg-black text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-md border border-white/20 z-10">x{group.stackCount}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === "link" && (
            <div className="flex flex-col gap-6 max-w-lg mx-auto mt-8">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-3 items-start">
                <AlertTriangle className="text-blue-600 shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-blue-800"><p className="font-bold mb-1">關於分享連結</p><p>現在我們使用了雲端資料庫，您的自定義卡片也可以透過連結分享給朋友了！只要他們有網路，就能看到您上傳的卡片。</p></div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">牌組分享連結</label>
                <div className="flex gap-2"><input type="text" readOnly value={shareUrl} className="flex-1 border rounded-lg px-3 py-2 text-slate-600 bg-white select-all font-mono text-sm" /><button onClick={handleCopyLink} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Copy size={18} /> 複製</button></div>
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
    series: "BS1", number: "", name: "", color: CARD_COLORS.RED, type: CARD_TYPES.COOKIE, level: CARD_LEVELS.LV1,
    isFlip: false, isExtra: false, isAncient: false, isDragon: false, isBeast: false, isSoulJam: false,
    isForbidden: false, isLimitOne: false, imageUrl: "",
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
      setFormData((prev) => ({ ...prev, ...initialData, series: derivedSeries, number: derivedNumber, }));
      if (initialData.imageUrl) {
        setPreviewUrl(initialData.imageUrl);
      }
    }
  }, [initialData]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) { alert("圖片過大！請使用 1MB 以下的圖片，系統將嘗試自動壓縮。"); }
      try {
        const compressedBase64 = await compressImage(file);
        setPreviewUrl(compressedBase64);
        setFormData({ ...formData, imageUrl: compressedBase64 });
      } catch (err) { console.error("圖片處理失敗", err); alert("圖片處理失敗，請換一張試試"); }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) { alert("請填寫卡片名稱"); return; }
    if (formData.imageUrl && formData.imageUrl.length > 1048400) { alert("圖片壓縮後依然過大！請更換一張解析度較低的圖片。"); return; }
    let fullId = initialData && initialData.id ? initialData.id : (!formData.number ? null : `${formData.series}-${formData.number}`);
    if (!fullId) { alert("請填寫編號"); return; }
    const submitData = { ...formData, id: fullId, level: formData.type === CARD_TYPES.COOKIE ? formData.level : null };
    onAdd(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">{initialData ? <><Pencil className="text-blue-600" /> 編輯卡片</> : <><Plus className="text-blue-600" /> 新增自定義卡片</>}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className={`bg-slate-50 p-3 rounded border ${initialData ? "opacity-70 pointer-events-none" : ""}`}>
              <label className="block text-sm font-bold text-slate-700 mb-2">卡片編號 (ID)</label>
              <div className="flex gap-2 items-center">
                <select className="border rounded p-2 bg-white flex-1" value={formData.series} onChange={(e) => setFormData({ ...formData, series: e.target.value })}>{CARD_SERIES_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}</select>
                <span className="font-bold text-slate-400">-</span>
                <input type="text" placeholder="001" required={!initialData} className="border rounded p-2 flex-1" value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">卡片名稱</label>
              <input type="text" required className="w-full border rounded p-2" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">種類</label>
                <select className="w-full border rounded p-2" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>{Object.values(CARD_TYPES).map((t) => (<option key={t} value={t}>{t}</option>))}</select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">顏色</label>
                <select className="w-full border rounded p-2" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })}>{Object.values(CARD_COLORS).map((c) => (<option key={c} value={c}>{c}</option>))}</select>
              </div>
            </div>
            {formData.type === CARD_TYPES.COOKIE && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">等級 (Level)</label>
                <select className="w-full border rounded p-2" value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })}>{Object.values(CARD_LEVELS).map((lvl) => (<option key={lvl} value={lvl}>{lvl}</option>))}</select>
              </div>
            )}
            <div className="bg-slate-50 p-4 rounded-lg border">
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-5 h-5" checked={formData.isFlip} onChange={(e) => setFormData({ ...formData, isFlip: e.target.checked })} /><span>FLIP</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-5 h-5" checked={formData.isExtra} onChange={(e) => setFormData({ ...formData, isExtra: e.target.checked })} /><span>Extra Deck</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-5 h-5" checked={formData.isAncient} onChange={(e) => setFormData({ ...formData, isAncient: e.target.checked })} /><span>上古餅乾</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-5 h-5" checked={formData.isDragon} onChange={(e) => setFormData({ ...formData, isDragon: e.target.checked })} /><span>龍族</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-5 h-5" checked={formData.isBeast} onChange={(e) => setFormData({ ...formData, isBeast: e.target.checked })} /><span>野獸餅乾</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-5 h-5" checked={formData.isSoulJam} onChange={(e) => setFormData({ ...formData, isSoulJam: e.target.checked })} /><span>靈魂果醬</span></label>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-y-3 gap-x-4">
                    <label className="flex items-center gap-2 cursor-pointer text-red-600 font-bold"><input type="checkbox" className="w-5 h-5 accent-red-600" checked={formData.isForbidden} onChange={(e) => setFormData({ ...formData, isForbidden: e.target.checked })} /><span>🚫 禁止卡</span></label>
                    <label className="flex items-center gap-2 cursor-pointer text-orange-600 font-bold"><input type="checkbox" className="w-5 h-5 accent-orange-600" checked={formData.isLimitOne} onChange={(e) => setFormData({ ...formData, isLimitOne: e.target.checked })} /><span>⚠️ 限制卡 (Limit 1)</span></label>
                </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">圖片 {initialData && <span className="text-xs text-gray-500">(不更換則維持原圖)</span>}</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 relative h-64 flex items-center justify-center bg-slate-100">
                {previewUrl ? <img src={previewUrl} className="absolute inset-0 w-full h-full object-contain" /> : <div className="text-slate-400 flex flex-col items-center"><ImageIcon size={48} /><span className="text-sm mt-2">上傳圖片</span></div>}
                <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            </div>
            <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold disabled:opacity-50">{isProcessing ? "處理中..." : initialData ? "更新卡片資訊" : "確認上傳並同步"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CardItem = ({ card, onClick, onView, onEdit, onDelete, count = 0, compact = false }) => {
  const colorClass = getCardColorStyles(card.color);
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);

  const handleTouchStart = () => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => { isLongPress.current = true; if (navigator.vibrate) navigator.vibrate(50); onView(card); }, 500);
  };
  const handleTouchEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };
  const handleTouchMove = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };
  const handleClick = (e) => { if (isLongPress.current) { e.preventDefault(); e.stopPropagation(); return; } onClick(card); };

  // 紅字樣式判斷 (當牌組超過60張時)
  const isOverLimit = count > 0; // 只要有數量就檢查
  // 這裡我們不傳入 deckLength，而是由外部控制是否要顯示紅字，但為了簡單，我們直接在 CardItem 內部無法得知 Deck 總數。
  // 我們改為在父層 App 傳遞一個 prop 叫做 `isMainDeckOverLimit`。
  // 但為了不改動太多介面，我們在 App.tsx 中直接處理樣式。
  
  return (
    <div onClick={handleClick} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchMove={handleTouchMove} className={`relative cursor-pointer transition-all duration-200 border-2 rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] select-none overflow-hidden group ${colorClass} ${compact ? "p-2 flex items-center justify-between text-sm min-h-[3.5rem]" : "p-3 flex flex-col gap-1"}`}>
      {card.imageUrl && !compact && <div className="absolute inset-0 opacity-30 pointer-events-none group-hover:opacity-40 transition-opacity"><img src={card.imageUrl} alt="" className="w-full h-full object-cover" /></div>}
      {!compact && card.isForbidden && <div className="absolute inset-0 bg-red-900/10 pointer-events-none z-0 border-4 border-red-500/50 rounded-lg"></div>}
      <div className={`relative z-10 w-full ${compact ? "flex items-center gap-3" : ""}`}>
        {compact && card.imageUrl && <div className="shrink-0 w-8 h-11 rounded border border-slate-300 overflow-hidden bg-white"><img src={card.imageUrl} className="w-full h-full object-cover" alt="" /></div>}
        <div className={`flex-1`}>
          <div className={`flex justify-between items-start ${compact ? "flex-col-reverse justify-center" : "mb-1"}`}>
            <h3 className={`font-bold ${compact ? "truncate w-full text-slate-700 text-sm" : "text-xl line-clamp-1"}`}>{card.name}</h3>
            <div className={`flex items-center gap-1 ${compact ? "w-full mb-0.5" : ""}`}>
              {/* 電腦版 hover 顯示，手機版永遠顯示 */}
              {!compact && <button onClick={(e) => { e.stopPropagation(); onView(card); }} className="p-1 text-current opacity-100 hover:bg-white/50 rounded-full transition-all md:opacity-0 md:group-hover:opacity-100" title="檢視"><Eye size={20} /></button>}
              <span className={`${compact ? 'font-mono font-black text-black text-sm bg-white/50 px-1 rounded -ml-0.5' : 'text-lg font-mono font-black bg-white/80 px-2 rounded border border-current/20 whitespace-nowrap ml-1 shadow-sm'}`}>{card.id}</span>
            </div>
          </div>
          {!compact && (
            <div className="flex flex-wrap items-center gap-1.5 text-sm opacity-90 font-semibold">
              <span className="text-xs font-bold border border-current px-1 rounded opacity-80 uppercase bg-white/30">{card.color}</span>
              <span className="bg-white/50 px-2 py-0.5 rounded text-current border border-current/20 text-xs">{card.type}</span>
              {card.level && <span className="text-xs font-bold bg-yellow-400 text-yellow-900 px-1 rounded shadow-sm">{card.level}</span>}
              {card.isFlip && <span className="flex items-center gap-0.5 text-xs bg-slate-800 text-white px-1.5 rounded font-bold tracking-wider">FLIP</span>}
              {card.isExtra && <span className="text-xs uppercase tracking-wider bg-purple-200 text-purple-900 px-1 rounded border border-purple-300">EXTRA</span>}
              {card.isForbidden && <span className="flex items-center gap-0.5 text-xs bg-red-600 text-white px-1.5 rounded font-bold"><Ban size={12}/> 禁止</span>}
              {card.isLimitOne && <span className="flex items-center gap-0.5 text-xs bg-orange-500 text-white px-1.5 rounded font-bold"><AlertOctagon size={12}/> Limit 1</span>}
            </div>
          )}
        </div>
      </div>
      {!compact && onEdit && onDelete && (
        <div className="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onEdit(card); }} className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 shadow-sm" title="編輯"><Pencil size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(card); }} className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 shadow-sm" title="刪除"><Trash2 size={14} /></button>
        </div>
      )}
      {count > 0 && <div className={`absolute -top-2 -right-2 bg-slate-800 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center shadow-md border-2 border-white z-10 ${count > LIMITS.COPY || (card.isLimitOne && count > 1) || card.isForbidden ? "bg-red-600 animate-bounce" : ""}`}>{count}</div>}
    </div>
  );
};

const StatBadge = ({ icon: Icon, label, current, max, color = "blue", warningAtFull = true }) => {
  const isFull = current >= max;
  const isOver = current > max;
  const colorStyle = (isOver || (isFull && warningAtFull)) ? 'bg-red-100 text-red-700 border-red-300' : `bg-${color}-50 text-${color}-700 border-${color}-200`;
  return (<div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-base font-medium border ${colorStyle}`}><Icon size={18} /><span>{label}:</span><span className={isOver ? "font-bold text-red-600" : ""}>{current} / {max}</span></div>);
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingError, setLoadingError] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [deck, setDeck] = useState({ main: [], extra: [] });
  const [deckName, setDeckName] = useState("我的餅乾牌組");
  const [filters, setFilters] = useState({ search: "", type: "ALL", color: "ALL", level: "ALL", series: "ALL", showExtra: false, showFlip: false, showAncient: false, showDragon: false, showBeast: false, showSoulJam: false });
  const [toastMsg, setToastMsg] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [viewingCard, setViewingCard] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const loadMoreRef = useRef(null);

  const LIMITS = { MAIN: 60, EXTRA: 6, COPY: 4, FLIP: 16 };

  // 安全防呆：確保 .env 讀不到時不會死機
  useEffect(() => { if (!document.querySelector('script[src="https://cdn.tailwindcss.com"]')) { const script = document.createElement("script"); script.src = "https://cdn.tailwindcss.com"; document.head.appendChild(script); } }, []);
  useEffect(() => { if (isOffline) return; if (!app && !auth) { /* 靜默處理，等待使用者切換或設定 */ } const timeoutId = setTimeout(() => { if (!user && !isOffline) setLoadingError("連線逾時 (請檢查設定或切換離線模式)"); }, 8000); const initAuth = async () => { if(!auth) return; try { await signInAnonymously(auth); } catch (err) { console.error(err); } }; initAuth(); const unsubscribe = auth ? onAuthStateChanged(auth, (u) => { if (u) { setUser(u); clearTimeout(timeoutId); setLoadingError(null); } }) : () => {}; return () => { unsubscribe(); clearTimeout(timeoutId); }; }, [isOffline]);
  useEffect(() => { const params = new URLSearchParams(window.location.search); if (params.get("cookieadmin") === "true") { setIsAdmin(true); setToastMsg("餅乾王國管理員模式已啟用 🍪"); } }, []);
  useEffect(() => { if (isOffline) { if (allCards.length === 0) { setAllCards(INITIAL_CARDS); setToastMsg("已載入離線模擬資料"); } return; } if (!user || !db) return; const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'cards')); const unsubscribe = onSnapshot(q, (snapshot) => { const cards = snapshot.docs.map(doc => doc.data()); cards.sort((a, b) => a.id.localeCompare(b.id)); setAllCards(cards); }, (error) => { console.error(error); setToastMsg("連線資料庫失敗"); }); return () => unsubscribe(); }, [user, isOffline]);
  useEffect(() => { if (allCards.length === 0) return; const params = new URLSearchParams(window.location.search); const deckData = params.get('d'); if (deckData) { try { const decoded = JSON.parse(decodeURIComponent(atob(deckData))); if (decoded.m) { const m = [], e = []; decoded.m.forEach(id => { const c = allCards.find(k => k.id === id); if(c) m.push(c); }); decoded.e.forEach(id => { const c = allCards.find(k => k.id === id); if(c) e.push(c); }); setDeck({ main: m, extra: e }); if(decoded.n) setDeckName(decoded.n); setToastMsg('牌組載入成功！'); } } catch (e) { console.error(e); } } }, [allCards]);

  const getCardCount = (cardId) => deck.main.filter(c => c.id === cardId).length + deck.extra.filter(c => c.id === cardId).length;
  const getFlipCount = () => deck.main.filter(c => c.isFlip).length;
  const nonFlipCookieCount = useMemo(() => deck.main.filter((c) => c.type === CARD_TYPES.COOKIE && c.isFlip === false).length, [deck.main]);
  const invalidForbidden = useMemo(() => deck.main.some(c => c.isForbidden) || deck.extra.some(c => c.isForbidden), [deck.main, deck.extra]);
  const invalidRestricted = useMemo(() => { const counts = {}; [...deck.main, ...deck.extra].forEach(c => { if(c.isLimitOne) counts[c.id] = (counts[c.id] || 0) + 1; }); return Object.values(counts).some(count => count > 1); }, [deck.main, deck.extra]);
  
  // 判斷主牌組是否超過上限
  const isMainDeckOverLimit = deck.main.length > LIMITS.MAIN;

  const addToDeck = (card) => {
    // 允許加入，但跳出警告
    const currentCount = getCardCount(card.id);
    if (card.isForbidden) {
        setToastMsg("🚫 警告：加入了禁止卡！");
        // 不 return，允許加入
    } else if (card.isLimitOne && currentCount >= 1) {
        setToastMsg("⚠️ 警告：限制卡已超過 1 張！");
        // 不 return，允許加入
    }

    const isExtra = isExtraDeckCard(card);
    const targetDeckKey = isExtra ? "extra" : "main";
    const limit = isExtra ? LIMITS.EXTRA : LIMITS.MAIN;
    const current = deck[targetDeckKey];

    if (isExtra && current.length >= limit) { setToastMsg(`額外牌組已滿 (${LIMITS.EXTRA}張)`); return; }
    // 主牌組移除硬上限
    
    if (currentCount >= LIMITS.COPY) { setToastMsg(`同名卡片最多 ${LIMITS.COPY} 張`); return; }
    if (card.isFlip && !isExtra && getFlipCount() >= LIMITS.FLIP) { setToastMsg(`Flip 卡片上限 ${LIMITS.FLIP} 張`); return; }
    
    setDeck((prev) => ({ ...prev, [targetDeckKey]: [...prev[targetDeckKey], card].sort((a, b) => a.id.localeCompare(b.id)) }));
  };

  const removeFromDeck = (card, fromExtra) => {
    const deckKey = fromExtra ? "extra" : "main";
    setDeck((prev) => { const newList = [...prev[deckKey]]; const index = newList.findIndex((c) => c.id === card.id); if (index > -1) newList.splice(index, 1); return { ...prev, [deckKey]: newList }; });
  };
  const clearDeck = () => { if (confirm("確定要清空所有牌組嗎？")) setDeck({ main: [], extra: [] }); };
  const handleShareClick = () => { if (deck.main.length > LIMITS.MAIN || invalidForbidden || invalidRestricted) { if (window.confirm("牌組含有違規項目(數量、禁止或限制卡)，確定要繼續分享嗎？")) setShowExportModal(true); } else { setShowExportModal(true); } };

  // 省略重複的 save/delete handler，功能同上 ... 
  const handleSaveCard = async (cardData) => { if (isOffline) { setAllCards(prev => { const existingIndex = prev.findIndex(c => c.id === cardData.id); if (existingIndex >= 0) { const newCards = [...prev]; newCards[existingIndex] = cardData; return newCards; } else { return [...prev, cardData].sort((a, b) => a.id.localeCompare(b.id)); } }); setShowAddModal(false); setEditingCard(null); setToastMsg("離線模式：已更新卡片"); return; } if (!user || !db) return; try { await setDoc(doc(db, "artifacts", appId, "public", "data", "cards", cardData.id), cardData); setToastMsg("成功"); setShowAddModal(false); } catch(e){ console.error(e); } };
  const handleBulkImport = async (cardsData) => { if(isOffline) { setAllCards(prev => { const map = new Map(prev.map(c=>[c.id,c])); cardsData.forEach(c=>map.set(c.id,c)); return Array.from(map.values()).sort((a,b)=>a.id.localeCompare(b.id)); }); setShowBulkModal(false); setToastMsg(`匯入 ${cardsData.length} 張`); return; } if(!db) return; const batch=writeBatch(db); cardsData.forEach(c=>{ if(c.id) batch.set(doc(db,"artifacts",appId,"public","data","cards",c.id), c); }); await batch.commit(); setShowBulkModal(false); setToastMsg("批量匯入成功"); };
  const handleDeleteCard = async (card) => { if(!confirm("刪除?")) return; if(isOffline) { setAllCards(p=>p.filter(c=>c.id!==card.id)); return; } await deleteDoc(doc(db,"artifacts",appId,"public","data","cards",card.id)); };
  const openEditModal = (c) => { setEditingCard(c); setShowAddModal(true); };
  const initializeDatabase = async () => { if(isOffline) { setAllCards(INITIAL_CARDS); return; } const batch=writeBatch(db); INITIAL_CARDS.forEach(c=>batch.set(doc(db,"artifacts",appId,"public","data","cards",c.id), c)); await batch.commit(); };

  const filteredCards = useMemo(() => allCards.filter((card) => { 
    const cardSeries = card.series || "";
    const search = filters.search.toLowerCase(); 
    const matchSearch = card.name.toLowerCase().includes(search) || card.id.toLowerCase().includes(search); 
    const matchType = filters.type === "ALL" || card.type === filters.type; 
    const matchColor = filters.color === "ALL" || card.color === filters.color; 
    const matchSeries = filters.series === "ALL" || (filters.series === "ST" ? cardSeries.includes("ST") : cardSeries === filters.series); 
    const matchLevel = filters.level === "ALL" || card.level === filters.level; 
    const matchExtra = filters.showExtra ? card.isExtra : true; 
    const matchFlip = filters.showFlip ? card.isFlip : true; 
    const matchAncient = filters.showAncient ? card.isAncient : true; 
    const matchDragon = filters.showDragon ? card.isDragon : true; 
    const matchBeast = filters.showBeast ? card.isBeast : true; 
    const matchSoulJam = filters.showSoulJam ? card.isSoulJam : true; 
    return matchSearch && matchType && matchColor && matchSeries && matchLevel && matchExtra && matchFlip && matchAncient && matchDragon && matchBeast && matchSoulJam; 
  }), [filters, allCards]);
  
  useEffect(() => { setVisibleCount(30); }, [filteredCards]);
  const displayedCards = useMemo(() => filteredCards.slice(0, visibleCount), [filteredCards, visibleCount]);
  useEffect(() => { const observer = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) setVisibleCount((prev) => prev + 30); }, { threshold: 0.5 }); if (loadMoreRef.current) observer.observe(loadMoreRef.current); return () => observer.disconnect(); }, [displayedCards]);

  if ((loadingError || !auth) && !isOffline) return ( <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center"> <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full border border-red-100"> <AlertCircle size={48} className="mx-auto text-red-500 mb-4" /> <h2 className="text-xl font-bold text-slate-800 mb-2">無法連線至資料庫</h2> <p className="text-slate-600 mb-6 bg-red-50 p-3 rounded text-sm">{loadingError || "請稍候..."}</p> <div className="flex flex-col gap-3"> <button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold w-full transition-colors flex items-center justify-center gap-2"><RefreshCw size={18} /> 重新整理頁面</button> <button onClick={() => { setIsOffline(true); setLoadingError(null); setUser({ uid: 'offline-user', isAnonymous: true }); setIsAdmin(true); }} className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-bold w-full transition-colors flex items-center justify-center gap-2"><WifiOff size={18} /> 進入離線模擬模式</button> </div> </div> </div> );
  if (!user && !isOffline) return (<div className="flex h-screen items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>);

  return (
    <div className="flex fixed inset-0 flex-col md:flex-row bg-slate-50 overflow-hidden font-sans text-slate-900 overscroll-contain h-[100dvh]">
      {viewingCard && <CardDetailModal card={viewingCard} onClose={() => setViewingCard(null)} />}
      <Toast message={toastMsg} onClose={() => setToastMsg(null)} />
      {showAddModal && <AddCardModal onClose={() => { setShowAddModal(false); setEditingCard(null); }} onAdd={handleSaveCard} isProcessing={isProcessing} initialData={editingCard} />}
      {showBulkModal && <BulkImportModal onClose={() => setShowBulkModal(false)} onImport={handleBulkImport} isProcessing={isProcessing} />}
      {showExportModal && <ExportModal deck={deck} deckName={deckName} onClose={() => setShowExportModal(false)} />}

      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 min-h-0">
        <div className="p-5 bg-white border-b border-slate-200 shadow-sm z-10 space-y-4 shrink-0">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold flex items-center gap-2 text-slate-800">
                <Cloud className={isOffline ? "text-slate-400" : "text-blue-600"} size={32} />
                {isOffline ? "Braverse Builder (離線模擬)" : "Cookierun: Braverse Deck Builder"}
            </h1>
            <div className="flex gap-2">
              {isAdmin ? (
                <>
                  <button onClick={() => { setEditingCard(null); setShowAddModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-base font-bold flex items-center gap-2 shadow transition-colors"><Plus size={20} /> 新增</button>
                  <button onClick={() => setShowBulkModal(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-base font-bold flex items-center gap-2 shadow transition-colors"><FileJson size={20} /> 匯入</button>
                </>
              ) : (<div className="flex items-center gap-1 text-slate-500 text-base bg-slate-100 px-3 py-2 rounded font-medium"><Lock size={18} /> 僅供瀏覽</div>)}
              <span className="text-base text-slate-600 bg-slate-100 px-4 py-2 rounded flex items-center font-bold">共 {filteredCards.length} 張</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-base text-orange-500 font-bold ml-10">先行測試版本，有Bug請私訊樂多綠YT或粉絲專頁</p>
            {isOffline && <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-1.5 rounded text-sm flex items-center gap-2 mt-1"><WifiOff size={16} /><span>目前為離線模式，您的變更不會儲存到資料庫。</span></div>}
          </div>
          <div className="flex flex-col gap-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input type="text" placeholder="搜尋名稱或編號..." className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-lg" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              <div className="relative flex-1 min-w-[140px]"><Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><select className="w-full pl-10 pr-8 py-3 bg-slate-100 border-none rounded-lg appearance-none cursor-pointer text-base font-medium" value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})}>{['ALL', ...Object.values(CARD_TYPES)].map(t => <option key={t} value={t}>{t === 'ALL' ? '全部種類' : t}</option>)}</select></div>
              <div className="relative flex-1 min-w-[140px]"><Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><select className="w-full pl-10 pr-8 py-3 bg-slate-100 border-none rounded-lg appearance-none cursor-pointer text-base font-medium" value={filters.color} onChange={(e) => setFilters({...filters, color: e.target.value})}>{['ALL', ...Object.values(CARD_COLORS)].map(c => <option key={c} value={c}>{c === 'ALL' ? '全部顏色' : c}</option>)}</select></div>
              <div className="relative flex-1 min-w-[140px]"><Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><select className="w-full pl-10 pr-8 py-3 bg-slate-100 border-none rounded-lg appearance-none cursor-pointer text-base font-medium" value={filters.series} onChange={(e) => setFilters({...filters, series: e.target.value})}>
                  <option value="ALL">全部系列</option>
                  {CARD_SERIES_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select></div>
              <div className="relative flex-1 min-w-[140px]"><Star className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><select className="w-full pl-10 pr-8 py-3 bg-slate-100 border-none rounded-lg appearance-none cursor-pointer text-base font-medium" value={filters.level} onChange={(e) => setFilters({...filters, level: e.target.value})}>
                  <option value="ALL">全部等級</option>
                  {Object.values(CARD_LEVELS).map((l) => (<option key={l} value={l}>{l}</option>))}
                </select></div>
            </div>
            <div className="flex flex-wrap gap-3 mt-1 pl-1">
              <label className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-transform active:scale-95"><input type="checkbox" className="hidden peer" checked={filters.showExtra} onChange={(e) => setFilters({ ...filters, showExtra: e.target.checked })} /><span className="text-xs uppercase tracking-wider bg-purple-200 text-purple-900 px-3 py-1.5 rounded border border-purple-300 peer-checked:ring-2 peer-checked:ring-purple-500 opacity-60 peer-checked:opacity-100 font-bold select-none">[EXTRA] 篩選</span></label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-transform active:scale-95"><input type="checkbox" className="hidden peer" checked={filters.showFlip} onChange={(e) => setFilters({ ...filters, showFlip: e.target.checked })} /><span className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded font-bold tracking-wider peer-checked:ring-2 peer-checked:ring-slate-500 opacity-60 peer-checked:opacity-100 select-none">[FLIP] 篩選</span></label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-transform active:scale-95"><input type="checkbox" className="hidden peer" checked={filters.showAncient} onChange={(e) => setFilters({ ...filters, showAncient: e.target.checked })} /><span className="text-xs bg-amber-100 text-amber-800 px-3 py-1.5 rounded font-bold border border-amber-300 peer-checked:ring-2 peer-checked:ring-amber-500 opacity-60 peer-checked:opacity-100 select-none">[上古] 篩選</span></label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-transform active:scale-95"><input type="checkbox" className="hidden peer" checked={filters.showDragon} onChange={(e) => setFilters({ ...filters, showDragon: e.target.checked })} /><span className="text-xs bg-red-100 text-red-800 px-3 py-1.5 rounded font-bold border border-red-300 peer-checked:ring-2 peer-checked:ring-red-500 opacity-60 peer-checked:opacity-100 select-none">[龍族] 篩選</span></label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-transform active:scale-95"><input type="checkbox" className="hidden peer" checked={filters.showBeast} onChange={(e) => setFilters({ ...filters, showBeast: e.target.checked })} /><span className="text-xs bg-stone-800 text-stone-100 px-3 py-1.5 rounded font-bold border border-stone-600 peer-checked:ring-2 peer-checked:ring-stone-500 opacity-60 peer-checked:opacity-100 select-none">[野獸] 篩選</span></label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-transform active:scale-95"><input type="checkbox" className="hidden peer" checked={filters.showSoulJam} onChange={(e) => setFilters({ ...filters, showSoulJam: e.target.checked })} /><span className="text-xs bg-pink-100 text-pink-800 px-3 py-1.5 rounded font-bold border border-pink-300 peer-checked:ring-2 peer-checked:ring-pink-500 opacity-60 peer-checked:opacity-100 select-none">[靈魂果醬] 篩選</span></label>
            </div>
          </div>
        </div>
        
        {/* 卡片列表 (修正手機版捲動問題 + 字體放大) */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
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
            <div ref={loadMoreRef} className="col-span-full h-10 flex items-center justify-center text-slate-400 text-base font-medium">
                {displayedCards.length < filteredCards.length ? "載入更多..." : "已顯示所有卡片"}
            </div>
          </div>
        </div>

        {/* 頁尾 */}
        <div className="p-4 border-t border-slate-200 text-center text-sm text-slate-500 bg-white shrink-0 font-medium">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <span>製作者：樂多綠Gamecaster</span>
            <div className="flex items-center gap-3">
              <a href="https://youtube.com/channel/UCrCpJhh9eGwVJBflpFNYvpA?si=194cVfXvPKFlFigk" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700 transition-colors flex items-center gap-1 font-bold"><Youtube size={18} /> YouTube</a>
              <a href="https://www.facebook.com/groups/CookierunBraverseTW" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1 font-bold"><Cookie size={18} /> CRTCG薑餅人對戰卡牌/台灣</a>
            </div>
          </div>
        </div>
      </div>

      {/* 右側 (手機版下方) 牌組區塊 */}
      <div className="w-full md:w-96 shrink-0 h-[35%] md:h-auto flex flex-col bg-white shadow-xl z-20 border-t border-slate-300 md:border-t-0">
        <div className="p-4 bg-slate-800 text-white border-b border-slate-700 shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 flex-1"><Box size={24} className="text-blue-400"/> 目前牌組</h2>
            <div className="flex gap-2">
              <button onClick={handleShareClick} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded transition-colors" title="分享/輸出"><Share2 size={20} /></button>
              <button onClick={clearDeck} className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded transition-colors text-base font-bold flex items-center gap-1"><Trash2 size={18} /> 🧹 清空</button>
            </div>
          </div>
          <input type="text" value={deckName} onChange={(e) => setDeckName(e.target.value)} className="bg-transparent text-xl font-bold text-white border-b border-white/20 focus:border-white outline-none w-full placeholder-slate-400 mb-3" placeholder="命名你的牌組..." />
          <div className="flex flex-wrap gap-2">
            <StatBadge icon={Layers} label="主牌組" current={deck.main.length} max={LIMITS.MAIN} color="blue" warningAtFull={false} />
            <StatBadge icon={Zap} label="額外" current={deck.extra.length} max={LIMITS.EXTRA} color="purple" />
            <StatBadge icon={RotateCw} label="Flip" current={flipCount} max={LIMITS.FLIP} color="orange" />
          </div>
        </div>
        
        {/* 常駐警告區塊 - 修復顯示邏輯 */}
        {(invalidForbidden || invalidRestricted) && (
            <div className="bg-red-100 text-red-800 p-4 text-base font-bold border-b border-red-200 flex items-start gap-3 shrink-0 animate-pulse">
                <AlertCircle size={24} className="shrink-0 mt-0.5" />
                <span>此牌組包含超過數量上限的禁止與限制卡，正式比賽將無法使用。</span>
            </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <section>
            <h3 className={`text-base font-bold uppercase tracking-wider mb-2 px-1 flex justify-between ${isMainDeckOverLimit ? 'text-red-600 animate-pulse' : 'text-slate-500'}`}>主牌組清單 <span>{deck.main.length} / {LIMITS.MAIN}</span></h3>
            <div className="space-y-2 min-h-[100px]">
              {groupedMainDeck.length === 0 ? <div className="h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 text-lg bg-slate-100"><Layers size={28} className="mb-2 opacity-50"/><span>點擊左側卡片加入</span></div> : 
               groupedMainDeck.map(group => <CardItem key={`main-group-${group.id}`} card={group} compact={true} count={group.stackCount} onClick={(c) => removeFromDeck(c, false)} onView={setViewingCard} />)}
            </div>
          </section>
          <section>
            <h3 className="text-base font-bold text-slate-500 uppercase tracking-wider mb-2 px-1 flex justify-between">額外牌組 <span>{deck.extra.length} / {LIMITS.EXTRA}</span></h3>
            <div className="space-y-2">
               {groupedExtraDeck.length === 0 ? <div className="h-20 border-2 border-dashed border-purple-200 rounded-lg flex items-center justify-center text-purple-400 text-base bg-purple-50"><span>加入額外牌組卡片</span></div> : 
                groupedExtraDeck.map(group => <CardItem key={`extra-group-${group.id}`} card={group} compact={true} count={group.stackCount} onClick={(c) => removeFromDeck(c, true)} onView={setViewingCard} />)}
            </div>
          </section>
          <section className="bg-orange-50 p-5 rounded-lg border border-orange-200">
             <h4 className="flex items-center gap-2 text-orange-800 font-bold text-lg mb-3"><AlertTriangle size={20} /> 牌組檢查</h4>
             <div className="text-sm text-orange-800/80 font-mono mb-4 border-b border-orange-200 pb-3 leading-relaxed">
              ※相同編號卡最多4張<br/>
              ※FLIP卡最多16張<br/>
              ※禁止卡無法投入<br/>
              ※限制卡最多1張
             </div>
             <ul className="text-base text-orange-700 space-y-2 list-disc pl-5">
               {nonFlipCookieCount < 20 && <li>主牌組建議至少 20 張餅乾卡 (目前 {nonFlipCookieCount})<span className="text-xs opacity-75 ml-1">(不含 FLIP)</span></li>}
               {deck.main.length > LIMITS.MAIN && <li className="text-red-600 font-bold">主牌組已超過上限 ({deck.main.length}/60)</li>}
               {deck.extra.length === LIMITS.EXTRA && <li className="text-red-600 font-bold">額外牌組已達上限</li>}
               {flipCount === LIMITS.FLIP && <li className="text-red-600 font-bold">Flip 卡片已達上限 ({LIMITS.FLIP})</li>}
               {nonFlipCookieCount >= 20 && deck.main.length <= LIMITS.MAIN && deck.extra.length < LIMITS.EXTRA && flipCount < LIMITS.FLIP && !invalidForbidden && !invalidRestricted && <li className="text-emerald-600 list-none -ml-5 flex items-center gap-2 font-bold"><CheckCircle size={20}/> 牌組目前合規</li>}
             </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
