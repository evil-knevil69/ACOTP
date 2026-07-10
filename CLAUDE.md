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

**Step 1 — give the `tooltipList` entry an `alt` (in `ACOP Nixon_Agnew.txt`, the
`const tooltipList = [` array, ~line 14947).** Only put the fields that change;
anything omitted from `alt` falls back to the default. Usually just `body`:

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
Scoreboard: on the final map the EV readout (`#overall_result`) is dressed as the 1976 ABC
News broadcast graphic — `__scoreboardTick` (a second observer subscriber) rebuilds each
`<li>` ("Name: EV / PV%") into name/num spans carrying the candidate colour as
`--pill-color`, appends an "ABC News Projection" footer, and the `.acop-final-tv
#overall_result` CSS renders gold-framed RECESSED pills, EMBOSSED glowing text, a red
radial card and CRT scanlines (0.4px blur for the tube softness). Idempotent PER <li>
(not one-shot): Election Night rewrites the <ul> every ~2s, so each tick re-dresses only
unclassed rows; the projection footer is a <div>, NOT a <p> (the engine's
`$('#overall_result > p').html(…)` tally update would overwrite a <p> footer).
Election Night (engine `electionNight()`, detected by `#final_result_button` — unique to
that screen) gets the full treatment too: TV chrome + smoothing gates extended in both
files, same `.acop-final-tv` class (its footer flex row centres the single
"Go to Final Results" button). Both cards carry a gentle CRT flicker
(`acopScoreFlicker`, opacity-only, 4.3s loop; the state card runs it -2.15s out of phase).
State card: `#state_result` (Election Night + final map ONLY — the in-game map uses
`#state_info`, untouched) is dressed as the ABC '76 per-state graphic by
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