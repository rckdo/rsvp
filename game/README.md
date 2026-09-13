# Find the codes: the wedding QR game

Ten QR codes hidden around the venue. Each opens `/game/?c=CODE` with two
first-person statements: one is Richard or Lorraine, one is Eric or Tango.
Guests pick who said each. Answers are revealed at the pub from the host page.

| File | What it is |
|---|---|
| `index.html` | Guest page. Name reels, the tie-breaker gate, a full-screen takeover per scanned card, then My answers / Results tabs. |
| `content.json` | Reels, statements, icon URLs. Contains no answers. |
| `host/index.html` | Host page for the pub. Behind Richard's passcode. |
| `firebase-rules.json` | Full Realtime Database rules for the project (tracker and RSVP rules included). Paste as is. |

Nothing secret lives in this repository. GitHub Pages serves every committed file,
so the answer key and the ten codes are written straight into Firebase from the host
page's Seed box and handed over separately.

## Firebase layout (all under `/game`)

```
/game/codes/{code}            "q1" … "q10"
/game/answers/q1 … q10        { human: "R"|"L", dog: "E"|"T" }
/game/answers/tiebreak        { day, month }
/game/config                  { lockAt, releasedAt, revealed: { q1: true, … }, stage, epoch, clues, statements }
/game/players/{alias}         { uid, claimedAt, lastChange, found/{q}, answers/{q}, tiebreak }
```

Rules enforce: one anonymous sign-in per phone owns its alias; a code can only be
marked found with a valid code; answers only for found codes (or after release-all);
nothing after the lock time. The host writes (codes, answers, config, reset) are open
to any signed-in phone. The host page sits behind the passcode splash and is the only
thing that makes them. Anyone querying Firebase directly could read the answers early;
that is an accepted risk for a wedding.

## Seeding and reset

Import the seed JSON at the `/game` node (not the root, which would wipe the RSVP
replies and tracker). Reset on the host page wipes players and config but leaves
codes, answers and the host claim in place.

## Photos at the reveal

Photos live in `media/` and are named in `content.json` under `media`, keyed by card and
side. Either a single path, or `src` plus a larger `full` for the lightbox:

```json
"media": {
  "q3": { "human": "media/q3-lorraine.jpg", "dog": { "src": "media/q3-eric.jpg", "full": "media/q3-eric-full.jpg" } }
}
```

Condense before committing: 1400px on the long edge, JPEG around 80 quality, under
250KB. Every phone fetches every photo quietly, one at a time, as soon as the hunt
closes, so the reveal never waits on a download. A photo shows on the reveal takeover
and on My answers afterwards; tap for full screen. The file names are public (Pages
serves everything), which only matters if a guest goes looking before the reveal.

## Editing statements or icons

Edit `content.json`. Icons are Lucide static SVGs by filename under `iconBase`, or a
full URL. Answers are not in this file: change `/game/answers` in Firebase to match.
