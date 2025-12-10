import React, { useState } from 'react';
// 測試一下 Lucide 圖示庫是否能正常運作 (你的 package.json 有裝這個)
import { Cookie, CheckCircle } from 'lucide-react';

const App = () => {
  const [count, setCount] = useState(0);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f3f4f6',
      fontFamily: 'sans-serif',
      color: '#374151'
    }}>
      <div style={{
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        <div style={{ marginBottom: '1rem', color: '#d97706' }}>
          <Cookie size={64} />
        </div>
        
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Cookie Braverse Builder
        </h1>
        
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          專案已成功建置！<br />
          (Project Build Successful)
        </p>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '0.5rem',
          padding: '0.75rem',
          backgroundColor: '#ecfdf5',
          color: '#047857',
          borderRadius: '0.5rem',
          fontSize: '0.875rem'
        }}>
          <CheckCircle size={16} />
          <span>環境設定正確</span>
        </div>

        <button 
          onClick={() => setCount(c => c + 1)}
          style={{
            marginTop: '1.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }}
        >
          測試按鈕 (點擊數: {count})
        </button>
      </div>
    </div>
  );
};

export default App;
