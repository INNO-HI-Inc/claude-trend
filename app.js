const STATE = {
  data: null,
  category: "all",
  query: "",
};

async function load() {
  try {
    const res = await fetch("public/data/latest.json", { cache: "no-store" });
    STATE.data = await res.json();
  } catch (e) {
    STATE.data = { generated_at: null, rising: [], classic: [] };
  }
  render();
}

function matches(item) {
  if (STATE.category !== "all" && item.category !== STATE.category) return false;
  if (!STATE.query) return true;
  const q = STATE.query.toLowerCase();
  const hay = [
    item.title_ko, item.catchphrase, item.summary_ko,
    item.id, (item.tags || []).join(" ")
  ].join(" ").toLowerCase();
  return hay.includes(q);
}

function cardHTML(item) {
  const badges = (item.badges || []).map(b => {
    const cls = b.includes("Rising") ? "rising" : b.includes("Classic") ? "classic" : "";
    return `<span class="badge ${cls}">${b}</span>`;
  }).join("");
  const feats = (item.key_features || []).map(f => `<li>${escapeHTML(f)}</li>`).join("");
  return `
    <article class="card">
      <div class="badges">${badges}</div>
      <h3>${escapeHTML(item.title_ko || item.id)}</h3>
      ${item.catchphrase ? `<p class="catch">${escapeHTML(item.catchphrase)}</p>` : ""}
      <p class="summary">${escapeHTML(item.summary_ko || "")}</p>
      ${feats ? `<ul class="features">${feats}</ul>` : ""}
      <div class="footer-row">
        <span>⭐ ${item.stars ?? "—"} · ${escapeHTML(item.category || "")}</span>
        <a class="repo-link" href="${item.official_url || "#"}" target="_blank" rel="noopener">열기 →</a>
      </div>
    </article>
  `;
}

function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}

function render() {
  const d = STATE.data || { rising: [], classic: [] };
  const upd = document.getElementById("updated-at");
  upd.textContent = d.generated_at ? `업데이트: ${new Date(d.generated_at).toLocaleString("ko-KR")}` : "데이터 없음 (첫 실행 대기 중)";

  for (const [key, id] of [["rising","rising-grid"],["classic","classic-grid"]]) {
    const grid = document.getElementById(id);
    const items = (d[key] || []).filter(matches);
    if (items.length === 0) {
      grid.innerHTML = `<div class="empty">아직 표시할 항목이 없습니다.</div>`;
    } else {
      grid.innerHTML = items.map(cardHTML).join("");
    }
  }
}

document.getElementById("search").addEventListener("input", e => {
  STATE.query = e.target.value;
  render();
});
document.querySelectorAll("#category-filter button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#category-filter button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    STATE.category = btn.dataset.cat;
    render();
  });
});

load();
