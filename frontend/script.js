const API_BASE = "http://127.0.0.1:5000/api";

let currentUnit = "C";
let lastWeatherData = null;
let lastForecastData = null;

const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");
const unitBtn = document.getElementById("unitBtn");
const themeBtn = document.getElementById("themeBtn");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("error");

searchBtn.addEventListener("click", searchCity);

cityInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        searchCity();
    }
});

locationBtn.addEventListener("click", getCurrentLocation);

unitBtn.addEventListener("click", function () {
    currentUnit = currentUnit === "C" ? "F" : "C";
    unitBtn.textContent = currentUnit === "C" ? "°C" : "°F";

    if (lastWeatherData) {
        displayWeather(lastWeatherData);
    }

    if (lastForecastData) {
        displayForecast(lastForecastData);
        displayHourly(lastForecastData);
    }
});

themeBtn.addEventListener("click", function () {
    document.body.classList.toggle("dark");

    const dark = document.body.classList.contains("dark");

    localStorage.setItem("darkMode", dark);
    themeBtn.textContent = dark ? "☀️" : "🌙";
});

if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
    themeBtn.textContent = "☀️";
}


// ================= SEARCH CITY =================

async function searchCity() {

    const city = cityInput.value.trim();

    if (!city) {
        showError("Please enter a city name.");
        return;
    }

    setLoading(true);
    clearError();

    try {

        const response = await fetch(
            `${API_BASE}/weather?city=${encodeURIComponent(city)}`
        );

        const data = await response.json();

        console.log("Weather API:", data);

        if (!response.ok) {
            throw new Error(
                data.error || data.message || "City not found"
            );
        }

        lastWeatherData = data;

        displayWeather(data);

        saveRecentCity(data.name);

        await loadForecast(
            data.coord.lat,
            data.coord.lon
        );

    } catch (error) {

        console.error("Search error:", error);

        showError(error.message);

    } finally {

        setLoading(false);
    }
}


// ================= CURRENT LOCATION =================

async function getCurrentLocation() {

    if (!navigator.geolocation) {
        showError("Geolocation is not supported.");
        return;
    }

    setLoading(true);
    clearError();

    navigator.geolocation.getCurrentPosition(

        async function (position) {

            try {

                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                const response = await fetch(
                    `${API_BASE}/weather-location?lat=${lat}&lon=${lon}`
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        data.message ||
                        "Unable to get location weather."
                    );
                }

                lastWeatherData = data;

                displayWeather(data);

                saveRecentCity(data.name);

                await loadForecast(lat, lon);

            } catch (error) {

                console.error(error);

                showError(error.message);

            } finally {

                setLoading(false);
            }
        },

        function () {

            setLoading(false);

            showError(
                "Location permission was denied or unavailable."
            );
        }
    );
}


// ================= FORECAST =================

async function loadForecast(lat, lon) {

    try {

        const response = await fetch(
            `${API_BASE}/forecast?lat=${lat}&lon=${lon}`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error ||
                data.message ||
                "Forecast unavailable"
            );
        }

        lastForecastData = data;

        displayForecast(data);
        displayHourly(data);

    } catch (error) {

        console.error("Forecast error:", error);

        document.getElementById("forecast").innerHTML =
            `<p>Forecast unavailable</p>`;

        document.getElementById("hourly").innerHTML = "";
    }
}


// ================= DISPLAY WEATHER =================

function displayWeather(data) {

    document.getElementById("city").textContent =
        data.name || "Unknown";

    document.getElementById("country").textContent =
        data.sys?.country || "";

    document.getElementById("icon").textContent =
        weatherEmoji(data.weather?.[0]?.main);

    document.getElementById("description").textContent =
        data.weather?.[0]?.description || "Unavailable";

    document.getElementById("humidity").textContent =
        `${data.main.humidity}%`;

    document.getElementById("wind").textContent =
        `${data.wind.speed} m/s`;

    document.getElementById("clouds").textContent =
        `${data.clouds.all}%`;

    document.getElementById("direction").textContent =
        getWindDirection(data.wind.deg);

    document.getElementById("pressure").textContent =
        `${data.main.pressure} hPa`;

    document.getElementById("visibility").textContent =
        `${((data.visibility || 0) / 1000).toFixed(1)} km`;

    document.getElementById("rain").textContent =
        `${data.rain?.["1h"] || 0} mm`;

    document.getElementById("sunrise").textContent =
        formatTime(data.sys.sunrise);

    document.getElementById("sunset").textContent =
        formatTime(data.sys.sunset);

    updateTemperatureDisplay();
}


// ================= TEMPERATURE =================

