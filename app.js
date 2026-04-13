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

const BLOB_COLORS = ["h-green", "h-yellow", "h-blue", "h-pink", "h-orange"];

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
    upd.innerHTML = `<strong>${t.getFullYear()}.${String(t.getMonth()+1).padStart(2,"0")}.${String(t.getDate()).padStart(2,"0")}</strong> 업데이트`;
  } else {
    upd.textContent = "데이터 없음";
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

/** Highlight blob content + color — derived from rank/badges to give visual variety */
function blobFor(item, idx) {
  const rank = item.rank || (idx + 1);
  const isRising = (item.badges || []).some(b => b.includes("Rising"));
  const isNew = (item.badges || []).some(b => b.includes("신상") || b.includes("7일"));
  const isKor = (item.badges || []).some(b => b.includes("한국어"));

  // Pick a content label + color
  let color, top, bottom;
  if (isNew) {
    color = "h-green"; top = "NEW"; bottom = "신상";
  } else if (rank === 1) {
    color = "h-yellow"; top = "#01"; bottom = isRising ? "화제" : "대세";
  } else if (rank === 2 || rank === 3) {
    color = "h-orange"; top = `#0${rank}`; bottom = isRising ? "급상승" : "필독";
  } else if (isKor) {
    color = "h-blue"; top = "KR"; bottom = "한국어";
  } else {
    color = BLOB_COLORS[idx % BLOB_COLORS.length];
    const cat = (item.category || "").toUpperCase();
    top = cat || "#" + String(rank).padStart(2, "0");
    bottom = isRising ? "급상승" : "대세";
  }
  return { color, top, bottom };
}

function cardHTML(item, idx) {
  const badges = (item.badges || []).map(b =>
    `<span class="badge ${badgeClass(b)}">${escapeHTML(b)}</span>`
  ).join("");
  const feats = (item.key_features || []).slice(0, 3).map(f =>
    `<li>${escapeHTML(f)}</li>`
  ).join("");
  const avatar = item.thumbnail_url || `https://github.com/${(item.id || "").split("/")[0]}.png`;
  const blob = blobFor(item, idx);
  return `
    <article class="card">
      <div class="highlight ${blob.color}">
        <strong>${escapeHTML(blob.top)}</strong>
        ${escapeHTML(blob.bottom)}
      </div>
      <div class="card-head">
        <img class="avatar" src="${escapeHTML(avatar)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"/>
        <div class="head-meta">
          <div class="category-label">${escapeHTML(item.category || "")}</div>
          <div class="repo-id">${escapeHTML(item.id || "")}</div>
        </div>
      </div>
      <h3>${escapeHTML(item.title_ko || item.id)}</h3>
      ${item.catchphrase ? `<p class="catch">${escapeHTML(item.catchphrase)}</p>` : ""}
      ${feats ? `<ul class="features">${feats}</ul>` : ""}
      <div class="card-foot">
        <div class="meta-left">
          <div class="stars-line">★ <strong>${formatStars(item.stars)}</strong> stars</div>
          ${badges ? `<div class="badges">${badges}</div>` : ""}
        </div>
        <a class="repo-link" href="${escapeHTML(item.official_url || "#")}" target="_blank" rel="noopener">
          GITHUB <span class="arrow">→</span>
        </a>
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
