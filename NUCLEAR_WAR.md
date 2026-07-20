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
   62M, Irradiated 60M; `target: null` = that row takes the balance
   (Survivors, ≈57M). The targets are authored so the TOP row VARIES by
   state: Injured leads nationally (so it tops most states), but in the
   heavily-struck states the fallout-concentrated Irradiated overtakes it;
   Survivors sit just below both (deliberately reduced from the old ≈84M so
   the map isn't a wall of one colour), and the Dead never top. A wrapper
   over the engine's global `A()` (LBM's alt-voting pattern) fires at
   `_nukeWar ≥ 2` and re-deals every state's rows to those shares
   (`target/_NUKE_TOTAL_POP`) with ±12% relative per-state jitter
   (renormalized) so the map varies; votes re-split the state's cranked
   turnout, non-census candidates (pk 92 residue) drop to 0, rows re-sort,
   and `getLatestRes` is re-run so nn2/nn3 agree. Answer-score nudges could
   NOT do this: they multiply whatever support the run has, so authored
   absolute totals are unreachable that way.
   **Concentration (urban + fallout):** a census entry can concentrate in a
   subset of states while its NATIONAL total is conserved — its state share
   scales by a per-state weight whose turnout-weighted mean is 1, and the
   non-concentrating categories rescale per state to fill the remainder (a
   clamp keeps two concentrating rows from ever crowding the rest out).
   `urban: true` (the Dead) uses `_NUKE_URBAN[abbr]` — 1970-census tiers: DC
   1.8; NY/CA/NJ/RI/MA/IL/MD/CT/PA/OH/TX 1.6; MI/FL/DE/WA/MO/CO/AZ/NV/HI/UT
   1.3; NC/SC/KY/AL 0.7, IA/NE/KS 0.8; the rural/plains 0.55; unlisted 1.0.
   `fallout: true` (the Irradiated) uses `_NUKE_POP_W[abbr]`, AUTO-derived
   from each state's turnout (a tempered `^0.6` pop ratio) — radiation is
   worst where the most warheads ground-burst, i.e. the biggest, most-
   targeted states (the same turnout signal that drives salvo size + the
   barrage). Verified over the real 51-state data: national totals land on
   31M / 62M / 60M / 57M, Injured tops the 42 smaller states, Irradiated
   tops the 9 biggest (CA/NY/IL/PA/OH…), Survivors and Dead never top; ~19%
   dead in NY/CA vs ~6% in WY/ND.
5. **The strike timetable replaces poll closings.** A wrapper over the
   engine global `electionNight` (LBM wraps it the same way) re-deals every
   state's `result_time` from `_NUKE_STRIKE_WAVES` once the census is live
   (engine clock 0..480, one +10 tick per 2s ≈ 96-second evening): wave 1
   (t 15–60) ND/DC/MT/MO/GA/VA — the missile fields and the command
   structure; wave 2 (t 80–220) the ten most populous states; wave 3
   (t 240–440) everyone else (unlisted states take the last wave). Random
   within the window; pre-census the stock marginTime schedule is untouched.
