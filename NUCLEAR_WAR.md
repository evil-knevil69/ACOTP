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
2. At the next turn boundary the tunnel **arms**: the parked "bunker" question
   is **swapped** into the very next question slot (the displaced question moves
   to the bunker's old parked slot, so `questions_json` stays a pk-permutation —
   save/load's pk-order snapshot and the campaign-length restore both rely on
   that), and `question_count` shrinks so the game ends right after it. One last
   question, then the results screen.
3. Answering the bunker question runs the **casualty census**: `candidate_json`
   is renamed in place — the ballot is now **The Dead / The Injured / The
   Irradiated / Short-term Survivors** — before the engine builds election
   night, so the tally shows the census. At the same moment the **turnout
   crank** fires: every state's `popular_votes` (the engine's per-state
   turnout dial — total votes cast = `popular_votes × 0.95..1.05`) is scaled
   so the NATIONAL total lands on `_NUKE_TOTAL_POP` = **210M**, the whole
   1972 US resident population (baseline turnout ≈ 81.5M → multiplier ≈
   2.575, derived at load). The census counts everyone, not just voters.
   Always applied FROM the pristine `_NUKE_TURNOUT_ORIG` baseline
   (snapshotted at load), never from the live value, so re-application can't
   compound.
4. **The split is AUTHORED, not the run's politics.** Each `_NUKE_CENSUS`
   entry carries a `target` (national count of people): Dead 31M, Injured
   55M, Irradiated 40M; `target: null` = that row takes the balance
   (Survivors, ≈84M / 40%). A wrapper over the engine's global `A()` (LBM's
   alt-voting pattern) fires at `_nukeWar ≥ 2` and re-deals every state's
   rows to those shares (`target/_NUKE_TOTAL_POP`) with ±12% relative
   per-state jitter (renormalized) so the map varies; votes re-split the
   state's cranked turnout, non-census candidates (pk 92 residue) drop to 0,
   rows re-sort, and `getLatestRes` is re-run so nn2/nn3 agree.
   Answer-score nudges could NOT do this: they multiply whatever support
   the run has, so authored absolute totals are unreachable that way.
   Verified over the real 51-state data: ≈30.8M / 55.1M / 39.9M / 83.4M on
   ≈209M counted.
5. **The Electoral College did not survive the exchange.** The census also
   zeroes every state's `electoral_votes` (pristine counts in
   `_NUKE_EV_ORIG`, restored with everything else). The engine's own
   `noElectoralVotes`/`someStatesHaveEVs` guards then hide ALL the EV
   chrome by themselves: the "N /" prefix on the scoreboard rows, "270 to
   win", the state card's "Electoral Votes: N" line, and the EV columns on
   the results tables — leaving pure people-counts and percentages. With no
   EVs the 270 outcome popup never fires (election night runs to 100% →
   "Go to Final Results"; the loop's end condition is time/all-called, so
   it terminates normally) and the ending resolves through the
   no-electoral-majority path (`no_electoral_majority_message`/`_image` on
   the census candidates — worth authoring). The one hardcoded label,
   the panel's `ELECTORAL VOTES` `<h3>`, is retitled to **CASUALTY
   CENSUS** by Code 1's `__nukeTvTick` on the two terminal screens
   (idempotent, unwinds if the flag drops).
6. That final screen is the **stock engine election map** — all the ACOP TV
   treatment (frame, CRT, scoreboard pills, state cards, SVG smoothing, lamp
   glow, noise gif) stands down. Clean slate to build a nuke-themed screen on
   later.

## The five moving parts (all in Code 2 unless noted)

