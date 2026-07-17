# 修仙游乐园 · AI 美术提示词文档

每个资产给出**文件名 + 尺寸 + 一段完整提示词**（风格约束已合并进每条，直接整段粘贴即可，无需再拼后缀；透明背景 / 无文字 / 单个物体等约束已写进提示词内，适配不支持负向提示词的工具）。

风格与 [美术设计规范.md](美术设计规范.md)、[美术资产清单.md](美术资产清单.md) 对齐：**明亮仙境 + Q 版可爱 + 玉绿 / 金 / 紫点缀**。

**生成建议**：精灵/建筑/游客/特效用透明底 PNG、尽量高分辨率（≈1024）；场景大图 16:9；一批资产尽量同 seed 批量出以统一配色。存放建议 `public/assets/<分组>/`（文件名=代码里的 id，出完即可直接加载）。

> ⚠️ **建筑/游客/特效资产必读（否则无法摆到格子上）**：
> 1. **纯品红背景抠图流程**：AI 很难直接导出透明底，因此统一让背景为**纯品红 `#FF00FF`**（`solid pure magenta background, flat single color, no gradient, no shadow on background`）。项目会在加载时自动把品红抠成透明（`src/game/rendering/chromaKey.ts`，自动取角色+容差，保留白云与紫饰）。若工具能直接导出透明 PNG 更好。
> 2. **不要焊背景**：除品红底外**只保留建筑主体本身**，不要画环绕的地面、草地、天空、大背景。底部的少量祥云可留（抠图只去品红、不去白）。
> 3. **只留极小底座**：建筑底部可有一圈很薄的台基/地台暗示接地，但不要延伸出大片地面。
> 4. **统一相机**：所有建筑用同一个俯仰角度和光照方向（约 3/4 俯视、光从左上）。

---

## 1. 场景大图（`public/assets/scene/`）

**`bg-park.png`** ✅ 已完成 — 16:9

**`bg-mainmenu.png`** — 16:9
```text
A grand bright Chinese xianxia cultivation amusement park panorama, a big ornate entrance gate, a pagoda-style ferris wheel in the distance, festive lanterns and banners, floating jade mountains and auspicious clouds, empty upper-center space for a title, cute chibi storybook style, bright soft pastel colors, jade green and gold with gentle purple accents, hand-painted, high quality, horizontal 16:9, no characters in foreground, no UI, no text, no watermark
```

**`bg-preload.png`** — 16:9
```text
A calm soft Chinese xianxia sky with drifting clouds and faint distant jade peaks, gentle floating spirit motes, minimal and clean loading-screen background, cute chibi storybook style, bright soft pastel colors, jade green and gold with gentle purple accents, hand-painted, high quality, horizontal 16:9, no characters, no buildings, no UI, no text, no watermark
```

**`bg-result-win.png`** — 16:9
```text
A triumphant ascension sky, radiant golden light rays breaking through auspicious clouds, celebratory floating petals and sparkles, joyful and grand, cute chibi Chinese xianxia storybook style, bright warm colors, jade green and gold with gentle purple accents, hand-painted, high quality, horizontal 16:9, no characters, no UI, no text, no watermark
```

**`bg-result-lose.png`** — 16:9
```text
A melancholy dusk over a quiet emptied cultivation park, muted cool colors, lonely dim lanterns, soft fog, wistful mood, cute chibi Chinese xianxia storybook style, hand-painted, high quality, horizontal 16:9, no characters, no UI, no text, no watermark
```

**`logo.png`** — 2:1 透明
```text
An ornate circular game logo crest for a Chinese xianxia cultivation amusement park, a jade and gold emblem combining a small pagoda ferris wheel and cloud motifs, glowing gently, clear empty space in the middle for a title, cute chibi hand-painted style, jade green and gold with purple accents, centered, transparent background, no text, no watermark, high quality
```

---

## 2. 地块 Tileset（`public/assets/tiles/`）

