// ── CONFIG ────────────────────────────────────────────────────────────────────
const API_KEY = 'bd5e378503939ddaee76f12ad7a97608'; // Free OpenWeatherMap API key
const API_URL = (city) =>
  `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;

const STORAGE_KEY = 'weatherHistory';

// ── DOM REFERENCES ────────────────────────────────────────────────────────────
const cityInput   = document.getElementById('cityInput');
const searchBtn   = document.getElementById('searchBtn');
const weatherBox  = document.getElementById('weatherBox');
const historyTags = document.getElementById('historyTags');
const consoleLog  = document.getElementById('consoleLog');

// ── CONSOLE LOG UTILITY ───────────────────────────────────────────────────────
/**
 * Logs a message to the on-screen Event Loop console.
 * @param {string} msg  - Message to display
 * @param {string} type - 'sync' | 'async' | 'promise' | 'macro' | 'error'
 */
function log(msg, type = 'sync') {
  const line = document.createElement('div');
  line.className = 'log-line';
  line.innerHTML = `
    <span class="log-dot log-${type}"></span>
    <span class="log-${type}-text">${msg}</span>
  `;
  consoleLog.appendChild(line);
  consoleLog.scrollTop = consoleLog.scrollHeight;
}

/**
 * Clears all messages from the Event Loop console.
 */
function clearConsole() {
  consoleLog.innerHTML = '';
}

// ── LOCAL STORAGE HELPERS ─────────────────────────────────────────────────────
/**
 * Retrieves search history array from localStorage.
 * @returns {string[]}
 */
function getHistory() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

/**
 * Saves a city to search history (max 8 entries, no duplicates).
 * @param {string} city
 */
function saveToHistory(city) {
  let hist = getHistory();
  // Remove duplicate (case-insensitive), prepend new entry, keep max 8
  hist = hist.filter((c) => c.toLowerCase() !== city.toLowerCase());
  hist.unshift(city);
  if (hist.length > 8) hist = hist.slice(0, 8);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hist));
  renderHistory();
}

/**
 * Renders history tags from localStorage into the DOM.
 */
function renderHistory() {
  const hist = getHistory();
  historyTags.innerHTML = '';
  hist.forEach((city) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = city;
    tag.onclick = () => {
      cityInput.value = city;
      handleSearch();
    };
    historyTags.appendChild(tag);
  });
}

// ── WEATHER DISPLAY HELPERS ───────────────────────────────────────────────────
/**
 * Renders weather data into the weather info panel.
 * @param {object} data - OpenWeatherMap API response object
 */
function showWeather(data) {
  const city    = `${data.name}, ${data.sys.country}`;
  const temp    = data.main.temp.toFixed(1);
  const weather = data.weather[0].main;
  const desc    = data.weather[0].description;
  const humidity = data.main.humidity;
  const wind    = data.wind.speed;

  weatherBox.innerHTML = `
    <div class="weather-card">
      <div class="weather-city">📍 ${city}</div>
      <div class="weather-rows">
        <div class="weather-row">
          <span class="label">Temp</span>
          <span class="value temp-value">${temp} °C</span>
        </div>
        <div class="weather-row">
          <span class="label">Weather</span>
          <span class="value">${weather} — ${desc}</span>
        </div>
        <div class="weather-row">
          <span class="label">Humidity</span>
          <span class="value">${humidity}%</span>
        </div>
        <div class="weather-row">
          <span class="label">Wind</span>
          <span class="value">${wind} m/s</span>
        </div>
      </div>
    </div>`;
}

/**
 * Renders an error message into the weather info panel.
 * @param {string} msg - Error message to display
 */
function showError(msg) {
  weatherBox.innerHTML = `<div class="weather-error">⚠ ${msg}</div>`;
}

// ── CORE ASYNC FUNCTION (async/await + try...catch) ───────────────────────────
/**
 * Fetches weather data from OpenWeatherMap API.
 * Demonstrates Event Loop behavior:
 *   - Synchronous logs run first (Call Stack)
 *   - Promise.resolve().then() = Microtask Queue
 *   - setTimeout(..., 0)       = Macrotask Queue
 *   - await fetch(...)         = Async operation, resumes after microtasks
 *
 * @param {string} city - City name to fetch weather for
 * @returns {Promise<object>} - Resolved weather data object
 */
async function fetchWeather(city) {
  // --- SYNCHRONOUS CODE runs first (Call Stack) ---
  log('Sync Start', 'sync');
  log('Sync End', 'sync');

  // --- MACROTASK: queued in Task Queue, runs after microtasks ---
  setTimeout(() => log('setTimeout (Macrotask)', 'macro'), 0);

  // --- MICROTASK: queued in Microtask Queue, runs before macrotasks ---
  Promise.resolve().then(() => log('Promise.then (Microtask)', 'promise'));

  // --- ASYNC operation begins ---
  log('[ASYNC] Start fetching…', 'async');

  try {
    // await pauses execution here, hands control back to Event Loop
    const response = await fetch(API_URL(city));

    // Parse JSON response body
    const data = await response.json();

    // Handle API-level errors (e.g., city not found → cod: "404")
    if (!response.ok || data.cod === '404') {
      // Returning a rejected Promise — demonstrates Promise rejection
      return Promise.reject(new Error('City not found'));
    }

    log('[ASYNC] Data received ✓', 'async');
    return data;

  } catch (err) {
    // try...catch handles: network failures, JSON parse errors, API errors
    throw err; // re-throw so .catch() in handleSearch() can handle it
  }
}

// ── SEARCH HANDLER ────────────────────────────────────────────────────────────
/**
 * Main handler triggered on Search button click or Enter key.
 * Uses .then() / .catch() / .finally() chaining to handle the Promise
 * returned by fetchWeather().
 */
async function handleSearch() {
  const city = cityInput.value.trim();

  // Guard: empty input
  if (!city) {
    showError('Please enter a city name.');
    return;
  }

  // Set UI to loading state
  searchBtn.disabled = true;
  searchBtn.innerHTML = '<span class="spin"></span>';
  weatherBox.innerHTML = `<div class="weather-empty">Fetching data…</div>`;

  // --- .then() / .catch() / .finally() Promise chaining ---
  fetchWeather(city)
    .then((data) => {
      // Success: render weather and save to history
      showWeather(data);
      saveToHistory(data.name);
    })
    .catch((err) => {
      // Failure: log error and show user-friendly message
      log(`[ERROR] ${err.message}`, 'error');
      showError(err.message || 'Something went wrong. Try again.');
    })
    .finally(() => {
      // Always runs: restore button state
      searchBtn.disabled = false;
      searchBtn.textContent = 'SEARCH';
    });
}

// ── EVENT LISTENERS ───────────────────────────────────────────────────────────
// Allow pressing Enter key to trigger search
cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSearch();
});

// ── INITIALISE ────────────────────────────────────────────────────────────────
// Load and render search history from localStorage on page load
renderHistory();
