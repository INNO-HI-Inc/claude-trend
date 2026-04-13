const STATE = {
  data: null,
  tab: "rising",
  query: "",
};

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

function nextMonday(from) {
  const d = new Date(from);
  const day = d.getDay(); // 0=Sun..6=Sat
  const add = day === 1 ? 7 : ((8 - day) % 7 || 7);
  d.setDate(d.getDate() + add);
  d.setHours(0, 0, 0, 0);
  return d;
}
function fmtDate(d) {
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
}

function updateMeta() {
  const d = STATE.data || {};
  const rising = d.rising || [];
  const classic = d.classic || [];
  const total = rising.length + classic.length;
  document.getElementById("inline-total").textContent = total;
  document.getElementById("inline-rising").textContent = rising.length;

  const weekLabel = document.getElementById("week-label");
  const nextLabel = document.getElementById("inline-next");

  if (d.generated_at) {
    const updated = new Date(d.generated_at);
    const now = new Date();
    const next = nextMonday(updated);
    const daysLeft = Math.max(0, Math.ceil((next - now) / (1000 * 60 * 60 * 24)));

    if (weekLabel) weekLabel.textContent = `${fmtDate(updated)} 업데이트`;
    if (nextLabel) {
      if (daysLeft === 0) nextLabel.textContent = "오늘 갱신 예정";
      else if (daysLeft === 1) nextLabel.textContent = "내일 갱신";
      else nextLabel.textContent = `다음 갱신 ${daysLeft}일 후 (${fmtDate(next)} 월요일)`;
    }
  }
}

function updateTabCounts() {
  const d = STATE.data || {};
  const r = document.getElementById("rising-count");
  const c = document.getElementById("classic-count");
  if (r) r.textContent = (d.rising || []).length;
  if (c) c.textContent = (d.classic || []).length;
}

