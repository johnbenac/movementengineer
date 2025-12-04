/*
 * Movement Engineer v2
 *
 * This script powers a client‑side web application that allows users to
 * design, save, load, fork and compare movements. Movements are stored
 * in localStorage to persist across sessions and can be exported/imported
 * as JSON. Preloaded movements provide examples from major world
 * traditions with brief hints and citations.  The UI uses tabs to
 * organise information into sections. Dropdowns and checkboxes
 * encourage structured input while leaving room for custom entries via
 * "Other" fields. A comparison modal presents selected movements side
 * by side for easy contrast.
 */

// ==== Data Structures ====

// Preloaded movements with minimal canonical details. Each entry
// includes hints referencing sources (citations) where applicable.
const preloadedMovements = [
  {
    name: 'Buddhism',
    description:
      'Buddhism teaches the Four Noble Truths: existence is characterized by suffering (dukkha); suffering arises from craving; it ceases when craving ends; and the path to cessation is the Noble Eightfold Path【287488329952608†L737-L747】. It also emphasises the Three Marks of Existence – impermanence, suffering and non‑self【287488329952608†L755-L766】 – and the cycle of rebirth (samsara), from which nirvana offers liberation【287488329952608†L780-L789】.',
    world: {
      creation: 'No specific creation',
      purpose: 'End suffering and attain enlightenment',
      afterlife: 'Rebirth / reincarnation'
    },
    path: {
      beliefs: [
        'Impermanence and suffering',
        'Karma and rebirth'
      ],
      practices: [
        'Meditation',
        'Ethical living',
        'Festivals'
      ],
      ethics: 'Virtue ethics / Noble path'
    },
    people: {
      leadership: 'Monastic community / Sangha',
      community: 'Monastic orders'
    },
    symbol: {
      texts: ['Written scriptures', 'Philosophical treatises', 'Ritual manuals'],
      symbols: ['Dharma Wheel'],
      arts: ['Art & Iconography', 'Music & Chanting', 'Dance & Performance', 'Myth and Storytelling']
    },
    meta: {
      truth: 'Personal experience & intuition',
      change: 'Interpreted through commentary',
      techStance: 'Balanced (useful but cautious)'
    }
  },
  {
    name: 'Catholicism',
    description:
      'Catholicism teaches belief in one God who exists eternally in three persons – the Father, Son and Holy Spirit – and that faith is required for salvation【174035901826850†L139-L153】. Church teaching derives from both Scripture and Sacred Tradition, and sacraments play a central role.',
    world: {
      creation: 'Created by one god',
      purpose: 'Salvation through faith',
      afterlife: 'Heaven and/or hell'
    },
    path: {
      beliefs: ['Monotheism', 'Trinity', 'Salvation through faith'],
      practices: ['Prayer', 'Sacraments / Rituals', 'Charity / Almsgiving', 'Festivals'],
      ethics: 'Divine law / Commandments'
    },
    people: {
      leadership: 'Hierarchical (pope, priests, bishops etc.)',
      community: 'Global church / ummah'
    },
    symbol: {
      texts: ['Written scriptures', 'Philosophical treatises', 'Ritual manuals'],
      symbols: ['Cross'],
      arts: ['Art & Iconography', 'Music & Chanting', 'Architecture & Sacred spaces', 'Myth and Storytelling']
    },
    meta: {
      truth: 'Revelation / divine inspiration',
      change: 'Fixed canon',
      techStance: 'Balanced (useful but cautious)'
    }
  },
  {
    name: 'Islam',
    description:
      'Islam is an Abrahamic monotheistic faith centred on the oneness of God (Allah) and reveres Muhammad as the final messenger【864414981951568†L6-L9】. Its core practices are the Five Pillars: the declaration of faith (shahada), daily prayer (salah), almsgiving (zakat), fasting during Ramadan (sawm) and pilgrimage to Mecca (hajj)【864414981951568†L16-L17】.',
    world: {
      creation: 'Created by one god',
      purpose: 'Submission to divine will',
      afterlife: 'Heaven and/or hell'
    },
    path: {
      beliefs: ['Monotheism', 'Five Pillars'],
      practices: ['Prayer', 'Charity / Almsgiving', 'Fasting', 'Pilgrimage', 'Ethical living'],
      ethics: 'Sharia / Religious law'
    },
    people: {
      leadership: 'Council of elders / scholars',
      community: 'Global church / ummah'
    },
    symbol: {
      texts: ['Written scriptures', 'Oral tradition', 'Ritual manuals'],
      symbols: ['Crescent Moon'],
      arts: ['Music & Chanting', 'Architecture & Sacred spaces', 'Myth and Storytelling']
    },
    meta: {
      truth: 'Revelation / divine inspiration',
      change: 'Fixed canon',
      techStance: 'Balanced (useful but cautious)'
    }
  },
  {
    name: 'Shinto',
    description:
      'Shinto is the indigenous faith of Japan. It centres around reverence for kami (spirits) and emphasises purity and ritual cleanliness【116740399863132†L6-L8】【116740399863132†L19-L20】. Harmony with nature and ancestors is paramount, with practices focused on purification and shrine worship.',
    world: {
      creation: 'Created by multiple gods',
      purpose: 'Harmony with nature/spirits',
      afterlife: 'Unknown / mystical union'
    },
    path: {
      beliefs: ['Polytheism', 'Spirit world', 'Ancestor veneration'],
      practices: ['Prayer', 'Purification rituals', 'Festivals', 'Ethical living'],
      ethics: 'Ethics of harmony with nature'
    },
    people: {
      leadership: 'Local shrine priests',
      community: 'Clan / family shrine'
    },
    symbol: {
      texts: ['Oral tradition', 'Mythic epics', 'Ritual manuals'],
      symbols: ['Torii gate'],
      arts: ['Architecture & Sacred spaces', 'Myth and Storytelling']
    },
    meta: {
      truth: 'Tradition & lineage',
      change: 'Interpreted through commentary',
      techStance: 'Balanced (useful but cautious)'
    }
  }
];

