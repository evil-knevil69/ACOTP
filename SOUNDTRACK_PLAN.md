# Reactive Diegetic Soundtrack — Implementation Handoff

**Status:** INFRASTRUCTURE IMPLEMENTED (Jul 2026) — all primitives (Code 1) and
triggers/wiring (Code 2) are live; §8's CONTENT is still to fill in: the
`SOUNDTRACK` section track URLs, mood rules, Part IV startPk, and per-question
`stinger:` entries are empty/commented placeholders in Code 2 (grep `FILL ME IN`).
Empty sections fail safe (entering one changes nothing). Defaults chosen:
`FADE_MS = 1200`; paused-at-boundary installs on next play/next press.
**Audience:** a fresh Claude/Fable session with no prior context.
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
> **Intro music is separate — do NOT fold it into Section I.** The 3 default tracks built in `setupMusicPlayer` are *introductory* music that starts playing on the pre-game/menu screens, before the main game loads. They are the initial `window.playlist` and must stay that way. Section I's playlist is its own list that only arrives when Part I is entered; the intro music bridges until then.

- A `_musicSection` integer (0 = none yet). On the PK-change tick, if the loaded pk is a section-start pk **and differs from `_musicSection`**, call `__enterMusicSection(n)`. Idempotency guard is essential — the transition/retry logic can re-run.
- `__enterMusicSection(n)`:
  1. `if (n === _musicSection) return;` then `_musicSection = n`.
  2. Build the section's **effective** playlist = **[ passing mood tracks first, in sequence ] then section base tracks**. Mood rules are read *right now* (`ApprovalRating` + `WatergateExposure` at this instant) — this is the ONLY place mood is evaluated. Mood tracks lead the section (see §3.5).
  3. **Queue** it: `_pendingPlaylist = effectiveList`. Do **not** touch the currently-playing song — it plays out, then the new list (mood-track-first) installs on `ended`.
  4. There is no "install immediately" fast-path for game start: Section I simply queues behind whatever intro track is playing when Part I is entered. (If nothing is playing at all — player paused/off — the pending list still installs on the next `ended`/play; see §7 paused-at-boundary.)

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

### 3.3 Scripted question stinger (inject-next; fade+play ONLY if already playing)
`window.__injectNextSong(song)`:
1. Guard player ready (`window.playlist && window.loadAndPlay`); if not, no-op.
2. Splice `song` into `playlist.songs` at `currentSongIndex + 1`; `_rebuildPlaylistSelect()`.
3. **Branch on playback state** (this is the key rule the author added):
   - **If the tape is actively playing** (`playbackState === 'play'`, not currently ducked by an anthem): fade current out (§3.4), advance `currentSongIndex` to the injected track, `loadAndPlay()`, fade back up to the user's target volume. → the stinger plays now.
   - **If the player is paused / switched off** (the user turned the music off): **do NOT start playback.** Just "flip the track over" — advance `currentSongIndex` to the injected track and update the loaded src + `updateUI()` so it's cued and the display reflects it, but leave `playbackState` paused and do not call `play()`. The stinger is what plays *if/when* the user resumes. (Implement a load-without-play path, e.g. `_setCurrent(index, {play:false})`, since `loadAndPlay()` always plays.)
4. Normal auto-advance resumes after the stinger ends — and if a section boundary was crossed while it played, `_pendingPlaylist` installs then (handled by the `ended` handler).

