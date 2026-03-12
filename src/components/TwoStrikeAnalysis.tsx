import { useState } from 'react';
import { DomPitch } from '../data/domBatterData';
import { PITCH_COLORS, PITCH_NAMES_KR, getResultColor } from '../utils/pitchColors';

type HandFilter = 'ALL' | 'L' | 'R';

const SZ_HALF = 0.7083;
const SVG_W = 240;
const SVG_H = 280;
const MARGIN = { top: 15, right: 15, bottom: 25, left: 15 };
const PLOT_W = SVG_W - MARGIN.left - MARGIN.right;
const PLOT_H = SVG_H - MARGIN.top - MARGIN.bottom;
const X_MIN = -2.0;
const X_MAX = 2.0;
const Z_MIN = 0.5;
const Z_MAX = 4.5;

function toSvgX(pX: number): number {
  const displayX = pX * -1;
  return MARGIN.left + ((displayX - X_MIN) / (X_MAX - X_MIN)) * PLOT_W;
}

function toSvgY(pZ: number): number {
  return MARGIN.top + ((Z_MAX - pZ) / (Z_MAX - Z_MIN)) * PLOT_H;
}

function ZoneHeatmap({ pitches }: { pitches: DomPitch[] }) {
  const total = pitches.length;
  if (total === 0) return <div className="text-sm text-gray-400">데이터 없음</div>;

  const avgSzTop = pitches.reduce((s, p) => s + p.szTop, 0) / total;
  const avgSzBot = pitches.reduce((s, p) => s + p.szBot, 0) / total;
  const szHeight = avgSzTop - avgSzBot;
  const thirdH = szHeight / 3;
  const xThird = (SZ_HALF * 2) / 3;
  const grid = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => 0));

  for (const p of pitches) {
    let row: number;
    if (p.pZ >= avgSzTop - thirdH) row = 0;
    else if (p.pZ >= avgSzBot + thirdH) row = 1;
    else row = 2;

    const px = p.pX * -1;
    let col: number;
    if (px <= -xThird) col = 0;
    else if (px <= xThird) col = 1;
    else col = 2;

    if (row >= 0 && row < 3 && col >= 0 && col < 3) grid[row][col]++;
  }

  const maxCount = Math.max(...grid.flat(), 1);
  const rowLabels = ['HIGH', 'CENTER', 'LOW'];
  const colLabels = ['L', 'MID', 'R'];

  return (
    <div>
      <h4 className="text-xs text-gray-500 font-medium mb-2">코스 히트맵 (3x3)</h4>
      <div className="inline-block">
        <div className="flex">
          <div className="w-14" />
          {colLabels.map(label => (
            <div key={label} className="w-16 text-center text-[10px] text-gray-400 font-medium pb-1">
              {label}
            </div>
          ))}
        </div>
        {grid.map((row, ri) => (
          <div key={ri} className="flex items-center">
            <div className="w-14 text-right pr-2 text-[10px] text-gray-400 font-medium">
              {rowLabels[ri]}
            </div>
            {row.map((count, ci) => {
              const opacity = count > 0 ? 0.2 + (count / maxCount) * 0.8 : 0.05;
              const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
              return (
                <div
                  key={ci}
                  className="w-16 h-14 flex flex-col items-center justify-center border border-gray-300 rounded"
                  style={{ backgroundColor: `rgba(239, 68, 68, ${opacity})` }}
                >
                  <span className="text-base font-bold text-gray-900">{count}</span>
                  <span className="text-[9px] text-gray-700">{pct}%</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function PitchTypeDistribution({ pitches }: { pitches: DomPitch[] }) {
  const total = pitches.length;
  if (total === 0) return null;

  const typeCounts = new Map<string, number>();
  for (const p of pitches) {
    typeCounts.set(p.pitchCode, (typeCounts.get(p.pitchCode) ?? 0) + 1);
  }
  const sorted = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <h4 className="text-xs text-gray-500 font-medium mb-2">2S 이후 상대 구종</h4>
      <div className="space-y-1.5">
        {sorted.map(([code, count]) => {
          const pct = (count / total) * 100;
          return (
            <div key={code} className="flex items-center gap-2">
              <span className="text-xs text-gray-700 w-16">
                {PITCH_NAMES_KR[code] ?? code}
              </span>
              <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                <div
                  className="h-full rounded flex items-center pl-2"
                  style={{
                    width: `${Math.max(pct, 8)}%`,
                    backgroundColor: PITCH_COLORS[code] ?? '#6b7280',
                  }}
                >
                  <span className="text-[10px] font-bold text-gray-900 drop-shadow">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-gray-400 w-6 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PutawayResults({ pitches }: { pitches: DomPitch[] }) {
  const total = pitches.length;
  if (total === 0) return null;

  let strikeouts = 0;
  let inPlayOuts = 0;
  let hits = 0;

  const abResults = new Set<string>();
  for (const p of pitches) {
    const isTerminal = p.abResult.includes('Strikeout') || p.callDesc.includes('In play');
    if (!isTerminal) continue;

    const key = `${p.batter}-${p.abResult}-${p.pitcher}`;
    if (abResults.has(key)) continue;
    abResults.add(key);

    if (p.abResult.includes('Strikeout')) strikeouts++;
    else if (['Single', 'Double', 'Triple', 'Home Run'].includes(p.abResult)) hits++;
    else inPlayOuts++;
  }

  const abTotal = strikeouts + inPlayOuts + hits;
  if (abTotal === 0) return null;

  const stats = [
    { label: '삼진', count: strikeouts, color: '#ef4444' },
    { label: '인플레이 아웃', count: inPlayOuts, color: '#60a5fa' },
    { label: '안타', count: hits, color: '#22c55e' },
  ];

  return (
    <div>
      <h4 className="text-xs text-gray-500 font-medium mb-2">2S 이후 결과</h4>
      <div className="space-y-1">
        {stats.map(({ label, count, color }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-xs text-gray-700">{label}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color }}>{count}</span>
              <span className="text-[10px] text-gray-400">
                ({abTotal > 0 ? ((count / abTotal) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TwoStrikePitchMap({ pitches }: { pitches: DomPitch[] }) {
  const avgSzTop = pitches.length > 0
    ? pitches.reduce((s, p) => s + p.szTop, 0) / pitches.length : 3.5;
  const avgSzBot = pitches.length > 0
    ? pitches.reduce((s, p) => s + p.szBot, 0) / pitches.length : 1.5;

  const szLeft = toSvgX(SZ_HALF);
  const szRight = toSvgX(-SZ_HALF);
  const szTopY = toSvgY(avgSzTop);
  const szBotY = toSvgY(avgSzBot);

  return (
    <div className="flex flex-col items-center">
      <h4 className="text-xs text-gray-500 font-medium mb-1">2스트라이크 피치맵</h4>
      <svg width={SVG_W} height={SVG_H} className="rounded-lg">
        <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="#f8fafc" rx={8} />
        <rect
          x={szLeft} y={szTopY}
          width={szRight - szLeft} height={szBotY - szTopY}
          fill="none" stroke="#94a3b8" strokeWidth={2}
        />
        {[1, 2].map(i => (
          <g key={`grid-${i}`}>
            <line
              x1={szLeft + (szRight - szLeft) * i / 3} y1={szTopY}
              x2={szLeft + (szRight - szLeft) * i / 3} y2={szBotY}
              stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3,3"
            />
            <line
              x1={szLeft} y1={szTopY + (szBotY - szTopY) * i / 3}
              x2={szRight} y2={szTopY + (szBotY - szTopY) * i / 3}
              stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3,3"
            />
          </g>
        ))}
        {pitches.map((p, idx) => (
          <circle
            key={idx}
            cx={toSvgX(p.pX)} cy={toSvgY(p.pZ)} r={8}
            fill={PITCH_COLORS[p.pitchCode] ?? '#6b7280'}
            stroke={getResultColor(p.callDesc)}
            strokeWidth={2}
            opacity={0.9}
          />
        ))}
        <text x={SVG_W / 2} y={SVG_H - 8} textAnchor="middle" fill="#9ca3af" fontSize={10}>
          투수 시점 (Pitcher&apos;s View)
        </text>
      </svg>
      <span className="text-[10px] text-gray-400 mt-1">{pitches.length} pitches</span>
    </div>
  );
}

const HAND_TABS: { value: HandFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'L', label: 'vs 좌투' },
  { value: 'R', label: 'vs 우투' },
];

export default function TwoStrikeAnalysis({ pitches }: { pitches: DomPitch[] }) {
  const [handFilter, setHandFilter] = useState<HandFilter>('ALL');
  const twoStrikePitches = pitches.filter(p => p.strikes === 2);
  const filtered = handFilter === 'ALL'
    ? twoStrikePitches
    : twoStrikePitches.filter(p => p.pitcherHand === handFilter);

  if (twoStrikePitches.length === 0) {
    return (
      <div className="text-center text-gray-400 text-sm py-4">
        2스트라이크 데이터 없음
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-300">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-gray-800">
          2스트라이크 이후 분석
          <span className="text-gray-400 font-normal ml-2">
            ({filtered.length}구 / 전체 {pitches.length}구)
          </span>
        </h3>
        <div className="flex rounded-lg overflow-hidden border border-gray-300">
          {HAND_TABS.map(tab => {
            const count = tab.value === 'ALL'
              ? twoStrikePitches.length
              : twoStrikePitches.filter(p => p.pitcherHand === tab.value).length;
            const isActive = handFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setHandFilter(tab.value)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                }`}
              >
                {tab.label}
                <span className={`ml-1 text-[10px] ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-4">해당 조건의 데이터 없음</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex justify-center">
            <TwoStrikePitchMap pitches={filtered} />
          </div>
          <div className="space-y-5">
            <PitchTypeDistribution pitches={filtered} />
            <ZoneHeatmap pitches={filtered} />
            <PutawayResults pitches={filtered} />
          </div>
        </div>
      )}
    </div>
  );
}
