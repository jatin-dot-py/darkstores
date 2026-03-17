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
       MAP SETUP
    ══════════════════════════════════ */
    const map = L.map('map', {
        center: [20.5, 78.9],
        zoom: 5,
        zoomControl: false,
        preferCanvas: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
    }).addTo(map);

    /* ══════════════════════════════════
       STATE
    ══════════════════════════════════ */
    let zeptoData = [];
    let blinkitData = [];
    let activeView = null;
    let activeViewName = 'combined';

    const VIEW_MAP = {
        combined: window.CombinedView,
        zepto: window.ZeptoView,
        blinkit: window.BlinkitView,
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
            const n = activeView.getVisibleCount(map.getBounds());
            document.getElementById('visCount').textContent = n.toLocaleString();
        });
    }
    map.on('moveend zoomend', scheduleVisibleUpdate);

    /* ══════════════════════════════════
       VIEW SWITCHING
    ══════════════════════════════════ */
    function switchView(name) {
        if (activeView) activeView.unmount();
        activeViewName = name;

        document.querySelectorAll('.tab').forEach(btn =>
            btn.classList.toggle('active', btn.dataset.view === name)
        );

        const view = VIEW_MAP[name];
        if (!view) return;

        if (name === 'combined') {
            view.mount(map, zeptoData, blinkitData);
        } else if (name === 'zepto') {
            view.mount(map, zeptoData);
        } else if (name === 'blinkit') {
            view.mount(map, blinkitData);
        }

        activeView = view;
        scheduleVisibleUpdate();
    }

    /* Tab click handlers */
    document.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.view !== activeViewName) {
                switchView(btn.dataset.view);
            }
        });
    });

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

    /* Zepto CSV — raw fields only (no zone polygon) */
    document.getElementById('dlZepto').addEventListener('click', () => {
        if (!zeptoData.length) return;
        const rows = [
            ['id', 'name', 'lat', 'lng', 'city', 'state'],
            ...zeptoData.map(s => [s.id, s.name, s.lat, s.lng, s.city, s.state]),
        ];
        downloadCSV(rows, 'zepto-darkstores.csv');
    });

    /* Blinkit CSV — raw fields; coordinates split to lat/lng columns */
    document.getElementById('dlBlinkit').addEventListener('click', () => {
        if (!blinkitData.length) return;
        const rows = [
            ['id', 'accuracy', 'lat', 'lng'],
            ...blinkitData.map(s => {
                const [lat, lng] = s.coordinates || [null, null];
                return [s.id, s.accuracy, lat, lng];
            }),
        ];
        downloadCSV(rows, 'blinkit-darkstores.csv');
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
          Place <code class="error-code">zepto.json</code> and <code class="error-code">blinkit.json</code>
          in the same folder as <code class="error-code">index.html</code>, then serve with:<br>
          <code class="error-code">npx serve .</code>
        </div>
      </div>`;
    }

    /* ══════════════════════════════════
       DATA LOADING
    ══════════════════════════════════ */
    async function loadData() {
        try {
            setLoader(10, 'Fetching Zepto data…');

            const [zResult, bResult] = await Promise.allSettled([
                fetch('./zepto.json').then(r => {
                    if (!r.ok) throw new Error(`zepto.json → HTTP ${r.status}`);
                    return r.json();
                }),
                fetch('./blinkit.json').then(r => {
                    if (!r.ok) throw new Error(`blinkit.json → HTTP ${r.status}`);
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

            if (!zeptoData.length && !blinkitData.length) {
                throw new Error('Both data files could not be loaded.');
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