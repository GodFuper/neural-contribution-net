"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/cli.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));

// src/github.ts
var GRAPHQL_QUERY = `
query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          firstDay
          contributionDays {
            date
            contributionCount
            contributionLevel
            weekday
          }
        }
      }
    }
  }
}
`;
function mapContributionLevel(rawLevel) {
  if (typeof rawLevel === "number") {
    return Math.max(0, Math.min(4, rawLevel));
  }
  switch (rawLevel) {
    case "FIRST_QUARTILE":
      return 1;
    case "SECOND_QUARTILE":
      return 2;
    case "THIRD_QUARTILE":
      return 3;
    case "FOURTH_QUARTILE":
      return 4;
    case "NONE":
    default:
      return 0;
  }
}
async function fetchUserContributions(username, token) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "neural-contribution-net-action"
    },
    body: JSON.stringify({
      query: GRAPHQL_QUERY,
      variables: { login: username }
    })
  });
  if (!response.ok) {
    throw new Error(`GitHub GraphQL API error: HTTP ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(`GraphQL Error: ${json.errors[0].message}`);
  }
  const calendarData = json.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendarData) {
    throw new Error(`User "${username}" not found or contribution calendar is private.`);
  }
  const weeks = calendarData.weeks.map((w) => ({
    firstDay: w.firstDay,
    contributionDays: w.contributionDays.map((d) => ({
      date: d.date,
      contributionCount: d.contributionCount,
      contributionLevel: mapContributionLevel(d.contributionLevel),
      weekday: d.weekday ?? new Date(d.date).getUTCDay()
    }))
  }));
  return {
    totalContributions: calendarData.totalContributions,
    weeks
  };
}
function generateMockCalendar(totalWeeks = 53) {
  const weeks = [];
  let totalContributions = 0;
  const now = /* @__PURE__ */ new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - totalWeeks * 7);
  let seed = 1337;
  const rand = () => {
    const x = Math.sin(seed++) * 1e4;
    return x - Math.floor(x);
  };
  for (let w = 0; w < totalWeeks; w++) {
    const days = [];
    const isSprintPeriod = w >= 10 && w <= 14 || w >= 28 && w <= 32 || w >= 45 && w <= 49;
    const isVacation = w === 22 || w === 23;
    for (let d = 0; d < 7; d++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + w * 7 + d);
      const dateStr = currentDate.toISOString().split("T")[0];
      let level = 0;
      let count = 0;
      if (!isVacation) {
        const isWeekend = d === 0 || d === 6;
        const commitChance = isSprintPeriod ? isWeekend ? 0.6 : 0.92 : isWeekend ? 0.25 : 0.72;
        if (rand() < commitChance) {
          const intensityRoll = rand();
          if (isSprintPeriod && intensityRoll > 0.6) {
            level = intensityRoll > 0.85 ? 4 : 3;
            count = Math.floor(10 + rand() * 15);
          } else if (intensityRoll > 0.8) {
            level = 3;
            count = Math.floor(6 + rand() * 8);
          } else if (intensityRoll > 0.45) {
            level = 2;
            count = Math.floor(3 + rand() * 5);
          } else {
            level = 1;
            count = Math.floor(1 + rand() * 3);
          }
        }
      }
      totalContributions += count;
      days.push({
        date: dateStr,
        contributionCount: count,
        contributionLevel: level,
        weekday: d
      });
    }
    weeks.push({
      firstDay: days[0].date,
      contributionDays: days
    });
  }
  return {
    totalContributions,
    weeks
  };
}

// src/graph.ts
var DEFAULT_LAYOUT = {
  offsetX: 44,
  offsetY: 104,
  cellSpacingX: 15.5,
  cellSpacingY: 15.5,
  maxLinksPerNeuron: 3,
  curvedLines: true,
  animationSpeed: "normal"
};
function pseudoRandom(seed) {
  const x = Math.sin(seed++) * 1e4;
  return x - Math.floor(x);
}
function buildNeuralGraph(calendar, config = {}) {
  const cfg = { ...DEFAULT_LAYOUT, ...config };
  const neurons = [];
  const activeNeurons = [];
  const synapses = [];
  let maxDaily = 0;
  let activeCount = 0;
  let seed = 42;
  calendar.weeks.forEach((week, wIndex) => {
    week.contributionDays.forEach((day, dIndex) => {
      if (day.contributionCount > maxDaily) {
        maxDaily = day.contributionCount;
      }
      const isActive = day.contributionLevel > 0;
      if (isActive) activeCount++;
      const x = cfg.offsetX + wIndex * cfg.cellSpacingX;
      const y = cfg.offsetY + dIndex * cfg.cellSpacingY;
      let radius = 1.8;
      if (day.contributionLevel === 1) radius = 2.8;
      else if (day.contributionLevel === 2) radius = 3.6;
      else if (day.contributionLevel === 3) radius = 4.6;
      else if (day.contributionLevel === 4) radius = 5.8;
      const randVal = pseudoRandom(seed++);
      const pulseDelay = parseFloat((randVal * 3).toFixed(2));
      const pulseDuration = parseFloat((2.5 + randVal * 1.5).toFixed(2));
      const node = {
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
        pulseDuration
      };
      neurons.push(node);
      if (isActive) {
        activeNeurons.push(node);
      }
    });
  });
  const neuronMap = /* @__PURE__ */ new Map();
  neurons.forEach((n) => neuronMap.set(`${n.weekIndex},${n.dayIndex}`, n));
  const inDegreeMap = /* @__PURE__ */ new Map();
  const outDegreeMap = /* @__PURE__ */ new Map();
  const speedMultiplier = cfg.animationSpeed === "fast" ? 0.65 : cfg.animationSpeed === "slow" ? 1.5 : 1;
  const baseCycle = 4 * speedMultiplier;
  const createPath = (s, t) => {
    if (!cfg.curvedLines) {
      return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} L ${t.x.toFixed(1)} ${t.y.toFixed(1)}`;
    }
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    if (s.weekIndex === t.weekIndex) {
      const arcOffset = dy > 0 ? 6 : -6;
      return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} Q ${(s.x + arcOffset).toFixed(1)} ${(s.y + dy * 0.5).toFixed(1)}, ${t.x.toFixed(1)} ${t.y.toFixed(1)}`;
    }
    const cx1 = (s.x + dx * 0.45).toFixed(1);
    const cy1 = s.y.toFixed(1);
    const cx2 = (t.x - dx * 0.45).toFixed(1);
    const cy2 = t.y.toFixed(1);
    return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${t.x.toFixed(1)} ${t.y.toFixed(1)}`;
  };
  activeNeurons.forEach((source) => {
    const currentOut = outDegreeMap.get(source.id) || 0;
    if (currentOut >= cfg.maxLinksPerNeuron) return;
    const candidates = [];
    [-1, 1].forEach((dOffset) => {
      const neighbor = neuronMap.get(`${source.weekIndex},${source.dayIndex + dOffset}`);
      if (neighbor && neighbor.isActive) {
        const inDeg = inDegreeMap.get(neighbor.id) || 0;
        if (inDeg < 3) {
          candidates.push({
            target: neighbor,
            dist: cfg.cellSpacingY * 0.8,
            // prioritize adjacent days slightly
            isSameWeek: true
          });
        }
      }
    });
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
      if (candidates.length >= cfg.maxLinksPerNeuron * 2) break;
    }
    candidates.sort((a, b) => a.dist - b.dist);
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
        animationDuration: animDuration
      });
    });
  });
  const activeRatio = calendar.weeks.length > 0 ? activeCount / (calendar.weeks.length * 7) : 0;
  let neuralActivityScore = "LOW";
  if (activeRatio > 0.45) neuralActivityScore = "OVERLOAD";
  else if (activeRatio > 0.25) neuralActivityScore = "HIGH";
  else if (activeRatio > 0.1) neuralActivityScore = "OPTIMAL";
  return {
    neurons,
    activeNeurons,
    synapses,
    totalContributions: calendar.totalContributions,
    maxDailyContributions: maxDaily,
    weeksCount: calendar.weeks.length,
    activeCount,
    synapseCount: synapses.length,
    neuralActivityScore
  };
}

