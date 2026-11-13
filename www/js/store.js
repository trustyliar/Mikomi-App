// On-device state, spaced repetition and plan gating.
const KEY = 'mikomi.v1';
const DEF = { onboarded:false, name:'', start:'kana', lang:'hi', exam:'Jul 2027', passes:[], pro:false, srs:{}, streak:0, lastDay:null };
let saved = null;
try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
export const S = Object.assign({}, DEF, saved || {});
export function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
export function reset(){ Object.assign(S, JSON.parse(JSON.stringify(DEF))); save(); }

export const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset()*6e4) / 864e5);
const GAP = [0,1,2,4,7,15,30]; // days until next review, by box
export const seen = id => !!S.srs[id];
export const box = id => S.srs[id] ? S.srs[id].b : 0;
export const isDue = id => seen(id) && S.srs[id].d <= today();
export function grade(id, ok){
  const b = ok ? Math.min(6, box(id) + 1) : 1;
  S.srs[id] = { b, d: today() + (ok ? GAP[b] : 0) }; save();
}
export function markStudy(){
  const t = today(); if (S.lastDay === t) return;
  S.streak = S.lastDay === t - 1 ? S.streak + 1 : 1; S.lastDay = t; save();
}
export const liveStreak = () => (S.lastDay !== null && S.lastDay >= today() - 1) ? S.streak : 0;

// What the free tier includes. Everything else needs an Exam Pass for that level, or Pro.
const FREE = { n5: 5, n4: 1 };
export function can(level, unit){
  if (level === 'kana') return true;
  return S.pro || S.passes.includes(level) || unit <= FREE[level];
}
export function canMock(level, n){ return S.pro || S.passes.includes(level) || n === 1; }
