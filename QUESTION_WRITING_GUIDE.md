# Writing questions: how it all hooks together

A reference for when you're writing questions and want them to *do* something. It covers
the two places a question gets wired, what an answer can change, and how the systems
built in September 2026 work: the President's Men pressure, Initiative, the chart's
warnings, and news on the desk.

Everything here lives in **Code 2** (`ACOP Nixon_Agnew.txt`) unless it says Code 1.
Each section gives a `grep:` anchor so you can jump straight to the code.

For the list of things still waiting on content, see `AUTHORING_TODO.md`. For the full
technical history, see the change log in `CLAUDE.md`.

---

## 1. The two places you wire a question

| You want something to happen… | Write it in | Keyed by |
|---|---|---|
| …when a **question appears** (its date, image, a story on the desk, a theme change) | `questionData` | the **question** pk |
| …when the player **picks an answer** (stats move, a charge is granted, someone joins the Enemies List) | `cyoAdventure` | the **answer** pk |

Question pks look like `401`, `402`… Answer pks look like `3545` (that one belongs to
question 401). Both are the `pk` numbers in the questions/answers JSON blocks.

**Always key by pk, never by "question 5".** The mod reorders questions (the short
campaign, the nuclear branch), so a position number would point at the wrong question.

### 1a. `questionData` (grep: `const questionData = {`)

One entry per question pk. Every field is optional, and a question with nothing
special doesn't need an entry at all.

```js
409: {
    date: "20 November 1972",          // shown when you hover "Question X"
    signImg: "https://…/PK409.jpg",    // the campaign-sign picture
    transition: {                      // a full-screen PART title card before it
        title: "PART II: Fulmination",
        body: "…",
        img: null,
    },
    onShow: () => { _pressureOn = true; },  // code to run as the question appears
    stinger: () => _mkSong('Patton Theme', 'Jerry Goldsmith', 'https://…'),  // music cue
    historical: `<p>What really happened…</p>`,  // a "Historical" button on the feedback popup
    news: { ifAnswered: [3545], html: '<p>…</p>' },  // a story on the desk (section 5)
},
```

### 1b. `cyoAdventure` (grep: `cyoAdventure = function`)

This runs after every answer. `ans` is the pk of the answer just given, so each effect
is one `if`:

```js
if (ans == 3545) { Deanloyalty -= 2; Deanexposure += 1; }
if (ans == 3546) _addTeamAction('initiative', 1);
if (ans == 3547) { enemyBump('Archibald Cox', +2); enemyAdd('Daniel Schorr'); }
```

Use `==` rather than `===`. It works whether the engine stores the answer pk as a
number or as text, so a type mismatch can never silently stop an effect firing.

The grants have their own labelled spot inside `cyoAdventure` (grep: `GRANT CHARGES`).
Put them there so they're easy to find later.

---

## 2. What an answer can change

All of these are plain variables. Change them with `+=`, `-=` or `=` in `cyoAdventure`.

**The President**
- `WatergateExposure`: 0–20. Nixon's own exposure; the impeachment dial.
- `MentalState`: higher is worse. It drives the dimming of the question page and the
  advisor photos (bands: 4 or less is composed, then 6, 7, above 7).
- `ApprovalRating`, `MediaRelations`, `Economy`, `RelationswiththeSoviets`, `defcon`
  (5 = peace, down to 1 = nuclear war; 1 arms the nuclear branch).

**The President's Men**: three variables per man, named `<Name>loyalty`,
`<Name>exposure` and `<Name>STATUS`. For example `Deanloyalty`, `Deanexposure`,
`DeanSTATUS`.
- **loyalty**, 0–10. At 10 he never cracks under pressure.
- **exposure**, 0–10. How much the investigation has on him.
- **STATUS**: `5` active · `4` cut loose · `3` indicted · `2` imprisoned ·
  `1` state's witness (has turned).

The men: Haldeman, Ehrlichman, Dean, Colson, Mitchell (the inner circle), Chapin,
Segretti, Strachan, Krogh, Hunt, Liddy, Magruder, LaRue, Stans, Kalmbach, McCord,
Kleindienst. The burglars use lower-case `Watergateburglarsloyalty` /
`Watergateburglarsexposure` / `Watergateburglarsstatus`.

**Shortcuts for common story beats**
- `_payOff('Hunt')`: hush money as a story beat. +1 loyalty, and his pressure is frozen
  for 4 turns.
- `_addTeamAction('hush', 1)` / `('clemency', 1)` / `('initiative', 1)`: give the
  player a charge to spend (section 4).
