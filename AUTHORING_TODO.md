# AUTHORING TODO — what needs drafting / input from you

Everything the code is waiting on, in one place. Each item says WHERE to put
it (grep anchor — line numbers drift) and WHAT format it wants. The live
in-code list is always `grep "FILL ME IN"` across both files; this document
organises it. Systems marked **inert** do nothing until filled, so nothing
here blocks playing the current build.

Last checked: Jul 2026 — after the nuke broadcast package + gratuitous
barrage (stress-tested clean: ~90 warheads, no leaks, no dropped frames).

---

## 1 · The DEFCON-1 nuke path (inert until item 1.1)

Full mechanics doc: `NUCLEAR_WAR.md`. Preview everything WITHOUT authoring:
console `ACOPNuke.demo()`.

- [ ] **1.1 The bunker question — THE switch for the whole branch.**
      Write the "missiles are inbound" question + its answer(s).
      - Question into `questions_json` (Code 2), parked PAST the played
        range (like the campaign-length tail); answers into `answers_json`
        with `fields.question = <its pk>`.
      - Then set `var _NUKE_Q_PK = <pk>;` (grep `_NUKE_Q_PK`, Code 2).
      - One answer is enough; more work fine (any of them fires the census).
      - Optional: answer feedback text (the last words before the count).
- [ ] **1.2 Census endings.** With no Electoral College the ending resolves
      through `no_electoral_majority_message` — currently the placeholder
      "We all win?". Author it on the census candidates in `candidate_json`
      (Code 1, pks 10701 / 50000 / 70000 / 80000), plus
      `no_electoral_majority_image` (currently the stock image). The
      `description` fields on 50000/70000/80000 are still
      "Put description here" — they surface on candidate screens.
- [x] **1.3 EBS attention tone** — DONE. `_NUKE_EBS_TONE_URL` set to the
      file.garden `Emergency_broadcast_system.ogg`; plays once as the warning
      popup appears (skipped under low demand mode).
- [ ] **1.4 Impact rumble.** `_NUKE_RUMBLE_URL` (Code 1) — distant boom,
      throttled to one per 2.5s no matter how many warheads land. Short
      clip (~1–2s) works best.
- [ ] **1.5 (optional) Custom animated mushroom cloud.**
      `_NUKE_IMPACT_IMG` (Code 1) — an animated gif/webp URL; replaces the
      built-in procedural cloud at every impact. '' = keep procedural.
- [ ] **1.6 Missile rotation check.** When you first run `ACOPNuke.demo()`,
      if the missile artwork flies sideways, adjust `_NUKE_MISSILE_UP`
      (degrees; 90 assumes the artwork's nose points up).
- [ ] **1.7 (optional) Retunes — all authored, working defaults:**
      - `_NUKE_CENSUS` targets: Dead 31M / Injured 55M / Irradiated 40M /
        Survivors = balance of `_NUKE_TOTAL_POP` (210M).
      - `_NUKE_URBAN` urbanisation tiers (who dies where).
      - `_NUKE_STRIKE_WAVES` timetable (ND/DC/MT/MO/GA/VA first, then the
        ten most populous, then the rest).
      - `_NUKE_CITY` — the city named per state on the wire feed.
      - `_NUKE_CHYRON_TEXT`, `_NUKE_WIRE_LINES`, `_NUKE_RESTRIKE_LINES` —
        the broadcast copy.
      - `_NUKE_RESTRIKES` (20) / `_NUKE_SLBM_SHARE` (0.22) — barrage size
        and submarine share.
      - `_NUKE_ELECTION_POPUP` (Code 2) — the EBS warning text on the
        opener popup.

## 2 · Election Night, non-nuke (ACOP News package)

Preview WITHOUT playing a full run: console `ACOPNight.demo()` — jumps
straight to the normal Election Night (re-rolls the opening set each call, so
call it repeatedly to see both sets). Nuke twin: `ACOPNuke.demo()`.

- [x] **2.1 Opening-of-coverage SETS** — DONE, both sets filled.
      `_ENIGHT_SETS` (Code 2, grep it): SET A = CBS (cbs.mp3 + the CBS 1976
      title gif), SET B = Political Spirit '76 (Election Night 1976 Part 1v2
      + political_spirit_76_custom.gif). One is rolled at random per run —
      the sting plays under the opener popup, the gif covers the map when OK
      dismisses it (click to skip). CHECK THE HOLDS: both `durationMs` are
      20000 and set B's is a guess (the sandbox can't reach file.garden to
      measure the gif, and gifs don't report their length) — run
      `ACOPNight.demo()` a few times and set each to its clip's real
      duration.
