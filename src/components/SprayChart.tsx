import { useState } from 'react';
import { DomPitch } from '../data/domBatterData';

type PitcherHandFilter = 'all' | 'L' | 'R';
type BbTypeFilter = 'all' | 'fly_ball' | 'line_drive' | 'ground_ball';

const BB_TYPE_LABELS: Record<BbTypeFilter, string> = {
  all: '전체',
  fly_ball: '뜬공',
  line_drive: '라인드라이브',
  ground_ball: '땅볼',
};

const PITCHER_HAND_LABELS: Record<PitcherHandFilter, string> = {
  all: '전체',
  L: 'vs 좌투',
  R: 'vs 우투',
};

function getDotColor(abResult: string): string {
  if (abResult === 'Single') return '#3b82f6';
  if (abResult === 'Double') return '#f59e0b';
  if (abResult === 'Triple') return '#8b5cf6';
  if (abResult === 'Home Run') return '#ef4444';
  return '#9ca3af';
}

function toSvgCoords(hcX: number, hcY: number): { x: number; y: number } {
  const xFeet = 2.5 * (hcX - 125.42);
  const yFeet = 2.5 * (198.27 - hcY);

  const svgX = 150 + (xFeet / 180) * 140;
  const svgY = 280 - (yFeet / 400) * 250;

  return { x: svgX, y: svgY };
}

function BaseballField() {
  // Home plate at (150, 280), center field at (150, 30)
  // Base positions (90ft spacing, scaled)
  const scale = 250 / 400;
  const baseDist = 90 * scale; // ~56.25 SVG units

  const home = { x: 150, y: 280 };
  const first = { x: home.x + baseDist, y: home.y - baseDist };
  const second = { x: home.x, y: home.y - baseDist * 2 };
  const third = { x: home.x - baseDist, y: home.y - baseDist };

  // Outfield fence arc: ~330ft left/right, ~400ft center
  const ofScale = 250 / 400;
  const lfX = 150 + (-330 * ofScale) * (140 / 180);
  const lfY = 280 - 330 * ofScale;
  const rfX = 150 + (330 * ofScale) * (140 / 180);
  const rfY = lfY;
  const cfX = 150;
  const cfY = 280 - 400 * ofScale;

  // Infield arc radius (roughly 95ft from home)
  const infieldR = 95 * scale;

  return (
    <g>
      {/* Field background */}
      <circle cx="150" cy="280" r="270" fill="#e8f5e9" opacity="0.3" />

      {/* Outfield grass */}
      <path
        d={`M ${home.x} ${home.y} L ${lfX} ${lfY} Q ${cfX} ${cfY - 10} ${rfX} ${rfY} Z`}
        fill="#d1fae5"
        opacity="0.5"
      />

      {/* Outfield fence arc */}
      <path
        d={`M ${lfX} ${lfY} Q ${cfX} ${cfY - 10} ${rfX} ${rfY}`}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="2"
      />

      {/* Foul lines to outfield */}
      <line x1={home.x} y1={home.y} x2={lfX} y2={lfY} stroke="#cbd5e1" strokeWidth="1.5" />
      <line x1={home.x} y1={home.y} x2={rfX} y2={rfY} stroke="#cbd5e1" strokeWidth="1.5" />

      {/* Infield dirt */}
      <path
        d={`M ${home.x} ${home.y} L ${first.x} ${first.y} L ${second.x} ${second.y} L ${third.x} ${third.y} Z`}
        fill="#fef3c7"
        opacity="0.4"
      />

      {/* Infield arc */}
      <path
        d={`M ${third.x} ${third.y} A ${infieldR} ${infieldR} 0 0 1 ${first.x} ${first.y}`}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="1"
        strokeDasharray="4,2"
      />

      {/* Base paths */}
      <line x1={home.x} y1={home.y} x2={first.x} y2={first.y} stroke="#94a3b8" strokeWidth="1.5" />
      <line x1={first.x} y1={first.y} x2={second.x} y2={second.y} stroke="#94a3b8" strokeWidth="1.5" />
      <line x1={second.x} y1={second.y} x2={third.x} y2={third.y} stroke="#94a3b8" strokeWidth="1.5" />
      <line x1={third.x} y1={third.y} x2={home.x} y2={home.y} stroke="#94a3b8" strokeWidth="1.5" />

      {/* Bases */}
      <rect x={first.x - 4} y={first.y - 4} width="8" height="8" fill="white" stroke="#94a3b8" strokeWidth="1" />
      <rect x={second.x - 4} y={second.y - 4} width="8" height="8" fill="white" stroke="#94a3b8" strokeWidth="1" />
      <rect x={third.x - 4} y={third.y - 4} width="8" height="8" fill="white" stroke="#94a3b8" strokeWidth="1" />

      {/* Home plate */}
      <polygon
        points={`${home.x},${home.y - 6} ${home.x + 5},${home.y - 3} ${home.x + 5},${home.y + 3} ${home.x - 5},${home.y + 3} ${home.x - 5},${home.y - 3}`}
        fill="white"
        stroke="#94a3b8"
        strokeWidth="1"
      />

      {/* Pitching mound */}
      <circle cx="150" cy={home.y - baseDist} r="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
    </g>
  );
}

