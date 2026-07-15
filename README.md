# 修仙游乐园 · Xian Park（Game Jam MVP）

纯前端修仙主题「乐园经营 + Roguelike」小游戏。基于 **Vite + TypeScript + Phaser 3**，无后端、无账号，可静态部署。

按 [MVP 文档.md](MVP文档.md)、[技术设计文档.md](技术设计文档.md)、[美术资产清单.md](美术资产清单.md) 实现。当前使用**程序化占位美术**（彩色方块/图形），玩法已完整跑通；正式图集/音频后置替换。

## 玩法

- 在 8×6（48 格）棋盘上摆放建筑：棋盘含独立**道路**（不可建造），建筑放在道路旁的空地，游客沿道路前行时会光顾相邻建筑并消费。
- 一天状态机：`规划(Planning) → 结算(Resolving) → 播放(Animating) → 三选一(Drafting)`。
- **先结算后播放**：规则同步算出结果 + 事件日志，动画只做表现，支持 1×/2×/跳过。
- 通过建筑联动（聚灵阵、雷池、悟道台、九转大摆锤、黄泉漂流等）与门派偏好制造收益差异。
- 每天需缴纳灵脉维护费；灵石为负则倒闭；撑满 15 天即飞升通关。
- 本地存档（localStorage，带 `schemaVersion`），刷新可续玩。
- 确定性随机（统一 `RandomService`，seed + 游标），同种子可复现。

## 运行

```bash
npm install
npm run dev        # 开发服务器 http://localhost:5173
npm run build      # 类型检查 + 生产构建（输出 dist/）
npm run preview    # 预览生产包
npm run test       # 运行纯规则单元测试（Vitest）
```

> Windows PowerShell 若提示找不到 node，请确认 `C:\Program Files\nodejs` 已在 PATH 中。

## 架构（五层，规则层不引用 Phaser）

```
src/
├─ main.ts                  # Phaser 启动、音频解锁、页面可见性
├─ game/
│  ├─ config.ts             # 棋盘/分辨率/索引换算等常量
│  ├─ theme.ts              # 占位配色与层级
│  ├─ models/               # 数据类型：building/visitor/effect/daily-event/game-state
│  ├─ data/                 # 数据驱动配置：15 建筑 / 6 门派 / 事件 / 平衡数值
│  ├─ services/             # RandomService / SaveService / AudioService
│  ├─ systems/              # 纯 TS 规则：Placement/Synergy/Visitor/Economy/Draft/Event + route
│  ├─ controllers/          # TurnController（回合编排 + 棋盘编辑，纯函数）
│  ├─ rendering/            # BoardView / AnimationPlayer / layout
│  └─ scenes/               # Boot/Preload/MainMenu/Park/Result
└─ ui/                      # Hud / CatalogPanel / DetailPanel / DraftModal / DebugPanel / Button
tests/                      # 规则层单元测试（21 项）
```

## 操作

- 点击右侧图鉴选择建筑 → 在棋盘空格点击放置（悬停显示合法/非法预览，右键/ESC 取消）。
- 建筑有不同**占地尺寸**（如 2×1、2×2）；放置时按**鼠标中键**（或 `R` 键）旋转朝向。多格建筑只要任一占地格紧邻道路即可被服务，相邻联动也按整块占地计算。
- 点击已放置的建筑打开详情，可升级或拆除（返还 50%）。
- 点击「开始营业」结算当天，观看动画（可切 1×/2× 或跳过）。
- 每天结束三选一，扩充图鉴。
- 按 `D` 打开开发调试面板（seed / 阶段 / 加灵石 / 清存档）。

## 说明

- 建筑效果使用有限可辨识联合类型 `EffectSpec`，规则引擎按 `kind` 分发处理器。
- 收益公式：`基础 × 品质系数 × 等级系数 × (1 + 全局加成 + 相邻加成 + 游客偏好)`，稀有「翻倍」进独立乘区。
- 正式接入 Aseprite 图集与音频后，仅需替换 `PreloadScene` 加载与 `BoardView`/`AudioService` 表现层，规则层无需改动。
