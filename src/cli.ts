import * as fs from 'fs';
import * as path from 'path';
import { fetchUserContributions, generateMockCalendar } from './github.js';
import { buildNeuralGraph } from './graph.js';
import { renderNeuralNetSvg } from './svg.js';
import { THEMES } from './themes.js';
import { ThemeName } from './types.js';

function parseArgs(): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  const raw = process.argv.slice(2);

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (item.startsWith('--')) {
      const key = item.slice(2);
      if (i + 1 < raw.length && !raw[i + 1].startsWith('--')) {
        args[key] = raw[i + 1];
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs();

  const isDemo = Boolean(args.demo || !args.user);
  const username = (args.user as string) || 'neural-architect';
  const token = (args.token as string) || process.env.GITHUB_TOKEN || '';
  const theme = ((args.theme as string) || 'cyberpunk').toLowerCase() as ThemeName;
  const speed = ((args.speed as string) || 'normal') as 'slow' | 'normal' | 'fast';
  const outPath = (args.out as string) || 'dist/neural-net.svg';
  const outDir = (args['out-dir'] as string) || 'dist';
  const generateAllThemes = Boolean(args['generate-all-themes']);

  console.log(`\n🧠 [NEURAL-CONTRIBUTION-NET] Generative Engine`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  let calendar;
  if (!isDemo && token && username) {
    console.log(`📡 Fetching contribution graph for @${username}...`);
    try {
      calendar = await fetchUserContributions(username, token);
      console.log(`✓ Retrieved ${calendar.totalContributions} contributions across ${calendar.weeks.length} weeks.`);
    } catch (err: any) {
      console.warn(`⚠️ API fetch failed (${err.message}). Using synthetic demonstration calendar.`);
      calendar = generateMockCalendar(53);
    }
  } else {
    console.log(`🧪 Running in DEMO mode with realistic synthetic neural activity.`);
    calendar = generateMockCalendar(53);
  }

  const datesByWeek = calendar.weeks.map((w, i) => ({
    weekIndex: i,
    date: w.contributionDays[0]?.date || '',
  }));

  const graph = buildNeuralGraph(calendar, {
    maxLinksPerNeuron: 3,
    curvedLines: true,
    animationSpeed: speed,
  });

  console.log(`⚡ Neural Topology:`);
  console.log(`   - Active Neurons: ${graph.activeCount} / ${graph.weeksCount * 7}`);
  console.log(`   - Synapse Connections: ${graph.synapseCount}`);
  console.log(`   - Cognitive Load: ${graph.neuralActivityScore}`);
  console.log(`   - Total Output: ${graph.totalContributions} commits`);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  if (generateAllThemes) {
    console.log(`\n🎨 Generating SVG renders for all ${Object.keys(THEMES).length} palettes...`);
    const themeKeys = Object.keys(THEMES) as ThemeName[];
    themeKeys.forEach((tName) => {
      const target = path.join(outDir, `demo-${tName}.svg`);
      const svg = renderNeuralNetSvg(graph, {
        username,
        theme: tName,
        animationSpeed: speed,
        curvedLines: true,
      }, datesByWeek);
      fs.writeFileSync(target, svg, 'utf-8');
      console.log(`   ✓ [${tName.toUpperCase()}] -> ${target}`);
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
      curvedLines: true,
    }, datesByWeek);
    fs.writeFileSync(resolvedPath, svg, 'utf-8');
    console.log(`\n✅ Render written to: ${resolvedPath}`);
  }

  console.log(`\n✨ Done! Ready to embed into GitHub profile README.\n`);
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
