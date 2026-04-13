const STATE = {
  data: null,
  tab: "rising",
  category: "all",
  query: "",
};

const BADGE_MAP = [
  { match: "Rising", cls: "b-rising" },
  { match: "Classic", cls: "b-classic" },
  { match: "한국어", cls: "b-korean" },
  { match: "신상", cls: "b-new" },
  { match: "7일", cls: "b-new" },
  { match: "MCP", cls: "b-mcp" },
  { match: "awesome", cls: "b-awesome" },
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
  const upd = document.getElementById("updated-at");
  if (d.generated_at) {
    const t = new Date(d.generated_at);
    upd.textContent = `📅 ${t.getFullYear()}.${String(t.getMonth()+1).padStart(2,"0")}.${String(t.getDate()).padStart(2,"0")} 업데이트`;
  } else {
    upd.textContent = "📅 데이터 없음";
  }
  const rising = d.rising || [];
  const classic = d.classic || [];
  document.getElementById("rising-count").textContent = rising.length;
  document.getElementById("classic-count").textContent = classic.length;
  document.getElementById("total-count").textContent = rising.length + classic.length;
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

function cardHTML(item, idx) {
  const badges = (item.badges || []).map(b =>
    `<span class="badge ${badgeClass(b)}">${escapeHTML(b)}</span>`
  ).join("");
  const feats = (item.key_features || []).slice(0, 3).map(f =>
    `<li>${escapeHTML(f)}</li>`
  ).join("");
  const tags = (item.tags || []).slice(0, 4).map(t =>
    `<span class="tag">${escapeHTML(t)}</span>`
  ).join("");
  const avatar = item.thumbnail_url || `https://github.com/${(item.id || "").split("/")[0]}.png`;
  const rankStr = String(item.rank || (idx + 1)).padStart(2, "0");
  return `
    <article class="card">
      <div class="card-rank">RANK<strong>${rankStr}</strong></div>
      <div class="card-head">
        <img class="avatar" src="${escapeHTML(avatar)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"/>
        <div class="head-meta">
          <div class="repo-id">${escapeHTML(item.id || "")}</div>
          <div class="stars-row">
            <span class="stars">★ ${formatStars(item.stars)}</span>
            <span class="category-label">${escapeHTML(item.category || "")}</span>
          </div>
        </div>
      </div>
      ${badges ? `<div class="badges">${badges}</div>` : ""}
      <h3>${escapeHTML(item.title_ko || item.id)}</h3>
      ${item.catchphrase ? `<p class="catch">${escapeHTML(item.catchphrase)}</p>` : ""}
      ${item.summary_ko ? `<p class="summary">${escapeHTML(item.summary_ko)}</p>` : ""}
      ${feats ? `<div class="features-wrap"><div class="label">핵심 기능</div><ul class="features">${feats}</ul></div>` : ""}
      ${item.use_case ? `<div class="use-case">${escapeHTML(item.use_case)}</div>` : ""}
      ${item.install_hint ? `<div class="install">${escapeHTML(item.install_hint)}</div>` : ""}
      <div class="card-foot">
        <div class="tags">${tags}</div>
        <a class="repo-link" href="${escapeHTML(item.official_url || "#")}" target="_blank" rel="noopener">GitHub →</a>
      </div>
    </article>
  `;
}

function render() {
  const d = STATE.data || {};
  const list = (d[STATE.tab] || []).filter(matches);
  const grid = document.getElementById("grid");
  if (list.length === 0) {
    grid.innerHTML = `<div class="empty"><span class="empty-icon">🔍</span>일치하는 항목이 없습니다.</div>`;
  } else {
    grid.innerHTML = list.map((it, i) => cardHTML(it, i)).join("");
  }
}

document.getElementById("search").addEventListener("input", e => {
  STATE.query = e.target.value;
  render();
});
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
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

load();
