/* ─────────────────────────────────────────
   view-zepto.js
   Zepto-specific view: geofence polygons,
   purple markers, search + city/state filters.
───────────────────────────────────────── */

window.ZeptoView = (function () {

    let _map, _data;
    let _zoneGroup = null;
    let _markerCluster = null;
    let _filtered = [];
    let _activeState = 'All';
    let _activeCity = 'All';
    let _query = '';

    const _canvas = L.canvas({ padding: 0.5, tolerance: 4 });

    /* ── ICONS ── */
    function zeptoPin() {
        return L.divIcon({
            className: '',
            html: `<div style="
        width:9px;height:9px;
        background:#8B5CF6;
        border-radius:50%;
        border:1.5px solid rgba(139,92,246,0.35);
        box-shadow:0 0 9px rgba(139,92,246,0.6)
      "></div>`,
            iconSize: [9, 9],
            iconAnchor: [4.5, 4.5],
            popupAnchor: [0, -8],
        });
    }

    function zeptoClusterIcon(count) {
        const size = count > 300 ? 44 : count > 80 ? 36 : count > 20 ? 30 : 24;
        const fs = size > 30 ? 12 : 10;
        return L.divIcon({
            className: '',
            html: `<div style="
        width:${size}px;height:${size}px;
        background:#8B5CF6;color:white;
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-family:'Syne',sans-serif;font-weight:700;font-size:${fs}px;
        border:2px solid rgba(139,92,246,0.3);
        box-shadow:0 0 16px rgba(139,92,246,0.4),0 0 4px rgba(0,0,0,0.6);
      ">${count}</div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
        });
    }

    /* ── RENDER ── */
    function render() {
        _zoneGroup.clearLayers();
        if (_markerCluster) { _map.removeLayer(_markerCluster); }

        _markerCluster = L.markerClusterGroup({
            maxClusterRadius: 55,
            iconCreateFunction: c => zeptoClusterIcon(c.getChildCount()),
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            animate: true,
        });

        _filtered.forEach(s => {
            /* Geofence polygon */
            if (s.zone && s.zone.length > 2) {
                L.polygon(s.zone, {
                    renderer: _canvas,
                    color: '#7C3AED',
                    fillColor: '#8B5CF6',
                    fillOpacity: 0.07,
                    weight: 0.9,
                    opacity: 0.35,
                }).addTo(_zoneGroup);
            }

            /* Marker */
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
            L.marker([s.lat, s.lng], { icon: zeptoPin(), riseOnHover: true })
                .bindPopup(popup, { maxWidth: 250, className: '' })
                .addTo(_markerCluster);
        });

        _markerCluster.addTo(_map);
        _updateCount();
    }

    /* ── FILTER LOGIC ── */
    function applyFilters() {
        const q = _query.toLowerCase();
        _filtered = _data.filter(s => {
            if (_activeState !== 'All' && s.state !== _activeState) return false;
            if (_activeCity !== 'All' && s.city !== _activeCity) return false;
            if (q) {
                return (
                    (s.name || '').toLowerCase().includes(q) ||
                    (s.city || '').toLowerCase().includes(q) ||
                    (s.state || '').toLowerCase().includes(q)
                );
            }
            return true;
        });
        render();
    }

    function _updateCount() {
        const el = document.getElementById('z-count');
        if (!el) return;
        el.innerHTML = _filtered.length === _data.length
            ? `<strong>${_data.length.toLocaleString()}</strong> stores`
            : `<strong>${_filtered.length.toLocaleString()}</strong> of ${_data.length.toLocaleString()}`;
    }

    /* ── PANEL ── */
    function buildPanel(cities, states) {
        const panel = document.getElementById('panel');

        panel.innerHTML = `
      <div class="panel-section-label">Search</div>
      <div class="search-wrap">
        <span class="search-ico">🔍</span>
        <input type="text" id="z-search" placeholder="Store name, city, state…" autocomplete="off" spellcheck="false">
      </div>

      <div class="pills-group">
        <div class="pills-label">State</div>
        <div class="pills" id="z-state-pills"></div>
      </div>

      <div class="pills-group">
        <div class="pills-label">City</div>
        <div class="pills" id="z-city-pills"></div>
      </div>

      <hr class="panel-divider">
      <div class="result-count" id="z-count"></div>`;

        /* Search */
        document.getElementById('z-search').addEventListener('input', e => {
            _query = e.target.value.trim();
            applyFilters();
        });

        /* State pills */
        const statePillEl = document.getElementById('z-state-pills');
        ['All', ...states].forEach(st => {
            const btn = document.createElement('button');
            btn.className = 'pill' + (st === 'All' ? ' on' : '');
            btn.textContent = st === 'All' ? 'All states' : st;
            btn.dataset.state = st;
            btn.addEventListener('click', () => {
                _activeState = st;
                _activeCity = 'All';
                statePillEl.querySelectorAll('.pill').forEach(p => p.classList.toggle('on', p.dataset.state === st));
                cityPillEl.querySelectorAll('.pill').forEach(p => p.classList.toggle('on', p.dataset.city === 'All'));
                applyFilters();
            });
            statePillEl.appendChild(btn);
        });

        /* City pills (sorted by store count desc) */
        const cityPillEl = document.getElementById('z-city-pills');
        ['All', ...cities].forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'pill' + (c === 'All' ? ' on' : '');
            btn.textContent = c === 'All' ? 'All cities' : c;
            btn.dataset.city = c;
            btn.addEventListener('click', () => {
                _activeCity = c;
                cityPillEl.querySelectorAll('.pill').forEach(p => p.classList.toggle('on', p.dataset.city === c));
                applyFilters();
            });
            cityPillEl.appendChild(btn);
        });

        _updateCount();
    }

    /* ── TOPBAR STATS ── */
    function renderStats(cities, states) {
        document.getElementById('topbarStats').innerHTML = `
      <div class="stat-chip">
        <div class="stat-val" style="color:#A78BFA">${_data.length.toLocaleString()}</div>
        <div class="stat-lbl">Stores</div>
      </div>
      <div class="stat-sep"></div>
      <div class="stat-chip">
        <div class="stat-val" style="color:#A78BFA">${cities.length}</div>
        <div class="stat-lbl">Cities</div>
      </div>
      <div class="stat-sep"></div>
      <div class="stat-chip">
        <div class="stat-val" style="color:#A78BFA">${states.length}</div>
        <div class="stat-lbl">States</div>
      </div>`;
    }

    /* ── PUBLIC API ── */
    return {
        mount(map, data) {
            _map = map;
            _data = data;
            _filtered = [...data];
            _activeState = 'All';
            _activeCity = 'All';
            _query = '';

            _zoneGroup = L.layerGroup().addTo(_map);
            _markerCluster = null;

            /* Build sorted city / state lists */
            const cityCountMap = {};
            data.forEach(s => { if (s.city) cityCountMap[s.city] = (cityCountMap[s.city] || 0) + 1; });
            const cities = Object.keys(cityCountMap).sort((a, b) => cityCountMap[b] - cityCountMap[a]);
            const states = [...new Set(data.map(s => s.state).filter(Boolean))].sort();

            renderStats(cities, states);
            buildPanel(cities, states);
            render();
        },

        unmount() {
            if (_zoneGroup) { _map.removeLayer(_zoneGroup); _zoneGroup = null; }
            if (_markerCluster) { _map.removeLayer(_markerCluster); _markerCluster = null; }
        },

        getVisibleCount(bounds) {
            return _filtered.filter(s =>
                s.lat && s.lng && bounds.contains([s.lat, s.lng])
            ).length;
        },
    };
})();