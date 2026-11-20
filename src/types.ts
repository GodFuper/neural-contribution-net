export type ContributionLevel = 'NONE' | 'FIRST_QUARTILE' | 'SECOND_QUARTILE' | 'THIRD_QUARTILE' | 'FOURTH_QUARTILE' | 0 | 1 | 2 | 3 | 4;

export interface ContributionDay {
  date: string;
  contributionCount: number;
  contributionLevel: number; // 0..4
  weekday: number; // 0 (Sun) .. 6 (Sat)
}

export interface ContributionWeek {
  contributionDays: ContributionDay[];
  firstDay: string;
}

export interface ContributionCalendar {
  totalContributions: number;
  weeks: ContributionWeek[];
}

export interface NeuronNode {
  id: string;
  weekIndex: number;
  dayIndex: number;
  x: number;
  y: number;
  count: number;
  level: number; // 0..4
  isActive: boolean;
  radius: number;
  pulseDelay: number;
  pulseDuration: number;
}

export interface SynapseLink {
  id: string;
  source: NeuronNode;
  target: NeuronNode;
  pathD: string;
  weight: number; // 1..4 based on activity
  pulseClass: string;
  dashLength: number;
  pathLength: number;
  animationDelay: number;
  animationDuration: number;
}

export interface NeuralGraph {
  neurons: NeuronNode[];
  activeNeurons: NeuronNode[];
  synapses: SynapseLink[];
  totalContributions: number;
  maxDailyContributions: number;
  weeksCount: number;
  activeCount: number;
  synapseCount: number;
  neuralActivityScore: 'LOW' | 'OPTIMAL' | 'HIGH' | 'OVERLOAD';
}

export interface ThemeColors {
  background: string;
  backgroundGradient?: [string, string];
  cardBorder: string;
  gridDot: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  nodeInert: string;
  nodeLevel1: string;
  nodeLevel2: string;
  nodeLevel3: string;
  nodeLevel4: string;
  synapseBase: string;
  synapsePulse: string;
  synapseSecondary?: string;
  hudAccent: string;
  hudGlow: string;
}

export type ThemeName = 'cyberpunk' | 'matrix' | 'synthwave' | 'aurora' | 'solaris' | 'monochrome' | 'light';

export interface RenderOptions {
  username: string;
  year?: number | string;
  theme: ThemeName;
  customColors?: Partial<ThemeColors>;
  showHud?: boolean;
  showLegend?: boolean;
  maxLinksPerNeuron?: number;
  animationSpeed?: 'slow' | 'normal' | 'fast';
  curvedLines?: boolean;
  width?: number;
  height?: number;
}
