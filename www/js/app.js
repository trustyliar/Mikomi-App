import { S, save, reset, seen, box, isDue, grade, markStudy, liveStreak, can, canMock, today } from './store.js';
import { READ } from './read.js';
import { KANA, KROWS, UNITS, deva } from './data.js';
import { N5W, N5K } from './n5.js';
import { N4W, N4K } from './n4.js';
import { G5 } from './g5.js';
import { G4 } from './g4.js';

KANA.forEach(k => k.kind = 'kana');
// Every word, kanji and grammar point carries its level (lv: 'n5' or 'n4') and unit number.
const WORDS = [], KANJI = [], GRAM = [];
for (const [n, W, K, G] of [[5, N5W, N5K, G5], [4, N4W, N4K, G4]]) {
  const lv = 'n' + n;
  W.forEach((w, i) => WORDS.push({ id:`w${n}:${i}`, ch:w[0], rd:w[1], en:w[2], hi:w[3], unit:w[4], kind:'w', lv }));
  K.forEach(k => KANJI.push({ id:`k${n}:${k[0]}`, ch:k[0], rd:[k[1],k[2]].filter(Boolean).join(' · '), en:k[3], hi:k[4], unit:k[5], kind:'k', lv }));
  let u = 0, c = 0;
  for (const line of G.trim().split('\n')) {
    if (line[0] === '@') { u = +line.slice(1); c = 0; continue; }
    const [p, hi, en, ex, tr, q, o] = line.split(' # ');
    const tok = ex.split(' ').map(t => { const [j, h] = t.split('='); return [j.replace('*', '').replace(/_/g, ' '), h.replace(/_/g, ' '), j.includes('*')]; });
    GRAM.push({ id:`g${n}:${u}.${++c}`, kind:'g', lv, unit:u, ch:p, hi, en, tok, tr, q, opts:o.split(','), jp:tok.map(t => t[0]).join('') });
  }
}
const ALL = [...KANA, ...WORDS, ...KANJI, ...GRAM];
const unitItems = (lv, n) => { const f = x => x.lv === lv && x.unit === n; return { w: WORDS.filter(f), k: KANJI.filter(f), g: GRAM.filter(f) }; };
const passed = (lv, n) => (S.tests[lv + ':' + n] || 0) >= 70;

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; };
const TABS = [['today','今日','Today'],['learn','学ぶ','Learn'],['mock','試験','Mock'],['me','私','Me']];
const U = { tab:'today', view:null, script:'h' };   // view: null (tab) or 'kana'
const sound = it => S.lang === 'hi' ? `${deva(it.ro)} <small>${it.ro}</small>` : `${it.ro} <small>${deva(it.ro)}</small>`;

const ans = it => it.kind === 'kana' ? sound(it) : S.lang === 'hi' ? `${it.hi} <small>${it.en}</small>` : `${it.en} <small>${it.hi}</small>`;
const key = it => it.kind === 'kana' ? it.ro : it.en;
const len = it => [...it.ch].length;
const sz = it => len(it) === 1 ? '' : len(it) <= 3 ? 'w1' : 'w2';
const rdline = it => it.rd && it.rd !== it.ch ? `<p class="center muted rd">${it.rd}</p>` : '';
const say = it => (it.rd || it.ch).split(' · ')[0].replace(/[-.～]/g, '');

/* ---------- derived progress ---------- */
const kanaStats = s => { const a = KANA.filter(k => k.script === s); return { n:a.length, seen:a.filter(k => seen(k.id)).length, strong:a.filter(k => box(k.id) >= 3).length }; };
const dueAll = () => ALL.filter(k => isDue(k.id)).slice(0, 20);
// What to learn next: a kana row, a set of new N5 words or kanji, or a locked unit.
function nextStep(){
  if (S.start === 'kana') { const r = nextRow(); if (r) return { kind:'row', ...r }; }
  for (const lv of (S.start === 'n4' ? ['n4'] : ['n5', 'n4'])) for (let n = 1; n <= UNITS[lv].length; n++) {
    const u = unitItems(lv, n), un = a => a.filter(x => !seen(x.id)), w = un(u.w), k = un(u.k), g = un(u.g);
    if (!w.length && !k.length && !g.length && passed(lv, n)) continue;
    if (!can(lv, n)) return { kind:'lock', lv, n };
    // Order inside a unit: first words, then grammar, the rest of the words, kanji, and the unit test.
    if (w.length && (u.w.length - w.length < 6 || !g.length)) return { kind:'set', lv, n, items:w.slice(0, 6), what:'words' };
    if (g.length) return { kind:'set', lv, n, items:g, what:g.length === 1 ? 'grammar point' : 'grammar points' };
    if (k.length) return { kind:'set', lv, n, items:k, what:'kanji' };
    return { kind:'test', lv, n };
  }
  return null;
}
function nextRow(){ for (const s of ['h','k']) for (const r of KROWS[s]) if (r.items.some(k => !seen(k.id))) return { s, r }; return null; }

