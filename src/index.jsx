import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import LocalStorageTab from './components/LocalStorageTab';
import SessionStorageTab from './components/SessionStorageTab';
import CookiesTab from './components/CookiesTab';
import ScriptsTab from './components/ScriptsTab';
import DeviceSelector from './components/DeviceSelector';
import InspectorMode from './components/InspectorMode';

const THEME_KEY = 'plugin-theme';

function App() {
  const [tab, setTab] = useState(null);
  const [activeTab, setActiveTab] = useState('localStorage');
  const [isNuking, setIsNuking] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved ? saved === 'dark' : true; // Dark por defecto
  });

  useEffect(() => {
    if (import.meta.env.VITE_MODE === 'dev') {
      setTab({ id: 1, url: window.location.href });
    } else if (chrome?.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, ([t]) => setTab(t));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // 🔥 Nuclear: Limpiar TODO del dominio y recargar
  const handleNuke = async () => {
    if (!confirm('⚠️ Esto eliminará TODO del dominio:\n\n• Cookies\n• LocalStorage\n• SessionStorage\n• Cache API\n• Service Workers\n\n¿Continuar?')) {
      return;
    }

    setIsNuking(true);

    if (import.meta.env.VITE_MODE === 'dev') {
      // Modo desarrollo
      localStorage.clear();
      sessionStorage.clear();
      
      // Limpiar cookies
      document.cookie.split(';').forEach(c => {
        const name = c.trim().split('=')[0];
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      });

      // Limpiar Cache API
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Desregistrar Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }

      console.log('🔥 Nuclear complete! Recargando...');
      setTimeout(() => window.location.reload(), 500);
    } else {
      // Modo extensión - ejecutar en la página actual
      try {
        // 1. Limpiar cookies del dominio
        const url = new URL(tab.url);
        const cookies = await chrome.cookies.getAll({ url: tab.url });
        for (const cookie of cookies) {
          await chrome.cookies.remove({ url: tab.url, name: cookie.name });
        }

        // 2. Limpiar localStorage, sessionStorage, Cache API y Service Workers en la página
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async () => {
            // Clear storages
            localStorage.clear();
            sessionStorage.clear();
            
            // Clear Cache API
            if ('caches' in window) {
              const cacheNames = await caches.keys();
              await Promise.all(cacheNames.map(name => caches.delete(name)));
            }

            // Unregister all Service Workers
            if ('serviceWorker' in navigator) {
              const registrations = await navigator.serviceWorker.getRegistrations();
              await Promise.all(registrations.map(r => r.unregister()));
            }

            console.log('🔥 Nuclear: Todo limpiado!');
          },
          world: 'MAIN'
        });

        // 3. Recargar la página
        await chrome.tabs.reload(tab.id, { bypassCache: true });
        
        // Cerrar el popup
        window.close();
      } catch (err) {
        console.error('Error en nuke:', err);
        alert('Error: ' + err.message);
        setIsNuking(false);
      }
    }
  };

  if (!tab) {
    return (
      <div class={`flex justify-center items-center h-screen text-lg ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
        Loading...
      </div>
    );
  }

  const tabButtonClass = (isActive) => `flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
    isActive
      ? 'bg-secondary-700 text-white shadow'
      : darkMode 
        ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' 
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
  }`;

  return (
    <div class={`w-md p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      {/* Header con toggle de tema y botón nuclear */}
      <div class="flex justify-between items-center mb-3">
        <span class={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Storage Manager
        </span>
        <div class="flex gap-1">
          <InspectorMode tab={tab} darkMode={darkMode} />
          <DeviceSelector tab={tab} darkMode={darkMode} />
          <button
            onClick={handleNuke}
            disabled={isNuking}
            class={`p-1.5 rounded-lg transition-colors ${
              isNuking
                ? 'bg-red-800 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-500'
            } text-white`}
            title="🔥 Limpiar TODO (Cookies, LS, SS, Cache, SW) y recargar"
          >
            {isNuking ? '💥' : '☢️'}
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            class={`p-1.5 rounded-lg transition-colors ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
            title={darkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div class="flex space-x-1 mb-4">
        <button onClick={() => setActiveTab('localStorage')} class={tabButtonClass(activeTab === 'localStorage')}>
          🧩 Local
        </button>
        <button onClick={() => setActiveTab('sessionStorage')} class={tabButtonClass(activeTab === 'sessionStorage')}>
          📦 Session
        </button>
        <button onClick={() => setActiveTab('cookies')} class={tabButtonClass(activeTab === 'cookies')}>
          🍪 Cookies
        </button>
        <button onClick={() => setActiveTab('scripts')} class={tabButtonClass(activeTab === 'scripts')}>
          ⚡ Scripts
        </button>
      </div>

      {/* Content */}
      <div class={darkMode ? '' : 'light-theme'}>
        {activeTab === 'localStorage' && <LocalStorageTab tab={tab} />}
        {activeTab === 'sessionStorage' && <SessionStorageTab tab={tab} />}
        {activeTab === 'cookies' && <CookiesTab tab={tab} />}
        {activeTab === 'scripts' && <ScriptsTab tab={tab} />}
      </div>
    </div>
  );
}


render(<App />, document.getElementById('app'));