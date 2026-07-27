# 我的小屋 · 3D 卧室个人网站

一个「3D 卧室 + 作品集」风格的个人网站(灵感来自 [heycas.ccwu.cc](https://heycas.ccwu.cc/) 的创意,代码为独立实现):

- **入口(`index.html`)**:Three.js 渲染的低多边形卧室 —— 木桌、办公椅、显示器、键盘、书堆、盆栽、游戏机、墙上海报与体素苹果。显示器屏幕里通过 CSS3DRenderer 嵌入真实的作品集页面。
- **作品集(`site.html`)**:米色纸质风 2D 主页 —— Hero、项目卡片、摄影墙、关于我、时间轴、联系方式。移动端访问会自动跳到这里。

纯静态站点,无构建步骤,任何静态托管都能部署。

## 本地预览

```bash
cd personal-site
python -m http.server 8642
# 打开 http://localhost:8642
```

> 必须通过 HTTP 访问(不能双击 HTML 文件用 file:// 打开),因为 3D 场景使用了 ES Module。
> 也可以用 `npx serve .` 或 VS Code 的 Live Server。

## 改成你自己的内容

**只需要编辑一个文件:`assets/js/data.js`**,所有文案都集中在这里:

| 配置段 | 内容 |
| --- | --- |
| `site` | 站点名、品牌字母、浏览器标题 |
| `hero` | 首屏大标题、副标题、名片署名 |
| `projects` | 项目列表(标题/描述/标签/截图/详情) |
| `photography` | 摄影作品(标题/图片路径/占位色) |
| `about` | 个人简介 + 三组技能 |
| `timeline` | 人生/职业时间轴 |
| `contact` | GitHub 地址、邮箱 |
| `room` | 3D 房间装饰:`posterImage` 填图片路径即可替换墙上海报(建议竖幅 3:4,放 `assets/img/`),留空显示内置手绘海报,加载失败自动回退 |

图片放置:

- 项目截图 → `assets/img/`,然后把路径填到 `projects.items[].image`
- 摄影作品(建议竖幅 3:4)→ `assets/img/photos/`,填到 `photography.items[].src`
- 留空 `image`/`src` 会显示内置的渐变占位图

3D 场景的物件、配色在 `assets/js/room.js` 顶部的 `THEMES` 和各个区块中,想改桌面摆设可以直接调整对应坐标。

## 访客统计

右上角「访问/访客」计数使用免费开源的 [Vercount](https://vercount.one/),`index.html` 里已引入其脚本,部署到公网后自动生效,无需注册。不需要的话删掉对应 `<script>` 和 `.room-counter` 即可。

## 部署

任选其一:

- **Vercel / Netlify**:仓库导入即可,无需任何构建配置(输出目录 = 根目录)
- **GitHub Pages**:仓库 Settings → Pages → 选择分支根目录
- **任意服务器**:把整个目录扔进 Nginx/Caddy 静态目录

## 目录结构

```
personal-site/
├── index.html            # 3D 卧室入口(含移动端跳转逻辑)
├── site.html             # 2D 作品集主页
└── assets/
    ├── css/
    │   ├── room.css      # 3D 入口覆盖层 UI(计数器/按钮/加载器)
    │   └── site.css      # 作品集页面样式
    └── js/
        ├── data.js       # ★ 站点内容配置(唯一需要改的文件)
        ├── room.js       # Three.js 3D 场景 + 进入屏幕交互
        └── site.js       # 作品集渲染逻辑
```

## 交互说明

- **滚轮推进**:房间视角下向下滚动滚轮,相机逐渐靠近显示器,滚满自动进入屏幕;向上滚拉远,可随时停在半途
- **滚轮退出**:屏幕内的页面滚回顶部后,继续向上滚动即可退出回到房间
- **进入屏幕**:左下角按钮一键推进;进入后可直接滚动/点击屏幕里的网页;`Esc` 或底部「返回卧室」退出
- **Style 切换**:右上角按钮,Classic(白日)/ Dark(深夜)两套房间配色
- **鼠标视差**:房间模式下移动鼠标,视角轻微跟随(推近时自动减弱)

## 使用 3D 模型素材(替换积木家具)

内置家具都是代码拼的几何体;想换成更精致的现成模型(电脑、键盘、杯子、游戏机、椅子、桌子、墙画等),按三步操作:

1. **下载 `.glb` 格式模型**,放进 `assets/models/`。推荐免费可商用来源:
   - [Poly Pizza](https://poly.pizza/) —— 低多边形模型聚合站,大量 CC0/CC-BY,和本站风格最搭
   - [Kenney](https://kenney.nl/assets/furniture-kit) —— Furniture Kit 等全套 CC0 资产包
   - [Quaternius](https://quaternius.com/) —— 成套 CC0 低多边形包
   - [Sketchfab](https://sketchfab.com/) —— 量最大,下载时筛选 CC0/CC-BY 授权(CC-BY 需在页面署名作者)
   - 注意:带任天堂/索尼等品牌外观的粉丝模型,个人非商用网站一般无碍,商用请改用无品牌的 generic 造型
2. **在 `assets/js/room.js` 的 `PROPS` 数组登记**(已有桌子的实际示例):
   ```js
   const PROPS = [
     { url: "assets/models/desk.glb",
       position: [0, 0, 0.15],
       targetHeight: 1.09,             // 家具按"高度"归一(桌面高≈1.09,台面物件≈1.16)
       targetFootprint: [4.0, 1.5],    // 可选:桌板拉伸到指定 宽×深,接住桌面物件
       rotationY: 0 },
     // 摆件类用 targetSize(按最长边归一)即可:
     // { url: "assets/models/mug.glb", position: [-1.1, 1.16, 2.98], targetSize: 0.12 },
   ];
   ```
   加载器会自动缩放模型并把底部对齐到 `position`,不用关心模型原始尺寸。
3. **关掉对应的内置几何体**:`room.js` 顶部 `BUILTIN` 里把该项改为 `false`(桌子已是 `desk: false`)。

> 授权提醒:Poly Pizza 上多数模型是 CC-BY,需要在网站某处(如页脚或关于页)标注作者,例如
> "Adjustable Desk by jeff cobesign (CC-BY, Poly Pizza)";CC0 模型则无需署名。
> 模型多了体积会涨,建议单个 glb 控制在 1-2MB 内;Draco 压缩的模型需额外配置 `DRACOLoader`。
