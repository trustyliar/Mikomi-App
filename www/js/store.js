// On-device state, spaced repetition and plan gating.
const KEY = 'mikomi.v1';
const DEF = () => ({ onboarded:false, name:'', start:'kana', lang:'hi', exam:'Jul 2027', passes:[], pro:false, srs:{}, tests:{}, mocks:[], best:{}, fails:{}, newDay:null, newN:0, xp:0, xpDay:null, xpToday:0, goal:30, freezes:1, streak:0, lastDay:null });
let saved = null;
try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
export const S = Object.assign(DEF(), saved || {});
export function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
export function reset(){ Object.assign(S, DEF()); save(); }

export const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset()*6e4) / 864e5);
const GAP = [0,1,2,4,7,15,30]; // days until next review, by box
export const seen = id => !!S.srs[id];
export const box = id => S.srs[id] ? S.srs[id].b : 0;
export const isDue = id => seen(id) && S.srs[id].d <= today();
export function grade(id, ok){
  if (!S.srs[id]) { const t = today(); if (S.newDay !== t) { S.newDay = t; S.newN = 0; } S.newN++; }
  const b = ok ? Math.min(6, box(id) + 1) : 1;
  S.srs[id] = { b, d: today() + (ok ? GAP[b] : 0) }; save();
}
// A streak freeze covers one missed day. Learners start with one and earn another every 7-day streak (2 at most).
export function markStudy(){
  const t = today(); if (S.lastDay === t) return;
  if (S.lastDay === t - 1) S.streak++;
  else if (S.lastDay === t - 2 && S.freezes > 0) { S.freezes--; S.streak++; }
  else S.streak = 1;
  if (S.streak % 7 === 0 && S.freezes < 2) S.freezes++;
  S.lastDay = t; save();
}
export const liveStreak = () => { if (S.lastDay === null) return 0; const gap = today() - S.lastDay; return gap <= 1 || (gap === 2 && S.freezes > 0) ? S.streak : 0; };
export function addXp(n){ const t = today(); if (S.xpDay !== t) { S.xpDay = t; S.xpToday = 0; } S.xpToday += n; S.xp += n; save(); }
export const xpToday = () => S.xpDay === today() ? S.xpToday : 0;

// What the free tier includes. Everything else needs an Exam Pass for that level, or Pro.
const FREE = { n5: 5, n4: 1 };
export function can(level, unit){
  if (level === 'kana') return true;
  return S.pro || S.passes.includes(level) || unit <= FREE[level];
}
export function canMock(level, n){ return S.pro || S.passes.includes(level) || n === 1; }
export const newToday = () => S.newDay === today() ? S.newN : 0;
