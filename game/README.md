# Find the codes: the wedding QR game

Ten QR codes hidden around the venue. Each opens `/game/?c=CODE` with two
first-person statements: one is Richard or Lorraine, one is Eric or Tango.
Guests pick who said each. Answers are revealed at the pub from the host page.

| File | What it is |
|---|---|
| `index.html` | Guest page. Alias reels, This code / My answers / Results tabs. |
| `content.json` | Reels, statements, icon URLs. Contains no answers. |
| `host/index.html` | Host page for the pub. Behind the couple's passcode, plus a host key. |
| `firebase-rules.json` | Full Realtime Database rules for the project (tracker and RSVP rules included). `REPLACE_WITH_HOST_KEY` must be swapped for the real key before pasting. |

Nothing secret lives in this repository. GitHub Pages serves every committed file,
so the answer key, the ten codes and the host key are seeded straight into Firebase
and handed over separately.

## Firebase layout (all under `/game`)

```
/game/codes/{code}            "q1" … "q10"   (readable one code at a time, never listed)
/game/answers/q1 … q10        { human: "R"|"L", dog: "E"|"T" }   readable once that code is revealed
/game/answers/tiebreak        { day, month }                      readable once code 10 is revealed
/game/config                  { lockAt, releasedAt, revealed: { q1: true, … } }
/game/host/{HOST_KEY}         uid of the phone currently acting as host
/game/players/{alias}         { uid, claimedAt, lastChange, found/{q}, answers/{q}, tiebreak }
```

Rules enforce: one anonymous sign-in per phone owns its alias; a code can only be
marked found with a valid code; answers only for found codes (or after release-all);
nothing after the lock time; config and reset only from the phone holding the host key.

## Seeding and reset

Import the seed JSON at the `/game` node (not the root, which would wipe the RSVP
replies and tracker). Reset on the host page wipes players and config but leaves
codes, answers and the host claim in place.

## Editing statements or icons

Edit `content.json`. Icons are Lucide static SVGs by filename under `iconBase`, or a
full URL. Answers are not in this file: change `/game/answers` in Firebase to match.
