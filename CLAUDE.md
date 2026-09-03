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
- **NEVER put a backtick inside CSS/HTML comments or text within a template
  literal** — it silently terminates the literal. Worst case it still PARSES
  (the tail reads as an expression like `` (css) > label `` ) and only throws
  at RUNTIME, killing everything after that line (this broke the whole
  pre-game screen in Jul 2026 via a `> label` comment in the grid CSS).
- Parse checks are NOT enough. After editing either file, RUN it the way the
  host does: `node mod_exec_check.js "<file>"` (in the repo; needs global
  playwright) executes it via
  `new Function('campaignTrail_temp','window','document','$','jQuery', code)`
  against a stub host page and reports the first runtime throw with its file
  line. Both files must report EXECUTED CLEAN.

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

## How-to: add a theme

`ACOP_THEMES` (Code 1, grep `THEME SELECTOR`, ~line 338) is a **name → function
registry**. Each function repaints the live page. Add a key and it appears in
the dropdown automatically — there is no other wiring.

What a theme function repaints — the whole contract:

| surface | how |
|---|---|
| window / title colours | `nct_stuff.themes[nct_stuff.selectedTheme].coloring_title` + `.coloring_window` |
| the header strip, game window, play column | `.game_header` / `#game_window` / `.container` `style.backgroundColor` |
| the top banner image | `document.getElementById('header').src` |
| the page background | `document.body.background` (+ `style.backgroundSize`) |
| the per-screen logo header | `corrr` (a HTML string the engine stamps into every `.game_header`) |

**To add one:** copy the default entry (`'A Cancer on the Presidency'`), rename
it, swap the URLs and colours. `'In the Bunker'` is a worked second example, and
the commented `Tricky Dick Noir` stub shows the minimum shape.

Around the registry:

- `_applyTheme(name)` runs the function, then pushes the new `corrr` into any
  header ALREADY on screen (setting `corrr` alone only affects the engine's
  future renders), syncs the picker dropdown, and re-runs `_syncLowFxBg()`.
- `_mountThemePicker()` replaces the host site's native `<select id="themePicker">`
  in place (keeping the id, so host CSS still styles it); with no host picker it
  falls back to a floating control pinned top-right. **Relocating or reskinning
  the picker is isolated to that one function.**
- Unknown names fall back to the default, so a theme referenced before it exists
  fails safe.

**Swapping theme from a question** — Code 2, grep `EVENT-DRIVEN THEME SWAP`:

```js
themeSwap('In the Bunker')     // from a question's onShow, or an answer-effect branch
```

Save/load: `_gameTheme` remembers the last EVENT swap and a load re-applies it.
A manual picker choice is a session preference and is deliberately NOT persisted —
it survives New Game, an event swap does not.

### Five traps, all of which have bitten

1. **Don't use `body.style.backgroundColor` for a flat-colour theme.**
   `_applyTheme` calls `_syncLowFxBg()` afterwards, which clears that inline
   colour. Set the legacy `document.body.bgColor` ATTRIBUTE instead — and clear
   it in the other entries so it doesn't leak between themes (the default entry
   already does).
2. **Clear an unused page background with `document.body.removeAttribute('background')`,
   never `background = ''`** — an empty value resolves against the page URL and
   loads the HTML document as an image.
3. **Every entry must set the body's `backgroundSize`, `backgroundRepeat`,
   `backgroundPosition` and `backgroundAttachment` itself — to EXPLICIT values,
   not `''`.** Clearing an inline declaration doesn't restore the browser
   default; it hands the property to the host page's own stylesheet, which has
   its own ideas (a body `background-size` rule once stretched a theme's image
   vertically). Use `setProperty(k, v, 'important')` if the host fights back —
   and note that a theme which does must be undone with `removeProperty`, since
   a plain assignment can't clear an !important flag. Themes stay
   self-contained; no MTE-style leak between them. A theme showing one un-tiled
   image should set `bgColor` too, since that is what fills the gap. And if you
   centre a background, set `attachment: fixed` with it — otherwise it centres
   against the whole document, not the viewport. Full background recipes:
   `BACKGROUND_IMAGES.md` §3–4.
4. **Never write inline styles onto the HOST page's own elements.** A theme may
   set what the mechanism already owns — `nct_stuff` colours, the body
   background attribute, `corrr`. For anything else (the banner's seating, the
   game window's paper), add a body class and put the overrides in the
   stylesheet. Undoing a class restores the host exactly; `removeProperty` on a
   host element deletes whatever inline value the host had there first, which is
   how the default theme once turned the whole page white (change 73).
5. **Ship asset-free where you can.** Give each URL its own `''` fallback (as
   `'In the Bunker'` does with `BUNKER_BANNER` / `BUNKER_BG`) so the theme is
   selectable and coherent before the art exists, and improves as slots are
   filled.

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
Opening of coverage — SETS (Jul 2026, replaced the single `_ENIGHT_STING_URL` +
`_ENIGHT_INTRO`): `_ENIGHT_SETS` (in the AUTHORING INDEX) is an array of
{sting, intro:{url, durationMs}} PAIRS — sting and title animation that belong
together. When the opener advisor popup appears ("Election night has arrived.
Settle in…" — `#election_night_window` + `#final_result_button` WITHOUT
`#overlay_result_button`; only the 270 popup carries that), the run rolls ONE set
uniformly at random (`_enightSetIdx`, -1 until rolled; in `_SL_SCALARS` +
New-Game reset): its sting plays under the popup (`_enightStingPlayed`), and its
animation fires when OK dismisses it (`_enightIntroPlayed`; observer state machine
ARMS while the popup is up, FIRES when it's gone) — an <img> overlaid centre-map
inside `#map_container` (z1: above the map, under scanlines/frame), pointer-events
none, fades in/out and self-removes after the set's durationMs (gifs don't report
an end). Per-piece fail-safe: sting '' = that set opens silent, intro.url '' = no
animation; ships with both sets empty (FILL ME IN ×2). Add sets freely — the roll
covers the whole array. Verified: enightsets_check 9/9 (pairing, once-per-run,
both-sets spread over 60 rolls, silent-sting set still animates, shipped-inert,
overlay self-removal, reset + scalar greps); sting_check reworked to projection-only
9/9 (anim_check retired into enightsets_check).
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

**23. Theme selector (Jul 2026, mechanism ported from 1972: More Than Ever)**
Code 1, right after `corrr` is defined. `ACOP_THEMES` is a name→function registry —
each entry repaints the page live (body background, `#header` banner, the
game-window/header/container colours via `nct_stuff.themes[selectedTheme]`, and `corrr`).
`_applyTheme(name)` runs the chosen fn then pushes the new `corrr` into any on-screen
`.game_header` (corrr alone only affects the engine's future renders). The shipped ACOP
look IS the default entry (`'A Cancer on the Presidency'`, capturing `ACOP_DEFAULT_CORRR`),
so the selector starts on it and changes nothing until switched. `_mountThemePicker()`
mounts the picker the SAME way 1972: More Than Ever does — it REPLACES the host site's
native `<select id="themePicker">` in place (MTE-style `replaceWith`, keeping `id`
so the host's chrome styling still applies), building the options from the registry
keys. If the host doesn't supply that element (older/other hosts, the standalone
showcase), it falls back to a compact control pinned to the page's top-right (fixed,
every screen, mounted once on `document.body`). Both modes share the `_buildThemeSelect()`
helper and a `.acop-theme-select` class (the idempotence + test hook). Relocating/reskinning
the picker is isolated to `_mountThemePicker()`. Selection is session-only (`_acopTheme`,
not persisted). TO ADD A THEME: copy the default entry in `ACOP_THEMES`, rename, swap
URLs/colours — it appears in the dropdown automatically (commented `Tricky Dick Noir`
stub shows the shape). Verified: theme_check 14/14 (host-replace mode + floating-fallback
mode: mount/idempotence, host-picker hijack, default look, live repaint on switch,
corrr sync into the header, new-theme registration, unknown-name fallback).
EVENT-DRIVEN SWAP (Jul 2026, ported from 1996: The End of History — EOH repaints
inline in its answer hook; ACOP routes it through the registry): `themeSwap('Name')`
in Code 2 (grep `EVENT-DRIVEN THEME SWAP`) — call from a question's `onShow` or an
answer-effect branch; repaints live via `window._acopApplyTheme` (Code 1 exposes
`window.ACOP_THEMES` + `window._acopApplyTheme`; `_applyTheme` now also syncs the
picker dropdown). Unknown names warn + no-op (author the themeSwap before the theme
exists = fails safe). Save/load: `_gameTheme` in `_SL_SCALARS` = last EVENT swap
('' = none); restore re-applies it; New Game unwinds to the default ONLY if an
event had swapped (a manual picker choice survives both — session preference,
deliberately unpersisted). Console: `window.ACOPThemeSwap`. Verified:
themeswap_check 10/10 (cross-file wiring, live repaint, picker sync, unknown-name
no-op + warn, manual pick after event swap, save/reset wiring greps);
theme_check 14/14 + saveload 10/10 unchanged.

**24. Fog of War toggle (Jul 2026)**
(Expletives Deleted was briefly made non-persistent here, then reverted on
request — it remains OFF by default with the choice persisted in
`acop_expletives`, as before.)
New pre-game checkbox **"Fog of War"** (Code 1, under Historicity; ON by
default, opt-out persisted in `acop_fog_of_war`, body class `fog-of-war-on`;
hover: "Obscure team loyalty ratings, you don't know when they'll bust.").
Effect (Code 2, President's Men): the LIVE loyalty NUMBER on card backs and
the stat hover tip is wrapped in `.nw-fog` and blurred under
`body.fog-of-war-on` (fixed 2ch width so a fogged 10 isn't wider than a 7,
user-select none) — the "/ 10" scale, Exposure, and Nixon's Watergate
Exposure stay legible. A man at loyalty ≤1 renders UNfogged (about to bust —
render-time decision; both surfaces rebuild live). Manual line added.
Verified: fog_check 15/15 (blur on/off, only-the-number, ≤1 reveal, Nixon
exempt, checkbox defaults, expletives persistence, fog opt-out persistence);
orgtip_check 10/10 unchanged.

**25. World map: event polaroids + capital photos never clipped (Jul 2026)**
The event-icon hover polaroid and the capital-pin click photo panel could get
cut off at the window edge: the polaroid's mouseenter only clamped
horizontally, and the capital panel clamped against a hardcoded 220×160 guess
— both photos load lazily (`height:auto`), so the tip was placed small and
then grew past the bottom of the screen. Fixes in `openWorldMap` (Code 2):
`_placeTip` now hard-pins the tip fully inside the window after its
flip-to-other-side-of-cursor logic (also benefits the flag tooltip + capital
name pill, which share it); both call sites use `_placeTip` with the REAL
measured size; and a new `_replaceOnImgLoad(tip, ev, pad)` re-runs placement
once the photo decodes (skipped if the tip was already hidden by mouseleave).
Verified: wmtip_check 9/9 (wiring, corner placement, oversize pin, the
late-loading-tall-photo re-place, hidden-before-load stays hidden).

**26. Batch: P1 question counter + reshuffle deadline telegraph + memo feedback (Jul 2026)**
- **P1 wired** (was Pending): the question label reads `Question X` where X =
  `_questionCount` (turns lapsed, free corQuestions included; no "of 25" — the final
  turn can read >25, intended). Implemented INSIDE `attachDateToProgressBar` (Code 2),
  which already owned the `#progress_bar h3` rewrite + date hover-swap: it now runs for
  EVERY question (dated or not — the old `if (!date) return` sat above the label write),
  and the hover-restore text uses the same turns-lapsed label. End-of-run logic reads
  `question_number` directly, unaffected.
- **Reshuffle deadline telegraph**: new `_RESHUFFLE.turnsLeft()` (turns beyond the
  current one, 0 = last turn, null = no offer). While an offer is live the Officials
  panel shows an `.oc-deadline` chip above the chart ("this turn and N more to decide" /
  red "LAST TURN: decide now, or the choice is made for you"), and on the final turn
  every rs-glow surface (Enemies/Friends button, Officials button, the glowing role
  cards) adds `.rs-last` — a faster RED pulse (`rs-pulse-last`) instead of the amber.
- **Advisor feedback = White House memo — REVERTED** (Jul 2026): the feedback text
  is personal, reflective and second-person — wrong register for a formal memo frame,
  so don't re-pitch document-style dressings for it. The skin was added and removed
  same-day; Code 1's feedback styling is back to the engine default
  (byte-identical to pre-memo). The
  `#visit_window:has(#no_feedback_button)` discriminator knowledge stays useful — the
  original left-align rule and the mental-state image swap (item 27) both use it.
Verified: trio_check 9/9 (label for dated + dateless questions, hover swap,
turnsLeft lifecycle, all rs-last wiring greps, memo-skin ABSENCE + left-align rule
intact); reshuffle_grace 13/13, taglow 7/7, saveload 10/10 unchanged; both parse.

**27. Mental-state feedback images (Jul 2026)**
The advisor photo on the feedback memo tracks Nixon's decline. Config
`MENTAL_FEEDBACK_IMGS` (Code 2, next to `_visitAdvisorImages`; in the AUTHORING
INDEX): bands over `MentalState` (higher = worse, same scale as the
State-of-the-Nation tiers — ≤4 composed, ≤6, ≤7, >7), first band whose `max` >=
value wins. `url: ''` = keep the engine's default advisor image, so the feature
ships INERT until the gif URLs are filled in (grep FILL ME IN — user has Nixon
shoving Ziegler + freezing up in front of people). Swap happens in the shared
observer next to the visit-image randomiser: feedback popups only
(`#visit_window:has(#no_feedback_button)` + `#feedback_window`; visit popups
need `#confirm_visit_button` so the two never both fire), once per popup
(dataset guard), `object-fit: cover` added on swap so any gif aspect crops
cleanly in the engine's 208×128 frame. Suggestion 8 (fog "whispers") is deemed
already covered by authored feedback text (e.g. "McCord is off the reservation").
Verified: msimg_check 6/6 (banding, shipped-inert default, swap + object-fit,
composed default, once-per-popup, visit-popup untouched).

**28. Question page polish: band→rule, picked wash, CONTINUE wake (Jul 2026)**
All Code 1. (1) `.inner_inner_window h3` — the translucent grey band behind the
question text is gone (transparent bg); a thin oxblood rule
(`rgba(122,32,22,0.55)`) under the narration separates it from the options.
(2) The chosen answer row gets `.acop-picked` — a light manila wash
(`rgba(199,170,96,0.22)`, 1px inset edge, 3px radius) and the checkbox tick
warms to oxblood via the `--stroke` custom property; rows gained 4px/8px
padding so the wash has room (all rows, so nothing jumps on selection). Class
sync lives in `replaceRadioButtons`'s change handler (centralised: programmatic
unchecks fire no change events). (3) `#answer_select_button` starts
`.acop-asleep` (opacity .45, reset at each question build — the button element
can be reused across renders) and wakes on selection with a manila
`drop-shadow` FILTER — deliberately NOT box-shadow, which would clobber the
button's existing bevel. Unpicking re-sleeps it. Opacity-only: the button stays
clickable, engine behaviour untouched.
Verified: qpage_check 11/11 (build state, band gone + rule, wash exclusive to
the picked row + moves + clears, warm tick, awake glow with bevel intact,
once-per-form guard).

**29. Mental-state bleed on the question page (Jul 2026)**
The question window drains a touch as Nixon deteriorates. Code 2's shared
observer stamps `body.acop-ms-dim-1/2/3` every tick from `MentalState`
(≤4 clear, ≤6, ≤7, >7 — same tiers as the feedback images/State of the
Nation); derived state, so save/load + New Game need no wiring. Code 1 CSS
dims `#inner_window_question` via FILTER (brightness .97 / .94+sepia .06 /
.89+sepia .12+saturate .92, 1.6s ease) — deliberately slight, max ~11%.
NOT an overlay: `#game_window` isn't reliably position:relative (see the
final-map notes) and an inset overlay could re-anchor the portrait strip.
Recovers cleanly if MentalState improves. Verified: msdim_check 7/7 (all
band edges, recovery); qpage_check 11/11 unchanged.

