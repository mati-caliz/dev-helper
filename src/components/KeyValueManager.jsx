import { useState } from 'preact/hooks';
import { TrashIcon, EyeIcon, EyeSlashIcon, PlusCircleIcon , DocumentCheckIcon} from '@heroicons/react/24/outline';
import JsonCodeEditor from './JsonCodeEditor.jsx';


export default function KeyValueManager({ title, items, onDelete, onDeletAll, onUpdate, onAddNew, onImport, filterPlaceholder }) {
  const [visibleKey, setVisibleKey] = useState(null);
  const [value, setValue] = useState('');
  const [filter, setFilter] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const filteredItems = items.filter(({ key }) =>
    key.toLowerCase().includes(filter.toLowerCase())
  );

  const handleView = (key, val) => {
    setVisibleKey(prev => {
        if (prev === key) {
          return null; 
        } else {
          setValue(val);
          return key;
        }
    });
  };

  function handleSave(valueToSave) {
    onUpdate(visibleKey, valueToSave);
    setVisibleKey(null);
  }

  const handleAdd = () => {
    if (!newKey.trim()) return;
    onAddNew(newKey.trim(), newValue);
    setNewKey('');
    setNewValue('');
    setShowAddForm(false);
  }

  const exportAsJson = (data, filename = 'data') => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + 'plugin.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        onImport?.(data);
      } catch (err) {
        alert("Archivo JSON inválido");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Top Actions */}
      <div className="flex flex-col items-center justify-between gap-4">
        <input
          type="text"
          placeholder={filterPlaceholder}
          value={filter}
          onInput={e => setFilter(e.target.value)}
          className="w-full px-3 py-2 cursor-pointer border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary-400 text-white"
        />
        
        <div className="flex flex-wrap gap-2">
          <button
            className="cursor-pointer bg-secondary-700 text-white px-4 py-2 shadow-sm rounded-lg hover:bg-secondary-500 transition"
            onClick={() => setShowAddForm(p => !p)}
          >
            {showAddForm ? 'Cancel' : 'Add'}
          </button>
          <button
            className="cursor-pointer bg-secondary-700 text-white px-4 py-2 shadow-sm rounded-lg hover:bg-secondary-500 transition"
            onClick={() => exportAsJson(items, title)}
          >
            Export
          </button>
          <input
            type="file"
            accept=".json"
            id={`import-${title}`}
            className="hidden"
            onChange={handleImportJson}
          />
          <label
            htmlFor={`import-${title}`}
            className="cursor-pointer bg-secondary-700 text-white px-4 py-2 shadow-sm rounded-lg hover:bg-secondary-500 transition"
          >
            Import
          </label>
          <button
            className="cursor-pointer bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
            onClick={onDeletAll}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Add Entry Form */}
      {showAddForm && (
        <div className="flex flex-row items-center justify-between gap-2">
          <div className="flex basis-7/8 flex-col items-start gap-2">
            <input
              className="w-full flex-1 px-5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-400 text-white"
              placeholder="New Key"
              value={newKey}
              onInput={e => setNewKey(e.target.value)}
            />
            <input
              className="w-full flex-1 px-5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-400 text-white"
              placeholder="New Value"
              value={newValue}
              onInput={e => setNewValue(e.target.value)}
            />
          </div>
          <button className="cursor-pointer basis-1/8" onClick={handleAdd}>
            <PlusCircleIcon class="w-10 h-10 text-white" />
          </button>
          
        </div>
      )}

      {/* List */}
      <ul className="space-y-4">
        {filteredItems.map(({ key, value: val }) => (
          <li key={key}>
            <div className="flex flex-col border border-gray-200 rounded-lg p-3 shadow-sm">
              <div className="flex flex-row justify-between items-start">
                <span className="w-75/100 font-mono text-sm break-all text-white">{key}</span>
                <div className="flex gap-2">
                  <button
                    className="text-blue-600 hover:text-blue-800 transition"
                    onClick={() => handleView(key, val)}
                  >
                    {visibleKey === key && <EyeIcon class="w-6 h-6"/>}
                    {visibleKey !== key && <EyeSlashIcon class="w-6 h-6"/>}
                  </button>
                  <button
                    className="text-red-600 hover:text-red-800 transition"
                    onClick={() => onDelete(key)}
                  >
                    <TrashIcon class="w-6 h-6"/>
                  </button>
                </div>
              </div>
              

              {visibleKey === key && (
                <div className="mt-2 space-y-2">
                  <JsonCodeEditor
                    value={value}
                    onSave={(t) => handleSave(t)}
                  />
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}