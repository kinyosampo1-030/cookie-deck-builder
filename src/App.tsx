import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Filter, Trash2, AlertCircle, Layers, Box, Zap, AlertTriangle, Palette, RotateCw, Plus, X, Image as ImageIcon, Upload, Eye, Share2, Download, Link as LinkIcon, Copy, Database, Cloud, Lock, RefreshCw, FileJson, WifiOff, Pencil } from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, query, writeBatch, deleteDoc } from 'firebase/firestore';

// --- Firebase 初始化 ---
let app = null;
let auth = null;
let db = null;
const appId = 'my-deck-builder-v1';

// ==========================================
//  Firebase 設定 (保留您的 API Key)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDK-feks4M0aZaJY4-gFcP_TxVcJLfMuxo",
  authDomain: "cookierunbraverse.firebaseapp.com",
  projectId: "cookierunbraverse",
  storageBucket: "cookierunbraverse.firebasestorage.app",
  messagingSenderId: "1061622650816",
  appId: "1:1061622650816:web:b61e2490336b244bf01a25",
  measurementId: "G-YK70VGHNRN"
};
// ==========================================

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase 初始化失敗:", e);
}

// --- 常數定義 ---
const CARD_TYPES = { COOKIE: '餅乾卡', ITEM: '道具卡', TRAP: '陷阱卡', SCENE: '場景卡' };
const CARD_COLORS = { RED: '紅色', YELLOW: '黃色', GREEN: '綠色', BLUE: '藍色', PURPLE: '紫色', COLORLESS: '無色' };
const CARD_SERIES_OPTIONS = ['BS1', 'BS2', 'BS3', 'BS4', 'BS5', 'BS6', 'BS7', 'BS8', 'BS9', 'P'];

// 預設卡片資料 (用於初始化或離線模擬)
const INITIAL_CARDS = [
  { id: 'BS1-001', series: 'BS1', number: '001', name: '勇氣餅乾', type: CARD_TYPES.COOKIE, color: CARD_COLORS.RED, level: 'LV.1', isExtra: false, isFlip: true, imageUrl: null },
  { id: 'BS1-002', series: 'BS1', number: '002', name: '草莓果醬劍', type: CARD_TYPES.ITEM, color: CARD_COLORS.RED, level: null, isExtra: false, isFlip: false, imageUrl: null },
  { id: 'BS1-003', series: 'BS1', number: '003', name: '幸運四葉草', type: CARD_TYPES.ITEM, color: CARD_COLORS.GREEN, level: null, isExtra: false, isFlip: false, imageUrl: null },
];

const isExtraDeckCard = (card) => card.isExtra === true;

const getCardColorStyles = (color) => {
  switch (color) {
    case CARD_COLORS.RED: return 'bg-red-50 border-red-500 text-red-900';
    case CARD_COLORS.YELLOW: return 'bg-yellow-50 border-yellow-500 text-yellow-900';
    case CARD_COLORS.GREEN: return 'bg-emerald-50 border-emerald-500 text-emerald-900';
    case CARD_COLORS.BLUE: return 'bg-blue-50 border-blue-500 text-blue-900';
    case CARD_COLORS.PURPLE: return 'bg-purple-50 border-purple-500 text-purple-900';
    case CARD_COLORS.COLORLESS: return 'bg-slate-100 border-slate-400 text-slate-800';
    default: return 'bg-gray-100 border-gray-400 text-gray-800';
  }
};