**30. Low demand mode — "No longer operative" (Jul 2026; label was "The rate
of increase is decreasing")**
Pre-game checkbox (under Fog of War; OFF by default, opt-in persisted in
`acop_low_fx`; hover: "Reduce animations, graphics and other bandwidth heavy
features."). ONE signal: `body.low-fx-on` — Code 1 owns the state block (grep
`LOW DEMAND MODE`, sits before the THEME SELECTOR) + checkbox + CSS; Code 2
reads the class LIVE via `_lowFx()` (defined before the preloader; Code 2 runs
at game start so the choice is final by then). Playability-neutral rule:
SIGNALS stay (glows keep colour as STATIC halos), only motion + bandwidth go.
What it turns off — CSS half (main stylesheet, grep `LOW DEMAND MODE (body`):
tooltip backdrop-filter blurs (solid paper instead), rs/ta/rs-last pulse
animations (static halos), election-night card flickers (selector out-specifics
the per-screen !important rules), midterm `_mtFlicker`, org-chart `nw-exp-glow`
pulse + gaussian filter (solid ember stroke stays), TV `lamp-glow` filters,
the `#game_window` edge-feather mask, and (in `customStyling`) the TV noise
gif → flat #111. JS half (Code 2 guards): idle-tier preloader skipped, world-map
film grain hidden + drift not started (element kept — the SVG-load re-attach
expects it; vignette stays), event-icon SMIL debut loops skipped, Night+SIGINT
forced off with buttons disabled (remembered "on" cleared), morning-brief
war-room skin skipped (brief still runs), and the visit-map decorative jet +
contrail fly-across skipped (gated at its build site in Code 1). Page background: `_syncLowFxBg()`
(Code 1) overrides the animated gif with inline style — `_LOWFX_STATIC_BG`
optional FILL ME IN for a static still, '' = flat #262019 — re-synced at load,
on toggle, and at the end of `_applyTheme` (theme fns rewrite the attribute).
Verified: lowfx_check 24/24 (all Code 2 wiring greps, checkbox
defaults/persistence/label/hover, visit-plane gate, bg swap + clear, and
computed-style CSS overrides with the per-screen sheets layered in production
precedence);
theme_check 14/14 + themeswap 10/10 (harness slices widened to include the
state block), fog 15/15, qpage 11/11, msdim 7/7, wmtip 9/9, enightsets 9/9,
saveload 10/10.

**31. DEFCON-1 nuclear war branch (Jul 2026, pattern from 2024: Our Revolution)**
Full handoff/authoring doc: `NUCLEAR_WAR.md`. Ships INERT (`_NUKE_Q_PK = null`).
Code 2, grep `NUCLEAR WAR TUNNEL`: `_everyTurn` watches `defcon`; at ≤1
`_nukeArm()` SWAPS the parked bunker question into slot `question_number+1`
(the displaced question takes the bunker's parked slot — questions_json stays a
pk-permutation, which `_slRestoreQuestionOrder` and the campaign-length byPk
restore both require; an overwrite here corrupted New Game, see below) and
shrinks `question_count` to `+2` (one last question → results), fails safe if
the pk isn't parked. Answering it (`_nukeCensusOnAnswer` from `cyoAdventure`,
gated on the answer belonging to `_NUKE_Q_PK`) renames `candidate_json` in place
to the casualty census (`_NUKE_CENSUS`: Dead/Injured/Irradiated/Short-term
Survivors, retunable — pks MUST be ballot participants: the engine tallies
candidate_id + opponents_default_json = 10701/50000/70000/80000; 60000 "The
Media" is NOT on the ballot and a row on it never shows; pk 92 in the opponents
list is stock residue with no candidate_json entry, never displays) before
election night builds. The census also fires the TURNOUT CRANK: every state's
`popular_votes` (the engine's turnout dial — votes cast = popular_votes ×
0.95..1.05) is scaled so the national total = `_NUKE_TOTAL_POP` (210M, the 1972
US population — "it covers everyone, not just voters"; multiplier derived at
load ≈2.575) FROM the pristine `_NUKE_TURNOUT_ORIG` baseline (never compounds).
The SPLIT is authored, not the run's politics: `_NUKE_CENSUS` targets (Dead 31M
/ Injured 55M / Irradiated 40M / `target: null` = balance → Survivors ~84M);
a wrapper over the engine global `A()` (LBM alt-voting pattern, grep `The
census SPLIT`) fires at ≥2, re-deals each state's rows to target/210M shares
±12% per-state jitter, zeroes non-census rows (pk 92), re-sorts, re-runs
getLatestRes for nn2/nn3. Answer-score nudges can't do this (they multiply
run-dependent support). EV CHROME: the census zeroes every state's
electoral_votes (`_NUKE_EV_ORIG` pristine) — the engine's own
noElectoralVotes/someStatesHaveEVs guards hide the "N /" prefix, "270 to win",
the state card EV line and the tables' EV columns; the 270 popup never fires
(loop ends on time/all-called); ending resolves via no_electoral_majority
(author those fields on the census pks); Code 1's `__nukeTvTick` retitles the
`ELECTORAL VOTES` h3 → CASUALTY CENSUS (idempotent, unwinds). Restore hook:
≥2 re-applies census+crank+EV-zero, <2 restores pristine names+turnout+EVs
(lingering-census guard); New Game unwinds. URBAN SKEW: census entries with
`urban: true` (the Dead) scale per state by `_NUKE_URBAN[abbr]` / the
turnout-weighted mean — national toll conserved exactly, others fill the
remainder (NY/CA ~19% dead vs WY/ND ~6%; tiers per the 1970 census, retune in
`_NUKE_URBAN`). STRIKE TIMETABLE: a wrapper over engine-global `electionNight`
re-deals every state's `result_time` from `_NUKE_STRIKE_WAVES` at ≥2 — wave 1
(t15–60) ND/DC/MT/MO/GA/VA, wave 2 (t80–220) the ten most populous, wave 3
(t240–440) the rest (unlisted → last wave; pre-census marginTime untouched).
MISSILES (Code 1, grep `incoming-missile animation`): a fill MutationObserver
on the Election Night map svg turns each call-recolour (#c8a070 → census
colour, recognised via `window.__nukeCensusColors`) into a strike: tracer +
missile svg (`_NUKE_MISSILE_IMG` file.garden noun-nuclear-5884718,
`_NUKE_MISSILE_UP` nose-angle) flies ~650ms — mostly near-vertical from the
TOP (over-the-pole ICBMs), `_NUKE_SLBM_SHARE` (~22%) shallow from the RIGHT
edge (Atlantic subs) — → flash + ring + ANIMATED
procedural mushroom cloud (`_NUKE_IMPACT_IMG` swaps in a custom gif/webp per
impact; `_NUKE_IMPACT_MS` lifetime) → persistent scorch. Election Night only
(observer detaches elsewhere); low-fx skips all of it; reduced-motion gets
scorch-only. CONSOLE: `window.ACOPNuke` — `.demo()` fires the census and jumps
straight to the nuclear Election Night (engine skip_to_final pattern; preview
without authoring the bunker), `.arm()`, `.census()`, `.reset()`. `_nukeWar` (0/1/2) in `_SL_SCALARS`; observer stamps
`body.acop-nuke` from it (derived). The terminal screen reverts to the STOCK
engine map: Code 1's `__isFinalElectionMap` / `__isElectionNight` return false
under `body.acop-nuke` (TV chrome + scoreboard + state cards off),
`_checkAndSimplify` early-returns under `_nukeWar>0` (smoothing/lamp/labels
off), and a `body.acop-nuke #map_container` rule drops the noise gif — clean
slate for a nuke-themed screen later (hang it off the same class). Save/load:
restore re-zeroes `has_visits` at ≥1 (a PART transition CAN fall between arming
and the bunker; election_json isn't snapshotted) and re-applies the census at
≥2. New Game `_nukeReset()` unwinds the rename (originals in `_NUKE_CAND_ORIG`),
clears flag/class, restores `has_visits` (`_NUKE_VISITS_ORIG`), and forces a
pristine question-order+count reinstall (`_lengthInstalled = null` +
`_installCampaignLength()` — the New Game branch's own install call runs
EARLIER and early-returns when the length didn't change, so it can't undo the
arm). Verified: nuke_check 30/30 (inert-until-authored, swap-arm + permutation
intact + count + visits + idempotent, normal-answer-doesn't-trip-census, bunker
census renames the four ballot candidates with The Media untouched, class stamp,
both detectors + smoothing stand down, New Game unwind of names/order/count/
visits from census AND merely-armed states through the REAL
_installCampaignLength, armed-save visits re-zero grep); enight 8/8, statecard
18/18, scoreboard 7/7, visitmap 15/15, saveload 10/10, length 9/9, lowfx 24/24,
trio 9/9 unchanged (TV still fires without the class); both files parse, 163
scalars declared.

**32. Nuke map skin — first pass (Jul 2026)**
The DEFCON-1 terminal screens (Election Night + final results map, under
`body.acop-nuke`) are dressed as a war-room feed. All Code 1: the two screen
detectors split into RAW checks (`__isFinalElectionMapRaw`/`__isElectionNightRaw`)
+ the nuke-guarded wrappers; new observer tick `__nukeTvTick` stamps
`acop-nuke-tv` on `#game_window` when nuked AND a raw detector fires — armed
phase's in-game map and the other final screens stay stock. Look is pure CSS in
`customStyling` (grep `acop-nuke-tv`): TV noise gif KEPT (the old
`body.acop-nuke` drop rule is gone), world-map SIGINT package minus the green —
scanline `::after` + vignette `::before` on `#map_container` (same gradients as
`wm-sigint-css`, pointer-events none) and `sepia(0.3) saturate(1.4)
brightness(0.85)` on the map svg (no hue-rotate). Low-fx: filter dropped
(SIGINT precedent), static overlays stay, flat-#111 bg override still wins.
Build further nuke dressing on `body.acop-nuke` + `#game_window.acop-nuke-tv`.
NOTE: any harness injecting `__isFinalElectionMap`/`__isElectionNight` must now
inject the raw fns too (all 8 in the scratchpad were patched). Verified:
nuke_check 44/44; full regression suite green (see NUCLEAR_WAR.md).

**33. Nuke broadcast package (Jul 2026)**
The nuclear Election Night is a DYING BROADCAST — full doc in
`NUCLEAR_WAR.md` §"The broadcast package". Code 1 (all hanging off
`__nukeTvTick` + the strike observer; each piece opts out under low-fx and/or
reduced-motion): EBS takeover of the opener popup (retitled h3, SMPTE colour
bars replace the advisor img, `.nuke-ebs`; tone `_NUKE_EBS_TONE_URL` FILL ME
IN), civil-defense chyron crawl (`_NUKE_CHYRON_TEXT`, `#nuke-chyron`), wire
feed ("10:41 PM — CONTACT LOST WITH MINOT"; `_NUKE_WIRE_LINES` templates +
`_NUKE_CITY` targets; clock parsed from the "% complete" line, 8PM→2AM),
broadcast degradation (`#nuke-degrade` static overlay thickens per hit, capped
0.35; rare 380ms PLEASE STAND BY slate, throttled+capped), NORAD early warning
("INBOUND TRACKS: NN" + amber `.nuke-blip` pulses on states due within ~8s,
reading `window.__nukeSchedule`), MIRVs (salvo 3/2/1 by national-share
≥5%/≥2.5%), air vs ground bursts (lead warhead always ground: cloud + scorch
recorded in `window.__nukeScorches`; follow-ups may air-burst: wide ring, no
residue), GRATUITOUS BARRAGE (`_NUKE_RESTRIKES` = 20 extra warheads over the
≥2.5%-share states, size-proportional — real data: CA/NY 3 each — landing at
random in `_NUKE_RESTRIKE_DELAY` 3–45s after each declaration; half air-burst,
~30% print a `_NUKE_RESTRIKE_LINES` wire line; 0 = off), aftermath (final map
rebuilds smoke+char per scorch,
`#nuke-aftermath-layer`, self-healing; `#state_result` h3 → DAMAGE
ASSESSMENT), impact rumble (`_NUKE_RUMBLE_URL` FILL ME IN, ≥2.5s apart).
Code 2: `_NUKE_ELECTION_POPUP` swaps `campaignTrail_temp.ElectionPopup` at
census (restored with the rest), `window.__nukeSchedule` published by the
electionNight wrapper (nulled below census), and BOTH ACOP-News opener-set
subscribers early-return at `_nukeWar >= 2`. NOTE: harnesses extracting Code 2
observer blocks may now need a `var _nukeWar = 0;` stub (enightsets + msdim
were patched). Verified: nuke_check 87/87; full regression suite green.

**34. UI polish batch (Jul 2026)** — all Code 1 CSS.
- **Options grid centred** under the difficulty selector (`#acop-options-grid`
  `margin: 20px auto 0` + `width:max-content`, was left-aligned).
- **Checkbox hover cards wrap** again: the grid's `label { white-space:nowrap }`
  INHERITED into the absolutely-positioned tip `<span>` children, forcing the
  tip text onto one line that ran off-screen. Fixed with
  `#acop-options-grid > label > span { white-space: normal; }`.
- **Nuke results panels no longer clipped**: on the nuke screen (no
  `.acop-final-tv` re-lay) the stock `#overall/#state_result_container` parked at
  `left:925px` inside a 0-width `#menu_container` and got clipped by
  `#main_content_area{overflow:hidden}` — they vanished entirely. Re-anchored to
  `#game_window` (`#menu_container` made `position:static`, panels given explicit
  `left:792px`), `#main_content_area` set `overflow:visible`, and the
  `#game_window` edge-feather mask lifted — so they sit over the map's right and
  overflow the frame instead of being cut off.
- **EBS opener slid 151px left** to the map's top-left
  (`#election_night_window.nuke-ebs { margin-left:-151px }` — margin, so the base
  centring transform is untouched).
Verified: nuke_check 90/90 (+3 static CSS assertions), both files EXECUTE CLEAN
via `mod_exec_check.js`, full regression suite green.

**35. Nuke strike tuning (Jul 2026)** — Survivors census colour → slate
`#41505c` (Code 2 `_NUKE_CENSUS`): the only COOL tone on the map, so a Survivor
state reads clearly against the warm tan base / red-Injured / green-Irradiated
and doesn't collide with the Dead's grey under the sepia map filter (dark brown
`#3a2413` was tried first but sat too close to the Dead and read as the grimmest
colour despite being the least-bad outcome). Code 1 missile config: `_NUKE_MISSILE_SIZE`
(16→32, ~2x), `_NUKE_FLIGHT_MS` (650→1400, slower), `_NUKE_SCORCH` (new, ships
FALSE — the LIVE persistent scorch circle is opt-in; the state colour is the
lasting live mark. Ground bursts are still RECORDED always, so the final-map
aftermath damage layer survives), and `_NUKE_HIT_OFFSET` (new per-abbr `{x,y}` svg-unit table,
empty default) applied to both the main salvo and the barrage so odd-shaped
states can be re-centred; dial against `ACOPNuke.demo()`. Verified: nuke_check
97/97 (config assertions + a scorch-OFF-still-records-aftermath runtime check;
strike sub-tests set `_NUKE_SCORCH=true` + `_NUKE_FLIGHT_MS=300` and isolate the
strike layer per sub-test — flakiness fix), stable ×3, full regression suite
green, both files EXECUTE CLEAN.

**36. Nuke screen layout pass 2 + options-gap (Jul 2026)** — all Code 1, the
nuke ones scoped to `#game_window.acop-nuke-tv` / `.nuke-ebs` so the normal
election-night / final-map screens are untouched.
- **EBS opener covers `#map_container` exactly** (same size + position) and
  sits above the result panels. Positioned in `__nukeEbsTick` by measuring the
  live game-window/map rects (`setProperty(...,'important')` because the base
  `.overlay_window` sets width/height `!important`); `z-index:9100` in the
  `.nuke-ebs` CSS. Replaces the old `margin-left:-151px` nudge.
- **Result panels**: no tilt (`transform:none`), shifted +25px right
  (`left:792→817`), still re-anchored to `#game_window`.
- **`#main_content_area` solid black** under nuke (`background:#000`).
- **Options screen gap** (NON-nuke, `#inner_window_4`): Back/Continue pulled
  tight under the checkbox grid — the old 65px gap (global `margin-top:50
  !important` + relative `top:15`) zeroed via a higher-specificity
  `margin: 0 !important`, so the gap is 65px smaller and the auto-height game
  window shrinks by the removed flow margin.
Verified: nuke_check 100/100 (+5 assertions), opts_gap harness (gap 65→0,
content bottom −66), nuke_layout (EBS box == map box, panels flat +25),
regression suite green, both files EXECUTE CLEAN.

**37. Nuke map edge feather (Jul 2026)** — `#game_window.acop-nuke-tv
#map_container` gets a two-axis linear-gradient mask (6% feather each edge,
`mask-composite: intersect`) so the map bleeds to transparency into the black
`#main_content_area`. Deliberately on `#map_container`, NOT `#main_content_area`
— the result panels are siblings under `#menu_container`, so they stay crisp
(a mask on main_content_area would feather them too, since they're in its
subtree). Dropped under low demand mode. NOTE: the broadcast furniture
(chyron / wire feed / NORAD counter) is appended inside `#map_container`, so it
also feathers at the very edges. Verified: nuke_check 102/102 (+2 assertions;
mask on map not content-area, low-fx drop), render confirms panels crisp.

**38. Nuke screen judder + static flare (Jul 2026)** — Code 1, in the strike
block. `__nukeImpactTick` (called at every impact, ground + air) counts impacts
and, when a random threshold is hit, shakes the whole `#game_window`
(`__nukeJudder`, ±3px transform) AND bursts a screen-blended static flare over
the map (`__nukeStaticFlare`, `#nuke-flare`, reuses the noise gif). Gap is
uniform in `[_NUKE_JUDDER_MIN,_NUKE_JUDDER_MAX]` = [5,15] → mean 10 (≈ 1-in-10)
with a hard floor of 5 (≈ 1-in-5, never chains); ~9 events over the ~90-impact
sequence (≥5 guaranteed). Both skipped under low-fx + reduced-motion; schedule
re-rolls per Election Night (`__nukeRollJudder` in `__nukeStrikeWatch`). The
`_NUKE_EBS_TONE_URL` is also now wired (file.garden EBS ogg).
TUNING PASS: judder amplitude bumped to 8px (from 3) with a `big` variant
(18px); **Washington DC** (decapitation strike) fires a BIG judder + heavy
flare when its lead warhead lands (`abbr==='DC'` in `__nukeStrikeAt`,
re-rolls the ordinary schedule). The static flare was invisible (same gif
over itself blends to nothing) — fixed by scaling `#nuke-flare` to 220% (grain
offset from the map noise) + `brightness(1.9) contrast(1.5)` + higher opacity;
render confirms a clear spike. Map edge feather narrowed 6%→3%. Game header
made fully transparent on the nuke screen (`opacity:0` on
`#game_window.acop-nuke-tv .game_header` — hides the corrr logo `<img>`
(logo8.png) + h2 too; the site's `#header` banner outside game_window is
untouched). Verified: nuke_check 111/111 (judder distribution, shake, flare
over-map + low-fx gate + DC big + amplitude + header transparency), stable ×3,
render confirms flare visible + 3% feather + transparent header, regression
suite green, both files EXECUTE CLEAN.

**39. Nuke results panels → war-room terminal reskin (Jul 2026)** — Code 1 CSS,
scoped to `#game_window.acop-nuke-tv` (the normal `.acop-final-tv` sticky-notes
are untouched). Pure CSS over the stock engine markup: the yellow note becomes a
dark charcoal terminal (`rgba(8,10,12,0.9)`, amber border + glow, Courier
phosphor text with a faint amber text-glow), the `h3` (CASUALTY CENSUS / DAMAGE
ASSESSMENT) an inverted oxblood chyron bar matching the crawl, and the engine's
inline-coloured `--` row swatch a clean 10px census-colour SQUARE (grey/red/
green/slate) so each panel reads like a legend for the map. CRT scanlines
(`::after`) + a gentle `nukePanelFlicker` (reduced-motion gated, low-fx off). No
watermark (per request). Verified: nuke_check 115/115 (+4: dark reskin, chyron
headers, swatch→square, scanlines+flicker gating), statecard 18 / scoreboard
7+5 / enight 8 / tvcard 6 unchanged (reskin is nuke-only), render confirms the
terminal look + census squares, both files EXECUTE CLEAN.

**40. Nuke EBS intro still (Jul 2026)** — Code 1. When OK dismisses the EBS
opener popup on the nuclear Election Night, a full-map still
(`_NUKE_EBS_INTRO_IMG`, the file.garden `ebs.jpg`) fades in and out over 3s
inside `#map_container`. `__nukeEbsIntroTick` (called from `__nukeTvTick` next
to `__nukeEbsTick`) ARMS while the opener is up (`#election_night_window` present,
no `#overlay_result_button`) and FIRES once the popup is gone — once per night
(`__nukeEbsIntroPlayed` + `__nukeEbsIntroArmed`, re-armed by `__nukeStrikeWatch`
on a fresh svg, same place the EBS tone re-arms). The `#nuke-ebs-intro` `<img>`
is `inset:0`/`object-fit:cover`/`pointer-events:none` at z-index 2 — UNDER the
CRT scanlines (9000) / vignette (9001) / flare (9003) so the tube chrome overlays
it — and carries the map svg's `sepia(0.3) saturate(1.4) brightness(0.85)` filter
(dropped under low-fx). WAAPI opacity keyframes (fill:forwards): quick fade-in
(~300ms) + brief hold, then a slow **5s fade-out** (total 6000ms; self-removes at
6200ms, CSS-`else` path at 6000ms). `_NUKE_EBS_INTRO_IMG = '' `= no still.
Verified: nuke_check 117/117 (+2: arm-while-opener-up/no-image, OK-fires-once-per-
night into map_container), full regression suite green (lowfx 24, statecard 18,
scoreboard 7, enightsets 9, saveload 10, msdim 7, wmtip 9, trio 9, theme 14,
themeswap 10, fog 15, qpage 11, visitmap 15, enight 8, tvcard 6, reshuffle 13),
both files EXECUTE CLEAN.

**41. Nuke fixes: visible static flare + host banner hidden + 5s EBS fade (Jul 2026)**
— all Code 1. (1) **Static flare now actually reads.** `#nuke-flare` used
`mix-blend-mode: screen`, but `#map_container` carries a CSS `mask` (the edge
feather) which isolates it into its own compositing group — a screen-blend of the
flare's noise over the map's OWN noise came out invisible. Dropped the blend
mode; the gif is now scaled 220% (grain offset) + pushed hard to bright static
(`filter: brightness(2.6) contrast(1.8)`) and NORMAL-composited at high opacity
(peak 0.9 / 1.0 big) so the burst unmistakably flashes over the map (render
confirmed). (2) **Host site banner (`#header`, OUTSIDE `#game_window`) hidden on
the nuke terminal screen** — `__nukeTvTick` now also toggles
`body.acop-nuke-screen`, and `body.acop-nuke-screen #header { display: none }`
drops the default-background bar that sat above the war-room feed (the in-window
`.game_header` was already transparent). (3) **EBS intro still fade-out → 5s** —
`__nukeEbsIntroTick`'s WAAPI keyframes retimed to a quick fade-in + brief hold +
5s fade-out (total 6000ms). Verified: nuke_check 118/118 (+1 header-hide; flare
assertion flipped to normal-composited/no-screen/brightness(2.6)), full
regression suite green (lowfx 24, statecard 18, scoreboard 7, enightsets 9,
saveload 10, msdim 7, wmtip 9, trio 9, theme 14, themeswap 10, fog 15, qpage 11,
visitmap 15, enight 8, tvcard 6, reshuffle 13), Code 1 EXECUTES CLEAN.

**42. Nuke: state recolour coincides with the impact (Jul 2026)** — Code 1.
The strike observer used to let the engine's call-recolour stand and THEN launch
the missile, so the state turned red ~1.4s before the warhead landed. Now the
observer captures the census colour, reverts the state to its pre-call fill
(`m.oldValue`), and hands the colour to `__nukeStrikeAt(svg, path, censusColor)`,
which passes it as an `onImpact` callback to the LEAD warhead (`__nukeOneMissile(...,
onImpact)`) — the state turns its census colour AT the impact flash. A new
`path.__nukeStruck` guard stops the at-impact repaint (tan→census) from being read
as a fresh call. Fail-safe immediate paint wherever no warhead flies: low demand
mode + no-bbox early returns call `applyColor()`, reduced motion paints up front
(onImpact suppressed), and the no-WAAPI branch in `__nukeOneMissile` fires
`onImpact` too — so a state can never stick on its pre-call colour. Only deferred
when the observer can actually revert (`m.oldValue != null`); otherwise the old
immediate recolour stands. Verified: nuke_check 119/119 (+1: state holds pre-call
colour through the flight, turns census at impact; low-demand-still-recolours and
all strike/air-burst/MIRV/barrage tests unchanged), full regression suite green
(lowfx 24, statecard 18, scoreboard 7, enightsets 9, saveload 10, msdim 7, wmtip 9,
trio 9, theme 14, themeswap 10, fog 15, qpage 11, visitmap 15, enight 8, tvcard 6,
reshuffle 13), both files EXECUTE CLEAN.

**43. Nuke: the whole "state falls" beat lands with the impact (Jul 2026)** —
Code 1. Following item 42 (colour deferred to impact), the state's WIRE-FEED
obituary (`__nukeWireLine`) and the BROADCAST-DEGRADATION tick (`__nukeDegrade`)
were still firing at launch-detection (~1.4s early). Both are now bundled with the
recolour into one `onLeadImpact` handler carried by the lead warhead — colour +
wire + degrade fire together AS the warhead lands. Reduced motion (no flight) fires
the beat up front; a `leadFired` guard keeps it idempotent. Barrage re-strikes keep
their own independent wire lines. Verified: nuke_check 120/120 (+1: wire obituary
absent mid-flight, present after impact; the existing MIRV/air-burst/wire-feed/
degradation tests unchanged), full regression suite green, both files EXECUTE CLEAN.

**44. Nuke census retune + bigger clouds (Jul 2026)** — (a) Code 2 `_NUKE_CENSUS`
targets: Irradiated 40M→60M at the expense of Survivors (the null-balance row,
≈84M→≈57M); Injured 55M→62M so it's a genuine top contender. The split is now
authored so the TOP row VARIES by state — Injured leads nationally (tops most
states), but the fallout-concentrated Irradiated overtakes it in the heavily-struck
states; Survivors/Dead never top. New `fallout: true` flag (on Irradiated) mirrors
the `urban` skew but weights by `_NUKE_POP_W[abbr]` — auto-derived from each state's
turnout (tempered `^0.6` pop ratio, turnout-weighted-mean-normalized so the national
total is conserved), so radiation concentrates where the most warheads ground-burst
(the biggest/most-targeted states). `_nukeStateShares` generalized: `_nukeConcWeight`
returns the per-category weight (urban→`_NUKE_URBAN`, fallout→`_NUKE_POP_W`), a clamp
keeps two concentrating rows from crowding out the rest, non-concentrating rows
rescale to fill the remainder (urban-only path byte-equivalent to before). Verified
via a real-51-state Node sim (`census_split_check`): national totals land on
31/62/60/57M, Injured tops 42 states, Irradiated tops the 9 biggest (CA/NY/IL/PA/OH…),
Survivors+Dead top none. (b) Code 1 `_NUKE_CLOUD_SCALE = 1.5` (~50% bigger) multiplies
the mushroom-cloud animation keyframes — scales both the procedural cloud and a custom
`_NUKE_IMPACT_IMG`. Verified: nuke_check 123/123 (split-share + A()-lead tests retuned
to the new pattern, +3 config/wiring assertions), full regression suite green
(lowfx 24, statecard 18, scoreboard 7, enightsets 9, saveload 10, msdim 7, wmtip 9,
trio 9, theme 14, themeswap 10, fog 15, qpage 11, visitmap 15, enight 8, tvcard 6,
reshuffle 13) + census_split_check, both files EXECUTE CLEAN.

**45. Nuke census: safe rural states → Survivors plurality (Jul 2026)** — Code 2.
The most rural states with no military targets take far fewer warheads, so the
SURVIVORS lead there. New `_NUKE_SAFE_STATES` (default VT/WV/ID/IA/WI/OR) +
`_NUKE_SAFE_CASUALTY` (0.5): at the end of `_nukeStateShares`, a listed state's
casualty rows (Dead/Injured/Irradiated — anything with a target) are scaled to the
factor and the freed share is poured into the balance row (Survivors), which lifts
Survivors clear of every casualty category regardless of the state's size (proof:
Survivors_new = S + (1−f)·C ≥ f·maxCat for any f<1 since C ≥ maxCat). Small national
side-effect (Survivors tick a few M above their 57M base). Verified: census_split_check
now asserts Survivors top EXACTLY the safe list (6), Injured the ~36 mid states,
Irradiated the 9 biggest, Dead none, national totals in tolerance; nuke_check 124/124
(+1 safe-state wiring; the CA/WY A() test unaffected — neither is a safe state), full
regression suite green, both files EXECUTE CLEAN.

