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

const BLOB_COLORS = ["h-green", "h-yellow", "h-blue", "h-pink", "h-orange", "h-lavender"];

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
    upd.textContent = "데이터 준비 중";
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

function highlightFor(item, idx) {
  const rank = item.rank || (idx + 1);
  const isRising = (item.badges || []).some(b => b.includes("Rising"));
  const isNew = (item.badges || []).some(b => b.includes("신상") || b.includes("7일"));
  const isKor = (item.badges || []).some(b => b.includes("한국어"));

  let color, label;
  if (isNew) {
    color = "h-green"; label = "신상";
  } else if (isRising && rank <= 3) {
    color = rank === 1 ? "h-yellow" : "h-orange"; label = "급상승";
  } else if (rank === 1) {
    color = "h-yellow"; label = "대세";
  } else if (isKor) {
    color = "h-blue"; label = "한국어";
  } else if (isRising) {
    color = "h-pink"; label = "화제";
  } else {
    color = BLOB_COLORS[idx % BLOB_COLORS.length]; label = "추천";
  }
  const rankStr = "#" + String(rank).padStart(2, "0");
  return { color, label, rankStr };
}

function cardHTML(item, idx) {
  const badges = (item.badges || []).slice(0, 2).map(b =>
    `<span class="badge ${badgeClass(b)}">${escapeHTML(b)}</span>`
  ).join("");
  const feats = (item.key_features || []).slice(0, 3).map(f =>
    `<li>${escapeHTML(f)}</li>`
  ).join("");
  const avatar = item.thumbnail_url || `https://github.com/${(item.id || "").split("/")[0]}.png`;
  const hl = highlightFor(item, idx);
  const safeId = escapeHTML(item.id || "");
  return `
    <article class="card" data-id="${safeId}" tabindex="0" role="button" aria-label="${escapeHTML(item.title_ko || item.id)} 상세 보기">
      <div class="highlight ${hl.color}">
        <span class="h-dot"></span>
        <span class="h-rank">${hl.rankStr}</span>
        <span class="h-sep">·</span>
        <span>${hl.label}</span>
      </div>
      <div class="card-head">
        <img class="avatar" src="${escapeHTML(avatar)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"/>
        <div class="head-meta">
          <div class="category-label">${escapeHTML(item.category || "")}</div>
          <div class="repo-id">${safeId}</div>
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
        <a class="repo-link" href="${escapeHTML(item.official_url || "#")}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
          GITHUB <span class="arrow">→</span>
        </a>
      </div>
      <div class="card-hint">클릭해서 자세히 보기</div>
    </article>
  `;
}

function modalHTML(item) {
  const avatar = item.thumbnail_url || `https://github.com/${(item.id || "").split("/")[0]}.png`;
  const badges = (item.badges || []).map(b =>
    `<span class="badge ${badgeClass(b)}">${escapeHTML(b)}</span>`
  ).join("");
  const tags = (item.tags || []).map(t =>
    `<span class="m-tag">${escapeHTML(t)}</span>`
  ).join("");
  const feats = (item.key_features || []).map(f =>
    `<li>${escapeHTML(f)}</li>`
  ).join("");
  return `
    <div class="m-head">
      <img class="m-avatar" src="${escapeHTML(avatar)}" alt="" onerror="this.style.visibility='hidden'"/>
      <div class="m-meta">
        <div class="m-category">${escapeHTML(item.category || "")}  ·  ★ ${formatStars(item.stars)}</div>
        <div class="m-repo">${escapeHTML(item.id || "")}</div>
      </div>
    </div>
    <h2>${escapeHTML(item.title_ko || item.id)}</h2>
    ${item.catchphrase ? `<p class="m-catch">${escapeHTML(item.catchphrase)}</p>` : ""}
    ${badges ? `<div class="m-section"><div class="m-badges">${badges}</div></div>` : ""}
    ${item.summary_ko ? `<div class="m-section"><div class="m-label">요약</div><p class="m-summary">${escapeHTML(item.summary_ko)}</p></div>` : ""}
    ${feats ? `<div class="m-section"><div class="m-label">핵심 기능</div><ul class="m-features">${feats}</ul></div>` : ""}
    ${item.use_case ? `<div class="m-section"><div class="m-label">이럴 때 쓰세요</div><div class="m-usecase">${escapeHTML(item.use_case)}</div></div>` : ""}
    ${item.install_hint ? `<div class="m-section"><div class="m-label">설치</div><div class="m-install">${escapeHTML(item.install_hint)}</div></div>` : ""}
    ${tags ? `<div class="m-section"><div class="m-label">태그</div><div class="m-tags">${tags}</div></div>` : ""}
    <a class="m-cta" href="${escapeHTML(item.official_url || "#")}" target="_blank" rel="noopener">
      GITHUB에서 열기 <span class="m-cta-arrow">→</span>
    </a>
  `;
}

function findItem(id) {
  const d = STATE.data || {};
  return (d.rising || []).find(x => x.id === id) || (d.classic || []).find(x => x.id === id);
}

function openModal(id) {
  const item = findItem(id);
  if (!item) return;
  const modal = document.getElementById("modal");
  document.getElementById("modal-body").innerHTML = modalHTML(item);
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  modal.querySelector(".modal-panel").scrollTop = 0;
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

document.getElementById("grid").addEventListener("click", e => {
  if (e.target.closest(".repo-link")) return;
  const card = e.target.closest(".card");
  if (card) openModal(card.dataset.id);
});
document.getElementById("grid").addEventListener("keydown", e => {
  if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("card")) {
    e.preventDefault();
    openModal(e.target.dataset.id);
  }
});
document.getElementById("modal").addEventListener("click", e => {
  if (e.target.dataset.close !== undefined) closeModal();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

load();
