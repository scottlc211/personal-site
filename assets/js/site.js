/* ============================================================
   主页渲染逻辑:读取 window.SITE_DATA,生成各区块
   ============================================================ */
(function () {
  "use strict";

  const D = window.SITE_DATA;
  if (!D) return;

  const $ = (sel, root) => (root || document).querySelector(sel);

  // 位于 3D 屏幕 iframe 内时隐藏滚动条,视觉更像"屏幕"
  if (window.self !== window.top) document.documentElement.classList.add("in-frame");
  const el = (tag, cls, html) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  };
  const esc = (str) =>
    String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  /* ---------- 品牌与导航 ---------- */
  document.title = D.site.title;
  $("[data-brand-initial]").textContent = D.site.brandInitial;
  $("[data-brand-title]").textContent = D.site.brandTitle;
  $("[data-brand-kicker]").textContent = D.site.brandKicker;

  const nav = $("[data-nav]");
  D.nav.forEach((item) => {
    const a = el("a", null, esc(item.label));
    a.href = `#${item.id}`;
    a.dataset.navTarget = item.id;
    nav.appendChild(a);
  });

  const header = $("[data-header]");
  $("[data-nav-toggle]").addEventListener("click", () => header.classList.toggle("nav-open"));
  nav.addEventListener("click", () => header.classList.remove("nav-open"));

  const tagList = (tags, extraCls) =>
    `<ul class="tag-list${extraCls ? " " + extraCls : ""}" aria-label="标签">` +
    tags.map((t) => `<li>${esc(t)}</li>`).join("") +
    "</ul>";

  const main = $("#page-root");

  /* ---------- Hero ---------- */
  const hero = el("section", "hero");
  hero.id = "home";
  hero.innerHTML = `
    <div class="shell">
      <div class="hero-copy reveal">
        <h1 class="hero-title">${D.hero.lines.map((l) => `<span>${esc(l)}</span>`).join("")}</h1>
        <p class="hero-subtitle">${esc(D.hero.subtitle)}</p>
        <div class="hero-actions">
          <a class="button button-primary" href="#projects">查看个人项目 →</a>
          <a class="button button-secondary" href="#contact">联系我 →</a>
        </div>
      </div>
      <aside class="hero-card reveal" aria-label="个人摘要">
        <strong>${esc(D.hero.signature)}</strong>
        <small>portfolio</small>
      </aside>
      <div class="hero-rays" aria-hidden="true"></div>
    </div>`;
  main.appendChild(hero);

  /* ---------- 项目 ---------- */
  const pad2 = (n) => String(n + 1).padStart(2, "0");

  const projectCard = (p, i, compact) => {
    const media = compact
      ? ""
      : `<div class="project-card__media${p.image ? "" : " project-card__media--placeholder"}">
           ${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.title)} 项目截图">` : "screenshot"}
         </div>`;
    return `
      <button class="project-card${compact ? " project-card--compact" : ""} reveal" type="button"
              data-project="${i}" aria-label="查看 ${esc(p.title)} 详情">
        <span class="project-card__num" aria-hidden="true">${pad2(i)}</span>
        <span class="project-card__body">
          <h3 class="project-card__title">${esc(p.title)}</h3>
          <p class="project-card__desc">${esc(p.desc)}</p>
          ${tagList(p.tags)}
          <span class="project-card__link">打开项目详情</span>
        </span>
        ${media}
      </button>`;
  };

  const projects = el("section", "projects");
  projects.id = "projects";
  const featured = D.projects.items.slice(0, 2);
  const rest = D.projects.items.slice(2);
  let rows = featured.map((p, i) => `<div class="project-row">${projectCard(p, i, false)}</div>`).join("");
  for (let i = 0; i < rest.length; i += 2) {
    rows += `<div class="project-row project-row--split">${rest
      .slice(i, i + 2)
      .map((p, j) => projectCard(p, 2 + i + j, true))
      .join("")}</div>`;
  }
  projects.innerHTML = `
    <div class="shell">
      <h2 class="section-heading reveal">${esc(D.projects.heading)}</h2>
      <div class="project-list">${rows}</div>
    </div>`;
  main.appendChild(projects);

  /* ---------- 摄影 ---------- */
  const photoFigure = (p, i) => `
    <figure class="photo-figure reveal">
      <button type="button" aria-label="查看 ${esc(p.title)} 原图" data-photo="${i}">
        ${p.src
          ? `<img src="${esc(p.src)}" alt="${esc(p.title)}的摄影作品" loading="lazy">`
          : `<span class="photo-ph" style="background:linear-gradient(160deg, ${esc(p.tone)} 0%, ${esc(p.tone)}aa 55%, #3a3229 140%)"></span>`}
      </button>
      <figcaption class="photo-caption">
        <strong>${esc(p.title)}</strong>
        <span>${pad2(i)}</span>
      </figcaption>
    </figure>`;

  const photos = el("section", "photography");
  photos.id = "photography";
  const featurePhotos = D.photography.items.slice(0, 3);
  const restPhotos = D.photography.items.slice(3);
  let photoRows = `<div class="photo-row photo-row--feature">${featurePhotos
    .map((p, i) => photoFigure(p, i))
    .join("")}</div>`;
  for (let i = 0; i < restPhotos.length; i += 4) {
    photoRows += `<div class="photo-row photo-row--quad">${restPhotos
      .slice(i, i + 4)
      .map((p, j) => photoFigure(p, 3 + i + j))
      .join("")}</div>`;
  }
  photos.innerHTML = `
    <div class="shell">
      <p class="section-kicker reveal">${esc(D.photography.kicker)}</p>
      <h2 class="section-heading reveal">${esc(D.photography.heading)}</h2>
      <div class="photo-grid">${photoRows}</div>
    </div>`;
  main.appendChild(photos);

  /* ---------- 关于我 ---------- */
  const about = el("section", "about");
  about.id = "about";
  about.setAttribute("aria-label", "关于我");
  about.innerHTML = `
    <div class="shell">
      <p class="about-intro reveal">${esc(D.about.intro)}</p>
      <div class="skill-groups reveal" aria-label="技能点">
        ${D.about.skillGroups
          .map(
            (g) => `
          <section class="skill-group" aria-label="${esc(g.name)}">
            <h3 class="skill-group__name">${esc(g.name)}</h3>
            ${tagList(g.skills)}
          </section>`
          )
          .join("")}
      </div>
    </div>`;
  main.appendChild(about);

  /* ---------- 时间轴 ---------- */
  const timeline = el("section", "timeline");
  timeline.setAttribute("aria-label", "时间轴");
  timeline.innerHTML = `
    <div class="shell">
      <div class="timeline-track">
        ${D.timeline
          .map(
            (t) => `
          <article class="timeline-item reveal">
            <div class="timeline-item__date">${esc(t.date)}</div>
            <div class="timeline-item__card">
              <h3>${esc(t.title)}</h3>
              ${tagList(t.tags)}
            </div>
          </article>`
          )
          .join("")}
      </div>
    </div>`;
  main.appendChild(timeline);

  /* ---------- 联系 ---------- */
  const contact = el("section", "contact");
  contact.id = "contact";
  contact.innerHTML = `
    <div class="shell">
      <div class="reveal">
        <h2 class="contact-heading">${esc(D.contact.heading)}</h2>
        <p class="contact-text">${esc(D.contact.text)}</p>
      </div>
      <div class="contact-links reveal">
        <a class="button button-secondary" href="${esc(D.contact.github)}" target="_blank" rel="noreferrer noopener">
          访问 GitHub 主页 →
        </a>
        <a class="contact-email" href="mailto:${esc(D.contact.email)}">
          <strong>${esc(D.contact.email)}</strong>
        </a>
      </div>
    </div>`;
  main.appendChild(contact);

  /* ---------- 页脚 ---------- */
  $("[data-footer]").innerHTML =
    `© ${new Date().getFullYear()} ${esc(D.site.brandTitle)} · BUILT WITH THREE.JS`;

  /* ---------- 滚动淡入 ---------- */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  document.querySelectorAll(".reveal").forEach((node) => io.observe(node));

  /* ---------- 导航高亮 ---------- */
  const navLinks = [...nav.querySelectorAll("a")];
  const sections = D.nav
    .map((n) => document.getElementById(n.id))
    .filter(Boolean);
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) =>
          a.classList.toggle("is-active", a.dataset.navTarget === entry.target.id)
        );
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  sections.forEach((s) => spy.observe(s));

  /* ---------- 项目详情弹窗 ---------- */
  const modal = $("[data-modal]");
  const modalBody = $("[data-modal-body]");
  const openModal = (p) => {
    modalBody.innerHTML = `
      <h3>${esc(p.title)}</h3>
      <p class="project-card__desc">${esc(p.desc)}</p>
      ${tagList(p.tags)}
      ${(p.detail || "尚未填写详细介绍。")
        .split(/\n\n+/)
        .map((para) => `<p>${esc(para)}</p>`)
        .join("")}`;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  };
  const closeModal = () => {
    modal.hidden = true;
    document.body.style.overflow = "";
  };
  document.addEventListener("click", (e) => {
    const card = e.target.closest("[data-project]");
    if (card) openModal(D.projects.items[Number(card.dataset.project)]);
    if (e.target.closest("[data-modal-close]")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });
})();
