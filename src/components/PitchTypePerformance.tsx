import { DomPitch } from '../data/domBatterData';
import { PITCH_COLORS, PITCH_NAMES_KR } from '../utils/pitchColors';

interface PitchTypeStats {
  code: string;
  total: number;
  swings: number;
  whiffs: number;
  fouls: number;
  inPlay: number;
  hits: number;
  xbh: number; // extra base hits
  calledStrikes: number;
  balls: number;
  avgSpeed: number;
}

function computeStats(pitches: DomPitch[]): PitchTypeStats[] {
  const map = new Map<string, PitchTypeStats>();

  for (const p of pitches) {
    if (!map.has(p.pitchCode)) {
      map.set(p.pitchCode, {
        code: p.pitchCode, total: 0, swings: 0, whiffs: 0, fouls: 0,
        inPlay: 0, hits: 0, xbh: 0, calledStrikes: 0, balls: 0, avgSpeed: 0,
      });
    }
    const s = map.get(p.pitchCode)!;
    s.total++;
    s.avgSpeed += p.speed;

    const desc = p.callDesc.toLowerCase();
    if (desc.includes('swinging strike') || desc.includes('missed')) {
      s.swings++;
      s.whiffs++;
    } else if (desc.includes('foul')) {
      s.swings++;
      s.fouls++;
    } else if (desc.includes('in play')) {
      s.swings++;
      s.inPlay++;
      if (['Single', 'Double', 'Triple', 'Home Run'].includes(p.abResult)) {
        s.hits++;
        if (['Double', 'Triple', 'Home Run'].includes(p.abResult)) s.xbh++;
      }
    } else if (desc.includes('called strike')) {
      s.calledStrikes++;
    } else {
      s.balls++;
    }
  }

  const result: PitchTypeStats[] = [];
  for (const s of map.values()) {
    s.avgSpeed = s.total > 0 ? s.avgSpeed / s.total : 0;
    result.push(s);
  }
  return result.sort((a, b) => b.total - a.total);
}

function BarCell({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const width = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-1">
      <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
        <div
          className="h-full rounded"
          style={{ width: `${Math.max(width, 2)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-gray-500 w-10 text-right">{label}</span>
    </div>
  );
}

export default function PitchTypePerformance({ pitches }: { pitches: DomPitch[] }) {
  if (pitches.length === 0) return null;

  const stats = computeStats(pitches);
  const maxTotal = Math.max(...stats.map(s => s.total), 1);

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-300">
      <h3 className="text-sm font-semibold text-gray-800 mb-1">
        구종별 성적 분석
      </h3>
      <p className="text-[10px] text-gray-400 mb-4">
        타자가 각 구종에 어떻게 대응하는지 분석 (투수 공략 포인트)
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left text-gray-500 font-medium py-1.5 pr-2">구종</th>
              <th className="text-right text-gray-500 font-medium py-1.5 px-1">투구수</th>
              <th className="text-right text-gray-500 font-medium py-1.5 px-1">평균구속</th>
              <th className="text-right text-gray-500 font-medium py-1.5 px-1">
                <span title="Swinging Strike / Swings">Whiff%</span>
              </th>
              <th className="text-right text-gray-500 font-medium py-1.5 px-1">
                <span title="Swings outside zone / Pitches outside zone">Chase%</span>
              </th>
              <th className="text-right text-gray-500 font-medium py-1.5 px-1">
                <span title="Hits / Balls in Play">BABIP</span>
              </th>
              <th className="text-right text-gray-500 font-medium py-1.5 px-1">안타</th>
              <th className="text-center text-gray-500 font-medium py-1.5 px-1 w-24">비중</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(s => {
              const whiffPct = s.swings > 0 ? (s.whiffs / s.swings * 100).toFixed(0) : '-';
              const babip = s.inPlay > 0 ? (s.hits / s.inPlay).toFixed(3) : '-';
              const avgSpeedKmh = (s.avgSpeed * 1.60934).toFixed(0);

              // Chase rate: balls that were swung at
              // Approximate: if callDesc is ball but there was a swing, it's a chase
              // For simplicity, use whiff rate as proxy for pitch effectiveness

              const usagePct = ((s.total / pitches.length) * 100).toFixed(0);
              const pitchColor = PITCH_COLORS[s.code] ?? '#6b7280';

              // Whiff color coding
              const whiffNum = s.swings > 0 ? s.whiffs / s.swings * 100 : 0;
              const whiffColor = whiffNum >= 30 ? '#22c55e' : whiffNum >= 20 ? '#fbbf24' : '#ef4444';

              return (
                <tr key={s.code} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: pitchColor }} />
                      <span className="text-gray-800 font-medium">{PITCH_NAMES_KR[s.code] ?? s.code}</span>
                    </div>
                  </td>
                  <td className="text-right text-gray-700 py-2 px-1">{s.total}</td>
                  <td className="text-right text-gray-700 py-2 px-1">{avgSpeedKmh}</td>
                  <td className="text-right py-2 px-1">
                    <span className="font-bold" style={{ color: whiffColor }}>
                      {whiffPct}{whiffPct !== '-' ? '%' : ''}
                    </span>
                  </td>
                  <td className="text-right text-gray-700 py-2 px-1">
                    {s.total > 0 ? `${((s.swings / s.total) * 100).toFixed(0)}%` : '-'}
                  </td>
                  <td className="text-right py-2 px-1">
                    <span className={s.inPlay > 0 && s.hits / s.inPlay > 0.300 ? 'text-red-400 font-bold' : 'text-gray-700'}>
                      {babip}
                    </span>
                  </td>
                  <td className="text-right text-gray-700 py-2 px-1">
                    {s.hits > 0 ? (
                      <span>
                        {s.hits}
                        {s.xbh > 0 && <span className="text-amber-400 ml-0.5">({s.xbh}xbh)</span>}
                      </span>
                    ) : '0'}
                  </td>
                  <td className="py-2 px-1">
                    <BarCell value={s.total} max={maxTotal} color={pitchColor} label={`${usagePct}%`} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4 mt-3 pt-2 border-t border-gray-300/50 text-[10px] text-gray-400">
        <span>Whiff%: <span className="text-green-400">30%+</span> = 약점 구종</span>
        <span>BABIP <span className="text-red-400">.300+</span> = 강점 구종</span>
        <span>Chase%: 스윙 비율 (존 내외 포함)</span>
      </div>
    </div>
  );
}
