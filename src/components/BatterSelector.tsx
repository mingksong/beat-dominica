import { DOM_BATTERS } from '../data/domBatterData';

interface BatterSelectorProps {
  selected: string | null;
  onSelect: (name: string) => void;
}

const DISPLAY_NAMES: Record<string, string> = {
  'Fernando Tatis Jr.': '페타주',
  'Vladimir Guerrero Jr.': '블게주',
};

function getDisplayName(name: string): string {
  if (DISPLAY_NAMES[name]) return DISPLAY_NAMES[name];
  return name.split(' ').slice(-1)[0];
}

export default function BatterSelector({ selected, onSelect }: BatterSelectorProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {DOM_BATTERS.map(b => {
        const isActive = selected === b.name;
        const lastName = getDisplayName(b.name);
        const sideLabel = b.batSide === 'S' ? '양' : b.batSide === 'L' ? '좌' : '우';
        return (
          <button
            key={b.name}
            onClick={() => onSelect(b.name)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              isActive
                ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
            }`}
          >
            {lastName}
            <span className={`ml-1 text-[10px] ${isActive ? 'text-red-200' : 'text-slate-500'}`}>
              ({sideLabel}타) {b.pitchCount}
            </span>
          </button>
        );
      })}
    </div>
  );
}
