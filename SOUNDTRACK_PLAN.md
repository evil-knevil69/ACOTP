# Reactive Diegetic Soundtrack — Implementation Handoff

**Status:** planned, not started. **Audience:** a fresh Claude/Fable session with no prior context.
**Read `CLAUDE.md` first** (session-startup force-push, the two-file Code 1 / Code 2 split, `new Function()` `var` rule).

---

## 1. Objective

Turn the background music player into a **reactive, diegetic soundtrack** that responds to game state:

1. **Per-section playlists.** The game has ~4 narrative sections (the PART transitions). Each section has its own playlist. On entering a new section the playlist is *queued*, not slammed: **the song currently playing finishes first**, and only then does the new section's playlist take over.
2. **Scripted question stingers.** Certain questions, when they load, **fade out** the current song and **inject a specific song as the next track, playing it immediately** (e.g. the *Patton* theme on the Yom Kippur question).
3. **Mood injection at section boundaries only.** Depending on how bad `ApprovalRating` and `WatergateExposure` are, inject darker or lighter tracks — but **evaluated once, at each section entry**, NOT every turn.

Design intent (from the author): the soundtrack is ambient and non-jarring. Section changes never interrupt a song; only scripted story beats get the fade-and-jump.

---

## 2. Current state — what exists today

### The player (Code 1 = `A Cancer on the Presidency_init (draft).txt`)
- **`class Song(title, artist, coverLink, audioLink)`** (~line 2565). NB: `coverLink` is accepted but **discarded** (field was removed in a dead-code pass; the 4th arg survives for call-site compatibility). No cover-art storage.
- **`class Playlist`** (~2576): `songs[]`, `currentSongIndex`, `addSong`, `playNext`/`playPrevious` (wrap via modulo). **Append-only — no remove/replace.** On `window`.
- **`setupMusicPlayer()`** (~2609): once-guarded by `window._musicPlayerSetup`; **bails and retries** until `.content_single` exists; builds `window.playlist` with **3 hardcoded tracks** (Victory at Sea / Nixon; You Haven't Done Nothin' / Stevie Wonder; the Creep song); creates `#audio` (volume 0.5); builds the tape-recorder DOM; ends by building `#playlist-select` from `playlist.songs`.
- **`loadAndPlay()`** (~2837, on `window`): stops `window._introSound`, sets `audio.src` from current song, `updateUI()`, `audio.play()`, starts reel visuals.
- **Auto-advance** (~2938): `audio 'ended'` → `playlist.playNext()` + `loadAndPlay()` — loops forever.
- **`#playlist-select`** (~2984): options built once at setup; `change` → set index + `loadAndPlay`; `audio 'play'` re-syncs the dropdown value.
- **Volume**: `#volUpBtn` / `#volDownBtn` set `audio.volume` directly (±0.15, default 0.5). **No fade infrastructure exists.**
- **Visuals**: `startVisuals`/`stopVisuals` drive a 100 ms `visualTimer`; `setReelAnimation` handles play/rw/ff/pause.

### Existing game-state → audio patterns to imitate (do NOT reinvent)
- **Playlist injection — the Allende Easter egg** (Code 2, `ACOP Nixon_Agnew.txt` ~17773): on first world-map open after `chileanCoup === 1`, guards `window.Song && window.playlist && window.loadAndPlay`, then `addSong()` + manually appends an `<option>` to `#playlist-select` + sets index + `loadAndPlay()`. **This is the template for injecting a track from Code 2.**
- **Transient overlay + ducking — national anthems** (Code 2 ~20591): a throwaway `Audio`; the `window.__activeAnthemStop` / `window.__anthemMainWasAudible` singleton mutes/restores the tape while an anthem plays. **Any new "audio over the music" must cooperate with this singleton or they will fight over the main audio.**

### Section markers that exist today (in `questionData`, Code 2)
| Part | Start pk | Transition title | Notes |
|------|----------|------------------|-------|
| I    | 401      | PART I: Remission     | 8 Nov 1972 |
| II   | 430      | PART II: Fulmination  | onShow already sets `_pressureOn = true` |
| III  | 432      | PART III: Metastasis  | |
| IV   | **TBD**  | (not yet authored)    | boundary pk to be named |