**46. Nuke: downwind fallout plumes on the final damage map (Jul 2026)** — Code 1,
in `__nukeAftermath`. Each recorded ground burst (`window.__nukeScorches`) now also
gets a fallout plume: a teardrop streaming EAST (west→east prevailing winds), rounded
at the source and tapering to a point downwind, in semi-transparent powder red so
overlapping plumes build into the denser regions (like a real dose map — modelled on
the reference the user supplied). Two `<path>` bands per burst — wide low-dose halo
(`_NUKE_FALLOUT_HALO`) + narrower high-dose core (`_NUKE_FALLOUT_CORE`), length
`scorch-radius × _NUKE_FALLOUT_LEN` (16), with a small per-plume wind drift; the
`__nukePlumePath` helper builds the teardrop, `_NUKE_FALLOUT_ON` gates it. Drawn
UNDER the existing smoke/char crater (4 children/burst now, aftermath idempotence
count updated). Final damage map only (already gated on `__isFinalElectionMapRaw`).
NOTE: the census A() lead test was made deterministic (`runAFixed` neutralizes the
±12% jitter) — after the census retune the WY Injured-vs-Survivors margin is narrow
enough to flip under jitter. Verified: nuke_check 125/125 (+2: plume count = bursts×2,
tapers east; aftermath count → ×4), stable ×3, full regression suite green + render
preview, both files EXECUTE CLEAN.

