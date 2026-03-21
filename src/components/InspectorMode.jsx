import { useState } from 'preact/hooks';

export default function InspectorMode({ tab, darkMode }) {
  const [isActive, setIsActive] = useState(false);

  const toggleInspector = async () => {
    if (import.meta.env.VITE_MODE === 'dev') {
      // En modo dev, ejecutar directamente
      if (!isActive) {
        injectInspector();
      } else {
        removeInspector();
      }
      setIsActive(!isActive);
      return;
    }

    try {
      if (!isActive) {
        // Activar inspector
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: injectInspector,
          world: 'MAIN'
        });
      } else {
        // Desactivar inspector
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: removeInspector,
          world: 'MAIN'
        });
      }
      setIsActive(!isActive);
    } catch (err) {
      console.error('Error toggling inspector:', err);
      alert('Error: ' + err.message);
    }
  };

  return (
    <button
      onClick={toggleInspector}
      class={`p-1.5 rounded-lg transition-colors ${
        isActive
          ? 'bg-green-600 hover:bg-green-500 text-white'
          : darkMode 
            ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
      }`}
      title={isActive ? 'Desactivar Inspector' : 'Activar Inspector de elementos'}
    >
      🔍
    </button>
  );
}

// Esta función se inyecta en la página
function injectInspector() {
  // Si ya existe, no hacer nada
  if (window.__inspectorActive) return;
  window.__inspectorActive = true;

  // Crear estilos
  const style = document.createElement('style');
  style.id = '__inspector-styles';
  style.textContent = `
    .__inspector-highlight {
      outline: 2px solid #3b82f6 !important;
      outline-offset: 2px !important;
      background-color: rgba(59, 130, 246, 0.1) !important;
    }
    
    .__inspector-tooltip {
      position: fixed;
      z-index: 999999;
      background: #1f2937;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-family: ui-monospace, monospace;
      font-size: 12px;
      pointer-events: none;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      border: 1px solid #374151;
    }
    
    .__inspector-tooltip-tag {
      color: #f472b6;
      font-weight: bold;
    }
    
    .__inspector-tooltip-id {
      color: #fbbf24;
    }
    
    .__inspector-tooltip-class {
      color: #34d399;
    }
    
    .__inspector-tooltip-size {
      color: #93c5fd;
      margin-top: 4px;
    }
    
    .__inspector-tooltip-text {
      color: #a78bfa;
      margin-top: 4px;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .__inspector-panel {
      position: fixed;
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999998;
      background: #1f2937;
      color: white;
      padding: 10px 16px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      border: 1px solid #374151;
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .__inspector-panel button {
      background: #374151;
      border: none;
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .__inspector-panel button:hover {
      background: #4b5563;
    }

    .__inspector-panel button.active {
      background: #3b82f6;
    }

    /* Colores por tipo de elemento */
    .__inspector-type-interactive {
      outline-color: #22c55e !important;
      background-color: rgba(34, 197, 94, 0.1) !important;
    }
    
    .__inspector-type-text {
      outline-color: #a855f7 !important;
      background-color: rgba(168, 85, 247, 0.1) !important;
    }
    
    .__inspector-type-media {
      outline-color: #f97316 !important;
      background-color: rgba(249, 115, 22, 0.1) !important;
    }
    
    .__inspector-type-container {
      outline-color: #06b6d4 !important;
      background-color: rgba(6, 182, 212, 0.1) !important;
    }
  `;
  document.head.appendChild(style);

  // Crear tooltip
  const tooltip = document.createElement('div');
  tooltip.id = '__inspector-tooltip';
  tooltip.className = '__inspector-tooltip';
  tooltip.style.display = 'none';
  document.body.appendChild(tooltip);

  // Crear panel de control
  const panel = document.createElement('div');
  panel.id = '__inspector-panel';
  panel.className = '__inspector-panel';
  panel.innerHTML = `
    <span>🔍 Inspector activo</span>
    <button id="__inspector-outline-all">Outline All</button>
    <button id="__inspector-show-grid">Show Grid</button>
    <button id="__inspector-copy-selector">Copy Selector</button>
    <button id="__inspector-close" style="background: #ef4444;">Cerrar (ESC)</button>
  `;
  document.body.appendChild(panel);

  let currentElement = null;
  let gridOverlay = null;

  // Función para determinar tipo de elemento
  function getElementType(el) {
    const tag = el.tagName.toLowerCase();
    const interactive = ['a', 'button', 'input', 'select', 'textarea', 'label'];
    const text = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'strong', 'em', 'li'];
    const media = ['img', 'video', 'audio', 'svg', 'canvas', 'iframe'];
    
    if (interactive.includes(tag) || el.onclick || el.getAttribute('role') === 'button') return 'interactive';
    if (text.includes(tag)) return 'text';
    if (media.includes(tag)) return 'media';
    return 'container';
  }

  // Función para obtener selector único
  function getSelector(el) {
    if (el.id) return `#${el.id}`;
    
    let selector = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.split(' ').filter(c => c && !c.startsWith('__inspector'));
      if (classes.length) {
        selector += '.' + classes.slice(0, 3).join('.');
      }
    }
    return selector;
  }

  // Mouse over handler
  function handleMouseOver(e) {
    const el = e.target;
    if (el.id?.startsWith('__inspector') || el.className?.includes?.('__inspector')) return;
    
    // Remover highlight anterior
    if (currentElement) {
      currentElement.classList.remove('__inspector-highlight', '__inspector-type-interactive', '__inspector-type-text', '__inspector-type-media', '__inspector-type-container');
    }
    
    currentElement = el;
    const type = getElementType(el);
    el.classList.add('__inspector-highlight', `__inspector-type-${type}`);
    
    // Actualizar tooltip
    const rect = el.getBoundingClientRect();
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const classes = el.className && typeof el.className === 'string' 
      ? el.className.split(' ').filter(c => c && !c.startsWith('__inspector')).slice(0, 5).join(' ')
      : '';
    const text = el.textContent?.trim().substring(0, 50) || '';
    
    tooltip.innerHTML = `
      <div><span class="__inspector-tooltip-tag">&lt;${tag}&gt;</span>${id ? ` <span class="__inspector-tooltip-id">${id}</span>` : ''}</div>
      ${classes ? `<div class="__inspector-tooltip-class">.${classes.replace(/\s/g, ' .')}</div>` : ''}
      <div class="__inspector-tooltip-size">${Math.round(rect.width)}×${Math.round(rect.height)}px</div>
      ${text ? `<div class="__inspector-tooltip-text">"${text}${text.length >= 50 ? '...' : ''}"</div>` : ''}
    `;
    
    // Posicionar tooltip
    let top = rect.top - tooltip.offsetHeight - 10;
    if (top < 10) top = rect.bottom + 10;
    let left = rect.left;
    if (left + tooltip.offsetWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltip.offsetWidth - 10;
    }
    
    tooltip.style.top = `${Math.max(10, top)}px`;
    tooltip.style.left = `${Math.max(10, left)}px`;
    tooltip.style.display = 'block';
  }

  // Mouse out handler
  function handleMouseOut(e) {
    if (currentElement) {
      currentElement.classList.remove('__inspector-highlight', '__inspector-type-interactive', '__inspector-type-text', '__inspector-type-media', '__inspector-type-container');
    }
    tooltip.style.display = 'none';
  }

  // Click handler - log element info
  function handleClick(e) {
    const el = e.target;
    if (el.id?.startsWith('__inspector') || el.className?.includes?.('__inspector')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    console.group('🔍 Inspector - Elemento seleccionado');
    console.log('Element:', el);
    console.log('Selector:', getSelector(el));
    console.log('Bounding Rect:', el.getBoundingClientRect());
    console.log('Computed Style:', getComputedStyle(el));
    console.log('Dataset:', {...el.dataset});
    console.log('Attributes:', Array.from(el.attributes).map(a => `${a.name}="${a.value}"`));
    console.groupEnd();
  }

  // Outline all elements
  function outlineAll() {
    const existing = document.querySelectorAll('.__inspector-all-outline');
    if (existing.length) {
      existing.forEach(el => el.classList.remove('__inspector-all-outline'));
      return;
    }
    
    // Agregar estilo si no existe
    if (!document.getElementById('__inspector-all-styles')) {
      const allStyle = document.createElement('style');
      allStyle.id = '__inspector-all-styles';
      allStyle.textContent = `
        .__inspector-all-outline { outline: 1px solid rgba(255,0,0,0.3) !important; }
        .__inspector-all-outline * { outline: 1px solid rgba(255,0,0,0.3) !important; }
      `;
      document.head.appendChild(allStyle);
    }
    
    document.body.classList.add('__inspector-all-outline');
  }

  // Show grid overlay
  function showGrid() {
    if (gridOverlay) {
      gridOverlay.remove();
      gridOverlay = null;
      return;
    }
    
    gridOverlay = document.createElement('div');
    gridOverlay.id = '__inspector-grid';
    gridOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 999990;
      background-image: 
        linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px);
      background-size: 20px 20px;
    `;
    document.body.appendChild(gridOverlay);
  }

  // Copy selector
  function copySelector() {
    if (currentElement) {
      const selector = getSelector(currentElement);
      navigator.clipboard?.writeText(selector);
      console.log('📋 Selector copiado:', selector);
      alert(`Selector copiado: ${selector}`);
    }
  }

  // Keyboard handler
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      removeInspector();
    }
  }

  // Agregar event listeners
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeydown);

  // Panel buttons
  document.getElementById('__inspector-outline-all')?.addEventListener('click', outlineAll);
  document.getElementById('__inspector-show-grid')?.addEventListener('click', showGrid);
  document.getElementById('__inspector-copy-selector')?.addEventListener('click', copySelector);
  document.getElementById('__inspector-close')?.addEventListener('click', removeInspector);

  // Guardar referencias para cleanup
  window.__inspectorCleanup = {
    handleMouseOver,
    handleMouseOut,
    handleClick,
    handleKeydown
  };

  console.log('🔍 Inspector activado. Presiona ESC para cerrar.');
}

// Función para remover el inspector
function removeInspector() {
  window.__inspectorActive = false;
  
  // Remover estilos
  document.getElementById('__inspector-styles')?.remove();
  document.getElementById('__inspector-all-styles')?.remove();
  
  // Remover elementos
  document.getElementById('__inspector-tooltip')?.remove();
  document.getElementById('__inspector-panel')?.remove();
  document.getElementById('__inspector-grid')?.remove();
  
  // Remover clases de elementos
  document.querySelectorAll('.__inspector-highlight, .__inspector-all-outline').forEach(el => {
    el.classList.remove('__inspector-highlight', '__inspector-all-outline', '__inspector-type-interactive', '__inspector-type-text', '__inspector-type-media', '__inspector-type-container');
  });
  
  // Remover event listeners
  if (window.__inspectorCleanup) {
    document.removeEventListener('mouseover', window.__inspectorCleanup.handleMouseOver, true);
    document.removeEventListener('mouseout', window.__inspectorCleanup.handleMouseOut, true);
    document.removeEventListener('click', window.__inspectorCleanup.handleClick, true);
    document.removeEventListener('keydown', window.__inspectorCleanup.handleKeydown);
    delete window.__inspectorCleanup;
  }
  
  console.log('🔍 Inspector desactivado.');
}
