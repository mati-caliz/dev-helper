import { useState } from 'preact/hooks';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const SNIPPETS = [
  // === DESPEGAR - DEBUG ===
  {
    category: '🛫 Despegar - Debug',
    name: 'Ver Data Layer',
    description: 'Muestra el dataLayer de Google Tag Manager en consola',
    code: `// Ver Data Layer de GTM
console.group('📊 Data Layer');
if (window.dataLayer) {
  window.dataLayer.forEach((item, i) => {
    console.log(\`[\${i}]\`, item);
  });
  console.log('Total eventos:', window.dataLayer.length);
} else {
  console.warn('No hay dataLayer');
}
console.groupEnd();`
  },
  {
    category: '🛫 Despegar - Debug',
    name: 'Ver Cookies de Sesión',
    description: 'Muestra cookies importantes formateadas',
    code: `// Ver cookies importantes
console.group('🍪 Cookies de Sesión');
const important = ['JSESSIONID', 'USER_ID', 'X-UOW', 'departure', 'dflow'];
document.cookie.split(';').forEach(c => {
  const [name, value] = c.trim().split('=');
  if (important.some(i => name.includes(i))) {
    console.log(\`\${name}:\`, decodeURIComponent(value || ''));
  }
});
console.groupEnd();`
  },
  {
    category: '🛫 Despegar - Debug',
    name: 'Ver Storage Formateado',
    description: 'Muestra localStorage y sessionStorage parseado como JSON',
    code: `// Ver storage formateado
function parseIfJSON(str) {
  try { return JSON.parse(str); } catch { return str; }
}

console.group('💾 LocalStorage');
Object.keys(localStorage).forEach(k => {
  console.log(k + ':', parseIfJSON(localStorage[k]));
});
console.groupEnd();

console.group('📦 SessionStorage');
Object.keys(sessionStorage).forEach(k => {
  console.log(k + ':', parseIfJSON(sessionStorage[k]));
});
console.groupEnd();`
  },
  {
    category: '🛫 Despegar - Debug',
    name: 'Interceptar Fetch Requests',
    description: 'Loggea todas las llamadas fetch a la API',
    code: `// Interceptar fetch requests
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const [url, options] = args;
  console.group('🌐 Fetch Request');
  console.log('URL:', url);
  if (options?.body) {
    try {
      console.log('Body:', JSON.parse(options.body));
    } catch {
      console.log('Body:', options.body);
    }
  }
  const response = await originalFetch(...args);
  const clone = response.clone();
  try {
    const data = await clone.json();
    console.log('Response:', data);
  } catch {}
  console.groupEnd();
  return response;
};
console.log('✅ Fetch interceptor activado');`
  },
  {
    category: '🛫 Despegar - Debug',
    name: 'Ver Tracking Events',
    description: 'Intercepta y muestra eventos de tracking',
    code: `// Interceptar tracking events
const originalPush = window.dataLayer?.push;
if (originalPush) {
  window.dataLayer.push = function(...args) {
    console.log('📊 Track Event:', args[0]);
    return originalPush.apply(this, args);
  };
  console.log('✅ Tracking interceptor activado');
} else {
  console.warn('No hay dataLayer');
}`
  },
  {
    category: '🛫 Despegar - Debug',
    name: 'Mostrar Feature Flags',
    description: 'Busca y muestra feature flags en window y storage',
    code: `// Buscar feature flags
console.group('🚩 Feature Flags');
// En window
Object.keys(window).filter(k => 
  k.toLowerCase().includes('flag') || 
  k.toLowerCase().includes('feature') ||
  k.toLowerCase().includes('experiment')
).forEach(k => console.log('window.' + k + ':', window[k]));

// En localStorage
Object.keys(localStorage).filter(k => 
  k.toLowerCase().includes('flag') || 
  k.toLowerCase().includes('feature')
).forEach(k => console.log('localStorage.' + k + ':', localStorage[k]));
console.groupEnd();`
  },

  // === DESPEGAR - UI ===
  {
    category: '🛫 Despegar - UI',
    name: 'Dark Mode Despegar',
    description: 'Aplica dark mode al sitio',
    code: `// Dark mode para Despegar
const style = document.createElement('style');
style.id = 'dark-mode-despegar';
style.textContent = \`
  html { filter: invert(0.9) hue-rotate(180deg); }
  img, video, svg, [style*="background-image"] { filter: invert(1) hue-rotate(180deg); }
\`;
const existing = document.getElementById('dark-mode-despegar');
if (existing) {
  existing.remove();
  console.log('🌙 Dark mode desactivado');
} else {
  document.head.appendChild(style);
  console.log('🌙 Dark mode activado');
}`
  },
  {
    category: '🛫 Despegar - UI',
    name: 'Mostrar IDs de Productos',
    description: 'Muestra IDs de hoteles/vuelos sobre las cards',
    code: `// Mostrar IDs de productos
document.querySelectorAll('[data-id], [data-product-id], [data-hotel-id]').forEach(el => {
  const id = el.dataset.id || el.dataset.productId || el.dataset.hotelId;
  if (id) {
    const badge = document.createElement('div');
    badge.style.cssText = 'position:absolute;top:0;left:0;background:red;color:white;padding:2px 6px;font-size:10px;z-index:9999;font-family:monospace';
    badge.textContent = 'ID: ' + id;
    el.style.position = 'relative';
    el.appendChild(badge);
  }
});
console.log('✅ IDs mostrados');`
  },
  {
    category: '🛫 Despegar - UI',
    name: 'Highlight Clickeables',
    description: 'Resalta todos los elementos clickeables',
    code: `// Highlight elementos clickeables
document.querySelectorAll('a, button, [onclick], [role="button"], input[type="submit"]').forEach(el => {
  el.style.outline = '2px solid red';
  el.style.outlineOffset = '2px';
});
console.log('✅ Elementos clickeables resaltados');`
  },

  // === DESPEGAR - TESTING ===
  {
    category: '🛫 Despegar - Testing',
    name: 'Auto-fill Búsqueda Vuelos',
    description: 'Rellena el buscador de vuelos con datos de prueba',
    code: `// Auto-fill búsqueda de vuelos
const fillInput = (selector, value) => {
  const el = document.querySelector(selector);
  if (el) {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
};

// Intenta llenar campos comunes
fillInput('[data-testid="origin-input"], [name="origin"], .sbox-origin input', 'Buenos Aires');
fillInput('[data-testid="destination-input"], [name="destination"], .sbox-destination input', 'Miami');
console.log('✅ Campos rellenados (ajustar selectores según la página)');`
  },
  {
    category: '🛫 Despegar - Testing',
    name: 'Simular Usuario Logueado',
    description: 'Setea cookies/storage para simular usuario',
    code: `// Simular usuario logueado (ajustar valores)
const mockUser = {
  id: 'test-user-123',
  email: 'test@despegar.com',
  name: 'Test User',
  logged: true
};
localStorage.setItem('user', JSON.stringify(mockUser));
sessionStorage.setItem('userSession', JSON.stringify(mockUser));
console.log('✅ Usuario mock seteado:', mockUser);
console.log('⚠️ Recargar página para aplicar');`
  },
  {
    category: '🛫 Despegar - Testing',
    name: 'Limpiar Cache Local',
    description: 'Limpia localStorage y sessionStorage',
    code: `// Limpiar todo el storage
const lsCount = localStorage.length;
const ssCount = sessionStorage.length;
localStorage.clear();
sessionStorage.clear();
console.log(\`🧹 Limpiado: \${lsCount} items de localStorage, \${ssCount} de sessionStorage\`);
console.log('⚠️ Recargar página para ver cambios');`
  },

  // === UTILIDADES GENERALES ===
  {
    category: '🔧 Utilidades',
    name: 'Console Table de Elementos',
    description: 'Muestra tabla de elementos por selector',
    code: `// Console table de elementos
const selector = prompt('Selector CSS:', 'a');
const elements = [...document.querySelectorAll(selector)].map(el => ({
  tag: el.tagName,
  id: el.id || '-',
  class: el.className || '-',
  text: (el.textContent || '').substring(0, 50),
  href: el.href || '-'
}));
console.table(elements);`
  },
  {
    category: '🔧 Utilidades',
    name: 'Performance Timing',
    description: 'Muestra métricas de performance de la página',
    code: `// Performance timing
const perf = performance.timing;
const metrics = {
  'DNS Lookup': perf.domainLookupEnd - perf.domainLookupStart,
  'TCP Connection': perf.connectEnd - perf.connectStart,
  'Request Time': perf.responseStart - perf.requestStart,
  'Response Time': perf.responseEnd - perf.responseStart,
  'DOM Processing': perf.domComplete - perf.domLoading,
  'Total Load Time': perf.loadEventEnd - perf.navigationStart
};
console.table(metrics);`
  },
  {
    category: '🔧 Utilidades',
    name: 'Copiar como cURL',
    description: 'Copia el último fetch request como comando cURL',
    code: `// Interceptar y copiar como cURL
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const headers = options.headers || {};
  let curl = \`curl '\${url}'\`;
  Object.entries(headers).forEach(([k, v]) => {
    curl += \` -H '\${k}: \${v}'\`;
  });
  if (options.method && options.method !== 'GET') {
    curl += \` -X \${options.method}\`;
  }
  if (options.body) {
    curl += \` -d '\${options.body}'\`;
  }
  console.log('📋 cURL:', curl);
  navigator.clipboard?.writeText(curl);
  return originalFetch(url, options);
};
console.log('✅ Próximo fetch se copiará como cURL');`
  },
  {
    category: '🔧 Utilidades',
    name: 'Slow Motion Mode',
    description: 'Hace todas las animaciones más lentas',
    code: `// Slow motion mode
document.body.style.setProperty('--animation-duration', '3s');
const style = document.createElement('style');
style.textContent = '*, *::before, *::after { animation-duration: 3s !important; transition-duration: 1s !important; }';
document.head.appendChild(style);
console.log('🐢 Slow motion activado');`
  },
  {
    category: '🔧 Utilidades',
    name: 'Ver Event Listeners',
    description: 'Lista todos los event listeners de un elemento',
    code: `// Ver event listeners (usar en DevTools)
console.log('👆 Click en un elemento para ver sus listeners...');
document.addEventListener('click', function handler(e) {
  e.preventDefault();
  e.stopPropagation();
  const listeners = getEventListeners?.(e.target);
  if (listeners) {
    console.log('Event Listeners:', listeners);
  } else {
    console.log('⚠️ getEventListeners solo funciona en DevTools de Chrome');
  }
  document.removeEventListener('click', handler, true);
}, { capture: true, once: true });`
  }
];

