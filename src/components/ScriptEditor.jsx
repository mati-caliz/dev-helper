import { useState, useRef, useEffect } from 'preact/hooks';

export default function ScriptEditor({ value, onChange, placeholder = '// Tu código JavaScript aquí...' }) {
  const textareaRef = useRef(null);
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = localValue.substring(0, start) + '  ' + localValue.substring(end);
      setLocalValue(newValue);
      onChange?.(newValue);
      // Restaurar posición del cursor
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange?.(newValue);
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={localValue}
        onInput={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        spellcheck={false}
        className="w-full h-64 p-3 font-mono text-sm bg-gray-900 text-green-400 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-400 resize-y"
        style={{
          tabSize: 2,
          lineHeight: '1.5',
        }}
      />
      <div className="absolute top-2 right-2 text-xs text-gray-500">
        JavaScript
      </div>
    </div>
  );
}
