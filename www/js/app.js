import { S, save, reset, seen, box, isDue, grade, markStudy, liveStreak, can, canMock } from './store.js';
import { KANA, KROWS, UNITS, deva } from './data.js';
import { N5W, N5K } from './n5.js';
import { G5 } from './g5.js';

KANA.forEach(k => k.kind = 'kana');
const WORDS = N5W.map((w,i) => ({ id:'w5:'+i, ch:w[0], rd:w[1], en:w[2], hi:w[3], unit:w[4], kind:'w5' }));
const KANJI = N5K.map(k => ({ id:'k5:'+k[0], ch:k[0], rd:[k[1],k[2]].filter(Boolean).join(' · '), en:k[3], hi:k[4], unit:k[5], kind:'k5' }));
const GRAM = []; { let u = 0, k = 0;
  for (const line of G5.trim().split('\n')) {
    if (line[0] === '@') { u = +line.slice(1); k = 0; continue; }
    const [p, hi, en, ex, tr, q, o] = line.split(' # ');
    const tok = ex.split(' ').map(t => { const [j, h] = t.split('='); return [j.replace('*', '').replace(/_/g, ' '), h.replace(/_/g, ' '), j.includes('*')]; });
    GRAM.push({ id:`g5:${u}.${++k}`, kind:'g5', unit:u, ch:p, hi, en, tok, tr, q, opts:o.split(','), jp:tok.map(t => t[0]).join('') });
  } }
