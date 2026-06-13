/**
 * main.js — DOM, events, and rendering for Same Game
 *
 * Architecture:
 *   - Pure game logic lives in same-game.js
 *   - This file owns all DOM mutation and user interaction
 *   - State is held in a single `state` variable; every change goes through
 *     the pure functions and then re-renders
 */

import {
  createGame,
  play,
  undo,
  match,
  isClear,
  CLEAR_BONUS,
  applyGravity,
  compressColumns,
} from './same-game.js';
import { t } from './i18n.js';

// ---------------------------------------------------------------------------
// Difficulty definitions
// ---------------------------------------------------------------------------
const DIFFICULTIES = {
  easy:   { rows: 11, cols: 9, colors: 3, label: 'easy' },
  medium: { rows: 15, cols: 12, colors: 4, label: 'medium' },
  hard:   { rows: 20, cols: 15, colors: 5, label: 'hard' },
};

// CSS class names for colors (styled in style.css)
const COLOR_CLASSES = ['c0', 'c1', 'c2', 'c3', 'c4'];

// ---------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------
let state        = null;
let lang         = localStorage.getItem('sg-lang')  || 'zh';
let theme        = localStorage.getItem('sg-theme') || 'light';
let difficulty   = localStorage.getItem('sg-diff')  || 'easy';
let highlighted  = null; // array of [row,col] currently highlighted, or null
let isAnimating  = false; // true while a removal animation is playing

// ---------------------------------------------------------------------------
// Audio context for sound effects
// ---------------------------------------------------------------------------
let audioContext = null;
let soundEnabled = true;

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playPopSound(count) {
  if (!soundEnabled || !audioContext) return;
  
  const ctx = audioContext;
  const notes = [523.25, 659.25, 783.99, 1046.50];
  
  notes.forEach((freq, i) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.04);
    
    const startTime = ctx.currentTime + i * 0.04;
    const duration = 0.08;
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  });
}

function playDropSound() {
  if (!soundEnabled || !audioContext) return;
  
  const ctx = audioContext;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(150, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.2);
  
  gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
  
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.2);
}

// ---------------------------------------------------------------------------
// DOM references (set after DOMContentLoaded)
// ---------------------------------------------------------------------------
let grid, scoreEl, bestEl, undoBtn, newBtn, overlay, overlayTitle,
    overlayMsg, overlayScore, overlayPlayBtn, previewEl, hintEl, soundToggle,
    themeToggle, langToggle, difficultyBtn;

// ---------------------------------------------------------------------------
// Best score helpers
// ---------------------------------------------------------------------------
function bestKey() { return `sg-best-${difficulty}`; }
function getBest()  { return parseInt(localStorage.getItem(bestKey()) || '0', 10); }
function saveBest(score) {
  if (score > getBest()) localStorage.setItem(bestKey(), String(score));
}

// ---------------------------------------------------------------------------
// i18n helpers
// ---------------------------------------------------------------------------
function _(key) { return t(lang, key); }

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = _(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = _(el.dataset.i18nPlaceholder);
  });
  hintEl.textContent = _('hint');
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------
function applyTheme() {
  document.documentElement.dataset.theme = theme;
  document.getElementById('theme-toggle').textContent =
    theme === 'dark' ? _('light') : _('dark');
}

// ---------------------------------------------------------------------------
// New game
// ---------------------------------------------------------------------------
function getOrientedDef() {
  const def = DIFFICULTIES[difficulty];
  const isLandscape = window.innerWidth > window.innerHeight;
  if (isLandscape) {
    return { ...def, rows: def.cols, cols: def.rows };
  }
  return def;
}

function startGame() {
  const def = getOrientedDef();
  state = createGame(def.rows, def.cols, def.colors);
  highlighted = null;
  updateScoreDisplay();
  renderGrid();
  hideOverlay();
}

// ---------------------------------------------------------------------------
// Score display
// ---------------------------------------------------------------------------
function updateScoreDisplay() {
  scoreEl.textContent = state.score;
  bestEl.textContent  = getBest();
}

// ---------------------------------------------------------------------------
// Grid rendering
// ---------------------------------------------------------------------------
/**
 * Full re-render: destroys and recreates all cells. Used when the grid
 * structure changes (new game, difficulty change, undo). NOT used during
 * normal play because innerHTML=''/appendChild causes a whole-grid flicker.
 */