// Storage key for custom movements
const STORAGE_KEY = 'customMovementsV2';

// Current movement in the editor (object) and the associated key (for updating)
let currentMovement = null;
let currentKey = null;

// ==== Helper Functions ====

// Load custom movements from localStorage
function loadCustomMovements() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    return obj;
  } catch (e) {
    console.warn('Failed to parse stored movements:', e);
    return {};
  }
}

// Save custom movements to localStorage
function saveCustomMovements(regions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(regions));
}

// Generate a random ID for saved movements
function generateId() {
  return 'movement_' + Math.random().toString(36).substr(2, 9);
}

// Render the list of saved movements in the sidebar
function renderSavedList() {
  const savedList = document.getElementById('savedList');
  savedList.innerHTML = '';
  const movements = loadCustomMovements();
  Object.keys(movements).forEach(key => {
    const li = document.createElement('li');
    li.textContent = movements[key].name;
    li.dataset.key = key;
    li.title = 'Click to load';
    li.addEventListener('click', () => {
      currentMovement = movements[key];
      currentKey = key;
      fillForm(currentMovement);
    });
    savedList.appendChild(li);
  });
}

// Render the preloaded movements list
function renderPreloadedList() {
  const preList = document.getElementById('preloadedList');
  preList.innerHTML = '';
  preloadedMovements.forEach((rel, idx) => {
    const li = document.createElement('li');
    li.textContent = rel.name;
    li.dataset.index = idx;
    li.title = 'Click to load';
    li.addEventListener('click', () => {
      // assign new current movement as a copy (to avoid editing preloaded directly)
      currentMovement = JSON.parse(JSON.stringify(rel));
      currentKey = null; // new unsaved instance
      fillForm(currentMovement);
    });
    preList.appendChild(li);
  });
}

// Fill the form fields with a movement object
function fillForm(rel) {
  const form = document.getElementById('movementForm');
  // Basic fields
  form.name.value = rel.name || '';
  form.description.value = rel.description || '';
  // World
  form.creation.value = rel.world?.creation || '';
  form.creationOther.value = rel.world?.creationOther || '';
  form.purpose.value = rel.world?.purpose || '';
  form.purposeOther.value = rel.world?.purposeOther || '';
  form.afterlife.value = rel.world?.afterlife || '';
  form.afterlifeOther.value = rel.world?.afterlifeOther || '';
  // Path - beliefs and practices (checkbox lists)
  syncCheckboxes('beliefs', rel.path?.beliefs || []);
  form.beliefsOther.value = rel.path?.beliefsOther || '';
  syncCheckboxes('practices', rel.path?.practices || []);
  form.practicesOther.value = rel.path?.practicesOther || '';
  form.ethics.value = rel.path?.ethics || '';
  form.ethicsOther.value = rel.path?.ethicsOther || '';
  // People
  form.leadership.value = rel.people?.leadership || '';
  form.leadershipOther.value = rel.people?.leadershipOther || '';
  form.community.value = rel.people?.community || '';
  form.communityOther.value = rel.people?.communityOther || '';
  // Symbols
  // Multi-select for texts
  Array.from(form.texts.options).forEach(opt => {
    opt.selected = (rel.symbol?.texts || []).includes(opt.value);
  });
  form.textsOther.value = rel.symbol?.textsOther || '';
  form.symbols.value = (rel.symbol?.symbols || []).join(', ');
  syncCheckboxes('arts', rel.symbol?.arts || []);
  form.artsOther.value = rel.symbol?.artsOther || '';
  // Meta
  form.truth.value = rel.meta?.truth || '';
  form.truthOther.value = rel.meta?.truthOther || '';
  form.change.value = rel.meta?.change || '';
  form.changeOther.value = rel.meta?.changeOther || '';
  form.techStance.value = rel.meta?.techStance || '';
  form.techOther.value = rel.meta?.techOther || '';
  updateOtherInputsVisibility();
}