**Wiring — stinger lives on the `questionData` entry** (author's choice), e.g.
`430: { … , stinger: () => PATTON }`  (a getter, so the `Song` is built lazily once `window.Song` exists). The PK-change block calls `qd.stinger && window.__injectNextSong?.(qd.stinger())`.

### 3.4 Fade + volume (new infrastructure)
Introduce a **target-volume** snapshot so fades don't clobber the user's setting:
- `_targetVolume` (init 0.5). The vol± buttons set `_targetVolume` **and** `audio.volume = _targetVolume`.
- `_fadeTo(vol, ms, cb)`: ramps `audio.volume` toward `vol` over `ms` (e.g. `setInterval` stepping, or `requestAnimationFrame`), then `cb()`. Fades ramp to `0` or back to `_targetVolume` — never overwrite `_targetVolume`.
- Cancel any in-flight fade before starting a new one (store the timer/handle).

### 3.5 Mood injection (boundary-gated, leads the section)
Evaluated ONLY inside `__enterMusicSection` (step 3.1.2). A `MOOD_RULES` list of `{ when: () => bool, tracks: [Song…] }`; passing rules' tracks are placed **first, in sequence, at the front of the section list** (author's choice — the mood *opens* the new section). The current song still plays out first (graceful swap), so the mood is felt as the first thing you hear once the new section's music begins, not a mid-song cut. Reading state only at the boundary is what makes this "once per section, not per turn."

---

## 4. Data structures to add (Code 2, near `questionData`)

```js
// Song objects built via window.Song(title, artist, '', audioUrl). Build them
// lazily behind getters so they only construct once window.Song exists.
var SOUNDTRACK = {
  // NOTE: the 3 intro/default songs in setupMusicPlayer are NOT here — they are
  // separate introductory music. These section lists take over per Part.
  sections: {
    1: { name:'Remission',    startPk:401,          tracks:[ /* Song, Song… */ ] },
    2: { name:'Fulmination',  startPk:430,          tracks:[ … ] },
    3: { name:'Metastasis',   startPk:432,          tracks:[ … ] },
    4: { name:'???',          startPk:/*TBD*/null,  tracks:[ … ] },
  },
  // Mood tracks are PREPENDED (first in sequence) to the section list when a
  // rule passes; evaluated once, at section entry only.
  mood: [
    // { when: () => WatergateExposure >= 15, tracks:[ DARK_SONG ] },
    // { when: () => ApprovalRating >= 8,      tracks:[ LIGHT_SONG ] },
  ],
};
// Stingers live on the questionData entry itself (not a central map):
//   430: { … , stinger: () => PATTON_THEME },
```
Keep the **primitives** (`__enterMusicSection`, `__injectNextSong`, `_fadeTo`, `_rebuildPlaylistSelect`, `_installPending`, `_setCurrent`, `_pendingPlaylist`, `_targetVolume`) in **Code 1** with the player; keep the **config** (`SOUNDTRACK`) and the **triggers** (section map + per-question `stinger`) in **Code 2**, calling the `window.__…` primitives (exact Allende split).

---

## 5. Implementation steps

**Code 1 (init file) — new player primitives:**
1. Add `_targetVolume`; point the vol± handlers at it (§3.4). Add `_fadeTo`.
2. Add `_rebuildPlaylistSelect()` (clears `#playlist-select`, re-adds one `<option>` per `playlist.songs`). Refactor setup's inline option-build to call it; **update the Allende egg (Code 2) to call it** instead of manually appending (or leave Allende and just also call rebuild — either way, no double options).
3. Add `_pendingPlaylist` + rework the `ended` handler + `_installPending()` (§3.2).
4. Add `window.__injectNextSong(song, opts)` (§3.3) and `window.__enterMusicSection(n)` (§3.1) — the latter reads `SOUNDTRACK` off `window`, so guard `window.SOUNDTRACK`.
5. Expose everything used from Code 2 on `window`.

**Code 2 (main file) — config + triggers:**
6. Add the `SOUNDTRACK` config (§4). **Do NOT fold the intro songs in** — leave `setupMusicPlayer`'s 3 default tracks exactly as they are (intro music).
7. Section detection: in the PK-change block (**~14911**), after `if (qd.onShow) qd.onShow();`, add:
   `const sec = _pkToSection(currentPK); if (sec) window.__enterMusicSection?.(sec);`
   where `_pkToSection` maps a pk → section number via `SOUNDTRACK.sections[*].startPk`.