function renderGrid() {
  grid.innerHTML = '';
  grid.style.setProperty('--cols', state.cols);
  grid.style.setProperty('--rows', state.rows);

  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;

      const v = state.board[r][c];
      if (v !== null) {
        cell.classList.add(COLOR_CLASSES[v]);
      } else {
        cell.classList.add('empty');
      }

      cell.addEventListener('mousedown', onCellMouseDown);
      cell.addEventListener('mouseenter', onCellHover);
      cell.addEventListener('mouseleave', onCellLeave);
      cell.addEventListener('touchstart', onCellTouchStart, { passive: false });
      cell.addEventListener('touchend', onCellTouchEnd, { passive: false });

      grid.appendChild(cell);
    }
  }
}

/**
 * In-place update: reuses existing cell DOM elements, only mutating their
 * class lists. Used during a play() move so we don't flash the whole grid.
 * Returns an array of cells whose contents changed (for fall animation).
 */
function updateGridInPlace() {
  const cells = grid.children;
  const changed = [];
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cell = cells[r * state.cols + c];
      if (!cell) continue;
      const v = state.board[r][c];
      const oldColorClass = [...cell.classList].find(x => /^c\d$/.test(x)) || null;
      const wasEmpty = cell.classList.contains('empty');
      const newColorClass = v !== null ? COLOR_CLASSES[v] : null;
      const nowEmpty = v === null;

      // Remove all transient/content classes
      cell.classList.remove('empty', 'c0', 'c1', 'c2', 'c3', 'c4', 'highlight', 'popping', 'fall');

      if (nowEmpty) {
        cell.classList.add('empty');
      } else {
        cell.classList.add(newColorClass);
      }

      // A cell "changed" when its visible content is different
      const contentChanged =
        wasEmpty !== nowEmpty ||
        (!nowEmpty && oldColorClass !== newColorClass);
      if (contentChanged && !nowEmpty) {
        changed.push(cell);
      }
    }
  }
  return changed;
}

// ---------------------------------------------------------------------------
// Highlight helpers
// ---------------------------------------------------------------------------
function clearHighlight() {
  highlighted = null;
  previewEl.textContent = '';
  const highlightedCells = grid.querySelectorAll('.cell.highlight');
  for (let i = 0; i < highlightedCells.length; i++) {
    highlightedCells[i].classList.remove('highlight');
  }
}

function applyHighlight(points) {
  highlighted = points;
  const pointSet = new Set(points.map(([r, c]) => `${r},${c}`));
  const cells = grid.children;
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const key = `${cell.dataset.row},${cell.dataset.col}`;
    if (pointSet.has(key)) {
      cell.classList.add('highlight');
    } else {
      cell.classList.remove('highlight');
    }
  }
  const score = (points.length - 2) ** 2;
  previewEl.textContent = `${_('previewScore')}: +${score}`;
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------
let hoverRaf = null;
let hoverTarget = null;

function onCellHover(e) {
  if (isAnimating) return;
  if (state.cleared || !state.hasNext) return;

  hoverTarget = e.currentTarget;
  if (hoverRaf) return;

  hoverRaf = requestAnimationFrame(() => {
    hoverRaf = null;
    if (!hoverTarget) return;

    const r = +hoverTarget.dataset.row;
    const c = +hoverTarget.dataset.col;
    if (state.board[r]?.[c] === null || state.board[r]?.[c] === undefined) {
      clearHighlight();
      return;
    }
    const points = match(state.board, r, c);
    if (points && points.length >= 2) {
      applyHighlight(points);
    } else {
      clearHighlight();
    }
  });
}

function onCellLeave() {
  if (isAnimating) return;
  hoverTarget = null;
  if (hoverRaf) {
    cancelAnimationFrame(hoverRaf);
    hoverRaf = null;
  }
  clearHighlight();
}

function onCellMouseDown(e) {
  if (isAnimating) { console.log('mousedown blocked: isAnimating'); return; }
  if (state.cleared || !state.hasNext) { console.log('mousedown blocked: game ended'); return; }
  const r = +e.currentTarget.dataset.row;
  const c = +e.currentTarget.dataset.col;
  console.log('mousedown', r, c);
  doPlay(r, c);
}

let isTouchEnabled = true;
let touchHandled = false;

