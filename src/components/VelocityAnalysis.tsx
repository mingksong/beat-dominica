import { DomPitch } from '../data/domBatterData';

const SZ_HALF = 0.7083;

function trimmedMean(values: number[], lo = 0.05, hi = 0.95): number | null {
  if (values.length < 5) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const start = Math.floor(sorted.length * lo);
  const end = Math.ceil(sorted.length * hi);
  const trimmed = sorted.slice(start, end);
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
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

interface VelocityBand {
  label: string;
  lo: number;
  hi: number;
  total: number;
  swings: number;
  whiffs: number;
  hits: number;
  inPlay: number;
  strikeouts: number;
  evValues: number[];
  laValues: number[];
}

function computeVelocityBands(pitches: DomPitch[]): VelocityBand[] {
  const bands: VelocityBand[] = [];
  for (let lo = 60; lo <= 103; lo += 3) {
    const hi = lo + 2;
    bands.push({
      label: `${lo}-${hi}`,
      lo, hi,
      total: 0, swings: 0, whiffs: 0, hits: 0, inPlay: 0, strikeouts: 0,
      evValues: [], laValues: [],
    });
  }

  for (const p of pitches) {
    const speed = Math.round(p.speed);
    const idx = Math.floor((speed - 60) / 3);
    if (idx < 0 || idx >= bands.length) continue;
    const band = bands[idx];
    band.total++;

    const result = classifyResult(p);
    if (result !== 'take') band.swings++;
    if (result === 'swing_miss') band.whiffs++;
    if (result === 'in_play_hit') band.hits++;
    if (result === 'in_play_hit' || result === 'in_play_out') band.inPlay++;

    // Count strikeouts (last pitch of a K at-bat)
    if (p.abResult === 'Strikeout' && (result === 'swing_miss' || p.callDesc.toLowerCase().includes('called strike'))) {
      band.strikeouts++;
    }

    if (p.launchSpeed != null) band.evValues.push(p.launchSpeed);
    if (p.launchAngle != null) band.laValues.push(p.launchAngle);
  }

  return bands.filter(b => b.total > 0);
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

interface ZoneQuality {
  evValues: number[];
  laValues: number[];
}

function computeZoneQuality(pitches: DomPitch[]): ZoneQuality[][] {
  const avgSzTop = pitches.reduce((s, p) => s + p.szTop, 0) / pitches.length;
  const avgSzBot = pitches.reduce((s, p) => s + p.szBot, 0) / pitches.length;
  const szHeight = avgSzTop - avgSzBot;
  const thirdH = szHeight / 3;
  const xThird = (SZ_HALF * 2) / 3;

  const grid: ZoneQuality[][] = Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => ({ evValues: [], laValues: [] }))
  );

  for (const p of pitches) {
    const result = classifyResult(p);
    if (result !== 'in_play_hit' && result !== 'in_play_out') continue;

    let row: number;
    if (p.pZ >= avgSzTop - thirdH) row = 0;
    else if (p.pZ >= avgSzBot + thirdH) row = 1;
    else row = 2;

    const px = p.pX * -1;
    let col: number;
    if (px <= -xThird) col = 0;
    else if (px <= xThird) col = 1;
    else col = 2;

    if (row < 0 || row > 2 || col < 0 || col > 2) continue;

    const zone = grid[row][col];
    if (p.launchSpeed != null) zone.evValues.push(p.launchSpeed);
    if (p.launchAngle != null) zone.laValues.push(p.launchAngle);
  }

  return grid;
}

function evColor(ev: number): string {
  // 파랑(약한타구 <85mph) → 빨강(강한타구 >100mph)
  const t = Math.max(0, Math.min(1, (ev - 85) / 15));
  const r = Math.round(59 + t * 196);
  const g = Math.round(130 - t * 85);
  const b = Math.round(246 - t * 178);
  return `rgb(${r}, ${g}, ${b})`;
}

function laColor(la: number): string {
  // 파랑(땅볼 <0°) → 초록(라인드라이브 10-25°) → 빨강(뜬공 >30°)
  if (la < 10) {
    const t = Math.max(0, Math.min(1, (la + 10) / 20));
    const r = Math.round(59 + t * (34 - 59));
    const g = Math.round(130 + t * (197 - 130));
    const b = Math.round(246 + t * (94 - 246));
    return `rgb(${r}, ${g}, ${b})`;
  }
  if (la <= 25) {
    return 'rgb(34, 197, 94)';
  }
  const t = Math.max(0, Math.min(1, (la - 25) / 15));
  const r = Math.round(34 + t * (239 - 34));
  const g = Math.round(197 - t * (197 - 68));
  const b = Math.round(94 - t * (94 - 68));
  return `rgb(${r}, ${g}, ${b})`;
}

