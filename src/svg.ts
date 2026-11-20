import { NeuralGraph, RenderOptions, ThemeColors } from './types.js';
import { getTheme } from './themes.js';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = [
  { index: 1, label: 'Mon' },
  { index: 3, label: 'Wed' },
  { index: 5, label: 'Fri' },
];

export function renderNeuralNetSvg(
  graph: NeuralGraph,
  options: RenderOptions,
  datesByWeek?: { weekIndex: number; date: string }[]
): string {
  const theme: ThemeColors = getTheme(options.theme, options.customColors);
  const width = options.width || 920;
  const height = options.height || 265;
  const username = options.username || 'neural-operator';
  const showHud = options.showHud !== false;
  const showLegend = options.showLegend !== false;

  // Extract month label positions
  const monthLabels: { label: string; x: number }[] = [];
  if (datesByWeek && datesByWeek.length > 0) {
    let lastMonth = -1;
    datesByWeek.forEach(({ weekIndex, date }) => {
      const d = new Date(date);
      const m = d.getUTCMonth();
      if (m !== lastMonth && weekIndex < 51) {
        lastMonth = m;
        const x = 44 + weekIndex * 15.5;
        monthLabels.push({ label: MONTH_NAMES[m], x });
      }
    });
  } else {
    for (let i = 0; i < 12; i++) {
      const w = Math.floor((i * 53) / 12);
      const x = 44 + w * 15.5;
      monthLabels.push({ label: MONTH_NAMES[i], x });
    }
  }

  // Base synapses
  const baseSynapseElements: string[] = [];
  // Pulse synapses
  const pulseSynapseElements: string[] = [];

  graph.synapses.forEach((syn) => {
    // 1. Static base synapse wire
    const baseWidth = (syn.weight * 0.35 + 0.4).toFixed(1);
    baseSynapseElements.push(
      `<path d="${syn.pathD}" class="syn-base" stroke-width="${baseWidth}" />`
    );

    // 2. Bioluminescent moving pulse using normalized pathLength="100"
    const pulseWidth = (syn.weight * 0.45 + 0.8).toFixed(1);
    const isSpecial = syn.source.level === 4 || syn.target.level === 4;
    const strokeColor = isSpecial && theme.synapseSecondary ? theme.synapseSecondary : theme.synapsePulse;

    pulseSynapseElements.push(
      `<path d="${syn.pathD}" pathLength="100" class="syn-pulse" stroke="${strokeColor}" stroke-width="${pulseWidth}" style="animation-delay:${syn.animationDelay}s;animation-duration:${syn.animationDuration}s;" />`
    );
  });

  // Inert and Active Neurons
  const inertNeuronElements: string[] = [];
  const activeNeuronElements: string[] = [];

  graph.neurons.forEach((node) => {
    if (!node.isActive) {
      inertNeuronElements.push(
        `<circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="1.6" class="node-inert" />`
      );
    } else {
      let fillColor = theme.nodeLevel1;
      let haloRadius = (node.radius * 2.2).toFixed(1);

      if (node.level === 2) fillColor = theme.nodeLevel2;
      else if (node.level === 3) {
        fillColor = theme.nodeLevel3;
        haloRadius = (node.radius * 2.5).toFixed(1);
      } else if (node.level === 4) {
        fillColor = theme.nodeLevel4;
        haloRadius = (node.radius * 3.0).toFixed(1);
      }

      const isLvl4 = node.level === 4;
      activeNeuronElements.push(
        `<g class="node-active ${isLvl4 ? 'lvl-4' : ''}">` +
        `<circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${haloRadius}" fill="${fillColor}" class="node-halo" style="animation-delay:${node.pulseDelay}s;animation-duration:${node.pulseDuration}s;" />` +
        `<circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${node.radius.toFixed(1)}" fill="${fillColor}" class="node-core" />` +
        `</g>`
      );
    }
  });

  const hudScoreColor =
    graph.neuralActivityScore === 'OVERLOAD'
      ? theme.nodeLevel4
      : graph.neuralActivityScore === 'HIGH'
      ? theme.nodeLevel3
      : theme.nodeLevel2;

  const bgGradientStart = theme.backgroundGradient ? theme.backgroundGradient[0] : theme.background;
  const bgGradientEnd = theme.backgroundGradient ? theme.backgroundGradient[1] : theme.background;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="xMidYMid meet">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgGradientStart}" />
      <stop offset="100%" stop-color="${bgGradientEnd}" />
    </linearGradient>

    <linearGradient id="hudLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${theme.hudAccent}" stop-opacity="0.8" />
      <stop offset="50%" stop-color="${theme.hudAccent}" stop-opacity="0.2" />
      <stop offset="100%" stop-color="${theme.hudAccent}" stop-opacity="0.8" />
    </linearGradient>

    <pattern id="matrixGrid" width="15.5" height="15.5" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="0.6" fill="${theme.gridDot}" />
    </pattern>

    <style>
      .mono { font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Courier New', monospace; }
      .bg-card { fill: url(#bgGrad); stroke: ${theme.cardBorder}; stroke-width: 1.2; rx: 12px; }
      .hud-title { font-size: 11px; font-weight: 700; fill: ${theme.textPrimary}; letter-spacing: 1.5px; }
      .hud-sub { font-size: 9px; fill: ${theme.textSecondary}; font-weight: 500; letter-spacing: 0.8px; }
      .hud-muted { font-size: 8px; fill: ${theme.textMuted}; font-weight: 500; letter-spacing: 0.5px; }
      .hud-val { font-size: 11px; font-weight: 700; fill: ${theme.textPrimary}; }
      .month-lbl { font-size: 8.5px; fill: ${theme.textMuted}; font-weight: 500; }
      .day-lbl { font-size: 8px; fill: ${theme.textMuted}; font-weight: 500; }

      .syn-base {
        stroke: ${theme.synapseBase};
        fill: none;
        opacity: 0.7;
      }

      .syn-pulse {
        fill: none;
        stroke-linecap: round;
        stroke-dasharray: 12 88;
        stroke-dashoffset: 100;
        animation: signalFlow infinite ease-in-out;
      }

      @keyframes signalFlow {
        0% {
          stroke-dashoffset: 100;
          opacity: 0;
        }
        12% {
          opacity: 0.95;
        }
        80% {
          opacity: 0.95;
        }
        100% {
          stroke-dashoffset: 0;
          opacity: 0;
        }
      }

      .node-inert {
        fill: ${theme.nodeInert};
        opacity: 0.65;
      }

      .node-halo {
        opacity: 0.22;
        animation: haloPulse infinite ease-in-out;
      }

      @keyframes haloPulse {
        0%, 100% {
          opacity: 0.16;
        }
        50% {
          opacity: 0.42;
        }
      }

      .node-active.lvl-4 .node-core {
        animation: overloadFlash 3.2s infinite ease-in-out;
      }

      @keyframes overloadFlash {
        0%, 75%, 100% {
          opacity: 0.85;
        }
        82% {
          opacity: 1;
        }
      }

      .hud-badge {
        font-size: 8px;
        font-weight: 700;
        letter-spacing: 1px;
        fill: ${hudScoreColor};
      }

      .corner-mark {
        stroke: ${theme.hudAccent};
        stroke-width: 1.5;
        fill: none;
        opacity: 0.6;
      }
    </style>
  </defs>

  <!-- Background Base Container -->
  <rect x="2" y="2" width="${width - 4}" height="${height - 4}" class="bg-card" />

  <!-- Subtle Matrix Backdrop Grid -->
  <rect x="15" y="80" width="${width - 30}" height="125" fill="url(#matrixGrid)" opacity="0.45" />

  <!-- Holographic Corner Marks -->
  <path d="M 8 18 L 8 8 L 18 8" class="corner-mark" />
  <path d="M ${width - 8} 18 L ${width - 8} 8 L ${width - 18} 8" class="corner-mark" />
  <path d="M 8 ${height - 18} L 8 ${height - 8} L 18 ${height - 8}" class="corner-mark" />
  <path d="M ${width - 8} ${height - 18} L ${width - 8} ${height - 8} L ${width - 18} ${height - 8}" class="corner-mark" />

  ${showHud ? `
  <!-- Top HUD Header -->
  <g transform="translate(24, 28)">
    <!-- Circuit indicator -->
    <circle cx="4" cy="4" r="3.5" fill="${hudScoreColor}" opacity="0.85" />
    <circle cx="4" cy="4" r="6" stroke="${hudScoreColor}" stroke-width="0.8" fill="none" opacity="0.4" />
    
    <text x="16" y="7" class="mono hud-title">NEURAL_SYNAPSE // ${username.toUpperCase()}</text>
    <text x="16" y="22" class="mono hud-sub">STATE: <tspan class="hud-badge">${graph.neuralActivityScore}</tspan> · ARCHITECTURE: 53-LAYER FEEDFORWARD</text>

    <!-- Telemetry Cards -->
    <g transform="translate(${width - 440}, 0)">
      <text x="0" y="5" class="mono hud-muted">ANNUAL FLUX</text>
      <text x="0" y="20" class="mono hud-val">${graph.totalContributions.toLocaleString()} <tspan font-size="8" fill="${theme.textMuted}">COMMITS</tspan></text>

      <text x="105" y="5" class="mono hud-muted">ACTIVE NODES</text>
      <text x="105" y="20" class="mono hud-val">${graph.activeCount} <tspan font-size="8" fill="${theme.textMuted}">/${graph.weeksCount * 7}</tspan></text>

      <text x="200" y="5" class="mono hud-muted">SYNAPSES</text>
      <text x="200" y="20" class="mono hud-val">${graph.synapseCount} <tspan font-size="8" fill="${theme.textMuted}">LINKS</tspan></text>

      <text x="290" y="5" class="mono hud-muted">MAX BURST</text>
      <text x="290" y="20" class="mono hud-val">${graph.maxDailyContributions} <tspan font-size="8" fill="${theme.textMuted}">/DAY</tspan></text>
    </g>
  </g>

  <!-- Divider Line -->
  <line x1="24" y1="62" x2="${width - 24}" y2="62" stroke="url(#hudLineGrad)" stroke-width="0.75" />
  ` : ''}

  <!-- Month Labels -->
  <g transform="translate(0, 84)">
    ${monthLabels.map((m) => `<text x="${m.x.toFixed(1)}" y="0" class="mono month-lbl">${m.label}</text>`).join('\n    ')}
  </g>

  <!-- Day Labels (Mon, Wed, Fri) -->
  <g transform="translate(18, 0)">
    ${DAY_LABELS.map((dl) => {
      const y = 104 + dl.index * 15.5 + 3.5;
      return `<text x="0" y="${y.toFixed(1)}" class="mono day-lbl">${dl.label}</text>`;
    }).join('\n    ')}
  </g>

  <!-- GRAPH CONTENT LAYER -->
  <g id="neural-graph-layer">
    <!-- 1. Inert Neurons (Dormant grid) -->
    <g id="inert-neurons">
      ${inertNeuronElements.join('\n      ')}
    </g>

    <!-- 2. Base Synapses (Low opacity static dendrites) -->
    <g id="synapses-base">
      ${baseSynapseElements.join('\n      ')}
    </g>

    <!-- 3. Bioluminescent Signal Pulses -->
    <g id="synapses-pulses">
      ${pulseSynapseElements.join('\n      ')}
    </g>

    <!-- 4. Active Neurons (Glow halo + core) -->
    <g id="active-neurons">
      ${activeNeuronElements.join('\n      ')}
    </g>
  </g>

  ${showLegend ? `
  <!-- Footer HUD / Legend -->
  <g transform="translate(24, ${height - 20})">
    <text x="0" y="4" class="mono hud-muted">NEURAL POTENTIAL:</text>
    <circle cx="115" cy="1" r="2" fill="${theme.nodeInert}" />
    <text x="122" y="4" class="mono hud-muted">INERT</text>

    <circle cx="165" cy="1" r="2.8" fill="${theme.nodeLevel1}" />
    <text x="173" y="4" class="mono hud-muted">RESTING</text>

    <circle cx="225" cy="1" r="3.4" fill="${theme.nodeLevel2}" />
    <text x="234" y="4" class="mono hud-muted">ACTIVE</text>

    <circle cx="282" cy="1" r="4.2" fill="${theme.nodeLevel3}" />
    <text x="292" y="4" class="mono hud-muted">HIGH</text>

    <circle cx="330" cy="1" r="5" fill="${theme.nodeLevel4}" />
    <text x="340" y="4" class="mono hud-muted">OVERLOAD</text>

    <!-- Right footer signature -->
    <text x="${width - 48}" y="4" text-anchor="end" class="mono hud-muted">NEURAL-CONTRIBUTION-NET // SVG GENERATIVE ENGINE</text>
  </g>
  ` : ''}
</svg>`;
}
