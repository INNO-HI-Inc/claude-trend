const STATE = {
  data: null,
  tab: "rising",
  category: "all",
  query: "",
};

const BADGE_MAP = [
  { match: "Rising", cls: "t-rising" },
  { match: "Classic", cls: "t-classic" },
  { match: "한국어", cls: "t-kor" },
  { match: "신상", cls: "t-new" },
  { match: "7일", cls: "t-new" },
  { match: "MCP", cls: "t-mcp" },
  { match: "awesome", cls: "t-awesome" },
];

async function load() {
  try {
    const res = await fetch("public/data/latest.json", { cache: "no-store" });
    STATE.data = await res.json();
  } catch (e) {
    STATE.data = { generated_at: null, rising: [], classic: [] };
  }
  updateMeta();
  render();
}

function updateMeta() {
  const d = STATE.data || {};
  const rising = d.rising || [];
  const classic = d.classic || [];
  const all = [...rising, ...classic];
  const kr = all.filter(i => (i.badges || []).some(b => b.includes("한국어"))).length;
  const nw = all.filter(i => (i.badges || []).some(b => b.includes("신상") || b.includes("7일"))).length;

  const tb = document.getElementById("topbar-updated");
  if (d.generated_at) {
    const t = new Date(d.generated_at);
    const dateStr = `${t.getFullYear()}.${String(t.getMonth()+1).padStart(2,"0")}.${String(t.getDate()).padStart(2,"0")}`;
    tb.textContent = dateStr;
    const epoch = new Date("2026-01-05T00:00:00Z").getTime();
    const weeks = Math.max(1, Math.floor((t.getTime() - epoch) / (7 * 24 * 3600 * 1000)) + 1);
    document.getElementById("issue-no").textContent = String(weeks).padStart(2, "0");
  } else {
    tb.textContent = "—";
  }

  document.getElementById("rising-count").textContent = rising.length;
  document.getElementById("classic-count").textContent = classic.length;
  document.getElementById("stat-rising").textContent = rising.length;
  document.getElementById("stat-classic").textContent = classic.length;
  document.getElementById("stat-kr").textContent = kr;
  document.getElementById("stat-new").textContent = nw;
  document.getElementById("stat-total").textContent = all.length;
  document.getElementById("out-total").textContent = all.length;
  document.getElementById("out-rising").textContent = rising.length;
  document.getElementById("out-classic").textContent = classic.length;
}

function matches(item) {
  if (STATE.category !== "all" && item.category !== STATE.category) return false;
  if (!STATE.query) return true;
  const q = STATE.query.toLowerCase();
  const hay = [
    item.title_ko, item.catchphrase, item.summary_ko,
    item.id, (item.tags || []).join(" "),
    (item.key_features || []).join(" "),
  ].join(" ").toLowerCase();
  return hay.includes(q);
}

function formatStars(n) {
  if (!n && n !== 0) return "—";
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return String(n);
}

function badgeClass(text) {
  for (const { match, cls } of BADGE_MAP) if (text.includes(match)) return cls;
  return "";
}

function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}

function formatRepoId(id) {
  if (!id) return "";
  const [owner, ...rest] = id.split("/");
  const repo = rest.join("/");
  if (!repo) return escapeHTML(owner);
  return `<span class="owner">${escapeHTML(owner)}</span><span class="slash">/</span>${escapeHTML(repo)}`;
}

function rowHTML(item, idx) {
  const rank = item.rank || (idx + 1);
  const rankStr = String(rank).padStart(2, "0");
  const badges = (item.badges || []).slice(0, 3).map(b =>
    `<span class="tag ${badgeClass(b)}">${escapeHTML(b)}</span>`
  ).join("");
  const safeId = escapeHTML(item.id || "");
  const avatar = item.thumbnail_url || `https://github.com/${(item.id || "").split("/")[0]}.png`;
  return `
    <article class="row" data-id="${safeId}" tabindex="0" role="button" aria-label="${escapeHTML(item.title_ko || item.id)} 상세 보기">
      <div class="row-rank">${rankStr}</div>
      <img class="row-avatar" src="${escapeHTML(avatar)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"/>
      <div class="row-repo">
        <div class="id">${formatRepoId(item.id)}</div>
        <div class="title">${escapeHTML(item.title_ko || item.id)}</div>
      </div>
      <div class="row-catch">${escapeHTML(item.catchphrase || item.summary_ko || "")}</div>
      <div class="row-stars">${formatStars(item.stars)}<span class="unit">★</span></div>
      <div class="row-category">${escapeHTML(item.category || "")}</div>
      <div class="row-tags">${badges}</div>
      <div class="row-open">→</div>
    </article>
  `;
}

