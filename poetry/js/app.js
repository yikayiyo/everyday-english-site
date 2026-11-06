(function () {
  const bank = window.POETRY_BANK;
  if (!bank) {
    document.body.innerHTML = "<p style='padding:2rem'>题库未加载</p>";
    return;
  }
  const pages = bank.pages;
  const LEVEL = { basic: "基础", advanced: "进阶", hard: "拔高" };
  const KIND = {
    intro: "开篇",
    transition: "过渡",
    jiugong: "九宫格",
    duiju: "对句",
    tianzi: "填字",
    choice: "选择",
    picture: "图片",
    feihua: "飞花令",
    closing: "收尾",
  };

  let idx = 0;
  let revealed = false;
  let choicePicked = null;
  let picOpen = { title: false, author: false, verse: false };
  let feihuaOpen = false;

  const el = {
    progress: document.getElementById("progress"),
    stage: document.getElementById("stage"),
    chips: document.getElementById("chips"),
    prev: document.getElementById("btn-prev"),
    next: document.getElementById("btn-next"),
    jump: document.getElementById("btn-jump"),
    drawer: document.getElementById("drawer"),
    drawerBody: document.getElementById("drawer-body"),
  };

  function stars(level) {
    if (level === "basic") return "⭐";
    if (level === "advanced") return "⭐⭐";
    if (level === "hard") return "⭐⭐⭐";
    return "";
  }

  function resetRevealState() {
    revealed = false;
    choicePicked = null;
    picOpen = { title: false, author: false, verse: false };
    feihuaOpen = false;
  }

  function go(i) {
    idx = Math.max(0, Math.min(pages.length - 1, i));
    resetRevealState();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function firstOf(kind, level) {
    return pages.findIndex((p) => p.kind === kind && (!level || p.level === level));
  }

  function renderChips() {
    const items = [
      { label: "封面", i: 0 },
      { label: "九宫格", i: firstOf("jiugong") },
      { label: "对句", i: firstOf("duiju") },
      { label: "填字", i: firstOf("tianzi") },
      { label: "选择", i: firstOf("choice") },
      { label: "图片", i: firstOf("picture") },
      { label: "飞花令", i: firstOf("feihua") },
      { label: "收尾", i: firstOf("closing") },
    ];
    const cur = pages[idx];
    el.chips.innerHTML = items
      .map((it) => {
        const active =
          (it.label === "封面" && cur.kind === "intro") ||
          (it.label === "收尾" && cur.kind === "closing") ||
          cur.kind === 
            ({ 九宫格: "jiugong", 对句: "duiju", 填字: "tianzi", 选择: "choice", 图片: "picture", 飞花令: "feihua" }[
              it.label
            ] || "");
        return `<button class="chip${active ? " active" : ""}" data-i="${it.i}">${it.label}</button>`;
      })
      .join("");
  }

  function metaBadges(p) {
    const bits = [];
    bits.push(`<span class="badge">${KIND[p.kind] || p.kind}</span>`);
    if (p.level) bits.push(`<span class="badge stars">${stars(p.level)} ${LEVEL[p.level]}</span>`);
    if (p.n) bits.push(`<span class="badge">第 ${p.n} 题</span>`);
    return `<div class="meta-row">${bits.join("")}</div>`;
  }

  function renderIntro(p) {
    const pay = p.payload;
    if (p.id === "intro-1") {
      return `<div class="center-hero">
        <h1 class="page-title">${pay.heading}</h1>
        <p class="sub">${pay.sub}</p>
        <div class="seal">${pay.seal}</div>
      </div>`;
    }
    if (p.id === "intro-2") {
      return `${metaBadges(p)}<h1 class="page-title">${p.title}</h1>
        <ol class="list">${pay.rounds.map((r) => `<li>${r}</li>`).join("")}</ol>`;
    }
    if (p.id === "intro-3") {
      return `${metaBadges(p)}<h1 class="page-title">${p.title}</h1>
        <ul class="list">${pay.levels
          .map((l) => `<li>${"⭐".repeat(l.stars)} ${l.label}：${l.desc}</li>`)
          .join("")}</ul>`;
    }
    if (p.id === "intro-4") {
      return `${metaBadges(p)}<h1 class="page-title">${p.title}</h1>
        <ul class="list">${pay.rules.map((r) => `<li>${r}</li>`).join("")}</ul>`;
    }
    return "";
  }

  function renderTransition(p) {
    const pay = p.payload;
    return `<div class="center-hero">
      <h1 class="page-title">${pay.heading}</h1>
      <p class="note">${pay.note || ""}</p>
    </div>`;
  }

  function renderClosing(p) {
    const pay = p.payload;
    return `<div class="center-hero">
      <h1 class="page-title">${pay.heading}</h1>
      <p class="sub">${pay.hint || ""}</p>
    </div>`;
  }

  function renderJiugong(p) {
    const cells = p.chars.map((c) => `<div class="cell">${c}</div>`).join("");
    return `${metaBadges(p)}
      <h1 class="page-title">九宫格识别诗句</h1>
      <div class="grid9">${cells}</div>
      <button class="btn block" id="reveal">${p.revealLabel}</button>
      <div class="answer-box${revealed ? " show" : ""}" id="answer">${p.answer}</div>`;
  }

  function renderDuiju(p) {
    return `${metaBadges(p)}
      <h1 class="page-title">对出下句</h1>
      <p class="prompt-lg">${p.prompt}</p>
      <button class="btn block" id="reveal">${p.revealLabel}</button>
      <div class="answer-box${revealed ? " show" : ""}" id="answer">${p.answer}</div>`;
  }

  function renderTianzi(p) {
    const htmlPrompt = p.prompt.replace(/__/g, '<span class="blank">＿</span>');
    return `${metaBadges(p)}
      <h1 class="page-title">补全诗句</h1>
      <p class="prompt-lg">${htmlPrompt}</p>
      <button class="btn block" id="reveal">${p.revealLabel}</button>
      <div class="answer-box${revealed ? " show" : ""}" id="answer">应填：${p.answer}</div>`;
  }

  function renderChoice(p) {
    const keys = ["A", "B", "C", "D"];
    const opts = keys
      .map((k) => {
        let cls = "opt";
        if (revealed || choicePicked) {
          if (k === p.answer) cls += " correct";
          else if (choicePicked === k && k !== p.answer) cls += " wrong";
        }
        return `<button class="${cls}" data-opt="${k}"><strong>${k}.</strong> ${p.options[k]}</button>`;
      })
      .join("");
    return `${metaBadges(p)}
      <h1 class="page-title">选择题</h1>
      <p class="prompt-lg" style="font-size:1.15rem;text-align:left">${p.question}</p>
      <div class="options">${opts}</div>
      <button class="btn block" id="reveal">${p.revealLabel}</button>
      <div class="answer-box${revealed ? " show" : ""}" id="answer">正确答案：${p.answer}. ${p.options[p.answer]}</div>`;
  }

  function renderPicture(p) {
    const layer = (key, label, value) => {
      const open = picOpen[key] ? " open" : "";
      return `<div class="layer${open}" data-layer="${key}">
        <button type="button">▶ ${label}</button>
        <div class="revealed">${value}</div>
      </div>`;
    };
    return `${metaBadges(p)}
      <h1 class="page-title">图片题（意境占位）</h1>
      <div class="picture-layout">
        <div class="imagery-card">
          <div class="label">意境图占位</div>
          <div class="desc">${p.imagery}</div>
          <div class="hint">正式图可替换为插画；现先用文案占位</div>
        </div>
        <div class="layers">
          ${layer("title", "揭晓诗名（10分）", p.title)}
          ${layer("author", "揭晓作者朝代（10分）", p.author)}
          ${layer("verse", "揭晓诗句（10分）", p.verse)}
        </div>
      </div>`;
  }

  function renderFeihua(p) {
    return `${metaBadges(p)}
      <h1 class="page-title">飞花令</h1>
      <div class="theme-big">${p.theme}</div>
      <p class="sub" style="text-align:center">含「${p.theme}」的诗句 · 现场接龙</p>
      <button class="btn block" id="reveal">${feihuaOpen ? "收起参考诗句" : p.revealLabel}</button>
      <ul class="refs${feihuaOpen ? " show" : ""} list" id="answer">
        ${p.refs.map((r) => `<li>${r}</li>`).join("")}
      </ul>`;
  }

  function renderPage() {
    const p = pages[idx];
    switch (p.kind) {
      case "intro":
        return renderIntro(p);
      case "transition":
        return renderTransition(p);
      case "closing":
        return renderClosing(p);
      case "jiugong":
        return renderJiugong(p);
      case "duiju":
        return renderDuiju(p);
      case "tianzi":
        return renderTianzi(p);
      case "choice":
        return renderChoice(p);
      case "picture":
        return renderPicture(p);
      case "feihua":
        return renderFeihua(p);
      default:
        return `<p>未知题型 ${p.kind}</p>`;
    }
  }

  function bindStage() {
    const p = pages[idx];
    const revealBtn = document.getElementById("reveal");
    if (revealBtn) {
      revealBtn.addEventListener("click", () => {
        if (p.kind === "feihua") {
          feihuaOpen = !feihuaOpen;
          render();
          return;
        }
        revealed = true;
        if (p.kind === "choice" && !choicePicked) choicePicked = p.answer;
        render();
      });
    }
    el.stage.querySelectorAll("[data-opt]").forEach((btn) => {
      btn.addEventListener("click", () => {
        choicePicked = btn.getAttribute("data-opt");
        revealed = true;
        render();
      });
    });
    el.stage.querySelectorAll("[data-layer]").forEach((layer) => {
      layer.querySelector("button").addEventListener("click", () => {
        const key = layer.getAttribute("data-layer");
        picOpen[key] = !picOpen[key];
        render();
      });
    });
  }

  function render() {
    el.progress.textContent = `${idx + 1} / ${pages.length}`;
    el.stage.innerHTML = renderPage();
    el.prev.disabled = idx === 0;
    el.next.disabled = idx === pages.length - 1;
    renderChips();
    bindStage();
  }

  function buildDrawer() {
    const groups = [
      { title: "开篇", filter: (p) => p.kind === "intro" || (p.kind === "transition" && p.id === "intro-5") },
      { title: "九宫格", filter: (p) => p.kind === "jiugong" },
      { title: "对句", filter: (p) => p.kind === "duiju" },
      { title: "填字", filter: (p) => p.kind === "tianzi" },
      { title: "选择", filter: (p) => p.kind === "choice" },
      { title: "图片", filter: (p) => p.kind === "picture" },
      { title: "飞花令", filter: (p) => p.kind === "feihua" },
      { title: "收尾", filter: (p) => p.kind === "closing" },
    ];
    el.drawerBody.innerHTML = groups
      .map((g) => {
        const list = pages
          .map((p, i) => ({ p, i }))
          .filter(({ p }) => g.filter(p))
          .map(({ p, i }) => {
            const label =
              p.n != null
                ? `${p.n}${p.level ? "·" + LEVEL[p.level][0] : ""}`
                : p.title || p.id;
            return `<button data-i="${i}" class="${i === idx ? "here" : ""}">${label}</button>`;
          })
          .join("");
        return `<div class="jump-group"><h4>${g.title}</h4><div class="jump-list">${list}</div></div>`;
      })
      .join("");
  }

  el.prev.addEventListener("click", () => go(idx - 1));
  el.next.addEventListener("click", () => go(idx + 1));
  el.chips.addEventListener("click", (e) => {
    const t = e.target.closest("[data-i]");
    if (t) go(Number(t.getAttribute("data-i")));
  });
  el.jump.addEventListener("click", () => {
    buildDrawer();
    el.drawer.classList.add("open");
  });
  el.drawer.addEventListener("click", (e) => {
    if (e.target === el.drawer) el.drawer.classList.remove("open");
    const t = e.target.closest("[data-i]");
    if (t) {
      el.drawer.classList.remove("open");
      go(Number(t.getAttribute("data-i")));
    }
  });
  document.getElementById("drawer-close").addEventListener("click", () => el.drawer.classList.remove("open"));

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") go(idx + 1);
    if (e.key === "ArrowLeft") go(idx - 1);
  });

  // hash deep link #jiugong-03
  const hash = location.hash.replace(/^#/, "");
  if (hash) {
    const found = pages.findIndex((p) => p.id === hash);
    if (found >= 0) idx = found;
  }

  render();
  console.info("[poetry] counts", bank.meta.counts);
})();