export default function SprayChart({ pitches }: { pitches: DomPitch[] }) {
  const [pitcherHand, setPitcherHand] = useState<PitcherHandFilter>('all');
  const [bbType, setBbType] = useState<BbTypeFilter>('all');

  const battedBalls = pitches.filter(
    (p) => p.hcX !== null && p.hcY !== null && p.callDesc.includes('In play')
  );

  const filtered = battedBalls.filter((p) => {
    if (pitcherHand !== 'all' && p.pitcherHand !== pitcherHand) return false;
    if (bbType !== 'all' && p.bbType !== bbType) return false;
    return true;
  });

  const hitCount = filtered.filter((p) =>
    ['Single', 'Double', 'Triple', 'Home Run'].includes(p.abResult)
  ).length;

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-300">
      <h3 className="text-base font-bold text-gray-800 mb-3">타구 분포 (Spray Chart)</h3>

      {/* Pitcher hand filter */}
      <div className="flex gap-1 mb-2">
        {(Object.keys(PITCHER_HAND_LABELS) as PitcherHandFilter[]).map((key) => (
          <button
            key={key}
            onClick={() => setPitcherHand(key)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              pitcherHand === key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-200 border-gray-300 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {PITCHER_HAND_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Batted ball type filter */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {(Object.keys(BB_TYPE_LABELS) as BbTypeFilter[]).map((key) => (
          <button
            key={key}
            onClick={() => setBbType(key)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              bbType === key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-200 border-gray-300 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {BB_TYPE_LABELS[key]}
          </button>
        ))}
      </div>

      {/* SVG Field */}
      <div className="flex justify-center">
        <svg
          viewBox="0 0 300 300"
          width="300"
          height="300"
          style={{ background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}
        >
          <BaseballField />
          {filtered.map((p, i) => {
            const { x, y } = toSvgCoords(p.hcX!, p.hcY!);
            const color = getDotColor(p.abResult);
            const isHit = ['Single', 'Double', 'Triple', 'Home Run'].includes(p.abResult);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={isHit ? 5 : 4}
                fill={color}
                opacity={0.8}
                stroke="white"
                strokeWidth="0.5"
              >
                <title>{`${p.abResult}${p.hitDistance ? ` (${p.hitDistance}ft)` : ''}`}</title>
              </circle>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {[
          { label: '안타', color: '#3b82f6' },
          { label: '2루타', color: '#f59e0b' },
          { label: '3루타', color: '#8b5cf6' },
          { label: '홈런', color: '#ef4444' },
          { label: '아웃', color: '#9ca3af' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Count */}
      <p className="text-center text-xs text-gray-400 mt-2">
        {filtered.length}개 타구 · 안타 {hitCount}개
      </p>
    </div>
  );
}