// Obtener categorías únicas
const CATEGORIES = [...new Set(SNIPPETS.map(s => s.category))];

export default function SnippetsModal({ isOpen, onClose, onSelect }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (!isOpen) return null;

  const filteredSnippets = SNIPPETS.filter(s => {
    const matchesSearch = search === '' || 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedSnippets = filteredSnippets.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-white font-medium">📚 Snippets y Templates</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="p-4 space-y-3 border-b border-gray-700">
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar snippets..."
              value={search}
              onInput={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-secondary-400"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2 py-1 rounded text-xs transition ${
                selectedCategory === 'all' 
                  ? 'bg-secondary-700 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Todos
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-1 rounded text-xs transition ${
                  selectedCategory === cat 
                    ? 'bg-secondary-700 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Snippets List */}
        <div className="flex-1 overflow-y-auto p-4">
          {Object.entries(groupedSnippets).map(([category, snippets]) => (
            <div key={category} className="mb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">{category}</h3>
              <div className="space-y-2">
                {snippets.map((snippet, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelect(snippet);
                      onClose();
                    }}
                    className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                  >
                    <div className="text-white font-medium text-sm">{snippet.name}</div>
                    <div className="text-gray-400 text-xs mt-1">{snippet.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filteredSnippets.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              No se encontraron snippets
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { SNIPPETS, CATEGORIES };
