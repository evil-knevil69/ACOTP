# Enemies List — Implementation & Authoring Handoff

**Status:** INFRASTRUCTURE LIVE (Jul 2026). Roster, state, API, panel rendering,
save/load and New Game integration are all in Code 2 (grep `ENEMIES_ROSTER`).
REMAINING (grep `FILL ME IN`): the pk that closes the Hypocrites field
(`_EN_CLOSE_PK`), roster image URLs, and the actual event/answer wiring —
which pks add/bump whom (the content work).
**Audience:** a fresh Claude/Fable session with no prior context.
**Read `CLAUDE.md` first** (the two-file Code 1 / Code 2 split; the
`new Function()` `var` rule; session-startup instructions).

---

## 1. What it is

The **Enemies List** button (Inner Circle → Enemies/Friends → Enemies List)
opens a three-column panel — Nixon's ledger of who is out to get him:

| Column | Membership | Ranking | Closes? |
|---|---|---|---|
| **TRAITORS** | Accretional — starts EMPTY, events add people | Re-ranked by a live **threat** score, rendered as CRITICAL / SEVERE / HIGH / ELEVATED / LOW | Never |
| **HYPOCRITES** | The '76 Democratic field. Kennedy, Humphrey, Scoop Jackson, Church, Bayh present from turn one; Udall, Carter, Brown enter via events | Authored **CLASS grade** (A–F, static, KL-style) + a live **standing** score that drives the sort. `[?]` hover = the man's path to the nomination + his live standing | **Yes** — freezes at `_EN_CLOSE_PK` |
| **THE MEDIA** | Accretional. **Woodward & Bernstein (one entry for the pair) present from turn one**; the rest enter via events | None. Insertion order | Never |

Empty columns show flavour placeholders ("— none identified. Yet. —").
After the close, the Hypocrites header carries "The field is set." and all
hypocrite adds/bumps are silently ignored; Traitors and Media carry on.

## 2. Where the pattern came from (1969–1972 Kennedy/Long)

Analysed from `origin/Source-Material`, `1969-1972_KennedyLong.html` — the
"File" pop-out (button injected beside View Electoral Map):

- **Overview**: hidden stats (economy, cult_support, south_support,
  achievements, vietnam, eminence) indexed into lookup tables of pre-written
  coloured sentences.
- **Homefront** (`menuItemsA`): mostly-static internal-threat cards (Hoover,
  McNamara, Byrd…); events `splice` cards out (fire Hoover → card removed).
- **Battlefront** (`menuItemsB`): the enemies list proper. A hidden horse-race:
  `opponents` score object + `*_active` flags; every answer-pk hook calls
  `updateCandidates(type, amt)` which bumps opponent scores with hand-tuned
  weights; the array is then wiped and re-pushed in sorted order — **the list
  IS the ranking**. Card tooltips state each opponent's formula in prose AND
  show the live score ("Position: 3.7").
- **The payoff**: at question 20 `determineRepublican()` takes
  `sortedOpponents[0]` — the top of the list literally becomes the GOP nominee
  (`republicanChange()` rewrites candidate_json, issue scores, tunnels in the
  matching convention question, selects the matching canned results table).
- Special beats replace cards (Hughes → "CLASS: F — Jesus Christ.").

What ACOP kept: card objects with authored CLASS grades, live scores driving
the sort, rule-stating tooltips with a live number, event-driven splices.
What ACOP changed: accretion (a Nixonian list you ADD to) instead of a fixed
field; three categories; no nominee-selection payoff (not built — see §8).

## 3. Data structures (Code 2, just before `// ── Officials panel data`)

```js
var _EN_CLOSE_PK = null;   // FILL ME IN — pk that settles the Democratic field

var ENEMIES_ROSTER = {
    'Archibald Cox': { cat: 'traitors', img: '', threat: 5, blurb: '…' },
    'Ted Kennedy':   { cat: 'hypocrites', img: '', cls: 'A', score: 6,
                       blurb: '…', path: '…tooltip text…' },
    'Scoop Jackson': { …, label: "Henry 'Scoop' Jackson" },  // display override
    'Woodward & Bernstein': { cat: 'media', img: '', blurb: '…' },  // one card, both bylines
    …
};

const _ENEMIES = {          // the per-run state (const container!)
    traitors: {},           // name -> live threat score
    hypocrites: {},         // name -> live standing score
    media: [],              // names, insertion order
    closed: false,          // Hypocrites frozen
};
```

