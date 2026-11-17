# tests/

Harnesses for the mod. **Run everything with one command:**

```bash
node tests/run_all.js
```

That runs `mod_exec_check.js` on both mod files first, then every `*_check.js`
here.

## Why these live in the repo

They used to live in the scratchpad, which is wiped when the container recycles —
and in Jul 2026 that took ~22 suites with it. Anything worth keeping goes here
and gets committed.

## The suites

| file | covers |
|---|---|
| `nuke_check.js` | the DEFCON-1 branch: census config, TV chrome + detectors, screen CSS, missile strikes (deferred recolour, MIRV, air bursts, low-fx), broadcast furniture (EBS, chyron, wire, NORAD), the final damage map (plumes, state wash, billow) |
| `census_split_check.js` | the casualty split over the REAL 51-state data — national totals vs targets, and which category tops which kind of state |
| `midterm_check.js` | the 1974 midterms: model maths, the four-tier verdict ladder, two-thirds warnings, the broadcast skin, the opening titles |
| `enightsets_check.js` | Election Night opening sets: the roll, sting/gif pairing and timing, the map hold, click-to-skip |
| `rsanim_check.js` | the cabinet-reshuffle filing-card animations (deck deal, the changeover flight, settle) and their gates |
| `chrome_check.js` | the injected Manual + World Map buttons across screen changes (pulled for Election Night, back on the final results screens) |
| `nuketheme_check.js` | the page theme following the DEFCON-1 branch: swap in, unwind out, and the manual-pick case that must survive it |
| `initiative_check.js` | the Initiative button: the three-button row, the dropdown (prices, the reason a locked action prints under itself), and that every pooled action really spends ONE shared pool |
| `orgnews_check.js` | the President's Men chart reporting on itself: the breaking-point warning, the state's-witness announcement, and the glow/chip/ring surfaces |
| `news_check.js` | news on the desk: a story set up by an earlier answer (`questionData[pk].news` + `ifAnswered`), Year Zero's throw and popup, and the adaptations around them |
| `saveload_check.js` | `_SL_SCALARS` integrity and the capture/restore round-trips |
| `runstate_check.js` | the WHOLE of Code 2, executed: New Game resets everything, a save/load round trip loses nothing, and every module-level mutable is classified as saved or knowingly not (a new unregistered variable fails by name) |
| `rerun_check.js` | the host re-running Code 2 in place: Code 1 once, Code 2 five times into one page. The previous execution hands back the shared engine data pristine, only the newest one acts (onShow, eggs, shortcuts, buttons, the A()/electionNight wrappers), and subscribers, listeners, stylesheets and singleton elements stay flat |
| `signals_check.js` | the glows on Enemies/Friends and Officials named in a text badge (Reshuffle / Reshuffle: last turn / New actions / News), raised through the real code paths; includes the per-turn reshuffle re-sync that makes the last turn's red actually appear |
| `execcheck_check.js` | the execution check itself — poisons a copy of each mod file four ways and asserts it rejects every one |

## Writing a new one

Two patterns, both used above:

- **Static** — read the mod file and assert against the real source (config
  values, wiring, CSS rules). Cheap, and catches a config being silently
  reverted.
- **Runtime** — extract the real functions or block with `extractFn` /
  `indexOf` slicing, inject them into a Playwright page over a stub DOM, and
  drive them. This is what catches actual behaviour.

Prefer runtime checks for anything with timing or DOM effects. Keep the
extraction anchors on distinctive lines, and when an anchor breaks because the
source moved, fix the anchor rather than loosening the assertion.

**A rule worth keeping:** never assert only that something *exists* — assert
what it does. Several of these tests exist because a feature was present but
behaving backwards (the midterm verdict printing "down +4", the static flare
rendering invisibly).

**And test the tests.** `mod_exec_check.js` once found a stray backtick in a CSS
comment, printed its THROWS dump — and exited 0, so the runner logged PASS and
the break shipped. `execcheck_check.js` exists because of that: it poisons a
copy of each mod file and asserts the checker actually rejects it. Any harness
whose failure path has never been exercised is a harness you don't yet know
works — force it to fail once before trusting it.