// src/themes.ts
var THEMES = {
  cyberpunk: {
    background: "#070b14",
    backgroundGradient: ["#060913", "#0c1222"],
    cardBorder: "rgba(0, 240, 255, 0.25)",
    gridDot: "rgba(15, 30, 55, 0.6)",
    textPrimary: "#00f0ff",
    textSecondary: "#a5b4fc",
    textMuted: "#475569",
    nodeInert: "#121a2d",
    nodeLevel1: "#0ea5e9",
    // Sky blue
    nodeLevel2: "#06b6d4",
    // Cyan
    nodeLevel3: "#00f0ff",
    // Cyber neon cyan
    nodeLevel4: "#f43f5e",
    // Hot neon pink/crimson overload
    synapseBase: "rgba(14, 165, 233, 0.18)",
    synapsePulse: "#00f0ff",
    synapseSecondary: "#f43f5e",
    hudAccent: "#00f0ff",
    hudGlow: "rgba(0, 240, 255, 0.4)"
  },
  matrix: {
    background: "#040d07",
    backgroundGradient: ["#030905", "#06160c"],
    cardBorder: "rgba(0, 255, 102, 0.25)",
    gridDot: "rgba(10, 35, 20, 0.6)",
    textPrimary: "#00ff66",
    textSecondary: "#86efac",
    textMuted: "#2e5a3c",
    nodeInert: "#0c2214",
    nodeLevel1: "#15803d",
    nodeLevel2: "#22c55e",
    nodeLevel3: "#00ff66",
    nodeLevel4: "#eab308",
    // Core breach amber
    synapseBase: "rgba(34, 197, 94, 0.16)",
    synapsePulse: "#00ff66",
    synapseSecondary: "#a3e635",
    hudAccent: "#00ff66",
    hudGlow: "rgba(0, 255, 102, 0.35)"
  },
  synthwave: {
    background: "#0e051e",
    backgroundGradient: ["#0a0316", "#170932"],
    cardBorder: "rgba(255, 0, 128, 0.28)",
    gridDot: "rgba(40, 15, 70, 0.6)",
    textPrimary: "#ff2a85",
    textSecondary: "#f472b6",
    textMuted: "#582b6b",
    nodeInert: "#1d0c35",
    nodeLevel1: "#7e22ce",
    nodeLevel2: "#c026d3",
    nodeLevel3: "#ff007f",
    nodeLevel4: "#ffaa00",
    // Sunset gold
    synapseBase: "rgba(192, 38, 211, 0.18)",
    synapsePulse: "#ff007f",
    synapseSecondary: "#00f0ff",
    hudAccent: "#ff2a85",
    hudGlow: "rgba(255, 0, 128, 0.35)"
  },
  aurora: {
    background: "#05131d",
    backgroundGradient: ["#040e16", "#092232"],
    cardBorder: "rgba(45, 212, 191, 0.25)",
    gridDot: "rgba(15, 45, 60, 0.6)",
    textPrimary: "#2dd4bf",
    textSecondary: "#7dd3fc",
    textMuted: "#335566",
    nodeInert: "#0e2330",
    nodeLevel1: "#0284c7",
    nodeLevel2: "#0d9488",
    nodeLevel3: "#2dd4bf",
    nodeLevel4: "#a78bfa",
    // Aurora violet
    synapseBase: "rgba(45, 212, 191, 0.16)",
    synapsePulse: "#2dd4bf",
    synapseSecondary: "#818cf8",
    hudAccent: "#2dd4bf",
    hudGlow: "rgba(45, 212, 191, 0.35)"
  },
  solaris: {
    background: "#0c0a09",
    backgroundGradient: ["#080706", "#19130d"],
    cardBorder: "rgba(249, 115, 22, 0.28)",
    gridDot: "rgba(45, 25, 15, 0.6)",
    textPrimary: "#f97316",
    textSecondary: "#fed7aa",
    textMuted: "#573d2d",
    nodeInert: "#211914",
    nodeLevel1: "#b45309",
    nodeLevel2: "#d97706",
    nodeLevel3: "#f97316",
    nodeLevel4: "#facc15",
    // Solar flare yellow
    synapseBase: "rgba(249, 115, 22, 0.18)",
    synapsePulse: "#f97316",
    synapseSecondary: "#ef4444",
    hudAccent: "#f97316",
    hudGlow: "rgba(249, 115, 22, 0.35)"
  },
  monochrome: {
    background: "#090a0f",
    backgroundGradient: ["#07080b", "#12141c"],
    cardBorder: "rgba(226, 232, 240, 0.2)",
    gridDot: "rgba(30, 35, 45, 0.6)",
    textPrimary: "#f8fafc",
    textSecondary: "#cbd5e1",
    textMuted: "#475569",
    nodeInert: "#171b26",
    nodeLevel1: "#334155",
    nodeLevel2: "#64748b",
    nodeLevel3: "#cbd5e1",
    nodeLevel4: "#ffffff",
    synapseBase: "rgba(148, 163, 184, 0.16)",
    synapsePulse: "#f8fafc",
    synapseSecondary: "#94a3b8",
    hudAccent: "#f8fafc",
    hudGlow: "rgba(255, 255, 255, 0.25)"
  },
  light: {
    background: "#f8fafc",
    backgroundGradient: ["#ffffff", "#f1f5f9"],
    cardBorder: "rgba(2, 132, 199, 0.3)",
    gridDot: "rgba(203, 213, 225, 0.7)",
    textPrimary: "#0369a1",
    textSecondary: "#475569",
    textMuted: "#94a3b8",
    nodeInert: "#e2e8f0",
    nodeLevel1: "#93c5fd",
    nodeLevel2: "#38bdf8",
    nodeLevel3: "#0284c7",
    nodeLevel4: "#4338ca",
    synapseBase: "rgba(2, 132, 199, 0.15)",
    synapsePulse: "#0284c7",
    synapseSecondary: "#6366f1",
    hudAccent: "#0284c7",
    hudGlow: "rgba(2, 132, 199, 0.2)"
  }
};
function getTheme(name, overrides) {
  const base = THEMES[name] || THEMES.cyberpunk;
  return { ...base, ...overrides };
}