function clearSelection(e) {
  try {
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
    }
    if (document.selection) {
      document.selection.empty();
    }
  } catch (err) {
    // Silently ignore
  }
}

function onCellTouchStart(e) {
  e.preventDefault();
  clearSelection();

  if (!isTouchEnabled) { console.log('touchstart blocked: isTouchEnabled=false'); return; }
  if (isAnimating) { console.log('touchstart blocked: isAnimating'); return; }
  if (state.cleared || !state.hasNext) { console.log('touchstart blocked: game ended'); return; }

  const r = +e.currentTarget.dataset.row;
  const c = +e.currentTarget.dataset.col;
  console.log('touchstart', r, c);

  touchHandled = true;
  setTimeout(() => { touchHandled = false; }, 50);

  doPlay(r, c);
}

function onCellTouchEnd(e) {
  e.preventDefault();
}

function doPlay(r, c) {
  const points = match(state.board, r, c);
  if (!points) return;

  isAnimating = true;
  isTouchEnabled = false;

  const popDurationMs = 180;
  const gravityDurationMs = 250;
  const gravityToCompressDelayMs = 150;
  const compressDurationMs = 300;

  initAudio();
  playPopSound(points.length);

  grid.querySelectorAll('.cell').forEach(cell => {
    const cr = +cell.dataset.row;
    const cc = +cell.dataset.col;
    if (points.some(([pr, pc]) => pr === cr && pc === cc)) {
      cell.classList.remove('highlight');
      cell.classList.add('popping');
    }
  });

  setTimeout(() => {
    const afterRemove = cloneBoard(state.board);
    for (const [rr, rc] of points) {
      afterRemove[rr][rc] = null;
    }

    const afterGravityBoard = applyGravity(afterRemove, state.rows, state.cols);
    const afterCompressBoard = compressColumns(afterGravityBoard, state.rows, state.cols);

    const tempState = { ...state, board: afterGravityBoard };
    highlighted = null;
    previewEl.textContent = '';

    updateGridForGravity(afterRemove, afterGravityBoard);
    playDropSound();

    setTimeout(() => {
      const gained = getScoreFromPoints(points);
      const cleared = isClear(afterCompressBoard);
      const bonus = cleared ? CLEAR_BONUS : 0;

      // Save current state BEFORE modifying
      state.history = [...state.history, {
        board: cloneBoard(state.board),
        score: state.score,
        hasNext: state.hasNext,
        cleared: state.cleared,
      }];

      state = { ...state, board: afterCompressBoard };
      state.score = state.score + gained + bonus;
      state.hasNext = cleared ? false : getHasNext(afterCompressBoard);
      state.cleared = cleared;

      updateScoreDisplay();
      const changedCells = updateGridForCompress(afterGravityBoard, afterCompressBoard);

      setTimeout(() => {
        isAnimating = false;
        isTouchEnabled = true;

        if (state.cleared) {
          saveBest(state.score);
          showOverlay(true);
          return;
        }
        if (!state.hasNext) {
          saveBest(state.score);
          showOverlay(false);
        }
      }, compressDurationMs);

    }, gravityDurationMs + gravityToCompressDelayMs);

  }, popDurationMs);
}

function cloneBoard(board) {
  return board.map(row => row.slice());
}

function getScoreFromPoints(points) {
  return (points.length - 2) ** 2;
}

function getHasNext(board) {
  const rows = board.length;
  const cols = board[0].length;
  const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = board[r][c];
      if (v === null) continue;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        if (board[nr][nc] === v) return true;
      }
    }
  }
  return false;
}