**47. Nuke terminal-screen layout fixes (Jul 2026)** — four tweaks to the nuke
Election Night / final map. (1) **Wire-feed briefings → top-left of
`#main_content_area`.** `__nukeWireLine` now appends `#nuke-wire` to
`#main_content_area` (was `#map_container` — whose edge-feather mask faded the
corner) and the CSS pins it `top:8; left:10`; `#main_content_area` gets
`position:relative` as the anchor and `__nukeTvTick` removes the box when the
night ends (it now outlives the map svg). (2) **"Final Results" button
left-aligned with the state panel** — `#game_window.acop-nuke-tv #map_footer {
left: 817px }` (matches `#state_result_container`), keeping the footer's own
`top:580` so the vertical is unchanged. (3) **Header no longer shows the bg
image** — the `.game_header` was already `opacity:0`, but that revealed
`#game_window`'s OWN `background.png` as a strip; `#game_window.acop-nuke-tv` now
gets `background:#000 / background-image:none` so the whole window (header strip
included) is black. (4) **World Map button removed during the attack** — Code 2
`_addWorldMapBtn` tears down the button and creates none while `_nukeWar >= 2`
(re-checked every observer tick). Verified: nuke_check
130/130 (+5: black-out, content-area anchor, wire top-left, footer-left-817,
world-map-remove wiring), full regression suite green + render preview
(button.left == state panel == 817), both files EXECUTE CLEAN.

