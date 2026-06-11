// ─── AnimalNotesTab ───────────────────────────────────────────────────────────
// Drop-in Notes tab for AnimalProfileView.
// Props: animalId (string), isMobile (bool)
// Requires: React, C, Card, Btn, Badge, Icon, EmptyState (all window-scoped from ui.jsx)
//
// API contract:
//   GET    /api/dashboard/animals/:id/notes              → { notes: Note[] }
//   POST   /api/dashboard/animals/:id/notes              → { ok, id, author_name, created_at }
//   PATCH  /api/dashboard/animals/:id/notes/:noteId      → { ok }
//   DELETE /api/dashboard/animals/:id/notes/:noteId      → { ok }
//
// Note shape:
//   { id, note_type, body, is_pinned, is_private, author_name, author_full_name,
//     edited_at, created_at, updated_at }

const NOTE_TYPES = [
  { value: 'general',    label: 'General',    color: '#94a3b8' },
  { value: 'medical',    label: 'Medical',    color: '#f87171' },
  { value: 'behavioral', label: 'Behavioral', color: '#fb923c' },
  { value: 'foster',     label: 'Foster',     color: '#a78bfa' },
  { value: 'intake',     label: 'Intake',     color: '#60a5fa' },
  { value: 'urgent',     label: 'Urgent',     color: '#ef4444' },
];

function noteTypeColor(t) {
  return NOTE_TYPES.find(n => n.value === t)?.color || '#94a3b8';
}

function noteTypeLabel(t) {
  return NOTE_TYPES.find(n => n.value === t)?.label || t;
}

function fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    });
  } catch { return iso; }
}