// Synchronise checkboxes for a given group with an array of values
function syncCheckboxes(groupId, values) {
  const container = document.getElementById(groupId);
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.checked = values.includes(cb.value);
  });
}

// Extract form values into a movement object
function extractForm() {
  const form = document.getElementById('movementForm');
  const obj = {
    name: form.name.value.trim(),
    description: form.description.value.trim(),
    world: {
      creation: form.creation.value,
      creationOther: form.creationOther.value.trim(),
      purpose: form.purpose.value,
      purposeOther: form.purposeOther.value.trim(),
      afterlife: form.afterlife.value,
      afterlifeOther: form.afterlifeOther.value.trim()
    },
    path: {
      beliefs: getCheckedValues('beliefs'),
      beliefsOther: form.beliefsOther.value.trim(),
      practices: getCheckedValues('practices'),
      practicesOther: form.practicesOther.value.trim(),
      ethics: form.ethics.value,
      ethicsOther: form.ethicsOther.value.trim()
    },
    people: {
      leadership: form.leadership.value,
      leadershipOther: form.leadershipOther.value.trim(),
      community: form.community.value,
      communityOther: form.communityOther.value.trim()
    },
    symbol: {
      texts: Array.from(form.texts.selectedOptions).map(o => o.value),
      textsOther: form.textsOther.value.trim(),
      symbols: form.symbols.value
        .split(',')
        .map(s => s.trim())
        .filter(s => s),
      arts: getCheckedValues('arts'),
      artsOther: form.artsOther.value.trim()
    },
    meta: {
      truth: form.truth.value,
      truthOther: form.truthOther.value.trim(),
      change: form.change.value,
      changeOther: form.changeOther.value.trim(),
      techStance: form.techStance.value,
      techOther: form.techOther.value.trim()
    }
  };
  return obj;
}

function getCheckedValues(groupId) {
  const container = document.getElementById(groupId);
  return Array.from(
    container.querySelectorAll('input[type="checkbox"]:checked')
  ).map(cb => cb.value);
}

// Update visibility of "Other" input fields based on selections
function updateOtherInputsVisibility() {
  // For each select field with an adjacent other input, show/hide
  [
    { selectId: 'creation', otherId: 'creationOther', otherValue: 'Other' },
    { selectId: 'purpose', otherId: 'purposeOther', otherValue: 'Other' },
    { selectId: 'afterlife', otherId: 'afterlifeOther', otherValue: 'Other' },
    { selectId: 'ethics', otherId: 'ethicsOther', otherValue: 'Other' },
    { selectId: 'leadership', otherId: 'leadershipOther', otherValue: 'Other' },
    { selectId: 'community', otherId: 'communityOther', otherValue: 'Other' },
    { selectId: 'truth', otherId: 'truthOther', otherValue: 'Other' },
    { selectId: 'change', otherId: 'changeOther', otherValue: 'Other' },
    { selectId: 'techStance', otherId: 'techOther', otherValue: 'Other' }
  ].forEach(item => {
    const selectElem = document.getElementById(item.selectId);
    const otherInput = document.getElementById(item.otherId);
    if (selectElem.value === item.otherValue) {
      otherInput.style.display = 'block';
    } else {
      otherInput.style.display = 'none';
    }
  });
  // For multi‑select texts: show other input if "Other" is selected
  const texts = document.getElementById('texts');
  const textsOther = document.getElementById('textsOther');
  const selected = Array.from(texts.selectedOptions).map(o => o.value);
  if (selected.includes('Other')) {
    textsOther.style.display = 'block';
  } else {
    textsOther.style.display = 'none';
  }
  // Show/hide beliefsOther if Other checkbox checked
  const beliefsOtherInput = document.getElementById('beliefsOther');
  const beliefsOtherChecked = document
    .querySelector('#beliefs input[value="Other"]')
    .checked;
  beliefsOtherInput.style.display = beliefsOtherChecked ? 'block' : 'none';
  // Show/hide practicesOther
  const practicesOtherInput = document.getElementById('practicesOther');
  const practicesOtherChecked = document
    .querySelector('#practices input[value="Other"]')
    .checked;
  practicesOtherInput.style.display = practicesOtherChecked ? 'block' : 'none';
  // Arts other
  const artsOtherInput = document.getElementById('artsOther');
  const artsOtherChecked = document
    .querySelector('#arts input[value="Other"]')
    .checked;
  artsOtherInput.style.display = artsOtherChecked ? 'block' : 'none';
}

