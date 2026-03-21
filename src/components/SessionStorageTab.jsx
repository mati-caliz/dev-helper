import { useEffect, useState } from 'preact/hooks';
import KeyValueManager from './KeyValueManager';

export default function SessionStorageTab({ tab }) {
  const [entries, setEntries] = useState([]);

  const load = () => {
    if (import.meta.env.VITE_MODE === 'dev') {
      const keys = Object.keys(sessionStorage);
      setEntries(keys.map(k => ({ key: k, value: sessionStorage.getItem(k) })));
    } else {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const keys = Object.keys(sessionStorage);
          return keys.map(k => ({ key: k, value: sessionStorage.getItem(k) }));
        }
      }).then(([{ result }]) => setEntries(result));
    }
  };

  useEffect(load, [tab]);

  const handleDelete = (key) => {
    if (import.meta.env.VITE_MODE === 'dev') {
      sessionStorage.removeItem(key);
      setEntries(prev => prev.filter(e => e.key !== key));
    } else {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: k => sessionStorage.removeItem(k),
        args: [key]
      }).then(() => {
        setEntries(prev => prev.filter(e => e.key !== key));
      });
    }
  };

  const handleUpdate = (key, newValue) => {
    if (import.meta.env.VITE_MODE === 'dev') {
      sessionStorage.setItem(key, newValue);
      load();
    } else {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (k, v) => sessionStorage.setItem(k, v),
        args: [key, newValue]
      }).then(load);
    }
  };

  const handleClearAllSessionStorage = () => {
    if (import.meta.env.VITE_MODE === 'dev') {
        sessionStorage.clear();
        setEntries([]);
    } else {
        chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => sessionStorage.clear()
        }, () => {
        setEntries([]);
        });
    }
  };

  const handleImport = (data) => {
    data.forEach(({ key, value }) => {
      if (import.meta.env.VITE_MODE === 'dev') {
        sessionStorage.setItem(key, value);
      } else {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (k, v) => sessionStorage.setItem(k, v),
          args: [key, value]
        });
      }
    });
    load();
  };


  return (
    <KeyValueManager
      title="sessionStorage"
      items={entries}
      onDelete={handleDelete}
      onDeletAll={handleClearAllSessionStorage}
      onUpdate={handleUpdate}
      onAddNew={handleUpdate}
      onImport={handleImport}
      filterPlaceholder="Filtrar sessionStorage..."
    />
  );
}
