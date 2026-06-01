"use client";
// @ts-nocheck
import './twin.css';

import { useState, useEffect, useRef, useCallback } from 'react';
import Spline from '@splinetool/react-spline';
import {
  Dna, Activity, UserRound, Moon, Zap, Apple, Cigarette, Wine,
  TrendingUp, MessageCircle, Brain, Heart, Wind, User, BarChart3,
  Sliders, ClipboardList, ArrowRight, Trash2, Send, Home, Code2,
} from 'lucide-react';

/* Icon helper — renders a Lucide component cleanly */
const Ico = ({ icon: Icon, size = 16, ...p }) =>
  Icon ? <Icon size={size} strokeWidth={1.75} {...p} /> : null;

/* Mobile detection hook */
function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth <= 768);
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}
import {
  generateResponse,
  PRESETS, PRESET_FRIENDLY, PRESET_INFO,
  BASE_INFO, gcContent, simulateScore, scoreLabel, renderMD,
  DEFAULT_SUGGESTIONS, callEvo2VariantAPI, interpretDelta,
} from './twin-data.js';
import { initThreeJS } from './twin-three.js';

/* SdgIcon removed — Lucide icons used throughout (see Ico helper above) */

/* ═══════════════════════════════════════════════════════════════ */
/*  SIMULATION ENGINE                                              */
/* ═══════════════════════════════════════════════════════════════ */

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function computeCurrentScore(a) {
  const sleep  = parseFloat(a.sleep)  || 7;
  const sleepS = sleep >= 7 && sleep <= 9 ? 1 : sleep >= 6 ? 0.72 : sleep >= 5 ? 0.42 : 0.2;
  const stressS = { low: 1, medium: 0.62, high: 0.22 }[a.stress]    ?? 0.5;
  const actS    = { sedentary: 0.18, light: 0.48, moderate: 0.73, active: 0.9, very_active: 1 }[a.activity] ?? 0.5;
  const nutS    = { poor: 0.18, fair: 0.48, good: 0.8, excellent: 1 }[a.nutrition] ?? 0.5;
  const smokeP  = { none: 0, occasional: 0.12, regular: 0.35 }[a.smoking]  ?? 0;
  const alcP    = { none: 0, light: 0.04, moderate: 0.18, heavy: 0.4 }[a.alcohol]  ?? 0;
  return clamp((sleepS * 0.22 + stressS * 0.22 + actS * 0.28 + nutS * 0.28) - smokeP - alcP, 0.05, 1) * 100;
}

function computeDecayRate(a) {
  const age    = parseInt(a.age) || 35;
  const base   = 0.004 + Math.max(0, age - 20) * 0.00025;
  const smokeB = { none: 0, occasional: 0.003, regular: 0.011 }[a.smoking] ?? 0;
  const stressB= { low: 0, medium: 0.002, high: 0.007 }[a.stress] ?? 0;
  return base + smokeB + stressB;
}

function projectTrajectory(answers, override) {
  const ans   = override ? { ...answers, [override.key]: override.value } : answers;
  const score = computeCurrentScore(ans);
  const decay = computeDecayRate(ans) * (override ? 0.88 : 1);
  return Array.from({ length: 6 }, (_, yr) => ({
    year: yr, score: Math.round(score * Math.pow(1 - decay, yr) * 10) / 10,
  }));
}

function getTopLevers(answers) {
  const levers = [
    { key: 'sleep',     label: 'Sleep',     icon: Moon, currentLabel: `${answers.sleep} hrs`,
      improve: { value: '8', label: '8 hrs/night' },
      impact: parseFloat(answers.sleep) < 7 ? 'high' : parseFloat(answers.sleep) < 8 ? 'medium' : 'low',
      desc: 'Optimal sleep is 7–9 hours. It boosts immune function, memory consolidation, and cellular repair.',
    },
    { key: 'stress',    label: 'Stress',    icon: Zap, currentLabel: answers.stress,
      improve: { value: 'low', label: 'Low stress' },
      impact: answers.stress === 'high' ? 'high' : answers.stress === 'medium' ? 'medium' : 'low',
      desc: 'Chronic stress elevates cortisol, accelerating telomere shortening and suppressing immune response.',
    },
    { key: 'activity',  label: 'Activity',  icon: Activity, currentLabel: answers.activity,
      improve: { value: 'active', label: 'Active lifestyle' },
      impact: answers.activity === 'sedentary' || answers.activity === 'light' ? 'high' : answers.activity === 'moderate' ? 'medium' : 'low',
      desc: '150 min/week of moderate activity reduces all-cause mortality risk by 30% and slows biological aging.',
    },
    { key: 'nutrition', label: 'Nutrition', icon: Apple, currentLabel: answers.nutrition,
      improve: { value: 'excellent', label: 'Excellent diet' },
      impact: answers.nutrition === 'poor' || answers.nutrition === 'fair' ? 'high' : answers.nutrition === 'good' ? 'medium' : 'low',
      desc: 'A diet rich in whole foods reduces oxidative stress and provides DNA repair substrates.',
    },
    { key: 'smoking',   label: 'Smoking',   icon: Cigarette, currentLabel: answers.smoking,
      improve: { value: 'none', label: 'Stop smoking' },
      impact: answers.smoking === 'regular' ? 'high' : answers.smoking === 'occasional' ? 'medium' : 'low',
      desc: 'Smoking is the single largest modifiable cause of DNA damage and accelerated aging.',
    },
    { key: 'alcohol',   label: 'Alcohol',   icon: Wine, currentLabel: answers.alcohol,
      improve: { value: 'light', label: 'Light/none' },
      impact: answers.alcohol === 'heavy' ? 'high' : answers.alcohol === 'moderate' ? 'medium' : 'low',
      desc: 'Heavy alcohol use increases DNA strand-break frequency and impairs cellular repair mechanisms.',
    },
  ];
  const order = { high: 0, medium: 1, low: 2 };
  return levers.filter(l => l.impact !== 'low').sort((a, b) => order[a.impact] - order[b.impact]).slice(0, 3);
}

const HEALTH_SUGGESTIONS = [
  "What's my biggest health risk?",
  "How can I improve my sleep?",
  "What does my 5-year projection mean?",
  "Which habit change will help most?",
];

/* ═══════════════════════════════════════════════════════════════ */
/*  GLOBAL HEADER                                                  */
/* ═══════════════════════════════════════════════════════════════ */