function matches(item) {
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

const STICKER_FALLBACKS = ["s-mint", "s-lemon", "s-sky", "s-pink", "s-peach", "s-lilac"];
function stickerFor(item, idx) {
  const rank = idx + 1;
  const isRising = (item.badges || []).some(b => b.includes("Rising"));
  const isNew = (item.badges || []).some(b => b.includes("신상") || b.includes("7일"));
  const isKor = (item.badges || []).some(b => b.includes("한국어"));

  if (isNew) return { color: "s-mint", top: "NEW", bottom: "신상" };
  if (isRising && rank === 1) return { color: "s-coral", top: "#01", bottom: "TOP" };
  if (isRising && rank <= 3) return { color: "s-lemon", top: "#0" + rank, bottom: "급상승" };
  if (rank === 1) return { color: "s-lemon", top: "#01", bottom: "대세" };
  if (isKor) return { color: "s-sky", top: "KR", bottom: "한국어" };
  if (isRising) return { color: "s-pink", top: "HOT", bottom: "화제" };
  return { color: STICKER_FALLBACKS[idx % STICKER_FALLBACKS.length], top: "#" + String(rank).padStart(2,"0"), bottom: "PICK" };
}

function cardHTML(item, idx) {
  const safeId = escapeHTML(item.id || "");
  const avatar = item.thumbnail_url || `https://github.com/${(item.id || "").split("/")[0]}.png`;
  const rank = idx + 1;
  const rankStr = String(rank).padStart(2, "0");
  const isFeatured = idx === 0;
  const st = stickerFor(item, idx);

  const feats = (item.key_features || []).slice(0, 3).map(f =>
    `<li>${escapeHTML(f)}</li>`
  ).join("");
  return `
    <article class="card" data-id="${safeId}" tabindex="0" role="button" aria-label="${escapeHTML(item.title_ko || item.id)} 상세 보기">
      <div class="sticker ${st.color}">
        <strong>${escapeHTML(st.top)}</strong>
        ${escapeHTML(st.bottom)}
      </div>
      <div class="card-head">
        <img class="avatar" src="${escapeHTML(avatar)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"/>
        <div class="head-meta">
          <div class="category-label">${escapeHTML(item.category || "")}</div>
          <div class="repo-id">${formatRepoId(item.id)}</div>
        </div>
      </div>
      <h3>${escapeHTML(item.title_ko || item.id)}</h3>
      ${item.catchphrase ? `<p class="catch">${escapeHTML(item.catchphrase)}</p>` : ""}
      ${feats ? `<ul class="features">${feats}</ul>` : ""}
      <div class="card-foot">
        <span class="meta-left"><span class="stars-line">★ ${formatStars(item.stars)}</span></span>
        <a class="repo-link" href="${escapeHTML(item.official_url || "#")}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
          GITHUB <span class="arrow">→</span>
        </a>
      </div>
    </article>
  `;
}

function modalHTML(item, tab, rank) {
  const avatar = item.thumbnail_url || `https://github.com/${(item.id || "").split("/")[0]}.png`;
  const tags = (item.tags || []).map(t =>
    `<span class="m-tag">${escapeHTML(t)}</span>`
  ).join("");
  const feats = (item.key_features || []).map(f =>
    `<li>${escapeHTML(f)}</li>`
  ).join("");
  const badges = (item.badges || []).map(b => {
    let cls = "";
    if (b.includes("Rising")) cls = "b-rising";
    else if (b.includes("Classic")) cls = "b-classic";
    return `<span class="m-badge ${cls}">${escapeHTML(b)}</span>`;
  }).join("");
  const tabLabel = tab === "rising" ? "이번 주 뜨는" : "이미 유명한";
  const rankStr = String(rank).padStart(2, "0");

  return `
    <div class="m-rank">
      <span class="accent">${tabLabel}</span>
      <span class="dot-sep">·</span>
      <span>#${rankStr}</span>
    </div>
    <div class="m-head">
      <img class="m-avatar" src="${escapeHTML(avatar)}" alt="" onerror="this.style.visibility='hidden'"/>
      <div class="m-meta">
        <div class="m-category">${escapeHTML(item.category || "")}</div>
        <div class="m-repo">${formatRepoId(item.id)}</div>
      </div>
      <div class="m-stars">★ ${formatStars(item.stars)}</div>
    </div>
    <h2>${escapeHTML(item.title_ko || item.id)}</h2>
    ${item.catchphrase ? `<p class="m-catch">${escapeHTML(item.catchphrase)}</p>` : ""}
    ${badges ? `<div class="m-badges">${badges}</div>` : ""}
    ${item.summary_ko ? `<div class="m-section"><div class="m-label">어떤 프로젝트인가</div><p class="m-summary">${escapeHTML(item.summary_ko)}</p></div>` : ""}
    ${feats ? `<div class="m-section"><div class="m-label">핵심 기능</div><ul class="m-features">${feats}</ul></div>` : ""}
    ${item.use_case ? `<div class="m-section"><div class="m-label">이럴 때 쓰면 좋아요</div><div class="m-usecase">${escapeHTML(item.use_case)}</div></div>` : ""}
    ${item.install_hint ? `<div class="m-section"><div class="m-label">설치 · 시작하기</div><div class="m-install">${escapeHTML(item.install_hint)}</div></div>` : ""}
    ${tags ? `<div class="m-section"><div class="m-label">태그</div><div class="m-tags">${tags}</div></div>` : ""}
    <div class="m-cta-row">
      <a class="m-cta" href="${escapeHTML(item.official_url || "#")}" target="_blank" rel="noopener">
        GitHub에서 열기 →
      </a>
    </div>
  `;
}

function findItem(id) {
  const d = STATE.data || {};
  const rIdx = (d.rising || []).findIndex(x => x.id === id);
  if (rIdx >= 0) return { item: d.rising[rIdx], tab: "rising", rank: rIdx + 1 };
  const cIdx = (d.classic || []).findIndex(x => x.id === id);
  if (cIdx >= 0) return { item: d.classic[cIdx], tab: "classic", rank: cIdx + 1 };
  return null;
}

function openModal(id) {
  const hit = findItem(id);
  if (!hit) return;
  const modal = document.getElementById("modal");
  document.getElementById("modal-body").innerHTML = modalHTML(hit.item, hit.tab, hit.rank);
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
  const el = document.getElementById("grid");
  updateTabCounts();
  if (list.length === 0) {
    el.innerHTML = `<div class="empty">검색 결과 없음</div>`;
  } else {
    el.innerHTML = list.map((it, i) => cardHTML(it, i)).join("");
  }
}

document.getElementById("search").addEventListener("input", e => {
  STATE.query = e.target.value;
  render();
});
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    STATE.tab = btn.dataset.tab;
    render();
  });
});

