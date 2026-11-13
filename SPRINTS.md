# Sprint status
Done: Sprint 0 (research), 1 (foundation + kana), 2 (N5 words + kanji), 3 (N5 grammar, listening, unit tests), 4 (N4 content), 5 (mock exams + Mikomi Score).
Next: Sprint 6, Google sign-in and cloud sync (needs a Firebase project).
Full plan: SPRINTS.md in the claude.ai project "Japanese App".
Rebuild data: `python3 tools/build_n5.py tools www/js/n5.js` and `python3 tools/build_n4.py tools www/js/n4.js`.
Grammar lives in `www/js/g5.js` and `www/js/g4.js` (one point per line). Hindi meanings: `tools/hi.txt`, `tools/hi4.txt`.
