# 🎸 Guitar Villain

A Guitar Hero–style browser rhythm game built around **“Angels — Mary by the Cross.”** Notes fall down a four-lane perspective highway toward the strike line; hit them in time to build streaks, fill Angel Power, and score.

## ▶️ Play

**GitHub Pages:** https://mtreller.github.io/Guitar-Villain/

For best results, open the game in a normal browser tab. On iPhone, make sure the silent/mute switch is off.

## 🎮 Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Hit lanes | `D` `F` `J` `K` | Tap the four glowing frets |
| Hold notes | Hold the key | Keep your finger down |
| Angel Power | `Space` | On-screen button |
| Pause / resume | `Esc` | Pause button |

Multi-touch is supported for chords.

## ✨ Features

- Four-lane 3D perspective highway with neon rails and beat-synced movement.
- Dimensional note pucks, sustain notes, particles, hit judgments, combo multipliers, health, accuracy, Angel Power, and star-rated results.
- Synthesized per-lane hit sounds and gameplay effects generated with the Web Audio API.
- Exact original four difficulty charts:

| Tier | Notes | Density |
| --- | ---: | ---: |
| Easy | 271 | ~0.9 notes/sec |
| Medium | 446 | ~1.4 notes/sec |
| Hard | 729 | ~2.3 notes/sec |
| Expert | 957 | ~3.0 notes/sec |

Medium is the recommended first run.

## 🥁 Chart generation

The charts were generated from the track itself using onset and spectral analysis:

1. The MP3 was decoded to raw PCM.
2. A spectral-flux onset detector found musical attacks.
3. Tempo was estimated at roughly **136 BPM**.
4. Onsets were mapped across lanes using spectral centroid information.
5. Onset strength and sustained regions were used to create the difficulty tiers and hold notes.

## 🔊 Audio architecture

The production build intentionally uses **one Web Audio timeline for gameplay**:

1. `assets/Angels - Mary by the cross.mp3` is fetched and browser-cached.
2. The MP3 is decoded into an `AudioBuffer` after the player presses Play.
3. Music and synthesized SFX share the same `AudioContext`.
4. Gameplay timing follows `AudioContext.currentTime`, keeping the chart and song on one clock.
5. The native `<audio>` element is retained only as a compatibility fallback when Web Audio is unavailable.

This avoids the timing and restart problems that can occur when music uses `<audio>` while gameplay SFX use a separate Web Audio clock.

## 📱 Performance strategy

The renderer adapts for touch/mobile devices:

- Lower canvas device-pixel-ratio cap on mobile.
- Smaller particle bursts on successful hits.
- Lighter synthesized hit effects on mobile.
- Reduced sustain-tick frequency.
- Web Animations instead of forced synchronous layout for combo feedback.
- Song decoding completes before the countdown begins.

## 🛠️ Project structure

- `index.html` — page shell and script loading order.
- `styles.css` — interface and HUD styling.
- `engine.js` — Web Audio engine, track loading/decoding, geometry, and shared state.
- `gameplay.js` — controls, judgments, scoring, hit effects, and update loop.
- `render.js` — Canvas highway, notes, frets, particles, and visual effects.
- `flow.js` — start/countdown/pause/resume/results flow.
- `chart-base.js` / `chart-*.js` — BPM, duration, and exact difficulty charts.
- `assets/Angels - Mary by the cross.mp3` — source track.

No framework or build step is required; GitHub Pages serves the files directly.
