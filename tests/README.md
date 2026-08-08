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
| `saveload_check.js` | `_SL_SCALARS` integrity and the capture/restore round-trips |

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
