// Google sign-in and cloud backup of progress.
// Everything here is optional: if Firebase cannot load, the network is down, or the
// learner is signed out, the app behaves exactly as it did before this file existed.
import { S, save } from './store.js';

const CFG = {
  apiKey: 'AIzaSyCTfXVnvE6BebcTymLOThvfqc1FGBJmwzI',
  authDomain: 'mikomi-app-92f1c.firebaseapp.com',
  projectId: 'mikomi-app-92f1c',
  storageBucket: 'mikomi-app-92f1c.firebasestorage.app',
  messagingSenderId: '441863264945',
  appId: '1:441863264945:web:0b1af25c47774af7306090'
};

let F = null, auth = null, db = null, changed = () => {};
export const C = { ready:false, user:null, busy:false, note:'' };
const plugin = () => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseAuthentication;

export async function init(onChange){
  changed = onChange;
  try {
    F = await import('./vendor/firebase.js');
    const app = F.initializeApp(CFG);
    auth = F.getAuth(app); db = F.getFirestore(app); C.ready = true;
    F.onAuthStateChanged(auth, async u => {
      C.user = u ? { uid:u.uid, name:u.displayName || '', photo:u.photoURL || '' } : null;
      changed();
      if (u) { await pull(); changed(); }
    });
  } catch (e) { C.ready = false; }
  changed();
  // Back up whenever the learner leaves the app.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') push(); });
}

export async function signIn(){
  if (!C.ready) { C.note = 'Sign-in is not available here. It works in the Android app.'; return changed(); }
  C.busy = true; C.note = ''; changed();
  try {
    const P = plugin();
    if (P) {
      const r = await P.signInWithGoogle();
      const t = r && r.credential && r.credential.idToken;
      if (!t) throw new Error('no-token');
      await F.signInWithCredential(auth, F.GoogleAuthProvider.credential(t));
    } else {
      await F.signInWithPopup(auth, new F.GoogleAuthProvider());
    }
  } catch (e) {
    const c = (e && (e.code || e.message)) || '';
    const quit = /cancell?ed|closed-by-user|popup-closed/i.test(c);
    C.note = quit ? '' : 'Could not sign in just now. Check the internet connection and try again.';
  }
  C.busy = false; changed();
}

export async function signOut(){
  await push();
  try { const P = plugin(); if (P) await P.signOut(); await F.signOut(auth); } catch (e) {}
  C.note = ''; changed();
}

const ref = () => F.doc(db, 'users', C.user.uid);

export async function pull(){
  try {
    const snap = await F.getDoc(ref());
    if (snap.exists() && snap.data().data) merge(JSON.parse(snap.data().data));
    else await push();
  } catch (e) { C.note = 'Signed in, but your progress could not be loaded just now.'; }
}

export async function push(){
  if (!C.ready || !C.user) return;
  try {
    S.at = Date.now(); save();
    await F.setDoc(ref(), { data:JSON.stringify(S), name:S.name || C.user.name, xp:S.xp || 0, streak:S.streak || 0, at:S.at });
  } catch (e) {}
}

// Merge a copy of the progress saved from another phone into this one.
// The rule is "keep the better of the two" everywhere, so nothing a learner has
// earned is ever lost by signing in on a second device.
function merge(r){
  if (!r || typeof r !== 'object') return;
  const older = (r.at || 0) > (S.at || 0);
  if (older) for (const k of ['name','lang','exam','start','goal']) if (r[k] !== undefined) S[k] = r[k];
  for (const [id, v] of Object.entries(r.srs || {})) {
    const cur = S.srs[id];
    if (!cur || (v.b || 0) > (cur.b || 0)) S.srs[id] = v;
  }
  for (const [id, v] of Object.entries(r.tests || {})) S.tests[id] = Math.max(S.tests[id] || 0, v);
  for (const [id, v] of Object.entries(r.best || {})) S.best[id] = id === 'pairs' ? Math.min(S.best[id] ?? Infinity, v) : Math.max(S.best[id] || 0, v);
  for (const [id, v] of Object.entries(r.fails || {})) S.fails[id] = Math.max(S.fails[id] || 0, v);
  const key = m => `${m.lv}:${m.n}:${m.day}:${m.total}`, seen = new Set((S.mocks || []).map(key));
  for (const m of r.mocks || []) if (!seen.has(key(m))) S.mocks.push(m);
  S.mocks.sort((a, b) => (a.day || 0) - (b.day || 0));
  for (const k of ['xp','streak','freezes']) S[k] = Math.max(S[k] || 0, r[k] || 0);
  if (r.lastDay > (S.lastDay ?? -1)) { S.lastDay = r.lastDay; if (r.xpDay === r.lastDay) { S.xpDay = r.xpDay; S.xpToday = Math.max(S.xpToday || 0, r.xpToday || 0); } }
  S.pro = S.pro || !!r.pro;
  S.passes = [...new Set([...(S.passes || []), ...(r.passes || [])])];
  S.onboarded = S.onboarded || !!r.onboarded;
  save();
}
