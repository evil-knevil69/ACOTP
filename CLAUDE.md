# ACOP Nixon/Agnew — Campaign Trail Mod

## Session startup (ALWAYS do this first)

The remote git server resets between sessions. At the start of every session, run:

```bash
git fetch origin claude/document-claude-capabilities-7p897
```

Then check divergence:

```bash
git status
```

If the output says "Your branch and 'origin/...' have diverged" **with local ahead**, immediately force-push:

```bash
git push --force-with-lease -u origin claude/document-claude-capabilities-7p897
```

Do this before any other work. This keeps the remote in sync so the user can test the mod.

## Branch

Development branch: `claude/document-claude-capabilities-7p897`

Always push here. Never push to main/master.

## Project

`ACOP Nixon_Agnew.txt` is the single mod file loaded by Campaign Trail. It runs inside `new Function()`, so:
- Use `var` for module-level declarations (not `const`/`let` at the top scope)
- Never declare the same `const`/`let` name twice in the same block scope — it causes a parse-time `SyntaxError` that prevents the mod from loading

---

## How-to: alternate (alt) tooltip for a term — "one-bit flip"

Any Q&A term with a tooltip can show a **second** version of its card on demand,
chosen per-occurrence when you write the text. Default occurrence → normal card;
an occurrence you mark → alt card. (e.g. Kissinger normally "Read a book.",
marked "Former National Security Adviser, current professional gossiper.")

**Step 1 — give the `tooltipList` entry an `alt` (in `ACOP Nixon_Agnew.txt`, grep
`const tooltipList = [`).** Only put the fields that change; anything omitted
from `alt` falls back to the default. Usually just `body`.

NOTE on aliases (Jul 2026): a person with several trigger strings is now ONE
entry with `searchStrings: ["Henry Kissinger", "Kissinger"]` — an expansion
pass right after the array clones it per alias (shared img/label/body/alt, so
the person is edited once). `label` may be omitted (defaults to the first
alias). Never hand-duplicate a card per alias again:

```js
{
    searchString: "Kissinger",
    img: "…/kissinger.jpeg",
    label: "Henry Kissinger",
    body: "You know who he is. Read a book.",
    alt: { body: "Former National Security Adviser, current professional gossiper." }
    // alt can also override img and/or label, e.g. alt: { body:"…", img:"…/memorial.jpg" }
},
```

**Step 2 — in the question / answer / feedback text, wrap the occurrence you want
flipped** in `<span data-tip>…</span>`:

```
Normal:  …I spoke to Kissinger about it…                  → default card
Flipped: …<span data-tip>Kissinger</span> is talking again → alt card
```

Notes:
- The marker's **value is ignored** — `data-tip`, `data-tip=""`, `data-tip="dead"`
  all flip identically. Presence is the whole signal.
- It's **per-occurrence and decided at write time** (not a runtime game-state flag),
  so the alive/before and dead/after versions can live in different question beats.
  If you ever need the SAME on-screen text to change as the game progresses, that's
  a different mechanism (make the body a function of a state flag) — ask for it.
- The text inside the span **must exactly equal the `searchString`** (`Kissinger`).
  A mismatch fails safe: the span is left as written, no card, no crash.
- Mechanics: `applyTooltips` is untouched; a wrapper `applyTooltipsMarked`
  (~line 15176) hides marked occurrences, runs the normal auto-matcher, then
  restores them as the alt. Don't worry about it — just use `alt` + `data-tip`.

---

## Change log — session starting ~23:30 BST 7 Jun 2026

### ACOP Nixon_Agnew.txt

**1. Toggle persistence (module-level vars)**
Four `var` declarations added immediately before `function openWorldMap()`:
```js
var _wmFlagsOn     = false;
var _wmEventsOn    = true;
var _wmCapitalsOn  = false;
var _wmAllegiance  = false;
```
Write-backs added in all four toggle button click handlers (Events, Capitals, Flags, Allegiance) so state survives the map being closed and reopened. Initial button visual state (bold + outline) set on open.

**2. Capital pins feature**
- `CAPITAL_DATA`: object mapping ~90 country codes to capital city names
- `CAPITAL_OFFSETS`: manual pixel offsets for countries where the geographic centroid is wrong (19 entries as of 8 Jun — see item 7 below)
- Capital dots rendered as SVG circles on a `capGroup` `<g>` element
- Visible only when zoom scale ≥ 1.2, or when Move Capitals edit mode is active
- Tooltip on hover showing capital name
- "Move Capitals" button in the world map toolbar — enter drag-to-reposition mode; offsets saved to `_capMovedOffsets` in memory