function updateGridForGravity(before, after) {
  const cells = grid.children;
  
  requestAnimationFrame(() => {
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const cell = cells[r * state.cols + c];
        if (!cell) continue;
        const oldVal = before[r][c];
        const newVal = after[r][c];

        if (newVal === null) {
          cell.classList.remove('c0', 'c1', 'c2', 'c3', 'c4', 'highlight', 'popping', 'fall', 'slide');
          cell.classList.add('empty');
          cell.style.opacity = '';
          cell.style.transform = '';
          cell.style.transition = '';
        } else {
          const oldColorClass = [...cell.classList].find(x => /^c\d$/.test(x));
          const needsColorUpdate = !oldColorClass || oldColorClass !== `c${newVal}`;
          const needsAnimation = oldVal === null && newVal !== null;
          
          cell.classList.remove('empty', 'highlight', 'popping', 'slide');
          
          if (needsColorUpdate) {
            cell.classList.remove('c0', 'c1', 'c2', 'c3', 'c4');
            cell.classList.add(`c${newVal}`);
          }
          
          if (needsAnimation) {
            cell.style.opacity = '0';
            cell.style.transform = 'translateY(-24px) scale(0.85)';
            
            requestAnimationFrame(() => {
              cell.style.transition = 'opacity 220ms ease, transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)';
              cell.style.opacity = '1';
              cell.style.transform = 'translateY(0) scale(1)';
              
              setTimeout(() => {
                cell.style.transition = '';
              }, 220);
            });
          } else {
            cell.style.opacity = '';
            cell.style.transform = '';
            cell.style.transition = '';
          }
        }
      }
    }
  });
}