> 引擎为 45° 等距（2:1 菱形）。若沿用当前程序化地面，本组可选。

**`tile-grass.png`** — 2:1（如 256×128）
```text
A single top-down 2:1 isometric diamond grass tile, soft cartoon lawn with a subtle top-left highlight and bottom-right shade, cute chibi Chinese xianxia style, hand-painted, soft colors, seamless single tile, transparent background, no text, no watermark, high quality game asset
```

**`tile-grass-alt.png`** — 2:1
```text
A variant top-down 2:1 isometric diamond grass tile with a few tiny flowers and a small bush, cute chibi Chinese xianxia style, hand-painted, soft colors, seamless single tile, transparent background, no text, no watermark, high quality game asset
```

**`tile-road.png`** — 2:1
```text
A single top-down 2:1 isometric diamond stone-path tile, light warm paved slabs, cute chibi Chinese xianxia style, hand-painted, soft colors, seamless single tile, transparent background, no text, no watermark, high quality game asset
```

**`tile-road-corner.png`** — 2:1
```text
A top-down 2:1 isometric diamond stone road tile shaped as a curved corner piece, light warm paved slabs, cute chibi Chinese xianxia style, hand-painted, seamless single tile, transparent background, no text, no watermark, high quality game asset
```

**`tile-road-t.png`** — 2:1
```text
A top-down 2:1 isometric diamond stone road tile shaped as a T-junction piece, light warm paved slabs, cute chibi Chinese xianxia style, hand-painted, seamless single tile, transparent background, no text, no watermark, high quality game asset
```

**`tile-road-cross.png`** — 2:1
```text
A top-down 2:1 isometric diamond stone road tile shaped as a crossroads piece, light warm paved slabs, cute chibi Chinese xianxia style, hand-painted, seamless single tile, transparent background, no text, no watermark, high quality game asset
```

**`tile-pond.png`** — 2:1
```text
A top-down 2:1 isometric diamond water pond tile, soft blue with gentle ripples and a jade rim, cute chibi Chinese xianxia style, hand-painted, seamless single tile, transparent background, no text, no watermark, high quality game asset
```

**`deco-rock.png`** — 方形透明
```text
A small cute mossy rock prop, cute chibi Chinese xianxia style, hand-painted, soft cel shading, single centered object, grounded at bottom center, transparent background, no ground, no text, no watermark, high quality game asset
```

**`deco-tree.png`** — 方形透明
```text
A small cute jade pine / spirit tree prop, cute chibi Chinese xianxia style, hand-painted, soft cel shading, single centered object, grounded at bottom center, transparent background, no ground, no text, no watermark, high quality game asset
```

**`deco-flower.png`** — 方形透明
```text
A small cluster of cute glowing spirit flowers prop, cute chibi Chinese xianxia style, hand-painted, soft cel shading, single centered object, grounded at bottom center, transparent background, no ground, no text, no watermark, high quality game asset
```

---

## 3. 建筑（`public/assets/buildings/`，文件名=建筑 id）

> 占地比例：1×1→方形；2×1→宽约 2:1；1×2→高约 1:2；2×2→方形。

### 3.1 游乐设施

**`sword-coaster.png`** — 2×1 · 稀有蓝绿
```text
A whimsical flying-sword roller coaster ride, glowing jade rails looping in the air, several flying swords used as coaster carts, a small boarding platform on a thin stone base, wide 2:1 footprint, cute chibi Chinese xianxia cultivation style, kawaii, soft rounded shapes, hand-painted storybook illustration, soft cel shading, jade green and warm gold palette with gentle purple accents, bright soft lighting, bold clean readable silhouette, the ride is a single isolated object, no surrounding clouds, no scenery, no ground, no sky, 3/4 front view slightly from above, grounded at bottom center, fully transparent background with alpha, PNG, no text, no watermark, high quality game asset
```