// src/svg.ts
var MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var DAY_LABELS = [
  { index: 1, label: "Mon" },
  { index: 3, label: "Wed" },
  { index: 5, label: "Fri" }
];
function renderNeuralNetSvg(graph, options, datesByWeek) {
  const theme = getTheme(options.theme, options.customColors);
  const width = options.width || 920;
  const height = options.height || 265;
  const username = options.username || "neural-operator";
  const showHud = options.showHud !== false;
  const showLegend = options.showLegend !== false;
  const monthLabels = [];
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
      const w = Math.floor(i * 53 / 12);
      const x = 44 + w * 15.5;
      monthLabels.push({ label: MONTH_NAMES[i], x });
    }
  }
  const baseSynapseElements = [];
  const pulseSynapseElements = [];
  graph.synapses.forEach((syn) => {
    const baseWidth = (syn.weight * 0.35 + 0.4).toFixed(1);
    baseSynapseElements.push(
      `<path d="${syn.pathD}" class="syn-base" stroke-width="${baseWidth}" />`
    );
    const pulseWidth = (syn.weight * 0.45 + 0.8).toFixed(1);
    const isSpecial = syn.source.level === 4 || syn.target.level === 4;
    const strokeColor = isSpecial && theme.synapseSecondary ? theme.synapseSecondary : theme.synapsePulse;
    pulseSynapseElements.push(
      `<path d="${syn.pathD}" pathLength="100" class="syn-pulse" stroke="${strokeColor}" stroke-width="${pulseWidth}" style="animation-delay:${syn.animationDelay}s;animation-duration:${syn.animationDuration}s;" />`
    );
  });
  const inertNeuronElements = [];
  const activeNeuronElements = [];
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
        haloRadius = (node.radius * 3).toFixed(1);
      }
      const isLvl4 = node.level === 4;
      activeNeuronElements.push(
        `<g class="node-active ${isLvl4 ? "lvl-4" : ""}"><circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${haloRadius}" fill="${fillColor}" class="node-halo" style="animation-delay:${node.pulseDelay}s;animation-duration:${node.pulseDuration}s;" /><circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${node.radius.toFixed(1)}" fill="${fillColor}" class="node-core" /></g>`
      );
    }
  });
  const hudScoreColor = graph.neuralActivityScore === "OVERLOAD" ? theme.nodeLevel4 : graph.neuralActivityScore === "HIGH" ? theme.nodeLevel3 : theme.nodeLevel2;
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
    <text x="16" y="22" class="mono hud-sub">STATE: <tspan class="hud-badge">${graph.neuralActivityScore}</tspan> \xB7 ARCHITECTURE: 53-LAYER FEEDFORWARD</text>

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
  ` : ""}

  <!-- Month Labels -->
  <g transform="translate(0, 84)">
    ${monthLabels.map((m) => `<text x="${m.x.toFixed(1)}" y="0" class="mono month-lbl">${m.label}</text>`).join("\n    ")}
  </g>

  <!-- Day Labels (Mon, Wed, Fri) -->
  <g transform="translate(18, 0)">
    ${DAY_LABELS.map((dl) => {
    const y = 104 + dl.index * 15.5 + 3.5;
    return `<text x="0" y="${y.toFixed(1)}" class="mono day-lbl">${dl.label}</text>`;
  }).join("\n    ")}
  </g>

  <!-- GRAPH CONTENT LAYER -->
  <g id="neural-graph-layer">
    <!-- 1. Inert Neurons (Dormant grid) -->
    <g id="inert-neurons">
      ${inertNeuronElements.join("\n      ")}
    </g>

    <!-- 2. Base Synapses (Low opacity static dendrites) -->
    <g id="synapses-base">
      ${baseSynapseElements.join("\n      ")}
    </g>

    <!-- 3. Bioluminescent Signal Pulses -->
    <g id="synapses-pulses">
      ${pulseSynapseElements.join("\n      ")}
    </g>

    <!-- 4. Active Neurons (Glow halo + core) -->
    <g id="active-neurons">
      ${activeNeuronElements.join("\n      ")}
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
  ` : ""}
