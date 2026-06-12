# 同色消消乐 (Same Game)

[![演示](https://img.shields.io/badge/Live%20Demo-sen.ltd-blue?style=flat-square)](https://sen.ltd/portfolio/same-game/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![测试](https://img.shields.io/badge/tests-53%20passing-brightgreen?style=flat-square)](#测试)

经典的 **同色消消乐** (Same Game / Chain Shot) 益智游戏，使用原生 JavaScript 构建 —— 零依赖，无需构建步骤。

> 📖 **English version**: [README.en.md](README.en.md)

**[▶ 在线游玩 →](https://road-tech.github.io/same-game/)**

## 什么是同色消消乐？

点击 **2个或更多相邻的同色方块** 来消除它们。  
消除后上方方块会下落填补空隙，空列会自动向左压缩。  
得分公式：`(消除数量 − 2)²` —— 消除的方块越多，得分呈指数增长。  
当没有可消除的方块组时游戏结束。

## 功能特点

- 3个难度级别：
  - **简单** — 11×9 网格，3种颜色
  - **中等** — 15×12 网格，4种颜色
  - **困难** — 20×15 网格，5种颜色
- 鼠标悬停可预览即将消除的方块组和得分
- **撤销** 上一步（支持 Ctrl/Cmd+Z）
- **清空棋盘奖励**（全部消除时 +1000分）
- 每个难度独立记录最高分（存储在 localStorage）
- 自动检测是否还有可消除的方块
- 深色/浅色主题切换
- 支持中文 / 英语 / 日语界面
- 移动端触摸支持
- CSS动画效果（下落、高亮发光）

## 本地运行

```sh
git clone https://github.com/sen-ltd/same-game.git
cd same-game
npm run serve        # 打开 http://localhost:8080
```

无需构建步骤 —— 直接打开 `index.html` 或使用任何静态服务器即可运行。

## 测试

```sh
npm test             # node --test tests/same-game.test.js
```

53个测试用例覆盖：

- `createInitialBoard` — 尺寸、值范围、唯一性
- `createGame` — 状态结构、boardOverride
- `match` — 孤立单元格、2单元格配对、洪水填充、L形、空单元格
- `fill` — 点移除、重力、列压缩、不可变性
- `getHasNext` — 手工构造的棋盘测试
- `getScore` — 公式 `(n-2)²`
- `isClear` — 边界情况
- `play` — 不可变性、分数更新、历史记录、无匹配时无操作、清空奖励
- `undo` — 棋盘回退、分数回退、空历史保护

## 项目结构

```
src/
  same-game.js   纯游戏逻辑（board[row][col] 布局，所有函数导出）
  main.js        DOM操作、事件处理、渲染
  i18n.js        中日英翻译
tests/
  same-game.test.js
```

`same-game.js` 中的游戏逻辑是参考 `SameGame` 类的忠实移植，重构为纯函数并返回新状态对象。棋盘约定：`board[row][col]`，第0行=顶部，第0列=左侧。

## 更新日志

### v1.2.0 (2026-06-12)
- ✅ 添加中文语言支持
- ✅ 移动端竖屏优化 — 网格填满屏幕宽度
- ✅ 调整网格比例以获得更好的移动端体验：
  - 简单：11×9（原为 10×10）
  - 中等：15×12（原为 12×15）
  - 困难：20×15（原为 15×20）
- ✅ 改善动画流畅度 — 减少闪烁
- ✅ 分离重力和列压缩动画，添加明显间隔
- ✅ 增强 CSS 动画效果（添加弹跳效果）
- ✅ 优化列压缩动画 — 所有移动的方块平滑滑动，修复闪烁和生硬过渡问题
- ✅ 添加触摸事件防重入保护 — 动画期间不响应触摸操作

### v1.1.0 (2026-06-10)
- ✅ 添加撤销功能（Ctrl/Cmd+Z）
- ✅ 深色/浅色主题切换
- ✅ 日语语言支持
- ✅ 移动端触摸支持
- ✅ 方块消除和下落的 CSS 动画

### v1.0.0 (2026-06-08)
- ✅ 初始版本发布
- ✅ 核心同色消消乐逻辑（洪水填充算法）
- ✅ 重力和列压缩
- ✅ 3个难度级别
- ✅ 分数系统（含清空奖励）
- ✅ LocalStorage 最高分持久化
- ✅ 53个单元测试

## 许可证

MIT © 2026 [SEN LLC (SEN 合同会社)](https://sen.ltd)

<!-- sen-publish:links -->
## 链接

- 🌐 演示: https://sen.ltd/portfolio/same-game/
- 📝 dev.to: https://dev.to/sendotltd/same-game-in-vanilla-js-flood-fill-gravity-and-column-compression-1j8g
<!-- /sen-publish:links -->