// Handle saving the current movement (overwrite or new)
function saveMovement(asNew = false) {
  const movements = loadCustomMovements();
  const newRel = extractForm();
  if (!newRel.name) {
    alert('Please provide a name for the movement before saving.');
    return;
  }
  // If this is Save As or no currentKey (unsaved), generate new key
  if (asNew || !currentKey) {
    currentKey = generateId();
  }
  movements[currentKey] = newRel;
  saveCustomMovements(movements);
  currentMovement = newRel;
  renderSavedList();
  alert('Movement saved successfully.');
}

// Handle forking: create new movement with a copy of the current one, new key
function forkMovement() {
  if (!currentMovement) {
    alert('No movement loaded to fork.');
    return;
  }
  const movements = loadCustomMovements();
  const newKey = generateId();
  const copy = JSON.parse(JSON.stringify(extractForm()));
  copy.name = copy.name + ' (Fork)';
  movements[newKey] = copy;
  saveCustomMovements(movements);
  currentKey = newKey;
  currentMovement = copy;
  renderSavedList();
  fillForm(copy);
  alert('Movement forked successfully.');
}

// Export current movement as JSON
function exportMovement() {
  if (!currentMovement) {
    alert('No movement loaded to export.');
    return;
  }
  const dataStr = JSON.stringify(extractForm(), null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = currentMovement.name
    ? currentMovement.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase()
    : 'movement';
  a.download = safeName + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import movement from JSON file
function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      // Basic validation: must have a name
      if (!data.name) {
        alert('Invalid movement file: missing name.');
        return;
      }
      const movements = loadCustomMovements();
      const newKey = generateId();
      movements[newKey] = data;
      saveCustomMovements(movements);
      renderSavedList();
      alert('Movement imported successfully.');
    } catch (e) {
      alert('Failed to import: ' + e.message);
    }
  };
  reader.readAsText(file);
  // reset input for next import
  event.target.value = '';
}

// Clear form to create a new movement
function newMovement() {
  currentMovement = null;
  currentKey = null;
  document.getElementById('movementForm').reset();
  // clear multi selects and checkboxes
  // Deselect multi select
  Array.from(document.getElementById('texts').options).forEach(opt => {
    opt.selected = false;
  });
  // Uncheck checkboxes
  ['beliefs', 'practices', 'arts'].forEach(groupId => {
    const container = document.getElementById(groupId);
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });
  });
  // Reset symbols field
  document.getElementById('symbols').value = '';
  updateOtherInputsVisibility();
}

// Tab switching handler
function activateTab(tabName) {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-content').forEach(div => {
    div.classList.toggle('active', div.id === 'tab-' + tabName);
  });
}

// Comparison modal: populate selection and generate table
function openComparisonModal() {
  const modal = document.getElementById('compareModal');
  const selectionDiv = document.getElementById('compareSelection');
  selectionDiv.innerHTML = '';
  // Create checkboxes for preloaded and saved
  const selections = [];
  // Preloaded
  preloadedMovements.forEach((rel, idx) => {
    const id = 'cmp_pre_' + idx;
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = 'pre:' + idx;
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + rel.name));
    selectionDiv.appendChild(label);
  });
  // Saved
  const saved = loadCustomMovements();
  Object.keys(saved).forEach(key => {
    const id = 'cmp_saved_' + key;
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = 'saved:' + key;
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + saved[key].name));
    selectionDiv.appendChild(label);
  });
  // Show modal
  modal.style.display = 'flex';
}