export default function VelocityAnalysis({ pitches }: { pitches: DomPitch[] }) {
  if (pitches.length === 0) return null;

  const bands = computeVelocityBands(pitches);
  const maxTotal = Math.max(...bands.map(b => b.total), 1);
  const zoneGrid = computeZoneQuality(pitches);

  const rowLabels = ['HIGH', 'MID', 'LOW'];
  const colLabels = ['L', 'MID', 'R'];

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-300">
      <h3 className="text-sm font-semibold text-gray-800 mb-1">
        구속대별 타격 성적 분석
        <span className="text-gray-400 font-normal ml-2">(Velocity Band)</span>
      </h3>
      <p className="text-[10px] text-gray-400 mb-4">
        투수 구속대에 따른 타자 반응 분석 — BA는 볼넷/사사구 제외, EV/LA는 P5-P95 trimmed mean
      </p>

      {/* Velocity Band Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left text-gray-500 font-medium py-1.5 pr-2">속도대</th>
              <th className="text-right text-gray-500 font-medium py-1.5 px-1">투구수</th>
              <th className="text-right text-gray-500 font-medium py-1.5 px-1">
                <span title="Hits / (InPlay + Strikeouts)">BA</span>
              </th>
              <th className="text-right text-gray-500 font-medium py-1.5 px-1">
                <span title="Average Exit Velocity (P5-P95 trimmed)">Avg EV</span>
              </th>
              <th className="text-right text-gray-500 font-medium py-1.5 px-1">
                <span title="Average Launch Angle (P5-P95 trimmed)">Avg LA</span>
              </th>
              <th className="text-right text-gray-500 font-medium py-1.5 px-1">
                <span title="Swinging Strikes / Swings">Whiff%</span>
              </th>
              <th className="text-center text-gray-500 font-medium py-1.5 px-1 w-24">비중</th>
            </tr>
          </thead>
          <tbody>
            {bands.map(b => {
              const denominator = b.inPlay + b.strikeouts;
              const ba = denominator >= 5 ? (b.hits / denominator).toFixed(3) : '-';
              const baNum = denominator >= 5 ? b.hits / denominator : 0;
              const baColor = denominator < 5 ? '#9ca3af' : baNum >= 0.300 ? '#ef4444' : baNum <= 0.200 ? '#22c55e' : '#374151';

              const avgEv = trimmedMean(b.evValues);
              const avgLa = trimmedMean(b.laValues);

              const whiffPct = b.swings > 0 ? (b.whiffs / b.swings * 100) : 0;
              const whiffLabel = b.swings > 0 ? `${whiffPct.toFixed(0)}%` : '-';
              const whiffColor = b.swings < 5 ? '#9ca3af' : whiffPct >= 30 ? '#22c55e' : whiffPct <= 20 ? '#ef4444' : '#fbbf24';

              const usagePct = ((b.total / pitches.length) * 100).toFixed(0);
              const isSparse = b.total < 5;

              return (
                <tr key={b.label} className={`border-b border-gray-200 ${isSparse ? 'opacity-40' : 'hover:bg-gray-100'}`}>
                  <td className="py-2 pr-2">
                    <span className="text-gray-800 font-mono font-medium">{b.label}</span>
                  </td>
                  <td className="text-right text-gray-700 py-2 px-1">{b.total}</td>
                  <td className="text-right py-2 px-1">
                    <span className="font-bold" style={{ color: baColor }}>{ba}</span>
                  </td>
                  <td className="text-right text-gray-700 py-2 px-1">
                    {avgEv != null ? `${avgEv.toFixed(1)}` : '-'}
                  </td>
                  <td className="text-right text-gray-700 py-2 px-1">
                    {avgLa != null ? `${avgLa.toFixed(1)}°` : '-'}
                  </td>
                  <td className="text-right py-2 px-1">
                    <span className="font-bold" style={{ color: whiffColor }}>{whiffLabel}</span>
                  </td>
                  <td className="py-2 px-1">
                    <BarCell value={b.total} max={maxTotal} color="#60a5fa" label={`${usagePct}%`} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4 mt-3 pt-2 border-t border-gray-300/50 text-[10px] text-gray-400">
        <span>BA: <span className="text-red-400">.300+</span> 강한 구속대</span>
        <span>BA: <span className="text-green-400">.200이하</span> 약한 구속대</span>
        <span>Whiff%: <span className="text-green-400">30%+</span> 헛스윙 유도</span>
        <span className="text-gray-300">투구수 &lt;5 회색</span>
      </div>

      {/* Zone Quality Heatmaps */}
      <div className="mt-6 pt-4 border-t border-gray-300/50">
        <h4 className="text-xs font-semibold text-gray-700 mb-1">
          존별 타구 품질
          <span className="text-gray-400 font-normal ml-2">(투수 시점, In-play만)</span>
        </h4>
        <p className="text-[10px] text-gray-400 mb-4">
          각 존에서 타구의 평균 품질 (P5-P95 trimmed mean) — n &lt; 3이면 표시하지 않음
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Avg Exit Velo Heatmap */}
          <div>
            <h4 className="text-xs text-gray-500 font-medium mb-2 text-center">Avg Exit Velo (mph)</h4>
            <div className="flex justify-center">
              <div className="inline-block">
                <div className="flex">
                  <div className="w-14" />
                  {colLabels.map(l => (
                    <div key={l} className="w-[72px] text-center text-[10px] text-gray-400 font-medium pb-1">{l}</div>
                  ))}
                </div>
                {zoneGrid.map((row, ri) => (
                  <div key={ri} className="flex items-center">
                    <div className="w-14 text-right pr-2 text-[10px] text-gray-400 font-medium">{rowLabels[ri]}</div>
                    {row.map((zone, ci) => {
                      const ev = trimmedMean(zone.evValues);
                      const hasData = ev != null && zone.evValues.length >= 3;
                      const bg = hasData ? evColor(ev!) : '#f1f5f9';
                      return (
                        <div
                          key={ci}
                          className="w-[72px] h-16 flex flex-col items-center justify-center border border-gray-300 rounded"
                          style={{ backgroundColor: bg }}
                        >
                          <span className="text-sm font-bold text-gray-900">
                            {hasData ? ev!.toFixed(1) : '-'}
                          </span>
                          <span className="text-[9px] text-gray-700">
                            n={zone.evValues.length}
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
                <span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(59, 130, 246)' }} />
                약한 타구 (&lt;85)
              </span>
              <span className="text-[9px] text-gray-400 flex items-center gap-1">
                <span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(255, 45, 68)' }} />
                강한 타구 (&gt;100)
              </span>
            </div>
          </div>

          {/* Avg Launch Angle Heatmap */}
          <div>
            <h4 className="text-xs text-gray-500 font-medium mb-2 text-center">Avg Launch Angle (°)</h4>
            <div className="flex justify-center">
              <div className="inline-block">
                <div className="flex">
                  <div className="w-14" />
                  {colLabels.map(l => (
                    <div key={l} className="w-[72px] text-center text-[10px] text-gray-400 font-medium pb-1">{l}</div>
                  ))}
                </div>
                {zoneGrid.map((row, ri) => (
                  <div key={ri} className="flex items-center">
                    <div className="w-14 text-right pr-2 text-[10px] text-gray-400 font-medium">{rowLabels[ri]}</div>
                    {row.map((zone, ci) => {
                      const la = trimmedMean(zone.laValues);
                      const hasData = la != null && zone.laValues.length >= 3;
                      const bg = hasData ? laColor(la!) : '#f1f5f9';
                      return (
                        <div
                          key={ci}
                          className="w-[72px] h-16 flex flex-col items-center justify-center border border-gray-300 rounded"
                          style={{ backgroundColor: bg }}
                        >
                          <span className="text-sm font-bold text-gray-900">
                            {hasData ? `${la!.toFixed(1)}°` : '-'}
                          </span>
                          <span className="text-[9px] text-gray-700">
                            n={zone.laValues.length}
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
                <span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(59, 130, 246)' }} />
                땅볼 (&lt;0°)
              </span>
              <span className="text-[9px] text-gray-400 flex items-center gap-1">
                <span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(34, 197, 94)' }} />
                라인드라이브 (10-25°)
              </span>
              <span className="text-[9px] text-gray-400 flex items-center gap-1">
                <span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(239, 68, 68)' }} />
                뜬공 (&gt;30°)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
