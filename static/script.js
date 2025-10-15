let tempGauge = null;
let currentShowerData = [];
let temperatureSlider = null;
let currentLanguage = 'en';
let translations = {};
let currentTemp = null;
let expectedEndTime = null;
let refreshInterval = null;


// Initialize the application with language support
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking localStorage...');
    console.log('All localStorage:', localStorage);

    loadTranslations().then(() => {
        // Load saved language from localStorage
        const savedLanguage = localStorage.getItem('preferredLanguage');
        console.log('Saved language from localStorage:', savedLanguage);

        if (savedLanguage && translations[savedLanguage]) {
            currentLanguage = savedLanguage;
            console.log('Using saved language:', savedLanguage);
        } else {
            console.log('Using default language: en');
        }

        // Set the language selector to the current language
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.value = currentLanguage;
        }

        initializeGauge();
        updateStatus();
        setupEventListeners();
        applyLanguage(currentLanguage);
        initializeMobileSupport();

        // Auto-refresh every minute
        setInterval(updateStatus, 60000);
    });
});

// Load translations from JSON file
async function loadTranslations() {
    try {
        const response = await fetch('/static/languages.json');
        translations = await response.json();
    } catch (error) {
        console.error('Error loading translations:', error);
        // Fallback to English
        translations = {
            en: {
                title: "Water Boiler Control",
                lastUpdate: "Last Update",
                boilerStatus: "Boiler Status",
                target: "Target",
                refresh: "Refresh Now",
                toggleBoiler: "Toggle Boiler",
                turnOn: "Turn On",
                turnOff: "Turn Off",
                on: "ON",
                off: "OFF",
                unknown: "Unknown",
                showersAvailable: "Up to {count} shower(s) available",
                noShowers: "No showers available",
                setTemperature: "Set Target Temperature",
                selectTemperature: "Select Temperature",
                startBoiler: "Start Boiler",
                cancel: "Cancel",
                showersAtTemp: "{count} shower(s) available at {temp}°C",
                noShowersAtTemp: "No showers available at {temp}°C",
                selectToSee: "Select a temperature to see shower availability",
                language: "Language"
            }
        };
    }
}

// Save language preference to localStorage
function saveLanguagePreference(lang) {
    localStorage.setItem('preferredLanguage', lang);
}

// Apply language to all elements
function applyLanguage(lang) {
    console.log('Applying language:', lang);

    const requiredIds = ['page-title', 'main-title', 'last-update-label', 'boiler-status-label', 'refreshBtn', 'shower-count', 'confirmTemp', 'cancelTemp', 'shower-info'];

    requiredIds.forEach(id => {
        const el = document.getElementById(id);
        console.log(`Element ${id}:`, el ? 'FOUND' : 'NOT FOUND');
    });

    currentLanguage = lang;
    const t = translations[lang] || translations['en'];

    // Update HTML elements with null checks
    const elements = {
        'page-title': () => {
            const el = document.getElementById('page-title');
            if (el) el.textContent = t.title;
        },
        'main-title': () => {
            const el = document.getElementById('main-title');
            if (el) el.textContent = t.title;
        },
        'last-update-label': () => {
            const el = document.getElementById('last-update-label');
            if (el) el.textContent = t.lastUpdate + ':';
        },
        'boiler-status-label': () => {
            const el = document.getElementById('boiler-status-label');
            if (el) el.textContent = t.boilerStatus + ':';
        },
        'refreshBtn': () => {
            const el = document.getElementById('refreshBtn');
            if (el) el.textContent = t.refresh;
        },
        'shower-count': () => {
            const el = document.getElementById('shower-count');
            if (el) el.textContent = t.selectToSee;
        },
        'modal-title': () => {
            const modalTitle = document.querySelector('#tempModal h3');
            if (modalTitle) modalTitle.textContent = t.setTemperature;
        },
        'temperature-label': () => {
            const tempLabel = document.querySelector('.temperature-selector label');
            if (tempLabel) tempLabel.textContent = t.selectTemperature + ':';
        },
        'confirmTemp': () => {
            const el = document.getElementById('confirmTemp');
            if (el) el.textContent = t.startBoiler;
        },
        'cancelTemp': () => {
            const el = document.getElementById('cancelTemp');
            if (el) el.textContent = t.cancel;
        },
        'shower-info': () => {
            const showerInfo = document.getElementById('shower-info');
            if (showerInfo) {
                // Only update if it contains default text
                const defaultTexts = ['Select a temperature to see shower availability', 'בחר טמפרטורה כדי לראות זמינות מקלחות'];
                if (defaultTexts.some(text => showerInfo.textContent.includes(text))) {
                    showerInfo.textContent = t.selectToSee;
                }
            }
        }
    };

    // Apply all translations
    Object.values(elements).forEach(updateFn => updateFn());

    // Update boiler toggle button based on current state
    updateBoilerButtonText();

    // Update RTL/LTR direction
    updateTextDirection(lang);

    // Update shower info if temperature slider is active
    const tempSlider = document.getElementById('temperature-input');
    if (tempSlider && tempSlider.value) {
        updateShowerInfo(parseInt(tempSlider.value), document.getElementById('shower-info'));
    }

    // Update current status display
    updateStatusDisplayFromCurrentState();

    // Re-translate all dynamic content that comes from API/data
    retranslateDynamicContent();

    // Save the preference
    saveLanguagePreference(lang);
    console.log('Saved language preference:', lang);
}

