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

// Uniform scale: 400ft (center field) → 250 SVG units
const SCALE = 250 / 400; // 0.625 SVG units per foot
const HOME = { x: 150, y: 280 };
// Polar coords from home plate: 0° = center field, -45° = LF line, +45° = RF line
function polar(distFt: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: HOME.x + distFt * SCALE * Math.sin(rad),
    y: HOME.y - distFt * SCALE * Math.cos(rad),
  };
}

function toSvgCoords(hcX: number, hcY: number): { x: number; y: number } {
  const xFeet = 2.5 * (hcX - 125.42);
  const yFeet = 2.5 * (198.27 - hcY);
  return {
    x: HOME.x + xFeet * SCALE,
    y: HOME.y - yFeet * SCALE,
  };
}

function BaseballField() {
  // Diamond bases (90ft sides at 45° angles)
  const first = polar(90, 45);
  const second = polar(90 * Math.SQRT2, 0); // 127.3ft straight up
  const third = polar(90, -45);

  // Outfield fence endpoints on foul lines (330ft) and center (400ft)
  const lf = polar(330, -45);
  const cf = polar(400, 0);
  const rf = polar(330, 45);

  // Infield grass arc: 95ft radius circle centered at home, from 3B line to 1B line
  const infR = 95 * SCALE; // ~59.4 SVG units
  const infStart = polar(95, -45);
  const infEnd = polar(95, 45);

  // Pitching mound: 60.5ft from home
  const mound = polar(60.5, 0);

  return (
    <g>
      {/* Outfield grass fill — foul lines + fence arc */}
      <path
        d={`M ${HOME.x} ${HOME.y} L ${lf.x} ${lf.y} Q ${cf.x} ${cf.y - 8} ${rf.x} ${rf.y} Z`}
        fill="#d1fae5"
        opacity="0.4"
      />

      {/* Outfield fence arc */}
      <path
        d={`M ${lf.x} ${lf.y} Q ${cf.x} ${cf.y - 8} ${rf.x} ${rf.y}`}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="2"
      />

      {/* Foul lines (home → LF/RF fence) */}
      <line x1={HOME.x} y1={HOME.y} x2={lf.x} y2={lf.y} stroke="#cbd5e1" strokeWidth="1.5" />
      <line x1={HOME.x} y1={HOME.y} x2={rf.x} y2={rf.y} stroke="#cbd5e1" strokeWidth="1.5" />

      {/* Infield dirt diamond */}
      <path
        d={`M ${HOME.x} ${HOME.y} L ${first.x} ${first.y} L ${second.x} ${second.y} L ${third.x} ${third.y} Z`}
        fill="#fef3c7"
        opacity="0.4"
      />

      {/* Infield grass arc (95ft from home, curves outward toward 2B) */}
      <path
        d={`M ${infStart.x} ${infStart.y} A ${infR} ${infR} 0 0 1 ${infEnd.x} ${infEnd.y}`}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="1"
        strokeDasharray="4,2"
      />

      {/* Base path lines */}
      <line x1={HOME.x} y1={HOME.y} x2={first.x} y2={first.y} stroke="#94a3b8" strokeWidth="1.5" />
      <line x1={first.x} y1={first.y} x2={second.x} y2={second.y} stroke="#94a3b8" strokeWidth="1.5" />
      <line x1={second.x} y1={second.y} x2={third.x} y2={third.y} stroke="#94a3b8" strokeWidth="1.5" />
      <line x1={third.x} y1={third.y} x2={HOME.x} y2={HOME.y} stroke="#94a3b8" strokeWidth="1.5" />

      {/* Bases */}
      <rect x={first.x - 3} y={first.y - 3} width="6" height="6" fill="white" stroke="#94a3b8" strokeWidth="1" transform={`rotate(45 ${first.x} ${first.y})`} />
      <rect x={second.x - 3} y={second.y - 3} width="6" height="6" fill="white" stroke="#94a3b8" strokeWidth="1" transform={`rotate(45 ${second.x} ${second.y})`} />
      <rect x={third.x - 3} y={third.y - 3} width="6" height="6" fill="white" stroke="#94a3b8" strokeWidth="1" transform={`rotate(45 ${third.x} ${third.y})`} />

      {/* Home plate pentagon */}
      <polygon
        points={`${HOME.x},${HOME.y - 5} ${HOME.x + 4},${HOME.y - 2} ${HOME.x + 4},${HOME.y + 2} ${HOME.x - 4},${HOME.y + 2} ${HOME.x - 4},${HOME.y - 2}`}
        fill="white"
        stroke="#94a3b8"
        strokeWidth="1"
      />

      {/* Pitching mound */}
      <circle cx={mound.x} cy={mound.y} r="3" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
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
