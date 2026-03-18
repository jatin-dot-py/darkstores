/* ─────────────────────────────────────────
   view-combined.js
   Single combined view: per-brand sections with
   logo, metrics, enable switch, download icon,
   and brand-specific options (geofence, remove imprecise).
───────────────────────────────────────── */

window.CombinedView = (function () {

    let _map, _zData, _bData, _sData;
    let _zLayer = null;
    let _zoneGroup = null;
    let _previewZoneGroup = null;
    let _previewZeptoId = null;
    let _previewZeptoZone = null;
    let _bCluster = null;
    let _sLayer = null;
    let _showZ = true;
    let _showB = true;
    let _showS = true;
    let _showZeptoGeofence = false;
    let _removeBlinkitImprecise = false;
    let _onZoomEnd = null;

    const SWIGGY_ORANGE = '#FC8019';
    const SWIGGY_ORANGE_L = '#FF9F43';
    const SWIGGY_GLOW = 'rgba(252, 128, 25, 0.45)';
    const ZEPTO_GEOFENCE_ZOOM_MIN = 11;
    const _canvas = L.canvas({ padding: 0.5, tolerance: 4 });

    /* ── ICONS (slightly larger for map) ── */
    function brandBlipIcon(iconPath, opts) {
        const {
            size = 22,
            imprecise = false,
            impreciseOpacity = 0.78,
        } = opts || {};
        const imgSize = Math.max(9, Math.round(size * 0.95));

        // Small “blip” icon uses the brand .ico directly.
        // For Blinkit imprecise markers we slightly dim it.
        return L.divIcon({
            className: '',
            html: `<div style="
        width:${size}px;height:${size}px;
        display:flex;align-items:center;justify-content:center;
        ${imprecise ? `opacity:${impreciseOpacity};filter:saturate(0.85);` : ''}
        box-shadow:0 0 10px rgba(0,0,0,0.35)
      "><img src="${iconPath}" alt="" style="
        width:${imgSize}px;height:${imgSize}px;
        object-fit:contain;
        flex-shrink:0;
      "/></div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
            popupAnchor: [0, -Math.round(size * 0.6)],
        });
    }

    function zeptoIcon() {
        return brandBlipIcon('./zepto.ico', { size: 22 });
    }

    function blinkitIcon(imprecise) {
        return brandBlipIcon('./blinkit.ico', { size: 22, imprecise });
    }

    /** Pill-shaped cluster: brand logo prominent, count secondary, compact pill. */
    function pillClusterIcon(iconPath, count) {
        const height = count > 300 ? 48 : count > 80 ? 44 : count > 20 ? 40 : 36;
        const iconSizePx = Math.round(height * 0.82);
        const fs = 11;
        const padding = 6;
        const countWidth = count >= 100 ? 22 : count >= 10 ? 16 : 12;
        const minWidth = iconSizePx + padding * 2 + countWidth;
        return L.divIcon({
            className: 'cluster-pill-wrap',
            html: `<div class="cluster-pill" style="
        height:${height}px;min-width:${minWidth}px;padding:0 ${padding}px;
        border-radius:${height / 2}px;
        display:flex;align-items:center;gap:6px;
        background:rgba(28,28,32,0.95);color:#fff;
        font-family:'DM Sans',sans-serif;font-weight:700;font-size:${fs}px;
        box-shadow:0 2px 10px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.08);
      "><img src="${iconPath}" alt="" class="cluster-pill-logo" style="width:${iconSizePx}px;height:${iconSizePx}px;object-fit:contain;flex-shrink:0" /><span class="cluster-pill-count">${count}</span></div>`,
            iconSize: [minWidth, height],
            iconAnchor: [minWidth / 2, height / 2],
        });
    }

    function blinkitClusterIcon(count) {
        return pillClusterIcon('./blinkit.ico', count);
    }

    function zeptoClusterIcon(count) {
        return pillClusterIcon('./zepto.ico', count);
    }

    function swiggyClusterIcon(count) {
        return pillClusterIcon('./instamart.ico', count);
    }

    function swiggyIcon() {
        return brandBlipIcon('./instamart.ico', { size: 22 });
    }

    /* ── BUILD ZEPTO LAYER (markers only) ── */
    function buildZeptoLayer() {
        const lg = L.layerGroup();
        _zData.forEach(s => {
            if (!s.lat || !s.lng) return;
            const gmaps = `https://www.google.com/maps?q=${s.lat},${s.lng}`;
            const popup = `<div class="popup-body">
        <div class="popup-platform zepto">Zepto</div>
        <div class="popup-name">${(s.name || 'Store ' + s.id).replace(/</g, '&lt;')}</div>
        <div class="popup-meta">
          <span>📍 ${(s.city || '—').replace(/</g, '&lt;')}</span>
          <span>${(s.state || '—').replace(/</g, '&lt;')}</span>
        </div>
        <a class="popup-gmaps zepto-maps" href="${gmaps}" target="_blank" rel="noopener">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          Open in Google Maps
        </a>
      </div>`;
            const marker = L.marker([s.lat, s.lng], { icon: zeptoIcon(), riseOnHover: true })
                .bindPopup(popup, { maxWidth: 250, className: '' })
                .addTo(lg);

            // Clicking the Zepto indicator on the map previews the dashed geofence outline
            // (even if the geofence option is off).
            marker.on('click', () => toggleZeptoGeofencePreviewForRecord(s));
        });
        return lg;
    }

    /* ── BUILD ZEPTO GEOFENCE LAYER ── */
    function buildZeptoZoneLayer() {
        const lg = L.layerGroup();
        _zData.forEach(s => {
            if (!s.zone || s.zone.length < 3) return;
            L.polygon(s.zone, {
                renderer: _canvas,
                color: '#7C3AED',
                fillColor: '#8B5CF6',
                fillOpacity: 0.07,
                weight: 0.9,
                opacity: 0.35,
            }).addTo(lg);
        });
        return lg;
    }

    /* ── ZEPTO GEOFENCE PREVIEW (dashed outline, record-specific) ── */
    function hideZeptoGeofencePreview() {
        if (_previewZoneGroup) {
            _map.removeLayer(_previewZoneGroup);
            _previewZoneGroup = null;
        }
        _previewZeptoId = null;
        _previewZeptoZone = null;
    }

    function buildZeptoZonePreviewLayer(zoneCoords) {
        const lg = L.layerGroup();
        if (!zoneCoords || zoneCoords.length < 3) return lg;
        L.polygon(zoneCoords, {
            renderer: _canvas,
            color: '#8B5CF6',
            weight: 2.1,
            opacity: 0.9,
            fillOpacity: 0,
            dashArray: '6,6',
        }).addTo(lg);
        return lg;
    }

    function toggleZeptoGeofencePreviewForRecord(record) {
        const zoneCoords = record && record.zone;
        const canPreview = zoneCoords && zoneCoords.length >= 3;
        if (!canPreview) return;

        const recordId = record && record.id;

        // Toggle off if clicking same record again.
        if (_previewZeptoId != null && recordId === _previewZeptoId) {
            hideZeptoGeofencePreview();
            return;
        }

        _previewZeptoId = recordId;
        _previewZeptoZone = zoneCoords;

        // Respect the geofence zoom gate (hard limit).
        if (_map.getZoom() < ZEPTO_GEOFENCE_ZOOM_MIN || !_showZ) {
            if (_previewZoneGroup) {
                _map.removeLayer(_previewZoneGroup);
                _previewZoneGroup = null;
            }
            return;
        }

        if (_previewZoneGroup) _map.removeLayer(_previewZoneGroup);
        _previewZoneGroup = buildZeptoZonePreviewLayer(_previewZeptoZone);
        _previewZoneGroup.addTo(_map);
    }

    /* ── BUILD SWIGGY LAYER ── */
    function buildSwiggyLayer() {
        const lg = L.layerGroup();
        (_sData || []).forEach(s => {
            const coords = s.coordinates;
            if (!coords || coords.length < 2) return;
            const [lat, lng] = coords;
            const gmaps = `https://www.google.com/maps?q=${lat},${lng}`;
            const loc = (s.locality || 'Locality').replace(/</g, '&lt;');
            const popup = `<div class="popup-body">
        <div class="popup-platform swiggy">Swiggy</div>
        <div class="popup-name">${loc}</div>
        <div class="popup-meta"><span>📍 ${loc}</span></div>
        <a class="popup-gmaps swiggy-maps" href="${gmaps}" target="_blank" rel="noopener">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          Open in Google Maps
        </a>
      </div>`;
            L.marker([lat, lng], { icon: swiggyIcon(), riseOnHover: true })
                .bindPopup(popup, { maxWidth: 250, className: '' })
                .addTo(lg);
        });
        return lg;
    }

    /* ── BUILD BLINKIT LAYER (optionally filter imprecise) ── */
    function buildBlinkitLayer() {
        const lg = L.layerGroup();
        const list = _removeBlinkitImprecise ? _bData.filter(s => s.accuracy <= 100) : _bData;
        list.forEach(s => {
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

    function updateLayers() {
        if (_zLayer) { _map.removeLayer(_zLayer); _zLayer = null; }
        if (_zoneGroup) { _map.removeLayer(_zoneGroup); _zoneGroup = null; }
        // Keep preview separate; we only remove it when Zepto itself is disabled.
        // (User can still toggle preview while geofence option is off.)
        if (_bCluster) { _map.removeLayer(_bCluster); _bCluster = null; }
        if (_sLayer) { _map.removeLayer(_sLayer); _sLayer = null; }

        if (_showZ) {
            _zLayer = L.markerClusterGroup({
                maxClusterRadius: 55,
                iconCreateFunction: c => zeptoClusterIcon(c.getChildCount()),
                disableClusteringAtZoom: 11,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                animate: true,
            });
            const zl = buildZeptoLayer();
            zl.eachLayer(m => _zLayer.addLayer(m));
            _zLayer.addTo(_map);
            // Zepto geofence polygons are only shown at high zoom.
            if (_showZeptoGeofence && _map.getZoom() >= ZEPTO_GEOFENCE_ZOOM_MIN) {
                _zoneGroup = buildZeptoZoneLayer();
                _zoneGroup.addTo(_map);
            }
        }
        if (_showB) {
            _bCluster = L.markerClusterGroup({
                maxClusterRadius: 55,
                iconCreateFunction: c => blinkitClusterIcon(c.getChildCount()),
                disableClusteringAtZoom: 11,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                animate: true,
            });
            const bl = buildBlinkitLayer();
            bl.eachLayer(m => _bCluster.addLayer(m));
            _bCluster.addTo(_map);
        }
        if (_showS && (_sData || []).length) {
            _sLayer = L.markerClusterGroup({
                maxClusterRadius: 55,
                iconCreateFunction: c => swiggyClusterIcon(c.getChildCount()),
                disableClusteringAtZoom: 11,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                animate: true,
            });
            const sl = buildSwiggyLayer();
            sl.eachLayer(m => _sLayer.addLayer(m));
            _sLayer.addTo(_map);
        }
    }

    function syncZeptoGeofenceByZoom() {
        const shouldShow = _showZ && _showZeptoGeofence && _map.getZoom() >= ZEPTO_GEOFENCE_ZOOM_MIN;
        if (shouldShow) {
            if (!_zoneGroup) {
                _zoneGroup = buildZeptoZoneLayer();
                _zoneGroup.addTo(_map);
            }
        } else {
            if (_zoneGroup) {
                _map.removeLayer(_zoneGroup);
                _zoneGroup = null;
            }
        }

        // Preview sync (record-specific dashed outline).
        const shouldPreview =
            _showZ &&
            _previewZeptoZone &&
            _map.getZoom() >= ZEPTO_GEOFENCE_ZOOM_MIN;

        if (!shouldPreview) {
            if (_previewZoneGroup) {
                _map.removeLayer(_previewZoneGroup);
                _previewZoneGroup = null;
            }
            return;
        }

        // If preview should show but layer is missing, rebuild.
        if (_previewZoneGroup == null) {
            _previewZoneGroup = buildZeptoZonePreviewLayer(_previewZeptoZone);
            _previewZoneGroup.addTo(_map);
        }
    }

    /* ── PANEL: three brand cards ── */
    function renderPanel() {
        const zCount = _zData.length;
        const bCount = _bData.length;
        const bPrecise = _bData.filter(s => s.accuracy <= 100).length;
        const bImprecise = bCount - bPrecise;
        const sCount = (_sData || []).length;
        const zCities = [...new Set(_zData.map(s => s.city).filter(Boolean))].length;
        const zStates = [...new Set(_zData.map(s => s.state).filter(Boolean))].length;
        const sUnique = [...new Set((_sData || []).map(s => (s.locality || '').trim()).filter(Boolean))].length;

        const DL_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

        const panel = document.getElementById('panel');
        panel.innerHTML = `

      <div class="brand-card brand-card--zepto" id="brandZepto">
        <div class="brand-card-top">
          <div class="brand-card-identity">
            <img class="brand-card-logo" src="./zepto.webp" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
            <span class="brand-card-logo-fb brand-card-logo-fb--zepto" style="display:none">Z</span>
            <span class="brand-card-name">Zepto</span>
          </div>
          <div class="brand-card-actions">
            <button type="button" class="brand-card-dl brand-card-dl--zepto" id="dlZepto" title="Download CSV">${DL_ICON}</button>
            <label class="brand-card-toggle" title="Toggle Zepto on map">
              <input type="checkbox" class="brand-toggle-cb" id="enableZepto" ${_showZ ? 'checked' : ''}>
              <span class="brand-toggle-track"></span>
            </label>
          </div>
        </div>
        <div class="brand-card-stats">
          <div class="brand-stat"><span class="brand-stat-val">${zCount.toLocaleString()}</span><span class="brand-stat-lbl">stores</span></div>
          <div class="brand-stat"><span class="brand-stat-val">${zCities}</span><span class="brand-stat-lbl">cities</span></div>
          <div class="brand-stat"><span class="brand-stat-val">${zStates}</span><span class="brand-stat-lbl">states</span></div>
        </div>
        <div class="brand-card-options">
          <label class="brand-option">
            <input type="checkbox" id="zeptoGeofence" ${_showZeptoGeofence ? 'checked' : ''} ${!_showZ ? 'disabled' : ''}>
            <span class="brand-option-check"></span>
            <span>Show geofence</span>
          </label>
        </div>
      </div>

      <div class="brand-card brand-card--blinkit" id="brandBlinkit">
        <div class="brand-card-top">
          <div class="brand-card-identity">
            <img class="brand-card-logo" src="./blinkit.webp" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
            <span class="brand-card-logo-fb brand-card-logo-fb--blinkit" style="display:none">B</span>
            <span class="brand-card-name">Blinkit</span>
          </div>
          <div class="brand-card-actions">
            <button type="button" class="brand-card-dl brand-card-dl--blinkit" id="dlBlinkit" title="Download CSV">${DL_ICON}</button>
            <label class="brand-card-toggle" title="Toggle Blinkit on map">
              <input type="checkbox" class="brand-toggle-cb" id="enableBlinkit" ${_showB ? 'checked' : ''}>
              <span class="brand-toggle-track"></span>
            </label>
          </div>
        </div>
        <div class="brand-card-stats">
          <div class="brand-stat"><span class="brand-stat-val">${bCount.toLocaleString()}</span><span class="brand-stat-lbl">stores</span></div>
          <div class="brand-stat"><span class="brand-stat-val">${bPrecise.toLocaleString()}</span><span class="brand-stat-lbl">precise</span></div>
          <div class="brand-stat"><span class="brand-stat-val">${bImprecise.toLocaleString()}</span><span class="brand-stat-lbl">imprecise</span></div>
        </div>
        <div class="brand-card-options">
          <label class="brand-option">
            <input type="checkbox" id="blinkitRemoveImprecise" ${_removeBlinkitImprecise ? 'checked' : ''} ${!_showB ? 'disabled' : ''}>
            <span class="brand-option-check"></span>
            <span>Remove imprecise markers</span>
          </label>
        </div>
      </div>

      <div class="brand-card brand-card--swiggy" id="brandSwiggy">
        <div class="brand-card-top">
          <div class="brand-card-identity">
            <img class="brand-card-logo" src="./instamart.webp" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
            <span class="brand-card-logo-fb brand-card-logo-fb--swiggy" style="display:none">S</span>
            <span class="brand-card-name">Swiggy</span>
          </div>
          <div class="brand-card-actions">
            <button type="button" class="brand-card-dl brand-card-dl--swiggy" id="dlSwiggy" title="Download CSV">${DL_ICON}</button>
            <label class="brand-card-toggle" title="Toggle Swiggy on map">
              <input type="checkbox" class="brand-toggle-cb" id="enableSwiggy" ${_showS ? 'checked' : ''}>
              <span class="brand-toggle-track"></span>
            </label>
          </div>
        </div>
        <div class="brand-card-stats">
          <div class="brand-stat"><span class="brand-stat-val">${sCount.toLocaleString()}</span><span class="brand-stat-lbl">localities</span></div>
          <div class="brand-stat"><span class="brand-stat-val">${sUnique}</span><span class="brand-stat-lbl">unique</span></div>
        </div>
      </div>`;

        function syncDisabled() {
            [['brandZepto', _showZ], ['brandBlinkit', _showB], ['brandSwiggy', _showS]].forEach(([id, on]) => {
                const el = document.getElementById(id);
                if (el) el.classList.toggle('brand-card--off', !on);
            });
        }
        syncDisabled();

        document.getElementById('enableZepto').addEventListener('change', e => {
            _showZ = e.target.checked;
            const gf = document.getElementById('zeptoGeofence');
            if (gf) gf.disabled = !_showZ;
            // If Zepto itself is disabled, hide preview too.
            if (!_showZ) hideZeptoGeofencePreview();
            syncDisabled();
            updateLayers();
        });
        document.getElementById('enableBlinkit').addEventListener('change', e => {
            _showB = e.target.checked;
            const imp = document.getElementById('blinkitRemoveImprecise');
            if (imp) imp.disabled = !_showB;
            syncDisabled();
            updateLayers();
        });
        document.getElementById('enableSwiggy').addEventListener('change', e => {
            _showS = e.target.checked;
            syncDisabled();
            updateLayers();
        });
        document.getElementById('zeptoGeofence').addEventListener('change', e => {
            _showZeptoGeofence = e.target.checked;
            updateLayers();
            // Ensure polygons obey the zoom threshold even if user toggles geofence mid-zoom.
            syncZeptoGeofenceByZoom();
        });
        document.getElementById('blinkitRemoveImprecise').addEventListener('change', e => {
            _removeBlinkitImprecise = e.target.checked;
            updateLayers();
        });

        // Zepto "blip" click: show dashed geofence outline regardless of the geofence checkbox.
        const zeptoCard = document.getElementById('brandZepto');
        if (zeptoCard) {
            zeptoCard.addEventListener('click', e => {
                // Only preview on "indicator" clicks (logo/name/empty card space),
                // not on checkbox/toggle controls (so the user can still interact normally).
                if (
                    e.target.closest('input') ||
                    e.target.closest('.brand-card-toggle') ||
                    e.target.closest('.brand-card-options') ||
                    e.target.closest('.brand-option') ||
                    e.target.closest('.brand-card-dl--zepto')
                ) return;
                // Sidebar card click just hides the preview (marker clicks are record-specific).
                hideZeptoGeofencePreview();
            });
        }
    }

    /* ── PUBLIC API ── */
    return {
        mount(map, zData, bData, sData) {
            _map = map;
            _zData = zData;
            _bData = bData;
            _sData = sData || [];
            _showZ = true;
            _showB = true;
            _showS = true;
            // Defaults (requested): geofence on, imprecise markers removed.
            _showZeptoGeofence = true;
            _removeBlinkitImprecise = true;

            renderPanel();
            updateLayers();

            // Toggle geofence polygons automatically as zoom crosses the threshold.
            if (_onZoomEnd) _map.off('zoomend', _onZoomEnd);
            _onZoomEnd = () => syncZeptoGeofenceByZoom();
            _map.on('zoomend', _onZoomEnd);
        },

        unmount() {
            if (_zLayer) { _map.removeLayer(_zLayer); _zLayer = null; }
            if (_zoneGroup) { _map.removeLayer(_zoneGroup); _zoneGroup = null; }
            if (_previewZoneGroup) { _map.removeLayer(_previewZoneGroup); _previewZoneGroup = null; }
            if (_bCluster) { _map.removeLayer(_bCluster); _bCluster = null; }
            if (_sLayer) { _map.removeLayer(_sLayer); _sLayer = null; }
            if (_onZoomEnd) { _map.off('zoomend', _onZoomEnd); _onZoomEnd = null; }
        },

        getVisibleCount(bounds) {
            let zepto = 0;
            let blinkit = 0;
            let swiggy = 0;

            if (_showZ) {
                _zData.forEach(s => {
                    if (s.lat && s.lng && bounds.contains([s.lat, s.lng])) zepto++;
                });
            }

            if (_showB) {
                const list = _removeBlinkitImprecise ? _bData.filter(s => s.accuracy <= 100) : _bData;
                list.forEach(s => {
                    if (s.coordinates && bounds.contains(s.coordinates)) blinkit++;
                });
            }

            if (_showS && _sData) {
                _sData.forEach(s => {
                    if (s.coordinates && s.coordinates.length >= 2 && bounds.contains([s.coordinates[0], s.coordinates[1]])) swiggy++;
                });
            }

            return {
                total: zepto + blinkit + swiggy,
                zepto,
                blinkit,
                swiggy,
            };
        },
    };
})();