**48. Nuke final map: solid bottom edge + grey state-wash (Jul 2026)** — Code 1.
(1) The `#map_container` edge-feather mask's `to bottom` gradient changed
`…black 97%, transparent 100%` → `…black 100%` so the BOTTOM edge no longer blurs
to transparency (sides + top still feather). (2) On the final damage map,
`__nukeAftermath` now lays a semi-transparent grey rect (`_NUKE_STATE_WASH`,
rgba grey ~0.62; `_NUKE_STATE_WASH_ON`) as the FIRST child of
`#nuke-aftermath-layer` — over the state paths (the whole aftermath group sits on
top of them) but UNDER the fallout plumes, so it mutes the census tints (esp. the
red Injured states, which the map's own `saturate(1.4)` was pushing) toward grey
while the plumes drawn after it keep their colour and read clearly. Plume colours
bumped a touch more vivid (`_NUKE_FALLOUT_CORE` rgba(226,52,100,0.30)). Rect sized
to the svg viewBox. Idempotence count updated (`scorches × per + 1`). (3)
`#map_container` made **uniformly bigger** on the nuke screen (791×570, was
721×500) with `margin-left/top` shrunk by half the growth so the map SVG — which
keeps its fixed 721×400 and stays flex-centred — doesn't move; it just gains black
margin all round. Capped so the right edge (~846) stays clear of the result panels
(x:817): the mask's right-edge feather fades the container margin before it reaches
them, so the panels stay crisp. Verified: nuke_check 134/134 (+4: bottom-solid
feather, wash-under-plumes first-child, wash config, container-bigger-svg-untouched;
aftermath count → ×4 + 1), full regression suite green + render previews (plumes
pop against the washed states; bigger container, panels crisp), Code 1 EXECUTES CLEAN.

**49. Nuke fallout billows (Jul 2026)** — Code 1, `__nukeAftermath`. Each plume
band (halo + core) now carries a slow, infinite transform oscillation
(`scale` swell/undulation, `transform-box: fill-box; transform-origin: 0% 50%` so
it rolls out from the SOURCE end rather than pulsing in place). Per-plume duration
(4.2–7.0s) + negative-delay phase are derived from a second coordinate hash, so no
two plumes move in unison — the aggregate of ~180 out-of-phase semi-transparent
plumes reads as living, drifting fallout. `_NUKE_FALLOUT_BILLOW` gates it; off
under low demand mode + reduced motion (the static teardrops remain). Verified:
nuke_check 136/136 (+2: every plume path carries a running animation; config +
low-fx/reduced-motion gating) + a two-timepoint bbox check (plume swells over
time), full regression suite green, Code 1 EXECUTES CLEAN.

**50. Nuke fallout screen: state-only wash + noise gif off + wire left-justified
(Jul 2026)** — Code 1. (1) The grey state-wash now overlays a grey COPY of each
census-coloured STATE path (identified by matching its fill against
`window.__nukeCensusColors` via `__nukeCanonColor` — plugin-independent, works on
the final-map svg) instead of a full-viewBox rect, so ONLY the states mute; the
ocean/background is untouched. Fallback to the full rect only if no states can be
identified. Idempotence count is now `scorches × per + washCount`. (2) The FALLOUT
(final damage) map drops the TV noise gif — `__nukeTvTick` stamps
`acop-nuke-final` on `#game_window` when `__isFinalElectionMapRaw()`, and
`#game_window.acop-nuke-final #map_container { background-image:none;
background-color:#0a0a0a }` gives a flat tube-black behind the plumes (Election
Night, only `.acop-nuke-tv`, keeps the live noise). (3) `#nuke-wire`
`text-align:left !important` (the engine centres content in `#main_content_area`).
Verified: nuke_check 139/139 (+3, incl. a controlled census-states-vs-ocean svg
confirming only the 3 states wash + no full rect; billow still plumes-only), full
regression suite green + render (states muted, ocean untouched), Code 1 EXECUTES CLEAN.

**51. Nuke chyron → header strip (Jul 2026)** — Code 1. The civil-defense chyron
crawl moved from the bottom of the map to the HEADER strip (where the ACOP
title/logo would be — `.game_header` is opacity:0 on the nuke screen, so the strip
sat empty). `__nukeChyron` mounts it on `#game_window` (NOT `.game_header`, which
would inherit opacity:0) — position:relative under `.acop-nuke-tv` — and
`#nuke-chyron` is repositioned `top:30px` (centred in the ~85px header), a
gold-ruled oxblood banner with top+bottom borders. Both terminal screens (Election
Night + final map), same as before. Verified: nuke_check 140/140 (+1 header-position
CSS; the mount test now asserts parent==#game_window), full regression suite green +
render (banner reads across the header), Code 1 EXECUTES CLEAN.

**52. Final-results nav buttons → centred bottom row (Jul 2026)** — Code 1 CSS,
NOT nuke-specific. The engine parks `#map_footer` (which carries the 6
`.final_menu_button` nav buttons) at top:580/left:600 on every final-results
screen, where the buttons squash into a corner. The `.acop-final-tv` block only
re-laid the final MAP's footer; the results narrative (winner picture + text) and
the other final maps kept the squashed default. New general rule keyed on
`#map_footer:has(.final_menu_button)` (the mod already uses `:has()`) lays them as
a centred, wrapping row along the bottom (`bottom:40; left:50%;
translateX(-50%); flex; width:760`) on ANY such screen, with `#game_window` made
position:relative as the anchor. Scoped `:not(.acop-nuke-tv)` so the nuke war-room
footer (its own placement) is untouched; the in-game map footer (resume + World
Map, no `.final_menu_button`) is unaffected. Verified: nuke_check 141/141 (+1 CSS
assertion), full regression suite green, render (6 buttons in one centred row 40px
off the bottom, footer centred in the window), Code 1 EXECUTES CLEAN.

**53. Nuke panels + Final Results button nudged 40px left (Jul 2026)** — Code 1.
`#overall_result_container`, `#state_result_container` and `#map_footer` on the
nuke screen moved from `left:817` → `left:777` (both the active Election Night and
the final damage map, via the shared `.acop-nuke-tv` scope). They now sit at the
map's right edge rather than out in the black margin. Verified: nuke_check 141/141
(the two 817 assertions retuned to 777), render confirms all three shifted, Code 1
EXECUTES CLEAN.

**54. Nuke wash stronger + fallout-map buttons to the bottom row + bigger buttons
(Jul 2026)** — Code 1. (1) `_NUKE_STATE_WASH` alpha 0.62 → 0.78 (greyer states,
plumes pop harder). (2) The nuke FALLOUT (final damage) map's 6 `.final_menu_button`
nav buttons were squashed under the state-results panel (they fell under the nuke
`left:777` footer rule). The centred-bottom-row rule now also targets
`#game_window.acop-nuke-final #map_footer:has(.final_menu_button)` — its (2,2,0)
specificity out-ranks the `.acop-nuke-tv` `left:777` (2,1,0), so the fallout map
gets the row while the nuke ELECTION NIGHT (single "Go to Final Results" button,
no `.acop-nuke-final`) keeps 777. (3) Row buttons made bigger for ALL final screens:
font 11 → 13.5px, padding 4/8 → 7/13, gap 5/6 → 7/9, row width 760 → 820.
CAUTION LEARNED (again): a stray backtick in a CSS comment ('left:777' was first
written with backticks) terminated the main-stylesheet template literal — caught
by mod_exec_check, fixed to apostrophes. Verified: nuke_check 142/142 (+1 bigger-
buttons; row + wash asserts retuned to the comma-selector / new grey), full
regression suite green + renders (stronger wash, nuke fallout buttons in a centred
row clear of the panels), both files EXECUTE CLEAN.

**55. ACOPNight.demo() — normal Election Night shortcut (Jul 2026)** — Code 2,
right after the `window.ACOPNuke` block. The non-nuke twin of `ACOPNuke.demo()`:
same engine jump (`final_state_results = A(1)` → `electionNight()`), no census.
Each call RE-ARMS the opening sting/intro flags, clears any stale
`#enight-intro-anim` overlay, and RE-ROLLS `_enightSetIdx = -1` — so repeated
calls preview the opening sets (CBS etc.) without replaying a run. Refuses (warn +
return) while `_nukeWar >= 2` — run `ACOPNuke.reset()` first, otherwise the night
would render half-nuked. Preview line added to AUTHORING_TODO §2. Verified:
enightsets_check 15/15 (+3 wiring: jump-no-census, re-arm/re-roll/clear-overlay,
nuke-guard), saveload 10/10 + nuke_check 142/142 unchanged, Code 2 EXECUTES CLEAN.

**56. Reshuffle: filing-card animations on the Officials screen (Jul 2026)** —
Code 2, four module-level helpers right before `openOfficialsPanel` (module level
so the harness can extract them). The replacement candidates now behave like a
DECK of index cards. `_rsDealDeck(cands)`: on picker open the cards start stacked
at the first card's position (per-card `dx = firstLeft − cellLeft`, so no layout
measurement beyond offsetLeft) and flick out staggered 95ms with a slight
rotation — `fill: 'backwards'` so a card sits in the deck during its delay
instead of flashing in place first; the picker itself slides up like an index
drawer. `_rsFileSwap(cell, cands, target, done)`: unpicked cards slide back into
the deck, the outgoing holder tilts + drops out of its slot, and a
POSITION-FIXED clone of the chosen card (`#rs-fly`, fixed so scroll/offset
parents can't skew the path) flies from the picker to the role card's rect,
scaling to it; `done` (choose + re-render) fires only on landing, then
`_rsSettle(varName)` drops the newly seated card in. Clone styling is set
property-by-property, NOT via `style.cssText` — clobbering cssText would wipe any
inline styling a card carries (a photo background would vanish mid-flight; the
cards have none today, so this was pre-emptive). Fail-safes: `done` is called
exactly once (`fired` latch) and still fires when the target card is missing or
zero-size; the picker's buttons are disabled during the flight so one appointment
can't be double-committed. Gate `_rsAnimOk()` = not `_lowFx()`, not
prefers-reduced-motion, and `element.animate` exists → otherwise the ORIGINAL
instant path runs untouched. Pure WAAPI over the existing markup, no layout
changes, so the chart can't shift. Verified: rsanim_check 15/15 (gate ×3, deal
stagger/deck-origin/fill, flight clone + fixed positioning + source hidden,
outgoing filed + others returned, commit-once-on-landing + clone cleanup,
missing-target fail-safe, settle + low-fx skip) + renders of the mid-deal and
mid-flight frames; reshuffle_grace 13/13, saveload 10/10, nuke 143/143, lowfx
24/24, enightsets 15/15, orgglow 9/9, orgtip 10/10 unchanged; Code 2 EXECUTES CLEAN.

**57. Nuke panels: CRT tube bezel + phosphor-green readouts (Jul 2026)** — Code 1
CSS, nuke-scoped. (1) `#overall_result_container` / `#state_result_container` gain a
**border-image bezel**: a radial gradient 9-sliced at 45.5% — the corner slices catch
the disc's quadrants (rounded tube corners + moulding highlight), the edge slices fall
in its transparent zone, and `fill` paints the dark centre across the screen as the
tube wash — plus a grey housing via `box-shadow` spread and a real drop shadow.
KEY PROPERTY: `border-image-width` does NOT participate in layout, so the bezel paints
entirely outside the 210px box and the panel contents never move (measured identical
212x162 layout boxes with and without). 42px is the largest that clears the game
window at the panels' `left:777` (right edge 1045 of 1050; 58px overflows). Static
paint, no animation — no low-fx gate needed. The panels carry no mask, so unlike
`#map_container` there is no conflict with an edge feather. (2) Readouts switch from
amber to **phosphor green** `#8f8` (rows, footers `#7d7`, glows retinted green), and
the same green is applied to the panel h3 bars, the `#nuke-chyron` crawl and the
`#nuke-wire` news ticker — so every broadcast readout on the screen matches. The
oxblood bands and gold rules are unchanged. Verified: nuke_check 146/146 (+3: bezel
geometry, green readouts incl. a no-amber-left check over the reskin block, chyron +
ticker green; the reskin regex window widened for the inserted bezel), full regression
suite green + render, Code 1 EXECUTES CLEAN.
(3) GROUND SPLIT, by what each band actually is: bright oxblood was chosen for CREAM
text and muddies green's glow to olive, so the panel h3 bars — which sit INSIDE the
tube — move to a dark phosphor ground `#0d1a0d` with a green glow (they now read as
emitted by the screen, separated from the rows by the existing gold rule), while the
`#nuke-chyron` crawl — OUTSIDE the tube, a broadcast banner — stays red but drops to
deep maroon `rgba(42,10,8,0.94)`, dark enough for clean green (contrast 10.7 → 14.6:1).
Legibility was never the issue: every candidate ground cleared AAA. Verified:
nuke_check 147/147 (the oxblood assertion split into an inside/outside pair, each
asserting the OTHER ground is gone).

**58. Midterms: verdict ladder, two-thirds warnings, baseline fix (Jul 2026)** —
Code 2 `_MIDTERM`. A review of what the screen actually tells the player turned up
three faults. (1) BUG: `verdictHold` hardcoded the word "down" but `{HG}`/`{SG}` are
SIGNED deltas from `dlt()`, so a Republican gain rendered as "down +4 in the House".
Not an edge case — the Senate delta is +2 in every non-wave scenario, including at
game-start settings. All verdict copy now lets the number carry the direction
("House {HG}, Senate {SG}"), and a harness assertion forbids gluing a direction word
to a delta token. (2) NO WIN STATE: the swing is always pro-Democrat (`SWING.MID`
0.030 is unconditional, so the floor is D+3.0% even at 100 approval / zero
Watergate) and the Democrats hold both chambers at every reachable swing — so the
old binary could only ever say "bloodbath" or "bruised but standing", even when the
player GAINED seats. Replaced with a four-tier ladder on the R House delta:
`verdictGain` (net gain) / `verdictHeld` (losses ≤ `HELD_RLOSS` 10) / `verdictBruised`
(< `WAVE_RLOSS` 30) / `verdictWave`. All four verified reachable over an
approval×watergate sweep (126/106/149/427 of 808 combos). (3) BASELINE: `HBASE` read
242+192 = 434 while `house()` always returns 435, so every R delta was one seat too
generous; rep → 193. Plus a new `#_mt_sup` line under the verdict for the two-thirds
lines the model already crosses (`SUPER` = House 290 veto-proof, Senate 67 = the
votes to convict on impeachment) — at historic-1974 settings the Democrats land on
exactly 290, and in the bad cases 67–70 Senate seats, which matters far more to this
presidency than the seat count. Hidden via `:empty` when neither is crossed. Also the
control markers now sit on the line the labels promise (218/435, 51%) instead of the
bar midpoint. Verified: midterm_check 19/19 (+6: bloodbath tier, veto warning, all
four tiers keyed, gain-reads-as-win, the no-direction-word rule, Senate-67 warning
only where earned), saveload 10/10 + nuke 147/147 unchanged, Code 2 EXECUTES CLEAN.

**59. Midterms: opening titles before the reveal (Jul 2026)** — Code 2
`_MIDTERM`. A sting + title animation now run before the seat-by-seat reveal, the
same authoring shape as the main Election Night's `_ENIGHT_SETS`: new
`CFG.INTRO = { sting, url, durationMs }` (both halves FILL ME IN). The sting goes
through `_playEggAudio` (so the music tape ducks and restores itself); the
animation is an `<img id="_mt_intro">` covering the fixed overlay at z-index 4 —
UNDER the studio's CRT scanlines (z 5), so the tube chrome washes over it, matching
the nuke EBS intro. CRUCIALLY the reveal roll is HELD until the titles finish:
`beginRoll()` is latched and called either by the click handler or the durationMs
timer, so seats are never called over the animation and the two can't both start it.
Click-to-skip (`title="Click to skip"`, cursor:pointer). Fails safe per half —
sting only = silent titles skipped and the roll starts at once, url only = no audio,
both '' = today's behaviour exactly. Verified: midterm_check 25/25 (+6: shipped-inert,
sting + cover geometry, z-order + cursor, reveal-waits, self-clear then roll,
click-skips-early). Authoring entry: AUTHORING_TODO §2.3.

