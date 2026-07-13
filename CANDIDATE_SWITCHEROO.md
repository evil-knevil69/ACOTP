# Candidate "Switcheroo" — mechanic extracted from *1972: More Than Ever*

**Status:** REFERENCE / NOT YET BUILT. This is a lift of the mid-game
protagonist-swap mechanic from `1972 - More Than Ever_NixonAgnew.html`
(on branch `origin/Source-Material`), kept here so we can build an ACOP version
later. Nothing in this file is wired into ACOP yet.

**What it does in More Than Ever (MTE):** partway through the game a chain of
questions can make Nixon **step aside**, handing the campaign to a different
Republican — **Connally, Reagan, Rockefeller, or Agnew** (each paired with
Baker as running mate). From that point the player *is* the new candidate: the
name, portrait, party colour, running mate and the remaining questions all
change, with no engine fork.

---

## 1. The whole trick in one sentence

The engine plays `questions_json` in order and scores each answer through
`answer_score_*_json` keyed by answer pk. So to "become someone else" you only
have to (a) rewrite the cosmetic candidate fields, (b) **overwrite the upcoming
`questions_json` slots** with the alternate candidate's questions, and (c)
**re-point which answers hang off which question**. No new screen, no engine
change — you're editing the same three data structures the engine already reads.

## 2. The two primitives

### `tunnel(new_q)` — fetch a question object by pk
Defined inside `cyoAdventure` (MTE main ~line 68670):

```js
function tunnel(new_q){
    return e.questions_json[e.questions_json.map(f => f.pk).indexOf(new_q)];
}
```

It just returns the question object whose `pk === new_q` from the live
`questions_json`. You assign its return into a *slot index* to make that slot
play a different question:

```js
campaignTrail_temp.questions_json[29] = tunnel(18608);  // slot 29 now plays q pk 18608
```

Because every alternate candidate's questions already live in `questions_json`
(parked, never reached in a normal run), tunnelling them into the upcoming
slots is what "redirects" the campaign. (ACOP already parks variant questions at
index ≥ curated length for exactly this reason — see the campaign-length install.)

### `answerSwapper(pk1, pk2, takeEffects)` — swap which question two answers belong to
MTE main ~line 68178:

```js
function answerSwapper(pk1, pk2, takeEffects = true) {
    const answerData = campaignTrail_temp.answers_json;
    const index1 = answerData.findIndex(item => item.pk === pk1);
    const index2 = answerData.findIndex(item => item.pk === pk2);
    if (index1 === -1 || index2 === -1) return;

    // swap the `question` FK on the two answers
    const tempQuestion = answerData[index1].fields.question;
    answerData[index1].fields.question = answerData[index2].fields.question;
    answerData[index2].fields.question = tempQuestion;

    // optionally re-point their scoring rows too
    if (takeEffects) {
        [campaignTrail_temp.answer_score_global_json,
         campaignTrail_temp.answer_score_issue_json,
         campaignTrail_temp.answer_score_state_json].forEach(jsonData => {
            jsonData.forEach(item => { if (item.fields.answer === pk1) item.fields.answer = pk2; });
        });
    }
}
```

Each answer row has a `fields.question` foreign key saying which question it
appears under. `answerSwapper` **swaps that FK between two answers**, so answer
A shows up where answer B used to and vice-versa. The `takeEffects` flag (usually
passed **`false`** in the swap block) decides whether their *scoring* rows move
too. NOTE: `answer_feedback_json` is NOT touched by this — see §6.

> ACOP parallel: our save/load already snapshots `questions_json` pk-order and
> the `answers_json` question-assignment (for questionSwapper/answerSwapper), but
> deliberately does NOT snapshot effect-json swaps. If we use
> `answerSwapper(…, true)` for real, extend `_slSave/_slLoad` (see the note in
> `SAVELOAD_MAINTENANCE.md`, "Known gaps").

## 3. The per-candidate cosmetic function (`switcheroo14`–`17`)

Each playable swap has a tiny function that rewrites the on-card identity —
first/last name and the party colour on `candidate_json`. MTE main ~line 68508:

```js
function switcheroo14() {                                   // Connally
    var id = e.candidate_json.map(p => p.pk).indexOf(92);   // 92 = the player-candidate pk
    e.candidate_json[id].fields.first_name = "John";
    e.candidate_json[id].fields.last_name  = "Connally";
    e.candidate_json[1].fields.color_hex   = "#752C2B";
}
// switcheroo15 Agnew (#C12620), 16 Reagan (#A01823), 17 Rockefeller (#B5223D)
```

(MTE has ~38 of these — 1–13 opponents, 14–17 the playable Republicans, 18–38
third parties. We only care about the *playable* pattern, 14–17.)

## 4. The trigger — an answer hook that fires the whole swap

In the answer handler (MTE fires these inside `cyoAdventure`, keyed off the last
answer pk `ans`), each playable candidate has a block like this (main ~line 68962):

