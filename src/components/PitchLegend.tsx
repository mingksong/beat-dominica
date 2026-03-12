import { DomPitch } from '../data/domBatterData';
import { PITCH_COLORS, PITCH_NAMES_KR, RESULT_COLORS } from '../utils/pitchColors';

interface PitchLegendProps {
  pitches: DomPitch[];
}

export default function PitchLegend({ pitches }: PitchLegendProps) {
  const typeCounts = new Map<string, number>();
  for (const p of pitches) {
    typeCounts.set(p.pitchCode, (typeCounts.get(p.pitchCode) ?? 0) + 1);
  }
  const sorted = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]);
  const total = pitches.length;

  const typeSpeeds = new Map<string, number[]>();
  for (const p of pitches) {
    if (p.speed > 0) {
      if (!typeSpeeds.has(p.pitchCode)) typeSpeeds.set(p.pitchCode, []);
      typeSpeeds.get(p.pitchCode)!.push(p.speed);
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-lg p-4">
      <div className="mb-3">
        <h4 className="text-xs text-slate-400 font-medium mb-2">상대한 구종 분포</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {sorted.map(([code, count]) => {
            const pct = ((count / total) * 100).toFixed(0);
            const speeds = typeSpeeds.get(code) ?? [];
            const avgSpeed = speeds.length > 0
              ? (speeds.reduce((a, b) => a + b, 0) / speeds.length * 1.60934).toFixed(1)
              : '-';
            return (
              <div key={code} className="flex items-center gap-2 bg-slate-900/50 rounded px-2 py-1.5">
                <div
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PITCH_COLORS[code] ?? '#6b7280' }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-200">
                    {PITCH_NAMES_KR[code] ?? code} <span className="text-slate-400">{pct}%</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {count}구 | avg {avgSpeed}km/h
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-center pt-2 border-t border-slate-700/50">
        <span className="text-[10px] text-slate-500 mr-1">결과:</span>
        {[
          { color: RESULT_COLORS.ball, label: '볼' },
          { color: RESULT_COLORS.calledStrike, label: '콜 스트라이크' },
          { color: RESULT_COLORS.swing, label: '스윙/파울' },
          { color: RESULT_COLORS.inPlay, label: '인플레이' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full border-2"
              style={{ borderColor: color }}
            />
            <span className="text-[10px] text-slate-400">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
