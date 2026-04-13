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

function updateMeta() { /* hero stats removed */ }

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
      ${sourcesLine(item)}
      <div class="card-foot">
        <span class="meta-left"><span class="stars-line">★ ${formatStars(item.stars)}</span></span>
        <a class="repo-link" href="${escapeHTML(item.official_url || "#")}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
          GITHUB <span class="arrow">→</span>
        </a>
      </div>
    </article>
  `;
}

const SOURCE_LABEL = {
  github: "GitHub", hn: "HN", reddit: "Reddit",
  devto: "dev.to", geeknews: "GeekNews", velog: "velog",
  twitter: "X", x: "X", anthropic: "Anthropic",
};
function sourcesLine(item) {
  const srcs = (item.sources || []).slice(0, 5);
  const score = item.trend_score;
  if (!srcs.length && score == null) return "";
  const chips = srcs.map(s => `<span class="src-chip">${escapeHTML(SOURCE_LABEL[s] || s)}</span>`).join("");
  const scoreEl = (score != null) ? `<span class="src-score" title="검증 점수">검증 ${score}</span>` : "";
  return `<div class="src-line">${chips}${scoreEl}</div>`;
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
    ${modalSourcesSection(item)}
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

function modalSourcesSection(item) {
  const srcs = (item.sources || []);
  const evi = (item.evidence || []);
  const score = item.trend_score;
  if (!srcs.length && !evi.length && score == null) return "";

  let html = `<div class="m-section"><div class="m-label">출처 · 검증</div>`;
  if (score != null) {
    html += `<div class="m-score-box">검증 점수 <strong>${score}</strong> / 100<span class="m-score-formula">velocity · buzz · quality · recency 종합</span></div>`;
  }
  if (srcs.length) {
    const chips = srcs.map(s => `<span class="src-chip">${escapeHTML(SOURCE_LABEL[s] || s)}</span>`).join("");
    html += `<div class="m-src-row"><span class="m-src-label">수집 출처</span><div class="m-src-chips">${chips}</div></div>`;
  }
  if (evi.length) {
    html += `<ul class="m-evidence">`;
    for (const e of evi) {
      const label = escapeHTML(e.label || e.source || "");
      const src = escapeHTML(SOURCE_LABEL[e.source] || e.source || "");
      const url = e.url || "";
      html += `<li><span class="src-chip">${src}</span> ${url ? `<a href="${escapeHTML(url)}" target="_blank" rel="noopener">${label} ↗</a>` : label}</li>`;
    }
    html += `</ul>`;
  }
  html += `</div>`;
  return html;
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
  <div class="cr-eyebrow">CC-TRENDS · SCORING</div>
  <h2 class="cr-title">순위는 어떻게 매겨지나요?</h2>
  <p class="cr-lede">매주 4가지 축의 가중 점수로 다시 계산합니다.</p>

  <div class="cr-formula">
    <div class="cr-formula-line">
      <span class="cr-token">score</span>
      <span class="cr-eq">=</span>
      <span class="cr-weight w-velocity"><b>0.4</b>·velocity</span>
      <span class="cr-plus">+</span>
      <span class="cr-weight w-buzz"><b>0.3</b>·buzz</span>
      <span class="cr-plus">+</span>
      <span class="cr-weight w-quality"><b>0.2</b>·quality</span>
      <span class="cr-plus">+</span>
      <span class="cr-weight w-recency"><b>0.1</b>·recency</span>
    </div>
    <div class="cr-bar">
      <span class="cr-bar-seg w-velocity" style="flex:40"><span>40%</span></span>
      <span class="cr-bar-seg w-buzz" style="flex:30"><span>30%</span></span>
      <span class="cr-bar-seg w-quality" style="flex:20"><span>20%</span></span>
      <span class="cr-bar-seg w-recency" style="flex:10"><span>10%</span></span>
    </div>
  </div>

  <div class="cr-section">
    <div class="cr-section-label">평가 4축</div>
    <div class="cr-axes">
      <div class="cr-axis">
        <div class="cr-axis-head">
          <span class="cr-axis-dot w-velocity"></span>
          <span class="cr-axis-name">Velocity</span>
          <span class="cr-axis-pct">40%</span>
        </div>
        <p class="cr-axis-desc">GitHub 7일 stars 증가 속도. 신상(30일 이내)은 연령 보정 적용.</p>
      </div>
      <div class="cr-axis">
        <div class="cr-axis-head">
          <span class="cr-axis-dot w-buzz"></span>
          <span class="cr-axis-name">Community Buzz</span>
          <span class="cr-axis-pct">30%</span>
        </div>
        <p class="cr-axis-desc">HN · Reddit · dev.to · GeekNews · velog 언급의 가중 합. 다중 플랫폼 동시 언급 +15, 프론트 도달 +10.</p>
      </div>
      <div class="cr-axis">
        <div class="cr-axis-head">
          <span class="cr-axis-dot w-quality"></span>
          <span class="cr-axis-name">Quality</span>
          <span class="cr-axis-pct">20%</span>
        </div>
        <p class="cr-axis-desc">README 깊이, 라이선스, 최근 커밋, 테스트/예제, CI, 문서화 점수.</p>
      </div>
      <div class="cr-axis">
        <div class="cr-axis-head">
          <span class="cr-axis-dot w-recency"></span>
          <span class="cr-axis-name">Recency</span>
          <span class="cr-axis-pct">10%</span>
        </div>
        <p class="cr-axis-desc">최근 커밋이 얼마나 따끈한지. 60일 이상 방치면 0점.</p>
      </div>
    </div>
  </div>

  <div class="cr-section">
    <div class="cr-section-label">Rising vs Classic</div>
    <div class="cr-versus">
      <div class="cr-vs-card cr-rising">
        <div class="cr-vs-head"><span class="cr-vs-icon">🔥</span><strong>Rising</strong> · 이번 주 뜨는</div>
        <div class="cr-vs-rule">하나라도 충족하면 OK</div>
        <ul>
          <li>생성 30일 이내</li>
          <li>velocity ≥ 60 + 최근 14일 커뮤니티 언급 3건+</li>
          <li>HN/Reddit 프론트페이지 최근 7일 내 도달</li>
        </ul>
      </div>
      <div class="cr-vs-card cr-classic">
        <div class="cr-vs-head"><span class="cr-vs-icon">⭐</span><strong>Classic</strong> · 이미 유명한</div>
        <div class="cr-vs-rule">전부 충족해야 OK</div>
        <ul>
          <li>stars ≥ 500</li>
          <li>생성 60일 경과</li>
          <li>최근 30일 내 커밋 존재</li>
        </ul>
      </div>
    </div>
    <p class="cr-note">둘 다 해당되면 <strong>Rising 우선</strong> (신선도 가산)</p>
  </div>

  <div class="cr-section">
    <div class="cr-section-label">편향 보정</div>
    <div class="cr-bias">
      <div class="cr-bias-row">
        <span class="cr-bias-tag">+10</span>
        <span>한국어 README·블로그 발견 시 buzz 가산 — 영어권 규모 차이 보정</span>
      </div>
      <div class="cr-bias-row">
        <span class="cr-bias-tag">official</span>
        <span>Anthropic 공식·임직원 프로젝트는 태그만 부여, 점수는 동일</span>
      </div>
    </div>
  </div>

  <p class="cr-foot">각 섹션 상위 12개 선별 · 동점은 최근 업데이트순 · 채점 미달은 다음 주 재검토</p>

  <a class="m-cta" href="https://github.com/INNO-HI-Inc/claude-trend" target="_blank" rel="noopener">
    소스 코드 보기 →
  </a>
`;

function openCriteria() {
  const modal = document.getElementById("modal");
  document.getElementById("modal-body").innerHTML = CRITERIA_HTML;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  modal.scrollTop = 0;
}
document.getElementById("open-criteria-top")?.addEventListener("click", openCriteria);

load();