Transitions render via `questionData[pk].transition` → `showSectionTransition()`. The PK-change handler that fires `qd.onShow` is in the mutation-observer block at **~line 14911** (main file). There is **no "current section" variable today** — one must be added.

### The five gotchas any implementation MUST respect
1. **Injected tracks need TWO steps**: `addSong()` **and** rebuild/append `#playlist-select` options (the dropdown is built once). *(Recommendation: add a single `_rebuildPlaylistSelect()` helper and route all mutations through it — see §5.)*
2. **Playlist is append-only.** A section "swap" must replace `playlist.songs` wholesale and reset the index — there is no remove.
3. **Anthem ducking singleton** (`window.__activeAnthemStop`) — fades/injection must not double-manage the main audio while an anthem is up.
4. **New Game does NOT rebuild the playlist.** `setupMusicPlayer` is once-guarded, so `window.playlist` persists across a New Game (only flags like `_allendeSpeechPlayed` reset, main ~15647). The reactive system MUST reset itself explicitly (see §6).
5. **Autoplay policy**: the first sound needs a user gesture (why the intro uses `.catch`). Mid-game changes are post-gesture and fine.

---

## 3. Target design

### 3.1 Section model
- A `_musicSection` integer (0 = none yet). On the PK-change tick, if the loaded pk is a section-start pk **and differs from `_musicSection`**, call `__enterMusicSection(n)`. Idempotency guard is essential — the transition/retry logic can re-run.
- `__enterMusicSection(n)`:
  1. `if (n === _musicSection) return;` then `_musicSection = n`.
  2. Build the section's **effective** playlist = section base tracks **+** any mood tracks whose rule passes *right now* (read `ApprovalRating` and `WatergateExposure` at this instant — this is the ONLY place mood is evaluated).
  3. **Queue** it: `_pendingPlaylist = effectiveList`. Do **not** touch the currently-playing song.
  4. Exception: if nothing is playing yet (game start / Section I, or player just built), install immediately instead of queuing.

### 3.2 Graceful swap (queue, don't slam)
Rework the `ended` handler:
```
audio.addEventListener('ended', () => {
  if (_pendingPlaylist) { _installPending(); return; }   // section change waited for the song to finish
  playlist.playNext(); loadAndPlay();
});
function _installPending() {
  playlist.songs = _pendingPlaylist;
  playlist.currentSongIndex = 0;
  _pendingPlaylist = null;
  _rebuildPlaylistSelect();
  loadAndPlay();
}
```
So a section boundary sets `_pendingPlaylist`; the current track plays out; on `ended` the new list installs from its top.

### 3.3 Scripted question stinger (fade + inject-next + play)
`window.__injectNextSong(song, {fade:true})`:
1. Guard player ready (`window.playlist && window.loadAndPlay`); if not, no-op (or stash and retry).
2. Fade current audio out (ramp `audio.volume` → 0 over `FADE_MS`; see §3.4).
3. Splice `song` into `playlist.songs` at `currentSongIndex + 1`; `_rebuildPlaylistSelect()`.
4. `playlist.currentSongIndex++`; `loadAndPlay()`; fade back up to the user's target volume.
5. Normal auto-advance resumes after it ends — and if a section boundary was crossed while it played, `_pendingPlaylist` installs then (precedence handled for free by the `ended` handler).

Wire from `questionData[pk].onShow`, e.g. the Yom Kippur pk → `window.__injectNextSong(PATTON)`.

### 3.4 Fade + volume (new infrastructure)
Introduce a **target-volume** snapshot so fades don't clobber the user's setting:
- `_targetVolume` (init 0.5). The vol± buttons set `_targetVolume` **and** `audio.volume = _targetVolume`.
- `_fadeTo(vol, ms, cb)`: ramps `audio.volume` toward `vol` over `ms` (e.g. `setInterval` stepping, or `requestAnimationFrame`), then `cb()`. Fades ramp to `0` or back to `_targetVolume` — never overwrite `_targetVolume`.
- Cancel any in-flight fade before starting a new one (store the timer/handle).