6. **Missiles on the map (Code 1, grep `incoming-missile animation`).** On
   Election Night under nuke, a fill MutationObserver on the map svg turns
   each state's call-recolour (default `#c8a070` → its census colour,
   recognised via `window.__nukeCensusColors` from Code 2) into a strike at
   the state's centroid: a tracer + the missile SVG (`_NUKE_MISSILE_IMG`,
   file.garden noun-nuclear-5884718; `_NUKE_MISSILE_SIZE` sizes it (32),
   `_NUKE_MISSILE_UP` tunes the artwork's nose angle) flies in over
   `_NUKE_FLIGHT_MS` (1400ms) — most drop near-vertically from the TOP of
   the map (ICBMs over the Arctic from the USSR), and `_NUKE_SLBM_SHARE`
   (~22%) come in shallow from the RIGHT edge (Atlantic submarines) — then
   flash + shockwave ring + an ANIMATED
   MUSHROOM CLOUD (procedural stem+caps that grow, rise and fade over
   `_NUKE_IMPACT_MS`; `_NUKE_CLOUD_SCALE` sizes the whole cloud — 1.5 ≈ 50%
   bigger — and scales both the procedural cloud and a custom
   `_NUKE_IMPACT_IMG` animated gif/webp per impact). Every ground burst is
   RECORDED for the final-map aftermath layer regardless. The LIVE
   persistent scorch circle on the Election Night map is separate and
   OPTIONAL — it ships OFF (`_NUKE_SCORCH = false`), so the state's colour
   change is the only live mark; flip it true to bring back the scorched
   earth during the count (the aftermath damage map is kept either way).
   **The colour change is DEFERRED to the warhead's impact**: when the
   observer sees the engine call a state, it captures the census colour,
   reverts the state to its pre-call fill, and hands the colour to the LEAD
   warhead's `onImpact` — so the map goes red *as the missile lands*, not
   ~1.4s before. A `path.__nukeStruck` flag stops the at-impact repaint from
   launching a second strike. Fallbacks paint the colour immediately where no
   warhead flies (low demand mode, reduced motion, no-WAAPI, a state with no
   bbox), so a state can never get stuck on its pre-call colour. The state's
   **wire-feed obituary and the broadcast-degradation tick ride the same lead
   warhead** (`onLeadImpact` bundles colour + wire + degrade), so the whole
   "state falls" beat coincides with the impact rather than the launch.
   Same-value repaints, hover styles and
   non-census recolours don't fire; the final map repaints all-at-once so
   the observer only attaches on Election Night and disconnects on leaving.
   Low demand mode skips the animation entirely; prefers-reduced-motion
   gets just the scorch (if enabled).
   **Re-centring hits:** warheads aim at the state path's bounding-box
   centre; for odd shapes (panhandles, islands) add an `{x,y}` svg-unit
   nudge per abbreviation to `_NUKE_HIT_OFFSET` (e.g. `FL:{x:4,y:-12}`) to
   move that state's whole barrage together. Dial it in against
   `ACOPNuke.demo()`.
7. **The Electoral College did not survive the exchange.** The census also
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
8. That final screen is the **stock engine election map** — all the ACOP TV
   treatment (frame, CRT, scoreboard pills, state cards, SVG smoothing, lamp
   glow, noise gif) stands down. Clean slate to build a nuke-themed screen on
   later.

## The broadcast package (Jul 2026)

The nuclear Election Night is a dying broadcast, not a graphics demo. All
Code 1 unless noted, all hanging off the existing ticks; every piece has a
low-fx and/or reduced-motion opt-out:

- **EBS takeover** — the opener popup becomes the Emergency Broadcast
  System: header retitled, SMPTE colour bars replace the advisor photo
  (`.nuke-ebs` CSS), and the warning text itself is swapped in Code 2
  (`_NUKE_ELECTION_POPUP` over `campaignTrail_temp.ElectionPopup`,
  restored with the census). `_NUKE_EBS_TONE_URL` (the file.garden EBS ogg)
  plays the two-tone attention signal once. The ACOP News opener sets (sting +
  title card) are gated off under nuke in Code 2.
- **EBS intro still** — when OK dismisses the opener, a full-map image
  (`_NUKE_EBS_INTRO_IMG`, the file.garden `ebs.jpg`) fades in and out over
  3s inside `#map_container` (`#nuke-ebs-intro`, WAAPI opacity, self-removing).
  `__nukeEbsIntroTick` ARMS while the opener is up (no `#overlay_result_button`)
  and FIRES once the popup is gone — once per night (`__nukeEbsIntroPlayed`,
  re-armed by `__nukeStrikeWatch` on a fresh svg). Sized to cover the map
  (`inset:0; object-fit:cover`), z-index 2 so it sits UNDER the CRT
  scanlines/vignette/flare and carries the map's `sepia/saturate/brightness`
  filter (dropped under low-fx). `'' = no still.
- **Civil-defense chyron** — `_NUKE_CHYRON_TEXT` crawls along the bottom
  of the map on both terminal screens (`#nuke-chyron`, 36s loop; static
  under low-fx/reduced-motion).
- **Wire feed** — each state's fall prints a timestamped line bottom-left
  ("10:41 PM — CONTACT LOST WITH MINOT"): templates in `_NUKE_WIRE_LINES`,
  target cities in `_NUKE_CITY` (retune freely), clock derived from the
  engine's "% complete" line (8 PM → 2 AM EST).
- **Broadcast degradation** — every hit thickens a static overlay
  (`#nuke-degrade`, reuses the noise gif, capped at 0.35); occasionally a
  dark "PLEASE STAND BY" slate blinks up 380ms (throttled ≥9s apart, max
  4/night, skipped under reduced-motion).
- **NORAD early warning** — Code 2 publishes the strike schedule
  (`window.__nukeSchedule`); Code 1 shows "INBOUND TRACKS: NN" (top right)
  and pulses an amber blip on each state due within ~8s (blips skipped
  under low-fx; steady under reduced-motion).
