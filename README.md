# City switches

Interactive pixel-art city scenes inside a glass day/night switch. Each city is
an independent repository and GitHub Pages site, pinned here as a Git submodule.

[Explore the pixel world map](https://preacherxp.github.io/city-switches/) · [Open the gallery](https://preacherxp.github.io/city-switches/gallery.html)

| City | Repository | Demo | 60 fps export |
| --- | --- | --- | --- |
| Warsaw | [warsaw-switch](https://github.com/preacherxp/warsaw-switch) | [Open](https://preacherxp.github.io/warsaw-switch/) | [MP4](https://preacherxp.github.io/warsaw-switch/warsaw-day-night-60fps.mp4) |
| Berlin | [berlin-switch](https://github.com/preacherxp/berlin-switch) | [Open](https://preacherxp.github.io/berlin-switch/) | [MP4](https://preacherxp.github.io/berlin-switch/berlin-day-night-60fps.mp4) |
| Lisbon | [lisbon-switch](https://github.com/preacherxp/lisbon-switch) | [Open](https://preacherxp.github.io/lisbon-switch/) | [MP4](https://preacherxp.github.io/lisbon-switch/lisbon-day-night-60fps.mp4) |
| Gliwice | [gliwice-switch](https://github.com/preacherxp/gliwice-switch) | [Open](https://preacherxp.github.io/gliwice-switch/) | [MP4](https://preacherxp.github.io/gliwice-switch/gliwice-day-night-60fps.mp4) |
| Częstochowa | [czestochowa-switch](https://github.com/preacherxp/czestochowa-switch) | [Open](https://preacherxp.github.io/czestochowa-switch/) | [MP4](https://preacherxp.github.io/czestochowa-switch/czestochowa-day-night-60fps.mp4) |
| Katowice | [katowice-switch](https://github.com/preacherxp/katowice-switch) | [Open](https://preacherxp.github.io/katowice-switch/) | [MP4](https://preacherxp.github.io/katowice-switch/katowice-day-night-60fps.mp4) |
| Remscheid | [remscheid-switch](https://github.com/preacherxp/remscheid-switch) | [Open](https://preacherxp.github.io/remscheid-switch/) | [MP4](https://preacherxp.github.io/remscheid-switch/remscheid-day-night-60fps.mp4) |
| Zabrze | [zabrze-switch](https://github.com/preacherxp/zabrze-switch) | [Open](https://preacherxp.github.io/zabrze-switch/) | [MP4](https://preacherxp.github.io/zabrze-switch/zabrze-day-night-60fps.mp4) |
| Tarnowskie Góry | [tarnowskie-gory-switch](https://github.com/preacherxp/tarnowskie-gory-switch) | [Open](https://preacherxp.github.io/tarnowskie-gory-switch/) | [MP4](https://preacherxp.github.io/tarnowskie-gory-switch/tarnowskie-gory-day-night-60fps.mp4) |
| Nowy Targ | [nowy-targ-switch](https://github.com/preacherxp/nowy-targ-switch) | [Open](https://preacherxp.github.io/nowy-targ-switch/) | [MP4](https://preacherxp.github.io/nowy-targ-switch/nowy-targ-day-night-60fps.mp4) |

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

[Review findings and validation evidence](REVIEW.md)

```sh
node tools/validate-switches.cjs
node tools/check-composition.cjs
node tools/test-globe.mjs
```

`check-composition.cjs` builds every real scene and fails when a sign leaves the
switch's visible window, when later scenery paints over a sign, or when a light
is in a different state at the two noons the lens passes through.

Each city repository's **Export video** workflow re-records its MP4 automatically whenever the scene changes on `main`, and commits it. The central **Review and capture switches** GitHub Actions workflow can still be run manually
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

## Map

The home page is a flat, zoomable pixel-art world map (`globe.mjs`, `globe.css`). It is painted one logical pixel per cell into a canvas and scaled up without smoothing, like the switches. Land, lakes, rivers, borders, deserts and mountain ranges come from local Natural Earth 1:50m data; city centres come from GeoNames. See [data sources](data/README.md). The map's colours follow the selected switch from day to night, and city footprints light up after dark.

Drag or use the arrow keys to pan; scroll, pinch, double-click, `+`/`−` or the buttons to zoom from the whole world down to neighbouring cities. `0` shows the whole world and `Home` returns to the selected city. Nearby markers are grouped; selecting a group zooms in until its cities separate. Every city is also available in an accessible list. The selected panel runs the original switch directly from its submodule. `cities.json` contains the catalogue and coordinates. No map service or API key is used.

Run `node tools/test-globe.mjs` and the **Review globe** workflow for actual-browser checks of all ten selections, grouped markers, dragging, keyboard and wheel zoom, the map following night, saved switch state, reduced motion, responsive layouts and video playback.

## Attribution

The engine is derived from `tokyo-switch.js`; the original idea is
“住人のいるスイッチ” by @Lattice_Node
([original project](https://ludion.ai/p/toggle-daylight), MIT), as credited in the
engine source. Each city README records its landmark references.

[Zabrze landmark research and image references](research/zabrze.md)