function updateGridForCompress(before, after) {
  const cells = grid.children;
  const changed = [];
  
  const colMap = computeColumnMapping(before, after);
  
  requestAnimationFrame(() => {
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const cell = cells[r * state.cols + c];
        if (!cell) continue;
        const oldVal = before[r][c];
        const newVal = after[r][c];
        const colOffset = colMap[c];

        if (newVal === null) {
          cell.classList.remove('c0', 'c1', 'c2', 'c3', 'c4', 'highlight', 'popping', 'fall', 'slide');
          cell.classList.add('empty');
          cell.style.opacity = '';
          cell.style.transform = '';
          cell.style.transition = '';
        } else {
          const oldColorClass = [...cell.classList].find(x => /^c\d$/.test(x));
          const needsColorUpdate = !oldColorClass || oldColorClass !== `c${newVal}`;
          
          cell.classList.remove('empty', 'highlight', 'popping', 'fall');
          
          if (needsColorUpdate) {
            cell.classList.remove('c0', 'c1', 'c2', 'c3', 'c4');
            cell.classList.add(`c${newVal}`);
          }
          
          if (colOffset !== 0) {
            const moveDistance = colOffset * (cell.offsetWidth + 2);
            cell.style.opacity = '0';
            cell.style.transform = `translateX(${moveDistance}px)`;
            
            requestAnimationFrame(() => {
              cell.style.transition = `opacity 300ms ease-out, transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
              cell.style.opacity = '1';
              cell.style.transform = 'translateX(0)';
              
              setTimeout(() => {
                cell.style.transition = '';
              }, 300);
            });
            
            changed.push(cell);
          } else {
            cell.style.opacity = '';
            cell.style.transform = '';
            cell.style.transition = '';
          }
        }
      }
    }
  });
  
  return changed;
}

function computeColumnMapping(before, after) {
  const cols = before[0].length;
  const colMap = new Array(cols).fill(0);
  
  let afterCol = 0;
  for (let beforeCol = 0; beforeCol < cols; beforeCol++) {
    const beforeColEmpty = before.every(row => row[beforeCol] === null);
    
    if (!beforeColEmpty) {
      colMap[afterCol] = beforeCol - afterCol;
      afterCol++;
    }
  }
  
  while (afterCol < cols) {
    colMap[afterCol] = -1;
    afterCol++;
  }
  
  return colMap;
}

// ---------------------------------------------------------------------------
// Fall animation
// ---------------------------------------------------------------------------
function animateFallCells(cells) {
  cells.forEach((cell) => {
    const c = +cell.dataset.col;
    cell.style.animationDelay = `${c * 15}ms`;
    cell.classList.add('fall');
    cell.addEventListener('animationend', () => {
      cell.classList.remove('fall');
      cell.style.animationDelay = '';
    }, { once: true });
  });
}

// ---------------------------------------------------------------------------
// Overlay (game over / cleared)
// ---------------------------------------------------------------------------
function showOverlay(cleared) {
  overlayTitle.textContent = cleared ? _('cleared') : _('gameOver');
  overlayMsg.textContent   = cleared ? _('clearedMsg') : _('gameOverMsg');
  overlayScore.textContent = `${_('finalScore')}: ${state.score}`;
  overlay.classList.remove('hidden');
}

function hideOverlay() {
  overlay.classList.add('hidden');
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
function onUndoClick() {
  if (isAnimating) return;
  if (!state || state.history.length === 0) return;
  state = undo(state);
  highlighted = null;
  previewEl.textContent = '';
  updateScoreDisplay();
  renderGrid();
}

function onNewGame() {
  startGame();
}

function onDifficultyToggle() {
  const order = ['easy', 'medium', 'hard'];
  const idx = order.indexOf(difficulty);
  difficulty = order[(idx + 1) % order.length];
  localStorage.setItem('sg-diff', difficulty);
  updateDifficultyButton();
  startGame();
}

function updateDifficultyButton() {
  if (difficultyBtn) {
    difficultyBtn.textContent = _(difficulty);
    difficultyBtn.dataset.i18n = difficulty;
  }
}

function onThemeToggle() {
  theme = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('sg-theme', theme);
  applyTheme();
  updateThemeButton();
}

function updateThemeButton() {
  const icon = themeToggle.querySelector('i');
  if (icon) {
    icon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  }
}

function onSoundToggle() {
  soundEnabled = !soundEnabled;
  updateSoundButton();
}

function updateSoundButton() {
  const icon = soundToggle.querySelector('i');
  if (icon) {
    icon.className = soundEnabled ? 'fa-solid fa-bell' : 'fa-solid fa-bell-slash';
  }
}

function onLangToggle() {
  lang = lang === 'zh' ? 'en' : lang === 'en' ? 'ja' : 'zh';
  localStorage.setItem('sg-lang', lang);
  applyTranslations();
  applyTheme();
  updateLangButton();
}

function updateLangButton() {
  const btn = document.getElementById('lang-toggle');
  if (!btn) return;
  const icon = btn.querySelector('i');
  const text = btn.querySelector('span');
  if (text) {
    text.textContent = lang === 'zh' ? 'EN' : lang === 'en' ? 'JA' : '中';
  }
  if (!icon) {
    btn.textContent = lang === 'zh' ? 'EN' : lang === 'en' ? 'JA' : '中';
  }
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------
function onKeyDown(e) {
  if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    onUndoClick();
  }
  if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    onNewGame();
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  try {
    grid          = document.getElementById('game-grid');
    scoreEl       = document.getElementById('score-value');
    bestEl        = document.getElementById('best-value');
    undoBtn       = document.getElementById('undo-btn');
    newBtn        = document.getElementById('new-btn');
    overlay       = document.getElementById('overlay');
    overlayTitle  = document.getElementById('overlay-title');
    overlayMsg    = document.getElementById('overlay-msg');
    overlayScore  = document.getElementById('overlay-score');
    overlayPlayBtn= document.getElementById('overlay-play-btn');
    previewEl     = document.getElementById('preview');
    hintEl        = document.getElementById('hint');
    soundToggle   = document.getElementById('sound-toggle');
    themeToggle   = document.getElementById('theme-toggle');
    langToggle    = document.getElementById('lang-toggle');
    difficultyBtn = document.getElementById('difficulty-btn');

    // Wire controls
    undoBtn.addEventListener('click', onUndoClick);
    newBtn.addEventListener('click',  onNewGame);
    overlayPlayBtn.addEventListener('click', () => startGame());
    difficultyBtn.addEventListener('click', onDifficultyToggle);
    themeToggle.addEventListener('click', onThemeToggle);
    soundToggle.addEventListener('click', onSoundToggle);
    langToggle.addEventListener('click',  onLangToggle);

    // Set initial difficulty button text
    updateDifficultyButton();

    document.addEventListener('keydown', onKeyDown);

    // Prevent text selection on touch devices - only for game grid area
    const gameGrid = document.getElementById('game-grid');
    if (gameGrid) {
      gameGrid.addEventListener('pointerdown', clearSelection, { passive: true });
      gameGrid.addEventListener('pointermove', clearSelection, { passive: true });
      gameGrid.addEventListener('selectstart', (e) => e.preventDefault());
    }
    // Global select start prevention
    document.addEventListener('selectstart', (e) => {
      if (e.target.closest('input, textarea, select')) return;
      e.preventDefault();
    });

    applyTheme();
    applyTranslations();
    updateLangButton();
    updateThemeButton();
    updateSoundButton();
    startGame();
  } catch (err) {
    console.error('Initialization error:', err);
    alert('Error initializing game: ' + err.message);
  }
});
