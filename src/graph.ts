import {
  ContributionCalendar,
  ContributionDay,
  NeuronNode,
  SynapseLink,
  NeuralGraph,
} from './types.js';

export interface GraphLayoutConfig {
  offsetX: number;
  offsetY: number;
  cellSpacingX: number;
  cellSpacingY: number;
  maxLinksPerNeuron: number;
  curvedLines: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
}

export const DEFAULT_LAYOUT: GraphLayoutConfig = {
  offsetX: 44,
  offsetY: 104,
  cellSpacingX: 15.5,
  cellSpacingY: 15.5,
  maxLinksPerNeuron: 3,
  curvedLines: true,
  animationSpeed: 'normal',
};

// Deterministic pseudo-random number generator for consistent beautiful layouts
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function buildNeuralGraph(
  calendar: ContributionCalendar,
  config: Partial<GraphLayoutConfig> = {}
): NeuralGraph {
  const cfg = { ...DEFAULT_LAYOUT, ...config };
  const neurons: NeuronNode[] = [];
  const activeNeurons: NeuronNode[] = [];
  const synapses: SynapseLink[] = [];

  let maxDaily = 0;
  let activeCount = 0;
  let seed = 42;

  // 1. Create Neuron Nodes
  calendar.weeks.forEach((week, wIndex) => {
    week.contributionDays.forEach((day, dIndex) => {
      if (day.contributionCount > maxDaily) {
        maxDaily = day.contributionCount;
      }

      const isActive = day.contributionLevel > 0;
      if (isActive) activeCount++;

      const x = cfg.offsetX + wIndex * cfg.cellSpacingX;
      const y = cfg.offsetY + dIndex * cfg.cellSpacingY;

      // Radius scale based on contribution level
      let radius = 1.8; // Inert
      if (day.contributionLevel === 1) radius = 2.8;
      else if (day.contributionLevel === 2) radius = 3.6;
      else if (day.contributionLevel === 3) radius = 4.6;
      else if (day.contributionLevel === 4) radius = 5.8;

      const randVal = pseudoRandom(seed++);
      const pulseDelay = parseFloat((randVal * 3).toFixed(2));
      const pulseDuration = parseFloat((2.5 + randVal * 1.5).toFixed(2));

      const node: NeuronNode = {
        id: `n_${wIndex}_${dIndex}`,
        weekIndex: wIndex,
        dayIndex: dIndex,
        x,
        y,
        count: day.contributionCount,
        level: day.contributionLevel,
        isActive,
        radius,
        pulseDelay,
        pulseDuration,
      };

      neurons.push(node);
      if (isActive) {
        activeNeurons.push(node);
      }
    });
  });

  // Map to easily look up neurons by (week, day)
  const neuronMap = new Map<string, NeuronNode>();
  neurons.forEach((n) => neuronMap.set(`${n.weekIndex},${n.dayIndex}`, n));

  // 2. Build Synapses between active neurons
  const inDegreeMap = new Map<string, number>();
  const outDegreeMap = new Map<string, number>();

  const speedMultiplier = cfg.animationSpeed === 'fast' ? 0.65 : cfg.animationSpeed === 'slow' ? 1.5 : 1.0;
  const baseCycle = 4.0 * speedMultiplier;

  // Helper for path creation
  const createPath = (s: NeuronNode, t: NeuronNode): string => {
    if (!cfg.curvedLines) {
      return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} L ${t.x.toFixed(1)} ${t.y.toFixed(1)}`;
    }
    const dx = t.x - s.x;
    const dy = t.y - s.y;

    if (s.weekIndex === t.weekIndex) {
      // Same week vertical curve
      const arcOffset = dy > 0 ? 6 : -6;
      return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} Q ${(s.x + arcOffset).toFixed(1)} ${(s.y + dy * 0.5).toFixed(1)}, ${t.x.toFixed(1)} ${t.y.toFixed(1)}`;
    }

    // Forward S-curve (cubic bezier)
    const cx1 = (s.x + dx * 0.45).toFixed(1);
    const cy1 = s.y.toFixed(1);
    const cx2 = (t.x - dx * 0.45).toFixed(1);
    const cy2 = t.y.toFixed(1);
    return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${t.x.toFixed(1)} ${t.y.toFixed(1)}`;
  };

  // Connect active neurons
  activeNeurons.forEach((source) => {
    const currentOut = outDegreeMap.get(source.id) || 0;
    if (currentOut >= cfg.maxLinksPerNeuron) return;

    // Collect candidate targets in subsequent 1..3 weeks
    interface Candidate {
      target: NeuronNode;
      dist: number;
      isSameWeek: boolean;
    }

    const candidates: Candidate[] = [];

    // Check same week adjacent days
    [-1, 1].forEach((dOffset) => {
      const neighbor = neuronMap.get(`${source.weekIndex},${source.dayIndex + dOffset}`);
      if (neighbor && neighbor.isActive) {
        const inDeg = inDegreeMap.get(neighbor.id) || 0;
        if (inDeg < 3) {
          candidates.push({
            target: neighbor,
            dist: cfg.cellSpacingY * 0.8, // prioritize adjacent days slightly
            isSameWeek: true,
          });
        }
      }
    });

    // Check forward layers (weeks +1, +2, +3)
    const maxLookaheadWeeks = 3;
    for (let w = source.weekIndex + 1; w <= Math.min(calendar.weeks.length - 1, source.weekIndex + maxLookaheadWeeks); w++) {
      for (let d = 0; d < 7; d++) {
        const target = neuronMap.get(`${w},${d}`);
        if (target && target.isActive) {
          const inDeg = inDegreeMap.get(target.id) || 0;
          if (inDeg < 3) {
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            candidates.push({ target, dist, isSameWeek: false });
          }
        }
      }
      // If we found suitable targets in week +1, don't overreach too far unless sparse
      if (candidates.length >= cfg.maxLinksPerNeuron * 2) break;
    }

    // Sort candidates by distance (closest first)
    candidates.sort((a, b) => a.dist - b.dist);

    // Pick top candidates up to maxLinksPerNeuron
    const allowedNew = cfg.maxLinksPerNeuron - currentOut;
    const selected = candidates.slice(0, allowedNew);

    selected.forEach((cand, idx) => {
      const target = cand.target;
      outDegreeMap.set(source.id, (outDegreeMap.get(source.id) || 0) + 1);
      inDegreeMap.set(target.id, (inDegreeMap.get(target.id) || 0) + 1);

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const pathLength = Math.round(Math.sqrt(dx * dx + dy * dy) * 1.06);

      const weight = Math.max(1, Math.min(4, Math.round((source.level + target.level) / 2)));
      const pulseClassIdx = (source.weekIndex + source.dayIndex + idx) % 6;
      const pulseClass = `syn-pulse-${pulseClassIdx}`;

      // Calculate signal flow delay: travels from left to right with slight phase variations
      const flowProgress = source.weekIndex / Math.max(1, calendar.weeks.length);
      const randOffset = pseudoRandom(seed++);
      const animDelay = parseFloat(((flowProgress * baseCycle * 0.8 + randOffset * 0.8) % baseCycle).toFixed(2));
      const animDuration = parseFloat((baseCycle * (0.8 + randOffset * 0.4)).toFixed(2));

      synapses.push({
        id: `syn_${source.id}_${target.id}`,
        source,
        target,
        pathD: createPath(source, target),
        weight,
        pulseClass,
        dashLength: Math.max(12, Math.round(pathLength * 0.2)),
        pathLength,
        animationDelay: animDelay,
        animationDuration: animDuration,
      });
    });
  });

  // Calculate Neural Activity Score
  const activeRatio = calendar.weeks.length > 0 ? activeCount / (calendar.weeks.length * 7) : 0;
  let neuralActivityScore: NeuralGraph['neuralActivityScore'] = 'LOW';
  if (activeRatio > 0.45) neuralActivityScore = 'OVERLOAD';
  else if (activeRatio > 0.25) neuralActivityScore = 'HIGH';
  else if (activeRatio > 0.10) neuralActivityScore = 'OPTIMAL';

  return {
    neurons,
    activeNeurons,
    synapses,
    totalContributions: calendar.totalContributions,
    maxDailyContributions: maxDaily,
    weeksCount: calendar.weeks.length,
    activeCount,
    synapseCount: synapses.length,
    neuralActivityScore,
  };
}