**60. Election Night: hold the count while the titles run (Jul 2026)** — Code 2.
The engine gives every state a `result_time` on its own clock (0..480, +10 per 2s =
FIVE units per second) and calls each as the clock passes it — so the evening was
running on underneath the opening title card and the player missed the first calls.
New optional per-set `intro.mapDelayMs` + `_enightHold`: on the tick the titles
fire, every state that has NOT yet reported is pushed that many ticks further down
the clock (states already called are left alone, so nothing is dragged backwards).
Clicking the titles away calls `_enightHold.release()`, which hands back only the
UNUSED part of the hold — a skip therefore starts the count instead of leaving the
player on a frozen map for the rest of the delay. Applied before the `intro.url`
check, so a set can hold the map with or without an animation; omitted/0 = the old
behaviour exactly (set B has no hold). Set A (CBS) = 10000. NOTE the mismatch to
watch: CBS's `durationMs` is 20000, so with a 10s hold the count resumes ~10s before
the card clears — match the two numbers if the intent is strictly "count starts when
the animation ends". Verified: enightsets_check 20/20 (+5: the CBS-only config, the
50-tick shift at 5/sec, already-reported states untouched, skip-returns-unused,
no-hold-leaves-the-clock-alone), saveload 10/10 + nuke 147/147 + midterm 25/25
unchanged, Code 2 EXECUTES CLEAN.

**61. Election Night: sting fires WITH the animation (Jul 2026)** — Code 2. The
opening theme used to play the moment the opener popup appeared, while the title
card only went up when OK dismissed it — so audio led the picture by however long
the player left the popup open. The popup-sting observer is gone; the sting now
plays inside the intro block on the same tick as the animation, before the
`intro.url` check so a sting-only set still sounds. `_enightStingPlayed` stays the
once-per-run guard (it is in `_SL_SCALARS` + the New Game reset) and `_enightSet()`
still rolls lazily, so the roll simply happens at the intro instead. Verified:
tests/enightsets_check 23/23.

**62. Nuke panel stacking + the Election Night button hide (Jul 2026)**
(a) **The two nuke result cards overlapped and buried the footer button.** The
CASUALTY CENSUS and DAMAGE ASSESSMENT panels sat at `top: 96` / `top: 270` — only
174px apart for a card that measures ~177px with a full census in it, so the
LAYOUT BOXES themselves overlapped before any bezel was drawn, and the damage
card's shadow reached the "Go to Final Results" button (which at z-index 10 lost
to the panels' 8996 and vanished behind them). Retuned against MEASURED numbers,
not estimates: a pixel scan of a rendered panel puts the CRT bezel's painted
extent at **22px above / 38px below / 29px each side** of the layout box (the
`42px` border-image outset and the `0 8px 22px 16px` shadow both paint far less
than their nominal reach, because the gradient's visible ring sits at 10.5–12.5%
of the slice). Panels → `top: 2` / `top: 258`, nuke footer → `top: 600` with
`z-index: 8997`. NOTE the coordinate trap: these tops are relative to
`#main_content_area`, which this block makes `position: relative` as the wire
feed's anchor — **add 90px** (85px `.game_header` + 5px padding) for game-window
coordinates. That offset-parent shift is why an isolated mock of the panels
disagreed with the real screen. The FINAL damage map is untouched by the footer
rule: its 6-button nav row is laid out by the bottom-anchored
`#game_window.acop-nuke-final #map_footer:has(.final_menu_button)` rule, whose
(2,2,0) specificity out-ranks the `.acop-nuke-tv` (2,1,0) one.
(b) **`_enightInProgress()` widened** (Code 2) to the same two-branch test Code
1's `__isElectionNightRaw` uses: `#final_result_button`, OR the
`#overall_result ul` + `#state_result` + map-svg triple with the in-game map and
final screens excluded. The single-button test went blind during the "Processing
Results, wait one moment…" beat — the engine swaps the footer out, so the Manual
and World Map buttons flashed back for it.
Verified: nuke_check 67/67 (+8 runtime PANEL STACKING assertions measuring the
real cards with real content on BOTH nuke screens, incl. the bezel bleed — they
fail on the old 96/270/580 values, checked), chrome_check 11/11 (+2 for the
Processing Results beat), full suite ALL GREEN, both files EXECUTE CLEAN.

