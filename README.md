# Mikomi app

JLPT N5 and N4 app for Mikomi Institute. Plain HTML/CSS/JS in `www/` (no build step), wrapped for Android with Capacitor.

- Try it in a browser: `npm run serve`, then open the printed address.
- Android build (needs Android Studio; set up properly in Sprint 8): `npm install`, `npm run android:add`, `npm run android:sync`, `npm run android:open`.
- Sprint plan and status: SPRINTS.md in the claude.ai project "Japanese App".

Code map: `www/js/data.js` kana and course map; `www/js/store.js` saved state, spaced repetition, free/paid gating; `www/js/app.js` screens and lesson flow.