/* ---------- mock exams and the Mikomi Score ---------- */
const PASS = { n5:80, n4:90 }, MOCKS = { n5:6, n4:8 }, MINS = { n5:35, n4:40 };
// Pass chance from the last three mocks (recent ones weigh more), cut down when a section is near or under its cut-off.
function mikomi(lv){
  const m = S.mocks.filter(x => x.lv === lv).slice(-3); if (!m.length) return null;
  let w = 0, t = 0, la = 0, li = 0; m.forEach((x, i) => { const k = i + 1; w += k; t += x.total * k; la += x.lang * k; li += x.lis * k; });
  t /= w; la /= w; li /= w;
  let p = 1 / (1 + Math.exp(-(t - PASS[lv]) / 15)); if (la < 38 || li < 19) p *= .5; else if (la < 48 || li < 24) p *= .85;
  return { pct:Math.round(p * 100), total:Math.round(t), lang:Math.round(la), lis:Math.round(li), n:m.length };
}
function scoreCard(){
  const last = S.mocks[S.mocks.length - 1], lv = last ? last.lv : S.start === 'n4' ? 'n4' : 'n5', LV = lv.toUpperCase(), m = mikomi(lv);
  const items = ALL.filter(x => x.lv === lv), cov = Math.round(items.filter(x => seen(x.id)).length / items.length * 100);
  if (!m) return `<div class="card"><p class="eyebrow">Mikomi Score</p><b>Take a mock exam to see your pass chance</b><p class="muted">${cov}% of the ${LV} syllabus learned so far.</p><button class="btn ghost" data-tab="mock">Go to mock exams</button></div>`;
  const weak = m.lis / 60 < m.lang / 120 ? `Listening (${m.lis} / 60, cut-off 19)` : `Language and reading (${m.lang} / 120, cut-off 38)`;
  return `<div class="card"><p class="eyebrow">Mikomi Score · ${LV}</p><div style="display:flex;align-items:baseline;gap:10px"><span class="price" style="font-size:44px;color:${m.pct >= 60 ? 'var(--good)' : 'var(--shu)'}">${m.pct}%</span><b>pass chance</b></div>
    <p class="muted">Projected ${m.total} / 180 from your last ${m.n === 1 ? 'mock' : m.n + ' mocks'}. Pass mark ${PASS[lv]}. Weakest: ${weak}. ${cov}% of the syllabus learned.</p></div>`;
}
function rng(a){ return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// Mock n of a level is always the same paper: questions are drawn from the content bank with a fixed seed.
function buildMock(lv, n){
  const r = rng((lv === 'n5' ? 500 : 400) + n), sh = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const W = WORDS.filter(x => x.lv === lv), G = sh(GRAM.filter(x => x.lv === lv)), mean = x => S.lang === 'hi' ? `${x.hi} · ${x.en}` : `${x.en} · ${x.hi}`;
  const pick = (pool, txt, f) => { const o = []; for (const x of sh(pool)) { const t = f(x); if (t !== txt && !o.includes(t)) o.push(t); if (o.length === 3) break; } return sh([{ t:txt, ok:true }, ...o.map(t => ({ t, ok:false }))]); };
  const tag = t => `<span class="pill" style="align-self:center">${t}</span>`, play = s => `<button class="btn dark" data-say="${s}" style="width:auto;align-self:center">▶ Play</button>`;
  const wk = sh(W.filter(x => x.rd !== x.ch && /[一-龯]/.test(x.ch) && !/[～(]/.test(x.ch))), wm = sh(W.filter(x => !/[～(]/.test(x.ch))), q = [];
  wk.slice(0, 8).forEach(x => q.push({ sec:'v', txt:x.ch, prompt:`${tag('Vocabulary')}<p class="big ${sz(x)}">${x.ch}</p><p class="muted center">Choose the reading</p>`, opts:pick(wk, x.rd, y => y.rd) }));
  wm.slice(0, 8).forEach(x => q.push({ sec:'v', txt:x.ch, one:true, prompt:`${tag('Vocabulary')}<p class="big ${sz(x)}">${x.ch}</p>${rdline(x)}<p class="muted center">Choose the meaning</p>`, opts:pick(W, mean(x), mean) }));
  wm.slice(8, 12).forEach(x => q.push({ sec:'v', txt:mean(x), prompt:`${tag('Vocabulary')}<p class="mid">${mean(x)}</p><p class="muted center">Choose the word</p>`, opts:pick(wm, x.ch, y => y.ch) }));
  G.slice(0, 15).forEach(g => q.push({ sec:'g', txt:g.q, prompt:`${tag('Grammar')}<p class="mid gq">${g.q.replace('＿', '<u>＿＿</u>')}</p><p class="muted center">Fill the blank</p>`, opts:sh(g.opts.map((t, i) => ({ t, ok:i === 0 }))) }));
  sh(READ[lv]).slice(0, 2).forEach(p => p.q.forEach(([t, ...o]) => q.push({ sec:'r', txt:t, one:true, prompt:`${tag('Reading')}<div class="card passage">${p.t}</div><p><b>${t}</b></p>`, opts:sh(o.map((x, i) => ({ t:x, ok:i === 0 }))) })));
  G.slice(15, 21).forEach(g => q.push({ sec:'l', txt:g.jp, one:true, prompt:`${tag('Listening')}${play(g.jp)}<p class="muted center">Listen. What does it mean?</p>`, opts:pick(G, g.tr, y => y.tr) }));
  wm.slice(20, 24).forEach(x => q.push({ sec:'l', txt:`${x.ch} (${x.rd})`, one:true, prompt:`${tag('Listening')}${play(say(x))}<p class="muted center">Listen. Which word did you hear?</p>`, opts:pick(W, mean(x), mean) }));
  return q.map(x => ({ ...x, custom:true, picked:null }));
}
let tick = null;
const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
function startMock(lv, n){
  L = { phase:'quiz', exam:true, lv, n, title:'Mock', qs:buildMock(lv, n), i:0, left:MINS[lv] * 60 };
  clearInterval(tick); tick = setInterval(() => { L.left--; const c = $('#clock'); if (c) c.textContent = fmt(L.left); if (L.left <= 0) finishExam(); }, 1000);
  draw();
}
function finishExam(){
  clearInterval(tick);
  const sc = s => L.qs.filter(q => q.sec === s), ok = a => a.filter(q => q.picked !== null && q.opts[q.picked].ok).length;
  const lr = [...sc('v'), ...sc('g'), ...sc('r')], li = sc('l'), lang = Math.round(ok(lr) / lr.length * 120), lis = Math.round(ok(li) / li.length * 60), total = lang + lis;
  L.res = { lv:L.lv, n:L.n, lang, lis, total, pass:total >= PASS[L.lv] && lang >= 38 && lis >= 19, parts:['v','g','r','l'].map(s => `${ok(sc(s))}/${sc(s).length}`) };
  S.mocks.push({ lv:L.lv, n:L.n, lang, lis, total, day:today() }); save(); markStudy(); L.phase = 'result'; draw(); render();
}
function resultView(){
  const r = L.res, wrong = L.qs.filter(q => q.picked === null || !q.opts[q.picked].ok);
  const bar = (name, v, max, min) => `<div><div style="display:flex;justify-content:space-between"><b>${name}</b><span>${v} / ${max}</span></div><div class="meter"><u style="width:${v / max * 100}%;background:${v >= min ? 'var(--good)' : 'var(--shu)'}"></u></div><p class="muted">Section minimum ${min}${v >= min ? '' : '. Below the cut-off.'}</p></div>`;
  return `<header><button class="x" data-act="close" aria-label="Close">✕</button><b>${r.lv.toUpperCase()} Mock ${r.n}</b></header>
    <p class="center"><span class="pill ${r.pass ? 'ok' : 'pro'}">${r.pass ? 'Pass' : 'Not a pass yet'}</span></p>
    <p class="big" style="font-size:64px">${r.total}<small style="font-size:22px"> / 180</small></p>
    <p class="muted center">Pass mark ${PASS[r.lv]}. This is an estimate: the real JLPT scales marks differently.</p>
    <div class="card">${bar('Language knowledge and reading', r.lang, 120, 38)}${bar('Listening', r.lis, 60, 19)}<p class="muted">Vocabulary ${r.parts[0]} · Grammar ${r.parts[1]} · Reading ${r.parts[2]} · Listening ${r.parts[3]}</p></div>
    <div class="card"><p class="eyebrow">${wrong.length ? `Review your ${wrong.length} mistakes` : 'No mistakes'}</p><div class="list">${wrong.map(q => `<div class="item"><div><b>${q.txt}</b><span class="muted">${q.opts.find(o => o.ok).t}</span></div></div>`).join('')}</div></div>
    <button class="btn" data-act="close">Done</button>`;
}

/* ---------- screens ---------- */
const V = {
  onboard(){
    return `<div style="padding-top:20px"><p class="eyebrow">Mikomi Institute</p><h1>Mikomi <span>見込み</span></h1><p class="muted">Pass JLPT N5 and N4, explained the way Hindi speakers think.</p></div>
    <div class="card">
      <div class="field"><label for="name">Your name</label><input id="name" autocomplete="given-name" placeholder="e.g. Riya" value="${esc(S.name)}"></div>
      <div class="field"><span class="lab">Where are you starting?</span><div class="seg">
        ${[['kana','New to Japanese'],['n5','I know kana'],['n4','Preparing N4']].map(([v,t]) => `<button data-set="start:${v}" aria-pressed="${S.start===v}">${t}</button>`).join('')}</div></div>
      <div class="field"><span class="lab">Explain things in</span><div class="seg">
        <button data-set="lang:hi" aria-pressed="${S.lang==='hi'}">हिंदी</button><button data-set="lang:en" aria-pressed="${S.lang==='en'}">English</button></div></div>
      <div class="field"><span class="lab">Target exam</span><div class="seg">
        ${['Dec 2026','Jul 2027','Dec 2027'].map(v => `<button data-set="exam:${v}" aria-pressed="${S.exam===v}">${v}</button>`).join('')}</div></div>
    </div>
    <button class="btn" data-act="begin">Start learning</button>
    <button class="btn ghost" disabled>Sign in with Google (coming soon)</button>
    <p class="muted center">Your progress is saved on this phone for now.</p>`;
  },
  today(){
    const due = dueAll(), st = nextStep(), learned = ALL.filter(k => seen(k.id)).length;
    let nt, ns, nb;
    if (!st) { nt = 'Every unit is complete. お疲れさま！'; ns = 'Keep up your reviews until exam day.'; nb = ''; }
    else if (st.kind === 'row') { nt = `New row: ${st.r.items.map(i => i.ch).join(' ')}`; ns = `${st.s === 'h' ? 'Hiragana' : 'Katakana'}, about 3 minutes.`; nb = `<button class="btn" data-act="row:${st.s}:${st.r.name}">Learn this row</button>`; }
    else if (st.kind === 'set') { nt = `${st.lv.toUpperCase()} Unit ${st.n}: ${st.items.length} new ${st.what}`; ns = st.items.map(i => i.ch).join('、'); nb = `<button class="btn" data-act="next">Learn these</button>`; }
    else if (st.kind === 'test') { nt = `${st.lv.toUpperCase()} Unit ${st.n}: unit test`; ns = '10 questions on this unit. 70% to pass.'; nb = `<button class="btn" data-act="test:${st.lv}:${st.n}">Take the test</button>`; }
    else { nt = `Unit ${st.n} needs the ${st.lv.toUpperCase()} Exam Pass`; ns = 'You have finished the free units.'; nb = `<button class="btn" data-act="lock:${st.lv}">See what it unlocks</button>`; }
    let title = nt, sub = ns, btn = nb;
    if (due.length) { title = `${due.length} ${due.length === 1 ? 'item' : 'items'} ready for review`; sub = 'Reviewing just before you forget is what makes them stick.'; btn = `<button class="btn" data-act="review">Start review</button>${st && st.kind !== 'lock' ? `<p class="muted">Then: ${nt}</p>${nb.replace('class="btn"','class="btn ghost" style="color:#fff;border-color:#8fa0ff"')}` : ''}`; }
    return `<div><p class="eyebrow">Target ${esc(S.exam)}</p><h3>こんにちは、${esc(S.name || 'がくせい')}さん</h3></div>
    <div class="hero"><p class="eyebrow">Today</p><h3>${title}</h3><p class="muted">${sub}</p>${btn}</div>
    <div class="stats"><div><b>${liveStreak()}</b><span>day streak</span></div><div><b>${learned}</b><span>items learned</span></div><div><b>${due.length}</b><span>reviews due</span></div></div>
    ${scoreCard()}`;
  },
  learn(){
    const h = kanaStats('h'), k = kanaStats('k'), pct = Math.round((h.seen + k.seen) / (h.n + k.n) * 100);
    const course = lv => `<div class="card"><p class="eyebrow">JLPT ${lv.toUpperCase()} · ${UNITS[lv].length} units</p><div class="list">
      ${UNITS[lv].map(([t,g],i) => { const ok = can(lv, i+1); return `<button class="item" data-act="${!ok ? 'lock:'+lv : 'unit:'+lv+':'+(i+1)}"><span class="k">${i+1}</span><div><b>${t}</b><span class="muted">${g}</span></div><span class="pill ${!ok ? 'pro' : passed(lv, i+1) ? 'ok' : ''}">${!ok ? (lv==='n5' ? 'N5 Pass' : 'N4 Pass') : passed(lv, i+1) ? 'Passed' : 'Open'}</span></button>`; }).join('')}
    </div></div>`;
    return `<div><p class="eyebrow">Courses</p><h3>Kana first, then N5, then N4</h3></div>
    <button class="card" data-act="kana" style="text-align:left"><p class="eyebrow">Step 1 · Free</p><h3>Hiragana and Katakana</h3><div class="meter"><u style="width:${pct}%"></u></div><p class="muted">${h.seen} of ${h.n} hiragana · ${k.seen} of ${k.n} katakana learned</p></button>
    ${course('n5')}${course('n4')}`;
  },
  unit(){
    const n = U.unit, lv = U.lv, [t, g] = UNITS[lv][n-1], u = unitItems(lv, n), nw = u.w.filter(x => !seen(x.id)).length, nk = u.k.filter(x => !seen(x.id)).length;
    const row = it => `<button class="item" data-say="${say(it)}"><span class="k">${it.kind === 'k' ? it.ch : seen(it.id) ? '✓' : '·'}</span><div><b>${it.ch}${it.rd && it.rd !== it.ch ? ` <span class="muted">${it.rd}</span>` : ''}</b><span class="muted">${S.lang === 'hi' ? it.hi : it.en}</span></div></button>`;
    return `<header style="display:flex;align-items:center;gap:8px"><button class="x" data-act="back" aria-label="Back" style="font-size:22px">←</button><h3>${lv.toUpperCase()} Unit ${n}</h3></header>
    <div class="card"><b>${t}</b><p class="muted">${g}</p>
      <button class="btn" data-act="ug">${u.g.some(x => !seen(x.id)) ? `Learn grammar (${u.g.length} points)` : 'Revise grammar'}</button>
      <button class="btn" data-act="uw" ${nw ? '' : 'disabled'}>${nw ? `Learn ${Math.min(6, nw)} new words` : 'All words learned'}</button>
      <button class="btn dark" data-act="uk" ${nk ? '' : 'disabled'}>${nk ? `Learn ${nk} new kanji` : 'All kanji learned'}</button>
      <button class="btn ghost" data-act="ur">Quiz me on words and kanji</button>
      <button class="btn ghost" data-act="test:${lv}:${n}">Unit test${S.tests[lv+':'+n] !== undefined ? ` · best ${S.tests[lv+':'+n]}%` : ''}</button></div>
    <div class="card"><p class="eyebrow">Grammar</p><div class="list">${u.g.map(x => `<div class="item"><span class="k">${seen(x.id) ? '✓' : '文'}</span><div><b>${x.ch}</b><span class="muted">${S.lang === 'hi' ? x.hi : x.en}</span></div></div>`).join('')}</div></div>
    <div class="card"><p class="eyebrow">Kanji · ${u.k.length - nk} of ${u.k.length} learned</p><div class="list">${u.k.map(row).join('')}</div></div>
    <div class="card"><p class="eyebrow">Words · ${u.w.length - nw} of ${u.w.length} learned · tap to hear</p><div class="list">${u.w.map(row).join('')}</div></div>`;
  },
  kana(){
    const s = U.script, st = kanaStats(s);
    return `<header style="display:flex;align-items:center;gap:8px"><button class="x" data-act="back" aria-label="Back" style="font-size:22px">←</button><h3>${s === 'h' ? 'Hiragana' : 'Katakana'}</h3></header>
    <div class="seg"><button data-script="h" aria-pressed="${s==='h'}">ひらがな</button><button data-script="k" aria-pressed="${s==='k'}">カタカナ</button></div>
    <p class="muted">${st.seen} of ${st.n} learned · ${st.strong} strong. Each sound is shown in ${S.lang === 'hi' ? 'Devanagari' : 'romaji'} underneath.</p>
    <div class="card" style="gap:0">${KROWS[s].map(r => `<div class="krow">
      ${[0,1,2,3,4].map(i => { const it = r.items[i]; if (!it) return '<span></span>'; const c = box(it.id) >= 3 ? 's2' : seen(it.id) ? 's1' : ''; return `<button class="kc ${c}" data-say="${it.ch}"><b>${it.ch}</b><span>${S.lang === 'hi' ? deva(it.ro) : it.ro}</span></button>`; }).join('')}
      <button class="kgo" data-act="row:${s}:${r.name}">${r.items.every(k => seen(k.id)) ? 'Redo' : 'Learn'}</button></div>`).join('')}</div>
    <button class="btn dark" data-act="quizall">Quiz me on what I know</button>`;
  },
  mock(){
    const list = lv => `<div class="card"><p class="eyebrow">JLPT ${lv.toUpperCase()} · pass mark ${PASS[lv]} / 180</p><div class="list">${Array.from({ length:MOCKS[lv] }, (_, i) => {
      const n = i + 1, ok = canMock(lv, n), done = S.mocks.filter(x => x.lv === lv && x.n === n), best = Math.max(...done.map(x => x.total));
      return `<button class="item" data-act="${ok ? `mock:${lv}:${n}` : 'lock:' + lv}"><span class="k">試</span><div><b>${lv.toUpperCase()} Mock ${n}</b><span class="muted">${done.length ? `Best ${best} / 180 · taken ${done.length} ${done.length === 1 ? 'time' : 'times'}` : `49 questions · ${MINS[lv]} minutes`}</span></div><span class="pill ${!ok ? 'pro' : done.length && best >= PASS[lv] ? 'ok' : ''}">${!ok ? lv.toUpperCase() + ' Pass' : done.length ? best : n === 1 ? 'Free' : 'Open'}</span></button>`; }).join('')}</div></div>`;
    return `<div><p class="eyebrow">Mock exams</p><h3>Sit the paper before the paper</h3><p class="muted">Vocabulary, grammar, reading and listening against the clock, scored out of 180 with both section cut-offs. No answers are shown until the end.</p></div>
    ${scoreCard()}${list('n5')}${list('n4')}`;
  },
  me(){
    const has = lv => S.pro || S.passes.includes(lv);
    return `<div><p class="eyebrow">Profile</p><h3>${esc(S.name || 'Learner')}</h3><p class="muted">${S.pro ? 'Pro plan' : S.passes.length ? S.passes.map(p => p.toUpperCase()+' Exam Pass').join(' + ') : 'Free plan'} · target ${esc(S.exam)}</p></div>
    <div class="card"><div class="field"><span class="lab">Explain things in</span><div class="seg"><button data-set="lang:hi" aria-pressed="${S.lang==='hi'}">हिंदी</button><button data-set="lang:en" aria-pressed="${S.lang==='en'}">English</button></div></div>
      <button class="btn ghost" disabled>Sign in with Google (coming soon)</button></div>
    <div class="plan ${has('n5') && has('n4') ? '' : 'best'}"><b>Exam Pass</b><div class="price">₹499 <small>per level, valid until exam day</small></div><p class="muted">Every lesson and mock for one level, the Mikomi Score and weak-area drills.</p>
      <button class="btn" data-act="pay">Get an Exam Pass</button></div>
    <div class="plan"><b>Pro</b><div class="price">₹199 <small>a month, or ₹1,499 a year</small></div><p class="muted">N5 and N4 together, plus everything added later.</p><button class="btn dark" data-act="pay">Start Pro</button></div>
    <div class="card"><p class="eyebrow">Tester tools · removed before launch</p>
      <div class="seg"><button data-plan="free" aria-pressed="${!S.pro && !S.passes.length}">Free</button><button data-plan="n5" aria-pressed="${!S.pro && S.passes.includes('n5')}">N5 Pass</button><button data-plan="n4" aria-pressed="${!S.pro && S.passes.includes('n4')}">N4 Pass</button><button data-plan="pro" aria-pressed="${S.pro}">Pro</button></div>
      <button class="btn ghost" data-act="reset">Erase progress and start over</button></div>`;
  }
};

function render(){
  const v = !S.onboarded ? 'onboard' : (U.view || U.tab);
  $('#screen').innerHTML = V[v]();
  $('#nav').innerHTML = S.onboarded ? TABS.map(([id,jp,en]) => `<button data-tab="${id}" aria-current="${!U.view && U.tab===id}"><b>${jp}</b>${en}</button>`).join('') : '';
}
function sheet(title, text, cta){
  if (!$('#over').innerHTML) hpush();
  $('#over').innerHTML = `<div class="over sheet"><div class="card"><h3>${title}</h3><p class="muted">${text}</p>${cta ? `<button class="btn" data-act="plans">${cta}</button>` : ''}<button class="btn ghost" data-act="close">Close</button></div></div>`;
}
// Hardware back button on Android closes the open lesson or sub-screen instead of leaving the app.
let skipPop = false;
const hpush = () => { try { history.pushState({ m:1 }, ''); } catch (e) {} };
const hback = () => { try { if (history.state && history.state.m) { skipPop = true; history.back(); } } catch (e) {} };
window.addEventListener('popstate', () => {
  if (skipPop) { skipPop = false; return; }
  if ($('#over').innerHTML) { clearInterval(tick); $('#over').innerHTML = ''; render(); } else if (U.view) { U.view = null; render(); }
});
function speak(t){
  // Inside the Android app the system text-to-speech plugin is used; browsers use the Web Speech API.
  const tts = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.TextToSpeech;
  if (tts) { tts.stop().catch(() => {}).then(() => tts.speak({ text:t, lang:'ja-JP', rate:0.8 })).catch(() => {}); return; }
  try { const u = new SpeechSynthesisUtterance(t); u.lang = 'ja-JP'; u.rate = .8; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {} }

/* ---------- lesson: flashcards, then quiz ---------- */
let L = null;
function startSet(items, title){ L = { items, i:0, fromCards:true, phase:'cards', title }; draw(); }
function startRow(s, name){ startSet(KROWS[s].find(r => r.name === name).items, s === 'h' ? 'Hiragana' : 'Katakana'); }
function startQuiz(items, title){ if (!items.length) return sheet('Nothing to quiz yet', 'Learn your first row and it will show up here.'); L = { items, title, phase:'quiz' }; toQuiz(); }
function gramQ(g){
  return { it:g, custom:true, picked:null, opts:shuffle(g.opts.map((t, i) => ({ t, ok:i === 0 }))),
    prompt:`<p class="mid gq">${g.q.replace('＿', '<u>＿＿</u>')}</p><p class="muted center">Fill the blank</p>`, why:`<b>${g.ch}</b> ${S.lang === 'hi' ? g.hi : g.en}` };
}
function listenQ(g){
  const others = shuffle(GRAM.filter(x => x !== g)).slice(0, 3);
  return { it:g, custom:true, say:g.jp, picked:null, opts:shuffle([{ t:g.tr, ok:true }, ...others.map(x => ({ t:x.tr, ok:false }))]),
    prompt:`<button class="btn dark" data-say="${g.jp}" style="width:auto;align-self:center">▶ Play the sentence</button><p class="muted center">Listen. What does it mean?</p>`, why:`<b>${g.tok.map(t => t[0]).join(' ')}</b> ${g.tr}` };
}
function startTest(lv, n){
  const u = unitItems(lv, n), lq = shuffle(u.g).slice(0, 2);
  const qs = [...u.g.map(gramQ), ...lq.map(listenQ), ...shuffle([...u.w, ...u.k]).slice(0, 10 - u.g.length - lq.length).map(mkQ)];
  L = { items:[], title:'Unit test', phase:'quiz', test:lv + ':' + n, tn:n, qs:shuffle(qs), i:0, right:0 }; L.total = L.qs.length; draw();
}
function mkQ(it, n){
  if (it.kind === 'g') return gramQ(it);
  const others = shuffle(ALL.filter(k => k.kind === it.kind && k.lv === it.lv && k.script === it.script && key(k) !== key(it))).slice(0, 3);
  return { it, toChar: n % 2 === 1, opts: shuffle([it, ...others]), picked: null };
}
function toQuiz(){ L.phase = 'quiz'; L.qs = shuffle(L.items).slice(0, 12).map(mkQ); L.i = 0; L.right = 0; L.total = L.qs.length; draw(); }
function draw(){
  if (!$('#over').innerHTML) hpush();
  const head = p => `<header><button class="x" data-act="close" aria-label="Close">✕</button><div class="prog"><u style="width:${p*100}%"></u></div>${L.exam ? `<b id="clock">${fmt(L.left)}</b>` : ''}</header>`;
  let h;
  if (L.phase === 'cards') {
    const it = L.items[L.i];
    h = `${head(L.i / L.items.length / 2)}<span class="pill" style="align-self:center">${L.title} · new</span><div class="grow"></div>
      ${it.kind === 'g' ? `<h3 class="center">${it.ch}</h3><div class="card"><div class="bridge">${it.tok.map(([j, h, p]) => `<div class="tok ${p ? 'p' : ''}"><b>${j}</b><span>${h}</span></div>`).join('')}</div><p class="note">${S.lang === 'hi' ? it.hi : it.en}</p><p class="muted">In English: "${it.tr}"</p></div>
      <button class="btn ghost" data-say="${it.jp}" style="width:auto;align-self:center">▶ Hear it</button>`
      : `<p class="big ${sz(it)}">${it.ch}</p>${rdline(it)}<p class="mid">${ans(it)}</p>
      <button class="btn ghost" data-say="${say(it)}" style="width:auto;align-self:center">▶ Hear it</button>`}<div class="grow"></div>
      <button class="btn" data-act="card">${L.i + 1 < L.items.length ? 'Next' : 'Now test me'}</button>`;
  } else if (L.phase === 'quiz') {
    const q = L.qs[L.i], done = q.picked !== null;
    h = `${head(L.fromCards ? .5 + L.i / L.qs.length / 2 : L.i / L.qs.length)}<div class="grow"></div>
      ${q.custom ? `${q.prompt}<div class="opts ${q.say || q.one ? 'one' : ''}">${q.opts.map((o, k) => `<button class="opt ${done ? (o.ok ? 'right' : k === q.picked ? 'wrong' : '') : ''}" data-pick="${k}" ${done ? 'disabled' : ''}>${o.t}</button>`).join('')}</div>${done ? `<div class="fb">${q.why}</div>` : ''}`
      : `      ${q.toChar ? `<p class="mid">${ans(q.it)}</p><p class="muted center">${q.it.kind === 'kana' ? 'Which kana makes this sound?' : 'Which one means this?'}</p>` : `<p class="big ${sz(q.it)}">${q.it.ch}</p>${q.it.kind === 'w' ? rdline(q.it) : ''}<p class="muted center">${q.it.kind === 'kana' ? 'Which sound is this?' : 'What does this mean?'}</p>`}
      <div class="opts">${q.opts.map((o,k) => `<button class="opt ${q.toChar ? 'jp '+sz(o) : ''} ${done ? (o === q.it ? 'right' : k === q.picked ? 'wrong' : '') : ''}" data-pick="${k}" ${done ? 'disabled' : ''}>${q.toChar ? o.ch : ans(o)}</button>`).join('')}</div>`}
      <div class="grow"></div>${done ? `<button class="btn" data-act="nextq">${L.i + 1 < L.qs.length ? 'Next' : 'Finish'}</button>` : '<div style="height:46px"></div>'}`;
  } else if (L.phase === 'result') { h = resultView(); } else {
    h = `<header><button class="x" data-act="close" aria-label="Close">✕</button><b>Session complete</b></header><div class="grow"></div>
      ${L.test ? `<p class="center"><span class="pill ${L.pc >= 70 ? 'ok' : 'pro'}">${L.pc >= 70 ? 'Unit ' + L.tn + ' passed' : '70% needed to pass. Revise and try again.'}</span></p>` : ''}
      <p class="big" style="font-size:72px">${L.right} / ${L.total}</p><p class="center">Streak: <b>${liveStreak()}</b> ${liveStreak() === 1 ? 'day' : 'days'}</p>
      <p class="muted center">What you missed comes back today. What you knew returns after a longer gap each time.</p><div class="grow"></div>
      <button class="btn" data-act="close">Done</button>`;
  }
  $('#over').innerHTML = `<div class="over">${h}</div>`;
}

/* ---------- events ---------- */
$('#app').addEventListener('input', e => { if (e.target.id === 'name') { S.name = e.target.value.trim().slice(0, 24); save(); } });
$('#app').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  const d = b.dataset;
  if (d.say) return speak(d.say);
  if (d.tab) { clearInterval(tick); U.tab = d.tab; U.view = null; $('#over').innerHTML = ''; render(); $('#screen').scrollTop = 0; return; }
  if (d.set) { const [k, v] = d.set.split(':'); S[k] = v; save(); return render(); }
  if (d.script) { U.script = d.script; return render(); }
  if (d.plan) { S.pro = d.plan === 'pro'; S.passes = d.plan === 'n5' || d.plan === 'n4' ? [d.plan] : []; save(); return render(); }
  if (d.pick !== undefined) {
    const q = L.qs[L.i]; q.picked = +d.pick;
    if (L.exam) { L.i++; return L.i < L.qs.length ? draw() : finishExam(); } const ok = q.custom ? q.opts[q.picked].ok : q.opts[q.picked] === q.it;
    if (!L.test && !q.say) grade(q.it.id, ok);
    if (ok) { if (!q.retry) L.right++; } else if (!q.retry && !L.test) { const r = mkQ(q.it, q.toChar ? 1 : 0); r.retry = true; L.qs.push(r); }
    return draw();
  }
  const [act, a1, a2] = (d.act || '').split(':');
  switch (act) {
    case 'begin': S.onboarded = true; save(); U.tab = S.start === 'kana' ? 'today' : 'learn'; render(); break;
    case 'kana': hpush(); U.view = 'kana'; render(); $('#screen').scrollTop = 0; break;
    case 'back': hback(); U.view = null; render(); break;
    case 'row': startRow(a1, a2); break;
    case 'card': L.i++; L.i < L.items.length ? draw() : toQuiz(); break;
    case 'review': startQuiz(dueAll(), 'Review'); break;
    case 'next': { const st = nextStep(); if (st && st.kind === 'set') startSet(st.items, st.lv.toUpperCase() + ' Unit ' + st.n); break; }
    case 'unit': hpush(); U.view = 'unit'; U.lv = a1; U.unit = +a2; render(); $('#screen').scrollTop = 0; break;
    case 'uw': startSet(unitItems(U.lv, U.unit).w.filter(x => !seen(x.id)).slice(0, 6), U.lv.toUpperCase() + ' Unit ' + U.unit); break;
    case 'uk': startSet(unitItems(U.lv, U.unit).k.filter(x => !seen(x.id)), U.lv.toUpperCase() + ' Unit ' + U.unit); break;
    case 'ug': { const g = unitItems(U.lv, U.unit).g, n = g.filter(x => !seen(x.id)); startSet(n.length ? n : g, U.lv.toUpperCase() + ' Unit ' + U.unit); break; }
    case 'test': startTest(a1, +a2); break;
    case 'ur': { const u = unitItems(U.lv, U.unit); startQuiz([...u.w, ...u.k].filter(x => seen(x.id)), 'Review'); break; }
    case 'quizall': startQuiz(KANA.filter(k => k.script === U.script && seen(k.id)), 'Review'); break;
    case 'nextq': L.i++; if (L.i < L.qs.length) draw(); else { if (L.test) { L.pc = Math.round(L.right / L.total * 100); S.tests[L.test] = Math.max(S.tests[L.test] || 0, L.pc); save(); } markStudy(); L.phase = 'done'; draw(); render(); } break;
    case 'close': hback(); clearInterval(tick); $('#over').innerHTML = ''; render(); break;
    case 'mock': startMock(a1, +a2); break;
    case 'soon': sheet('Opening in the next update', 'This unit is part of your plan. Its lessons are being written now.'); break;
    case 'lock': sheet(`This needs the ${a1.toUpperCase()} Exam Pass`, `Kana, N5 units 1 to 5, N4 unit 1 and the first mock of each level are free. The Exam Pass (₹499) opens all of ${a1.toUpperCase()} until exam day. Pro opens both levels.`, 'See plans'); break;
    case 'plans': hback(); $('#over').innerHTML = ''; U.tab = 'me'; U.view = null; render(); break;
    case 'pay': sheet('Payments are not switched on yet', 'Purchases through Google Play arrive in a later update. Use the tester tools below to preview a paid plan.'); break;
    case 'reset': reset(); U.tab = 'today'; U.view = null; render(); break;
  }
});
render();