**`spin-hammer.png`** — 2×2 · 稀有蓝
```text
A giant fairground pendulum swing ride shaped like a nine-ringed magic hammer, rotating seats on the arm, an ornate carved base, chunky 2x2 footprint, cute chibi Chinese xianxia cultivation style, kawaii, soft rounded shapes, hand-painted storybook illustration, soft cel shading, jade green and warm gold palette with gentle purple accents, bright soft lighting, bold clean readable silhouette, single centered object, 3/4 front view slightly from above, grounded at bottom center, no ground plane, transparent background, no text, no watermark, high quality game asset
```

**`thunder-tower.png`** — 1×2 · 稀有蓝
```text
A tall slender pagoda tower crackling with purple lightning at its spire, tribulation thunderclouds swirling around the top, vertical footprint, cute chibi Chinese xianxia cultivation style, kawaii, soft rounded shapes, hand-painted storybook illustration, soft cel shading, jade green and warm gold palette with gentle purple accents, bright soft lighting, bold clean readable silhouette, single centered object, 3/4 front view slightly from above, grounded at bottom center, no ground plane, transparent background, no text, no watermark, high quality game asset
```

**`heart-demon-house.png`** — 1×1 · 优秀绿
```text
A cute-spooky little haunted house with a grinning demon-face doorway, dark purple roof, tiny floating ghost wisps, cute chibi Chinese xianxia cultivation style, kawaii, soft rounded shapes, hand-painted storybook illustration, soft cel shading, jade green and warm gold palette with gentle purple accents, bright soft lighting, bold clean readable silhouette, single centered object, 3/4 front view slightly from above, grounded at bottom center, no ground plane, transparent background, no text, no watermark, high quality game asset
```

**`yellow-spring-drift.png`** — 2×1 · 史诗紫
```text
A water flume drift ride with a glowing teal-green ghostly river, small wooden boats, ornate purple epic decorations, wide 2:1 footprint, cute chibi Chinese xianxia cultivation style, kawaii, soft rounded shapes, hand-painted storybook illustration, soft cel shading, jade green and warm gold palette with gentle purple accents, bright soft lighting, bold clean readable silhouette, single centered object, 3/4 front view slightly from above, grounded at bottom center, no ground plane, transparent background, no text, no watermark, high quality game asset
```

### 3.2 商店

**`mengpo-tea.png`** — 1×1 · 优秀绿
```text
A cozy bubble-tea stall run by a cute smiling granny (Meng Po), steaming teacups, a soul-soup cauldron, warm hanging lanterns, cute chibi Chinese xianxia cultivation style, kawaii, soft rounded shapes, hand-painted storybook illustration, soft cel shading, jade green and warm gold palette with gentle purple accents, bright soft lighting, bold clean readable silhouette, single centered object, 3/4 front view slightly from above, grounded at bottom center, no ground plane, transparent background, no text, no watermark, high quality game asset
```

**`pill-shop.png`** — 1×1 · 普通灰
```text
A small alchemy pill shop with a big gourd on the roof, shelves of glowing round elixir pills, a wooden counter, cute chibi Chinese xianxia cultivation style, kawaii, soft rounded shapes, hand-painted storybook illustration, soft cel shading, jade green and warm gold palette with gentle purple accents, bright soft lighting, bold clean readable silhouette, single centered object, 3/4 front view slightly from above, grounded at bottom center, no ground plane, transparent background, no text, no watermark, high quality game asset
```

**`artifact-museum.png`** — 2×1 · 史诗紫
```text
An elegant treasure hall displaying floating glowing magic weapons and artifacts on pedestals, purple epic glow, gold trim, wide 2:1 footprint, cute chibi Chinese xianxia cultivation style, kawaii, soft rounded shapes, hand-painted storybook illustration, soft cel shading, jade green and warm gold palette with gentle purple accents, bright soft lighting, bold clean readable silhouette, single centered object, 3/4 front view slightly from above, grounded at bottom center, no ground plane, transparent background, no text, no watermark, high quality game asset
```