- **MIRVs** — salvo size scales with the state's share of the national
  count (≥5% → 3 warheads, ≥2.5% → 2), spread across the state, staggered.
- **The gratuitous barrage** — `_NUKE_RESTRIKES` (20) extra warheads keep
  raining on the biggest states (share ≥ 2.5%) all night, allocated
  proportional to size (real data: CA/NY 3 each, the industrial belt 2
  each) and landing at random inside `_NUKE_RESTRIKE_DELAY` (3–45s) after
  each state's declaration. Half air-burst; ~30% print a re-strike wire
  line (`_NUKE_RESTRIKE_LINES`: "SECOND SUN OVER {C}"…). Purely
  theatrical, no tally effect; guards bail if the screen is gone, the war
  unwound, or low demand mode toggled mid-night. 0 = off.
- **Air bursts vs ground bursts** — the lead warhead always ground-bursts
  (cloud + scorch, recorded); follow-ups may air-burst: bigger flash,
  wider shockwave ring, nothing left behind.
- **Aftermath** — the final map rebuilds every ground-burst as smoke +
  char (`#nuke-aftermath-layer`) from `window.__nukeScorches` (cleared
  when `body.acop-nuke` drops), and the state panel is retitled DAMAGE
  ASSESSMENT on both terminal screens.
- **Sound** — `_NUKE_EBS_TONE_URL` at the open (wired to the file.garden
  EBS ogg), `_NUKE_RUMBLE_URL` per impact (FILL ME IN; throttled to one per
  2.5s, silent until set).
- **Screen judder + static flare** — the whole game window shakes slightly
  after a random run of impacts (gap uniform in
  `[_NUKE_JUDDER_MIN, _NUKE_JUDDER_MAX]` = [5,15]: mean 10 ≈ 1-in-10, hard
  floor 5 ≈ 1-in-5 so it never chains; ~9 shakes over the ~90-impact
  sequence), and a TV-static flare (`#nuke-flare`, screen-blended noise gif)
  bursts over the map at the SAME moment (the big-blast beat — not every
  impact). Both `__nukeImpactTick`-driven, both skipped under low demand mode
  and reduced-motion; the judder schedule re-rolls per Election Night.

## Previewing it (no bunker question needed)

From the browser console, any time in a run: **`ACOPNuke.demo()`** — fires
the census (rename + turnout crank + EV zeroing) and jumps straight to the
nuclear Election Night via the engine's own skip pattern
(`final_state_results = A(1)` → `electionNight()`). Missiles, strike
timetable, CASUALTY CENSUS scoreboard and the final screens all run live.
Also: `ACOPNuke.arm()` (defcon → 1), `ACOPNuke.census()` (apply without
changing screens), `ACOPNuke.reset()` (unwind — note it reinstalls the
pristine question order, so treat a mid-run demo as end-of-session testing).

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

`nuke_check.js` — 87/87: inert-until-authored, swap-arm (slot + displaced
question parked + pk-permutation intact + count + visits), arm idempotent,
normal-answer-doesn't-trip-census, bunker-answer census (renames the four
ballot candidates, The Media untouched, recolour, derived turnout multiplier
lands 210M, idempotent re-apply, pristine restore incl. New Game; split
shares from targets, A()-wrapper dormant pre-census then Survivors lead,
urban/rural dead shares exact + toll conserved + per-state sums 1, Dead/WY
within jitter bands, pk-92 zeroed; strike timetable dormant pre-census then
waves land ND/CA/unlisted correctly; state EVs zeroed by the census +
restored on New Game/pre-census load, panel h3 retitled CASUALTY CENSUS and
unwound; missile strikes: call-recolour → tracer+missile+scorch, same-value
and non-census recolours inert, low-fx inert, procedural cloud spawns,
observer detaches off Election Night AND re-attaches on return (svg-identity
tracking, not a sticky flag), SLBM branch off the right edge + polar branch
from the top under a stubbed Math.random; broadcast package: EBS popup text
swap + restore, opener-set gates, schedule published/nulled, EBS dressing
idempotent, chyron mount/teardown, NORAD counter + blip lifecycle over the
% line, 3-missile MIRV, 1-scorch air-burst salvo, wire-feed line with clock,
degradation overlay, re-strike quotas 12/8/0 + an 11-tracer barrage on a
short-delay clock, aftermath layer (self-healing on stale counts), DAMAGE
ASSESSMENT retitle + unwind, war-over cleanup), body-class stamp, both
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
