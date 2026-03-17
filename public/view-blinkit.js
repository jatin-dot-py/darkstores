/* ─────────────────────────────────────────
   view-blinkit.js
   Blinkit-specific view: yellow clustered
   markers, accuracy breakdown panel.
   accuracy = GPS error in metres; 0 = perfect.
   Imprecise label shown when accuracy > 100.
───────────────────────────────────────── */

window.BlinkitView = (function () {

    let _map, _data;
    let _markerGroup = null;

    /* ── ICONS ── */
    function blinkitIcon(imprecise) {
        const col = imprecise ? '#fb923c' : '#F0E030';
        const glow = imprecise ? 'rgba(251,146,60,0.55)' : 'rgba(240,224,48,0.6)';
        return L.divIcon({
            className: '',
            html: `<div style="
        width:9px;height:9px;
        background:${col};
        border-radius:50%;
        border:1.5px solid ${glow};
        box-shadow:0 0 10px ${glow}
      "></div>`,
            iconSize: [9, 9],
            iconAnchor: [4.5, 4.5],
            popupAnchor: [0, -8],
        });
    }

    /* ── BUILD MARKER LAYER ── */
    function buildMarkerLayer() {
        const lg = L.layerGroup();

        _data.forEach(s => {
            if (!s.coordinates) return;
            const [lat, lng] = s.coordinates;
            const imprecise = s.accuracy > 100;
            const gmaps = `https://www.google.com/maps?q=${lat},${lng}`;
            const badge = imprecise
                ? `<span class="acc-badge imprecise">⚠ Imprecise location</span>`
                : `<span class="acc-badge precise">✓ Precise location</span>`;

            const popup = `<div class="popup-body">
        <div class="popup-platform blinkit">Blinkit</div>
        <div class="popup-name">Store #${s.id}</div>
        <div class="popup-meta">${badge}</div>
        <a class="popup-gmaps blinkit-maps" href="${gmaps}" target="_blank" rel="noopener">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          Open in Google Maps
        </a>
      </div>`;

            L.marker([lat, lng], { icon: blinkitIcon(imprecise), riseOnHover: true })
                .bindPopup(popup, { maxWidth: 250, className: '' })
                .addTo(lg);
        });

        return lg;
    }

    /* ── PANEL ── */
    function renderPanel(precise, total) {
        const imprecise = total - precise;

        const panel = document.getElementById('panel');
        panel.innerHTML = `
      <div class="panel-section-label">Location Accuracy</div>

      <div class="acc-row">
        <div class="acc-left">
          <div class="acc-dot" style="background:#F0E030;box-shadow:0 0 6px rgba(240,224,48,0.45)"></div>
          Precise
        </div>
        <div class="acc-count" style="color:#F0E030">${precise.toLocaleString()}</div>
      </div>

      <div class="acc-row">
        <div class="acc-left">
          <div class="acc-dot" style="background:#fb923c;box-shadow:0 0 6px rgba(251,146,60,0.45)"></div>
          Imprecise
        </div>
        <div class="acc-count" style="color:#fb923c">${imprecise.toLocaleString()}</div>
      </div>

      <hr class="panel-divider">

      <div style="display:flex;align-items:center;justify-content:center;gap:6px;padding:2px 0">
        <span style="font-size:12px;color:var(--muted2)">Total</span>
        <span style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:#F0E030">${total.toLocaleString()}</span>
        <span style="font-size:12px;color:var(--muted2)">dark stores</span>
      </div>

      <div class="acc-footnote">
        Coordinates derived via triangulation.<br>
        Orange pins = imprecise location.
      </div>`;
    }

    /* ── TOPBAR STATS ── */
    function renderStats(precise, total) {
        const imprecise = total - precise;
        document.getElementById('topbarStats').innerHTML = `
      <div class="stat-chip">
        <div class="stat-val" style="color:#F0E030">${total.toLocaleString()}</div>
        <div class="stat-lbl">Stores</div>
      </div>
      <div class="stat-sep"></div>
      <div class="stat-chip">
        <div class="stat-val" style="color:#F0E030">${precise.toLocaleString()}</div>
        <div class="stat-lbl">Precise</div>
      </div>
      <div class="stat-sep"></div>
      <div class="stat-chip">
        <div class="stat-val" style="color:#fb923c">${imprecise.toLocaleString()}</div>
        <div class="stat-lbl">Imprecise</div>
      </div>`;
    }

    /* ── PUBLIC API ── */
    return {
        mount(map, data) {
            _map = map;
            _data = data;

            const total = data.length;
            const precise = data.filter(s => s.accuracy <= 100).length;

            renderStats(precise, total);
            renderPanel(precise, total);

            _markerGroup = buildMarkerLayer();
            _markerGroup.addTo(_map);
        },

        unmount() {
            if (_markerGroup) { _map.removeLayer(_markerGroup); _markerGroup = null; }
        },

        getVisibleCount(bounds) {
            return _data.filter(s =>
                s.coordinates && bounds.contains(s.coordinates)
            ).length;
        },
    };
})();