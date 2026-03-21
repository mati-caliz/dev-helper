import { useMemo, useRef, useEffect, useState } from 'preact/hooks';

const parse = (t) => { try { return { ok: true, val: JSON.parse(t) }; } catch { return { ok: false, val: null }; } };

const isStructuredJSON = (t) => {
  const { ok, val } = parse(t);
  return ok && val !== null && (Array.isArray(val) || typeof val === 'object');
};

const prettyForView = (t) => {
  const { ok, val } = parse(t);
  return ok && isStructuredJSON(t) ? JSON.stringify(val, null, 2) : (t ?? '');
};

export default function JsonCodeEditor({ value = '', onSave, className = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const taRef = useRef(null);


  useEffect(() => {
    if (!editing) {
      setDraft(value);
      setError(null);
    }
  }, [value, editing]);

  const viewText = useMemo(
    () => (prettyForView(editing ? draft : value)),
    [editing, draft, value]
  );

  const startEdit = () => {
    setEditing(true);
    if (isStructuredJSON(value)) {
      setDraft(prettyForView(value));
    } else {
      setDraft(value);
    }
    setError(null);
    setConfirmPlain(false);
    requestAnimationFrame(() => taRef.current?.focus());
  };

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(viewText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Cannot copied:", e);
    }
  };

   const doSave = () => {
    if (isStructuredJSON(draft)) {
      const {val} = parse(draft);
      const toPersist = JSON.stringify(val);
      setError(null);
      setEditing(false);
      onSave?.(toPersist);
      return;
    }
    setError(null);
    setEditing(false);
    onSave?.(draft);
  };

  const insertAtCursor = (txt) => {
    const el = taRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = draft.slice(0, start) + txt + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + txt.length;
    });
  };

  const onKeyDown = (e) => {
    if (!editing) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      insertAtCursor('  ');
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const el = taRef.current;
      const start = el.selectionStart;
      const before = draft.slice(0, start);
      const lineStart = before.lastIndexOf('\n') + 1;
      const currentLine = before.slice(lineStart);
      const indent = (currentLine.match(/^[\t ]*/) || [''])[0];
      const extra = /[\{\[]\s*$/.test(currentLine.trimEnd()) ? '  ' : '';
      insertAtCursor('\n' + indent + extra);
      return;
    }
  };

  return (
    <div class={`space-y-2 ${className}`}>
      {!editing ? (
        <pre class="w-full max-h-96 overflow-auto rounded-lg border border-gray-200 p-3 font-mono text-xs leading-5 bg-gray-900 text-green-200 whitespace-pre-wrap">
          {viewText}
        </pre>
      ) : (
        <textarea
          ref={taRef}
          value={draft}
          onInput={(e) => { setDraft(e.currentTarget.value); setError(null); }}
          onKeyDown={onKeyDown}
          spellcheck={false}
          class="w-full max-h-96 h-64 overflow-auto rounded-lg border border-gray-200 p-3 font-mono text-xs leading-5 bg-gray-900 text-green-200 outline-none"
          style={{ resize: 'vertical', tabSize: 2 }}
        />
      )}

      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="flex items-center gap-2 flex-wrap">
          {!editing ? (
            <button
              class="px-3 py-1 rounded bg-gray-700 text-white hover:bg-gray-600"
              onClick={startEdit}
            >
              Edit
            </button>
          ) : (
            <>
              <button
                class="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                onClick={doSave}
              >
                Save
              </button>
              <button
                class="px-3 py-1 rounded bg-gray-300 hover:bg-gray-200"
                onClick={() => {
                  setEditing(false);
                  setDraft(value);
                  setError(null);
                }}
              >
                Cancel
              </button>

              {error && <span class="text-red-400 text-sm">{error}</span>}
            </>
          )}
        </div>

        <button
          class={`px-3 py-1 rounded ${
            copied ? 'bg-green-600 text-white' : 'bg-gray-300 hover:bg-gray-200'
          } transition-colors`}
          onClick={doCopy}
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
    </div>
  );
}