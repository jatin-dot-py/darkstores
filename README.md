# darkstores.intel — Quick Commerce Intelligence

An interactive map of dark store locations across India for Zepto, Blinkit, and Swiggy (Instamart).

**Live:** [darkstores-heatmap.vercel.app](https://darkstores-heatmap.vercel.app)

![All India Dark Stores](public/all-india-dark-stores.png)

## Features

- **14,000+ store locations** across Zepto, Blinkit, and Swiggy Instamart
- **Heatmap view** — density visualization showing quick-commerce coverage intensity across India
- **Marker view** — clustered pins with per-store popups and Google Maps links
- **Zepto delivery zones** — geofence polygons shown at high zoom
- **Blinkit accuracy filter** — toggle imprecise (trilaterated) markers
- **CSV export** — download raw coordinates for each brand
- **Dark / light theme** — persisted to localStorage

## Data

| Brand | Stores | Scraped |
|---|---|---|
| Zepto | ~9,000 | 14–15 March 2026 |
| Blinkit | ~2,400 | 15–17 March 2026 |
| Swiggy Instamart | ~3,000 | 18–19 March 2026 |

Locations sourced from public-facing APIs. Blinkit coordinates are trilaterated (0–50m accuracy for most stores). All figures are a lower bound.

Read the [technical write-up on Medium](https://jatin-dot-py.medium.com/how-i-scraped-most-dark-stores-in-india-blinkit-zepto-swiggy-instamart-ad939ff17af9).

## Stack

- Vanilla JS + [Leaflet.js](https://leafletjs.com) + [leaflet.heat](https://github.com/Leaflet/Leaflet.heat) + [MarkerCluster](https://github.com/Leaflet/Leaflet.markercluster)
- CARTO map tiles (dark + light)
- Static files — no build step, no server

## Run locally

```bash
cd public
python3 -m http.server 3000
# open http://localhost:3000
```

## Deploy

Any static host works (Vercel, Netlify, Cloudflare Pages, GitHub Pages). Set the root/publish directory to `public/`.
