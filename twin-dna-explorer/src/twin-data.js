// @ts-nocheck
/**
 * twin-data.js — Knowledge base, DNA presets, base info, and utility helpers for TWIN
 * ES module version for Vite.
 */

/* ── Knowledge base ──────────────────────────────────────────── */
export const KB = {
  twin: `**TWIN** is your personal DNA explorer, powered by Evo2 — an AI trained on **8.8 trillion DNA letters** from almost every living thing on Earth.\n\nThink of it like ChatGPT, but instead of learning language it learned DNA. So TWIN can tell you how "normal" or "healthy" any DNA code looks.\n\n**Get started:**\n- Spin the 3D spiral with your mouse\n- Load a **Famous DNA Snippet** on the left\n- Ask me anything below — plain English, no science needed!`,

  letters: `DNA is written with just **4 letters**: A, T, G, and C. That's it — every instruction your body needs is spelled out with those 4 letters.\n\n- **A** — always locks with T (they fit together like puzzle pieces)\n- **T** — always locks with A\n- **G** — always locks with C\n- **C** — always locks with G\n\nThe two sides of the DNA ladder zip together because of this pairing — A fits T, G fits C. That's what makes the twisted ladder shape you see in the 3D model!`,

  score: `The **DNA Health Score** is how "natural" your DNA code looks to TWIN.\n\nImagine reading a sentence: "The cat sat on the mat" sounds natural. "ZZZZ blorb flonk" sounds made up. TWIN reads DNA the same way:\n\n- **Excellent** — looks like real, healthy DNA\n- **Good** — normal and natural\n- **Average** — a bit unusual, but could be real\n- **Low** — might be synthetic or very rare\n\nHuman genes usually score in the Good–Excellent range.`,

  brca1: `The **Cancer Shield Gene** (scientists call it BRCA1) acts like a repair crew for your DNA.\n\nEvery day, small "typos" happen in your DNA. BRCA1's job is to find and fix those typos before they cause problems like cancer.\n\n- Working BRCA1 — finds and repairs damage\n- Broken BRCA1 — damage builds up, raising cancer risk\n\nThat's why some people get BRCA1 tested — knowing early helps doctors act fast. TWIN can score a BRCA1 snippet to show you what healthy DNA looks like!`,

  spiral: `DNA looks like a **twisted ladder** — scientists call it a double helix.\n\nHere's the simple version:\n- The **two side rails** of the ladder = the DNA spine\n- The **rungs** = pairs of letters (A–T or G–C)\n\nNow twist that ladder — that's DNA! The twist makes it incredibly compact. If you stretched out all the DNA in just ONE of your cells, it would be **2 metres long** — yet it fits inside something smaller than a grain of sand.\n\nIn the 3D model: **hover any rung** to see which letter pair is there!`,

  aging: `The **Cell Aging Clock** (scientists call it a telomere) is like a countdown timer at the tips of your chromosomes.\n\nEvery time a cell divides and copies itself, the tips get a tiny bit shorter. When they get too short, the cell can no longer divide — that's part of aging.\n\nThe pattern **TTAGGG** repeats over and over at the tips — like a protective cap. TWIN's Cell Aging Clock snippet shows you this repeating pattern!`,

  protein: `The **Protein Launch Pad** (scientists call it a Kozak sequence) is a short stretch of DNA that tells the cell: "Start building a protein HERE!"\n\nThink of it like the "Play" button for a specific instruction. Without the right launch pad signal, the cell might miss the instruction and never build that protein.\n\nIt's one of the most important tiny signals in all of biology!`,

  virus: `The **Tiny Virus DNA** snippet comes from PhiX174 — one of the simplest viruses ever found. Its entire genome is just ~5,400 letters long (compare that to your ~3 billion!).\n\nScientists love it because it was the **first DNA genome ever fully sequenced** (in 1977). TWIN can score it to show how "natural" even a tiny virus DNA looks.`,
};

/* ── Chat logic ──────────────────────────────────────────────── */
export function findKBAnswer(q) {
  const lq = q.toLowerCase();
  if (lq.includes('twin') || lq.includes('evo') || lq.includes('what is this') || lq.includes('what are you')) return KB.twin;
  if (lq.includes('letter') || lq.includes('4 ') || lq.includes('four') || lq.includes('mean') || lq.includes('atgc') || lq.includes('alphabet')) return KB.letters;
  if (lq.includes('score') || lq.includes('health') || lq.includes('likelihood') || lq.includes('natural')) return KB.score;
  if (lq.includes('brca') || lq.includes('cancer') || lq.includes('shield') || lq.includes('tumor')) return KB.brca1;
  if (lq.includes('spiral') || lq.includes('ladder') || lq.includes('helix') || lq.includes('shape') || lq.includes('twist') || lq.includes('look like')) return KB.spiral;
  if (lq.includes('aging') || lq.includes('clock') || lq.includes('telomere') || lq.includes('old')) return KB.aging;
  if (lq.includes('protein') || lq.includes('launch') || lq.includes('kozak')) return KB.protein;
  if (lq.includes('virus') || lq.includes('phix') || lq.includes('tiny')) return KB.virus;
  return null;
}

