import { useEffect, useState } from 'preact/hooks';
import { TrashIcon, PencilIcon, PlayIcon, StopIcon, DocumentDuplicateIcon, FolderIcon, BookOpenIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import ScriptEditor from './ScriptEditor';
import SnippetsModal from './SnippetsModal';

const STORAGE_KEY = 'userscripts';
const GROUPS_KEY = 'userscripts_groups';

const DEFAULT_GROUPS = [
  { id: 'default', name: '📁 General', color: 'gray' },
  { id: 'despegar-debug', name: '🛫 Despegar Debug', color: 'blue' },
  { id: 'despegar-ui', name: '🎨 Despegar UI', color: 'purple' },
  { id: 'utils', name: '🔧 Utilidades', color: 'green' },
];

export default function ScriptsTab({ tab }) {
  const [scripts, setScripts] = useState([]);
  const [groups, setGroups] = useState(DEFAULT_GROUPS);
  const [editingScript, setEditingScript] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [newGroupName, setNewGroupName] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    urlPattern: '*',
    code: '',
    enabled: true,
    runAt: 'document_idle',
    groupId: 'default'
  });

  // Cargar scripts y grupos guardados
  const loadScripts = () => {
    if (import.meta.env.VITE_MODE === 'dev') {
      const saved = localStorage.getItem(STORAGE_KEY);
      const savedGroups = localStorage.getItem(GROUPS_KEY);
      setScripts(saved ? JSON.parse(saved) : []);
      if (savedGroups) setGroups(JSON.parse(savedGroups));
    } else {
      chrome.storage.local.get([STORAGE_KEY, GROUPS_KEY], (result) => {
        setScripts(result[STORAGE_KEY] || []);
        if (result[GROUPS_KEY]) setGroups(result[GROUPS_KEY]);
      });
    }
  };

  // Guardar scripts
  const saveScripts = (newScripts) => {
    if (import.meta.env.VITE_MODE === 'dev') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newScripts));
    } else {
      chrome.storage.local.set({ [STORAGE_KEY]: newScripts });
    }
    setScripts(newScripts);
  };

  // Guardar grupos
  const saveGroups = (newGroups) => {
    if (import.meta.env.VITE_MODE === 'dev') {
      localStorage.setItem(GROUPS_KEY, JSON.stringify(newGroups));
    } else {
      chrome.storage.local.set({ [GROUPS_KEY]: newGroups });
    }
    setGroups(newGroups);
  };

  useEffect(loadScripts, []);

  const resetForm = () => {
    setFormData({
      name: '',
      urlPattern: '*',
      code: '',
      enabled: true,
      runAt: 'document_idle',
      groupId: 'default'
    });
    setEditingScript(null);
    setShowAddForm(false);
  };

  const handleAddOrUpdate = () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      alert('Nombre y código son requeridos');
      return;
    }

    let newScripts;
    if (editingScript !== null) {
      newScripts = scripts.map((s, i) => 
        i === editingScript ? { ...formData, id: s.id } : s
      );
    } else {
      const newScript = {
        ...formData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      newScripts = [...scripts, newScript];
    }
    
    saveScripts(newScripts);
    resetForm();
  };

  const handleEdit = (index) => {
    const script = scripts[index];
    setFormData({
      ...script,
      groupId: script.groupId || 'default'
    });
    setEditingScript(index);
    setShowAddForm(true);
  };

  const handleDelete = (index) => {
    if (confirm('¿Eliminar este script?')) {
      const newScripts = scripts.filter((_, i) => i !== index);
      saveScripts(newScripts);
    }
  };

  const handleToggleEnabled = (index) => {
    const newScripts = scripts.map((s, i) => 
      i === index ? { ...s, enabled: !s.enabled } : s
    );
    saveScripts(newScripts);
  };

  const handleRunNow = (script) => {
    if (import.meta.env.VITE_MODE === 'dev') {
      try {
        eval(script.code);
        console.log(`Script "${script.name}" ejecutado`);
      } catch (e) {
        console.error('Error ejecutando script:', e);
        alert('Error: ' + e.message);
      }
    } else {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (code) => {
          try {
            eval(code);
          } catch (e) {
            console.error('Script error:', e);
          }
        },
        args: [script.code],
        world: 'MAIN'
      }).catch(err => {
        console.error('Error ejecutando script:', err);
        alert('Error: ' + err.message);
      });
    }
  };

  const exportScripts = () => {
    const data = { scripts, groups };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'userscripts.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        // Soportar formato viejo (array) y nuevo (objeto con scripts y groups)
        if (Array.isArray(data)) {
          const withIds = data.map(s => ({
            ...s,
            id: s.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
            groupId: s.groupId || 'default'
          }));
          saveScripts([...scripts, ...withIds]);
        } else if (data.scripts) {
          const withIds = data.scripts.map(s => ({
            ...s,
            id: s.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
            groupId: s.groupId || 'default'
          }));
          saveScripts([...scripts, ...withIds]);
          if (data.groups) {
            const newGroups = [...groups];
            data.groups.forEach(g => {
              if (!newGroups.find(eg => eg.id === g.id)) {
                newGroups.push(g);
              }
            });
            saveGroups(newGroups);
          }
        }
      } catch (err) {
        alert('Archivo JSON inválido');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearAll = () => {
    if (confirm('¿Eliminar TODOS los scripts?')) {
      saveScripts([]);
    }
  };

  const handleDuplicate = (script) => {
    const duplicated = {
      ...script,
      id: Date.now().toString(),
      name: `${script.name} (copia)`,
      createdAt: new Date().toISOString()
    };
    saveScripts([...scripts, duplicated]);
  };

  const handleSnippetSelect = (snippet) => {
    // Mapear categoría del snippet a grupo
    let groupId = 'default';
    if (snippet.category.includes('Debug')) groupId = 'despegar-debug';
    else if (snippet.category.includes('UI')) groupId = 'despegar-ui';
    else if (snippet.category.includes('Utilidades')) groupId = 'utils';

    setFormData({
      name: snippet.name,
      urlPattern: snippet.category.includes('Despegar') ? '*://*.despegar.com/*' : '*',
      code: snippet.code,
      enabled: true,
      runAt: 'document_idle',
      groupId
    });
    setShowAddForm(true);
  };

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup = {
      id: Date.now().toString(),
      name: newGroupName.trim(),
      color: 'gray'
    };
    saveGroups([...groups, newGroup]);
    setNewGroupName('');
    setShowGroupForm(false);
  };

  const handleDeleteGroup = (groupId) => {
    if (groupId === 'default') return;
    if (confirm('¿Eliminar este grupo? Los scripts se moverán a General.')) {
      // Mover scripts del grupo a default
      const updatedScripts = scripts.map(s => 
        s.groupId === groupId ? { ...s, groupId: 'default' } : s
      );
      saveScripts(updatedScripts);
      saveGroups(groups.filter(g => g.id !== groupId));
    }
  };

  const toggleGroupCollapse = (groupId) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const filteredScripts = scripts.filter(s => {
    const searchTerm = filter.toLowerCase();
    const matchesSearch = s.name.toLowerCase().includes(searchTerm) ||
      s.urlPattern.toLowerCase().includes(searchTerm) ||
      s.code.toLowerCase().includes(searchTerm);
    const matchesGroup = selectedGroup === 'all' || (s.groupId || 'default') === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  // Agrupar scripts por grupo
  const scriptsByGroup = groups.reduce((acc, group) => {
    acc[group.id] = filteredScripts.filter(s => (s.groupId || 'default') === group.id);
    return acc;
  }, {});

  return (
    <div className="p-4 space-y-4">
      {/* Top Actions */}
      <div className="flex flex-col items-center justify-between gap-3">
        <input
          type="text"
          placeholder="Filtrar scripts (nombre, URL, código)..."
          value={filter}
          onInput={e => setFilter(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary-400 text-white"
        />

        {/* Group filter */}
        <div className="flex flex-wrap gap-1 w-full">
          <button
            onClick={() => setSelectedGroup('all')}
            className={`px-2 py-1 rounded text-xs transition ${
              selectedGroup === 'all' 
                ? 'bg-secondary-700 text-white' 
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            Todos
          </button>
          {groups.map(group => (
            <button
              key={group.id}
              onClick={() => setSelectedGroup(group.id)}
              className={`px-2 py-1 rounded text-xs transition ${
                selectedGroup === group.id 
                  ? 'bg-secondary-700 text-white' 
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              {group.name}
            </button>
          ))}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            className="cursor-pointer bg-secondary-700 text-white px-3 py-2 text-sm shadow-sm rounded-lg hover:bg-secondary-500 transition"
            onClick={() => {
              if (showAddForm) resetForm();
              else setShowAddForm(true);
            }}
          >
            {showAddForm ? 'Cancelar' : '+ Nuevo'}
          </button>
          <button
            className="cursor-pointer bg-purple-600 text-white px-3 py-2 text-sm shadow-sm rounded-lg hover:bg-purple-500 transition flex items-center gap-1"
            onClick={() => setShowSnippets(true)}
          >
            <BookOpenIcon className="w-4 h-4" />
            Snippets
          </button>
          <button
            className="cursor-pointer bg-secondary-700 text-white px-3 py-2 text-sm shadow-sm rounded-lg hover:bg-secondary-500 transition"
            onClick={exportScripts}
          >
            Exportar
          </button>
          <input
            type="file"
            accept=".json"
            id="import-scripts"
            className="hidden"
            onChange={handleImport}
          />
          <label
            htmlFor="import-scripts"
            className="cursor-pointer bg-secondary-700 text-white px-3 py-2 text-sm shadow-sm rounded-lg hover:bg-secondary-500 transition"
          >
            Importar
          </label>
          <button
            className="cursor-pointer bg-gray-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-gray-500 transition"
            onClick={() => setShowGroupForm(!showGroupForm)}
          >
            <FolderIcon className="w-4 h-4 inline" /> +
          </button>
        </div>
      </div>

      {/* Add Group Form */}
      {showGroupForm && (
        <div className="flex gap-2 items-center bg-gray-700 p-3 rounded-lg">
          <input
            className="flex-1 px-3 py-2 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-400 text-white bg-gray-800 text-sm"
            placeholder="Nombre del grupo..."
            value={newGroupName}
            onInput={e => setNewGroupName(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleAddGroup()}
          />
          <button
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            onClick={handleAddGroup}
          >
            Crear
          </button>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="border border-gray-600 rounded-lg p-4 space-y-3 bg-gray-700">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-400 text-white bg-gray-800"
                placeholder="Nombre del script"
                value={formData.name}
                onInput={e => setFormData(f => ({ ...f, name: e.target.value }))}
              />
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-400 text-white bg-gray-800"
                value={formData.groupId}
                onChange={e => setFormData(f => ({ ...f, groupId: e.target.value }))}
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-400 text-white bg-gray-800"
              placeholder="URL Pattern (ej: *://*.despegar.com/* o *)"
              value={formData.urlPattern}
              onInput={e => setFormData(f => ({ ...f, urlPattern: e.target.value }))}
            />
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-400 text-white bg-gray-800"
              value={formData.runAt}
              onChange={e => setFormData(f => ({ ...f, runAt: e.target.value }))}
            >
              <option value="document_start">Al inicio</option>
              <option value="document_end">Al final del DOM</option>
              <option value="document_idle">Cuando idle</option>
            </select>

            <ScriptEditor
              value={formData.code}
              onChange={(code) => setFormData(f => ({ ...f, code }))}
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="script-enabled"
                checked={formData.enabled}
                onChange={e => setFormData(f => ({ ...f, enabled: e.target.checked }))}
                className="w-4 h-4"
              />
              <label htmlFor="script-enabled" className="text-white text-sm">
                Habilitado
              </label>
            </div>

            <button
              className="w-full cursor-pointer bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              onClick={handleAddOrUpdate}
            >
              {editingScript !== null ? 'Actualizar Script' : 'Guardar Script'}
            </button>
          </div>
        </div>
      )}

      {/* Scripts List by Group */}
      <div className="space-y-4">
        {groups.map(group => {
          const groupScripts = scriptsByGroup[group.id] || [];
          if (selectedGroup !== 'all' && selectedGroup !== group.id) return null;
          if (groupScripts.length === 0 && selectedGroup === 'all') return null;

          return (
            <div key={group.id} className="border border-gray-600 rounded-lg overflow-hidden">
              {/* Group Header */}
              <div 
                className="flex justify-between items-center px-3 py-2 bg-gray-700 cursor-pointer hover:bg-gray-600"
                onClick={() => toggleGroupCollapse(group.id)}
              >
                <div className="flex items-center gap-2">
                  {collapsedGroups[group.id] 
                    ? <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    : <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                  }
                  <span className="text-white font-medium text-sm">{group.name}</span>
                  <span className="text-xs text-gray-400">({groupScripts.length})</span>
                </div>
                {group.id !== 'default' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Eliminar
                  </button>
                )}
              </div>

              {/* Group Scripts */}
              {!collapsedGroups[group.id] && (
                <ul className="p-2 space-y-2">
                  {groupScripts.map((script) => {
                    const scriptIndex = scripts.indexOf(script);
                    return (
                      <li key={script.id}>
                        <div className={`border rounded-lg p-3 shadow-sm ${script.enabled ? 'border-green-500 bg-gray-800' : 'border-gray-500 bg-gray-900 opacity-60'}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${script.enabled ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                                <span className="font-medium text-white text-sm truncate">{script.name}</span>
                              </div>
                              <div className="text-xs text-gray-400 mt-1 font-mono truncate">
                                {script.urlPattern}
                              </div>
                            </div>
                            <div className="flex gap-0.5 flex-shrink-0">
                              <button
                                className="p-1 text-green-500 hover:text-green-400 transition"
                                onClick={() => handleRunNow(script)}
                                title="Ejecutar ahora"
                              >
                                <PlayIcon className="w-4 h-4" />
                              </button>
                              <button
                                className={`p-1 transition ${script.enabled ? 'text-yellow-500 hover:text-yellow-400' : 'text-gray-500 hover:text-gray-400'}`}
                                onClick={() => handleToggleEnabled(scriptIndex)}
                                title={script.enabled ? 'Deshabilitar' : 'Habilitar'}
                              >
                                <StopIcon className="w-4 h-4" />
                              </button>
                              <button
                                className="p-1 text-purple-500 hover:text-purple-400 transition"
                                onClick={() => handleDuplicate(script)}
                                title="Duplicar"
                              >
                                <DocumentDuplicateIcon className="w-4 h-4" />
                              </button>
                              <button
                                className="p-1 text-blue-500 hover:text-blue-400 transition"
                                onClick={() => handleEdit(scriptIndex)}
                                title="Editar"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                className="p-1 text-red-500 hover:text-red-400 transition"
                                onClick={() => handleDelete(scriptIndex)}
                                title="Eliminar"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  {groupScripts.length === 0 && (
                    <li className="text-center text-gray-500 py-4 text-sm">
                      No hay scripts en este grupo
                    </li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {filteredScripts.length === 0 && !showAddForm && (
        <div className="text-center text-gray-400 py-8">
          <p>No hay scripts.</p>
          <button 
            onClick={() => setShowSnippets(true)}
            className="mt-2 text-purple-400 hover:text-purple-300 underline"
          >
            Explorar snippets predefinidos →
          </button>
        </div>
      )}

      {/* Snippets Modal */}
      <SnippetsModal
        isOpen={showSnippets}
        onClose={() => setShowSnippets(false)}
        onSelect={handleSnippetSelect}
      />
    </div>
  );
}
