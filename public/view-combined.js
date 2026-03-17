/* ─────────────────────────────────────────
   view-combined.js
   Shows Zepto (purple pins) + Blinkit (yellow
   clustered pins) on a single map layer.
   No geofences in combined mode.
───────────────────────────────────────── */

window.CombinedView = (function () {

    let _map, _zData, _bData;
    let _zLayer = null;
    let _bCluster = null;
    let _showZ = true;
    let _showB = true;

    /* ── ICONS ── */
    function zeptoIcon() {
        return L.divIcon({
            className: '',
            html: `<div style="
        width:8px;height:8px;
        background:#8B5CF6;
        border-radius:50%;
        border:1.5px solid rgba(139,92,246,0.35);
        box-shadow:0 0 8px rgba(139,92,246,0.55)
      "></div>`,
            iconSize: [8, 8],
            iconAnchor: [4, 4],
            popupAnchor: [0, -7],
        });
    }

    function blinkitIcon(imprecise) {
        const col = imprecise ? '#fb923c' : '#F0E030';
        const glow = imprecise ? 'rgba(251,146,60,0.5)' : 'rgba(240,224,48,0.55)';
        return L.divIcon({
            className: '',
            html: `<div style="
        width:8px;height:8px;
        background:${col};
        border-radius:50%;
        border:1.5px solid ${glow};
        box-shadow:0 0 8px ${glow}
      "></div>`,
            iconSize: [8, 8],
            iconAnchor: [4, 4],
            popupAnchor: [0, -7],
        });
    }

    function clusterIcon(count) {
        const size = count > 300 ? 44 : count > 80 ? 36 : count > 20 ? 30 : 24;
        const fs = size > 30 ? 12 : 10;
        return L.divIcon({
            className: '',
            html: `<div class="bk-cluster" style="width:${size}px;height:${size}px;font-size:${fs}px">${count}</div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
        });
    }

    /* ── BUILD ZEPTO LAYER ── */
    function buildZeptoLayer() {
        const lg = L.layerGroup();
        _zData.forEach(s => {
            if (!s.lat || !s.lng) return;
            const gmaps = `https://www.google.com/maps?q=${s.lat},${s.lng}`;
            const popup = `<div class="popup-body">
        <div class="popup-platform zepto">Zepto</div>
        <div class="popup-name">${s.name || 'Store ' + s.id}</div>
        <div class="popup-meta">
          <span>📍 ${s.city || '—'}</span>
          <span>${s.state || '—'}</span>
        </div>
        <a class="popup-gmaps zepto-maps" href="${gmaps}" target="_blank" rel="noopener">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          Open in Google Maps
        </a>
      </div>`;
            L.marker([s.lat, s.lng], { icon: zeptoIcon(), riseOnHover: true })
                .bindPopup(popup, { maxWidth: 250, className: '' })
                .addTo(lg);
        });
        return lg;
    }

    /* ── BUILD BLINKIT LAYER ── */
    function buildBlinkitLayer() {
        const lg = L.layerGroup();

        _bData.forEach(s => {
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
    function renderPanel() {
        const panel = document.getElementById('panel');
        const zCount = _zData.length;
        const bCount = _bData.length;
        const total = zCount + bCount;

        panel.innerHTML = `
      <div class="panel-section-label">Platforms</div>

      <div class="legend-item">
        <div class="legend-left">
          <div class="legend-blob" style="background:#8B5CF6;box-shadow:0 0 7px rgba(139,92,246,0.5)"></div>
          <div class="legend-name">Zepto</div>
        </div>
        <div class="legend-right">
          <div class="legend-count" style="color:#A78BFA">${zCount.toLocaleString()}</div>
          <button class="toggle on" id="toggleZ" title="Toggle Zepto stores"></button>
        </div>
      </div>

      <div class="legend-item">
        <div class="legend-left">
          <div class="legend-blob" style="background:#F0E030;box-shadow:0 0 7px rgba(240,224,48,0.45)"></div>
          <div class="legend-name">Blinkit</div>
        </div>
        <div class="legend-right">
          <div class="legend-count" style="color:#F0E030">${bCount.toLocaleString()}</div>
          <button class="toggle on" id="toggleB" title="Toggle Blinkit stores"></button>
        </div>
      </div>

      <hr class="panel-divider">

      <div style="display:flex;align-items:center;justify-content:center;gap:6px;padding:2px 0">
        <span style="font-size:10px;color:var(--muted2)">Total</span>
        <span style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--text)">${total.toLocaleString()}</span>
        <span style="font-size:10px;color:var(--muted2)">dark stores</span>
      </div>

      <div style="font-size:9px;color:var(--muted);text-align:center;line-height:1.6;margin-top:2px">
        Zoom in to see individual pins.<br>Blinkit markers cluster at city level.
      </div>`;

        document.getElementById('toggleZ').onclick = e => {
            _showZ = !_showZ;
            e.currentTarget.classList.toggle('on', _showZ);
            if (_showZ) _zLayer.addTo(_map);
            else _map.removeLayer(_zLayer);
        };

        document.getElementById('toggleB').onclick = e => {
            _showB = !_showB;
            e.currentTarget.classList.toggle('on', _showB);
            if (_showB) _bCluster.addTo(_map);
            else _map.removeLayer(_bCluster);
        };
    }

    /* ── STATS BAR ── */
    function renderStats() {
        document.getElementById('topbarStats').innerHTML = `
      <div class="stat-chip">
        <div class="stat-val" style="color:#A78BFA">${_zData.length.toLocaleString()}</div>
        <div class="stat-lbl">Zepto</div>
      </div>
      <div class="stat-sep"></div>
      <div class="stat-chip">
        <div class="stat-val" style="color:#F0E030">${_bData.length.toLocaleString()}</div>
        <div class="stat-lbl">Blinkit</div>
      </div>
      <div class="stat-sep"></div>
      <div class="stat-chip">
        <div class="stat-val">${(_zData.length + _bData.length).toLocaleString()}</div>
        <div class="stat-lbl">Total</div>
      </div>`;
    }

    /* ── PUBLIC API ── */
    return {
        mount(map, zData, bData) {
            _map = map;
            _zData = zData;
            _bData = bData;
            _showZ = true;
            _showB = true;

            _zLayer = buildZeptoLayer();
            _bCluster = buildBlinkitLayer();
            _zLayer.addTo(_map);
            _bCluster.addTo(_map);

            renderPanel();
            renderStats();
        },

        unmount() {
            if (_zLayer) { _map.removeLayer(_zLayer); _zLayer = null; }
            if (_bCluster) { _map.removeLayer(_bCluster); _bCluster = null; }
        },

        getVisibleCount(bounds) {
            let n = 0;
            if (_showZ) _zData.forEach(s => {
                if (s.lat && s.lng && bounds.contains([s.lat, s.lng])) n++;
            });
            if (_showB) _bData.forEach(s => {
                if (s.coordinates && bounds.contains(s.coordinates)) n++;
            });
            return n;
        },
    };
})();