### 3.3 Buff 建筑（俯视更佳）

**`spirit-gathering-array.png`** — 1×1 · 优秀绿
```text
A glowing spirit-gathering magic formation on the ground, concentric blue runic circles, a floating jade crystal in the center, cute chibi Chinese xianxia cultivation style, hand-painted, soft glowing runes, jade and gold with purple accents, top-down 3/4 view, single centered object, transparent background, no ground, no text, no watermark, high quality game asset
```

**`enlightenment-altar.png`** — 1×1 · 稀有蓝
```text
A round meditation altar platform with a lotus seat, a soft golden enlightenment halo, small floating scriptures, cute chibi Chinese xianxia cultivation style, hand-painted, soft glowing runes, jade and gold with purple accents, top-down 3/4 view, single centered object, transparent background, no ground, no text, no watermark, high quality game asset
```

**`thunder-pond.png`** — 1×1 · 史诗紫
```text
A small circular pond crackling with purple electricity, lightning arcs dancing over glowing water, a carved stone rim, cute chibi Chinese xianxia cultivation style, hand-painted, soft glowing runes, jade and gold with purple accents, top-down 3/4 view, single centered object, transparent background, no ground, no text, no watermark, high quality game asset
```

### 3.4 功能建筑

**`toilet-array.png`** — 1×1 · 普通灰
```text
A whimsical little cultivation restroom pavilion with a swirling reincarnation symbol, cute and clean, cute chibi Chinese xianxia cultivation style, kawaii, soft rounded shapes, hand-painted storybook illustration, soft cel shading, jade green and warm gold palette with gentle purple accents, bright soft lighting, bold clean readable silhouette, single centered object, 3/4 front view slightly from above, grounded at bottom center, no ground plane, transparent background, no text, no watermark, high quality game asset
```

**`tribulation-insurance.png`** — 1×1 · 稀有蓝
```text
A small insurance booth covered with protective talismans and a big red seal stamp, an official-looking little counter, cute chibi Chinese xianxia cultivation style, kawaii, soft rounded shapes, hand-painted storybook illustration, soft cel shading, jade green and warm gold palette with gentle purple accents, bright soft lighting, bold clean readable silhouette, single centered object, 3/4 front view slightly from above, grounded at bottom center, no ground plane, transparent background, no text, no watermark, high quality game asset
```

**`recruit-plaza.png`** — 2×1 · 优秀绿
```text
A recruitment plaza with a tall sect banner flag, a small stage, hanging lanterns, wide 2:1 footprint, cute chibi Chinese xianxia cultivation style, kawaii, soft rounded shapes, hand-painted storybook illustration, soft cel shading, jade green and warm gold palette with gentle purple accents, bright soft lighting, bold clean readable silhouette, single centered object, 3/4 front view slightly from above, grounded at bottom center, no ground plane, transparent background, no text, no watermark, high quality game asset
```

**`mountain-guard-array.png`** — 2×2 · 传说金
```text
A grand protective barrier formation, a translucent golden dome shield over ornate stone pillars with dragon carvings, legendary radiant golden glow, chunky 2x2 footprint, cute chibi Chinese xianxia cultivation style, kawaii, soft rounded shapes, hand-painted storybook illustration, soft cel shading, jade green and warm gold palette with gentle purple accents, bright soft lighting, bold clean readable silhouette, single centered object, 3/4 front view slightly from above, grounded at bottom center, no ground plane, transparent background, no text, no watermark, high quality game asset
```

---

## 4. 游客 / 6 门派（`public/assets/visitors/`）

> MVP 单向（朝右）即可，引擎用 flipX 表现朝左。先出 walk。

**`sword.png`** — 剑修
```text
A chibi sword cultivator in a flowing blue-and-white robe with a sword strapped on the back, confident, cute chibi Chinese cultivator character, kawaii, big head small body, soft rounded shapes, hand-painted, soft cel shading, full body, walking pose, side 3/4 view facing right, single character, transparent background, no ground, no text, no watermark, high quality game sprite
```