document.getElementById("grid").addEventListener("click", e => {
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

const CRITERIA_HTML = `
  <h2 style="font-size:28px;margin-bottom:8px">순위는 어떻게 매겨지나요?</h2>
  <p class="m-catch">4가지 축의 가중 점수로 매주 다시 계산합니다.</p>

  <div class="m-section">
    <div class="m-label">최종 공식</div>
    <div class="m-install">score = 0.4×velocity + 0.3×buzz + 0.2×quality + 0.1×recency</div>
  </div>

  <div class="m-section">
    <div class="m-label">평가 4축</div>
    <ul class="m-features">
      <li><strong>Velocity (40%)</strong> — GitHub 7일 stars 증가 속도. 신상(30일 이내)이면 연령 보정 적용.</li>
      <li><strong>Community Buzz (30%)</strong> — HN, Reddit, dev.to, GeekNews, velog 언급의 가중 합. 다중 플랫폼 동시 언급 +15, 프론트페이지 도달 +10.</li>
      <li><strong>Quality (20%)</strong> — README 깊이, 라이선스, 최근 커밋, 테스트/예제, CI, 문서화.</li>
      <li><strong>Recency (10%)</strong> — 최근 커밋이 얼마나 따끈한지 (60일 이상 방치면 0점).</li>
    </ul>
  </div>

  <div class="m-section">
    <div class="m-label">Rising vs Classic 분기</div>
    <div class="m-usecase" style="background:var(--hl-mint);margin-bottom:10px">
      <strong>🔥 Rising</strong> · 다음 중 하나면 충족<br/>
      · 생성 30일 이내<br/>
      · velocity ≥ 60 + 최근 14일 커뮤니티 언급 3건+<br/>
      · HN/Reddit 프론트페이지 최근 7일 내 도달
    </div>
    <div class="m-usecase" style="background:var(--hl-lemon)">
      <strong>⭐ Classic</strong> · 모두 충족해야 함<br/>
      · stars ≥ 500<br/>
      · 생성 60일 경과<br/>
      · 최근 30일 내 커밋 존재<br/>
      <em style="font-size:13px;color:var(--muted)">둘 다 해당되면 Rising 우선 (신선도 가산)</em>
    </div>
  </div>

  <div class="m-section">
    <div class="m-label">편향 보정</div>
    <ul class="m-features">
      <li>한국어 README·블로그 가산점 <strong>+10 buzz</strong> (영어권 규모 차이 보정)</li>
      <li>Anthropic 공식·임직원 프로젝트는 'official' 태그만 부여, 점수는 동일</li>
    </ul>
  </div>

  <div class="m-section">
    <div class="m-label">선정 결과</div>
    <p class="m-summary">각 섹션 상위 12개 선별, 동점은 updated_at 최신순. 채점 미달 후보는 pending으로 다음 주 재검토.</p>
  </div>

  <a class="m-cta" href="https://github.com/INNO-HI-Inc/claude-trend" target="_blank" rel="noopener">소스 코드 보기 →</a>
`;

function openCriteria() {
  const modal = document.getElementById("modal");
  document.getElementById("modal-body").innerHTML = CRITERIA_HTML;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  modal.scrollTop = 0;
}
document.getElementById("open-criteria").addEventListener("click", openCriteria);

load();