function GlobalHeader({ page, onNavigate, extras }) {
  return (
    <header className="global-header">
      <button className="logo-btn" onClick={() => onNavigate('landing')}>
        <Dna size={16} color="var(--ember)" strokeWidth={1.75}/>
        <span className="logo-text-grad">TWIN</span>
      </button>
      <nav className="global-nav">
        {[
          { id: 'explorer', label: 'DNA Explorer', icon: Dna },
          { id: 'twin',     label: 'Twin Health',  icon: Activity },
          { id: 'avatar',   label: 'Avatar Lab',   icon: UserRound },
        ].map(({ id, label, icon }) => (
          <button key={id}
            className={`nav-tab ${page === id || (page === 'questionnaire' && id === 'twin') ? 'active' : ''}`}
            onClick={() => onNavigate(id)}>
            <Ico icon={icon} size={14}/> <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>
      <div className="header-extras">{extras}</div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  MOBILE BOTTOM NAVIGATION                                       */
/* ═══════════════════════════════════════════════════════════════ */

function MobileNav({ page, onNavigate }) {
  const items = [
    { id: 'landing',  label: 'Home',   icon: Home },
    { id: 'explorer', label: 'DNA',    icon: Dna },
    { id: 'twin',     label: 'Health', icon: Activity },
    { id: 'avatar',   label: 'Avatar', icon: UserRound },
  ];
  return (
    <nav className="mobile-nav" aria-label="Main navigation">
      {items.map(({ id, label, icon }) => {
        const isActive = page === id || (page === 'questionnaire' && id === 'twin');
        return (
          <button key={id}
            className={`mobile-nav-item${isActive ? ' active' : ''}`}
            onClick={() => onNavigate(id)}
            aria-label={label}>
            <Ico icon={icon} size={22}/>
            <span className="mobile-nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  LANDING PAGE                                                   */
/* ═══════════════════════════════════════════════════════════════ */

function LandingPage({ onNavigate }) {
  const sectionsRef = useRef([]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.12 }
    );
    sectionsRef.current.forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const addRef = el => { if (el && !sectionsRef.current.includes(el)) sectionsRef.current.push(el); };

  return (
    <div className="landing-page">
      {/* ── HERO ── */}
      <section className="landing-hero">
        {/* Spline interactive DNA background */}
        <div className="spline-bg" aria-hidden="true">
          <Spline scene="https://prod.spline.design/h3496O6bHOAAD-yB/scene.splinecode" />
        </div>

        <div className="hero-content">
          <div className="hero-badge"><Dna size={12} style={{marginRight:4}}/> Personal health · DNA platform</div>
          <h1 className="hero-title">Meet <span className="hero-gradient">TWIN</span></h1>
          <p className="hero-subtitle">
            Your next 5 years of health, visualized — by your DNA and an AI that gets you.
          </p>
          <div className="hero-ctas">
            <button className="cta-primary" onClick={() => onNavigate('questionnaire')}>
              Start your health twin <span className="cta-arrow">→</span>
            </button>
            <button className="cta-secondary" onClick={() => onNavigate('explorer')}>
              Explore DNA
            </button>
          </div>
          <div className="hero-scroll-hint">↓ Scroll to explore</div>
        </div>
      </section>

      {/* ── WHAT IS TWIN ── */}
      <section className="landing-section fade-section" ref={addRef}>
        <div className="section-label">What is TWIN?</div>
        <h2 className="section-title">Your biology, made legible</h2>
        <p className="section-desc">
          TWIN translates DNA and lifestyle data into plain English — then shows you the exact levers you can pull to change your future.
        </p>
        <div className="feature-grid">
          {[
            { icon: Dna,           title: 'DNA Visualiser',    color: 'var(--base-A)',
              desc: 'See your DNA as a live 3D double helix. Hover any rung to understand what that letter pair does.',
              cta: 'Explore your DNA →', page: 'explorer' },
            { icon: TrendingUp,    title: 'Health Trajectory', color: 'var(--base-G)',
              desc: 'Answer 6 questions about your lifestyle. Get a projected 5-year health curve and your top levers.',
              cta: 'Begin the assessment →', page: 'questionnaire' },
            { icon: UserRound,     title: 'Avatar Lab',        color: 'var(--ink-70)',
              desc: 'See exactly which genes are active in each body region — brain, heart, liver, and more.',
              cta: 'Open Avatar Lab →', page: 'avatar' },
            { icon: MessageCircle, title: 'Twin Chat',         color: 'var(--base-T)',
              desc: 'Ask TWIN anything in plain English. It understands your profile and explains complex science simply.',
              cta: 'Ask TWIN →', page: 'twin' },
          ].map(f => (
            <button key={f.title} className="feature-card" onClick={() => onNavigate(f.page)}>
              <div className="fc-icon"><Ico icon={f.icon} size={22}/></div>
              <div className="fc-title">{f.title}</div>
              <div className="fc-desc">{f.desc}</div>
              <div className="fc-cta">{f.cta}</div>
            </button>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="landing-section alt-bg fade-section" ref={addRef}>
        <div className="section-label">How it works</div>
        <h2 className="section-title">Three steps to your digital twin</h2>
        <div className="steps-row">
          {[
            { num: '01', icon: ClipboardList, title: 'Tell us about yourself',
              desc: 'Answer 6 plain-English questions about sleep, stress, activity, and nutrition. Under 2 minutes.' },
            { num: '02', icon: TrendingUp,    title: 'Get your trajectory',
              desc: 'TWIN computes a personalised 5-year health projection and shows your top behaviour levers.' },
            { num: '03', icon: Sliders,       title: 'Change one thing, see the impact',
              desc: 'Toggle one behaviour and watch the projection update instantly. One change, real difference.' },
          ].map((step, i) => (
            <div key={step.num} className="step-wrap">
              <div className="step-card">
                <div className="step-num">{step.num}</div>
                <div className="step-icon"><Ico icon={step.icon} size={20}/></div>
                <div className="step-title">{step.title}</div>
                <div className="step-desc">{step.desc}</div>
              </div>
              {i < 2 && <div className="step-arrow">→</div>}
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <button className="cta-primary" onClick={() => onNavigate('questionnaire')}>
            Begin in 2 minutes <span className="cta-arrow">→</span>
          </button>
        </div>
      </section>

      {/* ── DNA TEASER ── */}
      <section className="landing-section fade-section" ref={addRef}>
        <div className="teaser-split">
          <div className="teaser-text">
            <div className="section-label">DNA Explorer</div>
            <h2 className="section-title" style={{ textAlign: 'left', fontSize: 32 }}>Your genome in 3D</h2>
            <p className="section-desc" style={{ textAlign: 'left', margin: 0, marginBottom: 16 }}>
              DNA is written in just 4 letters — A, T, G, C. TWIN renders your sequence as a live double helix you can spin, zoom, and explore. Paste any DNA code and watch it come alive.
            </p>
            <div className="base-legend-row">
              {[['A','var(--A)'],['T','var(--T)'],['G','var(--G)'],['C','var(--C)']].map(([b, c]) => (
                <span key={b} className="base-pill" style={{ background: c + '22', color: c, border: `1px solid ${c}55` }}>{b}</span>
              ))}
            </div>
            <button className="cta-secondary" style={{ marginTop: 20 }} onClick={() => onNavigate('explorer')}>
              Open DNA Explorer →
            </button>
          </div>
          <div className="teaser-visual">
            <div className="mini-helix">
              {['A','G','T','C','A','G','T','C','A','G'].map((b, i) => {
                const pair = { A:'T', T:'A', G:'C', C:'G' }[b];
                const offset = Math.sin(i * 0.7) * 28;
                return (
                  <div key={i} className="mini-rung" style={{ transform: `translateX(${offset}px)`, animationDelay: `${i * 0.1}s` }}>
                    <span className={`mini-base ${b}`}>{b}</span>
                    <span className="mini-bond"/>
                    <span className={`mini-base ${pair}`}>{pair}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="landing-footer-cta fade-section" ref={addRef}>
        <div className="footer-cta-inner">
          <h2 className="footer-cta-title">Meet your Future Health Twin</h2>
          <p className="footer-cta-sub">A 2-minute assessment. No sign-up required.</p>
          <button className="cta-primary large" onClick={() => onNavigate('questionnaire')}>
            Begin the assessment <span className="cta-arrow">→</span>
          </button>
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  QUESTIONNAIRE                                                  */
/* ═══════════════════════════════════════════════════════════════ */

const QUESTIONS = [
  { id: 'age', icon: User, title: 'How old are you?',
    type: 'slider', min: 18, max: 90, step: 1, unit: 'years', defaultValue: 35,
    help: 'Age is the strongest predictor of health trajectory baseline — but lifestyle factors can dramatically offset it.' },
  { id: 'sleep', icon: Moon, title: 'How many hours of sleep do you get each night?',
    type: 'slider', min: 3, max: 12, step: 0.5, unit: 'hrs/night', defaultValue: 7,
    help: 'Optimal sleep is 7–9 hours. Both too little and too much are associated with reduced healthspan.' },
  { id: 'stress', icon: Zap, title: "What's your typical stress level?",
    type: 'cards', defaultValue: 'medium',
    help: 'Chronic stress accelerates cellular aging through cortisol-driven telomere shortening.',
    options: [
      { value: 'low',    label: 'Low',    desc: 'Generally relaxed, good balance' },
      { value: 'medium', label: 'Medium', desc: 'Some pressure, mostly manageable' },
      { value: 'high',   label: 'High',   desc: 'Frequently stressed or overwhelmed' },
    ] },
  { id: 'activity', icon: Activity, title: 'How physically active are you?',
    type: 'cards', defaultValue: 'moderate',
    help: '150+ minutes of moderate activity weekly reduces all-cause mortality risk by up to 30%.',
    options: [
      { value: 'sedentary',  label: 'Sedentary', desc: 'Mostly sitting, minimal exercise' },
      { value: 'light',      label: 'Light',     desc: 'Light walks, occasional activity' },
      { value: 'moderate',   label: 'Moderate',  desc: '3–4 sessions/week' },
      { value: 'active',     label: 'Active',    desc: '5+ sessions/week, vigorous exercise' },
    ] },
  { id: 'nutrition', icon: Apple, title: 'How would you rate your diet quality?',
    type: 'cards', defaultValue: 'fair',
    help: 'Diet quality influences oxidative stress levels and DNA repair substrate availability.',
    options: [
      { value: 'poor',      label: 'Poor',      desc: 'Mostly processed / fast food' },
      { value: 'fair',      label: 'Fair',      desc: 'Mixed — some healthy, some not' },
      { value: 'good',      label: 'Good',      desc: 'Mostly whole foods, vegetables' },
      { value: 'excellent', label: 'Excellent', desc: 'Whole-food, plant-forward diet' },
    ] },
  { id: 'smoking', icon: Cigarette, title: 'Do you smoke?',
    type: 'cards', defaultValue: 'none',
    help: 'Smoking is the #1 modifiable risk factor for accelerated biological aging and DNA damage.',
    options: [
      { value: 'none',       label: 'Non-smoker',  desc: 'Never smoked or quit' },
      { value: 'occasional', label: 'Occasionally', desc: 'Social or rare smoker' },
      { value: 'regular',    label: 'Regularly',    desc: 'Daily or near-daily' },
    ] },
];

function QuestionnairePage({ onComplete }) {
  const [step,    setStep]    = useState(0);
  const [answers, setAnswers] = useState({ age: 35, sleep: 7, stress: 'medium', activity: 'moderate', nutrition: 'fair', smoking: 'none' });

  const q        = QUESTIONS[step];
  const isLast   = step === QUESTIONS.length - 1;
  const progress = ((step + 1) / QUESTIONS.length) * 100;

  const update = val => setAnswers(prev => ({ ...prev, [q.id]: val }));
  const next   = () => isLast ? onComplete(answers) : setStep(s => s + 1);
  const back   = () => setStep(s => Math.max(0, s - 1));

  return (
    <div className="questionnaire-page">
      <div className="quest-progress-bar"><div className="quest-progress-fill" style={{ width: progress + '%' }}/></div>
      <div className="quest-step-dots">
        {QUESTIONS.map((_, i) => (
          <div key={i} className={`quest-dot ${i < step ? 'done' : i === step ? 'active' : ''}`} onClick={() => i < step && setStep(i)}/>
        ))}
      </div>

      <div className="quest-card">
        <div className="quest-icon"><Ico icon={q.icon} size={24}/></div>
        <div className="quest-step-label">Question {step + 1} of {QUESTIONS.length}</div>
        <h2 className="quest-title">{q.title}</h2>
        <div className="quest-help">{q.help}</div>

        {q.type === 'slider' && (
          <div className="quest-slider-wrap">
            <div className="quest-slider-val">
              <span className="big-val">{answers[q.id]}</span>
              <span className="val-unit">{q.unit}</span>
            </div>
            <input type="range" className="quest-slider" min={q.min} max={q.max} step={q.step}
              value={answers[q.id]}
              onChange={e => update(q.step < 1 ? parseInt(e.target.value) : parseFloat(e.target.value))}/>
            <div className="slider-labels"><span>{q.min} {q.unit}</span><span>{q.max} {q.unit}</span></div>
          </div>
        )}

        {q.type === 'cards' && (
          <div className={`quest-cards-wrap cols-${Math.min(q.options.length, 4)}`}>
            {q.options.map(opt => (
              <button key={opt.value} className={`quest-opt ${answers[q.id] === opt.value ? 'selected' : ''}`}
                onClick={() => update(opt.value)}>
                <div className="quest-opt-label">{opt.label}</div>
                <div className="quest-opt-desc">{opt.desc}</div>
              </button>
            ))}
          </div>
        )}

        <div className="quest-nav">
          {step > 0 && <button className="quest-back" onClick={back}>← Back</button>}
          <button className="quest-next" onClick={next}>
            {isLast ? 'See My Twin Health →' : 'Next →'}
          </button>
        </div>
      </div>

      <div className="quest-preview">
        <span style={{ color: 'var(--text3)', fontSize: 11 }}>Live health estimate:</span>
        <span className="preview-score">{Math.round(computeCurrentScore(answers))}</span>
        <span style={{ color: 'var(--text3)', fontSize: 11 }}>/100</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  TRAJECTORY CHART                                               */
/* ═══════════════════════════════════════════════════════════════ */

function TrajectoryChart({ baseline, improved }) {
  const W = 440, H = 170, pad = { t: 16, r: 20, b: 32, l: 38 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const allS = [...baseline.map(p => p.score), ...(improved ? improved.map(p => p.score) : [])];
  const minS = Math.max(0, Math.min(...allS) - 5);
  const maxS = Math.min(100, Math.max(...allS) + 5);
  const xP = yr => pad.l + (yr / 5) * iW;
  const yP = s  => pad.t + iH - ((s - minS) / (maxS - minS)) * iH;
  const toD = pts => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xP(p.year).toFixed(1)} ${yP(p.score).toFixed(1)}`).join(' ');

  return (
    <svg className="trajectory-svg" viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id="baseG" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="imprG" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--green)" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="var(--green)" stopOpacity="0"/>
        </linearGradient>
      </defs>

      {[0,25,50,75,100].map(v => {
        const y = yP(v);
        if (y < pad.t - 2 || y > H - pad.b + 2) return null;
        return <g key={v}>
          <line x1={pad.l} x2={W-pad.r} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
          <text x={pad.l-4} y={y+3} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="9">{v}</text>
        </g>;
      })}
      {[0,1,2,3,4,5].map(yr => (
        <text key={yr} x={xP(yr)} y={H-6} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9">
          {yr === 0 ? 'Now' : `+${yr}yr`}
        </text>
      ))}

      <path d={`${toD(baseline)} L${xP(5)} ${H-pad.b} L${xP(0)} ${H-pad.b} Z`} fill="url(#baseG)"/>
      <path d={toD(baseline)} stroke="var(--cyan)" strokeWidth="2" fill="none" strokeLinejoin="round"/>

      {improved && <>
        <path d={`${toD(improved)} L${xP(5)} ${H-pad.b} L${xP(0)} ${H-pad.b} Z`} fill="url(#imprG)"/>
        <path d={toD(improved)} stroke="var(--green)" strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
      </>}

      {baseline.map(p => <circle key={p.year} cx={xP(p.year)} cy={yP(p.score)} r="3.5" fill="var(--cyan)"/>)}
      {improved && improved.map(p => <circle key={p.year} cx={xP(p.year)} cy={yP(p.score)} r="3.5" fill="var(--green)"/>)}

      <g transform={`translate(${W-pad.r-120},${pad.t})`}>
        <rect x="0" y="0" width="120" height={improved ? 42 : 22} rx="5"
          fill="rgba(238,242,235,0.92)" stroke="rgba(60,79,61,0.15)" strokeWidth="0.5"/>
        <line x1="6" x2="20" y1="11" y2="11" stroke="var(--cyan)" strokeWidth="2"/>
        <text x="24" y="14" fill="rgba(60,79,61,0.7)" fontSize="9">Baseline trajectory</text>
        {improved && <>
          <line x1="6" x2="20" y1="31" y2="31" stroke="var(--green)" strokeWidth="2.5"/>
          <text x="24" y="34" fill="rgba(60,79,61,0.7)" fontSize="9">With improvement</text>
        </>}
      </g>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  TWIN HEALTH DASHBOARD                                          */
/* ═══════════════════════════════════════════════════════════════ */

function TwinHealthPage({ answers, onReset, twinChat }) {
  const [activeLever, setActiveLever] = useState(null);
  const baseline = projectTrajectory(answers);
  const improved = activeLever ? projectTrajectory(answers, activeLever) : null;
  const levers   = getTopLevers(answers);
  const score    = Math.round(computeCurrentScore(answers));
  const oneYr    = Math.round(baseline[1].score);
  const fiveYr   = Math.round(baseline[5].score);
  const scoreColor = score >= 75 ? 'var(--base-G)' : score >= 50 ? 'var(--base-T)' : 'var(--base-T)';
  const leverDelta = activeLever && improved ? Math.round(improved[5].score - baseline[5].score) : null;

  return (
    <div className="twin-health-page">
      {/* Summary row */}
      <div className="health-summary-row">
        <div className="summary-card" style={{ borderColor: scoreColor + '55' }}>
          <div className="sc-label">Current Score</div>
          <div className="sc-value" style={{ color: scoreColor }}>{score}</div>
          <div className="sc-sub">/100</div>
          <div className="sc-desc">Based on your lifestyle profile</div>
        </div>
        <div className="summary-card">
          <div className="sc-label">In 1 Year</div>
          <div className="sc-value" style={{ color: 'var(--ember)' }}>{oneYr}</div>
          <div className="sc-sub">/100</div>
          <div className="sc-desc">Baseline projection</div>
        </div>
        <div className="summary-card">
          <div className="sc-label">In 5 Years</div>
          <div className="sc-value" style={{ color: 'var(--ink-60)' }}>{fiveYr}</div>
          <div className="sc-sub">/100</div>
          <div className="sc-desc">Without changes</div>
        </div>
        {activeLever && leverDelta !== null && (
          <div className="summary-card highlight-card">
            <div className="sc-label">5yr Gain</div>
            <div className="sc-value" style={{ color: 'var(--base-G)' }}>+{leverDelta}</div>
            <div className="sc-sub">pts</div>
            <div className="sc-desc">If you improve {activeLever.label.toLowerCase()}</div>
          </div>
        )}
      </div>

      {/* Main grid */}
      <div className="health-main-grid">
        <div className="health-panel">
          <div className="health-panel-heading">
            <TrendingUp size={14}/> 5-Year Health Trajectory
            {improved && <span className="improvement-badge">+{leverDelta} pts with {activeLever.label} change</span>}
          </div>
          <TrajectoryChart baseline={baseline} improved={improved}/>
          {!improved && <div className="chart-hint">Select a behaviour lever to see its impact on your trajectory</div>}
        </div>

        <div className="health-panel">
          <div className="health-panel-heading"><Sliders size={14}/> Top Levers</div>
          <div className="lever-hint">Click to see how each change shifts your trajectory</div>
          {levers.length > 0 ? levers.map(lever => {
            const isActive = activeLever?.key === lever.key;
            const projGain = Math.round(
              projectTrajectory(answers, { key: lever.key, value: lever.improve.value })[5].score - baseline[5].score
            );
            return (
              <div key={lever.key}
                className={`lever-card ${isActive ? 'active' : ''}`}
                onClick={() => setActiveLever(isActive ? null : { key: lever.key, value: lever.improve.value, label: lever.label })}>
                <div className="lever-top">
                  <span className="lever-icon"><Ico icon={lever.icon} size={14}/></span>
                  <span className="lever-label">{lever.label}</span>
                  <span className={`impact-badge impact-${lever.impact}`}>{lever.impact}</span>
                  <span className="lever-gain">+{projGain} pts</span>
                </div>
                <div className="lever-desc">{lever.desc}</div>
                <div className="lever-change">
                  <span className="cur-val">{lever.currentLabel}</span>
                  <span style={{ color: 'var(--text3)' }}>→</span>
                  <span className="tgt-val">{lever.improve.label}</span>
                </div>
              </div>
            );
          }) : (
            <div className="no-levers">Your lifestyle is already well-optimised. Explore the DNA Explorer for deeper genetic insights.</div>
          )}
          <button className="reset-btn" onClick={onReset}>← Redo questionnaire</button>
        </div>
      </div>

      {/* Fitness Programme */}
      <div className="connect-fitness-panel">
        <div className="health-panel-heading" style={{ marginBottom: 12 }}>
          <Activity size={14}/> Your Personalised Fitness Programme
        </div>
        <div className="connect-fitness-inner">
          <div className="connect-fitness-text">
            {(() => {
              const act = answers.activity;
              if (act === 'sedentary') return (
                <>
                  <p className="connect-fitness-desc" style={{ marginBottom: 6 }}>
                    <strong style={{ color: 'var(--text)' }}>Starting point: Build the habit.</strong>
                  </p>
                  <p className="connect-fitness-desc">
                    You reported a sedentary lifestyle. Begin with 10–15 min daily walks and two short bodyweight sessions per week. Even light movement reduces all-cause mortality by up to 20%.
                  </p>
                </>
              );
              if (act === 'light') return (
                <>
                  <p className="connect-fitness-desc" style={{ marginBottom: 6 }}>
                    <strong style={{ color: 'var(--text)' }}>Next step: Add structure.</strong>
                  </p>
                  <p className="connect-fitness-desc">
                    You have some activity. Aim for 3 × 30 min sessions per week — a mix of cardio (brisk walking, cycling) and resistance training. This will meaningfully shift your 5-year trajectory.
                  </p>
                </>
              );
              if (act === 'moderate') return (
                <>
                  <p className="connect-fitness-desc" style={{ marginBottom: 6 }}>
                    <strong style={{ color: 'var(--text)' }}>Keep building: Add intensity.</strong>
                  </p>
                  <p className="connect-fitness-desc">
                    Solid foundation. To unlock the next tier of longevity benefit, add one HIIT session per week and increase your weekly step count to 8,000+. Progressive overload in strength training will further slow biological aging.
                  </p>
                </>
              );
              // active or very_active
              return (
                <>
                  <p className="connect-fitness-desc" style={{ marginBottom: 6 }}>
                    <strong style={{ color: 'var(--text)' }}>Optimise: Recovery &amp; consistency.</strong>
                  </p>
                  <p className="connect-fitness-desc">
                    Your activity level is excellent. Focus on recovery quality — sleep, HRV monitoring, and periodised training. Combining aerobic fitness with resistance training delivers the greatest longevity benefit.
                  </p>
                </>
              );
            })()}
          </div>
          <button className="connect-fitness-btn">
            <Activity size={13} style={{ marginRight: 7 }}/> Connect Fitness Tracker · Coming soon
          </button>
        </div>
      </div>

      {/* Twin chat */}
      <div className="health-panel health-chat-panel">
        <div className="health-panel-heading">Ask TWIN About Your Results</div>
        {twinChat}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  SHARED SMALL COMPONENTS                                        */
/* ═══════════════════════════════════════════════════════════════ */

function TypingDots() {
  return <div className="typing"><span/><span/><span/></div>;
}

function SectionHeader({ title, info }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div className="panel-section-title" style={{ marginBottom: 0 }}>{title}</div>
        <span className={`info-badge ${open ? 'open' : ''}`}
          onClick={() => setOpen(o => !o)} title={open ? 'Close' : 'What is this?'}>
          {open ? '×' : '?'}
        </span>
      </div>
      {open && <div className="info-inline" dangerouslySetInnerHTML={{ __html: info }}/>}
    </div>
  );
}

function Message({ msg }) {
  return (
    <div className={`msg-row ${msg.role} fade-up`}>
      <div className={`msg-avatar ${msg.role}`}>{msg.role === 'ai' ? 'T' : 'U'}</div>
      <div className={`msg-bubble ${msg.role}`}>
        {msg.typing
          ? <TypingDots/>
          : <span dangerouslySetInnerHTML={{ __html: renderMD(msg.content) }}/>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  CHAT PANEL                                                     */
/* ═══════════════════════════════════════════════════════════════ */
function ChatPanel({ open, messages, loading, suggestions, onSend, onClear, onClose, floating, compact }) {
  const [input, setInput] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const endRef  = useRef(null);
  const textRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = useCallback((text) => {
    const t = (text || input).trim();
    if (!t || loading) return;
    onSend(t);
    setInput('');
    if (textRef.current) textRef.current.style.height = 'auto';
  }, [input, loading, onSend]);

  const handleKey  = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const autoGrow   = (e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'; };

  if (compact) {
    return (
      <div className="compact-chat">
        <div className="compact-messages">
          {messages.map(m => <Message key={m.id} msg={m}/>)}
          {loading && <div className="msg-row ai fade-up"><div className="msg-avatar ai">T</div><div className="msg-bubble ai"><TypingDots/></div></div>}
          <div ref={endRef}/>
        </div>
        {suggestions.length > 0 && (
          <div className="suggestions-dropdown">
            <button className="suggestions-toggle" onClick={() => setSuggestionsOpen(v => !v)}>
              <span>Suggested questions</span>
              <svg className={`sugg-arrow${suggestionsOpen ? ' open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {suggestionsOpen && (
              <div className="suggestions-row">
                {suggestions.map((s, i) => <button key={i} className="sugg-chip" onClick={() => { handleSend(s); setSuggestionsOpen(false); }}>{s}</button>)}
              </div>
            )}
          </div>
        )}
        <div className="chat-input-area">
          <div className="chat-input-wrap">
            <textarea ref={textRef} className="chat-textarea" placeholder="Ask about your results…"
              rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} onInput={autoGrow}/>
            <button className="send-btn" onClick={() => handleSend()} disabled={loading || !input.trim()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21L23 12L2 3L2 10L17 12L2 14Z"/></svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`right-panel ${open ? '' : 'closed'} ${floating ? 'floating-chat' : ''}`}>
      {open && <>
        <div className="panel-header">
          <div>
            <div className="chat-title">Ask TWIN</div>
            <div className="chat-subtitle">No science degree needed</div>
          </div>
          <div className="chat-header-actions">
            <button className="chat-hbtn" onClick={onClear} title="Clear chat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </button>

          </div>
        </div>
        <div className="messages-area">
          {messages.map(m => <Message key={m.id} msg={m}/>)}
          <div ref={endRef}/>
        </div>
        {suggestions.length > 0 && (
          <div className="suggestions-dropdown">
            <button className="suggestions-toggle" onClick={() => setSuggestionsOpen(v => !v)}>
              <span>Suggested questions</span>
              <svg className={`sugg-arrow${suggestionsOpen ? ' open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {suggestionsOpen && (
              <div className="suggestions-row">
                {suggestions.map((s, i) => (
                  <button key={i} className="sugg-chip" onClick={() => { handleSend(s); setSuggestionsOpen(false); }}>{s}</button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="chat-input-area">
          <div className="chat-input-wrap">
            <textarea ref={textRef} className="chat-textarea"
              placeholder="Ask me anything — plain English is fine!"
              rows={1} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey} onInput={autoGrow}/>
            <button className="send-btn" onClick={() => handleSend()} disabled={loading || !input.trim()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21L23 12L2 3L2 10L17 12L2 14Z"/>
              </svg>
            </button>
          </div>
        </div>
      </>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  DNA CANVAS  (Three.js bridge)                                  */
/* ═══════════════════════════════════════════════════════════════ */
function DNACanvas({ onTooltip }) {
  const containerRef = useRef(null);
  const initialised  = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initialised.current) return;
    initialised.current = true;
    window._dnaTooltipSet = onTooltip;
    initThreeJS(containerRef.current);
    return () => { window._dnaTooltipSet = null; };
  }, [onTooltip]);

  return (
    <div className="center-wrap">
      <div id="three-canvas" ref={containerRef}/>
      <div className="dna-legend">
        <div style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: 5, fontWeight: 600, letterSpacing: '.4px', textTransform: 'uppercase' }}>
          What each colour means
        </div>
        {[
          ['var(--A)', 'A — pairs with T  (flexible)'],
          ['var(--T)', 'T — pairs with A  (flexible)'],
          ['var(--G)', 'G — pairs with C  (strong, 3 bonds)'],
          ['var(--C)', 'C — pairs with G  (strong, 3 bonds)'],
          ['#8888ee',  'Purple tubes = the DNA backbone'],
        ].map(([bg, label]) => (
          <div key={label} className="leg-row">
            <span className="leg-dot" style={{ background: bg }}/>
            {label}
          </div>
        ))}
        <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: 7, paddingTop: 7, borderTop: '1px solid var(--border)', lineHeight: 1.5 }}>
          Each <em>rung</em> = one letter pair<br/>
          The whole shape = a double helix
        </div>
      </div>
      <div className="center-hint">Drag to spin · Scroll to zoom · Hover a rung to see its letter pair</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  EVO2 VARIANT ANALYSER                                          */
/* ═══════════════════════════════════════════════════════════════ */
function VariantAnalyser({ analysis }) {
  const [position, setPosition] = useState(0);
  const [alt,      setAlt]      = useState('');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState('');

  const seq     = analysis?.seq || '';
  const refBase = seq[position] || '';
  const altBases = ['A','T','G','C'].filter(b => b !== refBase);

  useEffect(() => { setAlt(''); setResult(null); setError(''); }, [position, analysis]);

  const handleRun = async () => {
    if (!alt || !seq) return;
    setLoading(true); setResult(null); setError('');
    try {
      const res = await callEvo2VariantAPI(seq, position, refBase, alt);
      setResult(res);
    } catch (e) {
      setError(e.name === 'AbortError'
        ? 'Request timed out — Evo2 cold-start can take up to 3 min. Please try again.'
        : `Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const interp = result ? interpretDelta(result.deltaScore) : null;

  return (
    <div className="panel-section">
      <SectionHeader title={<><Dna size={14}/> Evo2 Variant Analysis</>}
        info="<strong>What is this?</strong><br/>Calls the <em>real</em> Evo2 AI (trained on 8.8 trillion DNA letters) to score a single-letter change at any position. A negative Δ score means Evo2 thinks the mutation is unusual — potentially damaging."/>

      <div className="va-row">
        <div className="va-field">
          <label className="va-label">Position</label>
          <input type="number" className="va-input" min={0} max={seq.length - 1}
            value={position}
            onChange={e => setPosition(Math.min(seq.length - 1, Math.max(0, +e.target.value || 0)))}/>
        </div>
        <div className="va-field">
          <label className="va-label">Ref</label>
          <span className={`base ${refBase}`} style={{ width: 24, height: 24, fontSize: 13 }}>{refBase}</span>
        </div>
        <div className="va-field">
          <label className="va-label">→ Alt</label>
          <div className="va-alt-btns">
            {altBases.map(b => (
              <button key={b}
                className={`base ${b} va-alt-btn ${alt === b ? 'selected' : ''}`}
                style={{ width: 24, height: 24, fontSize: 13, cursor: 'pointer' }}
                onClick={() => setAlt(b)}>{b}</button>
            ))}
          </div>
        </div>
      </div>

      <button className="seq-btn primary va-run-btn" onClick={handleRun} disabled={!alt || loading}>
        {loading ? 'Evo2 is thinking…' : 'Run Evo2 Analysis'}
      </button>

      {loading && (
        <div className="va-loading">
          <div className="va-spinner"/>
          <span>Calling real Evo2 AI… <em>(cold-start may take ~60 s)</em></span>
        </div>
      )}
      {error && <div className="va-error">{error}</div>}

      {result && interp && (
        <div className="va-result-card" style={{ borderColor: interp.color }}>
          <div className="va-badge" style={{ background: interp.color + '22', color: interp.color, borderColor: interp.color + '55' }}>
            {interp.label}
          </div>
          <div className="va-scores">
            <div className="va-score-item">
              <span className="va-score-label">Δ Score (alt − ref)</span>
              <span className="va-score-val" style={{ color: interp.color }}>{result.deltaScore.toFixed(4)}</span>
            </div>
            {result.refScore !== null && (
              <div className="va-score-item">
                <span className="va-score-label">Ref log-P</span>
                <span className="va-score-val">{result.refScore.toFixed(4)}</span>
              </div>
            )}
            {result.altScore !== null && (
              <div className="va-score-item">
                <span className="va-score-label">Alt log-P</span>
                <span className="va-score-val">{result.altScore.toFixed(4)}</span>
              </div>
            )}
          </div>
          <div className="va-interp-desc">{interp.desc}</div>
          <div className="va-powered">Powered by real Evo2 AI · Arc Institute</div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  LEFT PANEL  (DNA Snapshot)                                     */
/* ═══════════════════════════════════════════════════════════════ */
function LeftPanel({ open, seqInput, setSeqInput, analysis, onAnalyze, onClear, onPreset }) {
  const [hoveredBase, setHoveredBase] = useState(null);

  return (
    <div className={`left-panel ${open ? '' : 'closed'}`}>
      {open && <>
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div className="panel-title">Your DNA Snapshot</div>
            <span className="info-badge" style={{ marginLeft: 4 }} title="What is TWIN?"
              onClick={() => { window._twinAsk && window._twinAsk('What is TWIN?'); }}>?</span>
          </div>
        </div>
        <div className="left-scroll">

          {/* Input */}
          <div className="panel-section">
            <SectionHeader title="Paste Your DNA Code Here"
              info="<strong>What is a DNA code?</strong><br/>DNA is your body's instruction manual, written using just 4 letters: <strong style='color:#4a8ff0'>A</strong>, <strong style='color:#f0a830'>T</strong>, <strong style='color:#4aba70'>G</strong>, and <strong style='color:#e05050'>C</strong>. You can paste any sequence here and TWIN will analyse it."/>
            <div className="section-note">
              Your body's code uses just 4 letters.
              {' '}<strong style={{ color: 'var(--A)' }}>A</strong> always pairs with <strong style={{ color: 'var(--T)' }}>T</strong>
              {' '}·{' '}
              <strong style={{ color: 'var(--G)' }}>G</strong> always pairs with <strong style={{ color: 'var(--C)' }}>C</strong>
            </div>
            <div className="seq-input-wrap">
              <textarea value={seqInput} onChange={e => setSeqInput(e.target.value)}
                placeholder={"Paste or type a DNA code (only A, T, G, C)\ne.g. ATCGATCG..."}/>
            </div>
            <div className="seq-actions">
              <button className="seq-btn primary" onClick={onAnalyze}>▶ Read My DNA</button>
              <button className="seq-btn secondary" onClick={onClear}>Clear</button>
            </div>
          </div>

          {/* Base viewer */}
          {analysis && (
            <div className="panel-section">
              <SectionHeader title="DNA Letters"
                info="<strong>What are these coloured tiles?</strong><br/>Each tile is one letter of your DNA. Hover any tile to see what that letter does and light up the matching rung in the 3D spiral!"/>
              <div className="seq-viewer">
                {analysis.seq.split('').map((b, i) => (
                  <span key={i} className={`base ${b}`}
                    onMouseEnter={() => { setHoveredBase(b); window._dnaHighlight && window._dnaHighlight(i % 28); }}
                    onMouseLeave={() => { setHoveredBase(null); window._dnaClearHighlight && window._dnaClearHighlight(); }}
                  >{b}</span>
                ))}
              </div>
              <div className={`base-explain ${hoveredBase ? 'active' : ''}`}>
                {hoveredBase && BASE_INFO[hoveredBase] ? (
                  <>
                    <span className="be-letter" style={{ color: BASE_INFO[hoveredBase].color }}>
                      {hoveredBase}
                    </span>
                    <strong>{BASE_INFO[hoveredBase].full}</strong>{' — pairs with '}
                    <strong style={{ color: BASE_INFO[hoveredBase].pairColor }}>{BASE_INFO[hoveredBase].pair}</strong><br/>
                    <span style={{ color: 'var(--text3)', fontSize: '10px' }}>{BASE_INFO[hoveredBase].why}</span>
                  </>
                ) : (
                  <span style={{ color: 'var(--text3)' }}>Hover any letter tile above to learn what it does</span>
                )}
              </div>
            </div>
          )}

          {/* Health report */}
          {analysis && (
            <div className="panel-section">
              <SectionHeader title="TWIN Health Report"
                info="<strong>What is a Health Score?</strong><br/>TWIN uses an AI (Evo2) to rate how 'natural' your code looks — like a spell-checker, but for DNA. Scores closer to 0 = more natural."/>
              <div className="score-card">
                <div className="score-label">DNA Health Score — how natural this code looks to TWIN</div>
                <div className="score-value">{analysis.score.toFixed(4)}</div>
                <div className="score-sub">{analysis.label}</div>
                <div className="score-bar-bg">
                  <div className="score-bar-fill" style={{ width: analysis.pct + '%' }}/>
                </div>
              </div>
              <div className="score-explain">
                <strong style={{ color: 'var(--text2)' }}>What do these percentages mean?</strong><br/>
                <strong style={{ color: 'var(--G)' }}>G</strong>+<strong style={{ color: 'var(--C)' }}>C</strong> form <strong>3 bonds</strong> = stronger &amp; more stable.{' '}
                <strong style={{ color: 'var(--A)' }}>A</strong>+<strong style={{ color: 'var(--T)' }}>T</strong> form <strong>2 bonds</strong> = more flexible.
              </div>
              <div className="base-stats">
                {['A', 'T', 'G', 'C'].map((b, i) => (
                  <div key={b} className="base-stat" title={BASE_INFO[b]?.why}>
                    <span className="bs-label" style={{ color: `var(--${b})` }}>{b}</span>
                    <span className="bs-val">{analysis.counts[b]} ({Math.round(100 * analysis.counts[b] / analysis.seq.length)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evo2 Variant Analysis */}
          {analysis && <VariantAnalyser analysis={analysis}/>}

          {/* Presets */}
          <div className="panel-section">
            <SectionHeader title="Famous DNA Snippets"
              info="<strong>Why these?</strong><br/>Real, well-known pieces of human (and viral) DNA — each with a very different job. Click any card to load it and score it!"/>
            <div className="preset-list">
              {[['BRCA1', 3,'Cancer Shield Gene'],['TELO', 3,'Cell Aging Clock'],
                ['KOZAK', 9,'Protein Launch Pad'],['PHIX', 9,'Tiny Virus DNA']].map(([key, sdg, label]) => (
                <div key={key} className="preset" onClick={() => onPreset(key)}>
                  <div className="preset-name"><Dna size={12}/> {label}</div>
                  <div className="preset-desc">{PRESET_INFO[key].why}</div>
                  <div className="preset-seq">{PRESETS[key]}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  PAGE 1 — EXPLORER                                              */
/* ═══════════════════════════════════════════════════════════════ */
function ExplorerPage({ sharedState }) {
  const {
    loaded, leftOpen, setLeftOpen, rightOpen, setRightOpen,
    seqInput, setSeqInput, analysis, setAnalysis,
    messages, chatLoading, suggestions, setSuggestions,
    tooltip, setTooltip, addMsg, resolveTyping, handleSend, handleClearChat,
  } = sharedState;

  const isMobile = useIsMobile();

  const stats = analysis
    ? { len: analysis.seq.length, gc: gcContent(analysis.seq) + '%', at: (100 - gcContent(analysis.seq)) + '%', score: analysis.score.toFixed(3) }
    : { len: 0, gc: null, at: null, score: null };

  const handleAnalyze = useCallback(() => {
    const seq = seqInput.toUpperCase().replace(/[^ATGC]/g, '');
    if (!seq) return;
    const score  = simulateScore(seq);
    const pct    = Math.min(100, Math.max(5, Math.round((score + 2.5) / 5 * 100)));
    const counts = { A: 0, T: 0, G: 0, C: 0 };
    seq.split('').forEach(b => { if (counts[b] !== undefined) counts[b]++; });
    setAnalysis({ seq, score, pct, label: scoreLabel(score), counts });
  }, [seqInput, setAnalysis]);

  const handleClearSeq = () => { setSeqInput(''); setAnalysis(null); };

  const handlePreset = useCallback((key) => {
    const seq    = PRESETS[key];
    const score  = simulateScore(seq.toUpperCase());
    const pct    = Math.min(100, Math.max(5, Math.round((score + 2.5) / 5 * 100)));
    const counts = { A: 0, T: 0, G: 0, C: 0 };
    seq.toUpperCase().split('').forEach(b => { if (counts[b] !== undefined) counts[b]++; });
    setSeqInput(seq);
    setAnalysis({ seq: seq.toUpperCase(), score, pct, label: scoreLabel(score), counts });
    addMsg('user', `Show me the ${PRESET_FRIENDLY[key]}`);
    const gc  = gcContent(seq);
    const tid = addMsg('ai', '', true);
    const resp = `Loaded the **${PRESET_FRIENDLY[key]}**.\n\nThis ${seq.length}-letter DNA code is **${gc}% stable**.\n\nHover any letter to light up that rung on the 3D spiral.`;
    setTimeout(() => resolveTyping(tid, resp), 600);
    setSuggestions([]);
    setTimeout(() => setSuggestions(DEFAULT_SUGGESTIONS.slice(0, 3)), 1800);
  }, [addMsg, resolveTyping, setSeqInput, setAnalysis, setSuggestions]);

  return (
    <div className="page page-explorer">
      {!loaded && (
        <div className="loading-screen">
          <div className="dna-loader"/>
          <div style={{ fontSize: '14px', color: 'var(--cyan)', fontWeight: 600 }}>Starting up TWIN…</div>
          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Loading 3D renderer…</div>
        </div>
      )}
      {tooltip.show && (
        <div className="dna-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>{tooltip.text}</div>
      )}
      <div className="app-body">
        <div className="explorer-main">
          <DNACanvas onTooltip={setTooltip}/>
          {leftOpen && (
            <div className="explorer-floating-dna">
              <LeftPanel
                open={true} seqInput={seqInput} setSeqInput={setSeqInput}
                analysis={analysis} onAnalyze={handleAnalyze}
                onClear={handleClearSeq} onPreset={handlePreset}
              />
            </div>
          )}
          {rightOpen && (
            <div className="explorer-floating-chat">
              <ChatPanel
                open={true} messages={messages} loading={chatLoading}
                suggestions={suggestions} onSend={handleSend} onClear={handleClearChat}
                onClose={isMobile ? () => setRightOpen(false) : undefined}
              />
            </div>
          )}
          {/* Tap-outside overlay to close panels on mobile */}
          {isMobile && (leftOpen || rightOpen) && (
            <div
              style={{
                position: 'fixed', inset: 0,
                bottom: 'calc(var(--nav-total, 56px))',
                zIndex: 19,
                background: 'rgba(0,0,0,0.35)',
              }}
              onClick={() => { setLeftOpen(false); setRightOpen(false); }}
            />
          )}
          {/* Mobile FABs — shown only on mobile via CSS */}
          <div className="mobile-explorer-fabs">
            <button
              className={`mobile-fab${leftOpen ? ' active' : ''}`}
              onClick={() => { const next = !leftOpen; setLeftOpen(next); if (next) setRightOpen(false); }}>
              <Code2 size={14}/> DNA Code
            </button>
            <button
              className={`mobile-fab${rightOpen ? ' active' : ''}`}
              onClick={() => { const next = !rightOpen; setRightOpen(next); if (next) setLeftOpen(false); }}>
              <MessageCircle size={14}/> Ask TWIN
            </button>
          </div>
          {/* Desktop FAB */}
          {!leftOpen && !rightOpen && (
            <button className="explorer-chat-fab"
              onClick={() => { setRightOpen(true); setLeftOpen(false); }}>
              <MessageCircle size={15}/> Ask TWIN
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  PAGE 2 — AVATAR LAB                                           */
/* ═══════════════════════════════════════════════════════════════ */

const BODY_REGIONS = [
  {
    id: 'brain', label: 'Brain', icon: Brain,
    top: '20%', left: '49.5%',
    gene: 'BRCA1', color: 'var(--base-G)',
    info: 'Your brain cells contain the same DNA as every other cell. Genes like APOE influence Alzheimer\u2019s risk. TWIN scores brain-region genes to assess neural stability.',
    stat: 'Neural DNA stability is maintained by specialized repair enzymes active only in neurons.',
  },
  {
    id: 'heart', label: 'Heart', icon: Heart,
    top: '53%', left: '60%',
    gene: 'KOZAK', color: 'var(--ember)',
    info: 'The heart needs precise protein timing — the Kozak sequence (Protein Launch Pad) controls this. Mutations here can affect cardiac rhythm proteins.',
    stat: 'Cardiac genes are read ~2\u00d7 more frequently than average genes due to the heart\'s constant activity.',
  },
  {
    id: 'dna-helix', label: 'DNA Core', icon: Dna,
    top: '72%', left: '51%',
    gene: 'TELO', color: 'var(--base-A)',
    info: 'Every cell in your body has ~2 metres of DNA coiled inside it. Telomeres at the tips protect it like the plastic end of a shoelace, getting shorter each time cells divide.',
    stat: 'You lose ~50\u2013200 telomere letters per cell division. Lifestyle factors can slow this loss.',
  },
  {
    id: 'lungs', label: 'Lungs', icon: Wind,
    top: '51%', left: '42%',
    gene: 'BRCA1', color: 'var(--base-A)',
    info: 'Lung cells are exposed to environmental DNA damage daily. The BRCA1 Cancer Shield Gene is especially active here, constantly repairing oxidative damage from breathing.',
    stat: 'Each breath exposes lung DNA to ~1,000 oxidative lesions that must be repaired.',
  },
];

function AvatarCanvas({ activeRegion, onRegionClick }) {
  return (
    <div className="avatar-scene">
      <div className="avatar-particles">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="avatar-particle"
            style={{
              left: `${(i * 37) % 100}%`,
              top:  `${(i * 53) % 100}%`,
              animationDelay: `${(i * 0.3) % 4}s`,
              animationDuration: `${3 + (i % 4)}s`,
              background: ['var(--A)','var(--T)','var(--G)','var(--C)','var(--cyan)'][i % 5],
            }}/>
        ))}
      </div>

      <div className="avatar-spline-wrap">
        <Spline
          scene="https://prod.spline.design/Mols85YGaIZTKdTm/scene.splinecode"
          onLoad={(splineApp) => {
            window.__splineApp = splineApp;
            try {
              // Disable orbit/auto-rotate controls
              const controls = splineApp._controls;
              if (controls) {
                controls.autoRotate = false;
                controls.enableRotate = false;
                controls.enabled = false;
              }
              // Move camera 180° around Y axis to show front face
              const cam = splineApp._camera;
              if (cam) {
                cam.position.z *= -1;
                cam.lookAt(0, 0, 0);
              }
              // Set canvas background color only — does NOT affect model materials
              const renderer = splineApp._renderer || splineApp.renderer;
              if (renderer) {
                renderer.setClearColor(0x050f07, 0);
                renderer.setClearAlpha(0);
              }
              // Transparent canvas so CSS green gradient shows through
              if (splineApp.canvas) {
                splineApp.canvas.style.background = 'transparent';
              }
            } catch (e) { /* ignore */ }
            window.setTimeout(() => {
              try { splineApp.stop(); } catch (e) { /* ignore */ }
            }, 800);
          }}
        />
      </div>

      {BODY_REGIONS.map(r => (
        <button key={r.id}
          className={`body-hotspot ${activeRegion === r.id ? 'active' : ''}`}
          style={{ top: r.top, left: r.left, '--hotspot-color': r.color }}
          onClick={() => onRegionClick(r.id)}
          title={r.label}>
          <span className="hotspot-pulse"/>
          <span className="hotspot-icon"><Ico icon={r.icon} size={14}/></span>
        </button>
      ))}
    </div>
  );
}

function StatRing({ label, value, max, color }) {
  const pct  = Math.min(100, Math.max(0, (value / max) * 100));
  const circ = 2 * Math.PI * 28;
  return (
    <div className="stat-ring-wrap">
      <svg width="70" height="70" viewBox="0 0 70 70">
        <circle cx="35" cy="35" r="28" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5"/>
        <circle cx="35" cy="35" r="28" fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
          strokeLinecap="round" transform="rotate(-90 35 35)" style={{ transition: 'stroke-dashoffset 1s ease' }}/>
        <text x="35" y="39" textAnchor="middle" fill={color} fontSize="12" fontWeight="700" fontFamily="JetBrains Mono, monospace">
          {Math.round(pct)}%
        </text>
      </svg>
      <div className="stat-ring-label">{label}</div>
    </div>
  );
}

function AvatarPage({ sharedState, twinAnswers, onOpenHealthResults }) {
  const { analysis, messages, chatLoading, suggestions, handleSend, handleClearChat, avatarLeftTab, setAvatarLeftTab } = sharedState;
  const [activeRegion, setActiveRegion] = useState('dna-helix');
  const [mobileTab, setMobileTab]       = useState('avatar');

  const isMobile = useIsMobile();

  const region   = BODY_REGIONS.find(r => r.id === activeRegion) || BODY_REGIONS[2];
  const gcPct    = analysis ? gcContent(analysis.seq) : 52;
  const atPct    = analysis ? (100 - gcContent(analysis.seq)) : 48;
  const scorePct = analysis ? Math.min(100, Math.max(0, Math.round((analysis.score + 2.5) / 5 * 100))) : 60;

  return (
    <div className="page page-avatar">
      <div className="avatar-body" data-tab={mobileTab}>
        <div className={`avatar-hud-left${avatarLeftTab === 'chat' ? ' chat-mode' : ''}`}>
          {avatarLeftTab === 'stats' && (<>
          <div className="hud-panel">
            <div className="hud-title"><Dna size={12}/> DNA Composition</div>
            <div className="stat-rings-row">
              <StatRing label="G+C"    value={gcPct}    max={100} color="var(--cyan)"/>
              <StatRing label="A+T"    value={atPct}    max={100} color="var(--amber)"/>
              <StatRing label="Health" value={scorePct} max={100} color="var(--green)"/>
            </div>
          </div>

          <div className="hud-panel">
            <div className="hud-title"><BarChart3 size={12}/> Base Counts</div>
            {analysis ? (
              ['A','T','G','C'].map((b, i) => {
                const pct = Math.round(100 * analysis.counts[b] / analysis.seq.length);
                return (
                  <div key={b} className="hud-bar-row">
                    <span className="hud-bar-label" style={{ color: `var(--${b})` }}>
                      {b}
                    </span>
                    <div className="hud-bar-bg">
                      <div className="hud-bar-fill" style={{ width: pct + '%', background: `var(--${b})` }}/>
                    </div>
                    <span className="hud-bar-val">{pct}%</span>
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', padding: '12px 0' }}>
                Load a DNA sequence on the DNA tab<br/>to see base composition
              </div>
            )}
          </div>

          <div className="hud-panel">
            <div className="hud-title"><Dna size={12}/> Active Sequence</div>
            {analysis ? (
              <div className="hud-seq-preview">
                {analysis.seq.slice(0, 40).split('').map((b, i) => (
                  <span key={i} className={`base ${b}`} style={{ width: 13, height: 13, fontSize: 8 }}>{b}</span>
                ))}
                {analysis.seq.length > 40 && <span style={{ color: 'var(--text3)', fontSize: 10 }}>+{analysis.seq.length - 40} more</span>}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', padding: '8px 0' }}>No sequence loaded</div>
            )}
          </div>

          {/* On mobile stats tab — also show questionnaire link */}
          {twinAnswers && (
            <div className="hud-panel">
              <div className="hud-title"><ClipboardList size={12}/> Questionnaire Results</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 10 }}>
                Your health responses are ready. View your trajectory and levers.
              </div>
              <button className="seq-btn primary" onClick={onOpenHealthResults}>View Twin Health Results</button>
            </div>
          )}
          </>)}
          {avatarLeftTab === 'chat' && (
            <ChatPanel
              open={true}
              messages={messages} loading={chatLoading}
              suggestions={suggestions} onSend={handleSend}
              onClear={handleClearChat}
            />
          )}
        </div>

        <div className="avatar-center">
          <div className="avatar-title-badge">Tap a body region to explore its DNA story</div>
          <AvatarCanvas activeRegion={activeRegion} onRegionClick={(id) => {
            setActiveRegion(id);
            if (isMobile) setMobileTab('info');
          }}/>

        </div>

        <div className="avatar-hud-right">
          <div className="avatar-hud-right-panels">
            <div className="hud-panel region-info-card" style={{ borderColor: region.color }}>
              <div className="hud-title" style={{ color: region.color }}>
                <Ico icon={region.icon} size={12}/> {region.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, marginTop: 8 }}>
                {region.info}
              </div>
              <div className="region-stat-box" style={{ borderColor: region.color + '44' }}>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>Did you know?</span><br/>
                <span style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>{region.stat}</span>
              </div>
              <button className="seq-btn primary" style={{ marginTop: 12, fontSize: 11 }}
                onClick={() => { window._twinAsk && window._twinAsk(`Tell me about the ${region.label} gene`); }}>
                Ask TWIN about this
              </button>
            </div>

            {twinAnswers && !isMobile && (
              <div className="hud-panel">
                <div className="hud-title"><ClipboardList size={12}/> Questionnaire Results</div>
                <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 10 }}>
                  Your health responses are ready. Open the results dashboard to review trajectory and levers.
                </div>
                <button className="seq-btn primary" onClick={onOpenHealthResults}>View Twin Health Results</button>
              </div>
            )}

            <div className="hud-panel">
              <div className="hud-title"><UserRound size={12}/> Body Region Map</div>
              {BODY_REGIONS.map(r => (
                <div key={r.id}
                  className={`region-legend-row ${activeRegion === r.id ? 'active' : ''}`}
                  style={{ '--rc': r.color }}
                  onClick={() => { setActiveRegion(r.id); }}>
                  <span><Ico icon={r.icon} size={12}/></span>
                  <span style={{ flex: 1 }}>{r.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{r.gene}</span>
                </div>
              ))}
            </div>
          </div>


        </div>

        {/* Mobile tab bar — only visible on mobile via CSS */}
        <div className="avatar-mobile-tabs">
          {[
            { id: 'avatar', label: 'Avatar',  icon: UserRound },
            { id: 'stats',  label: 'DNA Stats', icon: BarChart3 },
            { id: 'info',   label: 'Region',  icon: Brain },
          ].map(t => (
            <button key={t.id}
              className={`avatar-tab-btn${mobileTab === t.id ? ' active' : ''}`}
              onClick={() => setMobileTab(t.id)}>
              <Ico icon={t.icon} size={18}/>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
/* ═══════════════════════════════════════════════════════════════ */
/*  APP ROOT                                                       */
/* ═══════════════════════════════════════════════════════════════ */
export default function App() {
  const [page,          setPage]          = useState('landing');
  const [loaded,        setLoaded]        = useState(false);
  const [leftOpen,      setLeftOpen]      = useState(true);
  const [rightOpen,     setRightOpen]     = useState(false);
  const [seqInput,      setSeqInput]      = useState('');
  const [analysis,      setAnalysis]      = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [chatLoading,   setChatLoading]   = useState(false);
  const [suggestions,   setSuggestions]   = useState(DEFAULT_SUGGESTIONS);
  const [twinAnswers,   setTwinAnswers]   = useState(null);
  const [avatarLeftTab, setAvatarLeftTab] = useState('stats');
  const [healthMsgs,    setHealthMsgs]    = useState([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthSuggs,   setHealthSuggs]   = useState(HEALTH_SUGGESTIONS);
  const [tooltip,       setTooltip]       = useState({ show: false, text: '', x: 0, y: 0 });
  const msgId = useRef(0);

  const addMsg = useCallback((role, content, typing = false, target = 'dna') => {
    const id = ++msgId.current;
    if (target === 'health') setHealthMsgs(prev => [...prev, { id, role, content, typing }]);
    else setMessages(prev => [...prev, { id, role, content, typing }]);
    return id;
  }, []);

  const resolveTyping = useCallback((id, content, target = 'dna') => {
    if (target === 'health') setHealthMsgs(prev => prev.map(m => m.id === id ? { ...m, content, typing: false } : m));
    else setMessages(prev => prev.map(m => m.id === id ? { ...m, content, typing: false } : m));
  }, []);

  useEffect(() => {
    const onMove = e => { setTooltip(t => t.show ? { ...t, x: e.clientX + 14, y: e.clientY - 10 } : t); };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  /* ── DNA Explorer chat ── */
  const handleSend = useCallback((text) => {
    setSuggestions([]);
    addMsg('user', text);
    setChatLoading(true);
    const resp  = generateResponse(text);
    const delay = Math.min(1400, 400 + resp.length * 0.4);
    const tid   = addMsg('ai', '', true);
    setTimeout(() => {
      resolveTyping(tid, resp);
      setChatLoading(false);
      setSuggestions(DEFAULT_SUGGESTIONS.filter(s => s.toLowerCase() !== text.toLowerCase()).slice(0, 3));
    }, delay);
  }, [addMsg, resolveTyping]);

  const handleClearChat = useCallback(() => {
    setMessages([]);
    addMsg('ai', 'Chat cleared. Ask me anything about DNA — no science knowledge needed.');
    setSuggestions(DEFAULT_SUGGESTIONS);
  }, [addMsg]);

  /* ── Twin Health chat ── */
  const handleHealthSend = useCallback((text) => {
    if (!twinAnswers) return;
    setHealthSuggs([]);
    addMsg('user', text, false, 'health');
    setHealthLoading(true);
    const lq     = text.toLowerCase();
    const score  = Math.round(computeCurrentScore(twinAnswers));
    const levers = getTopLevers(twinAnswers);
    const top    = levers[0];
    let resp;
    if (lq.includes('score') || lq.includes('number') || lq.includes('mean')) {
      resp = `Your health score of **${score}/100** reflects your current lifestyle balance.\n\n${score >= 75 ? 'This is a strong score.' : score >= 50 ? 'There is meaningful room for improvement.' : 'There are significant lifestyle factors to address.'}\n\nThe score combines sleep quality, stress, physical activity, and nutrition — all levers you control.`;
    } else if (lq.includes('sleep')) {
      const slp = parseFloat(twinAnswers.sleep);
      const gain = Math.round(projectTrajectory(twinAnswers, {key:'sleep',value:'8'})[5].score - projectTrajectory(twinAnswers)[5].score);
      resp = `You're getting **${slp} hrs/night** — ${slp >= 7 ? 'within healthy range' : 'below optimal'}.\n\nOptimal sleep is **7–9 hours**. During sleep your body:\n- Consolidates memories and clears brain waste\n- Repairs DNA damage from the day\n- Resets cortisol and immune function\n\n${slp < 7 ? `Improving to 7+ hours could add **+${gain} points** to your 5-year projection.` : 'Keep up the great sleep habits.'}`;
    } else if (lq.includes('stress')) {
      resp = `You reported **${twinAnswers.stress} stress** — ${twinAnswers.stress === 'low' ? 'excellent. Low stress is strongly protective.' : twinAnswers.stress === 'medium' ? 'manageable, but watch for drift toward chronic stress.' : 'chronic high stress significantly accelerates biological aging.'}\n\nCortisol directly shortens telomeres (cellular aging caps) and suppresses immune function.\n\n${twinAnswers.stress !== 'low' ? 'Meditation, prioritising sleep, and regular exercise are the most evidence-backed stress reducers.' : ''}`;
    } else if (lq.includes('activ') || lq.includes('exercise')) {
      const gain = Math.round(projectTrajectory(twinAnswers, {key:'activity',value:'active'})[5].score - projectTrajectory(twinAnswers)[5].score);
      resp = `Your activity level is **${twinAnswers.activity}**.\n\n${twinAnswers.activity === 'sedentary' || twinAnswers.activity === 'light' ? `Activity is likely your highest-impact lever. Just 150 min/week of brisk walking:\n- Reduces all-cause mortality risk by ~30%\n- Improves telomere length\n- Boosts cellular repair enzymes\n\nImproving to "active" could add **+${gain} points** to your 5-year score.` : 'Your activity level is already providing real health benefits. Consistency is what matters most.'}`;
    } else if (lq.includes('risk') || lq.includes('biggest') || lq.includes('concern')) {
      const gain = top ? Math.round(projectTrajectory(twinAnswers, {key:top.key,value:top.improve.value})[5].score - projectTrajectory(twinAnswers)[5].score) : 0;
      resp = `Your biggest modifiable risk factor right now is **${top?.label || 'optimising your lifestyle'}**.\n\n${top?.desc || 'Your overall profile looks balanced.'}\n\n${top ? `Improving your ${top.label.toLowerCase()} could add an estimated **+${gain} points** to your 5-year score.` : ''}`;
    } else if (lq.includes('improve') || lq.includes('better') || lq.includes('change') || lq.includes('most')) {
      resp = `Your **top improvement levers**, ranked by impact:\n\n${levers.map((l, i) => {
        const gain = Math.round(projectTrajectory(twinAnswers, {key:l.key,value:l.improve.value})[5].score - projectTrajectory(twinAnswers)[5].score);
        return `**${i+1}. ${l.label}** (+${gain} pts) — ${l.desc}`;
      }).join('\n\n')}\n\nClick any lever card above to see its impact on your trajectory!`;
    } else if (lq.includes('trajectory') || lq.includes('future') || lq.includes('project') || lq.includes('5 year') || lq.includes('5yr')) {
      const b5 = Math.round(projectTrajectory(twinAnswers)[5].score);
      const i5 = top ? Math.round(projectTrajectory(twinAnswers, {key:top.key,value:top.improve.value})[5].score) : null;
      resp = `Your **5-year baseline** puts you at **${b5}/100** without any changes.\n\n${i5 ? `But improving your **${top.label.toLowerCase()}** alone could bring that to **${i5}/100** — a +${i5-b5} point difference from a single behaviour change.\n\nThat's the power of compound lifestyle effects over time.` : 'Keep maintaining your healthy habits to stay on this trajectory!'}`;
    } else if (lq.includes('dna') || lq.includes('gene') || lq.includes('genetic')) {
      resp = `Great question. Your lifestyle profile is one dimension of health. Genetics adds another.\n\nIn the **DNA Explorer** (header above), you can:\n- Paste a DNA sequence and see it as a live 3D helix\n- Analyse mutations with real Evo2 AI\n- Explore gene activity across body regions\n\nYour lifestyle score + genetic profile = the most complete picture.`;
    } else {
      resp = generateResponse(text);
    }
    const tid = addMsg('ai', '', true, 'health');
    setTimeout(() => {
      resolveTyping(tid, resp, 'health');
      setHealthLoading(false);
      setHealthSuggs(HEALTH_SUGGESTIONS.filter(s => s.toLowerCase() !== text.toLowerCase()).slice(0, 3));
    }, Math.min(1600, 500 + resp.length * 0.4));
  }, [twinAnswers, addMsg, resolveTyping]);

  const handleClearHealth = useCallback(() => {
    setHealthMsgs([]);
    if (twinAnswers) {
      const score = Math.round(computeCurrentScore(twinAnswers));
      addMsg('ai', `Chat cleared! Health score: **${score}/100**. Ask me anything about your results.`, false, 'health');
    }
    setHealthSuggs(HEALTH_SUGGESTIONS);
  }, [addMsg, twinAnswers]);

  /* ── Questionnaire complete ── */
  const handleQComplete = useCallback((answers) => {
    setTwinAnswers(answers);
    setPage('avatar');
    const score  = Math.round(computeCurrentScore(answers));
    const levers = getTopLevers(answers);
    const top    = levers[0];
    setTimeout(() => {
      addMsg('ai',
        `Your Twin Health profile is ready.\n\n**Health score: ${score}/100**\n\n${top ? `Your biggest opportunity: **${top.label}** — ${top.desc}` : 'Your lifestyle looks well-balanced.'}\n\nAsk me anything about your results, projections, or how to improve.`,
        false, 'health'
      );
      setHealthSuggs(HEALTH_SUGGESTIONS);
    }, 300);
  }, [addMsg]);

  /* ── Navigation ── */
  const navigate = useCallback((target) => {
    if (target === 'twin' && !twinAnswers) { setPage('questionnaire'); return; }
    setPage(target);
  }, [twinAnswers]);

  useEffect(() => {
    window._twinAsk = (q) => {
      if (page === 'explorer') { if (!rightOpen) { setRightOpen(true); setLeftOpen(false); } handleSend(q); }
      else if (page === 'avatar') { setAvatarLeftTab('chat'); handleSend(q); }
      else if (page === 'twin') handleHealthSend(q);
    };
    return () => { window._twinAsk = null; };
  }, [handleSend, handleHealthSend, rightOpen, page]);

  /* Boot */
  useEffect(() => {
    setTimeout(() => setLoaded(true), 600);
    const isMob = window.innerWidth <= 768;
    addMsg('ai', isMob
      ? `Welcome to **TWIN** — your personal DNA explorer.\n\nNo science background needed.\n\n**Get started:**\n- Tap **DNA Code** to paste a sequence\n- Use the **bottom nav** to explore all features\n- Tap **Ask TWIN** to chat about your DNA`
      : `Welcome to **TWIN** — your personal DNA explorer.\n\nNo science background needed.\n\n**Get started:**\n- **Drag** the 3D spiral to spin it\n- **Click a Famous Snippet** on the left\n- **Open Avatar Lab** to see DNA in your body\n- **Ask me anything** below`
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sharedState = {
    loaded, leftOpen, setLeftOpen, rightOpen, setRightOpen,
    seqInput, setSeqInput, analysis, setAnalysis,
    messages, chatLoading, suggestions, setSuggestions,
    tooltip, setTooltip, addMsg, resolveTyping, handleSend, handleClearChat,
    avatarLeftTab, setAvatarLeftTab,
  };

  /* Header extras per page */
  const headerExtras = (
    <>
      {page === 'explorer' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {analysis && (
            <div style={{ display: 'flex', gap: 6 }} className="explorer-stat-pills">
              <div className="stat-pill"><span className="stat-dot" style={{ background: 'var(--green)' }}/>{analysis.seq.length} bp</div>
              <div className="stat-pill"><span className="stat-dot" style={{ background: 'var(--cyan)' }}/>{gcContent(analysis.seq)}% GC</div>
            </div>
          )}
          {/* Desktop-only toggle buttons — mobile uses FABs */}
          <div className="header-btns explorer-desktop-btns">
            <button className={`hbtn ${leftOpen ? 'active' : ''}`} onClick={() => { const next = !leftOpen; setLeftOpen(next); if (next) setRightOpen(false); }}>DNA Code</button>
            <button className={`hbtn ${rightOpen ? 'active' : ''}`} onClick={() => { const next = !rightOpen; setRightOpen(next); if (next) setLeftOpen(false); }}>Ask TWIN</button>
          </div>
        </div>
      )}
      {page === 'avatar' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {analysis && (
            <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{analysis.seq.length} bp · {analysis.score.toFixed(2)}</span>
          )}
          <div className="header-btns">
            <button className={'hbtn '+(avatarLeftTab === 'stats' ? 'active' : '')} onClick={() => setAvatarLeftTab('stats')}>DNA Stats</button>
            <button className={'hbtn '+(avatarLeftTab === 'chat' ? 'active' : '')} onClick={() => setAvatarLeftTab('chat')}>Ask TWIN</button>
          </div>
        </div>
      )}
      {page === 'twin' && twinAnswers && (
        <span style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
          {Math.round(computeCurrentScore(twinAnswers))}/100
        </span>
      )}
    </>
  );

  return (
    <div className="app-root">
      <GlobalHeader page={page} onNavigate={navigate} extras={headerExtras}/>
      <div className={`app-content ${['landing','questionnaire','twin'].includes(page) ? 'scrollable' : ''}`}>
        {page === 'landing'        && <LandingPage onNavigate={navigate}/>}
        {page === 'questionnaire'  && <QuestionnairePage onComplete={handleQComplete}/>}
        {page === 'twin' && twinAnswers && (
          <TwinHealthPage
            answers={twinAnswers}
            onReset={() => setPage('questionnaire')}
            twinChat={
              <ChatPanel compact={true}
                open={true} messages={healthMsgs} loading={healthLoading}
                suggestions={healthSuggs} onSend={handleHealthSend} onClear={handleClearHealth}
              />
            }
          />
        )}
        {page === 'explorer' && <ExplorerPage sharedState={sharedState}/>}
        {page === 'avatar'   && (
          <AvatarPage
            sharedState={sharedState}
            twinAnswers={twinAnswers}
            onOpenHealthResults={() => setPage('twin')}
          />
        )}
      </div>
      <MobileNav page={page} onNavigate={navigate}/>
    </div>
  );
}