**`alchemy.png`** — 丹修
```text
A chibi alchemy cultivator in an orange-red robe holding a medicine gourd, cheerful, cute chibi Chinese cultivator character, kawaii, big head small body, soft rounded shapes, hand-painted, soft cel shading, full body, walking pose, side 3/4 view facing right, single character, transparent background, no ground, no text, no watermark, high quality game sprite
```

**`buddhist.png`** — 佛修
```text
A chibi buddhist monk cultivator, bald head, brown-yellow kasaya robe, prayer beads, gentle smile, cute chibi Chinese cultivator character, kawaii, big head small body, soft rounded shapes, hand-painted, soft cel shading, full body, walking pose, side 3/4 view facing right, single character, transparent background, no ground, no text, no watermark, high quality game sprite
```

**`demonic.png`** — 魔修
```text
A chibi demonic cultivator in a black-and-crimson robe with a faint red aura, mischievous but still cute, cute chibi Chinese cultivator character, kawaii, big head small body, soft rounded shapes, hand-painted, soft cel shading, full body, walking pose, side 3/4 view facing right, single character, transparent background, no ground, no text, no watermark, high quality game sprite
```

**`demon.png`** — 妖修
```text
A chibi beast-spirit cultivator with fox ears and a fluffy tail, playful, light green robe, cute chibi Chinese cultivator character, kawaii, big head small body, soft rounded shapes, hand-painted, soft cel shading, full body, walking pose, side 3/4 view facing right, single character, transparent background, no ground, no text, no watermark, high quality game sprite
```

**`ghost.png`** — 鬼修
```text
A chibi ghost cultivator with a pale translucent floating body and a wispy tail instead of legs, cute, cute chibi Chinese cultivator character, kawaii, big head small body, soft rounded shapes, hand-painted, soft cel shading, full body, floating/walking pose, side 3/4 view facing right, single character, transparent background, no ground, no text, no watermark, high quality game sprite
```

> 可选表情：复制上面对应门派提示词，把动作描述替换为 `happy smiling and cheering pose`（`<id>-happy.png`）或 `angry pouting pose`（`<id>-angry.png`）。

---

## 5. 特效（`public/assets/fx/`）

**`fx-thunder.png`** — 雷击
```text
A stylized jagged purple lightning bolt strike with sparks and a bright flash, stylized game VFX sprite, vibrant glowing, chibi xianxia fantasy, clean edges, centered, pure transparent background, no text, no watermark
```

**`fx-coin.png`** — 灵石飘字
```text
A shiny golden spirit-stone coin with a small sparkle, currency icon, stylized game VFX sprite, vibrant glowing, chibi xianxia fantasy, clean edges, centered, pure transparent background, no text, no watermark
```

**`fx-purchase.png`** — 消费气泡
```text
A cute pop speech bubble with a coin / shopping icon inside, stylized game VFX sprite, vibrant glowing, chibi xianxia fantasy, clean edges, centered, pure transparent background, no text, no watermark
```

**`fx-satisfaction-up.png`** — 满意上升
```text
A rising pink heart with happy sparkles, stylized game VFX sprite, vibrant glowing, chibi xianxia fantasy, clean edges, centered, pure transparent background, no text, no watermark
```

**`fx-ascension.png`** — 飞升光柱
```text
A radiant vertical beam of golden light with rising petals and sparkles, stylized game VFX sprite, vibrant glowing, chibi xianxia fantasy, clean edges, centered, pure transparent background, no text, no watermark
```

**`fx-negative.png`** — 负面事件
```text
A small red warning burst with a cracked seal / skull motif, stylized game VFX sprite, vibrant glowing, chibi xianxia fantasy, clean edges, centered, pure transparent background, no text, no watermark
```

