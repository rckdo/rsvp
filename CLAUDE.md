# Notes for Claude sessions in this repo

This repo is a personal site served by GitHub Pages at `lorraine-richard.rsvp`. Merging to `main` publishes within a couple of minutes. Each folder is a self-contained page.

## How pages are built

- One HTML file per page, with inline CSS and JS. No build step, no modules.
- Data lives in the Firebase Realtime Database for project `rl-wedding-fe94a`. The full rules for the whole project are in `game/firebase-rules.json`; the owner pastes that file into the Firebase console by hand, so always edit the whole file and say when it needs re-pasting.
- Every HTML file starts with a comment block holding a changelog. Add an entry for every change, newest first, with a version and a DD/MM/YYYY date. British spelling throughout.
- `sw.js` caches pages for offline use. Bump `CACHE` only when adding a page to its list.

## /jobs (the job-search app)

A private tracker for one person. Read the changelog at the top of `jobs/index.html` first.

**Before shipping any change, run the test and make sure it passes:**

```bash
node tests/jobs-smoke.js
```

It opens `/jobs/?demo` (example data, no database) and walks every tab. If you add a tab or a major feature, add a check for it. A change that removes a block of code must be followed by this test: a whole tab was once broken by an over-wide replacement.

### Rules the owner has set

- **Wording is terse.** Labels and messages read like an app, not a guide. No explanatory sentences on the page; help lives behind the `?` buttons.
- **One noun:** "job". The pasted advert is the "job spec". The STAR tab is "Examples".
- **Dates are always written "Sun 22 Nov 2026".** Never bare numbers. The small calendar leaves may drop the year when it is the current one.
- **Read first, edit on request.** Jobs and examples open as laid-out text with an Edit button; fields only appear in Edit.
- **Anything destructive asks first** in a dialog that names the thing. Stickers are the exception: they go at once, with Undo.
- **Nothing nags.** No automatic reminders or emails. Only dates she sets appear in This week.
- **Stickers** drag straight away, pinch to resize, and a tap passes through to what is underneath. Artwork is Twemoji (CC BY 4.0); do not add hand-drawn art.
- **No pills, no boxed panels.** Squared controls, grouping by spacing and rules, three looks (Allotment, Lido, Blossom) driven by CSS tokens.
- **Every page is full width** in one column; long texts open in the reading panel.
- **Phone first.** Check every change at phone width as well as laptop width.

### Things that bit us

- The page rebuilds its HTML from data. Never rebuild while a field has focus or a button is mid-press (`editing()`, `pressing`, `pending`), or clicks and typing get lost.
- Demo mode must behave like the live database (`store` calls `onData`), or tests miss real bugs.
- Access is by passcode looked up in `jobs/access`; the passcode is never in the page.
