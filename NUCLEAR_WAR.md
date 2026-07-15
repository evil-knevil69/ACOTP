# DEFCON-1 Nuclear War branch — handoff / authoring

**Status:** MECHANISM BUILT, ships INERT. Pattern lifted from *2024: Our
Revolution* (`origin/Source-Material`), adapted to ACOP. Turns on the moment
you author the bunker question and set one pk. Nothing fires until then —
`defcon` reaching 1 changes nothing while `_NUKE_Q_PK` is `null`.

All code is in `ACOP Nixon_Agnew.txt` (Code 2), grep **`NUCLEAR WAR TUNNEL`**,
plus two one-line guards in `A Cancer on the Presidency_init (draft).txt`
(Code 1, the election-night detectors).

---

## What happens in play

1. `defcon` drops to **1** (driven by SIGINT / world events / an answer — the
   branch doesn't care how).
2. At the next turn boundary the tunnel **arms**: the very next question slot is
   overwritten with the parked "bunker" question, and `question_count` shrinks
   so the game ends right after it. One last question, then the results screen.
3. Answering the bunker question runs the **casualty census**: `candidate_json`
   is renamed in place — the ballot is now **The Dead / The Injured / The
   Irradiated / Short-term Survivors** — before the engine builds election
   night, so the tally shows the census.
4. That final screen is the **stock engine election map** — all the ACOP TV
   treatment (frame, CRT, scoreboard pills, state cards, SVG smoothing, lamp
   glow, noise gif) stands down. Clean slate to build a nuke-themed screen on
   later.

## The five moving parts (all in Code 2 unless noted)

| Piece | What it does |
|---|---|
| `_NUKE_Q_PK` | **FILL ME IN** — pk of the bunker question. `null` = inert. |
| `_nukeWar` (0/1/2) | run state: 0 none · 1 armed · 2 census applied. In `_SL_SCALARS`. |
| `_everyTurn(() => { if (defcon <= 1) _nukeArm(); })` | the watcher. |
| `_nukeArm()` | `_tunnel()`s the bunker into `question_number+1`, sets `question_count = question_number+2`, `has_visits=0`. Fails safe if the pk isn't parked. |
| `_nukeCensusOnAnswer(ans)` (called from `cyoAdventure`) | when the answer belongs to the bunker question, runs `_nukeApplyCensus()` and sets `_nukeWar=2`. |
| `body.acop-nuke` | stamped from `_nukeWar>0` in the shared observer. **This is the signal Code 1 reads.** |
| Code 1 `__isFinalElectionMap` / `__isElectionNight` | return `false` under `body.acop-nuke` → no TV chrome/scoreboard/state cards. |
| Code 2 `_checkAndSimplify` | early-returns under `_nukeWar>0` → no smoothing/lamp/labels. |
| Code 1 CSS `body.acop-nuke #map_container` | drops the TV noise gif. |

## To turn it on

1. **Author the bunker question** in `questions_json` (Code 2) — a one-answer
   "the missiles are inbound" beat. Park it PAST the normal played range, the
   same way the campaign-length tail is parked (any pk the normal run never
   reaches). Give it its answer(s) in `answers_json` with
   `fields.question = <its pk>`.
2. Set `var _NUKE_Q_PK = <that pk>;`.
3. That's it. Optionally retune `_NUKE_CENSUS` (candidate pk → name/colour) —
   it currently maps the four categories onto Nixon(10701)/Opposition(50000)/
   Media(60000)/Nuts&Kooks(70000); change pks, labels, `color_hex` freely. A pk
   not in `candidate_json` is skipped.

Optional polish for the bunker beat: set the advisor image via `advisorOverrides`
on its answer pk, or route a stinger through the soundtrack — same as any other
question.

## Save / load & New Game

- `_nukeWar` is in `_SL_SCALARS`. On restore, if it's ≥2 the candidate rename is
  re-applied (`candidate_json` itself isn't snapshotted). In practice you can't
  save mid-branch — saves are PART-transition only and the branch is terminal —
  so this is just belt-and-braces.
- New Game (`_nukeReset()`) unwinds the rename (originals snapshotted at load in
  `_NUKE_CAND_ORIG`), clears `_nukeWar`, and drops `body.acop-nuke`.

## Later: the nuke-themed screen

Everything above deliberately leaves the *stock* engine screen. When you build
the themed version, hang it off `body.acop-nuke` (already present the whole
branch) — e.g. a new `__mapVisitTick`-style treatment gated on that class, or a
`themeSwap('Fallout')` fired from the bunker question's answer effect.

## Verified

`nuke_check.js` — 21/21: inert-until-authored, arm (slot + count + visits),
arm idempotent, normal-answer-doesn't-trip-census, bunker-answer census
(rename + recolour), body-class stamp, both detectors stand down, New Game
unwind + detectors live again. Regressions green: enight 8, statecard 18,
scoreboard 7, visitmap 15, tvcard 6, saveload 10 (TV treatment still fires
normally without the nuke class).
