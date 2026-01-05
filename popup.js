// 1. Defaults
const DEFAULT_PRODUCTIVE = ['github.com', 'stackoverflow.com', 'docs.google.com', 'canvas.instructure.com'];
const DEFAULT_UNPRODUCTIVE = ['youtube.com', 'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com'];

const vibrantColors = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6', '#AF52DE'];
const monochromeColors = ['#bebebeff', '#D9D9D9FF', '#E2E2E2FF', '#EBEBEBFF', '#F4F4F4FF', '#FAFAFAFF', '#FFFFFFFF'];

let productiveSites = [];
let unproductiveSites = [];
let usageChart;
let dayDetailChart;
let viewingDate = new Date(); 

// 2. Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const stored = await chrome.storage.local.get([
        'productiveSites', 
        'unproductiveSites', 
        'lastSelectedRange',
        'prodListState',
        'unprodListState',
        'statsListState',
        'monochromeEnabled',
        'lastEntranceDate'
    ]);

    // Intro page logic
    const todayStr = new Date().toLocaleDateString('en-CA');
    const entranceView = document.getElementById('entranceView');
    const mainView = document.getElementById('mainView');

    // If "Don't show today" was checked and dates match, skip entrance
    if (stored.lastEntranceDate === todayStr) {
        entranceView.style.display = 'none';
        mainView.style.display = 'flex';
    } else {
        entranceView.style.display = 'flex';
        mainView.style.display = 'none';
    }

    // Intro Button Listener
    document.getElementById('enterAppBtn').onclick = () => {
        const dontShow = document.getElementById('dontShowToday').checked;
        
        if (dontShow) {
            chrome.storage.local.set({ lastEntranceDate: todayStr });
        }
        
        // Transition
        entranceView.style.display = 'none';
        mainView.style.display = 'flex';
        renderChart();
    };
    
    // Completely clearing lists, including defaults
    productiveSites = (stored.productiveSites !== undefined) ? stored.productiveSites : DEFAULT_PRODUCTIVE;
    unproductiveSites = (stored.unproductiveSites !== undefined) ? stored.unproductiveSites : DEFAULT_UNPRODUCTIVE;

    const rangeSelect = document.getElementById('timeRange');
    if (stored.lastSelectedRange) rangeSelect.value = stored.lastSelectedRange;

    if (stored.monochromeEnabled) document.getElementById('monochromeToggle').checked = true;

    // Restore UI states
    const pCollapsible = document.getElementById('prodCollapsible');
    const uCollapsible = document.getElementById('unprodCollapsible');
    pCollapsible.style.display = stored.prodListState || 'block';
    uCollapsible.style.display = stored.unprodListState || 'block';
    document.getElementById('toggleProd').classList.toggle('collapsed', stored.prodListState === 'none');
    document.getElementById('toggleUnprod').classList.toggle('collapsed', stored.unprodListState === 'none');

    const statsContent = document.getElementById('statsCollapsible');
    const statsHeader = document.getElementById('toggleStats');
    if (stored.statsListState === 'expanded') {
        statsContent.classList.add('expanded', 'show-scroll');
    } else {
        statsContent.classList.add('minimized');
        statsHeader.classList.add('collapsed');
    }

    renderChart();
    setupEventListeners();
});

