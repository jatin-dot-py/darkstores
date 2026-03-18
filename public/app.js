/* ─────────────────────────────────────────
   app.js
   darkstore.map — core orchestrator
   • Initialises Leaflet map
   • Fetches zepto.json + blinkit.json
   • Routes between Combined / Zepto / Blinkit
   • Handles CSV downloads
───────────────────────────────────────── */

(function () {
    'use strict';

    /* ══════════════════════════════════
       SIDEBAR TOGGLE
    ══════════════════════════════════ */
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarToggleFloat = document.getElementById('sidebarToggleFloat');

    function toggleSidebar() {
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        sidebarToggleFloat.classList.toggle('visible', isCollapsed);
        sidebarToggle.setAttribute('aria-label', isCollapsed ? 'Open sidebar' : 'Close sidebar');
        sidebarToggleFloat.setAttribute('aria-label', 'Open sidebar');
    }

    sidebar.addEventListener('transitionend', function () {
        if (window._leafletMap) window._leafletMap.invalidateSize();
    });

    sidebarToggle.addEventListener('click', toggleSidebar);
    sidebarToggleFloat.addEventListener('click', toggleSidebar);

    /* ══════════════════════════════════
       MAP SETUP
    ══════════════════════════════════ */
    const map = L.map('map', {
        center: [20.5, 78.9],
        zoom: 5,
        zoomControl: false,
        preferCanvas: true,
    });
    window._leafletMap = map;

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const TILE_OPTS = { attribution: '© OpenStreetMap contributors © CARTO', subdomains: 'abcd', maxZoom: 19 };
    const isLight = document.documentElement.dataset.theme === 'light';
    let tileLayer = L.tileLayer(
        isLight ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        TILE_OPTS
    );
    tileLayer.addTo(map);

    /* ══════════════════════════════════
       THEME TOGGLE
    ══════════════════════════════════ */
    const themeToggleEl = document.getElementById('themeToggle');
    if (themeToggleEl) themeToggleEl.addEventListener('click', () => {
        const root = document.documentElement;
        const isLight = root.dataset.theme === 'light';
        const next = isLight ? 'dark' : 'light';
        root.dataset.theme = next;
        localStorage.setItem('darkstore-theme', next);
        map.removeLayer(tileLayer);
        tileLayer = L.tileLayer(
            next === 'light'
                ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            TILE_OPTS
        );
        tileLayer.addTo(map);
    });

    /* ══════════════════════════════════
       STATE
    ══════════════════════════════════ */
    let zeptoData = [];
    let blinkitData = [];
    let swiggyData = [];
    let activeView = null;
    let activeViewName = 'combined';

    const VIEW_MAP = {
        combined: window.CombinedView,
        zepto: window.ZeptoView,
        blinkit: window.BlinkitView,
        swiggy: window.SwiggyView,
    };

    /* ══════════════════════════════════
       VISIBLE COUNT (RAF-throttled)
    ══════════════════════════════════ */
    let rafPending = false;
    function scheduleVisibleUpdate() {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(() => {
            rafPending = false;
            if (!activeView) return;
            const res = activeView.getVisibleCount(map.getBounds());
            const totalEl = document.getElementById('visTotal');
            const splitEl = document.getElementById('visSplit');

            if (typeof res === 'number') {
                if (totalEl) totalEl.textContent = res.toLocaleString();
                if (splitEl) splitEl.textContent = '—';
                return;
            }

            if (totalEl) totalEl.textContent = (res.total || 0).toLocaleString();
            if (splitEl) {
                const z = res.zepto || 0;
                const b = res.blinkit || 0;
                const s = res.swiggy || 0;
                splitEl.textContent = `${s} Swiggy | ${z} Zepto | ${b} Blinkit`;
            }
        });
    }
    map.on('moveend zoomend', scheduleVisibleUpdate);

    /* ══════════════════════════════════
       VIEW (combined only)
    ══════════════════════════════════ */
    function switchView(name) {
        if (activeView) activeView.unmount();
        activeViewName = name || 'combined';
        const view = VIEW_MAP[activeViewName];
        if (view) {
            view.mount(map, zeptoData, blinkitData, swiggyData);
            activeView = view;
        }
        scheduleVisibleUpdate();
    }

    /* ══════════════════════════════════
       CSV DOWNLOAD HELPERS
    ══════════════════════════════════ */
    function toCSVRow(row) {
        return row.map(v => {
            const s = (v == null) ? '' : String(v);
            return (s.includes(',') || s.includes('"') || s.includes('\n'))
                ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(',');
    }

    function downloadCSV(rows, filename) {
        const csv = rows.map(toCSVRow).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), {
            href: url, download: filename,
        });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /* CSV downloads — delegation (buttons live in panel, created by combined view) */
    document.getElementById('app').addEventListener('click', (e) => {
        const btn = e.target.closest('#dlZepto, #dlBlinkit, #dlSwiggy');
        if (!btn) return;
        e.preventDefault();
        if (btn.id === 'dlZepto' && zeptoData.length) {
            downloadCSV(
                [['id', 'name', 'lat', 'lng', 'city', 'state'], ...zeptoData.map(s => [s.id, s.name, s.lat, s.lng, s.city, s.state])],
                'zepto-darkstores.csv'
            );
        } else if (btn.id === 'dlBlinkit' && blinkitData.length) {
            downloadCSV(
                [['id', 'accuracy', 'lat', 'lng'], ...blinkitData.map(s => {
                    const [lat, lng] = s.coordinates || [null, null];
                    return [s.id, s.accuracy, lat, lng];
                })],
                'blinkit-darkstores.csv'
            );
        } else if (btn.id === 'dlSwiggy' && swiggyData.length) {
            downloadCSV(
                [['id', 'locality', 'lat', 'lng'], ...swiggyData.map(s => {
                    const [lat, lng] = s.coordinates || [null, null];
                    return [s.id, s.locality || '', lat, lng];
                })],
                'swiggy-darkstores.csv'
            );
        }
    });

    /* ══════════════════════════════════
       LOADER HELPERS
    ══════════════════════════════════ */
    function setLoader(pct, msg) {
        document.getElementById('loaderBar').style.width = pct + '%';
        document.getElementById('loaderMsg').textContent = msg;
    }

    function showError(message) {
        document.getElementById('loader').innerHTML = `
      <div class="error-screen">
        <div class="error-icon">⚠️</div>
        <div class="error-title">Data files not found</div>
        <div class="error-msg">${message}</div>
        <div style="font-size:11px;color:var(--muted);line-height:1.9">
          Place <code class="error-code">zepto.json</code>, <code class="error-code">blinkit.json</code>, and
          <code class="error-code">swiggy.json</code> in the same folder as <code class="error-code">index.html</code>, then serve with:<br>
          <code class="error-code">npx serve .</code>
        </div>
      </div>`;
    }

    /* ══════════════════════════════════
       DATA LOADING
    ══════════════════════════════════ */
    async function loadData() {
        try {
            setLoader(10, 'Fetching data…');

            const [zResult, bResult, sResult] = await Promise.allSettled([
                fetch('./zepto.json').then(r => {
                    if (!r.ok) throw new Error(`zepto.json → HTTP ${r.status}`);
                    return r.json();
                }),
                fetch('./blinkit.json').then(r => {
                    if (!r.ok) throw new Error(`blinkit.json → HTTP ${r.status}`);
                    return r.json();
                }),
                fetch('./swiggy.json').then(r => {
                    if (!r.ok) throw new Error(`swiggy.json → HTTP ${r.status}`);
                    return r.json();
                }),
            ]);

            setLoader(60, 'Parsing store data…');

            if (zResult.status === 'fulfilled') {
                zeptoData = zResult.value;
            } else {
                console.warn('[darkstore.map] Zepto data failed:', zResult.reason);
            }

            if (bResult.status === 'fulfilled') {
                blinkitData = bResult.value;
            } else {
                console.warn('[darkstore.map] Blinkit data failed:', bResult.reason);
            }

            if (sResult.status === 'fulfilled') {
                swiggyData = sResult.value;
            } else {
                console.warn('[darkstore.map] Swiggy data failed:', sResult.reason);
            }

            if (!zeptoData.length && !blinkitData.length && !swiggyData.length) {
                throw new Error('All data files could not be loaded.');
            }

            setLoader(80, 'Rendering map…');

            requestAnimationFrame(() => {
                switchView('combined');
                setLoader(100, 'Ready');
                setTimeout(() => document.getElementById('loader').classList.add('out'), 500);
            });

        } catch (err) {
            showError(err.message);
        }
    }

    loadData();

})();