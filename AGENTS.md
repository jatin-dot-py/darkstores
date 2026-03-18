# AGENTS.md

## Cursor Cloud specific instructions

This is a pure static website (HTML/CSS/vanilla JS) with no build tools, no package manager, and no backend. All third-party libraries are loaded from CDNs.

### Running the dev server

Serve the `public/` directory with any static HTTP server. The app uses `fetch()` for JSON data, so `file://` protocol will not work.

```bash
cd /workspace/public && python3 -m http.server 3000
```

Then open `http://localhost:3000` in the browser.

### Key notes

- **No lint/test/build steps exist.** There is no `package.json`, no test framework, and no linter configured.
- **Internet required.** Leaflet.js, MarkerCluster, Google Fonts, and CARTO map tiles are loaded from CDNs.
- **All data is static JSON** (`zepto.json`, `blinkit.json`, `swiggy.json`) served alongside `index.html`.
- The only files to edit are in `public/`: `index.html`, `style.css`, `app.js`, `view-combined.js`.