Roster fields: `cat` ('traitors' | 'hypocrites' | 'media'), `img` (URL, '' →
PHOTO placeholder box), `blurb` (card text, written in Nixon's voice),
`label` (optional display-name override), and per category:
traitors `threat` (default score on first add); hypocrites `cls` (authored
grade A–F, static), `score` (default standing on add), `path` (the `[?]`
tooltip — their route to the nomination).

Grade palette (`_EN_CLS_COLOR`, KL's): A `#D9321E` · B `#D3C683` ·
C `#2DD543` · D `#8CBADB` · F `#8f1204`.
Threat labels (`_enThreatLabel`): ≥8 CRITICAL · ≥5 SEVERE · ≥3 HIGH ·
≥1 ELEVATED · else LOW.

## 4. Authoring API (call from answer hooks / `onShow` / console)

```js
enemyAdd('Jimmy Carter')          // add by roster name; idempotent; category
                                  // comes from the roster
enemyAdd('Jimmy Carter', 3)       // …starting score/threat override
enemyBump('Archibald Cox', +2)    // bump threat (traitors) / standing
                                  // (hypocrites). AUTO-ADDS an absent name at
                                  // its roster default first, so one call does
                                  // "Carter surges out of nowhere"
enemyBump('Jack Anderson', 99)    // media have no scores — degrades to add
```

- Unknown names `console.warn` and return false — no crash.
- Hypocrite adds/bumps after the close return false silently.
- Console access: `window.ACOPEnemies = { add, bump, state, open }`.
- **Adding a new person = adding a roster entry.** Never touch the panel code.

Typical wiring, in the pk-change observer's answer hooks (same place the
crimes-pad / stat hooks live):

```js
// player sacks Cox → he stops being a threat… or becomes a martyr
if (ans === 12345) { enemyBump('Archibald Cox', +3); enemyAdd('Daniel Schorr'); }
// scandal fatigue feeds the outsider
if (ans === 23456) { enemyBump('Jimmy Carter', +2); }
```

## 5. The close (Hypocrites only)

`_EN_CLOSE_PK` (FILL ME IN) — the hook is already wired in the pk-change
observer (grep `the pk that settles the Democratic field`): when that pk is
shown, `_ENEMIES.closed = true`. Frozen = no adds, no bumps; the final ranking
stays visible under a "The field is set." note. Traitors/Media unaffected.

## 6. Housekeeping (already wired — keep it that way)

- **Save/load** (per `SAVELOAD_MAINTENANCE.md`): `_ENEMIES` is a const
  container → captured via `_enemiesSnapshot()` in `_slCaptureMod()` and
  restored **by mutation** via `_enemiesRestore(m.enemies)` in
  `_slRestoreMod()`. A pre-feature save (no `enemies` key) falls back to
  `_enemiesReset()` — the starting field, not an empty panel.
- **New Game**: `_enemiesReset()` in the reset branch (next to
  `_actionCrimes.length = 0`). Restores the five starting hypocrites at their
  roster scores and the starting media (`_EN_START_MEDIA` = Woodward &
  Bernstein), empties traitors, un-closes the field.
- **Panel teardown**: `#enemies_panel` is already in the screen-cleanup
  selector list alongside `#officials_panel`.
- Scores live inside the container — do NOT add them to `_SL_SCALARS`.

## 7. Styling

`#enemies_panel` mirrors the officials panel: full-window overlay,
`background.png`, TypewriterDry. Cards: 52px photo box (PHOTO placeholder
until `img` is filled), bold name, coloured grade/threat line, blurb.
`[?]` opens a dark tooltip card (`.en-tipbox`) with the `path` text +
`(Standing: N)` read live at hover time. All CSS in the IIFE right above
`_enCard` (grep `#enemies_panel {`).

## 8. Not built (deliberate — ask the author before adding)

- **No nominee payoff**: KL crowns `sortedOpponents[0]` as the opposing
  nominee at its close. ACOP's close only freezes the display. If the '76
  ending ever needs "the top hypocrite becomes the Democratic nominee", build
  it on `_ENEMIES.hypocrites` at the `_EN_CLOSE_PK` hook.
- **No card replacement beats** (KL's Hughes "CLASS: F — Jesus Christ.").
  Trivially addable: swap the roster entry's `blurb`/`cls` at the event and
  reopen. Grades are read from the roster at render time, so a roster mutation
  shows immediately.
- **No Overview section / no Friends column** — the menu is called
  Enemies/Friends; a FRIENDS ledger would be a fourth roster `cat` + column.

## 9. Test checklist / harness

Session harness: `enemies_check.js` (scratchpad, 14 checks green Jul 2026) —
starting field ranked, accretion + re-rank in both ranked columns, tooltip
live standing, close semantics per category, media insertion order +
idempotence, unknown-name warn, snapshot round-trip, pre-feature fallback.
In-game smoke test: `ACOPEnemies.add('Jimmy Carter'); ACOPEnemies.bump('Jimmy
Carter', 7); ACOPEnemies.open()` from the console — Carter should top the
Hypocrites column as CLASS D with a live-standing tooltip.

## 10. Symbol quick-reference

`ENEMIES_ROSTER` · `_ENEMIES` · `_EN_CLOSE_PK` · `enemyAdd` / `enemyBump` ·
`_enemiesReset` / `_enemiesSnapshot` / `_enemiesRestore` · `_enThreatLabel` ·
`_EN_CLS_COLOR` · `_enCard` · `openEnemiesPanel` · `window.ACOPEnemies` ·
close hook: grep `settles the Democratic field` in the pk observer.
Prior art: `origin/Source-Material` → `1969-1972_KennedyLong.html`
(`openSurrogates` ~96607, `updateCandidates` ~92313, `determineRepublican`
~95272).