**63. Theme: "In the Bunker" (Jul 2026)** — Code 1, a second entry in
`ACOP_THEMES` (grep `ADD THEMES BELOW`). The Emergency Operations Center look:
everything the ENGINE paints goes transparent
(`coloring_title`/`coloring_window` + the live `.game_header`/`#game_window`/
`.container`), exactly as the default entry does, and `corrr = ''` so the header
strip carries no logo plate at all. `#game_window` also drops the host's
`background.png` (`background-image: none`), which was what showed through the
transparent strip. Net: the strip shows the PAGE — except on the nuke map, where
`#game_window.acop-nuke-tv` blacks the window and the chyron keeps its ground.
The page is the bunker hallway
(`Bunker-hallway-1900x800.jpg`) at its NATURAL size, TILED to cover anything
bigger (Aug 2026 — `contain` + centred + `fixed` was tried first and replaced).
All four background properties are set EXPLICITLY and !important, NOT cleared to
'' (Aug 2026): clearing an inline declaration does not give you the browser
default, it gives you whatever the HOST's stylesheet says — and the host has a
body `background-size` rule, which stretched the hallway vertically. The default
entry now `removeProperty`s the four first (a plain assignment cannot clear an
!important flag) and then sets its own explicit values.
 `bgColor = '#000000'` is the ground
beneath, visible only if the image fails to load. `body.style.minHeight = '100vh'`
is still required: a body background paints only BODY's box, so on a short page
the host site's own colour showed as pale bands above and below. The banner is `nukelogo2.png` at its
OWN SIZE (Aug 2026 — fitting it to the division's height was the previous
treatment): the shipped rule `div.center img#header { width:100%; height:100%
!important }` would stretch it, so `height:auto` / `width:auto` /
`max-width:100%` / `margin:0 auto` / `background:transparent` go on as INLINE
!important — the only thing that out-ranks a stylesheet !important. `max-width`
is the one guard, and does nothing unless the image is wider than the division.
The SEATING is transparent too — `div.center` and EVERY wrapper above it, reached
with a descendant `:is(div, section, …):has(div.center)` — so the logo bleeds
straight into the hallway instead of sitting on a plate. The descendant form
matters: the host nests the banner several levels deep and the OPAQUE one is an
outer wrapper, so stopping at the immediate parent left the logo on black. The
rule is `!important`, which is what lets it beat the host's INLINE background;
being a class rule, dropping the class hands that inline value back untouched.
Deliberately not `*:has(div.center)` — that would match body, whose background
IS the hallway.
THE LOGO'S EDGE FALLOFF IS IN THE ASSET (Aug 2026), not in CSS. The original
`nukelogo.png` had an alpha channel but only a few pixels of falloff — measured
mean alpha 239, 87% of pixels at 224+, solid 255 through the middle — so with
nothing behind it it still read as a rectangle. A CSS mask was tried and dropped
in favour of re-cutting the file: a smoothstep vignette over the outer 14% of
each axis (74px / 42px), MULTIPLIED into the existing alpha so the image's own
soft border survives. Mean alpha 239 → 187, corners and edge midpoints at 0,
centre still 255. The re-cut file is hosted as `nukelogo2.png` (Aug 2026), which
is what the theme points at — the original `nukelogo.png` is left in place
unfeathered, so do not switch back to it expecting the fade. The theme deliberately carries NO mask, and the test asserts
its absence — a mask plus a feathered file would compound. All of it (logo box, seating, the game window's
paper) is CSS on `body.acop-theme-bunker`, NOT inline styles on host elements:
see change 73 for why that distinction matters. No
FILL ME IN slots left in this theme.
THREE mechanisms, because each survives something different: the image on the
legacy `background` ATTRIBUTE; `no-repeat`/`backgroundSize` on inline style
(which `_syncLowFxBg` leaves alone — it only clears backgroundImage and
backgroundColor); the black fill on the legacy `bgColor` ATTRIBUTE. NOTE the leaks to reset per
theme: the default entry clears `backgroundRepeat`, `backgroundPosition`,
`backgroundAttachment` and `minHeight`. The bunker theme no longer sets the
first three, but the resets stay — the next theme that does will need them. Two traps
handled, worth knowing for the NEXT theme: (a) a flat-colour theme cannot use
`body.style.backgroundColor` — `_applyTheme` calls `_syncLowFxBg()` afterwards
and that clears the inline colour — so it sets the legacy `body.bgColor`
ATTRIBUTE instead, and the default theme now clears that attribute on the way
back; (b) clear an unused page background with `removeAttribute('background')`,
never `background = ''`, which resolves against the page URL and loads the HTML
as an image. Selectable from the picker and via `themeSwap('In the Bunker')`.
Verified by driving the real registry: registers, appears in the dropdown,
repaints (window/title/bg), hands back to the default cleanly, unknown names
still fall back.

**64. Nuke hit-point editor — `ACOPNuke.moveHits()` (Jul 2026)** — Code 1, next
to the strike code (inside the `__nukeTvTick`…`__mapVisitTick` block the
harnesses extract). Drag-and-drop authoring for `_NUKE_HIT_OFFSET`, same shape
as the World Map's "Move Icons": a red crosshair per state at its current aim
point (bbox centre + offset), drag to move, and a bottom-left panel prints the
paste-ready config with Copy / Reset all / Done. Shift-click test-fires one real
warhead at the point; double-click resets that state and drops it from the
table. A drag writes straight into the live `_NUKE_HIT_OFFSET`, so a test fire
uses the new point at once. Coordinates come from `svg.getScreenCTM().inverse()`
(handles the viewBox scale and any CSS transform — no manual delta maths), and
the tool runs on ANY screen showing the US map, not just the nuke ones: the
offsets are svg user units of the same map everywhere, so you can work on the
calm final damage map instead of mid-barrage. ONE ordering trap: the crosshair
re-hoist has to sit at the very END of `__nukeTvTick` — `__nukeAftermath` is
called from inside that tick and self-heals its layer, so a hoist placed earlier
in the function is undone in the same pass (caught by the harness). Exposed as
`window.ACOPNukeHits` (Code 1) and surfaced on `window.ACOPNuke.moveHits` (Code
2). Verified: nuke_check 74/74 (+6: mount on centres/above the map, drag writes
the rounded offset + prints it, untouched states stay out of the config,
re-hoist above a re-appended layer, double-click reset, teardown + reopen),
full suite green, both files EXECUTE CLEAN.
AUTHORED (Aug 2026): 27 states dialled in with the tool and pasted into
`_NUKE_HIT_OFFSET`. Biggest nudges are the shapes that motivated it — CA 99,
MI 70 (the lake gap between the peninsulas), FL 61, TX 58, AK 57 svg units.
A 75th assertion guards the table: >=20 well-formed entries with at least one
real (>20 unit) nudge, so an accidental wipe back to `{}` fails the suite.
FOLLOW-UPS (Aug 2026): re-centring the aim point was not enough — MIRVs and
barrage re-strikes scattered by a fraction of the BOUNDING BOX, so for MI/FL/
AK/HI a good share still landed in open water however well the centre was
placed. New `__nukeScatter(path, bb, aimX, aimY, spread)` samples around the
CORRECTED aim point and keeps the point on the landmass via
`path.isPointInFill` — exact where a bbox fraction can never be (Michigan's two
peninsulas count, the lake between them does not). SELF-CALIBRATING: if the test
cannot see the aim point itself (transformed path, no API) it is dropped for
that state and the plain bbox scatter stands, so a coordinate mismatch can never
collapse every warhead onto one pixel. Dials: `_NUKE_SPREAD_MIRV` (0.25),
`_NUKE_SPREAD_BARRAGE` (0.35), `_NUKE_SPREAD_ONLAND`, `_NUKE_SPREAD_TRIES` (12);
spread 0 = every warhead on the exact aim point. The barrage also re-reads
`_NUKE_HIT_OFFSET` at fire time, so a live drag in the editor moves re-strikes
that are still queued. Verified: nuke_check 81/81 (+6, incl. a RING fixture
whose bbox centre is a hole — asserts zero hits in the water with containment
on, that the same scatter WITH IT OFF does hit the hole, and that an uncalibrated
state still spreads).

**65. The exec check could not fail (Aug 2026)** — a backtick inside a CSS
comment shipped (`SyntaxError: Unexpected identifier '#game_window'` in the
host), even though `mod_exec_check.js` had DETECTED it and printed its THROWS
dump: the script never set a non-zero exit code, and `tests/run_all.js` decided
pass/fail purely on whether `execFileSync` threw. So the runner logged
`PASS  Code 1 executes  ok` over a file the browser could not parse. Three
fixes: (a) `mod_exec_check.js` now `process.exit(result.ok ? 0 : 1)`; (b) it
gained a PRE-FLIGHT LINT for the specific trap — any backtick inside a `/* */`
comment is rejected BY LINE NUMBER before the eval, because the SyntaxError
itself points hundreds of lines away from the real culprit (there are none in
either file, so flagging all of them costs nothing); (c) `run_all.js` now also
requires the `EXECUTED CLEAN` line in the output, so a silent exit can't pass
again. New `tests/execcheck_check.js` (6) poisons a COPY of each mod file four
ways — backtick in a CSS comment, unbalanced backtick, runtime throw at load,
duplicate `const` — and asserts the checker rejects every one. Verified against
the real broken file: run_all now reports `FAIL Code 1 executes` and names line
5625. THE LESSON, worth generalising: a harness whose failure path has never
been exercised is not yet known to work — make it fail once before trusting it.

**66. Nuke panels: +15px right, pins gone (Aug 2026)** — Code 1. Both war-room
result panels moved `left: 777 → 792`, and the Final Results button followed to
792 to keep the alignment. Right-edge clearance re-checked: 792 + 210 +
29px of measured bezel bleed = 1031 of 1050. And a new rule drops their
pushpins: `makeDraggable` gives every results panel a red sticky-note pin
(`'<id>-pin'`, appended to `#main_content_area`), the `.acop-final-tv` block
already hid its two, and the nuke screen was the one results screen still
showing them — through a CRT bezel. Verified: nuke_check 82/82 (+1 pins, the
777 panel assertions retuned to 792), suite green.

