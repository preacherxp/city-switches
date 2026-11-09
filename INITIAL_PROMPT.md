# Starting prompt for a city switch

Copy the prompt below and replace the bracketed fields. Read `AGENTS.md` alongside
it; that file defines the implementation contract and completion checks.

---

Create a contemporary **[CITY NAME]** day/night switch in the style of the city
switches in this repository. Use **[ASCII CITY SLUG]-switch** as the custom element
and repository name.

First read `AGENTS.md`, `city-switch.js` in an existing city repository, and two
existing scenes. Reuse the engine and its physical frame, refracting glass lens,
spring motion, accessible controls, and event API. Build the city as a standalone
plain-JavaScript scene; keep the demo dependency-free.

Include these recognizable places: **[3–4 LANDMARKS OR VENUES, WITH ADDRESSES IF
IMPORTANT]**. Verify their current appearance with official references. Present a
believable contemporary city: current public spaces, businesses, transport,
street furniture, and people. Keep the pixel-art style; avoid adding a retro era
or generic industrial imagery unless it belongs to the requested scene.

Give the composition one dominant landmark, supporting silhouettes, clear sign
areas, and an uncluttered foreground. Plan the bounds and depth of buildings,
trees, lettering, and actor paths before adding fine detail. Check them inside
the actual pill-shaped viewport and through the moving lens. Remove accidental
overlap, clipping, and visual crowding.

Make the city feel alive with **[2–3 CITY-SPECIFIC ACTIVITIES, E.G. A CURRENT TRAM,
CAFÉ TERRACE, RIVER TRAFFIC, FOUNTAIN, OR CYCLIST]**. Animate a coherent afternoon,
sunset, night, dawn, and next noon. Use time-based motion, sensible lighting
schedules, and reduced-motion behavior. Every animation must reset or wrap
cleanly and keep the intended depth throughout its cycle.

Provide the scene, an independent demo, a short README with reference links and
usage, and a small engine smoke test. Add it to the central gallery and, when
requested, register its separate Git repository as a central-repo submodule.
Update the central globe catalogue, scene scripts, gallery, video page and README
when those files exist, including sourced city coordinates. Commit the final MP4
in its city repository and link it from the demo and README when an export is
requested. Preserve existing attribution and any unrelated user changes.

Before finishing, run syntax and asset checks and the scene test. In a real
WebGL browser, inspect desktop and phone layouts at noon, dusk, night, and dawn,
with the lens at both endpoints and intermediate positions. Watch complete
animation cycles. Exercise pointer, drag, keyboard, restored preference, resizing,
and reduced motion. Fix observed defects and repeat the affected checks.

**Publication:** [LOCAL ONLY / CREATE A SEPARATE PUBLIC GITHUB REPOSITORY AND
PUBLISH ITS DEMO ON GITHUB PAGES]. If publication is requested, verify the deployed
commit, successful deployment, live HTML, and assets. Commit the central repo's
submodule pointer only after the referenced city commit exists remotely.

**Optional shareable preview:** [NONE / A 7-SECOND FULL-SWITCH MP4 AT 60 FPS / GIF].
For an export, record the actual browser-rendered control, including its frame,
moving glass lens, animated city, and day/night return. A city-only animation
does not satisfy a full-switch export.

Finish with the repository/demo/download links, what was checked, and any real
limitations. Keep the reply brief.
