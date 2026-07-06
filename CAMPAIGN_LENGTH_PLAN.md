# Campaign-Length Selector — Implementation Handoff

**Status:** INFRASTRUCTURE IMPLEMENTED (Jul 2026) — config, selector UI, install
machinery, feature gates and save/load integration are live in Code 2 (grep
`CAMPAIGN_LENGTHS`). Presets: 'full' = "The Big Enchilada" (default), 'short' =
"Cottage Cheese". REMAINING: the short preset's curated pk list + real description
texts (grep `FILL ME IN` in Code 2); §4.5 authoring rules apply. Empty pks = inert. **Audience:** a fresh Claude/Fable session with no prior context.
**Read `CLAUDE.md` first** (session-startup force-push; the two-file Code 1 `A Cancer on the Presidency_init (draft).txt` / Code 2 `ACOP Nixon_Agnew.txt` split; the `new Function()` `var` rule).

---

## 1. Objective

A pre-game **"Campaign length"** dropdown letting the player choose a shorter or full run. Because ACOP is a tightly-scripted narrative (dated questions, section transitions, `cyoAdventure` branching, a turn-driven Watergate simulation), we CANNOT use the shuffle-the-middle trick that 2012 *Little Big Man* uses. Instead:

1. **Curated question-sets** — each length is a hand-authored, chronologically-ordered list of question pks that still hits the key beats and section transitions.
2. **Feature gating** — on the shorter runs, switch OFF the systems that only pay off over a full campaign: **World Map Diplomacy actions** and **All the President's Men team actions** (and, by extension, the whole turn-driven Watergate arc — pressure engine, reshuffle, midterm).

---

## 2. Prior art: how *Little Big Man* does it (and why we can't copy it)

*(Files on branch `origin/Source-Material`: `2012 - Little Big Man_init (1).html`, `…_ObamaBiden (1).html`.)*

- **Selector** (init ~line 3630): an IIFE injects a `<select>` ("Select the number of questions:") into `#difficulty_level`, options `25 (Best)/25 (Static)/40/55/75 (Full)`, writing the value to `campaignTrail_temp.global_parameter_json[0].fields.question_count`.
- **Set-builder** (main ~line 22583, **top-level load code**): keeps `START_INDICES [0..9]` and `END_BLOCK_INDICES [18,20,22,23,24]` fixed, Fisher-Yates **shuffles the middle**, slices to the target, and rewrites `questions_json`.

**Why it doesn't port:** LBM's questions are modular (any middle question can follow any other). ACOP's are not — shuffling would scramble the chronology, orphan `onShow` flag-setters, break `cyoAdventure`/`questionSwapper` branch targets, and drop section transitions. Also LBM builds at **load**; we must build **after** the player chooses (§4.3). So we take LBM's *selector UI* and *questions_json-rewrite* technique, but replace "shuffle" with "install a hand-curated ordered list".

---

## 3. Current state — anchors in ACOP (grep by symbol; line numbers drift)

**Length / end-of-run:**
- The engine ends the run when `question_number === question_count` and fires election night (`campaign_trail.js` ~1800); header reads "Question X of question_count" (~1310). `question_count` lives at `campaignTrail_temp.global_parameter_json[0].fields.question_count` (mirrored `PROPS.PARAMS.question_count`).
- ACOP's own turn clock `_questionCount` is separate (see CLAUDE.md "two clocks") and must NOT be conflated.

**Section transitions** (`questionData`, Code 2 ~line 15561): pk **401** (PART I: Remission), **430** (PART II: Fulmination — its `onShow` sets `_pressureOn = true`, waking the Watergate engine), **432** (PART III: Metastasis), Part IV pk TBD.