**3. Move Icons tool**
Drag-to-reposition mode for event icons. Orange button in toolbar. Offset panel shows `positionOffset` values to paste back into `_EVENT_DEFS`.

**4. Move Flags tool**
Drag-to-reposition mode for flag overlay images. Auto-shows flags when entering mode. Offset panel shows `FLAG_CENTRES` values.

**5. Event icon click-through (small countries)**
For each event icon, a transparent clone of the underlying country `<path>` is appended to the icon group as a hit area (falls back to r=8 circle if no country path found). `_fwdClick` handler: temporarily hides the icon group, `flagOverlayG`, and capital group → calls `elementFromPoint` → restores visibility → re-dispatches the mouse event to whatever is underneath. Skips if `_editMode` is active.

**6. Coup (tank) icon green fill**
Transparent internal areas of the tank SVG (turret interior, gun barrel, body connector strip, 4 wheel axle holes) filled with `#1F9823`. Implemented as a second `<path>` in the coup icon definition rendered on top of the black path.

**7. Capital offsets — batch 1 (8 Jun)**
Added to `CAPITAL_OFFSETS`:
```
KP: { x: -14, y: -2  }   KR: { x: -20, y: -20 }   IE: { x:  -6, y: -13 }   FI: { x:  -4, y:   8 }
AF: { x:  -4, y: -13 }   JP: { x:   6, y:   4 }   DD: { x:  -8, y: -14 }   DK: { x: 133, y:  55 }
IS: { x: -16, y:  -8 }   TR: { x: -22, y: -13 }   ES: { x:  20, y: -57 }   EG: { x: -11, y: -24 }
ZA: { x:   0, y:   0 }   KH: { x: -14, y:  -9 }   TH: { x: -23, y:  16 }   VN: { x: -15, y:   5 }
TW: { x: -11, y: -12 }   IT: { x: -15, y: -12 }   AT: { x: -11, y: -11 }
```

**8. Expanded FLAG_CENTRES**
Many more countries added with accurate SVG centroids (GB, FR, DE, PT, ES, NL, US, MX, CA, HT, CU, BR, CL, AR, and ~40 others).

**9. New event variables and events**
Many new `var` declarations and `_EVENT_DEFS` entries added (guatemalaQuake, tangshan, mississippi, hondurasCoup, bananagate, rwandaCoup, afghanCoup, nigerCoup, greekCoup, ethiopianRevolution, dergCoup, uruguayCoup, chileanCoup, upperVoltaCoup, tacnazo, argentineCoup, northYemenCoup, oromoUprising, sahrawiInsurgency, _allendeSpeechPlayed).

**10. Allende Easter egg**
On first world map open after `chileanCoup === 1`, Allende's last speech is injected into the music playlist. Live audio URL wired in (`https://audio.jukehost.co.uk/019ed31c-9934-7032-afc3-1cba278a45ac`) — no longer a placeholder.

**11. SVG cache**
`_svgTextCache` prevents re-fetching the SVG on every `openWorldMap()` call.

**12. Tooltip improvements**
Width 270px (was 216px), font sizes increased, image placeholder removed when `def.img` is null.

