import { DomPitch, DomBatter } from '../data/domBatterData';
import { PITCH_NAMES_KR } from '../utils/pitchColors';

const SZ_HALF = 0.7083;

interface Insight {
  type: 'weakness' | 'strength' | 'strategy' | 'caution';
  title: string;
  detail: string;
}

function isInZone(p: DomPitch): boolean {
  return Math.abs(p.pX) <= SZ_HALF && p.pZ >= p.szBot && p.pZ <= p.szTop;
}

function isSwing(p: DomPitch): boolean {
  const d = p.callDesc.toLowerCase();
  return d.includes('swinging') || d.includes('foul') || d.includes('in play') || d.includes('missed');
}

function isWhiff(p: DomPitch): boolean {
  const d = p.callDesc.toLowerCase();
  return d.includes('swinging strike') || d.includes('missed');
}

function generateInsights(pitches: DomPitch[], batterInfo: DomBatter | null): Insight[] {
  const insights: Insight[] = [];
  if (pitches.length < 30) return insights;

  // 1. Pitch type weaknesses (high whiff rate)
  const typeStats = new Map<string, { swings: number; whiffs: number; total: number; hits: number; inPlay: number }>();
  for (const p of pitches) {
    if (!typeStats.has(p.pitchCode)) {
      typeStats.set(p.pitchCode, { swings: 0, whiffs: 0, total: 0, hits: 0, inPlay: 0 });
    }
    const s = typeStats.get(p.pitchCode)!;
    s.total++;
    if (isSwing(p)) s.swings++;
    if (isWhiff(p)) s.whiffs++;
    if (p.callDesc.toLowerCase().includes('in play')) {
      s.inPlay++;
      if (['Single', 'Double', 'Triple', 'Home Run'].includes(p.abResult)) s.hits++;
    }
  }

  for (const [code, s] of typeStats) {
    if (s.swings < 15) continue;
    const whiffRate = s.whiffs / s.swings;
    const name = PITCH_NAMES_KR[code] ?? code;
    if (whiffRate >= 0.35) {
      insights.push({
        type: 'weakness',
        title: `${name} 약점`,
        detail: `헛스윙률 ${(whiffRate * 100).toFixed(0)}% — 결정구로 적극 활용 가능`,
      });
    }
    if (s.inPlay >= 10 && s.hits / s.inPlay >= 0.350) {
      insights.push({
        type: 'caution',
        title: `${name} 강점 주의`,
        detail: `인플레이 안타율 .${(s.hits / s.inPlay * 1000).toFixed(0)} — 존 안에서 주의 필요`,
      });
    }
  }

  // 2. Chase tendency
  let outZone = 0, outSwings = 0;
  for (const p of pitches) {
    if (!isInZone(p)) {
      outZone++;
      if (isSwing(p)) outSwings++;
    }
  }
  const chasePct = outZone > 0 ? outSwings / outZone * 100 : 0;
  if (chasePct >= 32) {
    insights.push({
      type: 'strategy',
      title: '높은 체이스율',
      detail: `존 밖 스윙률 ${chasePct.toFixed(0)}% — 볼 배합으로 유인 가능`,
    });
  } else if (chasePct <= 22) {
    insights.push({
      type: 'caution',
      title: '매우 선구안 좋음',
      detail: `존 밖 스윙률 ${chasePct.toFixed(0)}% — 존 안에서 승부해야 함`,
    });
  }

  // 3. Zone analysis (high/low preference)
  const avgSzTop = pitches.reduce((s, p) => s + p.szTop, 0) / pitches.length;
  const avgSzBot = pitches.reduce((s, p) => s + p.szBot, 0) / pitches.length;
  const szMid = (avgSzTop + avgSzBot) / 2;

  let highHits = 0, highInPlay = 0, lowHits = 0, lowInPlay = 0;
  for (const p of pitches) {
    if (!p.callDesc.toLowerCase().includes('in play')) continue;
    const isHit = ['Single', 'Double', 'Triple', 'Home Run'].includes(p.abResult);
    if (p.pZ >= szMid) {
      highInPlay++;
      if (isHit) highHits++;
    } else {
      lowInPlay++;
      if (isHit) lowHits++;
    }
  }

  if (highInPlay >= 15 && lowInPlay >= 15) {
    const highBA = highHits / highInPlay;
    const lowBA = lowHits / lowInPlay;
    if (highBA > lowBA + 0.05) {
      insights.push({
        type: 'strategy',
        title: '높은 공 강점',
        detail: `상단 .${(highBA * 1000).toFixed(0)} vs 하단 .${(lowBA * 1000).toFixed(0)} — 낮은 공으로 공략`,
      });
    } else if (lowBA > highBA + 0.05) {
      insights.push({
        type: 'strategy',
        title: '낮은 공 강점',
        detail: `하단 .${(lowBA * 1000).toFixed(0)} vs 상단 .${(highBA * 1000).toFixed(0)} — 높은 공으로 공략`,
      });
    }
  }

  // 4. vs LHP / vs RHP split
  const vsLHP = pitches.filter(p => p.pitcherHand === 'L');
  const vsRHP = pitches.filter(p => p.pitcherHand === 'R');
  if (vsLHP.length >= 50 && vsRHP.length >= 50) {
    let lWhiffs = 0, lSwings = 0, rWhiffs = 0, rSwings = 0;
    for (const p of vsLHP) { if (isSwing(p)) { lSwings++; if (isWhiff(p)) lWhiffs++; } }
    for (const p of vsRHP) { if (isSwing(p)) { rSwings++; if (isWhiff(p)) rWhiffs++; } }
    const lWhiffPct = lSwings > 0 ? lWhiffs / lSwings * 100 : 0;
    const rWhiffPct = rSwings > 0 ? rWhiffs / rSwings * 100 : 0;
    if (Math.abs(lWhiffPct - rWhiffPct) >= 8) {
      const worse = lWhiffPct > rWhiffPct ? '좌투' : '우투';
      insights.push({
        type: 'strategy',
        title: `${worse}수 상대 약점`,
        detail: `좌투 Whiff ${lWhiffPct.toFixed(0)}% vs 우투 Whiff ${rWhiffPct.toFixed(0)}% — ${worse}수 매치업 유리`,
      });
    }
  }

  // 5. Two-strike approach
  const twoStrike = pitches.filter(p => p.strikes === 2);
  if (twoStrike.length >= 20) {
    let tsWhiffs = 0, tsSwings = 0;
    for (const p of twoStrike) {
      if (isSwing(p)) { tsSwings++; if (isWhiff(p)) tsWhiffs++; }
    }
    const tsWhiffPct = tsSwings > 0 ? tsWhiffs / tsSwings * 100 : 0;
    if (tsWhiffPct >= 35) {
      insights.push({
        type: 'weakness',
        title: '2스트라이크 약점',
        detail: `2S 이후 헛스윙률 ${tsWhiffPct.toFixed(0)}% — 카운트 유리 시 적극 결정구`,
      });
    }
  }

  // 6. Bat side info
  if (batterInfo?.batSide === 'S') {
    insights.push({
      type: 'strategy',
      title: '양타 (Switch Hitter)',
      detail: '좌우 투수 모두 상대 가능 — 플래툰 이점 없음, 구종/코스로 공략',
    });
  }

  return insights;
}

