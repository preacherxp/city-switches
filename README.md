# City switches

Interactive pixel-art city scenes inside a glass day/night switch. Each city is
an independent repository and GitHub Pages site, pinned here as a Git submodule.

[Explore the 3D globe](https://preacherxp.github.io/city-switches/) · [Open the gallery](https://preacherxp.github.io/city-switches/gallery.html)

| City | Repository | Demo | 60 fps export |
| --- | --- | --- | --- |
| Warsaw | [warsaw-switch](https://github.com/preacherxp/warsaw-switch) | [Open](https://preacherxp.github.io/warsaw-switch/)  [MP4](https://preacherxp.github.io/warsaw-switch/warsaw-day-night-60fps.mp4) |
| Berlin | [berlin-switch](https://github.com/preacherxp/berlin-switch) | [Open](https://preacherxp.github.io/berlin-switch/)  [MP4](https://preacherxp.github.io/berlin-switch/berlin-day-night-60fps.mp4) |
| Lisbon | [lisbon-switch](https://github.com/preacherxp/lisbon-switch) | [Open](https://preacherxp.github.io/lisbon-switch/)  [MP4](https://preacherxp.github.io/lisbon-switch/lisbon-day-night-60fps.mp4) |
| Gliwice | [gliwice-switch](https://github.com/preacherxp/gliwice-switch) | [Open](https://preacherxp.github.io/gliwice-switch/)  [MP4](https://preacherxp.github.io/gliwice-switch/gliwice-day-night-60fps.mp4) |
| Częstochowa | [czestochowa-switch](https://github.com/preacherxp/czestochowa-switch) | [Open](https://preacherxp.github.io/czestochowa-switch/)  [MP4](https://preacherxp.github.io/czestochowa-switch/czestochowa-day-night-60fps.mp4) |
| Katowice | [katowice-switch](https://github.com/preacherxp/katowice-switch) | [Open](https://preacherxp.github.io/katowice-switch/)  [MP4](https://preacherxp.github.io/katowice-switch/katowice-day-night-60fps.mp4) |
| Remscheid | [remscheid-switch](https://github.com/preacherxp/remscheid-switch) | [Open](https://preacherxp.github.io/remscheid-switch/)  [MP4](https://preacherxp.github.io/remscheid-switch/remscheid-day-night-60fps.mp4) |
| Zabrze | [zabrze-switch](https://github.com/preacherxp/zabrze-switch) | [Open](https://preacherxp.github.io/zabrze-switch/)  [MP4](https://preacherxp.github.io/zabrze-switch/zabrze-day-night-60fps.mp4) |

[Download the 60 fps full-switch videos](https://preacherxp.github.io/city-switches/videos.html)

## Run locally

```sh
git clone --recurse-submodules https://github.com/preacherxp/city-switches.git
cd city-switches
python3 -m http.server 8000
```

Open http://localhost:8000. For an existing checkout, run
`git submodule update --init --recursive` first. No application build or runtime
dependencies are needed.

## Create another city

Use [the starting prompt](INITIAL_PROMPT.md) and [the agent guide](AGENTS.md).
The guide covers the engine contract, composition, depth, animation, accessibility,
real-browser validation, full-switch video capture, and publication.

## Validate

```sh
node tools/validate-switches.cjs
node tools/test-globe.mjs
```

The **Review and capture switches** GitHub Actions workflow can be run manually
to capture each complete control as a seven-second H.264 MP4 at 60 fps. Recording
dependencies are installed only in the runner. The static demos stay buildless. Final MP4s are kept in each city’s own repository and linked from `videos.html`.

This checks syntax, standalone assets, matching engine copies, the full time
cycle, valid pixel painting, and reduced motion for every city. Browser review
also captures desktop, phone, narrow-screen, intermediate-lens, and dawn states;
it exercises pointer and keyboard behavior and checks runtime errors.

## Update a city

Commit and publish changes inside its `repos/<city>-switch` repository first.
Then commit that submodule's new pointer in this repository. Pinned submodules
keep the gallery reproducible; they do not automatically follow the newest city
commit. All submodule URLs use public HTTPS repositories for GitHub Pages.

The gallery loads one compatible engine and the city scene files directly from
the submodules. Keep the engine copies compatible and test all cities after an
engine change. Each city's own demo continues to load its own engine.

## Globe

The native WebGL globe uses a local Natural Earth land map and GeoNames city centres; see [data sources](data/README.md). Drag, keyboard arrows and zoom buttons work without map services or API keys. Nearby markers are grouped, and every city is also available in an accessible list. The selected panel runs the original switch directly from its submodule. `cities.json` contains the catalogue and coordinates.

Run the **Review globe** workflow for actual-browser checks of all eight selections, grouped pins, dragging, keyboard controls, zoom, saved switch state, reduced motion, responsive layouts and video playback.

## Attribution

The engine is derived from `tokyo-switch.js`; the original idea is
“住人のいるスイッチ” by @Lattice_Node
([original project](https://ludion.ai/p/toggle-daylight), MIT), as credited in the
engine source. Each city README records its landmark references.

[Zabrze landmark research and image references](research/zabrze.md)
