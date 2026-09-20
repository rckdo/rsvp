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
/game/players/{alias}         { uid, claimedAt, lastChange, away?, found/{q}, answers/{q}, tiebreak }
```

Rules enforce: one anonymous sign-in per phone owns its alias; a code can only be
marked found with a valid code; answers only for found codes (or after release-all);
nothing after the lock time. The host writes (codes, answers, config, reset) are open
to any signed-in phone. The host page sits behind the passcode splash and is the only
thing that makes them. Anyone querying Firebase directly could read the answers early;
that is an accepted risk for a wedding.

## Playing from afar

An "away" code is a code whose value is `away` (the host page's Setup tab makes one). Opening
`/game/?c=AWAYCODE` marks the phone away at claim time and hands it all ten cards without hunting:
the rules let an away player answer any card. Away players are ranked among themselves; the room's
leaderboard and the reveal's "N of M got it" leave them out. Send the link privately: it is the only
thing standing between an attendee and a hunt-free game.

## Seeding and reset

Import the seed JSON at the `/game` node (not the root, which would wipe the RSVP
replies and tracker). Reset on the host page wipes players and config but leaves
codes, answers and the host claim in place.

## Photos at the reveal

Photos and clips live in `media/`. Every file is listed in `media/index.json` (the
gallery), and the host page's Setup tab assigns one to each statement from that gallery;
the pick is saved to `config.media` and applies at once. `content.json`'s `media` map is
the fallback underneath, keyed by card and side: a path, or an object with `src`:

```json
"media": {
  "q3": { "human": "media/q3-lorraine.jpg", "dog": { "src": "media/q3-eric.jpg", "aspect": "3/4" } }
}
```

A short clip is a `video` entry with a `poster` frame:

```json
"q5": { "dog": { "video": "media/q5-eric.mp4", "poster": "media/q5-eric.jpg" } }
```

It plays silently, looping, in the print frame at the reveal; a tap on the picture pauses it, and the
speaker in the polaroid's foot turns its sound on (one clip at a time). Keep the audio track in the file
for anything worth hearing. Nothing opens full screen, so size the frame for what it shows. The
polaroid's window is square unless the entry sets `"aspect": "3/4"` (or any ratio),
which suits a portrait clip.
Keep clips short (under 15 seconds), 720p H.264 MP4, under 4MB. They sit in the repo
like the photos; no separate hosting.

Condense photos before committing: 1400px on the long edge, JPEG around 80 quality,
under 250KB. Every phone fetches every photo quietly, one at a time, as soon as the hunt
closes, so the reveal never waits on a download. A photo shows on the reveal takeover
and on My answers afterwards; there is no tap action on a photo. The file names are public (Pages
serves everything), which only matters if a guest goes looking before the reveal.

## Editing statements, icons or motifs

Day to day, use the host page's Setup tab: reword a statement, pick its icon, set the
answer, re-pair a card's quilt block and colour. Those live in `/game/config`
(`statements`, `icons`, `motifs`) and apply to the phones, the feed and the card sheet
at once, and survive a reset.

`content.json` is the base underneath. Icons are Lucide static SVGs by filename under
`iconBase` (the vendored set is in `icons/`; add more from lucide.dev/icons as files
there and to the host page's `ICONS` list). Answers are not in this file.