</svg>`;
}

// src/cli.ts
function parseArgs() {
  const args = {};
  const raw = process.argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (item.startsWith("--")) {
      const key = item.slice(2);
      if (i + 1 < raw.length && !raw[i + 1].startsWith("--")) {
        args[key] = raw[i + 1];
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}
async function main() {
  const args = parseArgs();
  const isDemo = Boolean(args.demo || !args.user);
  const username = args.user || "neural-architect";
  const token = args.token || process.env.GITHUB_TOKEN || "";
  const theme = (args.theme || "cyberpunk").toLowerCase();
  const speed = args.speed || "normal";
  const outPath = args.out || "dist/neural-net.svg";
  const outDir = args["out-dir"] || "dist";
  const generateAllThemes = Boolean(args["generate-all-themes"]);
  console.log(`
\u{1F9E0} [NEURAL-CONTRIBUTION-NET] Generative Engine`);
  console.log(`\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`);
  let calendar;
  if (!isDemo && token && username) {
    console.log(`\u{1F4E1} Fetching contribution graph for @${username}...`);
    try {
      calendar = await fetchUserContributions(username, token);
      console.log(`\u2713 Retrieved ${calendar.totalContributions} contributions across ${calendar.weeks.length} weeks.`);
    } catch (err) {
      console.warn(`\u26A0\uFE0F API fetch failed (${err.message}). Using synthetic demonstration calendar.`);
      calendar = generateMockCalendar(53);
    }
  } else {
    console.log(`\u{1F9EA} Running in DEMO mode with realistic synthetic neural activity.`);
    calendar = generateMockCalendar(53);
  }
  const datesByWeek = calendar.weeks.map((w, i) => ({
    weekIndex: i,
    date: w.contributionDays[0]?.date || ""
  }));
  const graph = buildNeuralGraph(calendar, {
    maxLinksPerNeuron: 3,
    curvedLines: true,
    animationSpeed: speed
  });
  console.log(`\u26A1 Neural Topology:`);
  console.log(`   - Active Neurons: ${graph.activeCount} / ${graph.weeksCount * 7}`);
  console.log(`   - Synapse Connections: ${graph.synapseCount}`);
  console.log(`   - Cognitive Load: ${graph.neuralActivityScore}`);
  console.log(`   - Total Output: ${graph.totalContributions} commits`);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  if (generateAllThemes) {
    console.log(`
\u{1F3A8} Generating SVG renders for all ${Object.keys(THEMES).length} palettes...`);
    const themeKeys = Object.keys(THEMES);
    themeKeys.forEach((tName) => {
      const target = path.join(outDir, `demo-${tName}.svg`);
      const svg = renderNeuralNetSvg(graph, {
        username,
        theme: tName,
        animationSpeed: speed,
        curvedLines: true
      }, datesByWeek);
      fs.writeFileSync(target, svg, "utf-8");
      console.log(`   \u2713 [${tName.toUpperCase()}] -> ${target}`);
    });
  } else {
    const resolvedPath = path.resolve(process.cwd(), outPath);
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const svg = renderNeuralNetSvg(graph, {
      username,
      theme,
      animationSpeed: speed,
      curvedLines: true
    }, datesByWeek);
    fs.writeFileSync(resolvedPath, svg, "utf-8");
    console.log(`
\u2705 Render written to: ${resolvedPath}`);
  }
  console.log(`
\u2728 Done! Ready to embed into GitHub profile README.
`);
}
main().catch((err) => {
  console.error("Fatal execution error:", err);
  process.exit(1);
});
