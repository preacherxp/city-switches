# Switch review — 9 November 2026

Eight cities: Warsaw, Berlin, Lisbon, Gliwice, Częstochowa, Katowice, Remscheid and Zabrze.

## Fixed

- Częstochowa shop signs now use larger, spaced KAWA and KSIĄŻKI glyphs, including the Polish accents. Text fits its fascia and stays clear of windows; a redundant sign crossed by the tram pantograph was removed. Scene assertions cover glyphs, spacing and sign bounds.
- The time/city/phase readout now has a stable dark background and light text throughout dusk. Browser checks measure at least 4.5:1 contrast at every captured phase.
- The globe city list stacks city and country labels on narrow phones, preventing long names from colliding with adjacent buttons. Browser assertions check that labels stay inside their buttons.
- Export capture now advances the real scene by exactly 1/60 second per frame. It stops the browser scheduler and asserts scene time, preventing slow screenshots from accelerating animation.

## Evidence

- [Seven-city browser review and exports](https://github.com/preacherxp/city-switches/actions/runs/42653145008): all seven jobs passed.
- [Zabrze browser review and export](https://github.com/preacherxp/city-switches/actions/runs/42655159740): passed.
- [Final globe and video browser review](https://github.com/preacherxp/city-switches/actions/runs/42658884995), source commit `5efab2c`: passed in Chrome. All eight live MP4s played; the globe passed city and cluster selection, rotation by drag and keyboard, zoom, saved state, reduced motion and layouts at 1280, 820, 390 and 320 pixels. Text stayed inside city buttons, markers stayed apart, and no runtime or failed-request errors were recorded. Final screenshots were visually inspected.
- Each switch capture review exercises click, dragging, Home/End, arrows, Space, saved preference and reduced motion. It captures day, dusk, night and dawn at 960, 390 and 320 pixels wide, with viewport and contrast assertions and no runtime/request errors.
- Visual inspection covered the complete physical switches at those phases and representative video frames, including the travelling lens. No unintended clipping or composition overlap was identified in the reviewed captures.
- The real scene-engine check advances every city from noon through sunset, midnight, dawn and the following noon; it validates integer paint coordinates, material IDs, buffer dimensions, startle behavior and reduced-motion time.
- `ffprobe` confirms every final export is H.264/yuv420p, 800 × 500, 60/1 fps, 420 frames and 7.000 seconds. The full frame and moving glass lens remain in view.
- Every deployed MP4 was downloaded from its own city Pages site and matched byte-for-byte against the file in that city's repository. All eight city Pages builds report the published export commit.

## Limits

Switch capture checks use Chromium; the globe and H.264 playback check uses Chrome, which includes the required media codec. Both run with software WebGL on GitHub runners. Phone layouts are emulated; physical phones, Safari and Firefox were not checked. A 60 fps encoded video does not establish 60 fps interactive performance on every device. Research references and the illustrated panoramas are documented separately; the compositions are compressed collages of city landmarks.

Workflow screenshots/video artifacts expire after seven days; the final MP4s stay committed in the city repositories. The workflows and engine checks remain reproducible.