- `enemyAdd('Name')` / `enemyBump('Name', +2)`: the Enemies List (`ENEMIES_LIST.md`).
- `_RESHUFFLE.offer({ SOS: { candidates: ['Connally'], delay: 0 } })`: offer a cabinet
  change, best from an `onShow`. Leave it unanswered for two turns and the pick is
  made at random.
- `themeSwap('In the Bunker')`: change the page theme.

**Adding a brand-new variable?** Declare it with `var` (never `const` or `let` at the
top level), and add its name to `_SL_SCALARS`, or it won't survive a save and load.

---

## 3. The President's Men: how the pressure works

grep: `WATERGATE PRESSURE ENGINE`

During **Part I** the chart only moves when your answers move it. The engine switches
on at **pk 430** ("PART II: Fulmination"), and from then on, every turn:

- **Exposure climbs the chart.** A man's exposure leaks +1 to the men above or beside
  him: every 2 turns at exposure 8–10, every 4 at 5–7, every 6 at 2–4, never at 0–1.
  A man at exposure 2 or less absorbs nothing. The five inner-circle men leak the
  same way into **Nixon's** `WatergateExposure`.
- **Exposure fades** for minor figures. Below 3 it drops by 1 every 3 turns, unless he
  is indicted or imprisoned.
- **Loyalty erodes** with exposure: -1 every 2 turns at exposure 9–10, every 4 at 7–8,
  every 6 at 5–6. Loyalty 10 is immune. Indictment doubles the rate.
- **The breaking point.** A man at loyalty 0 with exposure 8 or more gets 3 turns'
  grace. After that it's a 1-in-3 chance each turn that he **turns state's witness**.
  When he turns, +2 exposure spreads along his connections, and if he's inner circle
  it goes straight onto Nixon's dial.

So in practice: **raise a man's exposure and cut his loyalty in answers, and from Part
II the engine plays out the consequences.** You don't script the flip itself; you set
up the conditions for it.

To force a man to turn regardless, call `_flipWitness('Dean')` from an answer.

---

## 4. The player's moves: Hush Money, Clemency and Initiative

grep: `GRANT CHARGES` (granting) · `_TA_WIRED` (what each action does)

On the President's Men screen the player has three buttons:

| Button | Paid from | What it does |
|---|---|---|
| **Hush Money** | its own charges (`'hush'`) | +1 loyalty, and his pressure is frozen for 4 turns |
| **Offer Clemency** | its own charges (`'clemency'`) | +2 loyalty for 4 turns to a loyal man (loyalty above 5) who is indicted or imprisoned. Void if his situation changes |
| **Initiative ▾** | one shared pool (`'initiative'`) | a dropdown of six moves, each with a price: |

| Initiative move | Cost | What it does |
|---|---|---|
| Cut Them Loose | 1 | disowns an active man (STATUS 4); his leaks up the chart slow to half |
| Pin the Blame | 1 | on a man with loyalty 3 or less: his exposure +2, loyalty -2, and Nixon's exposure -1. Only once Nixon's exposure is above 10 |
| Smear | 2 | that man can never turn state's witness. He still leaks exposure |
| Interrogate | 1 | reveals his true loyalty through Fog of War, for good |
| Grace | 1 | nothing moves on the chart next turn |
| Stonewall | 2 | for 3 turns nothing reaches Nixon from the inner circle. The chart below keeps heating up, and a man who **testifies still gets through** |

> **Nothing grants a charge yet.** All three counters sit at 0 for a whole run, so
> none of these moves can be used until you add grant lines. Add them as you write
> the answers that should earn them:
>
> ```js
> if (ans == 3546) _addTeamAction('initiative', 1);   // in GRANT CHARGES
> ```
>
> The Enemies/Friends button glows green when a charge arrives, so the player always
> knows. Grant two at once with `_addTeamAction('initiative', 2)`.

---

## 5. The chart reports on itself

grep: `_ORG_CRACK_LINES`

This happens automatically; you don't author anything. On the **first** turn a man
reaches his breaking point (section 3), the player is warned while there's still time
to act:
- the Enemies/Friends button glows red,
- his card on the chart gets a red ring,
- a line appears above the chart ("…has retained his own lawyer").

When a man actually turns, the same line announces it.

To retune it:
- `_ORG_CRACK_LINES`: the warning lines; add more freely. `{N}` is replaced with his
  name.
- `_ORG_FLIP_LINE`: the "has turned" announcement.
- `_ORG_NEWS_TURNS`: how many turns a line stays up.

---