```js
if (ans == 18529 || ans == 18619) {          // the answers that pick "hand it to Connally"
    switcheroo14();                            // rewrite name + colour
    vicepres = "connallybaker";
    campaignTrail_temp.running_mate_last_name  = 'Baker';
    campaignTrail_temp.running_mate_image_url  = 'https://i.imgur.com/EIGy4fP.png';
    campaignTrail_temp.candidate_image_url     = 'https://i.imgur.com/BohUWx0.png';
    campaignTrail_temp.candidate_last_name     = 'Connally';
    campaignTrail_temp.questions_json[29] = tunnel(18608);   // redirect the last 3 slots…
    campaignTrail_temp.questions_json[28] = tunnel(18581);   // …to Connally's questions
    campaignTrail_temp.questions_json[27] = tunnel(18578);
    answerSwapper(18609, 18611, false);        // re-point two answers onto the new questions
    answerSwapper(18610, 18612, false);
    resign += 1;                               // a flag the endings read
}
```

Reagan / Rockefeller / Agnew are identical in shape — only the pks, portraits,
colour and name differ. So the anatomy of one playable swap is:

1. **`switcheroo##()`** — name + party colour on `candidate_json`.
2. **cosmetic fields** — `candidate_last_name`, `candidate_image_url`,
   `running_mate_last_name`, `running_mate_image_url`, a `vicepres` tag.
3. **`questions_json[slot] = tunnel(pk)`** — overwrite the *remaining* question
   slots with the alternate's questions (MTE does the last 3).
4. **`answerSwapper(a, b, false)`** — move the right answers onto those questions.
5. **a state flag** (`resign`, `vicepres`) the endings/feedback branch on.

## 5. How to build this in ACOP (when we do)

- **Author the alternate's questions** and park them in `questions_json` (any
  index past the played range — same place campaign-length parks its tail).
- **Add a `_switchTo(name)` helper** in Code 2 modelled on the block above:
  set the candidate/running-mate cosmetic fields, colour on `candidate_json`,
  `tunnel()` the alternate's questions into the upcoming slots, `answerSwapper()`
  the answers. Trigger it from a question's answer effect (our answer-hook path
  in the pk-change observer), NOT from engine internals.
- **Figure the slot indices dynamically** rather than hardcoding `[29][28][27]`:
  ACOP's turn count is variable (free `corQuestion`s), so compute "the next N
  slots from the current `question_number`" instead of literal indices, or park
  the alternate run and reinstall like `_installCampaignLength` does.
- **Save/load**: add the swap to the reset + snapshot path. `candidate_json`
  edits and the `questions_json`/`answers_json` reordering need to survive a
  load — the order snapshot mostly covers it, but the `candidate_json` name/colour
  edits and any `answerSwapper(…, true)` effect-swaps must be captured too
  (extend `_slCaptureMod`/`_slRestoreMod`). Add a `_switchedTo` scalar to
  `_SL_SCALARS` and re-apply the cosmetic edits on restore.
- **Ticket portraits**: ACOP already has a ticket/portrait system
  (`_refreshTicket`, `TICKET_STAGE_PK`) — route the new candidate/VP pics through
  that instead of writing `candidate_image_url` raw, so the banner updates.
- **Tooltips / Enemies list**: the new protagonist may want the old one added to
  a roster, etc. — decide per design.

## 6. Gotchas (learned from the MTE code)

- `answerSwapper` swaps `answers_json[…].fields.question` (the FK) — it does NOT
  move `answer_feedback_json`. If the feedback must follow the answer, extend it
  (this is the same gap flagged in `SAVELOAD_MAINTENANCE.md`).
- The MTE swaps pass `takeEffects = false` — i.e. they move the answer to a new
  question but keep its ORIGINAL scoring. Whether ACOP wants the scoring to move
  is a per-swap decision.
- `e.candidate_json[1]` is hardcoded as "the player" in MTE's `switcheroo`
  colour line; ACOP should look the player up by pk (`indexOf(playerPk)`) both
  for the name and the colour, not by array position.
- Hardcoded slot indices (`[29][28][27]`) assume a fixed-length run. ACOP's
  run length varies — compute offsets from the live `question_number`.
- MTE parks EVERY candidate's questions in one giant `questions_json`; that's why
  `tunnel(pk)` can always find them. Our version must likewise have the
  alternate's questions loaded (parked), not fetched on demand.

## 7. Symbol quick-reference (in the MTE source, `origin/Source-Material`)

`1972 - More Than Ever_NixonAgnew.html`:
`answerSwapper` ~68178 · `switcheroo1`–`38` ~68413–68665 (playable 14–17 ~68508) ·
`tunnel` (inside `cyoAdventure`) ~68670 · the playable trigger blocks ~68962–69020.
Candidate cosmetic fields: `campaignTrail_temp.candidate_last_name` /
`candidate_image_url` / `running_mate_last_name` / `running_mate_image_url`.
