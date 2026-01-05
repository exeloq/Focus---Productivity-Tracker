
// get date string (YYYY-MM-DD)
function getDateString() {
    return new Date().toLocaleDateString('en-CA'); 
}

function formatBadgeTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    return `${hours}h`;
}

async function updateTracking() {
    try {
        // Check for valid active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];

        let isFocused = false;
        if (activeTab) {
            const window = await chrome.windows.get(activeTab.windowId);
            isFocused = window.focused;
        }

        // 2. Tracking logic
        if (activeTab && isFocused && activeTab.url && activeTab.url.startsWith("http")) {
            const domain = new URL(activeTab.url).hostname;
            const now = Date.now();
            const today = getDateString();

            // Fetch all necessary data, including the last date we tracked
            const data = await chrome.storage.local.get([
                'sessionStartTime', 
                'history', 
                'productiveSites', 
                'unproductiveSites', 
                'lastTrackedDate'
            ]);
            
            // If the last track was on a different day, reset start time.
            let startTime = data.sessionStartTime || now;
            if (data.lastTrackedDate !== today) {
                startTime = now;
            }

            // elapsed time calculation
            let elapsedSeconds = Math.round((now - startTime) / 1000);

            if (elapsedSeconds > 10) {
                elapsedSeconds = 0;
                startTime = now;
            }

            // 3. Updating history
            if (elapsedSeconds > 0) {
                let history = data.history || {};
                const prodList = data.productiveSites || [];
                const unprodList = data.unproductiveSites || [];

                if (!history[today]) history[today] = {};
                history[today][domain] = (history[today][domain] || 0) + elapsedSeconds;

                // Badge Logic
                let needsClassification = false;
                const todayData = history[today];
                for (const site in todayData) {
                    const isClassified = prodList.some(s => site.includes(s)) || unprodList.some(s => site.includes(s));
                    if (!isClassified && todayData[site] > 600) {
                        needsClassification = true;
                        break;
                    }
                }

                if (needsClassification) {
                    chrome.action.setBadgeText({ text: "!" });
                    chrome.action.setBadgeBackgroundColor({ color: "#FF9500" });
                } else {
                    const siteTime = todayData[domain] || 0;
                    chrome.action.setBadgeText({ text: formatBadgeTime(siteTime) });
                    chrome.action.setBadgeBackgroundColor({ color: "#007AFF" });
                }

                await chrome.storage.local.set({ 
                    history: history,
                    sessionStartTime: now,
                    lastTrackedDate: today 
                });
            } else {
                await chrome.storage.local.set({ 
                    sessionStartTime: now,
                    lastTrackedDate: today
                });
            }
        } else {
            // chrome.action.setBadgeText({ text: "" });
            await chrome.storage.local.set({ 
                sessionStartTime: Date.now(),
                lastTrackedDate: getDateString()
            });
        }
    } catch (error) {
        console.error("Tracking error:", error);
    }
}

// 4. Alarms and Listeners
chrome.alarms.create('trackingAlarm', { periodInMinutes: 1/60 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'trackingAlarm') {
        updateTracking();
    }
});

chrome.tabs.onActivated.addListener(updateTracking);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') updateTracking();
});
chrome.windows.onFocusChanged.addListener(updateTracking);