const yaml = require('js-yaml');
const fs = require('fs');

/**
 * Parse plan content from YAML or Markdown format.
 * @param {string} content
 * @returns {{ title: string, description: string, steps: Step[] }}
 */
function parsePlan(content) {
  const trimmed = content.trim();

  // Try YAML first (starts with 'title:' or 'steps:')
  if (/^(title|steps|description)\s*:/m.test(trimmed)) {
    try {
      const parsed = yaml.load(trimmed);
      if (parsed && Array.isArray(parsed.steps)) {
        return normalizePlan(parsed);
      }
    } catch (_) {}
  }

  return parseMarkdownPlan(trimmed);
}

function normalizePlan(plan) {
  return {
    title: plan.title || 'Untitled Plan',
    description: plan.description || '',
    steps: (plan.steps || []).map((s, i) => ({
      id: s.id || `step-${i + 1}`,
      title: s.title || '',
      why: s.why || '',
      what: Array.isArray(s.what) ? s.what : (s.what ? [s.what] : []),
      risks: s.risks || '',
      status: s.status || 'pending',
      dependencies: s.dependencies || [],
    })),
  };
}

function parseMarkdownPlan(markdown) {
  const lines = markdown.split('\n');
  const plan = { title: 'Untitled Plan', description: '', steps: [] };
  let stepCounter = 0;
  let currentStep = null;
  let currentSection = 'what'; // tracks which field to accumulate into within a step
  let inDescription = false;

  // Append content to a step field, joining multiple lines with newline.
  function appendToField(step, field, content) {
    if (!content) return;
    if (field === 'why') {
      step.why = step.why ? step.why + '\n' + content : content;
    } else if (field === 'risks') {
      step.risks = step.risks ? step.risks + '\n' + content : content;
    } else {
      step.what.push(content);
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('# ')) {
      plan.title = line.slice(2).replace(/^Plan:\s*/i, '').trim();
      inDescription = true;
      continue;
    }

    if (line.startsWith('## ')) {
      const heading = line.slice(3).trim().toLowerCase();
      inDescription = false;
      if (['approach', 'problem', 'overview', 'summary'].includes(heading)) {
        inDescription = true;
      }
      currentStep = null;
      continue;
    }

    if (line.startsWith('### ')) {
      if (currentStep) plan.steps.push(currentStep);
      currentStep = {
        id: `step-${++stepCounter}`,
        title: line.slice(4).trim(),
        why: '',
        what: [],
        risks: '',
        status: 'pending',
        dependencies: [],
      };
      currentSection = 'what';
      inDescription = false;
      continue;
    }

    // Checkbox todo items → each becomes a step
    const todoMatch = line.match(/^[-*]\s+\[[ xX]\]\s+(.+)/);
    if (todoMatch) {
      if (currentStep) plan.steps.push(currentStep);
      currentStep = {
        id: `step-${++stepCounter}`,
        title: todoMatch[1].trim(),
        why: '',
        what: [],
        risks: '',
        status: line.includes('[x]') || line.includes('[X]') ? 'done' : 'pending',
        dependencies: [],
      };
      currentSection = 'what';
      inDescription = false;
      continue;
    }

    // Numbered list items with bold title
    const numberedMatch = line.match(/^\d+\.\s+\*\*(.+?)\*\*/);
    if (numberedMatch) {
      if (currentStep) plan.steps.push(currentStep);
      currentStep = {
        id: `step-${++stepCounter}`,
        title: numberedMatch[1].trim(),
        why: '',
        what: [],
        risks: '',
        status: 'pending',
        dependencies: [],
      };
      currentSection = 'what';
      const rest = line.replace(/^\d+\.\s+\*\*.+?\*\*\s*—?\s*/, '').trim();
      if (rest) currentStep.what.push(rest);
      inDescription = false;
      continue;
    }

    // Accumulate content into the current step
    if (currentStep && line.trim()) {
      // Bold section headers: **Why:**, **What:**, **Risks:** — switch active section
      const sectionMatch = line.match(/^\*\*(why|what|risks?):\*\*\s*(.*)/i);
      if (sectionMatch) {
        const label = sectionMatch[1].toLowerCase();
        currentSection = label === 'risk' ? 'risks' : label;
        const inline = sectionMatch[2].trim();
        if (inline) appendToField(currentStep, currentSection, inline);
        continue;
      }

      const bulletMatch = line.match(/^[-*]\s+(.+)/);
      if (bulletMatch) {
        const content = bulletMatch[1].trim();
        // Labeled bullets: "- Why: ..." or "- Risks: ..." — route to the named field
        const labeledMatch = content.match(/^(why|risks?):\s*(.*)/i);
        if (labeledMatch) {
          const label = labeledMatch[1].toLowerCase();
          const field = label === 'risk' ? 'risks' : label;
          appendToField(currentStep, field, labeledMatch[2].trim());
        } else {
          appendToField(currentStep, currentSection, content);
        }
      } else {
        // Non-bullet line under a step — route to current section (except 'what', which ignores prose)
        if (currentSection !== 'what') {
          appendToField(currentStep, currentSection, line.trim());
        }
      }
      continue;
    }

    if (inDescription && line.trim() && !plan.description) {
      plan.description = line.trim();
    }
  }

  if (currentStep) plan.steps.push(currentStep);

  return plan;
}

function serializePlan(plan) {
  return yaml.dump(plan, { lineWidth: 120, quotingType: '"' });
}

function loadPlanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parsePlan(content);
}

function savePlanFile(plan, filePath) {
  const content = serializePlan(plan);
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Create an empty plan skeleton.
 */
function emptyPlan(title = 'New Plan') {
  return {
    title,
    description: '',
    steps: [
      {
        id: 'step-1',
        title: 'First step',
        why: 'Explain why this step is needed',
        what: ['Describe the actions to take'],
        risks: '',
        status: 'pending',
        dependencies: [],
      },
    ],
  };
}

module.exports = { parsePlan, serializePlan, loadPlanFile, savePlanFile, emptyPlan };
