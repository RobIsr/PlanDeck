'use strict';

const React = require('react');
const { render, Box, Text, useInput, useApp, useFocus, useFocusManager, useStdin } = require('ink');
const TextInput = require('ink-text-input').default;

const h = React.createElement;
const { useState } = React;

const STATUS_CYCLE = ['pending', 'in_progress', 'done', 'blocked'];
const STATUS_COLORS = { pending: 'yellow', in_progress: 'cyan', done: 'green', blocked: 'red' };
const STATUS_LABELS = { pending: 'pending', in_progress: 'in progress', done: 'done', blocked: 'blocked' };

// ── Utilities ──────────────────────────────────────────────────────────────

function clonePlan(plan) {
  return {
    title: plan.title || '',
    description: plan.description || '',
    steps: (plan.steps || []).map(s => ({
      ...s,
      what: [...(s.what || [])],
      dependencies: [...(s.dependencies || [])],
    })),
  };
}

function trunc(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ── Shared components ──────────────────────────────────────────────────────

function StatusBadge({ status }) {
  return h(Text, { color: STATUS_COLORS[status] || 'white' },
    `[${STATUS_LABELS[status] || status}]`,
  );
}

function Header({ title, description }) {
  return h(Box, { flexDirection: 'column', marginBottom: 1 },
    h(Text, { bold: true, color: 'blue' }, '⬡  PlanDeck'),
    h(Text, { bold: true }, title || 'Untitled Plan'),
    description ? h(Box, null, h(Text, { dimColor: true }, description)) : null,
  );
}

function HelpBar({ items }) {
  return h(Box, { marginTop: 1, flexWrap: 'wrap' },
    ...items.map(([key, desc], i) =>
      h(Box, { key: i, marginRight: 3 },
        h(Text, { color: 'cyan' }, key),
        h(Text, { dimColor: true }, ` ${desc}`),
      ),
    ),
  );
}

// ── List view ──────────────────────────────────────────────────────────────

function ListView({ plan, selectedIndex, onNavigate, onEdit, onCycleStatus, onApprove, onFeedback, onQuit }) {
  const termHeight = process.stdout.rows || 24;
  const termWidth = process.stdout.columns || 80;
  const visibleRows = Math.max(4, termHeight - 9);

  const start = plan.steps.length === 0
    ? 0
    : Math.max(0, Math.min(selectedIndex - Math.floor(visibleRows / 2), plan.steps.length - visibleRows));

  const visible = plan.steps.slice(start, start + visibleRows);
  const maxTitle = Math.max(10, termWidth - 26);

  useInput((input, key) => {
    if (key.upArrow) onNavigate(-1);
    else if (key.downArrow) onNavigate(1);
    else if (key.return && plan.steps.length > 0) onEdit();
    else if (input === 's' && plan.steps.length > 0) onCycleStatus();
    else if (input === 'a') onApprove();
    else if (input === 'r') onFeedback();
    else if (input === 'q' || (key.ctrl && input === 'c')) onQuit();
  });

  return h(Box, { flexDirection: 'column' },
    h(Header, { title: plan.title, description: plan.description }),
    plan.steps.length === 0
      ? h(Box, { paddingLeft: 2 }, h(Text, { dimColor: true }, '(no steps)'))
      : h(Box, { flexDirection: 'column' },
          ...visible.map((step, i) => {
            const idx = start + i;
            const isSel = idx === selectedIndex;
            return h(Box, { key: step.id, paddingLeft: 1 },
              h(Text, { color: isSel ? 'blue' : undefined, bold: isSel }, isSel ? '❯ ' : '  '),
              h(Text, { dimColor: !isSel }, `${String(idx + 1).padStart(2)}. `),
              h(StatusBadge, { status: step.status }),
              h(Text, null, ' '),
              h(Text, { bold: isSel, wrap: 'truncate' }, trunc(step.title, maxTitle)),
            );
          }),
        ),
    plan.steps.length > visibleRows
      ? h(Box, null, h(Text, { dimColor: true }, `  ${start + 1}–${Math.min(start + visibleRows, plan.steps.length)} of ${plan.steps.length}`))
      : null,
    h(HelpBar, {
      items: [['↑↓', 'navigate'], ['Enter', 'edit'], ['s', 'status'], ['a', 'approve'], ['r', 'changes'], ['q', 'quit']],
    }),
  );
}

// ── Edit view ──────────────────────────────────────────────────────────────

function LabeledInput({ focusId, label, value, onChange, autoFocus }) {
  const { isFocused } = useFocus({ id: focusId, autoFocus: !!autoFocus });
  return h(Box, { flexDirection: 'column', marginBottom: 1 },
    h(Text, { bold: true, color: isFocused ? 'cyan' : undefined }, `${label}:`),
    h(Box, { paddingLeft: 2 },
      isFocused
        ? h(TextInput, { value, onChange, focus: true })
        : h(Text, { dimColor: !value }, value || '(empty)'),
    ),
  );
}

function WhatItem({ focusId, value, onChange, onRemove }) {
  const { isFocused } = useFocus({ id: focusId });
  useInput((_input, key) => {
    if (value === '' && (key.backspace || key.delete)) onRemove();
  }, { isActive: isFocused });
  return h(Box, { paddingLeft: 2 },
    h(Text, { color: isFocused ? 'cyan' : undefined }, '• '),
    isFocused
      ? h(TextInput, { value, onChange, focus: true })
      : h(Text, { dimColor: !value }, value || '(empty)'),
  );
}

function AddItemButton({ focusId, onAdd }) {
  const { isFocused } = useFocus({ id: focusId });
  useInput((_input, key) => {
    if (key.return) onAdd();
  }, { isActive: isFocused });
  return h(Box, { paddingLeft: 4 },
    h(Text, { color: isFocused ? 'green' : undefined },
      isFocused ? '❯ + Add item (Enter)' : '  + Add item',
    ),
  );
}

function SaveButton({ focusId, onSave }) {
  const { isFocused } = useFocus({ id: focusId });
  useInput((_input, key) => {
    if (key.return) onSave();
  }, { isActive: isFocused });
  return h(Box, { marginTop: 1 },
    h(Text, { color: isFocused ? 'green' : undefined, bold: isFocused },
      isFocused ? '❯ Save & Return (Enter)' : '  Save & Return',
    ),
  );
}

function EditView({ step, onSave, onCancel }) {
  const [title, setTitle] = useState(step.title);
  const [why, setWhy] = useState(step.why);
  const [what, setWhat] = useState(step.what.length > 0 ? [...step.what] : ['']);
  const [risks, setRisks] = useState(step.risks);
  const { focus } = useFocusManager();

  useInput((_input, key) => {
    if (key.escape) onCancel();
  });

  function handleAddItem() {
    const newWhat = [...what, ''];
    setWhat(newWhat);
    setTimeout(() => focus(`what-${newWhat.length - 1}`), 10);
  }

  function handleRemoveItem(index) {
    if (what.length <= 1) {
      setWhat(['']);
      setTimeout(() => focus('what-0'), 10);
      return;
    }
    const newWhat = what.filter((_, i) => i !== index);
    setWhat(newWhat);
    setTimeout(() => focus(`what-${Math.max(0, index - 1)}`), 10);
  }

  function handleSave() {
    onSave({
      ...step,
      title: title.trim() || step.title,
      why: why.trim(),
      what: what.map(w => w.trim()).filter(Boolean),
      risks: risks.trim(),
    });
  }

  return h(Box, { flexDirection: 'column' },
    h(Box, { marginBottom: 1 },
      h(Text, { bold: true, color: 'blue' }, `Editing: ${trunc(step.title, 50)}`),
    ),
    h(LabeledInput, { focusId: 'title', label: 'Title', value: title, onChange: setTitle, autoFocus: true }),
    h(LabeledInput, { focusId: 'why', label: 'Why', value: why, onChange: setWhy }),
    h(Box, { flexDirection: 'column', marginBottom: 1 },
      h(Text, { bold: true }, 'What:'),
      ...what.map((item, i) =>
        h(WhatItem, {
          key: `what-${i}`,
          focusId: `what-${i}`,
          value: item,
          onChange: val => setWhat(prev => prev.map((w, j) => j === i ? val : w)),
          onRemove: () => handleRemoveItem(i),
        }),
      ),
      h(AddItemButton, { focusId: 'what-add', onAdd: handleAddItem }),
    ),
    h(LabeledInput, { focusId: 'risks', label: 'Risks', value: risks, onChange: setRisks }),
    h(SaveButton, { focusId: 'save', onSave: handleSave }),
    h(HelpBar, { items: [['Tab', 'next field'], ['Shift+Tab', 'prev'], ['Esc', 'cancel']] }),
  );
}

// ── Feedback view ──────────────────────────────────────────────────────────

function FeedbackView({ onSubmit, onCancel }) {
  const [text, setText] = useState('');

  useInput((_input, key) => {
    if (key.escape) onCancel();
    else if (key.return && text.trim()) onSubmit(text.trim());
  });

  return h(Box, { flexDirection: 'column' },
    h(Box, { marginBottom: 1 }, h(Text, { bold: true, color: 'blue' }, 'Request Changes')),
    h(Box, { marginBottom: 1 }, h(Text, null, 'Describe the changes you want:')),
    h(TextInput, { value: text, onChange: setText, focus: true }),
    h(HelpBar, { items: [['Enter', 'submit'], ['Esc', 'cancel']] }),
  );
}

// ── App root ───────────────────────────────────────────────────────────────

function App({ initialPlan, resultRef }) {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();
  const [view, setView] = useState('list');
  const [plan, setPlan] = useState(() => clonePlan(initialPlan));
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!isRawModeSupported) {
    return h(Box, null,
      h(Text, { color: 'red' }, 'Error: PlanDeck requires an interactive terminal (TTY).'),
    );
  }

  function navigate(delta) {
    setSelectedIndex(i => Math.max(0, Math.min(plan.steps.length - 1, i + delta)));
  }

  function cycleStatus() {
    setPlan(p => ({
      ...p,
      steps: p.steps.map((s, i) => {
        if (i !== selectedIndex) return s;
        const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(s.status) + 1) % STATUS_CYCLE.length];
        return { ...s, status: next };
      }),
    }));
  }

  function saveStep(updated) {
    setPlan(p => ({
      ...p,
      steps: p.steps.map((s, i) => i === selectedIndex ? updated : s),
    }));
    setView('list');
  }

  function approve() {
    resultRef.current = { approved: true, plan };
    exit();
  }

  function requestChanges(feedback) {
    resultRef.current = { approved: false, feedback };
    exit();
  }

  if (view === 'edit' && plan.steps[selectedIndex]) {
    return h(EditView, {
      step: plan.steps[selectedIndex],
      onSave: saveStep,
      onCancel: () => setView('list'),
    });
  }

  if (view === 'feedback') {
    return h(FeedbackView, {
      onSubmit: requestChanges,
      onCancel: () => setView('list'),
    });
  }

  return h(ListView, {
    plan,
    selectedIndex,
    onNavigate: navigate,
    onEdit: () => setView('edit'),
    onCycleStatus: cycleStatus,
    onApprove: approve,
    onFeedback: () => setView('feedback'),
    onQuit: () => exit(),  // resultRef already holds dismissed default
  });
}

// ── Public API ─────────────────────────────────────────────────────────────

function runTui(plan) {
  if (!process.stdin.isTTY) {
    process.stderr.write('Error: PlanDeck requires an interactive terminal (TTY).\n');
    return Promise.resolve({ approved: false, dismissed: true });
  }

  return new Promise(resolve => {
    const resultRef = { current: { approved: false, dismissed: true } };
    const { waitUntilExit } = render(
      h(App, { initialPlan: plan, resultRef }),
      { exitOnCtrlC: false },
    );
    waitUntilExit().then(() => resolve(resultRef.current));
  });
}

module.exports = { runTui };