## 6. News on the desk: a story set up by an earlier answer

grep: `NEWS ON THE DESK`

An answer early on can put a story in front of the player later. A briefing book is
thrown onto the desk beside Nixon's portrait, and clicking it opens the story. The
throw and the popup are copied from 1976: Year Zero.

**To author one,** add `news` to the *later* question's `questionData` entry, naming
the *earlier* answer:

```js
// If the player picked answer 72 earlier, a story lands at question 8:
8: { news: { ifAnswered: [72], html: '<p>The story, as HTML.</p>' } },
```

- `ifAnswered: [72, 73]`: shown if the player gave **any** of these answers earlier in
  the run. Leave it out and the story always appears at that question.
- `when: () => FBI !== 'Felt'`: an optional extra condition on the game state.
- `html`: the story. Tooltips work inside it, as they do in questions.
- **Photos in the story:** just add `<img src="https://…">` after the headline. It's
  shown at most 125px tall at its own proportions, on the left, with the story's text
  running down its right side. The next headline always starts below it. Give an
  image its own `style="…"` to lay that one out differently.
- `src` / `width`: a different picture on the desk. Leave them out for the briefing
  book.

**Several headlines on one question:** make `news` a list. Each story has its own
conditions, and **every** story whose conditions hold goes into the same popup,
stacked in the order you list them. That lets an atmospheric headline (no conditions,
always shown) share the popup with one that depends on an earlier answer:

```js
402: { …, news: [
    { html: `<h2><b>US Jetliner Hijacked</b></h2><p>…</p>` },          // always
    { ifAnswered: [3545], html: `<h2><b>Cabinet Ordered Out</b></h2><p>…</p>` },  // only after 3545
] },
```

If none of a question's stories hold, nothing lands on the desk. Nothing is added
between stories; put an `<hr>` in a story's html if you want a dividing line. If one
story has a `src`, the first such picture is what lands on the desk.

Good to know:
- It stays on the desk until it's clicked or the question is answered. **Once opened
  it's gone.** The player can't reopen it, as in Year Zero.
- There's one object on the desk per question, however many stories it holds.
- The desk image is `_NEWS_DEFAULT_IMG`, 106px wide (`_NEWS_DEFAULT_WIDTH`). Where it
  rests is `_NEWS_DESK_LEFT` (across the strip) and `_NEWS_DESK_BOTTOM` (its gap above
  the bottom edge). The photo height cap is `_NEWS_PHOTO_MAX_H`.
- The popup's look is the `panel.style` lines in `openModal`, still Year Zero's dark
  panel for now.
- To try one without authoring: open any question, then in the browser console run
  `ACOPNews.preview('<p>any html</p>')`.

---

## 7. Text features you can use in questions, answers and feedback

- **Tooltips** on people and terms are added automatically from `tooltipList`. To give
  a name a second version of its card for one occurrence, wrap it in
  `<span data-tip>Kissinger</span>`. The how-to is at the top of `CLAUDE.md`.
- **Historicity highlights**: `<span class="hist-v">…</span>` (words actually said on
  that occasion) and `<span class="hist-vo">…</span>` (actually said, but somewhere
  else). They're invisible unless the player ticks "Historicity".
- **Capitals:** write names in normal case. The tooltip matcher is case-sensitive, so
  "KISSINGER" won't get its card. If you want text displayed in capitals, use CSS.

---

## 8. Rules that bite

1. **Never put a backtick inside a comment within the CSS or HTML strings.** It
   silently breaks everything after it.
2. Module-level variables are `var`. Never declare the same `const` or `let` twice.
3. A new per-run variable must go in `_SL_SCALARS`, or saves forget it.
4. After any edit, run the checks below. Both files must say **EXECUTED CLEAN**.

---

## 9. Checking your work

In the repo:

```bash
node mod_exec_check.js "ACOP Nixon_Agnew.txt"                    # does Code 2 load?
node mod_exec_check.js "A Cancer on the Presidency_init (draft).txt"   # Code 1
node tests/run_all.js                                            # everything
```

In the browser console, during a game:

| Command | Shows |
|---|---|
| `ACOPNews.preview('<p>…</p>')` | a story thrown onto the current question |
| `_RESHUFFLE.offer({ SOS: { candidates: ['Rockefeller'], delay: 2 } })` | a cabinet reshuffle offer |
| `ACOPNight.demo()` | jump straight to Election Night |
| `ACOPNuke.demo()` | jump straight to the nuclear Election Night |
| `ACOPEnemies.state()` | the Enemies List as it stands |