function closeComparisonModal() {
  document.getElementById('compareModal').style.display = 'none';
  document.getElementById('comparisonTableWrapper').innerHTML = '';
}

function generateComparison() {
  const selectedValues = Array.from(
    document.querySelectorAll('#compareSelection input[type="checkbox"]:checked')
  ).map(cb => cb.value);
  if (selectedValues.length === 0) {
    alert('Select at least one movement to compare.');
    return;
  }
  const comparison = [];
  selectedValues.forEach(val => {
    const [type, id] = val.split(':');
    if (type === 'pre') {
      comparison.push(preloadedMovements[parseInt(id)]);
    } else if (type === 'saved') {
      const saved = loadCustomMovements();
      comparison.push(saved[id]);
    }
  });
  // Always include current movement (if any and not already selected)
  const current = extractForm();
  if (current.name && !comparison.some(r => r.name === current.name)) {
    comparison.unshift(current);
  }
  // Build table
  const wrapper = document.getElementById('comparisonTableWrapper');
  wrapper.innerHTML = '';
  const table = document.createElement('table');
  const headerRow = document.createElement('tr');
  const firstHeader = document.createElement('th');
  firstHeader.textContent = 'Aspect';
  headerRow.appendChild(firstHeader);
  comparison.forEach(rel => {
    const th = document.createElement('th');
    th.textContent = rel.name;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);
  // Define aspects and extractor functions
  const aspects = [
    {
      title: 'Creation',
      get: r => r.world?.creation || ''
    },
    {
      title: 'Purpose',
      get: r => r.world?.purpose || ''
    },
    {
      title: 'Afterlife',
      get: r => r.world?.afterlife || ''
    },
    {
      title: 'Beliefs',
      get: r => (r.path?.beliefs || []).join(', ')
    },
    {
      title: 'Practices',
      get: r => (r.path?.practices || []).join(', ')
    },
    {
      title: 'Ethics',
      get: r => r.path?.ethics || ''
    },
    {
      title: 'Leadership',
      get: r => r.people?.leadership || ''
    },
    {
      title: 'Community',
      get: r => r.people?.community || ''
    },
    {
      title: 'Sacred texts',
      get: r => (r.symbol?.texts || []).join(', ')
    },
    {
      title: 'Symbols',
      get: r => (r.symbol?.symbols || []).join(', ')
    },
    {
      title: 'Art / expression',
      get: r => (r.symbol?.arts || []).join(', ')
    },
    {
      title: 'Epistemology',
      get: r => r.meta?.truth || ''
    },
    {
      title: 'Change',
      get: r => r.meta?.change || ''
    },
    {
      title: 'Tech stance',
      get: r => r.meta?.techStance || ''
    }
  ];
  aspects.forEach(aspect => {
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    tdName.textContent = aspect.title;
    tr.appendChild(tdName);
    comparison.forEach(rel => {
      const td = document.createElement('td');
      td.textContent = aspect.get(rel) || '-';
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
  wrapper.appendChild(table);
}

// ==== Event Listeners & Initialization ====

document.addEventListener('DOMContentLoaded', () => {
  // Render lists
  renderSavedList();
  renderPreloadedList();
  // Tab switching
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activateTab(btn.dataset.tab);
    });
  });
  // Listen for changes to show/hide other inputs
  document.querySelectorAll('select').forEach(sel => {
    sel.addEventListener('change', updateOtherInputsVisibility);
  });
  document
    .querySelectorAll('#beliefs input[type="checkbox"], #practices input[type="checkbox"], #arts input[type="checkbox"]')
    .forEach(cb => {
      cb.addEventListener('change', updateOtherInputsVisibility);
    });
  document.getElementById('texts').addEventListener('change', updateOtherInputsVisibility);
  // Top bar buttons
  document.getElementById('newBtn').addEventListener('click', newMovement);
  document.getElementById('saveBtn').addEventListener('click', () => saveMovement(false));
  document.getElementById('saveAsBtn').addEventListener('click', () => saveMovement(true));
  document.getElementById('forkBtn').addEventListener('click', forkMovement);
  document.getElementById('exportBtn').addEventListener('click', exportMovement);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', handleImport);
  document.getElementById('compareBtn').addEventListener('click', openComparisonModal);
  // Modal events
  document.querySelector('.modal .close').addEventListener('click', closeComparisonModal);
  document.getElementById('generateComparison').addEventListener('click', generateComparison);
  // Initialize other visibility
  updateOtherInputsVisibility();
});