const ICON_MAP: Record<string, { emoji: string; bg: string; border: string }> = {
  weakness: { emoji: '🎯', bg: 'bg-green-950/30', border: 'border-green-800/50' },
  strength: { emoji: '💪', bg: 'bg-blue-950/30', border: 'border-blue-800/50' },
  strategy: { emoji: '📋', bg: 'bg-amber-950/30', border: 'border-amber-800/50' },
  caution: { emoji: '⚠️', bg: 'bg-red-950/30', border: 'border-red-800/50' },
};

export default function ScoutingInsights({ pitches, batterInfo }: {
  pitches: DomPitch[];
  batterInfo: DomBatter | null;
}) {
  const insights = generateInsights(pitches, batterInfo);

  if (insights.length === 0) return null;

  return (
    <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
      <h3 className="text-sm font-semibold text-slate-200 mb-3">
        🇰🇷 한국 투수를 위한 스카우팅 인사이트
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {insights.map((insight, idx) => {
          const style = ICON_MAP[insight.type];
          return (
            <div
              key={idx}
              className={`${style.bg} border ${style.border} rounded-lg p-3`}
            >
              <div className="flex items-start gap-2">
                <span className="text-sm mt-0.5">{style.emoji}</span>
                <div>
                  <div className="text-xs font-semibold text-slate-200">{insight.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{insight.detail}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