function handleBoilerResponse(result) {
    if (result.success && result.expectedEndTime) {
        expectedEndTime = result.expectedEndTime;
        showSuccessMessage(result.expectedEndTime);
        startPeriodicRefresh();
    }
}

function startPeriodicRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }

    // Refresh every 4 minutes to get updated estimates
    refreshInterval = setInterval(() => {
        if (expectedEndTime) {
            updateStatus(); // This will fetch fresh data from API
        } else {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }, 240000); // 4 minutes
}

function updateStatusWithEstimate(expectedEndTime) {
    const t = translations[currentLanguage] || translations['en'];
    const statusElement = document.getElementById('boilerStatus');

    if (statusElement) {
        statusElement.innerHTML = `${t.on}<br><small>(${t.estimatedReady} ${expectedEndTime})</small>`;
        statusElement.className = 'status-on with-estimate';
    }
}

function showSuccessMessage(expectedEndTime) {
    const t = translations[currentLanguage] || translations['en'];

    // Create a temporary success message
    const message = t.boilerStarted.replace('{time}', expectedEndTime);

    // You can show this as a toast notification or update the status display
    showToast(message, 'success');

}

function showToast(message, type = 'info') {
    // Remove existing toast if any
    const existingToast = document.getElementById('boiler-toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.id = 'boiler-toast';
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // Add to page
    document.body.appendChild(toast);

    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideToast();
    }, 5000);
}

function hideToast() {
    const toast = document.getElementById('boiler-toast');
    if (toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }
}



function updateStatusWithCountdown(timeText) {
    const t = translations[currentLanguage] || translations['en'];
    const statusElement = document.getElementById('boilerStatus');
    const targetDisplay = document.getElementById('targetTempDisplay');

    if (statusElement) {
        statusElement.innerHTML = `${t.on} <small>(${t.readyBy} ${timeText})</small>`;
    }
}

// Update text direction based on language
function updateTextDirection(lang) {
    const body = document.body;
    const container = document.querySelector('.container');

    if (lang === 'he') {
        body.classList.add('rtl');
        container.classList.add('rtl');
    } else {
        body.classList.remove('rtl');
        container.classList.remove('rtl');
    }
}

// Update boiler button text based on current state
function updateBoilerButtonText() {
    const toggleBtn = document.getElementById('boilerToggle');
    if (toggleBtn) {
        const t = translations[currentLanguage] || translations['en'];
        // Check both text content and class to determine state
        const isOn = toggleBtn.textContent === t.turnOff ||
                     toggleBtn.classList.contains('btn-danger') ||
                     document.getElementById('boilerStatus').textContent === t.on;
        toggleBtn.textContent = isOn ? t.turnOff : t.turnOn;
        toggleBtn.className = isOn ? 'btn btn-danger' : 'btn btn-success';
    }
}