### 3.5 Mood injection (boundary-gated)
Evaluated ONLY inside `__enterMusicSection` (step 3.1.2). A `MOOD_RULES` list of `{ when: () => bool, tracks: [Song…] }`; passing rules **append** their tracks to the section list (so they play later, naturally — not a jump). Reading state at the boundary is what makes this "once per section, not per turn."

---

## 4. Data structures to add (Code 2, near `questionData`)

```js
// Song objects built via window.Song(title, artist, '', audioUrl).
var SOUNDTRACK = {
  sections: {
    1: { name:'Remission',    startPk:401, tracks:[ /* Song, Song… */ ] },
    2: { name:'Fulmination',  startPk:430, tracks:[ … ] },
    3: { name:'Metastasis',   startPk:432, tracks:[ … ] },
    4: { name:'???',          startPk:/*TBD*/null, tracks:[ … ] },
  },
  // pk -> song to fade-in as the next track when that question loads
  questionSongs: {
    /* [YOM_KIPPUR_PK]: PATTON_THEME, */
  },
  // evaluated at each section entry only
  mood: [
    // { when: () => WatergateExposure >= 15, tracks:[ DARK_SONG ] },
    // { when: () => ApprovalRating >= 8,      tracks:[ LIGHT_SONG ] },
  ],
};
```
Build `Song` objects lazily/once (guard `window.Song`). Keep the **primitives** (`__enterMusicSection`, `__injectNextSong`, `_fadeTo`, `_rebuildPlaylistSelect`, `_installPending`, `_pendingPlaylist`, `_targetVolume`) in **Code 1** with the player; keep the **config** (`SOUNDTRACK`) and the **triggers** in **Code 2**, calling the `window.__…` primitives (exact Allende split).

---

## 5. Implementation steps

**Code 1 (init file) — new player primitives:**
1. Add `_targetVolume`; point the vol± handlers at it (§3.4). Add `_fadeTo`.
2. Add `_rebuildPlaylistSelect()` (clears `#playlist-select`, re-adds one `<option>` per `playlist.songs`). Refactor setup's inline option-build to call it; **update the Allende egg (Code 2) to call it** instead of manually appending (or leave Allende and just also call rebuild — either way, no double options).
3. Add `_pendingPlaylist` + rework the `ended` handler + `_installPending()` (§3.2).
4. Add `window.__injectNextSong(song, opts)` (§3.3) and `window.__enterMusicSection(n)` (§3.1) — the latter reads `SOUNDTRACK` off `window`, so guard `window.SOUNDTRACK`.
5. Expose everything used from Code 2 on `window`.

**Code 2 (main file) — config + triggers:**
6. Add the `SOUNDTRACK` config (§4). Fold the existing 3 default songs into Section I's `tracks` (recommendation) so there's one source of truth.
7. Section detection: in the PK-change block (**~14911**), after `if (qd.onShow) qd.onShow();`, add:
   `const sec = _pkToSection(currentPK); if (sec) window.__enterMusicSection?.(sec);`
   where `_pkToSection` maps a pk → section number via `SOUNDTRACK.sections[*].startPk`.
8. Stingers: on each triggering question add `onShow: () => window.__injectNextSong?.(SOUNDTRACK.questionSongs[<pk>])` (or a generic hook that looks the pk up).
9. New Game reset (see §6).

---

## 6. New Game reset

New Game is detected in the PK-change block (main ~14900s, the `_lastQNum` decrease branch — grep `_RESHUFFLE.reset()`; the reset block is right there). Add:
- `_musicSection = 0; _pendingPlaylist = null;`
- Rebuild `window.playlist.songs` to Section I's base tracks, `currentSongIndex = 0`, `_rebuildPlaylistSelect()`.
- Reset `audio.volume`/`_targetVolume` if desired.
Expose a `window.__resetSoundtrack()` in Code 1 and call it from the reset block (mirrors how `_RESHUFFLE.reset()` etc. are called).

---

