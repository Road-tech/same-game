/**
 * i18n.js — Japanese / English translations for Same Game UI
 */

export const translations = {
  ja: {
    title: "Same Game",
    subtitle: "同色隣接ブロックを消して高得点を狙え",
    score: "スコア",
    best: "ベスト",
    difficulty: "難易度",
    easy: "イージー",
    medium: "ミディアム",
    hard: "ハード",
    newGame: "新しいゲーム",
    undo: "元に戻す",
    gameOver: "ゲームオーバー",
    gameOverMsg: "これ以上消せるブロックがありません",
    cleared: "完全消去！",
    clearedMsg: "ボード完全消去ボーナス +1000点！",
    finalScore: "最終スコア",
    playAgain: "もう一度",
    previewScore: "スコア予測",
    hint: "2個以上隣接する同色ブロックをクリック",
    theme: "テーマ",
    light: "ライト",
    dark: "ダーク",
    language: "言語",
  },
  en: {
    title: "Same Game",
    subtitle: "Click groups of same-color blocks to score",
    score: "Score",
    best: "Best",
    difficulty: "Difficulty",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    newGame: "New Game",
    undo: "Undo",
    gameOver: "Game Over",
    gameOverMsg: "No more moves available",
    cleared: "Board Cleared!",
    clearedMsg: "Board clear bonus +1000 points!",
    finalScore: "Final Score",
    playAgain: "Play Again",
    previewScore: "Preview",
    hint: "Click groups of 2+ adjacent same-color blocks",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    language: "Language",
  },
  zh: {
    title: "同色消消乐",
    subtitle: "点击相邻同色方块得分",
    score: "得分",
    best: "最佳",
    difficulty: "难度",
    easy: "简单",
    medium: "中等",
    hard: "困难",
    newGame: "新游戏",
    undo: "撤销",
    gameOver: "游戏结束",
    gameOverMsg: "没有可消除的方块了",
    cleared: "全部消除！",
    clearedMsg: "清空棋盘奖励 +1000分！",
    finalScore: "最终得分",
    playAgain: "再玩一次",
    previewScore: "预览",
    hint: "点击2个以上相邻的同色方块",
    theme: "主题",
    light: "浅色",
    dark: "深色",
    language: "语言",
  },
};

/**
 * Get a translation string.
 * @param {string} lang  "ja" | "en"
 * @param {string} key
 * @returns {string}
 */
export function t(lang, key) {
  return translations[lang]?.[key] ?? translations.en[key] ?? key;
}
