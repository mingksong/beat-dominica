import { DomPitch } from '../data/domBatterData';

const SZ_HALF = 0.7083;

interface ZoneStats {
  total: number;
  swings: number;
  whiffs: number;
  hits: number;
  inPlay: number;
}

function classifyResult(p: DomPitch): 'swing_miss' | 'foul' | 'in_play_hit' | 'in_play_out' | 'take' {
  const desc = p.callDesc.toLowerCase();
  if (desc.includes('swinging strike') || desc.includes('missed')) return 'swing_miss';
  if (desc.includes('foul')) return 'foul';
  if (desc.includes('in play')) {
    if (['Single', 'Double', 'Triple', 'Home Run'].includes(p.abResult)) return 'in_play_hit';
    return 'in_play_out';
  }
  return 'take';
}

export default function HotColdZone({ pitches }: { pitches: DomPitch[] }) {
  if (pitches.length === 0) return null;

  const avgSzTop = pitches.reduce((s, p) => s + p.szTop, 0) / pitches.length;
  const avgSzBot = pitches.reduce((s, p) => s + p.szBot, 0) / pitches.length;
  const szHeight = avgSzTop - avgSzBot;
  const thirdH = szHeight / 3;
  const xThird = (SZ_HALF * 2) / 3;

  // 3x3 grid stats
  const grid: ZoneStats[][] = Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => ({ total: 0, swings: 0, whiffs: 0, hits: 0, inPlay: 0 }))
  );

  for (const p of pitches) {
    let row: number;
    if (p.pZ >= avgSzTop - thirdH) row = 0;
    else if (p.pZ >= avgSzBot + thirdH) row = 1;
    else row = 2;

    const px = p.pX * -1; // pitcher's view
    let col: number;
    if (px <= -xThird) col = 0;
    else if (px <= xThird) col = 1;
    else col = 2;

    if (row < 0 || row > 2 || col < 0 || col > 2) continue;

    const zone = grid[row][col];
    zone.total++;

    const result = classifyResult(p);
    if (result !== 'take') zone.swings++;
    if (result === 'swing_miss') zone.whiffs++;
    if (result === 'in_play_hit') zone.hits++;
    if (result === 'in_play_hit' || result === 'in_play_out') zone.inPlay++;
  }

  const rowLabels = ['HIGH', 'MID', 'LOW'];
  const colLabels = ['L', 'MID', 'R'];

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-300">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">
        핫/콜드 존 분석
        <span className="text-gray-400 font-normal ml-2">(투수 시점)</span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Swing Rate Heatmap */}
        <div>
          <h4 className="text-xs text-gray-500 font-medium mb-2 text-center">스윙 확률</h4>
          <div className="flex justify-center">
            <div className="inline-block">
              <div className="flex">
                <div className="w-14" />
                {colLabels.map(l => (
                  <div key={l} className="w-[72px] text-center text-[10px] text-gray-400 font-medium pb-1">{l}</div>
                ))}
              </div>
              {grid.map((row, ri) => (
                <div key={ri} className="flex items-center">
                  <div className="w-14 text-right pr-2 text-[10px] text-gray-400 font-medium">{rowLabels[ri]}</div>
                  {row.map((zone, ci) => {
                    const swingRate = zone.total > 0 ? zone.swings / zone.total : 0;
                    const opacity = zone.total > 0 ? 0.15 + swingRate * 0.85 : 0.05;
                    return (
                      <div
                        key={ci}
                        className="w-[72px] h-16 flex flex-col items-center justify-center border border-gray-300 rounded"
                        style={{ backgroundColor: `rgba(251, 191, 36, ${opacity})` }}
                      >
                        <span className="text-sm font-bold text-gray-900">{(swingRate * 100).toFixed(0)}%</span>
                        <span className="text-[9px] text-gray-700">{zone.swings}/{zone.total}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Whiff Rate Heatmap (swings that miss) */}
        <div>
          <h4 className="text-xs text-gray-500 font-medium mb-2 text-center">헛스윙률 (Whiff%)</h4>
          <div className="flex justify-center">
            <div className="inline-block">
              <div className="flex">
                <div className="w-14" />
                {colLabels.map(l => (
                  <div key={l} className="w-[72px] text-center text-[10px] text-gray-400 font-medium pb-1">{l}</div>
                ))}
              </div>
              {grid.map((row, ri) => (
                <div key={ri} className="flex items-center">
                  <div className="w-14 text-right pr-2 text-[10px] text-gray-400 font-medium">{rowLabels[ri]}</div>
                  {row.map((zone, ci) => {
                    const whiffRate = zone.swings > 0 ? zone.whiffs / zone.swings : 0;
                    // Red = high whiff (good for pitcher), Blue = low whiff (bad for pitcher)
                    const r = Math.round(34 + whiffRate * 221);
                    const g = Math.round(197 - whiffRate * 152);
                    const b = Math.round(94 - whiffRate * 49);
                    const color = zone.swings >= 5 ? `rgb(${r}, ${g}, ${b})` : '#f1f5f9';
                    return (
                      <div
                        key={ci}
                        className="w-[72px] h-16 flex flex-col items-center justify-center border border-gray-300 rounded"
                        style={{ backgroundColor: color }}
                      >
                        <span className="text-sm font-bold text-gray-900">
                          {zone.swings >= 5 ? `${(whiffRate * 100).toFixed(0)}%` : '-'}
                        </span>
                        <span className="text-[9px] text-gray-700">
                          {zone.swings >= 5 ? `${zone.whiffs}/${zone.swings}` : `n=${zone.swings}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            <span className="text-[9px] text-gray-400 flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(34, 197, 94)' }} />
              낮음 (타자 유리)
            </span>
            <span className="text-[9px] text-gray-400 flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(255, 45, 45)' }} />
              높음 (투수 유리)
            </span>
          </div>
        </div>

        {/* Hit Rate Heatmap */}
        <div>
          <h4 className="text-xs text-gray-500 font-medium mb-2 text-center">안타 확률 (인플레이 중)</h4>
          <div className="flex justify-center">
            <div className="inline-block">
              <div className="flex">
                <div className="w-14" />
                {colLabels.map(l => (
                  <div key={l} className="w-[72px] text-center text-[10px] text-gray-400 font-medium pb-1">{l}</div>
                ))}
              </div>
              {grid.map((row, ri) => (
                <div key={ri} className="flex items-center">
                  <div className="w-14 text-right pr-2 text-[10px] text-gray-400 font-medium">{rowLabels[ri]}</div>
                  {row.map((zone, ci) => {
                    const hitRate = zone.inPlay > 0 ? zone.hits / zone.inPlay : 0;
                    // Blue = low hit rate (good for pitcher), Red = high hit rate (bad for pitcher)
                    const opacity = zone.inPlay >= 3 ? 0.2 + hitRate * 0.8 : 0.05;
                    const bgColor = zone.inPlay >= 3
                      ? `rgba(239, 68, 68, ${opacity})`
                      : 'rgba(30, 41, 59, 1)';
                    return (
                      <div
                        key={ci}
                        className="w-[72px] h-16 flex flex-col items-center justify-center border border-gray-300 rounded"
                        style={{ backgroundColor: bgColor }}
                      >
                        <span className="text-sm font-bold text-gray-900">
                          {zone.inPlay >= 3 ? `.${(hitRate * 1000).toFixed(0).padStart(3, '0')}` : '-'}
                        </span>
                        <span className="text-[9px] text-gray-700">
                          {zone.inPlay >= 3 ? `${zone.hits}/${zone.inPlay}` : `n=${zone.inPlay}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pitch Count Heatmap */}
        <div>
          <h4 className="text-xs text-gray-500 font-medium mb-2 text-center">피치 분포</h4>
          <div className="flex justify-center">
            <div className="inline-block">
              <div className="flex">
                <div className="w-14" />
                {colLabels.map(l => (
                  <div key={l} className="w-[72px] text-center text-[10px] text-gray-400 font-medium pb-1">{l}</div>
                ))}
              </div>
              {grid.map((row, ri) => {
                const maxTotal = Math.max(...grid.flat().map(z => z.total), 1);
                return (
                  <div key={ri} className="flex items-center">
                    <div className="w-14 text-right pr-2 text-[10px] text-gray-400 font-medium">{rowLabels[ri]}</div>
                    {row.map((zone, ci) => {
                      const opacity = zone.total > 0 ? 0.15 + (zone.total / maxTotal) * 0.85 : 0.05;
                      const pct = pitches.length > 0 ? ((zone.total / pitches.length) * 100).toFixed(0) : '0';
                      return (
                        <div
                          key={ci}
                          className="w-[72px] h-16 flex flex-col items-center justify-center border border-gray-300 rounded"
                          style={{ backgroundColor: `rgba(96, 165, 250, ${opacity})` }}
                        >
                          <span className="text-sm font-bold text-gray-900">{zone.total}</span>
                          <span className="text-[9px] text-gray-700">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
