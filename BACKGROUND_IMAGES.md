# Background images — how *1972: More Than Ever* formats them (and what ACOP does)

**Status:** REFERENCE / guidance. Extracted from `1972 - More Than Ever_init.html`
and `1972 - More Than Ever_NixonAgnew.html` (branch `origin/Source-Material`),
so we know exactly what CSS each background surface gets — and what our
options are for `backgroundv69.gif`. Nothing here changes ACOP behaviour;
it's the recipe book for when we restyle backgrounds or author new themes.

---

## 1. The three background surfaces (MTE's per-theme repaint)

Every MTE theme function repaints the same three surfaces. This is the
complete list of background-related lines they use:

### a) Page background — `<body>` (ACOP equivalent: `backgroundv69.gif`)

```js
document.body.background = "https://i.imgur.com/ntNyjE5.png"
```

- The **legacy HTML `background` attribute**, not a CSS property.
- In most themes that is ALL they set → browser defaults apply:
  **natural size, tiled both directions, scrolls with the page**.
- Their animated-gif theme ("Tonight's Broadcast") is exactly this — a plain
  tiled gif, no extra formatting. **ACOP's default look uses the identical
  mechanism** (`document.body.background = '…/backgroundv69.gif'` in Code 1,
  both at load and in the `'A Cancer on the Presidency'` theme fn).

Two themes ("Once More with Feeling" + its Big variant) add ONE refinement:

```js
document.body.style.backgroundSize = "100% auto"
```

- Stretch to full viewport **width**, height in proportion; still tiles
  vertically if the image is shorter than the page.

### b) The play-area column — `.container`

```js
document.getElementsByClassName("container")[0].style = "background-image: url('…')"
```

- Plain `background-image`, no size/repeat → **natural-size tile**.

### c) The game window — `#game_window`

```js
$("#game_window")[0].style.backgroundImage = "url(…)"
```

- Same: no size/repeat → **natural-size tile**.

## 2. Where MTE uses "proper" fill-a-frame formatting

Only on fixed-size photo boxes (the cassette tape-recorder component and the
candidate pop-out menu) — never on page backgrounds:

```css
background-size: cover;
background-position: center;
```

That's the pair to reach for when a photo must fill a fixed box with no
letterboxing (crops the overflow, keeps the centre).

## 3. MTE's two background bugs (don't copy these)

1. **The `backgroundSize` leak.** `document.body.style.backgroundSize` is set
   by two themes and **never cleared by any other** — visit "Once More with
   Feeling" once and every theme you switch to afterwards inherits
   `100% auto`. RULE: if any ACOP theme sets a body background property
   beyond the image itself (`backgroundSize`, `backgroundAttachment`,
   `backgroundPosition`…), EVERY entry in `ACOP_THEMES` must set-or-clear the
   same property, so themes stay self-contained.
2. **The `style=` wipe.** Assigning the whole style attribute
   (`el.style = "background-image: url(…)"`) erases the element's other
   inline styles — MTE wipes the `.container` `backgroundColor` it set five
   lines earlier. Always assign individual properties
   (`el.style.backgroundImage = …`) like ACOP already does.

## 4. Recipes for ACOP (`backgroundv69.gif` or any future background)

Current behaviour (matches MTE's default): natural size, tiled, scrolls.

```js
// ── as now: tile at natural size ──
document.body.background = 'https://file.garden/aXPgNT-ZRCxxpy0g/backgroundv69.gif';

// ── full-width stretch (MTE's "100% auto" refinement) ──
document.body.background = '…/backgroundv69.gif';
document.body.style.backgroundSize = '100% auto';

// ── fill the screen, no tiling, fixed while scrolling (modern) ──
document.body.background = '…/backgroundv69.gif';
document.body.style.backgroundSize = 'cover';
document.body.style.backgroundPosition = 'center';
document.body.style.backgroundRepeat = 'no-repeat';
document.body.style.backgroundAttachment = 'fixed';
```

If a variant goes into a THEME (rather than the global default), remember
rule 3.1: put the reset lines (`backgroundSize = ''` etc.) in every other
`ACOP_THEMES` entry, including the default one.

## 5. Where this plugs into ACOP

- Global default: Code 1, the base-theme block (grep `backgroundv69`) — runs
  at load.
- Per-theme: Code 1, `ACOP_THEMES` registry (grep `THEME SELECTOR`) — each
  entry repaints body/container/game-window/header/corrr; the default entry
  IS the shipped look.
- Event-driven swaps mid-game: Code 2 `themeSwap('Name')` (grep
  `EVENT-DRIVEN THEME SWAP`) routes through the same registry, so background
  formatting authored per rule 4/3.1 behaves under swaps too.
