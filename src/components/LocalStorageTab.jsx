import { useEffect, useState } from 'preact/hooks';
import KeyValueManager from './KeyValueManager';

export default function LocalStorageTab({ tab }) {
  const [entries, setEntries] = useState([]);

  const load = () => {
    if (import.meta.env.VITE_MODE === 'dev') {
      const keys = Object.keys(localStorage);
      setEntries(keys.map(k => ({ key: k, value: localStorage.getItem(k) })));
    } else {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const keys = Object.keys(localStorage);
          return keys.map(k => ({ key: k, value: localStorage.getItem(k) }));
        }
      }).then(([{ result }]) => setEntries(result));
    }
  };

  useEffect(load, [tab]);

  const handleDelete = (key) => {
    if (import.meta.env.VITE_MODE === 'dev') {
      localStorage.removeItem(key);
      setEntries(prev => prev.filter(e => e.key !== key));
    } else {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: k => localStorage.removeItem(k),
        args: [key]
      }).then(() => {
        setEntries(prev => prev.filter(e => e.key !== key));
      });
    }
  };

  const handleUpdate = (key, newValue) => {
    if (import.meta.env.VITE_MODE === 'dev') {
      localStorage.setItem(key, newValue);
      load();
    } else {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (k, v) => localStorage.setItem(k, v),
        args: [key, newValue]
      }).then(load);
    }
  };

  const handleClearAllLocalStorage = () => {
    if (import.meta.env.VITE_MODE === 'dev') {
        localStorage.clear();
        setEntries([]);
    } else {
        chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => localStorage.clear()
        }, () => {
        setEntries([]);
        });
    }
  };

  const handleImport = (data) => {
    data.forEach(({ key, value }) => {
      if (import.meta.env.VITE_MODE === 'dev') {
        localStorage.setItem(key, value);
      } else {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (k, v) => localStorage.setItem(k, v),
          args: [key, value]
        });
      }
    });
    load();
  };


  return (
    <KeyValueManager
      title="localStorage"
      items={entries}
      onDelete={handleDelete}
      onDeletAll={handleClearAllLocalStorage}
      onUpdate={handleUpdate}
      onAddNew={handleUpdate}
      onImport={handleImport}
      filterPlaceholder="Filter localStorage..."
    />
  );
}