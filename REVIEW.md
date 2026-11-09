# Switch review — 9 November 2026

Eight cities: Warsaw, Berlin, Lisbon, Gliwice, Częstochowa, Katowice, Remscheid and Zabrze.

An earlier version of this file said no unintended clipping or overlap was found. A second review, using actor strips (60 s of real scene time per city) and the new `tools/check-composition.cjs`, showed that was wrong. Every defect below had passed the syntax, engine and scene tests.

## Fixed

- **Katowice:** pedestrians and the cyclist walked through the fountain, so the fountain moved to the back of the square, behind the walking lanes. Lamp poles and a tree cut the Spodek; they were moved or removed. The Spodek is now a flat saucer on an inverted cone. Distant blocks no longer turn violet at dusk and dawn.
- **Częstochowa:**
  - Pedestrians appeared to stand on the tram roof and inside the pantograph, and walked through the café terraces. Walkers now use a lane by the shops, with the terraces and the tram in front of them.
  - The contact wire crossed every shopfront; it now hangs low between masts.
  - KSIĄŻKI was moved inside the window.
  - The Jasna Góra clock was moved up the tower.
- **Gliwice:**
  - TEATR MUZYCZNY was clipped by the left end, and BEER BROTHERS and its "30" plaque sat outside the window. A lamp pole made the "30" read "3]". The signs now sit inside the window and the plaque is beside the door.
  - Pedestrians crossed the café tables; they now walk in front of them.
- **Zabrze:** DMIT read "OMIT" at the left end. It now follows the research order (Carnall, tower, DMiT, Arena), with the Arena inside the window. Lamps read as lamps, and the cyclist's lane is visible.
- **Remscheid:** VAILLANT read "UAILLANT" in the 3 × 5 font; it now uses the 5 × 7 font with a small hare emblem. A lamp stood in front of house windows, and the hotel H was clipped.
- **Warsaw:**
  - WARSZAWA was clipped by the left curve, and its posts and an aerial ran through the letters.
  - An all-day pharmacy light now agrees at both noons.
- **Berlin:** the BIER sign has moved inside the window. The DöNER board now sits in front of the bridge abutment. Club neons no longer blink off when the lens settles.
- **Lisbon:**
  - Several signs were cut by doors, railings or window frames.
  - TASCA was outside the window.
  - The vertical HOTEL sign covered a pylon of Ponte 25 de Abril; it now hangs below the deck.
- **All cities:** every light group now has the same state at hours 12 and 36. The lens returns from 36 to 12 when it settles, so any difference snapped visibly. Some café windows in Gliwice and Częstochowa are therefore unlit at noon.
- **Accessibility:** Warsaw, Berlin and Lisbon used the engine's default accessible name "Dark mode"; each is now "<City> day and night".

## Accepted after inspection

- **Berlin SPÄTI:** the Ampelmann pole covers only the blank last column of the board.
- **Lisbon PENSAO:** the flagged pixels are its own hand-drawn tilde.

## Evidence

- `node tools/check-composition.cjs`: all eight cities report their signs inside the window and unobstructed, and lights agreeing at both noons.
- `node tools/validate-switches.cjs` passes, and so do the five city `test-scene.cjs` files.
- Before and after switch captures (960, 390 and 320 px; noon, dusk, night, dawn) and noon/night actor strips were inspected for every changed city.
- The map and video review passed in Chrome in GitHub Actions ([run](https://github.com/preacherxp/city-switches/actions/runs/42673205402)), and locally after these changes.

## Limits

- The composition check only sees signs drawn with the engine's `hsign` and `vsign`. Warsaw's rooftop sign uses its own helper and was checked by eye.
- Actor collisions are found by looking at strips, not by an automated test.
- Captures use Chrome with software WebGL. Phone layouts are emulated, and physical phones, Safari and Firefox were not checked.
- Zabrze and Remscheid remain sparser than the original three. Zabrze still lacks the tram its research recommends, and Remscheid lacks a civic landmark.
