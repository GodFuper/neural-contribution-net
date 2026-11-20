import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { fetchUserContributions, generateMockCalendar } from './github.js';
import { buildNeuralGraph } from './graph.js';
import { renderNeuralNetSvg } from './svg.js';
import { ThemeName } from './types.js';

async function run(): Promise<void> {
  try {
    const username = core.getInput('github_user_name') || process.env.GITHUB_REPOSITORY_OWNER || '';
    const token = core.getInput('github_token') || process.env.GITHUB_TOKEN || '';
    const outPath = core.getInput('svg_out_path') || 'dist/neural-net.svg';
    const theme = (core.getInput('theme') || 'cyberpunk').toLowerCase() as ThemeName;
    const animationSpeed = (core.getInput('animation_speed') || 'normal') as 'slow' | 'normal' | 'fast';
    const maxLinks = parseInt(core.getInput('max_links_per_neuron') || '3', 10);
    const curvedLines = core.getInput('curved_lines') !== 'false';
    const generateThemeVariants = core.getInput('generate_theme_variants') === 'true';

    core.info(`🚀 Starting Neural Contribution Network generation for @${username}`);
    core.info(`🎨 Theme: ${theme} | Speed: ${animationSpeed} | Max Synapses: ${maxLinks}`);

    let calendar;
    if (token && username) {
      core.info(`Fetching contributions via GitHub GraphQL API...`);
      try {
        calendar = await fetchUserContributions(username, token);
        core.info(`Successfully fetched ${calendar.totalContributions} contributions across ${calendar.weeks.length} weeks.`);
      } catch (err: any) {
        core.warning(`Failed to fetch from GitHub API: ${err.message}. Falling back to demo mock.`);
        calendar = generateMockCalendar(53);
      }
    } else {
      core.info(`No token provided or running in demo mode. Generating mock neural graph.`);
      calendar = generateMockCalendar(53);
    }

    const datesByWeek = calendar.weeks.map((w, i) => ({
      weekIndex: i,
      date: w.contributionDays[0]?.date || '',
    }));

    // 1. Build Graph
    const graph = buildNeuralGraph(calendar, {
      maxLinksPerNeuron: maxLinks,
      curvedLines,
      animationSpeed,
    });

    core.info(`Neural Architecture synthesized: ${graph.activeCount} active nodes, ${graph.synapseCount} synapses.`);

    // 2. Render Main SVG
    const svgContent = renderNeuralNetSvg(graph, {
      username,
      theme,
      maxLinksPerNeuron: maxLinks,
      animationSpeed,
      curvedLines,
    }, datesByWeek);

    // Ensure output directory exists
    const resolvedPath = path.resolve(process.cwd(), outPath);
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(resolvedPath, svgContent, 'utf-8');
    core.info(`✅ Main SVG saved to: ${resolvedPath}`);

    // 3. Generate Variants if requested
    if (generateThemeVariants) {
      const darkPath = resolvedPath.replace(/\.svg$/, '-dark.svg');
      const lightPath = resolvedPath.replace(/\.svg$/, '-light.svg');

      const darkSvg = renderNeuralNetSvg(graph, {
        username,
        theme: 'cyberpunk',
        maxLinksPerNeuron: maxLinks,
        animationSpeed,
        curvedLines,
      }, datesByWeek);
      fs.writeFileSync(darkPath, darkSvg, 'utf-8');
      core.info(`✅ Dark theme SVG saved to: ${darkPath}`);

      const lightSvg = renderNeuralNetSvg(graph, {
        username,
        theme: 'light',
        maxLinksPerNeuron: maxLinks,
        animationSpeed,
        curvedLines,
      }, datesByWeek);
      fs.writeFileSync(lightPath, lightSvg, 'utf-8');
      core.info(`✅ Light theme SVG saved to: ${lightPath}`);
    }

    core.setOutput('svg_path', resolvedPath);
    core.setOutput('total_contributions', graph.totalContributions);
    core.setOutput('active_nodes', graph.activeCount);
    core.setOutput('synapse_count', graph.synapseCount);
    core.setOutput('neural_state', graph.neuralActivityScore);

    core.info('✨ Neural Network generation completed successfully!');
  } catch (error: any) {
    core.setFailed(`Action execution failed: ${error.message}`);
  }
}

run();