const ALL = [...KANA, ...WORDS, ...KANJI, ...GRAM];
const unitItems = n => ({ w: WORDS.filter(x => x.unit === n), k: KANJI.filter(x => x.unit === n), g: GRAM.filter(x => x.unit === n) });
const passed = n => (S.tests[n] || 0) >= 70;

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
  for (let n = 1; n <= UNITS.n5.length; n++) {
    const u = unitItems(n), un = a => a.filter(x => !seen(x.id)), w = un(u.w), k = un(u.k), g = un(u.g);
    if (!w.length && !k.length && !g.length && passed(n)) continue;
    if (!can('n5', n)) return { kind:'lock', n };
    // Order inside a unit: first words, then grammar, the rest of the words, kanji, and the unit test.
    if (w.length && (u.w.length - w.length < 6 || !g.length)) return { kind:'set', n, items:w.slice(0, 6), what:'words' };
    if (g.length) return { kind:'set', n, items:g, what:g.length === 1 ? 'grammar point' : 'grammar points' };
    if (k.length) return { kind:'set', n, items:k, what:'kanji' };
    return { kind:'test', n };
  }
  return null;
}
function nextRow(){ for (const s of ['h','k']) for (const r of KROWS[s]) if (r.items.some(k => !seen(k.id))) return { s, r }; return null; }

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
    if (!st) { nt = 'Everything in N5 is learned. お疲れさま！'; ns = 'Keep reviewing. N4 opens in a later update.'; nb = ''; }
    else if (st.kind === 'row') { nt = `New row: ${st.r.items.map(i => i.ch).join(' ')}`; ns = `${st.s === 'h' ? 'Hiragana' : 'Katakana'}, about 3 minutes.`; nb = `<button class="btn" data-act="row:${st.s}:${st.r.name}">Learn this row</button>`; }
    else if (st.kind === 'set') { nt = `N5 Unit ${st.n}: ${st.items.length} new ${st.what}`; ns = st.items.map(i => i.ch).join('、'); nb = `<button class="btn" data-act="next">Learn these</button>`; }
    else if (st.kind === 'test') { nt = `N5 Unit ${st.n}: unit test`; ns = '10 questions on this unit. 70% to pass.'; nb = `<button class="btn" data-act="test:${st.n}">Take the test</button>`; }
    else { nt = `Unit ${st.n} needs the N5 Exam Pass`; ns = 'You have finished the free units.'; nb = `<button class="btn" data-act="lock:n5">See what it unlocks</button>`; }
    let title = nt, sub = ns, btn = nb;
    if (due.length) { title = `${due.length} ${due.length === 1 ? 'item' : 'items'} ready for review`; sub = 'Reviewing just before you forget is what makes them stick.'; btn = `<button class="btn" data-act="review">Start review</button>${st && st.kind !== 'lock' ? `<p class="muted">Then: ${nt}</p>${nb.replace('class="btn"','class="btn ghost" style="color:#fff;border-color:#8fa0ff"')}` : ''}`; }
    return `<div><p class="eyebrow">Target ${esc(S.exam)}</p><h3>こんにちは、${esc(S.name || 'がくせい')}さん</h3></div>
    <div class="hero"><p class="eyebrow">Today</p><h3>${title}</h3><p class="muted">${sub}</p>${btn}</div>
    <div class="stats"><div><b>${liveStreak()}</b><span>day streak</span></div><div><b>${learned}</b><span>items learned</span></div><div><b>${due.length}</b><span>reviews due</span></div></div>
    <div class="card"><p class="eyebrow">Mikomi Score</p><b>Your pass chance appears after your first mock exam</b><p class="muted">Mock exams open in a later update.</p></div>`;
  },
  learn(){
    const h = kanaStats('h'), k = kanaStats('k'), pct = Math.round((h.seen + k.seen) / (h.n + k.n) * 100);
    const course = lv => `<div class="card"><p class="eyebrow">JLPT ${lv.toUpperCase()} · ${UNITS[lv].length} units</p><div class="list">
      ${UNITS[lv].map(([t,g],i) => { const ok = can(lv, i+1); return `<button class="item" data-act="${!ok ? 'lock:'+lv : lv === 'n5' ? 'unit:'+(i+1) : 'soon'}"><span class="k">${i+1}</span><div><b>${t}</b><span class="muted">${g}</span></div><span class="pill ${!ok ? 'pro' : lv === 'n5' && passed(i+1) ? 'ok' : ''}">${!ok ? (lv==='n5' ? 'N5 Pass' : 'N4 Pass') : lv === 'n5' && passed(i+1) ? 'Passed' : 'Open'}</span></button>`; }).join('')}
    </div></div>`;
    return `<div><p class="eyebrow">Courses</p><h3>Kana first, then N5, then N4</h3></div>
    <button class="card" data-act="kana" style="text-align:left"><p class="eyebrow">Step 1 · Free</p><h3>Hiragana and Katakana</h3><div class="meter"><u style="width:${pct}%"></u></div><p class="muted">${h.seen} of ${h.n} hiragana · ${k.seen} of ${k.n} katakana learned</p></button>
    ${course('n5')}${course('n4')}`;
  },
  unit(){
    const n = U.unit, [t, g] = UNITS.n5[n-1], u = unitItems(n), nw = u.w.filter(x => !seen(x.id)).length, nk = u.k.filter(x => !seen(x.id)).length;
    const row = it => `<button class="item" data-say="${say(it)}"><span class="k">${it.kind === 'k5' ? it.ch : seen(it.id) ? '✓' : '·'}</span><div><b>${it.ch}${it.rd && it.rd !== it.ch ? ` <span class="muted">${it.rd}</span>` : ''}</b><span class="muted">${S.lang === 'hi' ? it.hi : it.en}</span></div></button>`;
    return `<header style="display:flex;align-items:center;gap:8px"><button class="x" data-act="back" aria-label="Back" style="font-size:22px">←</button><h3>N5 Unit ${n}</h3></header>
    <div class="card"><b>${t}</b><p class="muted">${g}</p>
      <button class="btn" data-act="ug">${u.g.some(x => !seen(x.id)) ? `Learn grammar (${u.g.length} points)` : 'Revise grammar'}</button>
      <button class="btn" data-act="uw" ${nw ? '' : 'disabled'}>${nw ? `Learn ${Math.min(6, nw)} new words` : 'All words learned'}</button>
      <button class="btn dark" data-act="uk" ${nk ? '' : 'disabled'}>${nk ? `Learn ${nk} new kanji` : 'All kanji learned'}</button>
      <button class="btn ghost" data-act="ur">Quiz me on words and kanji</button>
      <button class="btn ghost" data-act="test:${n}">Unit test${S.tests[n] !== undefined ? ` · best ${S.tests[n]}%` : ''}</button></div>
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
    const row = (lv, n, t, d) => { const ok = canMock(lv, n); return `<button class="item" data-act="${ok ? 'soon' : 'lock:'+lv}"><span class="k">試</span><div><b>${t}</b><span class="muted">${d}</span></div><span class="pill ${ok ? '' : 'pro'}">${ok ? 'Free' : lv.toUpperCase()+' Pass'}</span></button>`; };
    return `<div><p class="eyebrow">Mock exams</p><h3>Sit the paper before the paper</h3></div>
    <div class="card"><p class="eyebrow">JLPT N5</p><div class="list">${row('n5',1,'N5 full mock 1','Scaled score out of 180')}${row('n5',2,'N5 full mocks 2 to 6','A new paper each week before the exam')}</div></div>
    <div class="card"><p class="eyebrow">JLPT N4</p><div class="list">${row('n4',1,'N4 full mock 1','Scaled score out of 180')}${row('n4',2,'N4 full mocks 2 to 8','A new paper each week before the exam')}</div></div>
    <p class="muted">Mock exams and the Mikomi Score open in a later update.</p>`;
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
      <div class="seg"><button data-plan="free" aria-pressed="${!S.pro && !S.passes.length}">Free</button><button data-plan="n5" aria-pressed="${!S.pro && S.passes.includes('n5')}">N5 Pass</button><button data-plan="pro" aria-pressed="${S.pro}">Pro</button></div>
      <button class="btn ghost" data-act="reset">Erase progress and start over</button></div>`;
  }
};

