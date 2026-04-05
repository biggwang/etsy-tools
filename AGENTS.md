# Repository Guidelines

## Project Structure & Module Organization
This repository is a small browser-only app with no build step. `index.html` wires the UI, `index.css` contains the layout and visual styles, and `js/` holds the ES modules: `app.js` for UI flow, `engine.js` for Photopea iframe messaging, and `files.js` for client-side file handling. Planning and design notes live in `docs/superpowers/`. Sample screenshots and artwork files in the repo root are for manual verification only.

## Build, Test, and Development Commands
- `python3 -m http.server 8000` — serve the repo locally for browser testing.
- `open http://localhost:8000` — open the app after starting the server on macOS.
- `open index.html` — quick static smoke check when a server is unnecessary.

There is no package manager, bundler, or formal build pipeline in this project.

## Coding Style & Naming Conventions
Use vanilla HTML, CSS, and JavaScript ES modules. Match the existing style: 4-space indentation, semicolons, single quotes in JS, and short section comments such as `// === 초기화 ===`. Prefer `camelCase` for variables/functions, `PascalCase` for classes, and kebab-free DOM ids/classes that align with current names like `mockup-upload` and `progress-fill`. Keep modules focused; extend existing files before adding new abstractions.

## Testing Guidelines
No automated test suite is configured yet. Verify changes manually in the browser with one artwork image and multiple PSD files. At minimum, test upload validation, drag-and-drop, Photopea readiness, per-file processing, preview rendering, and JPG export. If you add automated tests later, place them under a new `tests/` directory and name files `*.test.js`.

## Commit & Pull Request Guidelines
Current history uses short, imperative commit subjects (for example, `Initial commit: Etsy Mockup Automator with Photopea integration`). Keep subjects concise, then follow the repository’s Lore protocol for the body and trailers when committing. PRs should include: a brief summary, impacted files, manual test evidence, linked issues if applicable, and screenshots or screen recordings for UI changes.

## Security & Configuration Tips
Do not commit customer artwork, PSD assets, or exported JPGs. The app depends on `photopea.com`, so test with network access and note any iframe or browser permission issues in your PR.