**13. Save/Load system (Jul 2026, ported from Obamanation's SaveLoadSystem)**
In Code 2, immediately before `showSectionTransition`. ONLY reachable from the PART
transition screens (a "Save / Load" button next to Continue in the transition overlay) —
deliberate anti-savescumming: one checkpoint opportunity per phase. Storage: IndexedDB
`ACOPSaves`/`gameSaves`, persists across New Game and reloads. Key adaptations vs
Obamanation: mod scalars are captured/restored via direct `eval` over `_SL_SCALARS`
(153 names — window[name] doesn't work inside new Function(); ADD NEW PER-RUN VARS TO
THIS LIST); const containers (`_shownTransitions`, `_clemencies`, `_pausedUntil`,
`_diploCooldown`, `_actionCrimes`, `COUNTRY_LOYAL`, `_RESHUFFLE`, `*_STAB` window vars)
restored by mutation; `questions_json` pk order + `answers_json` question-assignment
snapshotted (questionSwapper/answerSwapper support; effect-json swaps NOT snapshotted —
extend if `answerSwapper(…, true)` goes live); on load `_lastQNum`/`_lastQuestionPK` are
synced before the observer ticks so the restored (lower) question_number isn't read as a
New Game and wiped; `_musicSectionPending` re-enters the phase's music section. Console
access: `window.ACOPSaveLoad`.

**14. Final election map = TV treatment (Jul 2026)**
The election-night results map (engine `finalMapScreenHtml`) now gets the SAME TV look as
the in-game electoral map: noise-gif background, ELECTIONMAPTV.png frame, CRT glass +
scanlines, and RDP-smoothed SVG boundaries with thick strokes + lamp-glow + state labels.
Mechanism: both the Code 1 chrome (`__mapVisitTick`) and the Code 2 smoothing
(`_checkAndSimplify`) were gated on `#resume_questions_button` (in-game map only); both now
ALSO fire when `__isFinalElectionMap()` is true — the disabled `#final_election_map_button`
plus a rendered `#map_container svg` (exclusive to that screen; the other final screens have
the button enabled and no usmap). The only divergence is the footer: the in-game map's 2
buttons sit at top:580/left:600, but the final map has 6 nav buttons, so `#game_window` gets
an `acop-final-tv` class and override CSS re-lays them as a centred row (tunable: the
`bottom` value in the `.acop-final-tv #map_footer` rule) with `#game_window` forced
position:relative for a deterministic anchor. Noise gif URL moved to file.garden. The map
background + result-panel drag-positioning were already shared (ungated), so no change there.
Scoreboard: on the final map the EV readout (`#overall_result`) is dressed as the 1976 ACOP
News broadcast graphic — `__scoreboardTick` (a second observer subscriber) rebuilds each
`<li>` ("Name: EV / PV%") into name/num spans carrying the candidate colour as
`--pill-color`, appends an "ACOP News Projection" footer, and the `.acop-final-tv
#overall_result` CSS renders gold-framed RECESSED pills, EMBOSSED glowing text, a red
radial card and CRT scanlines (0.4px blur for the tube softness). Idempotent PER <li>
(not one-shot): Election Night rewrites the <ul> every ~2s, so each tick re-dresses only
unclassed rows; the projection footer is a <div>, NOT a <p> (the engine's
`$('#overall_result > p').html(…)` tally update would overwrite a <p> footer).
Election Night (engine `electionNight()`, detected by `#final_result_button` — unique to
that screen) gets the full treatment too: TV chrome + smoothing gates extended in both
files, same `.acop-final-tv` class (its footer flex row centres the single
"Go to Final Results" button). Both cards carry a gentle CRT flicker
(`acopScoreFlicker`, opacity-only, 4.3s loop; the state card runs it -2.15s out of phase);
the whole flicker block sits in a `prefers-reduced-motion: no-preference` media query, so
OS-level "reduce motion" gets steady cards. `__isElectionNight()` also stays true through
the "Processing Results, wait one moment…" beat (footer swapped, button gone, but
`#overall_result ul` + `#state_result` + map svg still up) — otherwise the TV tore down and
the cards flashed back to sticky notes between Election Night and the results screens. That
beat-fallback REQUIRES `#state_result`: the VISIT map and the in-game "Estimated Support"
map also pair `#map_container svg` with an `#overall_result ul`, but use `#state_info`, so
without the `#state_result` discriminator the TV chrome (`logo-hide-style`) + `.acop-final-tv`
scoreboard bled onto those screens (visit map showed the TV layer, its overall_result got
the scoreboard pills, and the header/window sizing conflicted with `visit-hide-style`). The TV frame
PNG + noise gif are in the preloader's idle tier (Code 2) so the first map open doesn't
pop in. Projection sting: when the outcome popup fires at 270 (engine `showOutcomePopup`,
detected by its unique `#overlay_result_button`), Code 2 plays `_PROJ_STING_URL` (FILL ME
IN — the ACOP News election night theme) through `_playEggAudio`; once per run
(`_projStingPlayed`, New-Game-reset + in `_SL_SCALARS`), silent while the URL is unset.
Opening-of-coverage sting, same conventions: `_ENIGHT_STING_URL`/`_enightStingPlayed`
fires on the advisor popup that opens Election Night ("Election night has arrived.
Settle in…") — `#election_night_window` + `#final_result_button` WITHOUT
`#overlay_result_button` (only the 270 popup carries that). Opening title animation
(`_ENIGHT_INTRO` {url FILL ME IN, durationMs}, `_enightIntroPlayed`): observer state
machine ARMS while that opener popup is up and FIRES when it's dismissed — an <img>
overlaid centre-map inside `#map_container` (z1: above the map, under scanlines/frame),
pointer-events none, fades in/out and self-removes after durationMs (gifs don't report
an end).
State card: `#state_result` (Election Night + final map ONLY — the in-game map uses
`#state_info`, untouched) is dressed as the ACOP '76 per-state graphic by
`__statePanelTick` (third observer subscriber): "EV / STATE / PRESIDENT" header, then two
gold-rimmed royal-blue panels — candidate names + RAW VOTE COUNTS left, party abbr +
rounded % right (`_ACOP_PARTY_ABBR`; unknown parties → IND.). The engine's click handler
only writes "Name: 53.4%", so the card is REBUILT from `final_state_results` (`.votes`) +
`candidate_json` (`party`), looked up by the state name in the engine's first `<p>`; row
selection mirrors the engine exactly (`result.slice(0,4).filter(percent>0)`, engine
order). The engine rewrites `#state_result` innerHTML on every state click, so the tick
re-dresses whenever it sees a `<ul>` without `.acop-sr-head`. Fails safe: placeholder /
"returns not yet available" / unknown-state markup is left as-is (the CSS alone still
gives it the red card + broadcast text). Container widened to 240px under
`.acop-final-tv`; both panels' sticky-note tilt/yellow/pins neutralized there.

**15. Enemies List (Jul 2026, pattern from 1969-1972 Kennedy/Long's "File" pop-out)**
`openEnemiesPanel` (Enemies/Friends → Enemies List) now renders three columns from
`ENEMIES_ROSTER` + the `_ENEMIES` state container (Code 2, just before the Officials
panel data): TRAITORS (accretional + re-ranked by live `threat` score → label
CRITICAL/SEVERE/HIGH/ELEVATED/LOW), HYPOCRITES (the '76 Democratic field: authored
KL-style CLASS grade A–F + live `score` drives ranking; `[?]` hover = path-to-nomination
text + live Standing; starts with Kennedy/Humphrey/Jackson/Church/Bayh; Udall/Carter/
Brown join via events; section FREEZES at `_EN_CLOSE_PK` — FILL ME IN), THE MEDIA
(accretional only, insertion order; starts with 'Woodward & Bernstein' — ONE entry for
the pair, via `_EN_START_MEDIA`). Full handoff/authoring doc: `ENEMIES_LIST.md`. Authoring API: `enemyAdd(name[, startAt])`,
`enemyBump(name, delta)` (auto-adds absent names at roster default; media bump == add;
unknown names warn + no-op; hypocrite ops ignored after close). Console:
`window.ACOPEnemies`. Save/load: `_ENEMIES` is a const container —
`_enemiesSnapshot()/_enemiesRestore()` wired into `_slCaptureMod/_slRestoreMod`
(pre-feature saves fall back to the starting field); New Game reset calls
`_enemiesReset()`. Roster `img` URLs are all '' (FILL ME IN). ADD NEW PEOPLE TO
`ENEMIES_ROSTER`, not to the panel code.

**22. Cabinet reshuffle: two-turn window + random forced pick (Jul 2026)**
Reshuffle offers stay live for TWO turns (`_RESHUFFLE.offer(slots, opts)` stamps a
`grace`, default `_RS_DEFAULT_GRACE = 1` extra turn beyond the arming turn; `opts.grace`
overrides, `grace: 0` = the old one-turn deadline). The `_everyTurn` expire gate fires
only once `turn > active.turn + (active.grace || 0)`, and the Enemies/Friends + Officials
glow keeps pulsing the whole window. On lapse, unfilled slots are now DECIDED AT RANDOM
from that slot's candidates and seated (respecting `delay` → immediate or queued in
`pending`) — NOT left vacant — so a player can't dodge a malus-carrying official by
ignoring the offer. A slot offered with no candidates still falls vacant. Save-safe:
`active`/`pending` snapshotted wholesale; a legacy offer with no `grace` field reads as 0.
Manual line updated. Verified: reshuffle_grace_check 13/13 (incl. 400-trial random spread
across all candidates + delayed-pick queueing).

**21. Enemies/Friends button glows on new team-action charges (Jul 2026)**
Mirrors the reshuffle glow: when `_addTeamAction` grants a Hush Money / Cut Them Loose /
Clemency / Pin the Blame charge while the President's Men panel is NOT open, `_taUnseen`
is set and `#inner_circle_button` gets a `.ta-glow` (green `ta-pulse`, distinct from the
amber `rs-glow` so both can pulse at once). `addInnerCircleButton` re-applies it on each
engine re-render; `openInnerCircle` clears `_taUnseen`. Per-run flag in `_SL_SCALARS` +
New-Game reset. Manual line added. Verified: taglow_check 7/7.

**20. Placeholder people-tooltips from the question bank (Jul 2026)**
~60 new `tooltipList` entries (one per person, via `searchStrings` aliases; `img: null`)
auto-drafted from `CTS_Questions.docx` — everyone NAMED in the questions so far who
lacked a tooltip, EXCEPT the President's Men chart cards (which deliberately have none).
Bodies are first-draft (revise + add photos); block is comment-fenced "PLACEHOLDER
tooltips" right before the alias-expansion pass. Triggers avoid short/ambiguous words
(no bare Pat/John/Nelson/Al/Wilson/Jack/Kay). Nixon (the protagonist) and Agnew (the VP,
has a candidate card) are deliberately excluded. No duplicate triggers; verified 92
distinct people resolve against the real question text with no false hits.

**19. President's Men: exposure-radiation glow on the chart wires (Jul 2026)**
`_drawOrgLinks` now paints an ember glow under any connector currently carrying exposure
upward, mirroring the pressure engine's radiation rules exactly via a new `_expFlowLevel(src,tgt)`
(needs `_pressureOn` + `_lengthAllows('pressure')`; band from src exposure ≥2/≥5/≥8 → lvl 1/2/3;
cut-loose halves; flipped/hush-paused src radiates nothing; clean receiver (exp ≤2, or Nixon's
`WatergateExposure` ≤2 on the last rung) absorbs nothing; only along real `_ORG_EDGES`).
Bands are amber/orange/red (`_GLOW_STYLE`), blurred (`#nw-glow` filter), on a `#nw-glow-layer`
`<g>` appended FIRST so it haloes under the grey lines + red strings, pulsing faster when hotter
(`nwGlowPulse`, inside a prefers-reduced-motion query). Covers every route: CSS tree elbows
(re-traced as glow paths), the manually-plotted connectors (Colson→Hunt, the Hunt+Liddy join,
Mitchell→McCord), the red strings (`_drawOrgArc` now RETURNS its `d`; bidirectional strings take
the hotter direction), and the Nixon rung (per-inner-circle drops + the shared bar/stem glow at
the hottest feeder, up into Nixon's card). `_syncOrgStates` re-runs `_drawOrgLinks` so the glow
tracks live stat changes. Manual: "Watch the wires" line added. Verified: orgglow_check 9/9.

**18. President's Men: stat hover + Colson active (Jul 2026)**
Hovering any organogram card shows a tooltip with its card-back stats (Loyalty x/10,
Exposure x/10; Nixon = Watergate Exposure x/20) read LIVE from `_getOrgStat` — one
`#nw-hover-tip` element on `<body>` (the flip transforms would clip a child), hidden on
flip/mouseleave/no-data, replaced on re-render. Click-to-flip unchanged. `ColsonSTATUS`
start value 4 → 5 (Cut Loose → Active).

**17. Midterm engine reskin — 1970s broadcast (Jul 2026)**
`_MIDTERM`'s injected CSS (`#_mt_css`) redressed as the same ACOP-'76 package as the
Election Night cards: tube-black studio radial + full-screen CRT scanlines (::after,
fixed), embossed cream headline, gold-ruled tally header, seat tiles as dark recessed
"dead lamps" that light up in period red/blue inside gold rims when called (FLIP =
brighter gold ring + glow), verdict as a gold-ruled chyron, gold-rimmed pill buttons,
and the balance-of-power card as a red fade-to-black TV card with royal-blue gold-rimmed
chamber panels + `_mtFlicker` (own keyframes — Code 1's live only on map screens) inside
a prefers-reduced-motion query. NO filter:blur on the overlay (full-viewport layer cost).
Selectors/classes unchanged — the JS toggles them; reskin only. Party direction stays
D-red/R-blue. Verified: midterm_check.js 13/13 (mechanics roll + skin + reduced motion).

**16. Authoring ergonomics pass (Jul 2026)**
- AUTHORING INDEX comment boxes at the top of BOTH files — every content surface
  with its grep anchor, the cross-file sync pairs (achievement names,
  campaign-length keys), and the rules that bite (_SL_SCALARS, var-only, FILL ME
  IN/PLACEHOLDER greps). Banner comments added on the big engine-JSON blocks
  (questions/answers/feedback/states/issues/candidate scores).
- `tooltipList` alias support: `searchStrings: [..]` on ONE entry replaces the
  old hand-duplicated card-per-alias (7 people were duplicated); expansion pass
  sits right after the array. Matcher set verified byte-identical pre/post.
- Officials merged to ONE ENTRY PER PERSON: card-back `effects` text moved from
  the separate `OFFICIALS_EFFECTS` map onto each `OFFICIALS_ROSTER` entry
  (`effects:` — string, or post-varName-keyed map). `OFFICIALS_EFFECTS` now
  holds only `_DEFAULT`/`_VACANT` fallbacks. Card-back lookup verified identical
  for all people pre/post.

### A Cancer on the Presidency_init (draft).txt

No changes from this session — both Sandinista! and feature branch versions are identical.

### Infrastructure

- `.gitignore`: excludes `__pycache__/` and `.claude/` (worktree directories)
- `CLAUDE.md`: session-startup force-push instructions to prevent lost work from remote resets

---

## Pending — decided, not yet implemented

**P1. Question counter display → show turns lapsed (`_questionCount`), drop "of 25"**
Decision (23 Jun): change the on-screen question label from `Question X of 25` to just
`Question X`, where X is the mod's turn counter `_questionCount` (line 14311) — NOT the
engine's `question_number`. Rationale: the player should see *turns lapsed*, including free
conditional/counterfactual (`corQuestion`) questions, which advance `_questionCount` but not
`question_number`. The calendar dates convey how near the ending is; no ceiling is shown.

Implementation notes for when wired:
- Engine builds the label at `campaign_trail.js:1310`:
  `<h3>Question ${e.question_number + 1} of ${PROPS.PARAMS.question_count}</h3>`
- Do NOT fork the engine. Rewrite the `<h3>` text inside the existing mutation observer
  (`__onGameWindowMutation`, around `ACOP Nixon_Agnew.txt:14600`), right after the
  `_questionCount++` at line 14603 — at that point the counter is already bumped for the
  question on screen, so label and counter stay in sync with no off-by-one. First question
  reads "Question 1" (0 → 1).
- Purely cosmetic: the end-of-run trigger (`campaign_trail.js:1787, 1800`) reads
  `question_number` / `question_count` directly and never the label text, so the 25-slot
  hard stop is unaffected.
- Consequence to accept: because every free question increments `_questionCount`, the final
  turn will read higher than 25 (e.g. "Question 31") depending on how many conditionals fired.
  That is intended.

**P2. Follow-along transcription box (tape player component)**
Decision: build a standalone tape-player component that plays a White House tape audio clip
while a transcript scrolls/highlights in sync — a consequence-reward beat surfaced after
certain question outcomes. Parked until the question bank is tidied.

Design as discussed:
- Standalone entry point `openTapePlayer(key, container)` — self-contained, invoked from a
  question's outcome/effect (not tied to the world map or Milbal plumbing).
- Backing data structure `TAPE_EXCERPTS`: keyed by excerpt id, each holding the audio URL plus
  a cue-timed transcript (array of `{ t, speaker, text }` cues) so the displayed line tracks
  the audio position — highlight/auto-scroll the active cue.
- Candidate excerpts the user already has in hand: "Cancer on the presidency"; Kissinger
  apologising for the Fallaci interview; the 8 Jan 1973 pretrial conversations. The cancer tape
  is intended to split across two question beats — Nixon's reaction to the cancer briefing, and
  how he handles the hush money.
- Reward framing: it's a consequence-reward (you earn the tape by reaching a state), not a
  free-floating museum feature.

**P3. Historicity highlights — question-bank import pipeline**
The TOGGLE and CSS are already built (init file): a "Historicity" checkbox sits under
the Educational-tooltips checkbox on the pre-game screen, OFF by default, persisted in
localStorage (`acop_historicity`), gating `body.historicity-on`. Two span classes are
live and styled:
- `<span class="hist-v">…</span>`  — POWDER BLUE: verbatim text from the very
  date/meeting the question depicts.
- `<span class="hist-vo">…</span>` — LIGHT YELLOW: verbatim text, but from another
  time/occasion.
With the toggle off the spans are invisible (plain text) — safe to bake in freely.

STILL TO DO when the question bank arrives: the user will deliver the full Q&A text in
ONE docx, with the two categories marked as text highlights (blue-ish highlight →
`hist-v`, yellow highlight → `hist-vo`). Convert the docx runs to spans on import
(docx = zip; `word/document.xml` runs carry `<w:highlight w:val="…"/>` in `w:rPr` —
map cyan/blue vals → hist-v, yellow → hist-vo), then splice the span-marked text into
questions_json / answers_json / answer_feedback_json entries. Watch interactions:
tooltip baking (people + edu) walks/regexes over this HTML — the tooltip matcher skips
inside tags (safe) and the edu DOM-walker wraps text nodes inside the hist spans
(fine — nested spans render correctly).

**P4. Reactive diegetic soundtrack — INFRASTRUCTURE DONE (Jul 2026), content pending**
`SOUNDTRACK_PLAN.md` implemented: primitives in Code 1 inside `setupMusicPlayer`
(`_fadeTo`, `_targetVolume`, `_rebuildPlaylistSelect`, `_installPending`, `_setCurrent`,
`window.__injectNextSong`, `window.__enterMusicSection`, `window.__resetSoundtrack`);
config + triggers in Code 2 (`SOUNDTRACK` on window, `_mkSong`/`_mkSongs`, `_pkToSection`,
`_musicSectionPending`, wiring in the PK-change observer block, New Game reset hook,
Allende egg routed through `_rebuildPlaylistSelect`, `playCreditsMusic` made robust to
playlist replacement — it finds the Creep song by identity, not index 2). Defaults:
`FADE_MS = 1200`; paused-at-boundary installs on next play/next press. STILL TO FILL
(grep `FILL ME IN` in Code 2): per-section track URLs, mood rules + thresholds, Part IV
startPk/name, and per-question `stinger: () => Song` entries on `questionData` (e.g.
Yom Kippur pk → Patton theme). Empty sections fail safe — entering one changes nothing,
so the system is inert until tracks are authored. Verified via a Node stub-DOM harness
(26 scenario checks covering the §10 checklist items that don't need a real browser).

**P5. Campaign-length selector — INFRASTRUCTURE DONE (Jul 2026), pk list pending**
`CAMPAIGN_LENGTH_PLAN.md` infrastructure implemented in Code 2: `CAMPAIGN_LENGTHS`
config (two presets: 'full' = "The Big Enchilada" (default), 'short' = "Cottage Cheese"),
`_lengthAllows(feature)`, `_installCampaignLength()` (in-place questions_json rebuild:
[curated..., parked tail...] + question_count shrink; pristine order/count snapshotted
eagerly in `_LENGTH_ORIG` at load; PROPS.PARAMS reads question_count live so no engine
poke needed), selector UI on the pre-game options screen — IN CODE 1, next to the
edu/historicity toggles (CRITICAL: Code 2 only executes at GAME START, after the
options screen is gone; Code 1 records the choice on window._acopCampaignLength and
Code 2 reads it once at load, installing after tooltip baking, and again in the New
Game reset branch). Mirrors the voting-method block (h3 + select +
.description_window_small rewritten on change, between the voting-method description
and #difficulty_level, with a #difficulty_level fallback anchor); selection sticks for
the session, resets to Enchilada on page load — same as the voting method. Labels/desc
texts live in Code 1's ACOP_LENGTH_UI; pks/feature gates in Code 2's CAMPAIGN_LENGTHS —
keys must stay in sync. Feature gates live:
diplomacy dropdown build in openWorldMap, _DIPLO_INCOME + Laird _everyTurn ticks,
nw-team-actions build in openInnerCircle, pressure _everyTurn tick, _RESHUFFLE.offer,
_MIDTERM pk-429 onShow. Save/load integration: question_count snapshotted/restored;
_campaignLength/_lengthInstalled in _SL_SCALARS. STILL TO FILL (grep `FILL ME IN`):
the short preset's date-ascending pk list (plan §4.5 authoring rules) and both desc
placeholder texts. Empty pks = inert (short plays the full set, gates still engage).
Verified: Node harness (9 checks: install/restore/tail-parking/unknown-pk/idempotency)
+ Chromium render of the selector in an options-screen replica.