function render(){
  const v = !S.onboarded ? 'onboard' : (U.view || U.tab);
  $('#screen').innerHTML = V[v]();
  $('#nav').innerHTML = S.onboarded ? TABS.map(([id,jp,en]) => `<button data-tab="${id}" aria-current="${!U.view && U.tab===id}"><b>${jp}</b>${en}</button>`).join('') : '';
}
function sheet(title, text, cta){
  $('#over').innerHTML = `<div class="over sheet"><div class="card"><h3>${title}</h3><p class="muted">${text}</p>${cta ? `<button class="btn" data-act="plans">${cta}</button>` : ''}<button class="btn ghost" data-act="close">Close</button></div></div>`;
}
function speak(t){ try { const u = new SpeechSynthesisUtterance(t); u.lang = 'ja-JP'; u.rate = .8; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {} }

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
function startTest(n){
  const u = unitItems(n), lq = shuffle(u.g).slice(0, 2);
  const qs = [...u.g.map(gramQ), ...lq.map(listenQ), ...shuffle([...u.w, ...u.k]).slice(0, 10 - u.g.length - lq.length).map(mkQ)];
  L = { items:[], title:'Unit test', phase:'quiz', test:n, qs:shuffle(qs), i:0, right:0 }; L.total = L.qs.length; draw();
}
function mkQ(it, n){
  if (it.kind === 'g5') return gramQ(it);
  const others = shuffle(ALL.filter(k => k.kind === it.kind && k.script === it.script && key(k) !== key(it))).slice(0, 3);
  return { it, toChar: n % 2 === 1, opts: shuffle([it, ...others]), picked: null };
}
function toQuiz(){ L.phase = 'quiz'; L.qs = shuffle(L.items).slice(0, 12).map(mkQ); L.i = 0; L.right = 0; L.total = L.qs.length; draw(); }
function draw(){
  const head = p => `<header><button class="x" data-act="close" aria-label="Close">✕</button><div class="prog"><u style="width:${p*100}%"></u></div></header>`;
  let h;
  if (L.phase === 'cards') {
    const it = L.items[L.i];
    h = `${head(L.i / L.items.length / 2)}<span class="pill" style="align-self:center">${L.title} · new</span><div class="grow"></div>
      ${it.kind === 'g5' ? `<h3 class="center">${it.ch}</h3><div class="card"><div class="bridge">${it.tok.map(([j, h, p]) => `<div class="tok ${p ? 'p' : ''}"><b>${j}</b><span>${h}</span></div>`).join('')}</div><p class="note">${S.lang === 'hi' ? it.hi : it.en}</p><p class="muted">In English: "${it.tr}"</p></div>
      <button class="btn ghost" data-say="${it.jp}" style="width:auto;align-self:center">▶ Hear it</button>`
      : `<p class="big ${sz(it)}">${it.ch}</p>${rdline(it)}<p class="mid">${ans(it)}</p>
      <button class="btn ghost" data-say="${say(it)}" style="width:auto;align-self:center">▶ Hear it</button>`}<div class="grow"></div>
      <button class="btn" data-act="card">${L.i + 1 < L.items.length ? 'Next' : 'Now test me'}</button>`;
  } else if (L.phase === 'quiz') {
    const q = L.qs[L.i], done = q.picked !== null;
    h = `${head(L.fromCards ? .5 + L.i / L.qs.length / 2 : L.i / L.qs.length)}<div class="grow"></div>
      ${q.custom ? `${q.prompt}<div class="opts ${q.say ? 'one' : ''}">${q.opts.map((o, k) => `<button class="opt ${done ? (o.ok ? 'right' : k === q.picked ? 'wrong' : '') : ''}" data-pick="${k}" ${done ? 'disabled' : ''}>${o.t}</button>`).join('')}</div>${done ? `<div class="fb">${q.why}</div>` : ''}`
      : `      ${q.toChar ? `<p class="mid">${ans(q.it)}</p><p class="muted center">${q.it.kind === 'kana' ? 'Which kana makes this sound?' : 'Which one means this?'}</p>` : `<p class="big ${sz(q.it)}">${q.it.ch}</p>${q.it.kind === 'w5' ? rdline(q.it) : ''}<p class="muted center">${q.it.kind === 'kana' ? 'Which sound is this?' : 'What does this mean?'}</p>`}
      <div class="opts">${q.opts.map((o,k) => `<button class="opt ${q.toChar ? 'jp '+sz(o) : ''} ${done ? (o === q.it ? 'right' : k === q.picked ? 'wrong' : '') : ''}" data-pick="${k}" ${done ? 'disabled' : ''}>${q.toChar ? o.ch : ans(o)}</button>`).join('')}</div>`}
      <div class="grow"></div>${done ? `<button class="btn" data-act="nextq">${L.i + 1 < L.qs.length ? 'Next' : 'Finish'}</button>` : '<div style="height:46px"></div>'}`;
  } else {
    h = `<header><button class="x" data-act="close" aria-label="Close">✕</button><b>Session complete</b></header><div class="grow"></div>
      ${L.test ? `<p class="center"><span class="pill ${passed(L.test) && L.pc >= 70 ? 'ok' : 'pro'}">${L.pc >= 70 ? 'Unit ' + L.test + ' passed' : '70% needed to pass. Revise and try again.'}</span></p>` : ''}
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
  if (d.tab) { U.tab = d.tab; U.view = null; $('#over').innerHTML = ''; render(); $('#screen').scrollTop = 0; return; }
  if (d.set) { const [k, v] = d.set.split(':'); S[k] = v; save(); return render(); }
  if (d.script) { U.script = d.script; return render(); }
  if (d.plan) { S.pro = d.plan === 'pro'; S.passes = d.plan === 'n5' ? ['n5'] : []; save(); return render(); }
  if (d.pick !== undefined) {
    const q = L.qs[L.i]; q.picked = +d.pick; const ok = q.custom ? q.opts[q.picked].ok : q.opts[q.picked] === q.it;
    if (!L.test && !q.say) grade(q.it.id, ok);
    if (ok) { if (!q.retry) L.right++; } else if (!q.retry && !L.test) { const r = mkQ(q.it, q.toChar ? 1 : 0); r.retry = true; L.qs.push(r); }
    return draw();
  }
  const [act, a1, a2] = (d.act || '').split(':');
  switch (act) {
    case 'begin': S.onboarded = true; save(); U.tab = S.start === 'kana' ? 'today' : 'learn'; render(); break;
    case 'kana': U.view = 'kana'; render(); $('#screen').scrollTop = 0; break;
    case 'back': U.view = null; render(); break;
    case 'row': startRow(a1, a2); break;
    case 'card': L.i++; L.i < L.items.length ? draw() : toQuiz(); break;
    case 'review': startQuiz(dueAll(), 'Review'); break;
    case 'next': { const st = nextStep(); if (st && st.kind === 'set') startSet(st.items, 'N5 Unit ' + st.n); break; }
    case 'unit': U.view = 'unit'; U.unit = +a1; render(); $('#screen').scrollTop = 0; break;
    case 'uw': startSet(unitItems(U.unit).w.filter(x => !seen(x.id)).slice(0, 6), 'N5 Unit ' + U.unit); break;
    case 'uk': startSet(unitItems(U.unit).k.filter(x => !seen(x.id)), 'N5 Unit ' + U.unit); break;
    case 'ug': { const g = unitItems(U.unit).g, n = g.filter(x => !seen(x.id)); startSet(n.length ? n : g, 'N5 Unit ' + U.unit); break; }
    case 'test': startTest(+a1); break;
    case 'ur': { const u = unitItems(U.unit); startQuiz([...u.w, ...u.k].filter(x => seen(x.id)), 'Review'); break; }
    case 'quizall': startQuiz(KANA.filter(k => k.script === U.script && seen(k.id)), 'Review'); break;
    case 'nextq': L.i++; if (L.i < L.qs.length) draw(); else { if (L.test) { L.pc = Math.round(L.right / L.total * 100); S.tests[L.test] = Math.max(S.tests[L.test] || 0, L.pc); save(); } markStudy(); L.phase = 'done'; draw(); render(); } break;
    case 'close': $('#over').innerHTML = ''; render(); break;
    case 'soon': sheet('Opening in the next update', 'This unit is part of your plan. Its lessons are being written now.'); break;
    case 'lock': sheet(`This needs the ${a1.toUpperCase()} Exam Pass`, `Kana, N5 units 1 to 5, N4 unit 1 and the first mock of each level are free. The Exam Pass (₹499) opens all of ${a1.toUpperCase()} until exam day. Pro opens both levels.`, 'See plans'); break;
    case 'plans': $('#over').innerHTML = ''; U.tab = 'me'; U.view = null; render(); break;
    case 'pay': sheet('Payments are not switched on yet', 'Purchases through Google Play arrive in a later update. Use the tester tools below to preview a paid plan.'); break;
    case 'reset': reset(); U.tab = 'today'; U.view = null; render(); break;
  }
});
render();
