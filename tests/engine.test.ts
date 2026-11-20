import { test } from 'node:test';
import * as assert from 'node:assert';
import { generateMockCalendar } from '../src/github.js';
import { buildNeuralGraph } from '../src/graph.js';
import { renderNeuralNetSvg } from '../src/svg.js';
import { THEMES, getTheme } from '../src/themes.js';

test('generateMockCalendar generates 53 weeks and positive contributions', () => {
  const calendar = generateMockCalendar(53);
  assert.strictEqual(calendar.weeks.length, 53);
  assert.ok(calendar.totalContributions > 0, 'Total contributions should be > 0');

  let dayCount = 0;
  calendar.weeks.forEach((w) => {
    dayCount += w.contributionDays.length;
    w.contributionDays.forEach((d) => {
      assert.ok(d.contributionLevel >= 0 && d.contributionLevel <= 4);
    });
  });
  assert.strictEqual(dayCount, 53 * 7);
});

test('buildNeuralGraph correctly builds neurons and synapses', () => {
  const calendar = generateMockCalendar(53);
  const graph = buildNeuralGraph(calendar, {
    maxLinksPerNeuron: 3,
    curvedLines: true,
  });

  assert.strictEqual(graph.neurons.length, 53 * 7);
  assert.ok(graph.activeNeurons.length > 0);
  assert.ok(graph.synapses.length > 0);
  assert.ok(['LOW', 'OPTIMAL', 'HIGH', 'OVERLOAD'].includes(graph.neuralActivityScore));

  // Verify synapse validity
  graph.synapses.forEach((syn) => {
    assert.ok(syn.source.isActive);
    assert.ok(syn.target.isActive);
    assert.ok(syn.pathD.startsWith('M '));
    assert.ok(syn.animationDuration > 0);
  });
});

test('all themes are valid and have required color properties', () => {
  const expectedThemes = ['cyberpunk', 'matrix', 'synthwave', 'aurora', 'solaris', 'monochrome', 'light'];
  expectedThemes.forEach((name) => {
    const theme = getTheme(name as any);
    assert.ok(theme.background, `Missing background for ${name}`);
    assert.ok(theme.textPrimary, `Missing textPrimary for ${name}`);
    assert.ok(theme.nodeLevel1, `Missing nodeLevel1 for ${name}`);
    assert.ok(theme.nodeLevel4, `Missing nodeLevel4 for ${name}`);
    assert.ok(theme.synapsePulse, `Missing synapsePulse for ${name}`);
  });
});

test('renderNeuralNetSvg renders well-formed SVG string', () => {
  const calendar = generateMockCalendar(53);
  const graph = buildNeuralGraph(calendar);
  const svg = renderNeuralNetSvg(graph, {
    username: 'test-user',
    theme: 'cyberpunk',
  });

  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.endsWith('</svg>'));
  assert.ok(svg.includes('NEURAL_SYNAPSE // TEST-USER'));
  assert.ok(svg.includes('pathLength="100"'));
  assert.ok(svg.includes('class="syn-pulse"'));
  assert.ok(svg.includes('class="node-active'));
});