export function generateResponse(q) {
  const kb = findKBAnswer(q);
  if (kb) return kb;
  const lq = q.toLowerCase();
  if (lq.includes('hello') || lq.includes('hi') || lq.includes('hey'))
    return `Hello! I'm TWIN, your DNA guide. No science background needed — I explain everything in plain English. Try loading a **Famous DNA Snippet** on the left, or ask me anything!`;
  if (lq.includes('mutation') || lq.includes('mistake') || lq.includes('change'))
    return `A **DNA mutation** is basically a typo in the DNA code. Instead of the "right" letter at a spot, there's a different one.\n\nMost mutations are harmless — your body has repair crews (like the Cancer Shield Gene) that fix them. But some mutations can change how a gene works.\n\nTWIN can show how a single letter change affects the health score!`;
  if (lq.includes('color') || lq.includes('colour') || lq.includes('blue') || lq.includes('green') || lq.includes('red'))
    return `The 4 DNA letters each have a colour in TWIN:\n\n- **Blue = A** (pairs with T)\n- **Yellow = T** (pairs with A)\n- **Green = G** (pairs with C)\n- **Red-brown = C** (pairs with G)\n- **Purple** = the DNA spine (backbone)\n\nHover any coloured letter in the DNA Code panel to light up that rung in the 3D spiral!`;
  return `Here are some things I can explain right now:\n- What the 4 DNA letters mean\n- How the DNA health score works\n- What the Cancer Shield Gene does\n- Why DNA looks like a twisted ladder\n- How the cell aging clock works\n\nJust ask — no science words needed!`;
}

/* ── DNA presets ─────────────────────────────────────────────── */
export const PRESETS = {
  BRCA1: 'ATGGATTTATCTGCTCTTCGCGTTGAAGAAGTACAAAATGTCATTAATGCTATGCAGAAAATCTTAGAGTGTCCCATCTGTCTGGAGTTGATCAAGGAACCTGTCTCCACAAAGTGTGACCACATATTTTGCAAATTTTGCATGCTGAAACTTCTCAACCAGAAGAAAGGGCCTTCACAGTGTCCTTTATGTAAGAATGA',
  TELO:  'TTAGGGTTAGGGTTAGGGTTAGGGTTAGGGTTAGGGTTAGGGTTAGGGTTAGGGTTAGGGTTAGGGTTAGGG',
  KOZAK: 'GCCACCATGGCCAAAGCCATGGCCAAGCCCATGGCCAAAGCCATGGCCTAAGCCCATG',
  PHIX:  'GAGTTTTATCGCTTCCATGACGCAGAAGTTAACACTTTCGGATATTTCTGATGAGTCGAAAAATTATCTTGATAAAGCAGGAATTACTACTGCTTGTTTACGAATTAAATCGAAGTGGACTGCTGGCGGAAAATGAGAAAATTCGACCTATCCTTGCGCAGCTCGAGAAGCTCTTACTTTGCGACCTTTCGCCATCAACTAACGA',
};

export const PRESET_FRIENDLY = {
  BRCA1: 'Cancer Shield Gene',
  TELO:  'Cell Aging Clock',
  KOZAK: 'Protein Launch Pad',
  PHIX:  'Tiny Virus DNA',
};

export const PRESET_INFO = {
  BRCA1: { why: 'Acts like a repair crew — fixes DNA typos before they become cancer. Doctors test this gene to assess cancer risk.' },
  TELO:  { why: "Sits at the tip of every chromosome like a protective cap. Gets shorter each time your cells divide — a built-in aging counter." },
  KOZAK: { why: 'A tiny signal that tells your cell exactly where to start building a protein. Skip it and the whole instruction is ignored.' },
  PHIX:  { why: 'The complete DNA of one of the simplest viruses — only ~200 letters shown. It was the very first full genome ever decoded (1977).' },
};

