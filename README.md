# Neural Contribution Network (neural-contribution-net)

Bioluminescent animated neural network generated directly from your GitHub contribution graph for your profile `README.md`.

---

## Features

- **Biological Neural Architecture**: Maps the 53-week contribution calendar into a layered feedforward graph.
- **Dynamic Synapse Routing**: Smart nearest-neighbor connections between active days with curved cubic Bezier paths.
- **Bioluminescent Impulses**: Signal pulses traverse the synapses from past weeks to present using pure SVG + CSS `@keyframes`.
- **Zero Runtime Dependencies for README**: Generates self-contained SVGs that render natively in GitHub markdown without external JavaScript.
- **7 Color Palettes**:
  - `cyberpunk` (default): Neon cyan, deep violet, and crimson overload spikes.
  - `matrix`: Electric terminal green, cyber lime, and breach amber.
  - `synthwave`: Retro sunset magenta, hot pink, and ultraviolet.
  - `aurora`: Northern teal, emerald, and arctic blue.
  - `solaris`: Solar gold, plasma orange, and flare red.
  - `monochrome`: Carbon dark, platinum white, and slate accents.
  - `light`: Clean daylight laboratory scheme for light-themed profiles.

---

## Quick Start (Profile Repository)

Add this workflow to `.github/workflows/neural-net.yml` in your `<username>/<username>` repository:

```yaml
name: Update Neural Graph

on:
  schedule:
    - cron: '0 0 * * *'
  workflow_dispatch:
  push:
    branches: [main]

permissions:
  contents: write

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate Neural Network SVG
        uses: GodFuper/neural-contribution-net@v1
        with:
          github_user_name: ${{ github.repository_owner }}
          svg_out_path: dist/neural-net.svg
          theme: cyberpunk
          animation_speed: normal
          max_links_per_neuron: 3

      - name: Commit SVG
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add dist/neural-net*.svg
          git diff --staged --quiet || (git commit -m "chore: refresh neural activity graph" && git push)
```

In your profile `README.md`:

```markdown
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./dist/neural-net.svg" />
  <source media="(prefers-color-scheme: light)" srcset="./dist/neural-net-light.svg" />
  <img src="./dist/neural-net.svg" alt="Neural Contribution Network" width="100%" />
</picture>
```

---

## Local CLI Usage

Generate previews locally without GitHub Actions:

```bash
# Generate preview for all 7 themes using synthetic activity:
npm run generate:all-demos

# Generate for a specific user via GraphQL API:
npx tsx src/cli.ts --user YOUR_USERNAME --token YOUR_GITHUB_TOKEN --theme matrix --out dist/my-graph.svg
```

---

## Configuration Options

| Input | Description | Default |
| :--- | :--- | :--- |
| `github_user_name` | GitHub username to fetch | Repository owner |
| `github_token` | Token for GraphQL queries | `GITHUB_TOKEN` |
| `svg_out_path` | Output path for main SVG | `dist/neural-net.svg` |
| `theme` | Palette (`cyberpunk`, `matrix`, `synthwave`, `aurora`, `solaris`, `monochrome`, `light`) | `cyberpunk` |
| `animation_speed` | Pulse speed (`slow`, `normal`, `fast`) | `normal` |
| `max_links_per_neuron` | Outgoing synapse limit (1 to 4) | `3` |
| `curved_lines` | Use cubic Bezier curves (`true` / `false`) | `true` |
| `generate_theme_variants` | Export `-dark.svg` and `-light.svg` files | `true` |