// Update status display from current state
function updateStatusDisplayFromCurrentState() {
    const t = translations[currentLanguage] || translations['en'];

    const statusElement = document.getElementById('boilerStatus');
    if (statusElement.textContent === 'ON' || statusElement.textContent === 'OFF') {
        statusElement.textContent = statusElement.textContent === 'ON' ? t.on : t.off;
    }

    const targetDisplay = document.getElementById('targetTempDisplay');
    if (targetDisplay.textContent.includes('Target:')) {
        const currentTarget = targetDisplay.textContent.replace('Target: ', '');
        targetDisplay.textContent = `${t.target}: ${currentTarget}`;
    }
}


function initializeGauge() {
    const ctx = document.getElementById('tempGauge').getContext('2d');
    tempGauge = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, 45],
                backgroundColor: ['#ff6384', '#f0f0f0'],
                borderWidth: 0,
                borderRadius: 10
            }]
        },
        options: {
            circumference: 180,
            rotation: -90,
            cutout: '75%',
            plugins: {
                tooltip: { enabled: false },
                legend: { display: false }
            },
            animation: {
                animateRotate: true,
                animateScale: true
            }
        }
    });
}

async function updateStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();

        updateDisplay(data);
        updateGauge(data);
        //updateShowerMarkers(data.shower_data, data.current_temp);
        updateCurrentShowerCount(data.shower_data, data.current_temp);
        // Store shower data for the modal
        currentShowerData = data.shower_data || [];

        return data;
    } catch (error) {
        console.error('Error updating status:', error);
    }
}


function setupTemperatureSlider(showerData) {
    currentShowerData = showerData;
    const slider = document.getElementById('temperature-input');
    const display = document.getElementById('current-temperature');
    const showerInfo = document.getElementById('shower-info');

    // Update display when slider moves
    slider.addEventListener('input', function() {
        const temp = parseInt(this.value);
        display.textContent = `${temp}°C`;
        updateShowerInfo(temp, showerInfo);
    });

    // Add shower markers to slider
    //addShowerMarkersToSlider(showerData);

    // Set initial value
    const initialTemp = parseInt(slider.value);
    display.textContent = `${initialTemp}°C`;
    updateShowerInfo(initialTemp, showerInfo);
}

function addShowerMarkersToSlider(showerData) {
    const slider = document.getElementById('temperature-input');
    const markersContainer = document.getElementById('shower-markers');

    if (!showerData || !markersContainer) return;

    markersContainer.innerHTML = '';

    showerData.forEach(item => {
        const temp = item.temp;
        const showers = item.drop;

        // Calculate position percentage (37-80 range)
        const position = ((temp - 37) / (80 - 37)) * 100;

        const marker = document.createElement('div');
        marker.className = 'shower-marker';
        marker.style.left = `${position}%`;
        marker.textContent = `${showers}🚿`;
        marker.title = `${showers} shower(s) at ${temp}°C`;

        markersContainer.appendChild(marker);
    });
}

function updateShowerInfo(temp, showerInfoElement) {
    const t = translations[currentLanguage] || translations['en'];

    if (!currentShowerData || currentShowerData.length === 0) {
        showerInfoElement.textContent = t.selectToSee;
        return;
    }

    // Find the maximum number of showers possible at selected temperature
    let maxShowers = 0;
    currentShowerData.forEach(item => {
        if (temp >= item.temp && item.drop > maxShowers) {
            maxShowers = item.drop;
        }
    });

    if (maxShowers > 0) {
        showerInfoElement.innerHTML = `✅ <strong>${t.showersAtTemp.replace('{count}', maxShowers).replace('{temp}', temp)}</strong>`;
        showerInfoElement.style.color = '#28a745';
    } else {
        showerInfoElement.innerHTML = `❌ <strong>${t.noShowersAtTemp.replace('{temp}', temp)}</strong>`;
        showerInfoElement.style.color = '#dc3545';
    }
}

