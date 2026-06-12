# Same Game

[![Demo](https://img.shields.io/badge/Live%20Demo-sen.ltd-blue?style=flat-square)](https://sen.ltd/portfolio/same-game/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-53%20passing-brightgreen?style=flat-square)](#testing)

Classic **Same Game** (Chain Shot / 同色消し) puzzle built with vanilla JS — zero dependencies, no build step.

> 📖 **中文版本**: [README.zh.md](README.zh.md)

**[▶ Play live demo →](https://sen.ltd/portfolio/same-game/)**

## What is Same Game?

Click a group of **2 or more orthogonally adjacent same-color blocks** to remove them.  
Blocks above fall down to fill the gap. Empty columns compress to the left.  
Score = `(count − 2)²` per removal — larger groups are exponentially better.  
Game ends when no matching groups remain.

## Features

- 3 difficulty levels:
  - **Easy** — 11×9 grid, 3 colors
  - **Medium** — 15×12 grid, 4 colors
  - **Hard** — 20×15 grid, 5 colors
- Hover to preview the group and score before clicking
- **Undo** last move (also Ctrl/Cmd+Z)
- **Board clear bonus** (+1000 points when every block is removed)
- Best score per difficulty (localStorage)
- No-more-moves detection → game over screen
- Dark / light theme toggle
- Japanese / English UI
- Touch support for mobile
- CSS animations (fall, highlight glow)

## Running locally

```sh
git clone https://github.com/sen-ltd/same-game.git
cd same-game
npm run serve        # opens http://localhost:8080
```

No build step required — open `index.html` directly or serve with any static server.

## Testing

```sh
npm test             # node --test tests/same-game.test.js
```

53 tests covering:

- `createInitialBoard` — dimensions, value range, uniqueness
- `createGame` — state shape, boardOverride
- `match` — isolated cells, 2-cell pairs, flood-fill, L-shapes, null cells
- `fill` — point removal, gravity, column compression, immutability
- `getHasNext` — true/false with hand-crafted boards
- `getScore` — formula `(n-2)²`
- `isClear` — edge cases
- `play` — immutability, score update, history, no-match no-op, clear bonus
- `undo` — board revert, score revert, empty history guard

## Architecture

```
src/
  same-game.js   Pure game logic (board[row][col] layout, all functions exported)
  main.js        DOM, events, rendering
  i18n.js        ja/en translations
tests/
  same-game.test.js
```

The game logic in `same-game.js` is a faithful port of the reference `SameGame` class, refactored to pure functions returning new state objects. Board convention: `board[row][col]`, row 0 = top, col 0 = left.

## License

MIT © 2026 [SEN LLC (SEN 合同会社)](https://sen.ltd)

<!-- sen-publish:links -->
## Changelog

### v1.2.0 (2026-06-12)
- ✅ Added Chinese language support (中文)
- ✅ Mobile portrait optimization - grid fills screen width
- ✅ Adjusted grid proportions for better mobile experience:
  - Easy: 11×9 (was 10×10)
  - Medium: 15×12 (was 12×15)
  - Hard: 20×15 (was 15×20)
- ✅ Improved animation smoothness - reduced flickering
- ✅ Separated gravity and column compression animations with visible delay
- ✅ Enhanced CSS animations with bounce effects

### v1.1.0 (2026-06-10)
- ✅ Added undo functionality (Ctrl/Cmd+Z)
- ✅ Dark/light theme toggle
- ✅ Japanese language support
- ✅ Touch support for mobile devices
- ✅ CSS animations for block removal and falling

### v1.0.0 (2026-06-08)
- ✅ Initial release
- ✅ Core Same Game logic with flood-fill algorithm
- ✅ Gravity and column compression
- ✅ 3 difficulty levels
- ✅ Score system with clear bonus
- ✅ LocalStorage best score persistence
- ✅ 53 unit tests

## Links

- 🌐 Demo: https://sen.ltd/portfolio/same-game/
- 📝 dev.to: https://dev.to/sendotltd/same-game-in-vanilla-js-flood-fill-gravity-and-column-compression-1j8g
<!-- /sen-publish:links -->