- [ ] **2.3 Midterm opening titles.** `_MIDTERM.CFG.INTRO` (Code 2, grep
      `INTRO:`) — a sting (audio URL) + title animation (gif URL +
      `durationMs`) shown before the 1974 midterm seat reveal, same idea as
      2.1. The reveal WAITS for the animation, and a click skips it. Either
      half may stay '' (that half is skipped); both '' = inert, the reveal
      starts immediately as it does today. Preview: `_midtermTest()`.
- [ ] **2.2 Projection sting.** `_PROJ_STING_URL` (Code 2) — plays once
      when the 270 popup fires ("ACOP News projects…"). '' = silent.

## 3 · People & flavour content

- [ ] **3.1 Mental-state feedback gifs.** `MENTAL_FEEDBACK_IMGS` (Code 2,
      grep it) — the advisor photo on feedback popups tracks Nixon's
      decline. Three empty `url:` slots: fraying (≤6), freezing up in
      public (≤7), shoving Ziegler (>7). You mentioned having these gifs.
      Ships inert (engine default image) until filled.
- [ ] **3.2 Enemies List photos + close pk.** `ENEMIES_ROSTER` (Code 2) —
      every `img: ''` wants a photo URL (Traitors / Hypocrites / Media).
      And `_EN_CLOSE_PK = null` — the pk after which the '76 Democratic
      field freezes. Doc: `ENEMIES_LIST.md`.
- [ ] **3.3 Placeholder people-tooltips.** ~60 first-draft card bodies in
      the comment-fenced "PLACEHOLDER tooltips" block (Code 2) — revise
      the text, add `img:` photo URLs (all currently null).
- [ ] **3.4 Achievements.** Both files carry a placeholder achievement set
      (grep `FILL ME IN` near `ctsAchievement` / the achievements block in
      Code 1) — real names, art, descriptions, and the Code 2 trigger
      calls to match.

## 4 · Systems built and waiting on content

- [ ] **4.1 Reactive soundtrack.** Code 2, grep the `SOUNDTRACK` config —
      per-section track URLs, mood rules/thresholds, Part IV startPk/name,
      and per-question `stinger:` entries (e.g. Yom Kippur pk → Patton
      theme). Empty sections are inert. Plan: `SOUNDTRACK_PLAN.md`.
- [ ] **4.2 Short campaign ("Cottage Cheese") pk list.** `CAMPAIGN_LENGTHS`
      (Code 2) — the short preset's ordered, date-ascending pk list
      (authoring rules in `CAMPAIGN_LENGTH_PLAN.md` §4.5), plus the two
      description placeholder texts in Code 1's `ACOP_LENGTH_UI`.
- [ ] **4.3 Historicity highlights import.** Toggle + span styling are
      live. Waiting on: your full Q&A docx with blue (verbatim-here) and
      yellow (verbatim-elsewhere) highlights, which gets converted to
      `hist-v`/`hist-vo` spans on import (pipeline notes in CLAUDE.md P3).
- [ ] **4.4 Tape player (P2, parked).** `TAPE_EXCERPTS` — audio URLs + cue
      lists ({t, speaker, text}) per excerpt: "cancer on the presidency"
      (split over two beats), Kissinger/Fallaci apology, 8 Jan 1973
      pretrial. Component not yet built — flag when the question bank is
      tidy and you want it.

## 5 · Small / optional

- [ ] **5.1 Low-demand static background.** `_LOWFX_STATIC_BG` (Code 1) —
      optional static still of backgroundv69 for low-demand mode; '' = a
      flat dark tone (current behaviour, fine).
- [ ] **5.2 Nuke ending screen (future work, not authoring).** The
      terminal screens are now the war-room feed; when you want a bespoke
      nuke ENDING screen (post-results), it hangs off `body.acop-nuke` —
      ask and it gets built around whatever text 1.2 produces.

---

### Format crib

- **Audio**: any direct-URL host that allows hotlinking (jukehost has
  worked for the Allende egg). Paste the URL into the named var.
- **Images/gifs**: file.garden paths like the existing assets.
- **Questions/answers**: same JSON shape as the existing entries; pks must
  be unique across the file.
- After any edit: reload the mod once — a parse error means a stray
  backtick or a duplicate `const` (see CLAUDE.md "Project" rules).
