// =============================================
//  WEATHER TRACKER - script.js
//  Concepts used: fetch, localStorage, DOM manipulation,
//  event loop, console methods, async/await, error handling
// =============================================

const API_KEY = "3c7668f51aec9afb542d0985210869f6"; // <-- paste your OpenWeatherMap API key here
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

// DOM Elements
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const errorMsg = document.getElementById("errorMsg");
const weatherCard = document.getElementById("weatherCard");
const clearBtn = document.getElementById("clearBtn");
const historyList = document.getElementById("historyList");

// =============================================
// EVENT LISTENERS  (Event Loop Demo)
// - click, keydown go into the Web API
// - callback is pushed to callback queue
// - event loop picks it up when call stack is clear
// =============================================

searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  console.group("🔍 Search Triggered");
  console.log("City entered:", city);
  console.log("Timestamp:", new Date().toLocaleTimeString());
  console.groupEnd();

  if (!city) {
    console.warn("⚠️ Empty input - no city entered");
    return;
  }

  getWeather(city);
});

// Enter key support
cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

clearBtn.addEventListener("click", () => {
  localStorage.removeItem("weatherHistory");
  console.log("🗑️ History cleared from localStorage");
  renderHistory();
});

// =============================================
// FETCH WEATHER (async/await + Promises)
// =============================================

async function getWeather(city) {
  const url = `${BASE_URL}?q=${city}&appid=${API_KEY}&units=metric`;

  console.group(`📡 API Call for: "${city}"`);
  console.log("Request URL:", url);

  try {
    // fetch() is async - goes to Web APIs, returns Promise
    const response = await fetch(url);

    console.log("Response status:", response.status);

    if (!response.ok) {
      // City not found = 404
      throw new Error(`City not found (Status: ${response.status})`);
    }

    const data = await response.json(); // parse JSON
    console.log("✅ Data received:", data);
    console.groupEnd();

    showWeather(data);
    saveToHistory(city);
    hideError();

  } catch (error) {
    console.error("❌ Error fetching weather:", error.message);
    console.warn("Make sure city name is correct and API key is valid");
    console.groupEnd();

    showError();
    hideWeatherCard();
  }
}

// =============================================
// DOM MANIPULATION
// innerText vs innerHTML vs textContent demo:
//   - innerText: visible text only (no HTML tags, collapses whitespace)
//   - innerHTML: renders HTML markup
//   - textContent: raw text including hidden, no HTML rendering
// =============================================

function showWeather(data) {
  // Using innerText for plain text (safe, no HTML injection)
  document.getElementById("cityName").innerText = `${data.name}, ${data.sys.country}`;
  document.getElementById("temp").innerText = `${Math.round(data.main.temp)}°C`;
  document.getElementById("condition").innerText = data.weather[0].description;
  document.getElementById("humidity").innerText = `${data.main.humidity}%`;
  document.getElementById("wind").innerText = `${data.wind.speed} m/s`;
  document.getElementById("feelsLike").innerText = `${Math.round(data.main.feels_like)}°C`;

  weatherCard.classList.remove("hidden");
  errorMsg.classList.add("hidden");

  console.info("🌡️ Weather card updated in DOM");
}

function showError() {
  errorMsg.classList.remove("hidden");
}

function hideError() {
  errorMsg.classList.add("hidden");
}

function hideWeatherCard() {
  weatherCard.classList.add("hidden");
}

// =============================================
// LOCAL STORAGE
// - stores data as strings (use JSON.stringify/parse)
// - persists even after page refresh
// - max ~5MB per domain
// =============================================

function saveToHistory(city) {
  const cityFormatted = city.trim().toLowerCase();

  // getItem returns null if key doesn't exist
  let history = JSON.parse(localStorage.getItem("weatherHistory")) || [];

  // Avoid duplicates (case insensitive)
  if (!history.includes(cityFormatted)) {
    history.unshift(cityFormatted); // add to front
    if (history.length > 8) history.pop(); // max 8 entries

    // setItem stores as string
    localStorage.setItem("weatherHistory", JSON.stringify(history));
    console.log("💾 Saved to localStorage:", history);
  } else {
    console.log("ℹ️ City already in history, not duplicating");
  }

  renderHistory();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem("weatherHistory")) || [];

  historyList.innerHTML = ""; // clear old tags

  if (history.length === 0) {
    historyList.innerHTML = `<span class="history-empty">No recent searches yet</span>`;
    return;
  }

  history.forEach((city) => {
    const tag = document.createElement("span"); // create element
    tag.className = "history-tag";
    tag.innerText = city.charAt(0).toUpperCase() + city.slice(1); // capitalize

    // clicking a tag re-searches that city
    tag.addEventListener("click", () => {
      cityInput.value = city;
      getWeather(city);
    });

    historyList.appendChild(tag); // add to DOM
  });
}

// =============================================
// ON PAGE LOAD - show saved history
// =============================================

window.addEventListener("load", () => {
  console.log("📦 Page loaded - checking localStorage for history...");
  const saved = localStorage.getItem("weatherHistory");
  console.log("Stored history:", saved ? JSON.parse(saved) : "none");
  renderHistory();
});