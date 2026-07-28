/*
 * ============================================================
 *  站点内容配置 —— 你只需要修改这个文件,就能换成自己的内容
 * ============================================================
 *  修改后刷新页面即可生效,无需构建。
 */
window.SITE_DATA = {
  /* ---------- 基础信息 ---------- */
  site: {
    // 浏览器标签页标题
    title: "我的小屋",
    // 左上角品牌区
    brandInitial: "M",          // 圆形 Logo 里的字母
    brandTitle: "我的小屋",
    brandKicker: "ROOM / WORKS",
    // 3D 入口页 <title>
    roomTitle: "我的卧室",
  },

  /* ---------- 首屏 Hero ---------- */
  hero: {
    lines: ["It's never too late", "to build something new"],
    subtitle: "重新出发,为时不晚",
    // 右侧名片上的署名(手写体风格展示)
    signature: "干饭人",
  },

  /* ---------- 导航 ---------- */
  nav: [
    { id: "home",        label: "首页" },
    { id: "projects",    label: "个人项目" },
    { id: "photography", label: "图像缓存" },
    { id: "about",       label: "关于我" },
    { id: "contact",     label: "联系" },
  ],

  /* ---------- 个人项目 ----------
   * image: 项目截图路径(放到 assets/img/ 下),留空则显示渐变占位图
   * detail: 点击卡片弹窗里的详细介绍,可留空
   */
  projects: {
    heading: "造过的轮子",
    items: [
      {
        title: "示例项目 Alpha",
        desc: "一个可以文生图、图生图的网页工具，以及一套完整的电商产品图设计。",
        tags: ["gpt-image2", "AI生图", "商品工作台"],
        image: "",
        detail:
          "这里写项目的详细介绍:解决什么问题、核心功能、技术选型与踩过的坑。支持多段文字,用 \\n\\n 分段。",
      },
      {
        title: "个人网站",
        desc: "一个用来展示个人项目与内容的个人网站。",
        tags: ["HTML", "CSS", "JavaScript", "Three.js"],
        image: "",
        detail:
          "灵感来自 3D 卧室风格的个人主页:入口是一个 Three.js 渲染的房间,显示器屏幕里嵌着真正的作品集页面。",
      },
      {
        title: "示例项目 Gamma",
        desc: "一个服务自己学习流程的命令行工具。",
        tags: ["Python", "CLI", "FastAPI"],
        image: "",
        detail: "",
      },
      {
        title: "示例项目 Delta",
        desc: "一个把本地服务包装成桌面入口的启动器。",
        tags: ["Vue 3", "Vite", "Node.js"],
        image: "",
        detail: "",
      },
    ],
  },

  /* ---------- 摄影 / 图像存档 ----------
   * src: 照片路径(建议竖幅,放到 assets/img/photos/ 下),留空则显示渐变占位
   */
  photography: {
    kicker: "Photography / Image Archive",
    heading: "乱拍存档",
    items: [
      { title: "海边日落", src: "", tone: "#d9a066" },
      { title: "山间徒步", src: "", tone: "#7d9b76" },
      { title: "城市夜色", src: "", tone: "#5b6b8c" },
      { title: "雨后街角", src: "", tone: "#9c8aa5" },
      { title: "清晨薄雾", src: "", tone: "#b9c4c9" },
      { title: "巷口小店", src: "", tone: "#c98d6b" },
      { title: "天台看云", src: "", tone: "#87a7b3" },
    ],
  },

  /* ---------- 关于我 ---------- */
  about: {
    intro:
      "围绕自身兴趣与工作需要,持续探索,发挥想象,希望把技术能力沉淀成能真正提升效率的项目",
    skillGroups: [
      {
        name: "工程底座",
        skills: ["前端开发", "JavaScript / TypeScript", "Vue / React", "Node.js", "工程化"],
      },
      {
        name: "AI 应用链路",
        skills: ["LLM 应用", "Prompt 工程", "API 集成", "本地模型部署"],
      },
      {
        name: "效率工具",
        skills: ["自动化脚本", "桌面工具", "工作流整合"],
      },
    ],
  },

  /* ---------- 时间轴(按时间顺序,从早到晚) ---------- */
  timeline: [
    { date: "2015",    title: "开始接触编程",       tags: ["兴趣起点"] },
    { date: "2019.09", title: "毕业并正式入职",     tags: ["应用开发", "团队协作"] },
    { date: "2019.09", title: "工作经历掌握的技能", tags: ["HTML / WEB / JavaScript / Python", "数据结构"] },
    { date: "2024.06", title: "开始探索 AI 辅助开发", tags: ["ChatGPT", "效率提升"] },
    { date: "2025.03", title: "第一个完整的个人项目", tags: ["从想法到落地"] },
    { date: "2026.06", title: "个人网站上线",       tags: ["思维整理", "Oᴗo"] },
  ],

  /* ---------- 联系 ---------- */
  contact: {
    heading: "期待与您的合作",
    text: "如果您想参与 项目开发|一次新的合作,可以直接通过邮箱联系我",
    github: "https://github.com/scottlc211",
    email: "ll12@932000.xyz",
  },

  /* ---------- 3D 房间装饰 ----------
   * posterImage: 墙上海报的图片路径(放到 assets/img/ 下,建议竖幅,如 3:4)。
   *              留空则显示内置手绘海报;图片加载失败也会自动回退。
   *              示例: posterImage: "assets/img/my-poster.jpg"
   */
  room: {
    posterImage: "assets/img/my-poster.jpg",
  },
};