/* ── Per-base info used by hover tooltips ────────────────────── */
export const BASE_INFO = {
  A: {
    full: 'Adenine',  color: 'var(--A)', pair: 'T', pairColor: 'var(--T)',
    why: "A and T are best friends — they always pair together and form 2 chemical bonds. This makes A–T sections more flexible, which helps your cell 'read' the DNA.",
  },
  T: {
    full: 'Thymine',  color: 'var(--T)', pair: 'A', pairColor: 'var(--A)',
    why: "T only appears in DNA (not in RNA). It pairs exclusively with A, forming 2 bonds. Regions with lots of T and A are easier for the cell to 'unzip' and read.",
  },
  G: {
    full: 'Guanine',  color: 'var(--G)', pair: 'C', pairColor: 'var(--C)',
    why: 'G pairs with C using 3 chemical bonds — the strongest pairing in DNA. More G+C means stronger, more stable DNA that is harder to break apart.',
  },
  C: {
    full: 'Cytosine', color: 'var(--C)', pair: 'G', pairColor: 'var(--G)',
    why: 'C always locks with G, also forming 3 strong bonds. DNA high in G+C (like the Cancer Shield Gene) is very stable and resistant to damage.',
  },
};

/* ── Pure utility functions ──────────────────────────────────── */

/** Returns the G+C percentage (0–100) of a DNA sequence string. */
export function gcContent(seq) {
  const s = seq.toUpperCase().replace(/[^ATGC]/g, '');
  if (!s.length) return 0;
  return Math.round(100 * s.split('').filter(c => c === 'G' || c === 'C').length / s.length);
}

/** Simulates an Evo2-like log-probability health score for the given sequence. */
export function simulateScore(seq) {
  const gc = gcContent(seq) / 100;
  const gcPenalty = Math.abs(gc - 0.5) * 1.8;
  let runPenalty = 0, run = 1;
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] === seq[i - 1]) run++;
    else { if (run > 4) runPenalty += (run - 4) * 0.05; run = 1; }
  }
  const base = -1.2 - gcPenalty - Math.min(runPenalty, 0.8);
  return parseFloat((base + Math.sin(seq.length * 0.7193) * 0.25).toFixed(4));
}

/** Returns a plain-English label for a given health score. */
export function scoreLabel(s) {
  if (s > -1.0) return 'Excellent — this looks like real, healthy DNA';
  if (s > -1.5) return 'Good — this DNA code looks natural';
  if (s > -2.0) return 'Average — a bit unusual but possible';
  return 'Unusual — might be synthetic or very rare';
}

/** Converts a subset of Markdown (bold, italic, inline code, fenced code, newlines) to HTML. */
export function renderMD(t) {
  return t
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`([^`]+)`/g,     '<code>$1</code>')
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre>$1</pre>')
    .replace(/\n/g, '<br>');
}

/* ── Default chat suggestions ────────────────────────────────── */
export const DEFAULT_SUGGESTIONS = [
  'What is TWIN?',
  'What do the 4 DNA letters mean?',
  'What is a DNA health score?',
  'Why does DNA look like a spiral?',
];

/* ── Real Evo2 API integration ───────────────────────────────── */
const EVO2_API = 'https://cpd9--variant-analysis-evo2-evo2model-analyze-single-variant.modal.run';

/**
 * Calls the real Evo2 Modal API to score a single-base variant.
 */
export async function callEvo2VariantAPI(sequence, position, ref, alt) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 180000);
  try {
    const resp = await fetch(EVO2_API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sequence, position, ref, alt }),
      signal:  ctrl.signal,
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return parseEvo2Response(data);
  } finally {
    clearTimeout(timer);
  }
}

function parseEvo2Response(data) {
  if (data && typeof data.delta_score === 'number')
    return { refScore: data.ref_score ?? null, altScore: data.alt_score ?? null, deltaScore: data.delta_score };
  if (data && typeof data.score === 'number')
    return { refScore: null, altScore: null, deltaScore: data.score };
  if (data && typeof data.log_likelihood_ratio === 'number')
    return { refScore: null, altScore: null, deltaScore: data.log_likelihood_ratio };
  if (typeof data === 'number')
    return { refScore: null, altScore: null, deltaScore: data };
  throw new Error('Unrecognised Evo2 response format');
}

/**
 * Returns a plain-English label + colour for a delta score.
 */
export function interpretDelta(delta) {
  if (delta >  0.1) return { label: 'Likely neutral',         color: 'var(--base-G)',  desc: 'Evo2 sees this change as natural or even beneficial.' };
  if (delta > -0.5) return { label: 'Possibly neutral',       color: 'var(--base-T)',  desc: 'Borderline — Evo2 sees a minor deviation from the reference.' };
  if (delta > -1.5) return { label: 'Potentially damaging',   color: 'var(--base-T)',  desc: 'Evo2 rates this variant as notably unusual — could affect gene function.' };
  return                    { label: 'Likely damaging',        color: 'var(--base-C)',  desc: 'Evo2 sees this change as highly unusual — consistent with a harmful mutation.' };
}