## 7. Interaction hazards (verify each)
- **Anthem playing when a stinger fires**: the stinger fades the tape while `__activeAnthemStop` may have it muted. Decide precedence — simplest is to `window.__activeAnthemStop?.(false)` first (stop the anthem, take the tape back), then do the fade. Test hovering a CIA anthem then triggering a stinger.
- **Section boundary crossed during a stinger**: injected song plays; on its `ended`, `_pendingPlaylist` installs. Confirm the pending list isn't lost.
- **Player not built yet when Section I / an early stinger fires**: all `window.__…` calls use `?.` and guard `window.playlist`. Section I should install as the initial list once the player exists (or fold Section I = the setup default list so it's correct from birth).
- **Idempotent section entry**: transitions and the observer retry can re-hit the same pk — the `n === _musicSection` guard prevents re-queueing.
- **Paused at a boundary**: `_pendingPlaylist` is set but nothing is playing, so `ended` never fires. Decide: install on next `play`/`next` press (recommended — add a check in the play handler), or install immediately. Pick one and implement it.
- **`#playlist-select` desync**: after any playlist mutation, `_rebuildPlaylistSelect()` and re-point the selected index.
- **Free (`corQuestion`) questions** advance `_questionCount` but section detection keys off **pk**, not the counter — fine, but confirm a conditional question with a section-start pk still triggers.

---

## 8. Decisions still needed (ask the author / fill before coding)
1. **Part IV** — the boundary pk, name, and whether it exists yet.
2. **Per-section track lists** — actual audio URLs (jukehost etc.) for each of the ~4 sections.
3. **Stinger map** — which question pks trigger which songs. Confirmed example: **Yom Kippur question pk → Patton theme** (need the exact pk and the Patton audio URL).
4. **Mood rules** — the `ApprovalRating` / `WatergateExposure` thresholds and which songs count as "darker"/"lighter". (`WatergateExposure` is 0–20; `ApprovalRating` is the ~0–10 stat var — CONFIRM scale before writing thresholds.)
5. **Fade** — duration (`FADE_MS`, suggest 1200 ms) and single-element fade vs true crossfade (recommend single-element; see §9).
6. **Paused-at-boundary** behaviour (§7) — install on next play (recommended) or immediately.

---

## 9. Recommendations / suggestions (author invited these)
- **Single-element fade, not crossfade.** There is one `#audio`; fade-out → swap `src` → fade-in on the same element is far simpler and robust. A true crossfade needs a second Audio and volume-matched ramps — only worth it if the seams are audible in testing.
- **Fold the existing 3 songs into Section I.** One source of truth; the player's default list becomes Section I's `tracks`.
- **Mood tracks APPEND, they don't jump.** Reserve the fade-and-jump exclusively for scripted stingers. This keeps the ambient, diegetic feel the author wants — the mood is felt as "the next song is darker," not a hard cut.
- **Persist the user's volume across all changes** via `_targetVolume`; fades always return there.
- **Keep primitives in Code 1, config in Code 2** (the Allende split) so the player stays a self-contained component and the game-state coupling lives with the questions.
- **Consider a tiny `stinger` field on questionData** instead of a separate `questionSongs` map, e.g. `430: { …, stinger: PATTON }` — one less thing to keep in sync, and it reads next to the question. Either works; author's call.
- **Guard everything on player-ready** with `?.` and the `window.playlist &&` pattern — early questions can fire before `.content_single` exists.

---

## 10. Test checklist
- [ ] Enter Section II mid-song → current song finishes, THEN Section II list starts from its top.
- [ ] Yom Kippur question loads → current song fades out, Patton fades in, then normal advance resumes.
- [ ] High `WatergateExposure` at a boundary → darker track appears in that section's list; low → it doesn't. Confirm it's evaluated once (not re-checked next turn).
- [ ] Volume set to X, a fade happens → returns to X, not 0.5.
- [ ] CIA anthem playing → trigger a stinger → no audio fight; tape returns cleanly after.
- [ ] New Game → soundtrack resets to Section I; no leftover injected tracks; `#playlist-select` correct.
- [ ] Section entry re-hit (retry tick / same pk) → no double-queue, no restart.
- [ ] Player not yet built when an early trigger fires → no error; takes effect once built.
- [ ] `#playlist-select` always matches `playlist.songs` and the current track after every operation.

---

*Anchors (line numbers drift — grep by symbol): `setupMusicPlayer` / `loadAndPlay` / `class Song` / `#playlist-select` in the init file; `questionData` / the PK-change block / the Allende egg (`_allendeSpeechPlayed`) / `__activeAnthemStop` in `ACOP Nixon_Agnew.txt`.*