function renderChart() {
    chrome.storage.local.get(['history', 'productiveSites', 'unproductiveSites', 'chartType', 'monochromeEnabled'], (data) => {
        const history = data.history || {};
        const range = document.getElementById('timeRange').value;
        const chartType = data.chartType || 'pie';
        const palette = data.monochromeEnabled ? monochromeColors : vibrantColors;
        
        const currentProd = (data.productiveSites !== undefined) ? data.productiveSites : productiveSites;
        const currentUnprod = (data.unproductiveSites !== undefined) ? data.unproductiveSites : unproductiveSites;

        let rawData = {};
        const todayStr = new Date().toLocaleDateString('en-CA');

        if (range === 'today') {
            rawData = history[todayStr] || {};
        } else {
            const days = range === 'week' ? 7 : 0;
            const cutoff = new Date();
            if (days > 0) cutoff.setDate(cutoff.getDate() - (days - 1));
            const cutoffStr = days > 0 ? cutoff.toLocaleDateString('en-CA') : "";
            Object.keys(history).forEach(date => {
                if (!cutoffStr || date >= cutoffStr) {
                    Object.keys(history[date]).forEach(dom => rawData[dom] = (rawData[dom] || 0) + history[date][dom]);
                }
            });
        }
        calculateHealth(rawData, currentProd, currentUnprod, range);
        
        const totalSeconds = Object.values(rawData).reduce((a, b) => a + b, 0);
        const sortedDomains = Object.keys(rawData).sort((a, b) => rawData[b] - rawData[a]);

        const labels = sortedDomains.slice(0, 6);
        const values = labels.map(l => rawData[l]);
        if (sortedDomains.length > 6) {
            labels.push("Other");
            values.push(sortedDomains.slice(6).reduce((sum, dom) => sum + rawData[dom], 0));
        }

        const ctx = document.getElementById('usageChart').getContext('2d');
        if (usageChart) usageChart.destroy();
        usageChart = new Chart(ctx, {
            type: chartType,
            data: { labels, datasets: [{ data: values, backgroundColor: palette, borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: {
            callbacks: {
                label: (ctx) => ` ${formatTime(ctx.raw)}`
            }} } }
        });

        renderStatsList(rawData, currentProd, currentUnprod, totalSeconds);
    });
}

function renderStatsList(rawData, prod, unprod, total) {
    const list = document.getElementById('statsList');
    list.innerHTML = "";
    Object.keys(rawData).sort((a,b) => rawData[b]-rawData[a]).forEach(dom => {
        const isP = prod.some(s => dom.includes(s));
        const isU = unprod.some(s => dom.includes(s));
        const color = isP ? "#34C759" : (isU ? "#FF3B30" : "#8E8E93");
        const perc = total > 0 ? ((rawData[dom] / total) * 100).toFixed(1) : 0;
        const item = document.createElement('div');
        item.style.cssText = "display: flex; justify-content: space-between; margin-bottom: 2px;";
        item.innerHTML = `<span style="color:${color}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><strong>${dom}</strong></span><span>${formatTime(rawData[dom])} (${perc}%)</span>`;
        list.appendChild(item);
    });
}

function calculateHealth(data, prod, unprod, range) {
    let pSec = 0, uSec = 0, cumulative = 0;
    let unclassified = [];
    Object.keys(data).forEach(dom => {
        let sec = data[dom];
        if (range === 'today' && cumulative < 600) {
            const bonus = Math.min(sec, 600 - cumulative);
            sec = (bonus * 2) + (sec - bonus);
        }
        if (prod.some(s => dom.includes(s))) pSec += sec;
        else if (unprod.some(s => dom.includes(s))) uSec += sec;
        else if (data[dom] > 600) unclassified.push(dom);
        cumulative += data[dom];
    });
    const health = (pSec + uSec > 0) ? (pSec / (pSec + uSec)) * 100 : 50;
    updatePetUI(health, range);
    renderReviewSection(unclassified);
}

function updatePetUI(health, range) {
    const img = document.getElementById('petImage');
    const status = document.getElementById('petStatus');
    const bar = document.getElementById('healthBar');
    const period = range === 'week' ? " this week" : (range === 'all' ? "" : " today");

    // Reset animation class to ensure it doesn't persist when health improves
    status.classList.remove('heartbeat');

    bar.style.width = `${health}%`;

    if (health > 70) { 
        img.src = 'images/owl2.png'; 
        status.innerText = "Doing great!"; 
        bar.style.backgroundColor = "#34C759"; 
    } else if (health > 30) { 
        img.src = 'images/owl3.png'; 
        status.innerText = `Been distracted${period}.`; 
        bar.style.backgroundColor = "#FF9500"; 
    } else { 
        img.src = 'images/owl4.png'; 
        status.innerText = "Back on track!"; 
        bar.style.backgroundColor = "#FF3B30";
        
        /*status.classList.add('heartbeat'); */
        bar.classList.add('heartbeat');
        img.classList.add('heartbeat')
    }
}

function renderReviewSection(sites) {
    const container = document.getElementById('reviewSection');
    const list = document.getElementById('reviewList');
    list.innerHTML = "";
    if (sites.length === 0) { container.style.display = "none"; return; }
    container.style.display = "block";
    sites.slice(0, 3).forEach(site => {
        const div = document.createElement('div');
        div.style.cssText = "display:flex; flex-direction:column; gap:8px; margin-bottom:12px;";
        div.innerHTML = `<span style="font-size:13px; font-weight:600;">${site}</span>
            <div style="display:flex; gap:8px;">
                <button class="rev-ok" style="flex:1; background:#34C759; color:white; border:none; border-radius:8px; padding:6px; cursor:pointer;">Productive</button>
                <button class="rev-no" style="flex:1; background:#FF3B30; color:white; border:none; border-radius:8px; padding:6px; cursor:pointer;">Unproductive</button>
            </div>`;
        div.querySelector('.rev-ok').onclick = () => addSiteToList(site, true);
        div.querySelector('.rev-no').onclick = () => addSiteToList(site, false);
        list.appendChild(div);
    });
}

function setupEventListeners() {
    // Navigation
    document.getElementById('manageBtn').onclick = () => {
        document.getElementById('mainView').style.display = 'none';
        document.getElementById('settingsView').style.display = 'flex';
        renderSettingsLists();
    };
    document.getElementById('backBtn').onclick = () => {
        document.getElementById('settingsView').style.display = 'none';
        document.getElementById('mainView').style.display = 'flex';
        renderChart();
    };
    document.getElementById('calendarNavBtn').onclick = () => {
        document.getElementById('mainView').style.display = 'none';
        document.getElementById('calendarView').style.display = 'flex';
        renderCalendar();
    };
    document.getElementById('backFromCalBtn').onclick = () => {
        document.getElementById('calendarView').style.display = 'none';
        document.getElementById('mainView').style.display = 'flex';
    };

    // Calendar Paging
    document.getElementById('prevMonth').onclick = () => { viewingDate.setMonth(viewingDate.getMonth() - 1); renderCalendar(); };
    document.getElementById('nextMonth').onclick = () => { viewingDate.setMonth(viewingDate.getMonth() + 1); renderCalendar(); };

    // Settings Inputs
    document.getElementById('addProdBtn').onclick = () => addSiteFromInput('newProdInput', true);
    document.getElementById('addUnprodBtn').onclick = () => addSiteFromInput('newUnprodInput', false);

    // Dropdowns and Toggles
    document.getElementById('timeRange').onchange = (e) => chrome.storage.local.set({ lastSelectedRange: e.target.value }, renderChart);
    document.getElementById('chartTypePref').onchange = (e) => chrome.storage.local.set({ chartType: e.target.value }, renderChart);
    document.getElementById('monochromeToggle').onchange = (e) => chrome.storage.local.set({ monochromeEnabled: e.target.checked }, renderChart);

    // Reset Logic
    document.getElementById('resetBtn').onclick = () => document.getElementById('confirmModal').style.display = 'flex';
    document.getElementById('cancelReset').onclick = () => document.getElementById('confirmModal').style.display = 'none';
    document.getElementById('confirmReset').onclick = () => chrome.storage.local.clear(() => window.location.reload());

    // Collapsibles
    document.getElementById('toggleProd').onclick = () => toggleCollapsible('prodCollapsible', 'toggleProd', 'prodListState');
    document.getElementById('toggleUnprod').onclick = () => toggleCollapsible('unprodCollapsible', 'toggleUnprod', 'unprodListState');
    document.getElementById('toggleStats').onclick = toggleStatsList;

    // Modals
    document.getElementById('petCardAction').onclick = () => { document.getElementById('healthModal').style.display = 'flex'; renderHealthImpact(); };
    document.getElementById('closeModal').onclick = () => document.getElementById('healthModal').style.display = 'none';

    // Swipe Logic
    let startX = 0, startY = 0, skipSwipe = false;
    const wrapper = document.querySelector('.popup-wrapper');
    wrapper.addEventListener('pointerdown', e => {
        const interactive = e.target.closest('select, button, canvas, input, .list-header, .calendar-day, .pet-card');
        skipSwipe = !!interactive;
        startX = e.screenX;
        startY = e.screenY;
    });
    wrapper.addEventListener('pointerup', e => {
        if (skipSwipe) return;
        const diffX = e.screenX - startX;
        const diffY = Math.abs(e.screenY - startY);
        if (Math.abs(diffX) > 80 && Math.abs(diffX) > (diffY * 2)) {
            if (diffX < 0 && document.getElementById('mainView').style.display !== 'none') document.getElementById('manageBtn').click();
            else if (diffX > 0 && document.getElementById('settingsView').style.display !== 'none') document.getElementById('backBtn').click();
        }
    });
}

function toggleCollapsible(id, headerId, storageKey) {
    const el = document.getElementById(id);
    const newState = el.style.display === 'none' ? 'block' : 'none';
    el.style.display = newState;
    document.getElementById(headerId).classList.toggle('collapsed', newState === 'none');
    chrome.storage.local.set({ [storageKey]: newState });
}

function toggleStatsList() {
    const content = document.getElementById('statsCollapsible');
    const header = document.getElementById('toggleStats');
    const isExpanding = !content.classList.contains('expanded');
    if (isExpanding) {
        content.classList.remove('minimized');
        content.classList.add('expanded');
        header.classList.remove('collapsed');
        chrome.storage.local.set({ statsListState: 'expanded' });
        setTimeout(() => content.classList.add('show-scroll'), 300);
    } else {
        content.classList.remove('show-scroll', 'expanded');
        content.classList.add('minimized');
        header.classList.add('collapsed');
        chrome.storage.local.set({ statsListState: 'minimized' });
    }
}

function renderCalendar() {
    chrome.storage.local.get(['history', 'productiveSites', 'unproductiveSites'], (data) => {
        const history = data.history || {};
        const grid = document.getElementById('calendarGrid');
        grid.innerHTML = "";
        const year = viewingDate.getFullYear(), month = viewingDate.getMonth();
        document.getElementById('monthTitle').innerText = `${viewingDate.toLocaleString('default', { month: 'long' })} ${year}`;
        const first = new Date(year, month, 1).getDay();
        const days = new Date(year, month + 1, 0).getDate();
        for (let i = 0; i < first; i++) grid.appendChild(document.createElement('div'));
        for (let i = 1; i <= days; i++) {
            const lookup = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            // Create the readable date string for the display (eg, Friday, December 14th)
            const dateObj = new Date(year, month, i);
            const options = { weekday: 'long', month: 'long', day: 'numeric' };
            let readableDate = dateObj.toLocaleDateString('en-US', options);

            const day = i;
            const suffix = (day % 10 === 1 && day !== 11) ? 'st' :
                        (day % 10 === 2 && day !== 12) ? 'nd' :
                        (day % 10 === 3 && day !== 13) ? 'rd' : 'th';

            readableDate = readableDate.replace(day, day + suffix);
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.innerText = i;
            if (history[lookup]) {
                const health = calculateDayHealth(history[lookup], data.productiveSites || productiveSites, data.unproductiveSites || unproductiveSites);
                dayEl.classList.add(health > 60 ? 'day-productive' : 'day-unproductive');
            } else {
                dayEl.classList.add('day-neutral');
            }
            dayEl.onclick = () => {
                document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
                dayEl.classList.add('selected');
                showDayDetail(readableDate, history[lookup] || {});
            };
            grid.appendChild(dayEl);
        }
    });
}

function calculateDayHealth(dayData, prod, unprod) {
    let p = 0, u = 0;
    Object.keys(dayData).forEach(dom => {
        if (prod.some(s => dom.includes(s))) p += dayData[dom];
        else if (unprod.some(s => dom.includes(s))) u += dayData[dom];
    });
    return (p + u > 0) ? (p / (p + u)) * 100 : 50;
}

async function showDayDetail(dateStr, dayData) {
    const title = document.getElementById('dayDetailChartTitle');
    title.style.display = 'block';
    title.innerText = `Stats for ${dateStr}`;
    document.getElementById('dayDetailChartContainer').style.display = 'block';
    document.getElementById('dayMostUsedSection').style.display = 'block';
    
    const domains = Object.keys(dayData);
    if (domains.length > 0) {
        const top = domains.reduce((a, b) => dayData[a] > dayData[b] ? a : b);
        document.getElementById('mostUsedStat').innerHTML = `🏆 <strong>${top}</strong><br>${formatTime(dayData[top])}`;
    } else {
        document.getElementById('mostUsedStat').innerText = "No data for this day.";
    }

    const ctx = document.getElementById('dayDetailChart').getContext('2d');
    if (dayDetailChart) dayDetailChart.destroy();
    dayDetailChart = new Chart(ctx, {
        type: 'pie',
        data: { labels: domains, datasets: [{ data: Object.values(dayData), backgroundColor: vibrantColors }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: {
            callbacks: {
                label: (ctx) => ` ${formatTime(ctx.raw)}` 
            }} } }
    });
}

function renderHealthImpact() {
    const range = document.getElementById('timeRange').value;
    chrome.storage.local.get(['history', 'productiveSites', 'unproductiveSites'], (data) => {
        const history = data.history || {};
        const prod = data.productiveSites || productiveSites;
        const unprod = data.unproductiveSites || unproductiveSites;
        const list = document.getElementById('healthImpactList');
        list.innerHTML = "";
        
        let agg = {};
        const today = new Date().toLocaleDateString('en-CA');
        if (range === 'today') agg = history[today] || {};
        else {
            Object.keys(history).forEach(d => Object.keys(history[d]).forEach(dom => agg[dom] = (agg[dom] || 0) + history[d][dom]));
        }

        const items = Object.keys(agg).map(dom => {
            const isP = prod.some(s => dom.includes(s));
            const isU = unprod.some(s => dom.includes(s));
            return { dom, sec: agg[dom], type: isP ? 'heal' : (isU ? 'hurt' : 'neutral') };
        }).filter(i => i.type !== 'neutral').sort((a,b) => b.sec - a.sec);

        if (items.length === 0) { list.innerHTML = "<p>Classify sites to see impact.</p>"; return; }
        items.forEach(i => {
            const d = document.createElement('div');
            d.style.cssText = "padding:10px 0; border-bottom:1px solid #eee;";
            d.innerHTML = `<strong>${i.dom}</strong><br><small style="color:${i.type==='heal'?'green':'red'}">${i.type==='heal'?'Productive':'Not Productive'}</small> - ${formatTime(i.sec)}`;
            list.appendChild(d);
        });
    });
}

function addSiteFromInput(inputId, isProd) {
    const input = document.getElementById(inputId);
    const val = input.value.trim();
    if (val) { addSiteToList(val, isProd); input.value = ""; }
}

function addSiteToList(site, isProd) {
    if (isProd) {
        if (!productiveSites.includes(site)) productiveSites.push(site);
        unproductiveSites = unproductiveSites.filter(s => s !== site);
    } else {
        if (!unproductiveSites.includes(site)) unproductiveSites.push(site);
        productiveSites = productiveSites.filter(s => s !== site);
    }
    chrome.storage.local.set({ productiveSites, unproductiveSites }, () => {
        renderChart();
        if (document.getElementById('settingsView').style.display === 'block') renderSettingsLists();
    });
}

function renderSettingsLists() {
    const pList = document.getElementById('prodList'), uList = document.getElementById('unprodList');
    pList.innerHTML = ""; uList.innerHTML = "";
    const create = (s, isP) => {
        const d = document.createElement('div');
        d.style.cssText = "display:flex; justify-content:space-between; padding:10px 15px; border-bottom:1px solid #eee;";
        d.innerHTML = `<span>${s}</span><span style="color:red; cursor:pointer">Remove</span>`;
        d.querySelector('span:last-child').onclick = () => {
            if (isP) productiveSites = productiveSites.filter(x => x !== s);
            else unproductiveSites = unproductiveSites.filter(x => x !== s);
            chrome.storage.local.set({ productiveSites, unproductiveSites }, renderSettingsLists);
        };
        return d;
    };
    productiveSites.forEach(s => pList.appendChild(create(s, true)));
    unproductiveSites.forEach(s => uList.appendChild(create(s, false)));
}

function formatTime(s) {
    if (s < 60) return s + "s";
    const m = Math.floor(s / 60);
    if (m < 60) return m + "m";
    return Math.floor(m / 60) + "h " + (m % 60) + "m";
}