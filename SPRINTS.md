# Mikomi app — sprint plan and status

Scope: JLPT N5 and N4, end to end, Android first. Objective for phase 2: make learning fun and interactive, reusing what is built.

Stack: plain HTML/CSS/JS app in `www/` (no build step), wrapped for Android with Capacitor 6.
Code: github.com/trustyliar/Mikomi-App (branch main). Every push builds a test APK automatically:
https://github.com/trustyliar/Mikomi-App/releases/download/test-build/mikomi-test.apk
Browser preview: artifact "Mikomi JLPT App". This file lives in the repo and is mirrored to the claude.ai project "Japanese App".

## Revenue streams
1. App plans: Exam Pass Rs 499 per level; Pro Rs 199/month or Rs 1,499/year.
2. Live classes at Mikomi Institute (lead goes to WhatsApp).
3. Recorded course: Rs 5,000 for 1 year, includes Pro (all app content). Videos not recorded yet: show as "Coming soon". Doubts answered within 12 hours.

## Phase 1 (done, 13 Nov 2026)
| Sprint | Goal | Status |
|---|---|---|
| 0 | Research, concept, prototype | Done |
| 1 | App shell, onboarding, progress, spaced repetition, gating, kana | Done |
| 2 | N5 words (718) + kanji (79), Hindi and English | Done |
| 3 | N5 grammar via Hindi Bridge (43 points), listening, unit tests | Done |
| 4 | N4: 668 words, 166 kanji, 44 grammar points | Done |
| 5 | Mock exams (6 N5, 8 N4) + Mikomi Score | Done |
| 8a | Android packaging + automatic test APK | Done; not yet tried on a phone |

## Phase 2: fun, live classes, recorded course
| Sprint | Goal | Status |
|---|---|---|
| 9 | Journey map (units are stations, Narita to Hakata; stamp per passed unit), XP + daily goal, streak freeze, Daru the daruma mascot, unit tests as boss battles (7 hits to win, 4 lives) | Done (13 Nov 2026) |
| 10 | Play tab with five games from existing content: Kana Rain, Particle Ninja, Sentence Builder, Kanji Pairs, 60-second Blitz; best scores; games earn XP and count for the streak | Done (13 Nov 2026) |
| 11 | "Learn with a Sensei": live classes section with website details, free demo booking via WhatsApp with level/score prefilled, smart prompts (two failed battles, low Mikomi Score, end of free units, after a mock); recorded course card (Rs 5,000/year, includes Pro, Coming soon, "Notify me" via WhatsApp) | Next; needs nothing from Alok |
| 12 | Share cards (streak, stamp, mock score) for Instagram/WhatsApp, friend challenge link, level certificate, study plan to exam day | Pending |
| 13 | Google sign-in + cloud sync, weekly leagues, monthly All-India Mikomi Mock | Blocked: Firebase project |
| 14 | Recorded course player, notes, doubts box (12-hour reply promise) | Blocked: videos, hosting choice, Firebase |
| 15 | Payments: Exam Pass, Pro, recorded course | Blocked: Play Console account |
| 16 | Release signing, store listing, privacy policy, closed test, launch | Blocked: Play Console account, 12 testers |

## Live class details (from mikomiinstitute.online, 13 Nov 2026)
- Mikomi Institute of Japanese Language. "Where Your Japanese Journey Begins."
- Fees: N5 Rs 18,000; N4 Rs 19,000 (most popular); N3 Rs 21,000; N2 Rs 22,000.
- Each level 3-5 months. Live interactive online classes, small batches, weekend and evening batches, recordings included.
- Includes: study material, assignments, practice tests, mock interviews, JLPT preparation, doubt sessions.
- Teacher: Astha Pokhriyal (Astha Sensei), founder and lead instructor, JLPT N2 certified, 6+ years teaching.
- Free demo class and free counselling. Leads: WhatsApp +91 81787 95615. Email contactatmikomi@gmail.com. Instagram @mikomi_institute.
- Website issues seen: "Book Free Demo" and WhatsApp buttons link nowhere; stats show "0+ Yrs Teaching, 0+ Students Mentored".

## What Alok needs to do
1. Google Play Console account (US$25). New personal accounts need a closed test with 12 testers for 14 days before publishing.
2. Line up 12 Android testers.
3. Install the test APK and report problems (listening audio, back button, games).
4. Firebase project: enable Google sign-in, add Android app `in.mikomi.jlpt` and a web app, send both configs.
5. Teacher review of content: `tools/hi.txt`, `tools/hi4.txt`, `www/js/g5.js`, `www/js/g4.js`, `www/js/read.js`; also play Particle Ninja and flag any question where two particles could both be right.
6. Decide: final app name, whether placeholder icon stays, mascot name (currently "Daru").
7. Record the N5 course videos; choose video hosting.
8. Fix the website's dead buttons and placeholder stats.

## Decisions
- Sign-in: Google only (Instagram cannot be used for sign-in).
- Free: kana, N5 units 1-5, N4 unit 1, first mock per level, all games. Rest needs Exam Pass or Pro.
- Live classes are sold through WhatsApp/counsellor, not paid inside the app (avoids Play billing rules and converts better).
- Mascot: yes. Daru, a daruma doll; his second eye is painted when the learner passes a mock exam.
- Doubt reply promise: 12 hours.
- XP: 2 per correct answer, 10 per session, 30 for a won battle or a finished mock, up to 20 per game. Daily goal 10/30/50. One streak freeze to start, one more per 7-day streak, max 2.
- Games draw on items the learner has already seen, topped up with a starter set for new learners.
- Content sources: words from open-anki-jlpt-decks (MIT), kanji from davidluzgouveia/kanji-data (MIT); Hindi meanings, grammar, reading written for Mikomi.
- Backlog: Japan jobs track, speaking practice, handwriting, N3/N2, institute licences, offline mode, bigger mock question banks, recorded audio, more games (Station Announcement listening game).

Rebuild data: `python3 tools/build_n5.py tools www/js/n5.js` and `python3 tools/build_n4.py tools www/js/n4.js`.
