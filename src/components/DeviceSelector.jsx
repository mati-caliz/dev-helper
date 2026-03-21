import { useState, useEffect } from 'preact/hooks';
import { DevicePhoneMobileIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

const DEVICE_KEY = 'device-simulation';

// User Agents reales de Despegar apps y web mobile
const DEVICES = {
  desktop: {
    id: 'desktop',
    name: '🖥️ Desktop',
    shortName: '🖥️',
    userAgent: null, // Usar el original del navegador
    description: 'Sin modificar'
  },
  webMobile: {
    id: 'webMobile',
    name: '📱 Web Mobile',
    shortName: '📱',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    description: 'Safari iOS',
    viewport: { width: 390, height: 844 }
  },
  androidApp: {
    id: 'androidApp',
    name: '🤖 App Android',
    shortName: '🤖',
    userAgent: 'Despegar/24.12.0 (Android 14; SM-S918B; Build/UP1A.231005.007)',
    description: 'Despegar App Android',
    appHeaders: {
      'X-Client': 'android',
      'X-App-Version': '24.12.0'
    }
  },
  iosApp: {
    id: 'iosApp',
    name: '🍎 App iOS',
    shortName: '🍎',
    userAgent: 'Despegar/24.12.0 (iPhone; iOS 17.0; Scale/3.00)',
    description: 'Despegar App iOS',
    appHeaders: {
      'X-Client': 'ios',
      'X-App-Version': '24.12.0'
    }
  },
  androidWebView: {
    id: 'androidWebView',
    name: '🌐 WebView Android',
    shortName: '🌐🤖',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 Despegar/24.12.0',
    description: 'WebView dentro de la app Android'
  },
  iosWebView: {
    id: 'iosWebView',
    name: '🌐 WebView iOS',
    shortName: '🌐🍎',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Despegar/24.12.0',
    description: 'WebView dentro de la app iOS'
  }
};

export default function DeviceSelector({ tab, darkMode }) {
  const [currentDevice, setCurrentDevice] = useState('desktop');
  const [isOpen, setIsOpen] = useState(false);
  const [showViewportReminder, setShowViewportReminder] = useState(false);

  useEffect(() => {
    // Cargar dispositivo guardado
    if (import.meta.env.VITE_MODE === 'dev') {
      const saved = localStorage.getItem(DEVICE_KEY);
      if (saved) setCurrentDevice(saved);
    } else {
      chrome.storage.local.get([DEVICE_KEY], (result) => {
        if (result[DEVICE_KEY]) setCurrentDevice(result[DEVICE_KEY]);
      });
    }
  }, []);

  // Mostrar recordatorio si está en mobile
  useEffect(() => {
    const isMobileDevice = currentDevice !== 'desktop';
    setShowViewportReminder(isMobileDevice);
  }, [currentDevice]);

  const handleDeviceChange = async (deviceId) => {
    const device = DEVICES[deviceId];
    
    if (import.meta.env.VITE_MODE === 'dev') {
      localStorage.setItem(DEVICE_KEY, deviceId);
      setCurrentDevice(deviceId);
      setIsOpen(false);
      
      // En modo dev, solo mostramos en consola
      console.log(`📱 Simulando: ${device.name}`);
      console.log(`User-Agent: ${device.userAgent || 'Original'}`);
      if (device.appHeaders) {
        console.log('Headers adicionales:', device.appHeaders);
      }
      alert(`Modo dev: Se simularía ${device.name}\n\nUser-Agent: ${device.userAgent || 'Original'}`);
      return;
    }

    try {
      // Guardar preferencia
      await chrome.storage.local.set({ [DEVICE_KEY]: deviceId });
      setCurrentDevice(deviceId);
      setIsOpen(false);

      // Enviar mensaje al background para actualizar reglas
      await chrome.runtime.sendMessage({
        type: 'SET_DEVICE',
        device: device
      });

      // Inyectar script para modificar navigator.userAgent en la página
      if (device.userAgent) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (ua, appHeaders) => {
            // Guardar en sessionStorage para que persista en la sesión
            sessionStorage.setItem('__device_simulation_ua', ua);
            if (appHeaders) {
              sessionStorage.setItem('__device_simulation_headers', JSON.stringify(appHeaders));
            }
            console.log(`📱 Device simulation activado: ${ua}`);
          },
          args: [device.userAgent, device.appHeaders || null],
          world: 'MAIN'
        });
      }

      // Recargar la página para aplicar cambios
      await chrome.tabs.reload(tab.id);
      
    } catch (err) {
      console.error('Error cambiando dispositivo:', err);
      alert('Error: ' + err.message);
    }
  };

  const device = DEVICES[currentDevice];

  return (
    <div class="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        class={`p-1.5 rounded-lg transition-colors ${
          currentDevice !== 'desktop'
            ? 'bg-blue-600 hover:bg-blue-500 text-white'
            : darkMode 
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        }`}
        title={`Dispositivo: ${device.name}`}
      >
        {device.shortName}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            class="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div class={`absolute right-0 top-full mt-1 w-56 rounded-lg shadow-lg z-50 ${
            darkMode ? 'bg-gray-700' : 'bg-white'
          } border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
            <div class={`px-3 py-2 text-xs font-medium border-b ${
              darkMode ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-gray-200'
            }`}>
              Simular dispositivo
            </div>
            
            {Object.values(DEVICES).map(d => (
              <button
                key={d.id}
                onClick={() => handleDeviceChange(d.id)}
                class={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                  currentDevice === d.id
                    ? 'bg-secondary-700 text-white'
                    : darkMode
                      ? 'text-gray-200 hover:bg-gray-600'
                      : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div>
                  <div class="font-medium">{d.name}</div>
                  <div class={`text-xs ${
                    currentDevice === d.id ? 'text-gray-200' : darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {d.description}
                  </div>
                </div>
                {currentDevice === d.id && (
                  <span class="text-green-400">✓</span>
                )}
              </button>
            ))}

            <div class={`px-3 py-2 text-xs border-t ${
              darkMode ? 'text-gray-500 border-gray-600' : 'text-gray-400 border-gray-200'
            }`}>
              ⚡ Recarga la página automáticamente
            </div>
          </div>
        </>
      )}

      {/* Viewport Reminder */}
      {showViewportReminder && !isOpen && (
        <div class={`absolute right-0 top-full mt-1 w-64 rounded-lg shadow-lg z-30 p-3 ${
          darkMode ? 'bg-yellow-900/90 border-yellow-600' : 'bg-yellow-50 border-yellow-400'
        } border`}>
          <div class="flex justify-between items-start">
            <div class={`text-xs ${darkMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
              <p class="font-medium mb-1">📱 Dispositivo mobile activo</p>
              <p class="mb-2">Para ajustar el viewport, abrí DevTools:</p>
              <p class="font-mono bg-black/20 px-2 py-1 rounded">
                F12 → Ctrl+Shift+M
              </p>
              <p class="mt-1 text-yellow-400/80">(o click en ícono de dispositivo)</p>
            </div>
            <button 
              onClick={() => setShowViewportReminder(false)}
              class={`ml-2 p-1 rounded hover:bg-black/20 ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { DEVICES };
