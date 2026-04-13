<div align="center">

# 클렌드 <sub><sup>Clend</sup></sub>

**Claude Code 생태계, 이번 주 뭐가 뜨고 뭐가 자리잡았나.**

매주 월요일 자동 갱신되는 Claude Code 에이전트 · 스킬 · 하네스 · MCP 큐레이션 인덱스.

[🌐 **클렌드 둘러보기**](https://inno-hi-inc.github.io/claude-trend/) ·
[📡 RSS 구독](https://inno-hi-inc.github.io/claude-trend/feed.xml) ·
[⭐ Star](https://github.com/INNO-HI-Inc/claude-trend)

</div>

---

## 이게 뭔가요

Claude Code가 터진 이후로 에이전트·스킬·하네스가 매일 수십 개씩 올라옵니다. 매번 awesome-list 훑고 트위터 뒤지고 HN 보는 거 피곤하죠. 한 페이지에서 **이번 주 뜨는 거 + 이미 검증된 거**를 보고 싶어서 만들었습니다.

- **🔥 Rising** — 최근 30일 급상승 + 커뮤니티 회자되는 것
- **⭐ Classic** — 이미 자리잡은 필수 레퍼런스
- **매주 월요일 09:00 (KST)** — 자동으로 다시 계산, RSS/커밋 푸시까지

## 뭐가 다른가요

| | 일반 awesome-list | **클렌드** |
|---|---|---|
| 갱신 주기 | PR 받을 때마다 (비정기) | **매주 월요일 자동** |
| 수집 범위 | GitHub 링크만 | GitHub + HN + Reddit + dev.to + GeekNews + velog |
| 정렬 기준 | 시간순 또는 카테고리 | **4축 가중 점수** (velocity·buzz·quality·recency) |
| 한국어 | 보통 영문 | **한글 한 줄 요약 + 캐치프레이즈** 각 카드마다 |
| 편향 | 영어권 중심 | 한국어 커뮤니티 가산점으로 보정 |

## 어떻게 순위를 매기나요

```
score = 0.4 × velocity + 0.3 × buzz + 0.2 × quality + 0.1 × recency
```

| 축 | 무게 | 설명 |
|---|---|---|
| **Velocity** | 40% | 7일 stars 증가 속도 (신상은 연령 보정) |
| **Community Buzz** | 30% | HN·Reddit·dev.to·GeekNews·velog 언급 로그 가중합 |
| **Quality** | 20% | README, 라이선스, 최근 커밋, 테스트, CI, 문서 |
| **Recency** | 10% | 최근 커밋 신선도 (60일+ 방치면 0점) |

**Rising vs Classic 분기**
- Rising — 생성 30일 이내 OR velocity≥60 + 커뮤니티 3건+ OR HN/Reddit 프론트페이지
- Classic — stars 500+ AND 60일 경과 AND 30일 내 커밋

## 어떻게 동작하나요

```
[ 5명 에이전트 팀 ]
      │
      ├── github-scout     → GitHub 리포 수집 (stars, topics, velocity)
      ├── community-scout  → 영문+한국 커뮤니티 스캔
      ├── trend-analyzer   → 4축 점수 계산 · Rising/Classic 분류
      ├── content-curator  → 한글 요약 · 캐치프레이즈 · 핵심 기능
      └── site-builder     → JSON 갱신 · 아카이브 · 배포

[ launchd cron · 매주 월요일 09:00 KST ]
      │
      └── weekly.sh → Claude Code 파이프라인 → git push → Pages 재배포
```

모든 에이전트 정의는 [`.claude/agents/`](.claude/agents/)에, 오케스트레이션 스킬은 [`.claude/skills/cc-trends/`](.claude/skills/cc-trends/)에 있습니다.

## 기술 스택

- **사이트**: 정적 HTML + CSS + Vanilla JS — 빌드 없음
- **데이터**: JSON 단일 파일 (`public/data/latest.json`)
- **호스팅**: GitHub Pages (무료, HTTPS 자동)
- **자동화**: macOS launchd cron + Claude Code CLI (`claude -p`)
- **수집**: WebFetch, GitHub 검색, 커뮤니티 API
- **폰트**: A2G + Pretendard

## 직접 돌려보기

```bash
# 사이트 로컬 프리뷰
python3 -m http.server 8000 --directory site

# 주간 파이프라인 수동 실행
./scripts/weekly.sh

# RSS 재생성만
node scripts/generate-rss.js
```

launchd 스케줄 등록:
```bash
launchctl load ~/Library/LaunchAgents/com.flareon.cc-trends.weekly.plist
```

## 데이터 구조

`public/data/latest.json`
```json
{
  "generated_at": "2026-04-13T...",
  "rising":  [ { id, title_ko, catchphrase, summary_ko, key_features, use_case,
                  tags, stars, category, badges, trend_score, sources, evidence,
                  official_url, thumbnail_url, install_hint } ],
  "classic": [ ... ]
}
```

과거 주차 스냅샷은 `data/archive/YYYY-MM-DD.json`에 보존.

## 구독

- **🌐 웹**: https://inno-hi-inc.github.io/claude-trend/ — 매주 월요일 갱신
- **📡 RSS**: https://inno-hi-inc.github.io/claude-trend/feed.xml — Feedly · Inoreader · NetNewsWire 등에서 구독
- **⭐ Star**: 이 repo 별 누르면 업데이트 notification 받음

## 기여

- 좋은 리포가 누락됐다면 [Issue](https://github.com/INNO-HI-Inc/claude-trend/issues) 열어주세요
- 점수 공식 개선 아이디어, 새 수집 소스 제안 환영
- 한글 카피가 어색하다 싶으면 지적 대환영

## 라이선스

데이터는 CC-BY 4.0 · 코드는 MIT.

---

<div align="center">
Made weekly with Claude Code 🤖<br/>
<sub>If this saved you 30 minutes of scrolling awesome-lists, consider ⭐</sub>
</div>
