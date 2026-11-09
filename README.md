# City switches

Interactive pixel-art city scenes inside a glass day/night switch. Each city is
an independent repository and GitHub Pages site, pinned here as a Git submodule.

[Open the gallery](https://preacherxp.github.io/city-switches/)

| City | Repository | Demo |
| --- | --- | --- |
| Warsaw | [warsaw-switch](https://github.com/preacherxp/warsaw-switch) | [Open](https://preacherxp.github.io/warsaw-switch/) |
| Berlin | [berlin-switch](https://github.com/preacherxp/berlin-switch) | [Open](https://preacherxp.github.io/berlin-switch/) |
| Lisbon | [lisbon-switch](https://github.com/preacherxp/lisbon-switch) | [Open](https://preacherxp.github.io/lisbon-switch/) |
| Gliwice | [gliwice-switch](https://github.com/preacherxp/gliwice-switch) | [Open](https://preacherxp.github.io/gliwice-switch/) |
| Częstochowa | [czestochowa-switch](https://github.com/preacherxp/czestochowa-switch) | [Open](https://preacherxp.github.io/czestochowa-switch/) |

[Download the full animated Gliwice switch GIF](https://preacherxp.github.io/gliwice-switch/gliwice-day-night.gif)

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
real-browser validation, full-switch GIF capture, and publication.

## Validate

```sh
node tools/validate-switches.cjs
```

This checks syntax, standalone assets, matching engine copies, the full time
cycle, valid pixel painting, and reduced motion for every city. Browser review
also captures desktop, phone, narrow-screen, intermediate-lens, and dawn states;
it exercises pointer and keyboard behavior and checks runtime errors.

## Update a city

Commit and publish changes inside its `repos/<city>-switch` repository first.
Then commit that submodule's new pointer in this repository. Pinned submodules
keep the gallery reproducible; they do not automatically follow the newest city
commit. All submodule URLs use public HTTPS repositories for GitHub Pages.

The gallery loads one compatible engine and the five scene files directly from
the submodules. Keep the engine copies compatible and test all cities after an
engine change. Each city's own demo continues to load its own engine.

## Attribution

The engine is derived from `tokyo-switch.js`; the original idea is
“住人のいるスイッチ” by @Lattice_Node
([original project](https://ludion.ai/p/toggle-daylight), MIT), as credited in the
engine source. Each city README records its landmark references.