**`fx-place-valid.png`** — 可放置高亮
```text
A glowing cyan-teal spirit-qi highlight on a 2:1 isometric diamond tile, soft glow, stylized game VFX sprite, vibrant glowing, chibi xianxia fantasy, clean edges, centered, pure transparent background, no text, no watermark
```

**`fx-place-invalid.png`** — 不可放置
```text
A glowing red highlight with an X mark on a 2:1 isometric diamond tile, stylized game VFX sprite, vibrant glowing, chibi xianxia fantasy, clean edges, centered, pure transparent background, no text, no watermark
```

---

## 6. UI（`public/assets/ui/`，可选）

> 当前 UI 由代码程序化绘制（`src/ui/skin.ts` 玉底金边）。本组为可选贴图替换。

**`ui-button.png`** — 按钮（九宫格）
```text
A horizontal jade fantasy button plate with gold trim and small corner gems, soft glossy, empty center, 9-slice friendly, mobile game UI element, Chinese xianxia fantasy, clean, transparent background, no text, no watermark
```

**`ui-panel.png`** — 面板（九宫格）
```text
A jade parchment panel with an ornate gold border and corner motifs, empty center, 9-slice friendly, mobile game UI element, Chinese xianxia fantasy, clean, transparent background, no text, no watermark
```

**`ui-card.png`** — 建筑卡底
```text
A vertical building card frame, jade body with gold trim, empty center, mobile game UI element, Chinese xianxia fantasy, clean, transparent background, no text, no watermark
```

**`ui-rarity-common.png` / `ui-rarity-uncommon.png` / `ui-rarity-rare.png` / `ui-rarity-epic.png` / `ui-rarity-legendary.png`** — 五档品质框
```text
An ornate rectangular card frame border glowing {soft gray | jade green | sky blue | purple | radiant gold}, mobile game UI element, Chinese xianxia fantasy, ornate gold corner gems, empty center, transparent background, no text, no watermark
```
（按顺序把 `{}` 换成对应颜色，出 5 张。）

**图标（256×256，圆形底）**：`ui-icon-stone.png`（金色灵石币）、`ui-icon-visitor.png`（可爱修士笑脸）、`ui-icon-day.png`（日月/日历卷轴）、`ui-icon-satisfaction.png`（爱心）、`ui-icon-speed.png`（双箭头快进）、`ui-icon-skip.png`（跳到末尾箭头）、`ui-icon-volume.png`（喇叭）
```text
A single round game icon of {a golden spirit-stone coin | a cute smiling cultivator face | a sun-and-moon calendar scroll | a happy heart | a double fast-forward arrow | a skip-to-end arrow | a speaker}, mobile game UI icon, Chinese xianxia fantasy, jade and gold, clean bold silhouette, centered, transparent background, no text, no watermark
```

**`ui-progress.png`** — 进度条
```text
A horizontal jade-and-gold progress bar frame with a glowing fill, 9-slice friendly, mobile game UI element, Chinese xianxia fantasy, clean, transparent background, no text, no watermark
```

**`ui-tooltip.png`** — 提示气泡
```text
A small jade tooltip bubble with gold trim and a pointer tail, empty center, 9-slice friendly, mobile game UI element, Chinese xianxia fantasy, clean, transparent background, no text, no watermark
```

---

## 7. 优先级（Game Jam 排期）

1. 建筑 15 个 idle（保证可玩、可辨识）。
2. 游客 6 门派 walk + 地块（草 / 路）。
3. 特效：`fx-coin`、`fx-purchase`、`fx-thunder`、`fx-place-valid/invalid`。
4. 场景大图：`bg-mainmenu`、`logo`（`bg-park` 已完成）。
5. UI 贴图（可选，当前已有程序化皮肤）。
6. 游客 happy/angry、建筑 active/disabled、结算大图。

> 出好一批图后告诉我，我可以把它们接进 `PreloadScene` 批量加载，并替换现在的程序化建筑/地块渲染。
```