**Systems to gate — two kinds:**
- **Always-visible UI (MUST be explicitly gated — they render whenever the player opens the screen, regardless of which questions are in the run):**
  - *World Map Diplomacy* — the `DIPLOMACY ▾` dropdown built in `openWorldMap` (grep `wm-diplo-menu`, `_DIPLO_ACTIONS`, `_diploActionClicked`), plus the per-turn charge income `_DIPLO_INCOME` (`_everyTurn` tick) and the Laird congressional tick.
  - *President's Men team actions* — the four buttons built in `openInnerCircle` (grep `nw-team-actions`, `_TEAM_ACTIONS`, `_teamActionClicked`).
- **pk-triggered systems (fall away naturally if their pks aren't curated in, but add a flag for safety):** the pressure engine (`_pressureOn`, the pressure `_everyTurn` tick, `_ORG_EDGES`), `_RESHUFFLE`, `_MIDTERM`, the `WatergateExposure` chain.

**New Game reset block:** Code 2, the `_lastQNum` decrease branch in the PK-change handler (grep `_RESHUFFLE.reset()` — the reset lines are right there).

**Pre-game injection point:** the mod already injects toggles beside the difficulty selector via the shared observer (Code 1, grep `difficulty_level` / `edu-tips-toggle`). The length dropdown goes in the same place.

---

## 4. Design

### 4.1 Preset data structure (Code 2, near `questionData`)
```js
var CAMPAIGN_LENGTHS = {
  full:  { label: 'Full campaign',   pks: null /* = the whole scripted order */,
           features: { diplomacy:true,  teamActions:true,  pressure:true,  reshuffle:true,  midterm:true } },
  short: { label: 'Short (core)',    pks: [ /* ordered, date-ascending, hand-authored */ ],
           features: { diplomacy:false, teamActions:false, pressure:false, reshuffle:false, midterm:false } },
  // add 'standard' etc. as desired
};
var _campaignLength = 'full';   // set by the pre-game dropdown; default 'full'
function _lengthAllows(feature) {
  var p = CAMPAIGN_LENGTHS[_campaignLength];
  return !p || !p.features || p.features[feature] !== false;   // default-on if unspecified
}
```

### 4.2 The selector UI (pre-game)
Mirror the existing toggles: on the shared observer, once `#difficulty_level` exists and the dropdown isn't already present, inject a `<select>` of `CAMPAIGN_LENGTHS` (label → key). `change` sets `_campaignLength` and persists to `localStorage` (`acop_length`). Read it back at load for the default. **Do NOT rebuild questions here** — only record the choice (§4.3).

### 4.3 Installing the curated set — at GAME START, not load (critical)
The player chooses on the difficulty screen (post-load), so the rebuild must read the *final* choice. Install just before the first question renders:
- Hook the game-start transition (the engine's final pre-game continue, or the first PK-change tick in the observer **before** question 0 is read — verify the engine reads `questions_json[0]` after our hook).
- If `_campaignLength === 'full'` (or `pks == null`): leave `questions_json` untouched.
- Else build `questions_json = [ ...curatedInOrder, ...everythingElse ]` and set `question_count = curatedInOrder.length`:
  - `curatedInOrder` = the preset's `pks` mapped to their question objects (date-ascending, authored).
  - **Append all other pks after** (parked at index ≥ curated length) so `questionSwapper` / `getJumpIndexFromPk` / `corQuestion` tunnels can still resolve a target by pk — same idea as ACOP already parks variants at index ≥25. The engine only *plays* the first `question_count`, so the tail is inert but reachable by branch logic.
  - Keep a pk→object map first (`questions_json` is mutated in place by tooltip baking at load, so build from the current live array).

### 4.4 Feature gating (belt-and-braces on top of curation)
- **Diplomacy dropdown**: in `openWorldMap`, only build the `DIPLOMACY ▾` control when `_lengthAllows('diplomacy')`. Also early-return in `_DIPLO_INCOME`'s tick and the Laird tick when disabled. (Optional: also skip `_diploActionClicked`.)
- **Team actions**: in `openInnerCircle`, only build `#nw-team-actions` when `_lengthAllows('teamActions')`.
- **Pressure engine**: gate the pressure `_everyTurn` tick on `_lengthAllows('pressure')` (and it never wakes anyway if pk 430 isn't curated in). Same pattern for `_RESHUFFLE` offers and `_MIDTERM` if you want them off independently of their pks.
- Everything else (WatergateExposure display on cards, etc.) can stay — it just never moves if the pressure engine is off.

### 4.5 Curation authoring rules (the content work)
Each preset's `pks` list MUST be:
- **Date-ascending** — ACOP questions are dated; out-of-order dates read as broken.
- **Self-contained for branching** — if a kept question's `onShow` sets a flag that a later kept question reads, both must be in; don't keep a question whose `cyoAdventure`/swap target you've cut.
- **Section-coherent** — include the PART transition question for any section you include (or the run won't announce its act). A short "core" run may deliberately span only Parts I–II.
- **Ending-terminated** — the last curated pk should be a proper closing beat (the engine fires election night at the end).

---

## 5. New Game reset
In the reset block, restore `question_count` and `questions_json` for the chosen length (re-run the §4.3 install), or simplest: re-read `_campaignLength` and reinstall. Reset `_campaignLength` only if you want New Game to forget the choice (recommend: keep it — it's a pre-game preference).

## 6. Interaction hazards
- **Tooltip baking runs once at load over `questions_json`** (Code 2 `applyTooltipsToObject`). Since we rebuild the array from already-baked objects (not re-parsing), baking is unaffected — but do NOT rebuild before baking has run.
- **`_questionCount` vs `question_count`**: the curated run changes the engine count; the mod's turn clock still ticks per shown question. Anything keyed to `_questionCount` (diplomacy income cadence, pauses) still works but sees fewer turns — fine, and the gated systems are off anyway.
- **Branch targets in the parked tail**: confirm `getJumpIndexFromPk`/`questionSwapper` resolve against the *rebuilt* array (they look up by pk, so appending the tail preserves them).
- **Section transitions**: `_shownTransitions` keys off pk — unaffected by reordering.
- **Don't gate by hiding a screen the player still needs** — the world map itself stays; only its Diplomacy dropdown goes. The President's Men chart stays; only the action buttons go.

## 7. Decisions needed before coding (content + policy)
1. **The presets** — how many lengths, their labels, and the **exact ordered pk list** for each shorter run (this is the real work; the author picks the questions).
2. **Feature matrix** — confirm each length turns off exactly {diplomacy, teamActions, pressure, reshuffle, midterm} (the assumption here) or a different subset.
3. **Where the run ends** for each short preset (which closing pk / ending).
4. **Default length** and whether the choice persists across New Game (recommend: persist).

## 8. Test checklist
- [ ] Pick "Short" → only the curated pks play, in order, correct dates, proper ending; header count matches.
- [ ] On "Short", the World Map has **no** Diplomacy dropdown and the President's Men screen has **no** action buttons; no diplomacy charges accrue; pressure engine never moves.
- [ ] On "Full", everything is present and behaves exactly as today.
- [ ] A conditional/`corQuestion` or `questionSwapper` target that lives in the parked tail still resolves on a short run.
- [ ] New Game after a short run → length re-applies cleanly (or resets per decision 4); no leftover truncated `questions_json`.
- [ ] Tooltip / edu / expletive / historicity spans still render on curated questions (baking unaffected).

## 9. Symbol quick-reference
`global_parameter_json[0].fields.question_count` (engine length) · `questionData` + PART pks 401/430/432 · `_pressureOn` / pressure `_everyTurn` · `_DIPLO_ACTIONS` / `wm-diplo-menu` / `_DIPLO_INCOME` · `_TEAM_ACTIONS` / `nw-team-actions` · `_RESHUFFLE` · `_MIDTERM` · the `_lastQNum` New-Game reset block. Prior art: `origin/Source-Material` LBM init ~3630 (selector), main ~22583 (rebuild).