| Piece | What it does |
|---|---|
| `_NUKE_Q_PK` | **FILL ME IN** — pk of the bunker question. `null` = inert. |
| `_nukeWar` (0/1/2) | run state: 0 none · 1 armed · 2 census applied. In `_SL_SCALARS`. |
| `_everyTurn(() => { if (defcon <= 1) _nukeArm(); })` | the watcher. |
| `_nukeArm()` | swaps the bunker into slot `question_number+1` (displaced question takes the bunker's parked slot), sets `question_count = question_number+2`, `has_visits=0`. Fails safe if the pk isn't parked. |
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
   Nuts&Kooks(70000)/Hippies&Bums(80000); change labels and `color_hex` freely,
   but **keep the pks on ballot participants**: the engine tallies
   `candidate_id` + `opponents_default_json` = 10701/50000/70000/80000 (pk 92 in
   the opponents list is stock-data residue with no `candidate_json` entry and
   never displays; 60000 "The Media" is NOT on the ballot, so a census row on it
   would never appear). A pk not in `candidate_json` is skipped.

Optional polish for the bunker beat: set the advisor image via `advisorOverrides`
on its answer pk, or route a stinger through the soundtrack — same as any other
question.

## Save / load & New Game

- `_nukeWar` is in `_SL_SCALARS`. On restore: at ≥1 `has_visits` is re-zeroed
  (election_json isn't snapshotted, and a PART transition CAN fall between
  arming and the bunker); at ≥2 the census is re-applied — candidate rename +
  turnout crank (`candidate_json`/`states_json` aren't snapshotted); below 2
  the pristine names + turnout are restored instead, so loading a pre-census
  save never keeps a lingering census from earlier in the session. Question
  order + count come back via the save system's own snapshots — the swap keeps
  the array a pk-permutation, which is what `_slRestoreQuestionOrder` requires.
- New Game (`_nukeReset()`) unwinds the rename + turnout crank (originals
  snapshotted at load in `_NUKE_CAND_ORIG`/`_NUKE_TURNOUT_ORIG`), clears
  `_nukeWar`, drops `body.acop-nuke`, restores
  `has_visits` (from `_NUKE_VISITS_ORIG`), and — because the New Game branch's
  own `_installCampaignLength()` call runs earlier and early-returns when the
  length didn't change — forces a pristine question-order + count reinstall
  (`_lengthInstalled = null` + `_installCampaignLength()`). Without that, a New
  Game after a nuke run kept the shrunk `question_count` (game ended after a few
  questions), left the bunker sitting mid-run, and never turned visits back on.

## The nuke map skin (Jul 2026 — first pass)

The stock screen is now dressed as a war-room feed. Mechanism (all Code 1):
the two screen detectors were split into raw checks (`__isFinalElectionMapRaw`
/ `__isElectionNightRaw`) plus the nuke-guarded wrappers, and a new observer
tick `__nukeTvTick` stamps **`acop-nuke-tv` on `#game_window`** when
`body.acop-nuke` is up AND a raw detector fires — so ONLY Election Night and
the final results map get the skin (the armed phase's in-game map and the
other final screens stay stock). The look is pure CSS in `customStyling`
(grep `acop-nuke-tv`):
- **Background:** the same TV noise gif as the electoral map (the old
  `body.acop-nuke` drop-the-gif rule is gone).
- **Effects:** the world map's SIGINT package minus the green phosphor —
  CRT scanline `::after` + tube-edge vignette `::before` overlays on
  `#map_container` (same gradients/z-order as `wm-sigint-css`,
  pointer-events:none so state clicks land) and the SIGINT colour wash on the
  map svg without the `hue-rotate(80deg)`:
  `sepia(0.3) saturate(1.4) brightness(0.85)`.
- **Low demand mode:** the full-map filter is dropped (same reason SIGINT is
  locked off on the world map); the static gradient overlays stay; the low-fx
  flat-#111 background override still outranks the gif.
Anything further (headline chyron, casualty read-out dressing, themeSwap from
the bunker answer) hangs off the same two hooks: `body.acop-nuke` +
`#game_window.acop-nuke-tv`.

## Verified

`nuke_check.js` — 58/58: inert-until-authored, swap-arm (slot + displaced
question parked + pk-permutation intact + count + visits), arm idempotent,
normal-answer-doesn't-trip-census, bunker-answer census (renames the four
ballot candidates, The Media untouched, recolour, derived turnout multiplier
lands 210M, idempotent re-apply, pristine restore incl. New Game; split
shares from targets, A()-wrapper dormant pre-census then Survivors lead,
Dead within jitter band, pk-92 zeroed; state EVs zeroed by the census +
restored on New Game/pre-census load, panel h3 retitled CASUALTY CENSUS and
unwound), body-class stamp, both
detectors stand down, New Game unwind (names + question order + count +
visits, from census AND from merely-armed) + detectors live again, and the
armed-save restore re-zeroes visits. The New-Game restore path drives the
REAL `_installCampaignLength`/`_rebuildQuestionIdxMap`. The skin section
drives the REAL raw detectors + `__nukeTvTick` + `customStyling` CSS: class
stamped on the terminal screen only, gif kept, scanlines + vignette computed
live, filter = SIGINT minus hue-rotate, low-fx drops the filter but keeps the
overlays, in-game map while armed NOT dressed, teardown when the class
clears. Regressions green: enight 8, statecard 18, scoreboard 7 (+edge 5),
visitmap 15, tvcard 6, saveload 10, length 9, lowfx 24, trio 9, sting 9,
enightsets 9 (TV treatment still fires normally without the nuke class).