function updateDisplay(data) {
    const t = translations[currentLanguage] || translations['en'];

    // Store current temperature for language switching
    currentTemp = data.current_temp;

    document.getElementById('currentTemp').textContent =
        data.current_temp ? `${data.current_temp}°C` : '--°C';

    document.getElementById('lastUpdate').textContent =
        data.last_update ? new Date(data.last_update).toLocaleTimeString() : '--';

    const statusElement = document.getElementById('boilerStatus');
    if (data.expected_end_time && data.boiler_status) {
        // Store the latest estimate
        expectedEndTime = data.expected_end_time;
        statusElement.innerHTML = `${t.on}<br><small>(${t.estimatedReady} ${data.expected_end_time})</small>`;
        statusElement.className = 'status-on with-estimate';
        // Ensure periodic refresh is running
        if (!refreshInterval) {
            startPeriodicRefresh();
        }
    } else {
        expectedEndTime = null;
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
        statusElement.textContent = data.boiler_status ? t.on : t.off;
        statusElement.className = data.boiler_status ? 'status-on' : 'status-off';
    }

    const targetDisplay = document.getElementById('targetTempDisplay');
    targetDisplay.textContent = data.target_temp ? `${t.target}: ${data.target_temp}°C` : `${t.target}: --°C`;

    const toggleBtn = document.getElementById('boilerToggle');
    toggleBtn.textContent = data.boiler_status ? t.turnOff : t.turnOn;
    toggleBtn.className = data.boiler_status ? 'btn btn-danger' : 'btn btn-success';
}

function updateGauge(data) {
    if (!data.current_temp) return;

    // Update gauge value (range 20-80°C)
    const temp = Math.min(Math.max(data.current_temp, 30), 75);
    const normalized = temp - 30;
    tempGauge.data.datasets[0].data = [normalized, 45 - normalized];
    tempGauge.update();
}

function updateShowerMarkers(showerData, currentTemp) {
    // Clear existing markers
    const existingMarkers = document.querySelectorAll('.marker, .marker-line');
    existingMarkers.forEach(marker => marker.remove());

    if (!showerData || showerData.length === 0) return;

    const gaugeContainer = document.querySelector('.gauge-container');
    const markersContainer = document.createElement('div');
    markersContainer.className = 'gauge-markers';
    gaugeContainer.appendChild(markersContainer);

    const width = 400;
    const height = 200;
    const centerX = width / 2;
    const centerY = height; // Bottom center for the semi-circle
    const radius = 140; // Radius of the gauge

    console.log('Updating markers with shower data:', showerData);

    // Add standard scale markers
    const scaleMarkers = [0, 20, 40, 60, 80];
    scaleMarkers.forEach(temp => {
        // Convert temperature to angle: 0° = left side, 80° = right side
        const angle = (temp / 80) * 180; // 0 to 180 degrees
        const rad = (angle - 180) * Math.PI / 180; // Convert to radians (-90° to +90°)

        // Position for scale markers (outside the gauge)
        const markerRadius = radius + 25;
        const x = centerX + Math.cos(rad) * markerRadius;
        const y = centerY + Math.sin(rad) * markerRadius;

        // Only create marker if it's within the semi-circle
        if (angle >= 0 && angle <= 180) {
            const marker = document.createElement('div');
            marker.className = 'marker';
            marker.style.left = x + 'px';
            marker.style.top = y + 'px';
            marker.textContent = temp + '°';
            markersContainer.appendChild(marker);

            // Add guide line
            const lineStartX = centerX + Math.cos(rad) * radius;
            const lineStartY = centerY + Math.sin(rad) * radius;
            const lineEndX = centerX + Math.cos(rad) * (radius + 15);
            const lineEndY = centerY + Math.sin(rad) * (radius + 15);

            const line = document.createElement('div');
            line.className = 'marker-line';
            line.style.left = lineStartX + 'px';
            line.style.top = lineStartY + 'px';
            line.style.height = '15px';
            line.style.transform = `rotate(${angle}deg)`;
            markersContainer.appendChild(line);
        }
    });

    // Add shower markers
    showerData.forEach(item => {
        const temp = item.temp;
        const showers = item.drop;

        console.log(`Adding shower marker: ${showers} showers at ${temp}°C`);

        // Convert temperature to angle
        const angle = (temp / 80) * 180; // 0 to 180 degrees
        const rad = (angle - 180) * Math.PI / 180; // Convert to radians (-90° to +90°)

        // Position for shower markers (inside the gauge)
        const markerRadius = radius - 20;
        const x = centerX + Math.cos(rad) * markerRadius;
        const y = centerY + Math.sin(rad) * markerRadius;

        // Only create marker if it's within the semi-circle
        if (angle >= 0 && angle <= 180) {
            // Create shower marker
            const marker = document.createElement('div');
            marker.className = 'marker marker-shower';
            marker.style.left = x + 'px';
            marker.style.top = y + 'px';
            marker.textContent = `${showers}🚿`;
            marker.title = `${showers} shower(s) at ${temp}°C`;
            markersContainer.appendChild(marker);

            // Add guide line pointing to the marker
            const lineStartX = centerX + Math.cos(rad) * (radius - 5);
            const lineStartY = centerY + Math.sin(rad) * (radius - 5);
            const lineEndX = centerX + Math.cos(rad) * (radius - 15);
            const lineEndY = centerY + Math.sin(rad) * (radius - 15);

            const line = document.createElement('div');
            line.className = 'marker-line';
            line.style.left = lineStartX + 'px';
            line.style.top = lineStartY + 'px';
            line.style.height = '10px';
            line.style.background = '#007bff';
            line.style.transform = `rotate(${angle}deg)`;
            markersContainer.appendChild(line);

            console.log(`Shower marker placed at: ${x}, ${y} for angle ${angle}°`);
        }
    });

    // Update shower count display based on current temperature

}