function updateTemperatureDisplay() {

    if (!lastWeatherData) return;

    const data = lastWeatherData;

    document.getElementById("temperature").textContent =
        convertTemperature(data.main.temp);

    document.getElementById("unit").textContent =
        `°${currentUnit}`;

    document.getElementById("feels").textContent =
        `${convertTemperature(data.main.feels_like)}°${currentUnit}`;

    document.getElementById("min").textContent =
        `${convertTemperature(data.main.temp_min)}°`;

    document.getElementById("max").textContent =
        `${convertTemperature(data.main.temp_max)}°`;
}


// ================= 5 DAY FORECAST =================

function displayForecast(data) {

    const container =
        document.getElementById("forecast");

    container.innerHTML = "";

    const days = {};

    data.list.forEach(function (item) {

        const date = item.dt_txt.split(" ")[0];

        if (!days[date]) {
            days[date] = item;
        }
    });

    Object.values(days)
        .slice(0, 5)
        .forEach(function (item) {

            const date =
                new Date(item.dt * 1000);

            const element =
                document.createElement("div");

            element.className = "forecast-item";

            element.innerHTML = `
                <div class="date">
                    ${date.toLocaleDateString([], {
                        weekday: "short",
                        day: "numeric"
                    })}
                </div>

                <div class="icon">
                    ${weatherEmoji(item.weather[0].main)}
                </div>

                <strong>
                    ${convertTemperature(item.main.temp)}°${currentUnit}
                </strong>

                <div class="date">
                    ${item.weather[0].description}
                </div>
            `;

            container.appendChild(element);
        });
}


// ================= HOURLY =================

function displayHourly(data) {

    const container =
        document.getElementById("hourly");

    container.innerHTML = "";

    data.list.slice(0, 12).forEach(function (item) {

        const date =
            new Date(item.dt * 1000);

        const element =
            document.createElement("div");

        element.className = "hour-item";

        element.innerHTML = `
            <div class="time">
                ${date.toLocaleTimeString([], {
                    hour: "numeric"
                })}
            </div>

            <div class="icon">
                ${weatherEmoji(item.weather[0].main)}
            </div>

            <strong>
                ${convertTemperature(item.main.temp)}°
            </strong>

            <div class="date">
                ${item.main.humidity}% humidity
            </div>
        `;

        container.appendChild(element);
    });
}


// ================= RECENT CITIES =================

function saveRecentCity(city) {

    let cities =
        JSON.parse(
            localStorage.getItem("recentCities") || "[]"
        );

    cities = cities.filter(
        item =>
            item.toLowerCase() !== city.toLowerCase()
    );

    cities.unshift(city);

    localStorage.setItem(
        "recentCities",
        JSON.stringify(cities.slice(0, 5))
    );

    displayRecentCities();
}

function displayRecentCities() {

    const container =
        document.getElementById("recent");

    if (!container) return;

    const cities =
        JSON.parse(
            localStorage.getItem("recentCities") || "[]"
        );

    container.innerHTML = "";

    cities.forEach(function (city) {

        const button =
            document.createElement("button");

        button.className = "recent-city";

        button.textContent = `📍 ${city}`;

        button.onclick = function () {

            cityInput.value = city;

            searchCity();
        };

        container.appendChild(button);
    });
}


// ================= HELPERS =================

function convertTemperature(celsius) {

    if (currentUnit === "C") {
        return Math.round(celsius);
    }

    return Math.round(
        (celsius * 9 / 5) + 32
    );
}


function formatTime(unix) {

    if (!unix) return "--";

    return new Date(unix * 1000)
        .toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });
}


function getWindDirection(degrees = 0) {

    const directions = [
        "N",
        "NE",
        "E",
        "SE",
        "S",
        "SW",
        "W",
        "NW"
    ];

    return directions[
        Math.round(degrees / 45) % 8
    ];
}


function weatherEmoji(condition = "") {

    const c = condition.toLowerCase();

    if (c.includes("thunder")) return "⛈️";
    if (c.includes("rain")) return "🌧️";
    if (c.includes("drizzle")) return "🌦️";
    if (c.includes("snow")) return "❄️";
    if (c.includes("cloud")) return "☁️";
    if (c.includes("mist")) return "🌫️";
    if (c.includes("fog")) return "🌫️";
    if (c.includes("haze")) return "🌫️";
    if (c.includes("clear")) return "☀️";

    return "🌤️";
}


function setLoading(value) {

    loading.classList.toggle(
        "hidden",
        !value
    );
}


function showError(message) {

    errorMessage.textContent = message;

    errorMessage.classList.remove("hidden");
}


function clearError() {

    errorMessage.textContent = "";

    errorMessage.classList.add("hidden");
}


// ================= START =================

displayRecentCities();

if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

        navigator.serviceWorker
            .register("./service-worker.js")

            .then(() => {
                console.log("Service Worker registered");
            })

            .catch(error => {
                console.error(
                    "Service Worker error:",
                    error
                );
            });
    });
}