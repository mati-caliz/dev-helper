// Background Service Worker para inyectar userscripts y simular dispositivos
const STORAGE_KEY = 'userscripts';
const DEVICE_KEY = 'device-simulation';
const UA_RULE_ID = 1;

// Función para convertir patrón de URL a regex
function urlPatternToRegex(pattern) {
  if (pattern === '*') return /.*/;
  
  // Escapar caracteres especiales de regex excepto * y ?
  let regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  
  return new RegExp('^' + regexStr + '$', 'i');
}

// Función para verificar si una URL coincide con un patrón
function urlMatches(url, pattern) {
  try {
    const regex = urlPatternToRegex(pattern);
    return regex.test(url);
  } catch (e) {
    console.error('Error en patrón de URL:', e);
    return false;
  }
}

// Inyectar scripts cuando se completa la navegación
chrome.webNavigation.onCompleted.addListener(async (details) => {
  // Solo frame principal
  if (details.frameId !== 0) return;
  
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const scripts = result[STORAGE_KEY] || [];
    
    for (const script of scripts) {
      if (!script.enabled) continue;
      
      if (urlMatches(details.url, script.urlPattern)) {
        console.log(`[UserScripts] Ejecutando "${script.name}" en ${details.url}`);
        
        try {
          await chrome.scripting.executeScript({
            target: { tabId: details.tabId },
            func: (code) => {
              try {
                eval(code);
              } catch (e) {
                console.error('[UserScript Error]:', e);
              }
            },
            args: [script.code],
            world: 'MAIN' // Ejecutar en el contexto de la página
          });
        } catch (err) {
          console.error(`[UserScripts] Error ejecutando "${script.name}":`, err);
        }
      }
    }
  } catch (err) {
    console.error('[UserScripts] Error general:', err);
  }
});

// También escuchar cuando el DOM está listo para scripts con runAt: document_end
chrome.webNavigation.onDOMContentLoaded.addListener(async (details) => {
  if (details.frameId !== 0) return;
  
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const scripts = result[STORAGE_KEY] || [];
    
    for (const script of scripts) {
      if (!script.enabled) continue;
      if (script.runAt !== 'document_end') continue;
      
      if (urlMatches(details.url, script.urlPattern)) {
        console.log(`[UserScripts] Ejecutando "${script.name}" (DOM ready) en ${details.url}`);
        
        try {
          await chrome.scripting.executeScript({
            target: { tabId: details.tabId },
            func: (code) => {
              try {
                eval(code);
              } catch (e) {
                console.error('[UserScript Error]:', e);
              }
            },
            args: [script.code],
            world: 'MAIN'
          });
        } catch (err) {
          console.error(`[UserScripts] Error ejecutando "${script.name}":`, err);
        }
      }
    }
  } catch (err) {
    console.error('[UserScripts] Error general:', err);
  }
});

// Para scripts con runAt: document_start, usar onCommitted
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const scripts = result[STORAGE_KEY] || [];
    
    for (const script of scripts) {
      if (!script.enabled) continue;
      if (script.runAt !== 'document_start') continue;
      
      if (urlMatches(details.url, script.urlPattern)) {
        console.log(`[UserScripts] Ejecutando "${script.name}" (document_start) en ${details.url}`);
        
        try {
          await chrome.scripting.executeScript({
            target: { tabId: details.tabId },
            func: (code) => {
              try {
                eval(code);
              } catch (e) {
                console.error('[UserScript Error]:', e);
              }
            },
            args: [script.code],
            world: 'MAIN'
          });
        } catch (err) {
          console.error(`[UserScripts] Error ejecutando "${script.name}":`, err);
        }
      }
    }
  } catch (err) {
    console.error('[UserScripts] Error general:', err);
  }
});

// ==========================================
// DEVICE SIMULATION - User Agent Spoofing
// ==========================================

// Aplicar regla de User-Agent guardada al iniciar
async function applyStoredDeviceSimulation() {
  try {
    const result = await chrome.storage.local.get([DEVICE_KEY]);
    const deviceId = result[DEVICE_KEY];
    
    if (deviceId && deviceId !== 'desktop') {
      // Obtener el device desde el storage (guardamos el device completo)
      const deviceResult = await chrome.storage.local.get(['device-simulation-data']);
      const device = deviceResult['device-simulation-data'];
      
      if (device && device.userAgent) {
        await updateUserAgentRule(device.userAgent);
        console.log(`[DeviceSim] Restaurado: ${device.name}`);
      }
    } else {
      // Limpiar reglas si está en desktop
      await clearUserAgentRule();
    }
  } catch (err) {
    console.error('[DeviceSim] Error restaurando simulación:', err);
  }
}

// Actualizar la regla de User-Agent
async function updateUserAgentRule(userAgent) {
  try {
    // Primero eliminar la regla existente
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [UA_RULE_ID]
    });

    if (userAgent) {
      // Agregar nueva regla
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [{
          id: UA_RULE_ID,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [{
              header: 'User-Agent',
              operation: 'set',
              value: userAgent
            }]
          },
          condition: {
            urlFilter: '*',
            resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'stylesheet', 'image', 'font', 'other']
          }
        }]
      });
      console.log('[DeviceSim] User-Agent actualizado:', userAgent);
    }
  } catch (err) {
    console.error('[DeviceSim] Error actualizando regla:', err);
  }
}

// Limpiar regla de User-Agent
async function clearUserAgentRule() {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [UA_RULE_ID]
    });
    console.log('[DeviceSim] Regla de User-Agent eliminada');
  } catch (err) {
    console.error('[DeviceSim] Error limpiando regla:', err);
  }
}

// Escuchar mensajes del popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_DEVICE') {
    const device = message.device;
    
    (async () => {
      try {
        if (device.id === 'desktop' || !device.userAgent) {
          // Desktop: limpiar reglas
          await clearUserAgentRule();
          await chrome.storage.local.remove(['device-simulation-data']);
        } else {
          // Guardar device data para restaurar después
          await chrome.storage.local.set({ 'device-simulation-data': device });
          await updateUserAgentRule(device.userAgent);
        }
        sendResponse({ success: true });
      } catch (err) {
        console.error('[DeviceSim] Error:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    
    return true; // Indica que sendResponse será llamado asíncronamente
  }
  
  if (message.type === 'GET_DEVICE') {
    chrome.storage.local.get([DEVICE_KEY, 'device-simulation-data'], (result) => {
      sendResponse({
        deviceId: result[DEVICE_KEY] || 'desktop',
        deviceData: result['device-simulation-data'] || null
      });
    });
    return true;
  }
});

// Aplicar simulación guardada al iniciar
applyStoredDeviceSimulation();

console.log('[UserScripts] Background service worker iniciado');
console.log('[DeviceSim] Device simulation ready');