function updateCurrentShowerCount(showerData, currentTemp) {
    const t = translations[currentLanguage] || translations['en'];

    if (!currentTemp || !showerData) return;

    // Store the data for language switching
    currentShowerData = showerData;
    currentTemp = currentTemp;

    // Find the maximum number of showers possible at current temperature
    let maxShowers = 0;
    showerData.forEach(item => {
        if (currentTemp >= item.temp && item.drop > maxShowers) {
            maxShowers = item.drop;
        }
    });

    const showerCountElement = document.getElementById('showerCount');
    if (maxShowers > 0) {
        showerCountElement.textContent = t.showersAvailable.replace('{count}', maxShowers);
        showerCountElement.style.color = '#28a745';
    } else {
        showerCountElement.textContent = t.noShowers;
        showerCountElement.style.color = '#dc3545';
    }
}

function setupEventListeners() {
    document.getElementById('refreshBtn').addEventListener('click', updateStatus);

    // Language selector should be FIRST
    document.getElementById('languageSelect').addEventListener('change', function() {
        applyLanguage(this.value);
    });

    document.getElementById('boilerToggle').addEventListener('click', function() {
        const t = translations[currentLanguage] || translations['en'];
        const isCurrentlyOn = this.textContent === t.turnOff || this.classList.contains('btn-danger');

        if (!isCurrentlyOn) {
            // Show temperature input modal
            document.getElementById('tempModal').style.display = 'block';
            // Initialize slider with current shower data
            updateStatus().then(() => {
                setupTemperatureSlider(currentShowerData);
            });
        } else {
            // Turning off - no input needed
            toggleBoiler(null);
        }
    });

    document.getElementById('confirmTemp').addEventListener('click', function() {
        const tempInput = document.getElementById('temperature-input');
        const temp = parseInt(tempInput.value);

        if (temp && temp >= 37 && temp <= 80) {
            toggleBoiler(temp);
            document.getElementById('tempModal').style.display = 'none';
        } else {
            alert('Please select a valid temperature between 37°C and 80°C');
        }
    });

    document.getElementById('cancelTemp').addEventListener('click', function() {
        document.getElementById('tempModal').style.display = 'none';
    });

    // Initialize temperature slider
    const temperatureInput = document.getElementById('temperature-input');
    const currentTemperatureSpan = document.getElementById('current-temperature');
    if (temperatureInput && currentTemperatureSpan) {
        temperatureInput.addEventListener('input', () => {
            currentTemperatureSpan.textContent = `${temperatureInput.value}°C`;
        });
    }

    // Allow Enter key to confirm in modal
    document.addEventListener('keypress', function(e) {
        const modal = document.getElementById('tempModal');
        if (modal.style.display === 'block' && e.key === 'Enter') {
            document.getElementById('confirmTemp').click();
        }
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('tempModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

async function toggleBoiler(targetTemp) {
    try {
        const response = await fetch('/api/boiler/toggle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ target_temp: targetTemp })
        });

        const result = await response.json();

        if (result.success) {
            handleBoilerResponse(result);
            updateStatus(); // Refresh display
        } else {
            showToast(result.error  || 'Failed to toggle boiler', 'error');
        }
    } catch (error) {
        console.error('Error toggling boiler:', error);
        showToast('Error communicating with server', 'error');
    }
}

function handleBoilerOff() {
    expectedEndTime = null;
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

//document.addEventListener('DOMContentLoaded', () => {
//    const temperatureInput = document.getElementById('temperature-input');
//    const currentTemperatureSpan = document.getElementById('current-temperature');
//
//    temperatureInput.addEventListener('input', () => {
//        currentTemperatureSpan.textContent = `${temperatureInput.value}°C`;
//    });
//});

// Add this function to re-translate dynamic content
function retranslateDynamicContent() {
    const t = translations[currentLanguage] || translations['en'];

    // Re-translate shower count based on current data
    const showerCountElement = document.getElementById('showerCount');
    if (showerCountElement && currentShowerData && currentTemp) {
        let maxShowers = 0;
        currentShowerData.forEach(item => {
            if (currentTemp >= item.temp && item.drop > maxShowers) {
                maxShowers = item.drop;
            }
        });

        if (maxShowers > 0) {
            showerCountElement.textContent = t.showersAvailable.replace('{count}', maxShowers);
            showerCountElement.style.color = '#28a745';
        } else {
            showerCountElement.textContent = t.noShowers;
            showerCountElement.style.color = '#dc3545';
        }
    }

    // Re-translate boiler status based on current state
    const statusElement = document.getElementById('boilerStatus');
    if (statusElement && expectedEndTime) {
        // If we have an expected end time, update the display with current language
        statusElement.innerHTML = `<span class="status-text">${t.on}</span><br><small class="estimate-text">${t.estimatedReady} ${expectedEndTime}</small>`;
        statusElement.className = 'status-on with-estimate';
    } else if (statusElement) {
        // Regular boiler status without estimate
        const isOn = statusElement.classList.contains('status-on') ||
                     statusElement.textContent === translations['en']?.on ||
                     statusElement.textContent === translations['he']?.on;
        statusElement.textContent = isOn ? t.on : t.off;
        statusElement.className = isOn ? 'status-on' : 'status-off';
    }

    // Re-translate target temperature display
    const targetDisplay = document.getElementById('targetTempDisplay');
    if (targetDisplay) {
        // Extract the temperature value from the current text
        const tempMatch = targetDisplay.textContent.match(/(\d+)°C/);
        const currentTarget = tempMatch ? tempMatch[1] : '--';
        targetDisplay.textContent = `${t.target}: ${currentTarget}°C`;
    }

    // Re-translate modal shower info if modal is open
    const tempSlider = document.getElementById('temperature-input');
    const showerInfo = document.getElementById('shower-info');
    if (tempSlider && tempSlider.value && showerInfo) {
        updateShowerInfo(parseInt(tempSlider.value), showerInfo);
    }
}

// Add mobile-specific initialization
function initializeMobileSupport() {
    // Prevent zoom on double-tap for better UX
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    // Improve touch feedback
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.98)';
        });

        btn.addEventListener('touchend', function() {
            this.style.transform = 'scale(1)';
        });
    });

    // Handle viewport height for mobile browsers
    function setViewportHeight() {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);
}