8. Stingers: add a `stinger: () => SONG` field to the triggering `questionData` entries, and in the same PK-change block add `qd.stinger && window.__injectNextSong?.(qd.stinger());` (after `onShow`).
9. New Game reset (see §6).

---

## 6. New Game reset

New Game is detected in the PK-change block (main ~14900s, the `_lastQNum` decrease branch — grep `_RESHUFFLE.reset()`; the reset block is right there). Keep it minimal:
- `_musicSection = 0; _pendingPlaylist = null;`
That's enough: with section tracking cleared, when the restarted run reaches pk 401 again, `__enterMusicSection(1)` re-queues Section I behind whatever is currently playing — the graceful swap does the rest. **Do NOT force-rebuild the playlist or restart playback** (respects a player the user switched off, and avoids yanking music mid-track). Expose `window.__resetSoundtrack()` in Code 1 (just clears those two vars) and call it from the reset block, mirroring `_RESHUFFLE.reset()`.

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
5. **Fade duration** — `FADE_MS` (suggest 1200 ms). *(Single-element fade is LOCKED — §9.)*
6. **Paused-at-boundary** behaviour (§7) — install on next play (recommended) or immediately.

---

## 9. Decisions LOCKED by the author (do not revisit)
- **Single-element fade, not crossfade.** One `#audio`; fade-out → swap `src` → fade-in on the same element.
- **Intro music stays separate.** The 3 default `setupMusicPlayer` songs are pre-game introductory music and are NOT part of any section list. Section I takes over when Part I is entered (§3.1).
- **Mood tracks lead the section** — prepended, first in sequence, in the queued section list (§3.5). The current song still finishes first (graceful swap). Fade-and-jump is reserved for scripted stingers.
- **Persist the user's volume** via `_targetVolume`; fades always return there.
- **Stingers live on the `questionData` entry** as a `stinger: () => Song` getter (§3.3), not a central map.
- **A stinger must never restart a player the user turned off.** If paused/off, just flip the loaded track over (cue it) without calling `play()`; only fade-and-play when already playing (§3.3).
- **Keep primitives in Code 1, config in Code 2** (the Allende split).
- **Guard everything on player-ready** with `?.` and the `window.playlist &&` pattern — early questions can fire before `.content_single` exists.

---

## 10. Test checklist
- [ ] Enter Section II mid-song → current song finishes, THEN Section II list starts from its top.
- [ ] Yom Kippur question loads WHILE PLAYING → current song fades out, Patton fades in, then normal advance resumes.
- [ ] Same question loads WHILE MUSIC IS OFF/PAUSED → no playback starts; Patton is cued (title display updates) and only plays when the user hits play.
- [ ] Intro music (the 3 default songs) plays on the menu and is untouched until Part I is entered; Section I then queues behind the current intro track.
- [ ] High `WatergateExposure` at a boundary → darker track appears in that section's list; low → it doesn't. Confirm it's evaluated once (not re-checked next turn).
- [ ] Volume set to X, a fade happens → returns to X, not 0.5.
- [ ] CIA anthem playing → trigger a stinger → no audio fight; tape returns cleanly after.
- [ ] New Game → soundtrack resets to Section I; no leftover injected tracks; `#playlist-select` correct.
- [ ] Section entry re-hit (retry tick / same pk) → no double-queue, no restart.
- [ ] Player not yet built when an early trigger fires → no error; takes effect once built.
- [ ] `#playlist-select` always matches `playlist.songs` and the current track after every operation.

---

*Anchors (line numbers drift — grep by symbol): `setupMusicPlayer` / `loadAndPlay` / `class Song` / `#playlist-select` in the init file; `questionData` / the PK-change block / the Allende egg (`_allendeSpeechPlayed`) / `__activeAnthemStop` in `ACOP Nixon_Agnew.txt`.*