function AnimalNotesTab({ animalId, isMobile }) {
  const [notes,      setNotes]      = useState(null);   // null = loading
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId,  setEditingId]  = useState(null);   // note id being edited
  const [deletingId, setDeletingId] = useState(null);   // confirm delete
  const [error,      setError]      = useState('');

  // Compose state
  const [body,      setBody]      = useState('');
  const [noteType,  setNoteType]  = useState('general');
  const [isPinned,  setIsPinned]  = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showCompose, setShowCompose] = useState(false);

  // Edit state
  const [editBody,     setEditBody]     = useState('');
  const [editNoteType, setEditNoteType] = useState('general');
  const [editPinned,   setEditPinned]   = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = () => {
    setLoading(true);
    fetch(`/api/dashboard/animals/${animalId}/notes`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setNotes(d.notes || []); setLoading(false); })
      .catch(() => { setNotes([]); setLoading(false); });
  };

  React.useEffect(() => { load(); }, [animalId]);

  // ── Submit new note ───────────────────────────────────────────────────────
  const submitNote = async () => {
    const trimmed = body.trim();
    if (!trimmed) { setError('Note body is required.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/dashboard/animals/${animalId}/notes`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed, note_type: noteType, is_pinned: isPinned, is_private: isPrivate })
      });
      const d = await res.json();
      if (!d.ok) { setError(d.error || 'Failed to save note.'); }
      else {
        setBody(''); setNoteType('general'); setIsPinned(false); setIsPrivate(false);
        setShowCompose(false);
        load();
      }
    } catch (e) { setError('Network error — try again.'); }
    setSubmitting(false);
  };

  // ── Save edit ─────────────────────────────────────────────────────────────
  const saveEdit = async (noteId) => {
    const trimmed = editBody.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await fetch(`/api/dashboard/animals/${animalId}/notes/${noteId}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed, note_type: editNoteType, is_pinned: editPinned })
      });
      setEditingId(null);
      load();
    } catch {}
    setSubmitting(false);
  };

  // ── Toggle pin ────────────────────────────────────────────────────────────
  const togglePin = async (note) => {
    await fetch(`/api/dashboard/animals/${animalId}/notes/${note.id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_pinned: note.is_pinned ? 0 : 1 })
    }).catch(() => {});
    load();
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteNote = async (noteId) => {
    await fetch(`/api/dashboard/animals/${animalId}/notes/${noteId}`, {
      method: 'DELETE', credentials: 'include'
    }).catch(() => {});
    setDeletingId(null);
    load();
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const composeStyle = {
    background: C.surface, border: `1px solid ${C.purple}66`,
    borderRadius: 12, padding: isMobile ? '14px 14px' : '18px 20px',
    marginBottom: 20,
  };
  const noteCardStyle = (note) => ({
    background: note.is_pinned ? C.purpleDim : C.surface,
    border: `1px solid ${note.is_pinned ? C.purple + '55' : C.border}`,
    borderLeft: `3px solid ${noteTypeColor(note.note_type)}`,
    borderRadius: 10, padding: isMobile ? '12px 14px' : '14px 18px',
    marginBottom: 10, transition: 'all .15s',
  });
  const labelStyle = {
    fontSize: 11, fontWeight: 600, color: C.textSec,
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
  };
  const typeSelectStyle = {
    background: C.raised, border: `1px solid ${C.border}`, borderRadius: 8,
    padding: '7px 10px', color: C.text, fontSize: 13, cursor: 'pointer',
    minWidth: isMobile ? 120 : 140,
  };
  const textareaStyle = (minH) => ({
    width: '100%', background: C.raised, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: '10px 12px', color: C.text,
    fontSize: 13, lineHeight: 1.6, resize: 'vertical',
    minHeight: minH, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  });

  // ── Empty / Loading ───────────────────────────────────────────────────────
  if (loading) {
    return React.createElement('div', { style: { padding: '32px 0', textAlign: 'center', color: C.textMut, fontSize: 13 } },
      'Loading notes…'
    );
  }

  const pinnedNotes = (notes || []).filter(n => n.is_pinned);
  const regularNotes = (notes || []).filter(n => !n.is_pinned);

  // ── Note card renderer ────────────────────────────────────────────────────
  const renderNote = (note) => {
    const isEditing = editingId === note.id;
    const isDelConfirm = deletingId === note.id;
    const typeColor = noteTypeColor(note.note_type);

    return React.createElement('div', { key: note.id, style: noteCardStyle(note) },

      // Header row
      React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: isEditing ? 10 : 6, flexWrap: 'wrap' } },
        // Type badge
        React.createElement('span', {
          style: { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
            background: typeColor + '22', color: typeColor, border: `1px solid ${typeColor}44`,
            textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }
        }, noteTypeLabel(note.note_type)),

        // Pinned indicator
        note.is_pinned && React.createElement('span', {
          style: { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
            background: C.purpleDim, color: C.purpleL, border: `1px solid ${C.purple}44` }
        }, '📌 Pinned'),

        // Private indicator
        note.is_private && React.createElement('span', {
          style: { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
            background: C.yellowDim, color: C.yellow, border: `1px solid ${C.yellow}44` }
        }, '🔒 Private'),

        // Spacer
        React.createElement('div', { style: { flex: 1 } }),

        // Action buttons (not in edit mode)
        !isEditing && !isDelConfirm && React.createElement('div', { style: { display: 'flex', gap: 4, flexShrink: 0 } },
          // Pin toggle
          React.createElement('button', {
            title: note.is_pinned ? 'Unpin' : 'Pin note',
            onClick: () => togglePin(note),
            style: { background: 'none', border: 'none', cursor: 'pointer', color: note.is_pinned ? C.purpleL : C.textMut,
              fontSize: 14, padding: '2px 6px', borderRadius: 6, lineHeight: 1 }
          }, '📌'),
          // Edit
          React.createElement('button', {
            title: 'Edit note',
            onClick: () => { setEditingId(note.id); setEditBody(note.body); setEditNoteType(note.note_type); setEditPinned(!!note.is_pinned); },
            style: { background: 'none', border: 'none', cursor: 'pointer', color: C.textMut,
              fontSize: 13, padding: '2px 6px', borderRadius: 6 }
          }, '✏️'),
          // Delete
          React.createElement('button', {
            title: 'Delete note',
            onClick: () => setDeletingId(note.id),
            style: { background: 'none', border: 'none', cursor: 'pointer', color: C.textMut,
              fontSize: 13, padding: '2px 6px', borderRadius: 6 }
          }, '🗑️')
        )
      ),

      // Delete confirm
      isDelConfirm && React.createElement('div', {
        style: { background: C.redDim, border: `1px solid ${C.red}44`, borderRadius: 8,
          padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
      },
        React.createElement('span', { style: { fontSize: 13, color: C.red, flex: 1 } }, 'Delete this note permanently?'),
        React.createElement(Btn, { size: 'sm', variant: 'secondary', onClick: () => setDeletingId(null) }, 'Cancel'),
        React.createElement('button', {
          onClick: () => deleteNote(note.id),
          style: { background: C.red, color: '#fff', border: 'none', borderRadius: 8,
            padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
        }, 'Delete')
      ),

      // Edit mode
      isEditing
        ? React.createElement('div', null,
            React.createElement('div', { style: { display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
              React.createElement('select', { value: editNoteType, onChange: e => setEditNoteType(e.target.value), style: typeSelectStyle },
                NOTE_TYPES.map(t => React.createElement('option', { key: t.value, value: t.value }, t.label))
              ),
              React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textSec, cursor: 'pointer' } },
                React.createElement('input', { type: 'checkbox', checked: !!editPinned, onChange: e => setEditPinned(e.target.checked) }),
                'Pin'
              )
            ),
            React.createElement('textarea', {
              value: editBody, onChange: e => setEditBody(e.target.value),
              style: textareaStyle(80), autoFocus: true
            }),
            React.createElement('div', { style: { display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' } },
              React.createElement(Btn, { size: 'sm', variant: 'secondary', onClick: () => setEditingId(null) }, 'Cancel'),
              React.createElement(Btn, { size: 'sm', onClick: () => saveEdit(note.id), disabled: submitting },
                submitting ? 'Saving…' : 'Save'
              )
            )
          )
        : React.createElement('p', {
            style: { margin: 0, fontSize: 13, color: C.text, lineHeight: 1.7,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
          }, note.body),

      // Footer: author + timestamps
      !isEditing && React.createElement('div', {
        style: { marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }
      },
        React.createElement('span', { style: { fontSize: 11, color: C.purpleL, fontWeight: 600 } },
          note.author_full_name || note.author_name || 'Staff'
        ),
        React.createElement('span', { style: { fontSize: 11, color: C.textMut } },
          fmtDate(note.created_at)
        ),
        note.edited_at && React.createElement('span', { style: { fontSize: 11, color: C.textMut, fontStyle: 'italic' } },
          `edited ${fmtDate(note.edited_at)}`
        )
      )
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────
  return React.createElement('div', { style: { paddingTop: 4 } },

    // ── Compose toggle bar ────────────────────────────────────────────────
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } },
      React.createElement('div', { style: { fontSize: 13, color: C.textSec } },
        notes.length === 0 ? 'No notes yet.' : `${notes.length} note${notes.length !== 1 ? 's' : ''}`
      ),
      !showCompose && React.createElement(Btn, { size: 'sm', icon: 'plus', onClick: () => { setShowCompose(true); setError(''); } },
        'Add Note'
      )
    ),

    // ── Compose box ───────────────────────────────────────────────────────
    showCompose && React.createElement('div', { style: composeStyle },
      React.createElement('div', { style: { ...labelStyle, marginBottom: 12 } }, 'New Note'),

      // Type + options row
      React.createElement('div', {
        style: { display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }
      },
        React.createElement('select', {
          value: noteType, onChange: e => setNoteType(e.target.value), style: typeSelectStyle
        },
          NOTE_TYPES.map(t => React.createElement('option', { key: t.value, value: t.value }, t.label))
        ),
        React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textSec, cursor: 'pointer' } },
          React.createElement('input', { type: 'checkbox', checked: isPinned, onChange: e => setIsPinned(e.target.checked) }),
          'Pin to top'
        ),
        React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textSec, cursor: 'pointer' } },
          React.createElement('input', { type: 'checkbox', checked: isPrivate, onChange: e => setIsPrivate(e.target.checked) }),
          'Private'
        )
      ),

      // Textarea
      React.createElement('textarea', {
        value: body,
        onChange: e => { setBody(e.target.value); if (error) setError(''); },
        placeholder: 'Write a note about this animal — behavior, medical update, foster check-in, intake observations…',
        style: textareaStyle(isMobile ? 100 : 120),
        autoFocus: true,
      }),

      // Char count + error
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 4, marginBottom: 10 } },
        error
          ? React.createElement('span', { style: { fontSize: 12, color: C.red } }, error)
          : React.createElement('span', null),
        React.createElement('span', { style: { fontSize: 11, color: body.length > 1800 ? C.red : C.textMut } },
          `${body.length} / 2000`
        )
      ),

      // Actions
      React.createElement('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
        React.createElement(Btn, { variant: 'secondary', size: 'sm', onClick: () => { setShowCompose(false); setBody(''); setError(''); } }, 'Cancel'),
        React.createElement(Btn, { size: 'sm', onClick: submitNote, disabled: submitting || !body.trim() },
          submitting ? 'Saving…' : 'Save Note'
        )
      )
    ),

    // ── Pinned notes section ──────────────────────────────────────────────
    pinnedNotes.length > 0 && React.createElement('div', { style: { marginBottom: 8 } },
      React.createElement('div', { style: { ...labelStyle, marginBottom: 8 } }, 'Pinned'),
      pinnedNotes.map(renderNote)
    ),

    // ── Regular notes ─────────────────────────────────────────────────────
    regularNotes.length > 0 && React.createElement('div', null,
      pinnedNotes.length > 0 && React.createElement('div', { style: { ...labelStyle, marginBottom: 8, marginTop: 4 } }, 'All Notes'),
      regularNotes.map(renderNote)
    ),

    // ── Empty state ────────────────────────────────────────────────────────
    notes.length === 0 && !showCompose && React.createElement('div', {
      style: { textAlign: 'center', padding: '40px 20px', color: C.textMut }
    },
      React.createElement('div', { style: { fontSize: 32, marginBottom: 12 } }, '📋'),
      React.createElement('div', { style: { fontSize: 14, fontWeight: 600, color: C.textSec, marginBottom: 6 } },
        'No notes yet'
      ),
      React.createElement('div', { style: { fontSize: 12, marginBottom: 20, maxWidth: 280, margin: '0 auto 20px' } },
        'Track behavior observations, medical updates, foster check-ins, and intake notes here.'
      ),
      React.createElement(Btn, { onClick: () => setShowCompose(true), icon: 'plus' }, 'Add First Note')
    )
  );
}

// Export for use in AnimalProfileView
// Usage inside the notes tab:
//   tab === "notes" && React.createElement(AnimalNotesTab, { animalId, isMobile })
// Tab count from initial load: data.note_count (returned by GET /api/dashboard/animals/:id)