function modalHTML(item, idx) {
  const avatar = item.thumbnail_url || `https://github.com/${(item.id || "").split("/")[0]}.png`;
  const rank = item.rank || (idx + 1);
  const badges = (item.badges || []).map(b =>
    `<span class="tag ${badgeClass(b)}">${escapeHTML(b)}</span>`
  ).join("");
  const tags = (item.tags || []).map(t =>
    `<span class="m-tag">${escapeHTML(t)}</span>`
  ).join("");
  const feats = (item.key_features || []).map(f =>
    `<li>${escapeHTML(f)}</li>`
  ).join("");
  return `
    <div class="m-rank"># ${STATE.tab}/${String(rank).padStart(2,"0")}</div>
    <div class="m-head">
      <img class="m-avatar" src="${escapeHTML(avatar)}" alt="" onerror="this.style.visibility='hidden'"/>
      <div class="m-meta">
        <div class="m-category">${escapeHTML(item.category || "")}</div>
        <div class="m-repo">${formatRepoId(item.id)}</div>
      </div>
      <div class="m-stars">${formatStars(item.stars)}★</div>
    </div>
    <h2>${escapeHTML(item.title_ko || item.id)}</h2>
    ${item.catchphrase ? `<div class="m-catch">${escapeHTML(item.catchphrase)}</div>` : ""}
    ${badges ? `<div class="m-section"><div class="m-label">badges</div><div class="m-badges">${badges}</div></div>` : ""}
    ${item.summary_ko ? `<div class="m-section"><div class="m-label">description</div><p class="m-summary">${escapeHTML(item.summary_ko)}</p></div>` : ""}
    ${feats ? `<div class="m-section"><div class="m-label">features</div><ul class="m-features">${feats}</ul></div>` : ""}
    ${item.use_case ? `<div class="m-section"><div class="m-label">when_to_use</div><div class="m-usecase">${escapeHTML(item.use_case)}</div></div>` : ""}
    ${item.install_hint ? `<div class="m-section"><div class="m-label">install</div><div class="m-install">${escapeHTML(item.install_hint)}</div></div>` : ""}
    ${tags ? `<div class="m-section"><div class="m-label">tags</div><div class="m-tags">${tags}</div></div>` : ""}
    <a class="m-cta" href="${escapeHTML(item.official_url || "#")}" target="_blank" rel="noopener">
      open on github <span class="m-cta-arrow">↗</span>
    </a>
  `;
}

function findItem(id) {
  const d = STATE.data || {};
  const r = (d.rising || []).findIndex(x => x.id === id);
  if (r >= 0) return { item: d.rising[r], idx: r };
  const c = (d.classic || []).findIndex(x => x.id === id);
  if (c >= 0) return { item: d.classic[c], idx: c };
  return null;
}

function openModal(id) {
  const hit = findItem(id);
  if (!hit) return;
  const modal = document.getElementById("modal");
  document.getElementById("modal-body").innerHTML = modalHTML(hit.item, hit.idx);
  document.getElementById("modal-path").textContent = `~/cc-trends/${STATE.tab}/${hit.item.id}`;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  modal.scrollTop = 0;
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function render() {
  const d = STATE.data || {};
  const list = (d[STATE.tab] || []).filter(matches);
  const el = document.getElementById("list");
  if (list.length === 0) {
    el.innerHTML = `<div class="empty">no results — try a different query</div>`;
  } else {
    el.innerHTML = list.map((it, i) => rowHTML(it, i)).join("");
  }
}

document.getElementById("search").addEventListener("input", e => {
  STATE.query = e.target.value;
  render();
});
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    STATE.tab = btn.dataset.tab;
    render();
  });
});
document.querySelectorAll("#category-filter .chip").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#category-filter .chip").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    STATE.category = btn.dataset.cat;
    render();
  });
});

document.getElementById("list").addEventListener("click", e => {
  const row = e.target.closest(".row");
  if (row) openModal(row.dataset.id);
});
document.getElementById("list").addEventListener("keydown", e => {
  if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("row")) {
    e.preventDefault();
    openModal(e.target.dataset.id);
  }
});
document.getElementById("modal").addEventListener("click", e => {
  if (e.target.dataset.close !== undefined) closeModal();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
  // "/" focuses search
  if (e.key === "/" && document.activeElement.tagName !== "INPUT") {
    e.preventDefault();
    document.getElementById("search").focus();
  }
});

load();
