import { useEffect, useState } from 'preact/hooks';
import KeyValueManager from './KeyValueManager';

export default function CookiesTab({ tab }) {
  const [cookies, setCookies] = useState([]);

  const load = () => {
    if (import.meta.env.VITE_MODE === 'dev') {
      const parsed = document.cookie
        .split('; ')
        .filter(Boolean)
        .map((str) => {
            const [name, ...rest] = str.split('=');
            return { key: name?.trim(), value: rest.join('=') };
        })
        .filter(({ key }) => key);
      setCookies(parsed);
    } else if (chrome.cookies) {
      chrome.cookies.getAll({ url: tab.url }, (rawCookies) => {
        const formatted = rawCookies.map(c => ({ key: c.name, value: c.value }));
        setCookies(formatted);
      });
    }
  };

  useEffect(load, [tab]);

  const handleDelete = (key) => {
    if (import.meta.env.VITE_MODE === 'dev') {
      document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      load();
    } else {
      chrome.cookies.remove({ url: tab.url, name: key }, load);
    }
  };

  const handleUpdate = (key, newValue) => {
    if (import.meta.env.VITE_MODE === 'dev') {
      document.cookie = `${key}=${newValue}; path=/;`;
      load();
    } else {
      chrome.cookies.set({ url: tab.url, name: key, value: newValue }, load);
    }
  };

  const handleClearAllCookies = () => {
    if (import.meta.env.VITE_MODE === 'dev') {
        const parsed = document.cookie.split('; ');
        parsed.forEach(cookieStr => {
            const name = cookieStr.split('=')[0];
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        });
        setCookies([]);
    } else {
        cookies.forEach(cookie => {
            chrome.cookies.remove({ url: tab.url, name: cookie.name });
        });
        setCookies([]);
    }
  };

  const handleImport = (data) => {
    data.forEach(({ key, value }) => {
      if (import.meta.env.VITE_MODE === 'dev') {
        document.cookie = `${key}=${value}; path=/`;
      } else {
        chrome.cookies.set({
          url: tab.url,
          name: key,
          value: value
        });
      }
    });
    setTimeout(load, 500);
  };


  return (
    <KeyValueManager
      title="cookies"
      items={cookies}
      onDelete={handleDelete}
      onDeletAll={handleClearAllCookies}
      onUpdate={handleUpdate}
      onAddNew={handleUpdate}
      onImport={handleImport}
      filterPlaceholder="Filter cookies..."
    />
  );
}
