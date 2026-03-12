# WBC 2026 Team Dominicana Report

WBC 2026 한국 vs 도미니카 전을 위한 타자 스카우팅 리포트. MLB Statcast 데이터 기반으로 도미니카 15명 타자의 약점과 공략법을 분석합니다.

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS (Light theme, print-friendly)
- MLB Statcast via pybaseball

## 분석 항목

| 컴포넌트 | 설명 |
|---------|------|
| **ScoutingInsights** | 투수를 위한 핵심 공략 포인트 (약점/강점/전략/주의) |
| **PitchLocationChart** | 피치 로케이션 맵 (전체/초구/2S, 투수 시점) |
| **SprayChart** | 타구 분포도 (안타/2루타/3루타/HR/아웃, 투수손/타구유형 필터) |
| **PitchLegend** | 상대 구종 분포 + 평균 구속 |
| **HotColdZone** | 3x3 존별 스윙률/헛스윙률/안타확률/피치분포 히트맵 |
| **PitchTypePerformance** | 구종별 Whiff%/Chase%/BABIP/안타 테이블 |
| **PlateDiscipline** | O-Swing%/Z-Contact%/K%/BB% 등 타석 규율 |
| **TwoStrikeAnalysis** | 2스트라이크 이후 피치맵/구종분포/결과 |

## 대상 타자 (15명)

Juan Soto, Vladimir Guerrero Jr., Fernando Tatis Jr., Julio Rodriguez, Manny Machado, Ketel Marte, Oneil Cruz, Geraldo Perdomo, Jeremy Pena, Austin Wells, Agustin Ramirez, Carlos Santana, Amed Rosario, Junior Caminero, Johan Rojas

## 실행

```bash
# 의존성 설치
npm install

# 데이터 Fetch (최초 1회, ~5분 소요)
pip install pybaseball pandas
python3 scripts/fetch_dom_batters.py

# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build
npm run preview
```

## 데이터

- **소스**: MLB Statcast (Baseball Savant) 2024 시즌
- **총 투구**: ~30,000구
- **타구 좌표**: ~5,600개 (hcX/hcY)
- **시점**: 투수 시점 (Pitcher's Perspective) - 좌우 반전 적용

## 프로젝트 구조

```
src/
  App.tsx                  # 메인 레이아웃 + 타자 선택
  data/domBatterData.ts    # 생성된 Statcast 데이터
  components/
    BatterSelector.tsx     # 타자 선택 버튼
    ScoutingInsights.tsx   # AI 스카우팅 인사이트
    PitchLocationChart.tsx # 피치 로케이션 (3패널)
    SprayChart.tsx         # 타구 분포 (SVG 야구장)
    PitchLegend.tsx        # 구종 범례
    HotColdZone.tsx        # 3x3 히트맵 (4종)
    PitchTypePerformance.tsx # 구종별 성적 테이블
    PlateDiscipline.tsx    # 타석 규율 지표
    TwoStrikeAnalysis.tsx  # 2S 이후 분석
  utils/pitchColors.ts     # 구종 색상/결과 색상
scripts/
  fetch_dom_batters.py     # Statcast 데이터 수집
```