const groupCards = (cardList) => {
  const groups = {};
  cardList.forEach(card => {
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
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// --- 元件 ---

const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[80] animate-bounce">
      <div className="bg-slate-800 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-2 font-bold border border-slate-600">
        <AlertCircle size={20} className="text-blue-400"/>
        {message}
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
    "isExtra": false
  }
]`;

  return (
    <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileJson className="text-green-600" /> 批量匯入卡片 (JSON)
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
          <div className="bg-blue-50 p-4 rounded text-sm text-blue-800 border border-blue-200">
            <p className="font-bold mb-1">使用說明：</p>
            <p>
              請將您的卡片資料整理為 <strong>JSON 陣列</strong> 格式貼入下方。<br />
              您可以先在 Excel 整理，然後請 AI 幫您：「將這些資料轉為 JSON 格式，欄位包含 id, series, number, name, type, color, isFlip, isExtra」。
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
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold">取消</button>
          <button onClick={handleImport} disabled={isProcessing || !jsonInput} className="px-6 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg font-bold disabled:opacity-50 flex items-center gap-2">
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
      <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors">
          <X size={32} />
        </button>
        {card.imageUrl ? (
           <img src={card.imageUrl} alt={card.name} className="w-full h-auto rounded-lg shadow-2xl border-2 border-white/20" />
        ) : (
           <div className={`w-full aspect-[3/4] rounded-xl p-8 flex flex-col shadow-2xl border-8 ${getCardColorStyles(card.color)} bg-white`}>
              <h1 className="text-4xl font-bold mb-2">{card.name}</h1>
              <p className="text-xl font-mono opacity-60 mb-8">{card.id}</p>
              <div className="text-2xl opacity-40 text-center mt-20">無圖片預覽</div>
           </div>
        )}
      </div>
    </div>
  );
};

const ExportModal = ({ deck, allCards, onClose }) => {
  const [activeTab, setActiveTab] = useState('image');
  const exportRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (!window.html2canvas) {
      const script = document.createElement('script');
      script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const mainIds = deck.main.map(c => c.id);
    const extraIds = deck.extra.map(c => c.id);
    const data = JSON.stringify({ m: mainIds, e: extraIds });
    const encoded = btoa(encodeURIComponent(data));
    const baseUrl = window.location.href.split('?')[0];
    const url = `${baseUrl}?d=${encoded}`;
    setShareUrl(url);
  }, [deck]);

  const handleDownloadImage = async () => {
    if (!window.html2canvas) { alert("組件載入中，請稍後再試..."); return; }
    setIsGenerating(true);
    try {
      const canvas = await window.html2canvas(exportRef.current, { scale: 2, backgroundColor: '#f8fafc', useCORS: true });
      const link = document.createElement('a');
      link.download = `my-deck-${new Date().toISOString().slice(0,10)}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (err) { console.error(err); alert("圖片生成失敗，請重試"); } finally { setIsGenerating(false); }
  };

  const handleCopyLink = () => { navigator.clipboard.writeText(shareUrl); alert("連結已複製到剪貼簿！"); };
  const groupedMain = useMemo(() => groupCards(deck.main), [deck.main]);
  const groupedExtra = useMemo(() => groupCards(deck.extra), [deck.extra]);

  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2"><Share2 className="text-blue-600" /> 輸出與分享</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={24} /></button>
        </div>
        <div className="flex border-b">
          <button onClick={() => setActiveTab('image')} className={`flex-1 py-3 font-bold text-sm ${activeTab === 'image' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}>圖片輸出</button>
          <button onClick={() => setActiveTab('link')} className={`flex-1 py-3 font-bold text-sm ${activeTab === 'link' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}>連結分享</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
          {activeTab === 'image' && (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded shadow w-full flex justify-between items-center">
                <span className="text-slate-600 text-sm">將牌組匯出為高解析度 PNG 圖片</span>
                <button onClick={handleDownloadImage} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50">{isGenerating ? '生成中...' : <><Download size={18} /> 下載圖片</>}</button>
              </div>
              <div ref={exportRef} className="bg-white p-8 rounded-lg shadow-lg w-full max-w-[800px] min-h-[600px] border border-slate-200">
                <div className="flex justify-between items-end border-b-2 border-slate-800 pb-4 mb-6">
                  <div><h1 className="text-3xl font-bold text-slate-900">DECK LIST</h1><p className="text-slate-500 mt-1">Total Cards: {deck.main.length + deck.extra.length}</p></div>
                  <div className="text-right"><div className="text-sm font-bold text-slate-400">CREATED WITH</div><div className="text-xl font-black text-blue-600">DECK BUILDER</div></div>
                </div>
                <div className="mb-8">
                  <h3 className="font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded inline-block mb-3">MAIN DECK ({deck.main.length})</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {groupedMain.map(group => (
                      <div key={group.id} className={`border rounded p-2 text-xs relative overflow-hidden h-16 flex flex-col justify-between ${getCardColorStyles(group.color)}`}>
                        {group.imageUrl && <img src={group.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-20" alt="" />}
                        <div className="relative z-10 font-bold line-clamp-2">{group.name}</div>
                        <div className="relative z-10 flex justify-between items-end"><span className="font-mono opacity-70">{group.id}</span><span className="bg-slate-900 text-white px-1.5 rounded text-[10px]">x{group.stackCount}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 bg-purple-100 text-purple-900 px-3 py-1 rounded inline-block mb-3">EXTRA DECK ({deck.extra.length})</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {groupedExtra.length > 0 ? groupedExtra.map(group => (
                       <div key={group.id} className={`border rounded p-2 text-xs relative overflow-hidden h-16 flex flex-col justify-between ${getCardColorStyles(group.color)}`}>
                        {group.imageUrl && <img src={group.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-20" alt="" />}
                        <div className="relative z-10 font-bold line-clamp-2">{group.name}</div>
                        <div className="relative z-10 flex justify-between items-end"><span className="font-mono opacity-70">{group.id}</span><span className="bg-slate-900 text-white px-1.5 rounded text-[10px]">x{group.stackCount}</span></div>
                      </div>
                    )) : <div className="text-slate-400 text-sm italic col-span-4">Empty Extra Deck</div>}
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'link' && (
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
    series: 'BS1',
    number: '',
    name: '',
    color: CARD_COLORS.RED,
    type: CARD_TYPES.COOKIE,
    level: CARD_LEVELS.LV1,
    isFlip: false,
    isExtra: false,
    imageUrl: '',
  });

  const [previewUrl, setPreviewUrl] = useState(null);

  // 初始化資料 (編輯模式)
  useEffect(() => {
    if (initialData) {
      // 處理 ID 解析：如果不符合 Series-Number 格式，就做簡單處理，避免 crash
      let derivedSeries = 'BS1';
      let derivedNumber = '';
      
      if (initialData.id && initialData.id.includes('-')) {
        const parts = initialData.id.split("-");
        derivedSeries = parts[0] || 'BS1';
        derivedNumber = parts[1] || '';
      } else {
        // 如果 ID 是非標準格式 (例如 "MyCard001")，將整個 ID 視為編號顯示
        derivedNumber = initialData.id || '';
      }

      setFormData(prev => ({
        ...prev, // 保留預設值
        ...initialData, // 填入卡片原始資料 (如 name, type, color, imageUrl)
        // 強制使用解析出來的 series 和 number，確保 UI 顯示正確，並覆蓋可能不一致的舊資料
        series: derivedSeries,
        number: derivedNumber
      }));

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
    if (!formData.name) { alert('請填寫卡片名稱'); return; }
    
    // 安全檢查
    if (formData.imageUrl && formData.imageUrl.length > 1048400) {
      alert("圖片壓縮後依然過大！請更換一張解析度較低的圖片。");
      return;
    }

    // 關鍵修正：如果是編輯模式 (initialData 存在)，強制使用原始 ID，避免資料重複或錯誤
    let fullId;
    if (initialData && initialData.id) {
        fullId = initialData.id;
    } else {
        // 新增模式才組合 ID
        if (!formData.number) { alert('請填寫編號'); return; }
        fullId = `${formData.series}-${formData.number}`;
    }

    // 確保非餅乾卡不會有 level
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
            {initialData ? <><Pencil className="text-blue-600" /> 編輯卡片</> : <><Plus className="text-blue-600" /> 新增自定義卡片</>}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className={`bg-slate-50 p-3 rounded border ${initialData ? "opacity-70 pointer-events-none" : ""}`}>
              <label className="block text-sm font-bold text-slate-700 mb-2">卡片編號 (ID) {initialData && <span className="text-xs text-red-500 ml-2">編輯模式無法修改</span>}</label>
              <div className="flex gap-2 items-center">
                <select className="border rounded p-2 bg-white flex-1" value={formData.series} onChange={e => setFormData({...formData, series: e.target.value})}>
                  {CARD_SERIES_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <span className="font-bold text-slate-400">-</span>
                <input type="text" placeholder="001" required={!initialData} className="border rounded p-2 flex-1" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">卡片名稱</label>
              <input type="text" required className="w-full border rounded p-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">種類</label>
                <select className="w-full border rounded p-2" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  {Object.values(CARD_TYPES).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">顏色</label>
                <select className="w-full border rounded p-2" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})}>
                  {Object.values(CARD_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {formData.type === CARD_TYPES.COOKIE && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">等級 (Level)</label>
                <select className="w-full border rounded p-2" value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})}>
                  {Object.values(CARD_LEVELS).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-lg border space-y-3">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-5 h-5" checked={formData.isFlip} onChange={e => setFormData({...formData, isFlip: e.target.checked})} /><span>FLIP</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-5 h-5" checked={formData.isExtra} onChange={e => setFormData({...formData, isExtra: e.target.checked})} /><span>Extra Deck</span></label>
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
            <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold disabled:opacity-50">
              {isProcessing ? '處理中...' : (initialData ? '更新卡片資訊' : '確認上傳並同步')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 修改後的 CardItem，支援長按檢視 + 編輯/刪除按鈕
const CardItem = ({ card, onClick, onView, onEdit, onDelete, count = 0, compact = false }) => {
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
      className={`relative cursor-pointer transition-all duration-200 border-2 rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] select-none overflow-hidden group ${colorClass} ${compact ? 'p-2 flex items-center justify-between text-sm min-h-[3.5rem]' : 'p-3 flex flex-col gap-1'}`}
    >
      {card.imageUrl && <div className="absolute inset-0 opacity-30 pointer-events-none group-hover:opacity-40 transition-opacity"><img src={card.imageUrl} alt="" className="w-full h-full object-cover" /></div>}
      <div className="relative z-10 w-full">
        <div className="flex justify-between items-start mb-1">
          <h3 className={`font-bold ${compact ? 'truncate w-3/4' : 'text-lg line-clamp-1'}`}>{card.name}</h3>
          <div className="flex items-center gap-1">
             <button onClick={(e) => { e.stopPropagation(); onView(card); }} className="p-1 text-current opacity-0 group-hover:opacity-100 hover:bg-white/50 rounded-full transition-all" title="檢視詳細大圖"><Eye size={16} /></button>
             {!compact && <span className="text-xs font-mono font-bold opacity-60 bg-white/50 px-1 rounded border border-current/20 whitespace-nowrap ml-1">{card.id}</span>}
          </div>
        </div>
        {!compact && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs opacity-90 font-semibold">
             <span className="text-[10px] font-bold border border-current px-1 rounded opacity-80 uppercase bg-white/30">{card.color}</span>
             <span className="bg-white/50 px-2 py-0.5 rounded text-current border border-current/20">{card.type}</span>
             {card.level && <span className="text-[10px] font-bold bg-yellow-400 text-yellow-900 px-1 rounded shadow-sm">{card.level}</span>}
             {card.isFlip && <span className="flex items-center gap-0.5 text-[10px] bg-slate-800 text-white px-1.5 rounded font-bold tracking-wider">FLIP</span>}
             {card.isExtra && <span className="text-[10px] uppercase tracking-wider bg-purple-200 text-purple-900 px-1 rounded border border-purple-300">EXTRA</span>}
          </div>
        )}
      </div>
      
      {!compact && onEdit && onDelete && (
        <div className="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onEdit(card); }} className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 shadow-sm" title="編輯"><Pencil size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(card); }} className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 shadow-sm" title="刪除"><Trash2 size={14} /></button>
        </div>
      )}

      {compact && <div className="text-[10px] opacity-70 font-mono ml-2 relative z-10 bg-white/40 px-1 rounded backdrop-blur-[1px]">{card.id}</div>}
      {count > 0 && <div className="absolute -top-2 -right-2 bg-slate-800 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white z-10">{count}</div>}
    </div>
  );
};

const StatBadge = ({ icon: Icon, label, current, max, color = "blue", warningAtFull = true }) => {
  const isFull = current >= max;
  const colorStyle = isFull && warningAtFull ? 'bg-red-50 text-red-600 border-red-200' : `bg-${color}-50 text-${color}-700 border-${color}-200`;
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${colorStyle}`}>
      <Icon size={16} /><span>{label}:</span><span className={isFull ? "font-bold" : ""}>{current} / {max}</span>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingError, setLoadingError] = useState(null);
  const [allCards, setAllCards] = useState([]); 
  const [deck, setDeck] = useState({ main: [], extra: [] });
  const [filters, setFilters] = useState({ search: '', type: 'ALL', color: 'ALL' });
  const [toastMsg, setToastMsg] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [viewingCard, setViewingCard] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  
  // 新增狀態：離線模式
  const [isOffline, setIsOffline] = useState(false);

  const LIMITS = { MAIN: 60, EXTRA: 6, COPY: 4, FLIP: 16 };

  // 0. 自動注入 Tailwind
  useEffect(() => {
    if (!document.querySelector('script[src="https://cdn.tailwindcss.com"]')) {
      const script = document.createElement('script');
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

  // 1. Firebase Auth
  useEffect(() => {
    if (isOffline) return; // 離線模式跳過 Auth

    if (!auth) { setLoadingError("Firebase 設定錯誤"); return; }
    
    // 增加逾時偵測，但如果成功登入會清除
    const timeoutId = setTimeout(() => { 
        if (!user && !isOffline) setLoadingError("連線逾時 (可能被瀏覽器阻擋)"); 
    }, 10000);

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { 
          console.error("登入失敗:", err); 
          // 登入失敗不直接顯示錯誤，等待 timeout 或使用者切換離線模式
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) { 
        setUser(u); 
        clearTimeout(timeoutId); 
        setLoadingError(null); 
      }
    });
    return () => { unsubscribe(); clearTimeout(timeoutId); };
  }, [isOffline]);

  // 1.5 Admin Check
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('cookieadmin') === 'true') {
      setIsAdmin(true);
      setToastMsg("餅乾王國管理員模式已啟用 🍪");
    }
  }, []);

  // 2. Firestore Sync & Data Fetching
  useEffect(() => {
    // 離線模式處理
    if (isOffline) {
        if (allCards.length === 0) {
            setAllCards(INITIAL_CARDS);
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
    }, (error) => { console.error("Firestore sync error:", error); setToastMsg("連線資料庫失敗，請檢查網路"); });
    return () => unsubscribe();
  }, [user, isOffline]);

  // Load Deck from URL
  useEffect(() => {
    if (allCards.length === 0) return; 
    const params = new URLSearchParams(window.location.search);
    const deckData = params.get('d');
    if (deckData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(deckData)));
        if (decoded.m && decoded.e) {
          const mainCards = [], extraCards = [];
          decoded.m.forEach(id => { const c = allCards.find(c => c.id === id); if (c) mainCards.push(c); });
          decoded.e.forEach(id => { const c = allCards.find(c => c.id === id); if (c) extraCards.push(c); });
          setDeck({ main: mainCards, extra: extraCards });
          setToastMsg('已成功載入分享的牌組！');
        }
      } catch (e) { console.error("牌組載入失敗", e); }
    }
  }, [allCards]);

  const getCardCount = (cardId) => deck.main.filter(c => c.id === cardId).length + deck.extra.filter(c => c.id === cardId).length;
  const getFlipCount = () => deck.main.filter(c => c.isFlip).length;

  const addToDeck = (card) => {
    const isExtra = isExtraDeckCard(card);
    const targetDeckKey = isExtra ? 'extra' : 'main';
    const targetLimit = isExtra ? LIMITS.EXTRA : LIMITS.MAIN;
    const currentDeck = deck[targetDeckKey];

    if (currentDeck.length >= targetLimit) { setToastMsg(`${isExtra ? '額外' : '主'}牌組已滿`); return; }
    if (getCardCount(card.id) >= LIMITS.COPY) { setToastMsg(`同名卡片最多 ${LIMITS.COPY} 張`); return; }
    if (card.isFlip && !isExtra && getFlipCount() >= LIMITS.FLIP) { setToastMsg(`Flip 卡片上限為 ${LIMITS.FLIP} 張`); return; }

    setDeck(prev => ({ ...prev, [targetDeckKey]: [...prev[targetDeckKey], card].sort((a, b) => a.id.localeCompare(b.id)) }));
  };

  const removeFromDeck = (card, fromExtra) => {
    const deckKey = fromExtra ? 'extra' : 'main';
    setDeck(prev => {
      const newDeckList = [...prev[deckKey]];
      const index = newDeckList.findIndex(c => c.id === card.id);
      if (index > -1) newDeckList.splice(index, 1);
      return { ...prev, [deckKey]: newDeckList };
    });
  };

  const clearDeck = () => { if(confirm('確定要清空所有牌組嗎？')) setDeck({ main: [], extra: [] }); };

  // 新增/更新 單張卡片
  const handleSaveCard = async (cardData) => {
    // 離線模式處理
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
    if (!editingCard && allCards.some(c => c.id === cardData.id)) {
      if (!confirm('此卡片編號已存在，確定要覆蓋嗎？')) return;
    }

    setIsProcessing(true);
    try {
      const cardRef = doc(db, 'artifacts', appId, 'public', 'data', 'cards', cardData.id);
      await setDoc(cardRef, cardData);
      setToastMsg(editingCard ? "卡片更新成功" : "卡片新增成功");
      setShowAddModal(false);
      setEditingCard(null);
    } catch (err) {
      console.error("Save failed", err);
      setToastMsg("儲存失敗");
    } finally { setIsProcessing(false); }
  };

  // 批量匯入處理
  const handleBulkImport = async (cardsData) => {
    // 離線模式處理
    if (isOffline) {
        setAllCards(prev => {
            // 合併新舊資料，以 ID 為準
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
      cardsData.forEach(card => {
        if (!card.id || !card.name) return; // 簡單過濾無效資料
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'cards', card.id);
        batch.set(ref, card);
        count++;
      });
      await batch.commit();
      setToastMsg(`成功匯入 ${count} 張卡片！`);
      setShowBulkModal(false);
    } catch (err) {
      console.error(err);
      setToastMsg("匯入失敗，請檢查 JSON 格式或網路");
    } finally { setIsProcessing(false); }
  };

  // 刪除卡片
  const handleDeleteCard = async (card) => {
    if (!confirm(`確定要刪除「${card.name}」嗎？此動作無法復原。`)) return;
    
    if (isOffline) {
        setAllCards(prev => prev.filter(c => c.id !== card.id));
        setToastMsg("離線模式：已移除卡片");
        return;
    }

    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'cards', card.id));
      setToastMsg(`已刪除 ${card.name}`);
    } catch (err) { console.error(err); setToastMsg("刪除失敗"); }
  };

  // 開啟編輯 Modal
  const openEditModal = (card) => {
    setEditingCard(card);
    setShowAddModal(true);
  };

  const initializeDatabase = async () => {
    // 離線模式處理
    if (isOffline) {
        setAllCards(INITIAL_CARDS);
        setToastMsg("離線模式：已重置為預設資料");
        return;
    }

    if (!user || !db || !confirm("確定匯入預設資料？")) return;
    setIsProcessing(true);
    const batch = writeBatch(db);
    try {
      INITIAL_CARDS.forEach(card => batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'cards', card.id), card));
      await batch.commit();
      setToastMsg("匯入成功");
    } catch (err) { console.error(err); setToastMsg("匯入失敗"); } finally { setIsProcessing(false); }
  };

  const filteredCards = useMemo(() => {
    return allCards.filter(card => {
      const matchesSearch = card.name.includes(filters.search) || card.id.toLowerCase().includes(filters.search.toLowerCase());
      const matchesType = filters.type === 'ALL' || card.type === filters.type;
      const matchesColor = filters.color === 'ALL' || card.color === filters.color;
      return matchesSearch && matchesType && matchesColor;
    });
  }, [filters, allCards]);

  const groupedMainDeck = useMemo(() => groupCards(deck.main), [deck.main]);
  const groupedExtraDeck = useMemo(() => groupCards(deck.extra), [deck.extra]);
  const flipCount = getFlipCount();

  // 錯誤處理：顯示離線模式選項
  if (loadingError && !isOffline) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full border border-red-100">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">無法連線至資料庫</h2>
          <p className="text-slate-600 mb-6 bg-red-50 p-3 rounded text-sm">{loadingError}</p>
          
          <div className="text-left text-sm text-slate-500 space-y-2 bg-slate-50 p-4 rounded mb-6">
            <p className="font-bold text-slate-700">您可以選擇：</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>重新整理</strong>：嘗試再次連線。</li>
              <li><strong>離線模擬</strong>：在不連線的情況下測試介面與功能 (資料不會儲存)。</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold w-full transition-colors flex items-center justify-center gap-2"
            >
                <RefreshCw size={18} /> 重新整理頁面
            </button>
            <button 
                onClick={() => {
                    setIsOffline(true);
                    setLoadingError(null);
                    setUser({ uid: 'offline-user', isAnonymous: true });
                    setIsAdmin(true); // 離線模式預設開啟管理權限方便測試
                }}
                className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-bold w-full transition-colors flex items-center justify-center gap-2"
            >
                <WifiOff size={18} /> 進入離線模擬模式
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 載入中
  if (!user && !isOffline) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col md:flex-row bg-slate-50 overflow-hidden font-sans text-slate-900">
      {viewingCard && <CardDetailModal card={viewingCard} onClose={() => setViewingCard(null)} />}
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
      
      {/* 新增/編輯 Modal */}
      {showAddModal && (
        <AddCardModal 
          onClose={() => { setShowAddModal(false); setEditingCard(null); }} 
          onAdd={handleSaveCard} 
          isProcessing={isProcessing} 
          initialData={editingCard} 
        />
      )}

      {/* 批量匯入 Modal */}
      {showBulkModal && <BulkImportModal onClose={() => setShowBulkModal(false)} onImport={handleBulkImport} isProcessing={isProcessing} />}

      {showExportModal && <ExportModal deck={deck} allCards={allCards} onClose={() => setShowExportModal(false)} />}

      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200">
        <div className="p-4 bg-white border-b border-slate-200 shadow-sm z-10 space-y-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <Cloud className={isOffline ? "text-slate-400" : "text-blue-600"} />
                {isOffline ? "Braverse Builder (離線模擬)" : "雲端全卡表"}
            </h1>
            <div className="flex gap-2">
              {isAdmin ? (
                <>
                  <button onClick={() => { setEditingCard(null); setShowAddModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 shadow transition-colors"><Plus size={16} /> 新增</button>
                  <button onClick={() => setShowBulkModal(true)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 shadow transition-colors"><FileJson size={16} /> 匯入</button>
                </>
              ) : (
                <div className="flex items-center gap-1 text-slate-400 text-xs bg-slate-100 px-2 py-1 rounded"><Lock size={12} /> 僅供瀏覽</div>
              )}
              <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1.5 rounded flex items-center">共 {filteredCards.length} 張</span>
            </div>
          </div>
          {isOffline && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-1.5 rounded text-xs flex items-center gap-2">
                  <WifiOff size={14} />
                  <span>目前為離線模式，您的變更不會儲存到資料庫，重新整理後將遺失。</span>
              </div>
          )}
          <div className="flex flex-col gap-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="搜尋名稱或編號..." className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} />
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1"><Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><select className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})}>{['ALL', ...Object.values(CARD_TYPES)].map(t => <option key={t} value={t}>{t === 'ALL' ? '全部種類' : t}</option>)}</select></div>
              <div className="relative flex-1"><Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><select className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" value={filters.color} onChange={(e) => setFilters({...filters, color: e.target.value})}>{['ALL', ...Object.values(CARD_COLORS)].map(c => <option key={c} value={c}>{c === 'ALL' ? '全部顏色' : c}</option>)}</select></div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 pb-20">
            {filteredCards.map(card => (
              <CardItem 
                key={card.id} 
                card={card} 
                onClick={addToDeck} 
                onView={setViewingCard} 
                count={getCardCount(card.id)}
                // 傳入編輯與刪除 handler (只有 Admin 有)
                onEdit={isAdmin ? openEditModal : null}
                onDelete={isAdmin ? handleDeleteCard : null}
              />
            ))}
            {allCards.length === 0 && isAdmin && (
              <div className="col-span-full py-12 text-center text-slate-400 flex flex-col items-center gap-4">
                <Database size={48} className="opacity-20" />
                <p>資料庫目前是空的</p>
                <button onClick={initializeDatabase} disabled={isProcessing} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold transition-colors">{isProcessing ? '匯入中...' : '一鍵匯入預設卡片資料'}</button>
              </div>
            )}
            {allCards.length > 0 && filteredCards.length === 0 && <div className="col-span-full py-12 text-center text-slate-400"><Search size={48} className="mx-auto mb-2 opacity-20" /><p>找不到符合條件的卡片</p></div>}
          </div>
        </div>
      </div>

      <div className="w-full md:w-80 lg:w-96 flex flex-col bg-white shadow-xl z-20">
        <div className="p-4 bg-slate-800 text-white border-b border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Box size={20} className="text-blue-400"/> 目前牌組</h2>
            <div className="flex gap-2">
              <button onClick={() => setShowExportModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded transition-colors" title="分享/輸出"><Share2 size={18} /></button>
              <button onClick={clearDeck} className="text-slate-400 hover:text-red-400 transition-colors p-1" title="清空"><Trash2 size={18} /></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatBadge icon={Layers} label="主牌組" current={deck.main.length} max={LIMITS.MAIN} color="blue" />
            <StatBadge icon={Zap} label="額外" current={deck.extra.length} max={LIMITS.EXTRA} color="purple" />
            <StatBadge icon={RotateCw} label="Flip" current={flipCount} max={LIMITS.FLIP} color="orange" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-6 bg-slate-50">
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1 flex justify-between">主牌組清單 <span>{deck.main.length} / {LIMITS.MAIN}</span></h3>
            <div className="space-y-2 min-h-[100px]">
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
             <ul className="text-xs text-orange-700 space-y-1 list-disc pl-4">
               {deck.main.length < 40 && <li>主牌組建議至少 40 張 (目前 {deck.main.length})</li>}
               {deck.main.length === LIMITS.MAIN && <li className="text-red-600 font-bold">主牌組已達上限</li>}
               {deck.extra.length === LIMITS.EXTRA && <li className="text-red-600 font-bold">額外牌組已達上限</li>}
               {flipCount === LIMITS.FLIP && <li className="text-red-600 font-bold">Flip 卡片已達上限 ({LIMITS.FLIP})</li>}
               {deck.main.length >= 40 && deck.main.length < LIMITS.MAIN && deck.extra.length < LIMITS.EXTRA && flipCount < LIMITS.FLIP && <li className="text-emerald-600 list-none -ml-4">✨ 牌組目前合規</li>}
             </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