**67. Nuke performance: two concurrency budgets (Aug 2026)** — Code 1. Profiled
rather than guessed (a Node/Playwright harness firing a full 51-state night plus
barrage, then a 90-burst damage map, sampling live nodes + `getAnimations()`).
Findings: the Election Night strike layer does NOT leak — it drains to 0 nodes —
so the late slowdown is peak CONCURRENCY (the gratuitous barrage lands on top of
the main salvo's tail), and the damage map was running **180 infinite WAAPI
animations**, one per plume band, each re-rasterising a big blurred
semi-transparent path every frame. Two caps, both capping concurrent work only —
nothing is dropped from the picture: `_NUKE_MAX_CLOUDS` (14) limits mushroom
clouds animating at once on Election Night (over budget an impact keeps its
flash + ring and is still RECORDED for the damage map, so the aftermath is
unchanged), and `_NUKE_FALLOUT_BILLOW_MAX` (45) limits billowing plumes on the
damage map — every plume is still DRAWN, a STRIDED sample animates (stride, not
"the first N", so motion stays spread over the map instead of clustering in the
states called first). Measured: damage-map animations 180 → 90 and its build
23.7ms → 5.0ms; Election Night peak 212 → 158 nodes and 136 → 115 animations.
0 disables either cap. AND THE FILTER, now dropped on the fallout map (Aug 2026,
on request): `#game_window.acop-nuke-tv #map_container svg` carries
`filter: sepia(.3) saturate(1.4) brightness(.85)`, and the aftermath layer lives
INSIDE that filtered svg — so every billow frame re-ran the filter over the whole
721x400 map, the dominant per-frame cost there. `#game_window.acop-nuke-final
#map_container svg { filter: none }` ends it. Election Night KEEPS the tint
(nothing billows there, so there is no repeated cost). Look consequence to watch:
the plumes and census colours were tuned THROUGH that sepia+saturate, so on the
fallout map they now read cooler and less warm — retune `_NUKE_FALLOUT_CORE` /
`_NUKE_STATE_WASH` if they sit wrong. Verified:
nuke_check 90/90 (+8: plumes still all drawn, capped subset animates,
cap 0 restores all, deterministic across rebuilds, cloud cap holds, over-budget
impacts keep flash/ring, and are still recorded).

**68. Nuke EBS card sized to its content (Aug 2026)** — Code 1. The EBS opener
popup was pinned to `#map_container`'s exact box (change 36), so a short warning
sat in a card covering the whole map. `__nukeEbsTick` now sets `height: auto`
with `max-height` = the map's height, keeping the map's `left` and `width`; the
bottom bound is the `padding-bottom: 20px` on `#election_night_window.nuke-ebs`,
so the card ends ~24px below the OK button (20px padding + the 4px border).
Measured on a realistic popup: height 316 vs the map's 570, left/width still
matched, bottom inside the map. The EBS intro STILL is deliberately unchanged —
it is `inset: 0` inside `#map_container` (which is `position: relative`), so it
fills the map exactly, which is what the beat wants. Verified: nuke_check 93/93
(+3: card ends below the OK button and is shorter than the map, keeps the map's
left/width and stays inside it, intro still fills the container exactly).

**69. The nuke branch wears "In the Bunker" (Aug 2026)** — Code 2. The census
now calls `themeSwap(_NUKE_THEME)` from inside `_nukeApplyCensus`, so the page
goes plain black for the bunker beat and the whole of election night. Chosen
there rather than at any one call site because EVERY entry to the census goes
through it — the answer hook, `ACOPNuke.demo()`, `ACOPNuke.census()` and the
save-restore re-apply. Why it was needed at all: the nuke screens black out
`#game_window` and hide the host banner themselves, but the PAGE behind them
still carried the Watergate gif. Routed through the registry, so the picker
follows and `_gameTheme` (already in `_SL_SCALARS`) makes a mid-war save reload
black. `_nukeReset` hands the look back via `_ACOP_DEFAULT_THEME` — but ONLY
when `_gameTheme` still names the bunker theme, so a player who picked it
themselves keeps it (a manual pick is a session preference, per the theme
how-to). `_NUKE_THEME = ''` disables the whole behaviour. New harness
`tests/nuketheme_check.js` (10) drives the real Code 1 registry against the real
Code 2 census/reset: swap, picker sync, event-swap recording, unwind, the
manual-pick-survives case, and the disabled case.

**70. Nuke bug: skipping out early lost most of the damage map (Aug 2026)** —
Code 1. Clicking "Go to Final Results" while warheads were still in flight — or
just reaching the end while the gratuitous barrage was still raining, which it
does for up to 45s after each declaration — left those states with NO plumes on
the fallout map. Cause: `window.__nukeScorches` is only written by
`__nukeOneMissile` at the moment a ground burst actually LANDS, and the queued
strikes bail out (`svg.isConnected`, the `body.acop-nuke` guard) once the screen
is gone. So the damage map was a record of what the player happened to watch
render, not of the war. Fix: bursts are now TAGGED with their state
(`__nukeOneMissile` takes an `abbr`), and `__nukeFillScorches(svg)` — called at
the top of `__nukeAftermath` — tops the record up to `__nukeExpectedBursts(abbr)`
for every state on the map: `1 + round((salvo-1) * 0.55) + round(quota * 0.5)`,
the expectation values of the two ground/air coin flips. The lead warhead is
ALWAYS a ground burst, which is what makes the test reliable — a state with no
record at all is exactly a state whose warhead never landed. Runs ONCE
(`__nukeScorchesFilled`, cleared where the scorch list is), and the synthesized
points are pushed into `__nukeScorches` so later rebuilds reuse them and the map
doesn't reshuffle between viewings. A night watched to the end synthesizes
nothing. Verified: nuke_check 98/98 (+5: never-reached states get bursts and are
drawn, once-only + stable across revisits, full night adds nothing, impacts
record their state) — and the first of those was checked to FAIL against the
un-fixed code.

**71. Nuke post-election nav row 22px lower (Aug 2026)** — Code 1, one rule:
`body.acop-nuke #game_window:has(#map_footer .final_menu_button) { min-height:
647px }` (the stock 625 + 22). Done by GROWING the window, not by cutting the
row's `bottom` from 40 to 18 — the row is bottom-anchored, so a taller window
carries it down while the air beneath it is preserved. Measured, doing both at
once shifted it 44px, which is the trap here. Covers every post-election screen
in the path: the fallout damage map (`.acop-nuke-final`) and the
narrative/table screens (neither -tv nor -final, but still under
`body.acop-nuke`). Works because the nuke screens do NOT get `logo-hide-style`'s
fixed 692px height — its detectors stand down under `body.acop-nuke` — so the
window there is auto-height on min-height:625. Measured: row 564..585 → 586..607,
window 625 → 647, gap under the buttons still 40px, nothing clipped; the normal
final screens are untouched. Verified: nuke_check 99/99 (+1, which also asserts
the bottom-offset override is ABSENT, so the two can't creep back together).

**72. Four fixes after a misread (Aug 2026)** — Code 1. Change 72's first pass
read "I want the banner to be completely transparent" as *hide the banner*; it
meant *take the black off it*. Reverted, plus three real faults it exposed.
(a) **The banner stays visible.** The hide rule is gone entirely — and it had
never worked anyway: `body.acop-nuke-screen #header` is (1,1,1) and the main
stylesheet's `div.center img#header { display: block !important }` is (1,1,2), so
it lost the cascade regardless of sheet order. Change 41 reported it working
because the assertion only checked the RULE EXISTED. The test is now a pixel
probe of computed display, asserting the banner IS shown.
(b) **The window is solid black again.** A gradient leaving the top 90px
transparent was tried so the page would show through the banner strip; but that
strip is where `#nuke-chyron` sits, and its semi-transparent maroon band then
picked up whatever was behind the page — pale blue on the host site, on Election
Night too. Reverted to the flat fill.
(c) **The page background now covers the viewport.** `bgColor` paints BODY's
box, so on a short page the host site's own colour showed as bands above and
below the hallway image. The bunker theme sets `body.style.minHeight = '100vh'`
(cleared by the default entry, like every other background property).
(d) **The nav row actually moves.** Change 71 raised `min-height` 625 → 647,
which does nothing once the content is TALLER than it — which these screens are.
It passed a harness whose stub content was short: a false green. Now
`padding-bottom: 22px` on `#game_window`, which extends the padding box; an
absolutely positioned child's `bottom` is measured from that edge, so the row
moves 22px whatever the content height. The runtime check uses 700px of content
and asserts row +22, window +22, gap unchanged.
LESSON, the same one as change 65: a harness that doesn't reproduce the real
conditions produces a false green just as confidently as a true one.
Verified: nuke_check 106/106, nuketheme 17/17, suite green.

**73. The default theme was whitening the page (Aug 2026)** — Code 1, a bug I
shipped in `d70b919`. The bunker theme forced the banner's SEATING transparent by
writing inline styles onto host elements, and the default entry undid that with
`removeProperty('background')` — which does not restore anything, it DELETES
whatever inline value the host had there first. `div.center`'s parent is the
host's own page wrapper, and its background is inline, so every load wiped it:
`_mountThemePicker()` applies the default theme at mount, so the area behind the
game window, the footer and the credits all went white with no theme switch
involved. Fixed by moving every host-furniture override to CSS hung off a
`body.acop-theme-bunker` class (logo box, seating via `div:has(> div.center)`,
and `#game_window`'s paper) — dropping a class is a clean undo, writing into a
host element's inline style never is. THE RULE, worth generalising: a theme may
set inline styles on what the theme mechanism already owns (`nct_stuff` colours,
the body background attribute, `corrr`), but must not write into the host page's
own elements — use a body class and a stylesheet. Verified: nuketheme_check 24/24
(+2, including a regression check that applying the default theme leaves a host
inline background intact — confirmed to FAIL against the un-fixed code).

**74. Nuke map injects a track into the music player (Aug 2026)** — Code 2,
the same mechanism as the Allende easter egg (grep `Last Speech`): append a
`window.Song` to the live `window.playlist`, point `currentSongIndex` at it,
refresh the `<select>` (via `window._rebuildPlaylistSelect`, falling back to a
hand-appended `<option>`), `window.loadAndPlay()`. Config `_NUKE_TRACK`
{title, artist, url} next to `_NUKE_THEME`; `url: ''` disables it.
FIRED FROM THE `electionNight` WRAPPER, not from `_nukeApplyCensus` where the
theme swap lives — the census runs a question EARLIER, at the bunker answer, so
hanging the music there would start it over the last question instead of over
the map. The wrapper already gates on `_nukeWar >= 2` and is where the screen is
actually built. Once per run: `_nukeTrackPlayed` in `_SL_SCALARS` + cleared by
`_nukeReset`, so revisiting the map (or `ACOPNuke.demo()` twice) neither stacks
copies nor restarts it. Fail-safe exactly like the Allende egg — the whole thing
no-ops unless `Song`/`playlist`/`loadAndPlay` are up, so it cannot break the
screen if the player has not been built. NOT gated by low demand mode, matching
the Allende precedent. Verified: nuketheme_check 33/33 (+6: config + saved flag +
fires-from-the-wrapper-not-the-census greps, and a runtime drive against a stub
player — appends/selects/plays once, revisits don't stack, no-player no-ops
instead of throwing).

**TESTS NOW LIVE IN THE REPO (`tests/`) — run `node tests/run_all.js`.** The
scratchpad was wiped when the container recycled and every harness built that
session went with it (they were never committed). Rebuilt and COMMITTED, 258
assertions over the areas that carry the most machinery:
`nuke_check` (106), `midterm_check` (32), `enightsets_check` (23),
`saveload_check` (20), `rsanim_check` (16), `chrome_check` (11),
`nuketheme_check` (33),
`census_split_check` (10), `execcheck_check` (6).
`run_all.js` also runs `mod_exec_check.js` over both files first. Docs +
conventions: `tests/README.md`. PUT NEW HARNESSES THERE, not in the scratchpad.
Still unrebuilt (older ground, rebuild when next touched): lowfx (24), statecard
(18), fog (15), visitmap (15), theme (14), reshuffle_grace (13), qpage (11),
themeswap (10), orgtip (10), trio (9), orgglow (9), wmtip (9), enight (8),
scoreboard (7), taglow (7), msdim (7), tvcard (6).

### A Cancer on the Presidency_init (draft).txt

No changes from this session — both Sandinista! and feature branch versions are identical.

### Infrastructure

- `.gitignore`: excludes `__pycache__/` and `.claude/` (worktree directories)
- `CLAUDE.md`: session-startup force-push instructions to prevent lost work from remote resets

---

## Pending — decided, not yet implemented

(P1 — the "Question X" turns-lapsed counter — was implemented Jul 2026; see
change-log item 26.)

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