/** Baseball Savant official pitch type colors */
export const PITCH_COLORS: Record<string, string> = {
  FF: '#D22D49', // 4-Seam Fastball
  SI: '#FE9D00', // Sinker
  FC: '#933F2C', // Cutter
  CH: '#1DBE3A', // Changeup
  SL: '#EEE716', // Slider
  CU: '#00D1ED', // Curveball
  ST: '#DDB33A', // Sweeper
  SV: '#93AFD4', // Slurve
  FS: '#3BACAC', // Splitter
  KC: '#7B68AD', // Knuckle Curve
  KN: '#A3A3A3', // Knuckleball
};

export const PITCH_NAMES_KR: Record<string, string> = {
  FF: '포심', SI: '싱커', FC: '커터',
  CH: '체인지업', SL: '슬라이더', CU: '커브',
  ST: '스위퍼', SV: '슬러브', FS: '스플리터',
  KC: '너클커브', KN: '너클볼',
};

export const PITCH_NAMES_EN: Record<string, string> = {
  FF: '4-Seam', SI: 'Sinker', FC: 'Cutter',
  CH: 'Changeup', SL: 'Slider', CU: 'Curveball',
  ST: 'Sweeper', SV: 'Slurve', FS: 'Splitter',
  KC: 'K-Curve', KN: 'Knuckleball',
};

/** Result-based border colors */
export const RESULT_COLORS = {
  ball: '#ef4444',
  calledStrike: '#22c55e',
  swing: '#fbbf24',
  inPlay: '#60a5fa',
  default: '#94a3b8',
} as const;

export function getResultColor(callDesc: string): string {
  if (callDesc.includes('Ball') || callDesc === 'Hit By Pitch') return RESULT_COLORS.ball;
  if (callDesc.includes('Called Strike')) return RESULT_COLORS.calledStrike;
  if (callDesc.includes('Swinging') || callDesc.includes('Foul')) return RESULT_COLORS.swing;
  if (callDesc.includes('In play')) return RESULT_COLORS.inPlay;
  return RESULT_COLORS.default;
}
