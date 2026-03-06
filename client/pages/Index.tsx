import { useState, useEffect, useRef } from "react";
import { Search, Cloud, Heart, MapPin, Moon, Sun, Mic, Settings, Zap, TrendingUp, AlertCircle, X, Clock } from "lucide-react";
import Forecast from "@/components/Forecast";
import TemperatureChart from "@/components/TemperatureChart";
import AirQuality from "@/components/AirQuality";

interface WeatherData {
  city: string;
  country: string;
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  pressure: number;
  feelsLike: number;
  icon: string;
  rainChance?: number;
  sunrise?: string;
  sunset?: string;
  uv?: number;
  uvIndex?: number;
  coordinates: { lat: number; lon: number };
}

interface ForecastDay {
  date: string;
  temp: number;
  tempMin: number;
  tempMax: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  code: number;
}

interface ChartData {
  time: string;
  temperature: number;
}

interface AirQualityData {
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
}

interface SearchHistory {
  city: string;
  timestamp: number;
}

interface Favorite {
  city: string;
  country: string;
}

const OPENWEATHER_API_KEY = "demo"; // Using open-meteo which doesn't require API key

export default function Index() {
  const [searchInput, setSearchInput] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isCelsius, setIsCelsius] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load preferences and history
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("weatherDarkMode");
    const savedUnit = localStorage.getItem("weatherUnit");
    const savedHistory = localStorage.getItem("weatherHistory");
    const savedFavorites = localStorage.getItem("weatherFavorites");

    if (savedDarkMode) setIsDarkMode(JSON.parse(savedDarkMode));
    if (savedUnit) setIsCelsius(JSON.parse(savedUnit));
    if (savedHistory) setSearchHistory(JSON.parse(savedHistory));
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));

    // Apply dark mode
    if (JSON.parse(savedDarkMode || "false")) {
      document.documentElement.classList.add("dark");
    }

    // Try geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeatherByCoords(latitude, longitude);
        },
        () => {}
      );
    }
  }, []);

  // Save preferences
  useEffect(() => {
    localStorage.setItem("weatherDarkMode", JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem("weatherUnit", JSON.stringify(isCelsius));
  }, [isCelsius]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCitySuggestions = async (query: string) => {
    if (query.length < 2) {
      setCitySuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
      );
      const data = await response.json();
      setCitySuggestions(data.results || []);
      setShowSuggestions(true);
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    }
  };

  const fetchWeatherByCoords = async (lat: number, lon: number) => {
    try {
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const geoData = await geoResponse.json();
      const cityName = geoData.address?.city || geoData.address?.town || geoData.address?.village || "Unknown";
      await fetchWeatherData(cityName, lat, lon);
    } catch (err) {
      console.error("Geolocation error:", err);
    }
  };

  const fetchWeatherData = async (city: string, latitude?: number, longitude?: number) => {
    setLoading(true);
    setError(null);

    try {
      let lat = latitude;
      let lon = longitude;

      // Get coordinates if not provided
      if (lat === undefined || lon === undefined) {
        const geoResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
        );
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
          setError("City not found. Please try another search.");
          setLoading(false);
          return;
        }

        lat = geoData.results[0].latitude;
        lon = geoData.results[0].longitude;
      }

      // Fetch current weather
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,visibility,pressure_msl&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,windspeed_10m_max,relative_humidity_2m_max&hourly=temperature_2m&temperature_unit=${isCelsius ? "celsius" : "fahrenheit"}&wind_speed_unit=kmh&visibility_unit=km&timezone=auto`
      );

      if (!weatherResponse.ok) throw new Error("Failed to fetch weather");

      const weatherDataResponse = await weatherResponse.json();
      const current = weatherDataResponse.current;
      const daily = weatherDataResponse.daily;
      const hourly = weatherDataResponse.hourly;

      const getWeatherDescription = (code: number) => {
        if (code === 0 || code === 1) return "Clear";
        if (code === 2) return "Partly cloudy";
        if (code === 3) return "Overcast";
        if (code === 45 || code === 48) return "Foggy";
        if (code >= 51 && code <= 67) return "Drizzle";
        if (code >= 80 && code <= 82) return "Rain showers";
        if (code >= 85 && code <= 86) return "Snow showers";
        if (code >= 71 && code <= 77) return "Snow";
        if (code === 95 || code === 96 || code === 99) return "Thunderstorm";
        return "Unknown";
      };

      const getWeatherIcon = (code: number) => {
        if (code === 0 || code === 1) return "☀️";
        if (code === 2) return "⛅";
        if (code === 3) return "☁️";
        if (code === 45 || code === 48) return "🌫️";
        if (code >= 51 && code <= 67) return "🌧️";
        if (code >= 80 && code <= 82) return "🌧️";
        if (code >= 85 && code <= 86) return "🌨️";
        if (code >= 71 && code <= 77) return "🌨️";
        if (code === 95 || code === 96 || code === 99) return "⛈️";
        return "🌤️";
      };

      // Get country info
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const geoData = await geoResponse.json();
      const countryName = geoData.address?.country || "Unknown";

      const weatherData: WeatherData = {
        city,
        country: countryName,
        temperature: Math.round(current.temperature_2m),
        description: getWeatherDescription(current.weather_code),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        visibility: Math.round(current.visibility * 10) / 10,
        pressure: Math.round(current.pressure_msl),
        feelsLike: Math.round(current.apparent_temperature),
        icon: getWeatherIcon(current.weather_code),
        rainChance: Math.round(current.precipitation || 0),
        sunrise: daily.sunrise?.[0]?.split("T")[1] || undefined,
        sunset: daily.sunset?.[0]?.split("T")[1] || undefined,
        coordinates: { lat, lon },
      };

      setWeather(weatherData);
      updateSearchHistory(city);

      // Fetch 5-day forecast
      const forecastDays: ForecastDay[] = daily.time.slice(0, 5).map((date: string, index: number) => ({
        date,
        temp: daily.temperature_2m_max[index],
        tempMin: daily.temperature_2m_min[index],
        tempMax: daily.temperature_2m_max[index],
        description: getWeatherDescription(daily.weather_code[index]),
        icon: getWeatherIcon(daily.weather_code[index]),
        humidity: daily.relative_humidity_2m_max[index],
        windSpeed: Math.round(daily.windspeed_10m_max[index]),
        code: daily.weather_code[index],
      }));

      setForecast(forecastDays);

      // Prepare chart data from hourly data
      const now = new Date();
      const chartDataPoints: ChartData[] = hourly.time.slice(0, 24).map((time: string, index: number) => ({
        time: new Date(time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        temperature: hourly.temperature_2m[index],
      }));

      setChartData(chartDataPoints);

      // Fetch air quality data
      try {
        const aqResponse = await fetch(
          `https://api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone`
        );
        if (aqResponse.ok) {
          const aqData = await aqResponse.json();
          const current_aq = aqData.current;
          setAirQuality({
            aqi: current_aq.us_aqi || 2,
            pm25: current_aq.pm2_5 || 0,
            pm10: current_aq.pm10 || 0,
            no2: current_aq.nitrogen_dioxide || 0,
            o3: current_aq.ozone || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching air quality:", err);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch weather data.";
      setError(errorMessage);
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchWeatherData(searchInput);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setSearchInput(suggestion.name);
    fetchWeatherData(suggestion.name, suggestion.latitude, suggestion.longitude);
    setShowSuggestions(false);
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice search is not supported in your browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.start();
    setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchInput(transcript);
      fetchWeatherData(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setError("Voice search failed. Please try again.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  const updateSearchHistory = (city: string) => {
    const newHistory = [
      { city, timestamp: Date.now() },
      ...searchHistory.filter(h => h.city.toLowerCase() !== city.toLowerCase())
    ].slice(0, 10);

    setSearchHistory(newHistory);
    localStorage.setItem("weatherHistory", JSON.stringify(newHistory));
  };

  const toggleFavorite = () => {
    if (!weather) return;

    const isFavorited = favorites.some(fav => fav.city.toLowerCase() === weather.city.toLowerCase());

    if (isFavorited) {
      const newFavorites = favorites.filter(fav => fav.city.toLowerCase() !== weather.city.toLowerCase());
      setFavorites(newFavorites);
      localStorage.setItem("weatherFavorites", JSON.stringify(newFavorites));
    } else {
      const newFavorite: Favorite = { city: weather.city, country: weather.country };
      const newFavorites = [...favorites, newFavorite];
      setFavorites(newFavorites);
      localStorage.setItem("weatherFavorites", JSON.stringify(newFavorites));
    }
  };

  const isFavorited = weather && favorites.some(fav => fav.city.toLowerCase() === weather.city.toLowerCase());

  const getBackgroundStyle = () => {
    if (!weather) return "from-blue-50 via-cyan-50 to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900";

    const desc = weather.description.toLowerCase();
    if (desc.includes("rain") || desc.includes("drizzle")) {
      return "from-slate-400 via-slate-500 to-slate-600 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900";
    }
    if (desc.includes("snow")) {
      return "from-blue-100 via-blue-50 to-white dark:from-slate-800 dark:via-slate-700 dark:to-slate-900";
    }
    if (desc.includes("clear") || desc.includes("sunny")) {
      return "from-yellow-100 via-blue-100 to-cyan-100 dark:from-orange-900 dark:via-slate-800 dark:to-slate-900";
    }
    if (desc.includes("cloud")) {
      return "from-gray-200 via-gray-100 to-gray-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-900";
    }
    if (desc.includes("thunderstorm")) {
      return "from-purple-600 via-slate-700 to-slate-800 dark:from-slate-900 dark:via-slate-800 dark:to-black";
    }
    return "from-blue-50 via-cyan-50 to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900";
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getBackgroundStyle()} transition-all duration-500`}>
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10 sm:mb-14 bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-2xl p-6 shadow-lg">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-300 dark:to-cyan-300 bg-clip-text text-transparent mb-2">
              Weather Hub
            </h1>
            <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">Real-time weather for every location</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCelsius(!isCelsius)}
              className="px-4 py-2 bg-white dark:bg-slate-800 rounded-lg font-bold text-gray-700 dark:text-white hover:shadow-lg transition-all duration-200"
            >
              {isCelsius ? "°C" : "°F"}
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-3 bg-white dark:bg-slate-800 rounded-lg text-gray-700 dark:text-yellow-400 hover:shadow-lg transition-all duration-200"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-10 relative">
          <div className="flex gap-2">
            <div className="flex-1 relative" ref={suggestionsRef}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  fetchCitySuggestions(e.target.value);
                }}
                placeholder="Search for a city..."
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-white dark:bg-slate-800 border-2 border-transparent focus:border-blue-400 dark:focus:border-blue-500 focus:outline-none transition-all duration-200 shadow-lg dark:text-white"
              />

              {/* Autocomplete Suggestions */}
              {showSuggestions && citySuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                  {citySuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors border-b dark:border-slate-700 last:border-b-0"
                    >
                      <p className="font-semibold text-gray-800 dark:text-white">{suggestion.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{suggestion.country}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 sm:px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Search"
              )}
            </button>

            <button
              type="button"
              onClick={startVoiceSearch}
              disabled={isListening}
              className={`p-4 rounded-xl font-semibold transition-all duration-200 shadow-lg ${
                isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-white dark:bg-slate-800 text-gray-700 dark:text-white hover:shadow-xl"
              }`}
            >
              <Mic className={`w-5 h-5 ${isListening ? "animate-pulse" : ""}`} />
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{error}</p>
            </div>
          </div>
        )}

        {/* Current Weather Display */}
        {weather && (
          <div className="mb-10 animate-in fade-in duration-300 space-y-8">
            {/* Main Weather Card */}
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-3xl shadow-2xl p-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <MapPin className="w-6 h-6 text-gray-400" />
                  <div>
                    <h2 className="text-4xl font-bold text-gray-800 dark:text-white">
                      {weather.city}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-lg">{weather.country}</p>
                  </div>
                </div>
                <button
                  onClick={toggleFavorite}
                  className={`p-4 rounded-full transition-all duration-200 ${
                    isFavorited
                      ? "bg-red-100 dark:bg-red-900/30 text-red-500"
                      : "bg-gray-100 dark:bg-slate-700 text-gray-400 hover:text-red-400"
                  }`}
                >
                  <Heart className="w-7 h-7" fill={isFavorited ? "currentColor" : "none"} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Left: Temperature */}
                <div className="flex flex-col justify-center">
                  <div className="text-9xl mb-6 animate-float">
                    {weather.icon}
                  </div>
                  <p className="text-2xl text-gray-600 dark:text-gray-400 mb-6 font-semibold capitalize">
                    {weather.description}
                  </p>
                  <div className="flex items-baseline gap-4 mb-8">
                    <div className="text-8xl font-bold text-blue-600 dark:text-blue-400">
                      {weather.temperature}°
                    </div>
                    <div className="text-xl text-gray-600 dark:text-gray-400">
                      Feels like <span className="font-bold text-cyan-600 dark:text-cyan-400">{weather.feelsLike}°</span>
                    </div>
                  </div>
                </div>

                {/* Right: Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl p-6">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Humidity</p>
                    <p className="text-4xl font-bold text-gray-800 dark:text-white">{weather.humidity}%</p>
                  </div>
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl p-6">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Wind Speed</p>
                    <p className="text-4xl font-bold text-gray-800 dark:text-white">{weather.windSpeed} <span className="text-sm">km/h</span></p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl p-6">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Visibility</p>
                    <p className="text-4xl font-bold text-gray-800 dark:text-white">{weather.visibility} <span className="text-sm">km</span></p>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl p-6">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Pressure</p>
                    <p className="text-4xl font-bold text-gray-800 dark:text-white">{weather.pressure} <span className="text-sm">hPa</span></p>
                  </div>
                  {weather.sunrise && (
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl p-6">
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Sunrise</p>
                      <p className="text-3xl font-bold text-gray-800 dark:text-white">{weather.sunrise}</p>
                    </div>
                  )}
                  {weather.sunset && (
                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl p-6">
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Sunset</p>
                      <p className="text-3xl font-bold text-gray-800 dark:text-white">{weather.sunset}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Temperature Chart */}
            {chartData.length > 0 && (
              <TemperatureChart data={chartData} isCelsius={isCelsius} />
            )}

            {/* 5-Day Forecast */}
            {forecast.length > 0 && (
              <Forecast forecast={forecast} isCelsius={isCelsius} />
            )}

            {/* Air Quality */}
            {airQuality && (
              <AirQuality
                aqi={airQuality.aqi}
                pm25={airQuality.pm25}
                pm10={airQuality.pm10}
                no2={airQuality.no2}
                o3={airQuality.o3}
              />
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && !weather && (
          <div className="text-center py-24">
            <div className="inline-block">
              <div className="w-24 h-24 border-4 border-blue-200 dark:border-slate-700 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin mb-6" />
              <p className="text-gray-700 dark:text-gray-300 text-2xl font-bold">Loading weather data...</p>
              <p className="text-gray-600 dark:text-gray-400 text-lg mt-2">Fetching forecast, air quality & trends</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!weather && !loading && !error && (
          <div className="text-center py-24">
            <Cloud className="w-24 h-24 text-gray-400 dark:text-gray-600 mx-auto mb-8 animate-bounce" />
            <h3 className="text-3xl font-bold text-gray-700 dark:text-gray-300 mb-3">Ready to explore weather?</h3>
            <p className="text-gray-600 dark:text-gray-400 text-xl max-w-md mx-auto">
              Search for a city, use voice search, or let us find your location. Discover detailed forecasts, air quality, and temperature trends.
            </p>
          </div>
        )}

        {/* Favorites */}
        {favorites.length > 0 && (
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Heart className="w-6 h-6 text-red-500" fill="currentColor" />
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Favorite Cities</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {favorites.map((fav) => (
                <button
                  key={fav.city}
                  onClick={() => {
                    setSearchInput(fav.city);
                    fetchWeatherData(fav.city);
                  }}
                  className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-slate-700 dark:to-slate-700 rounded-xl px-4 py-3 text-center hover:shadow-lg transition-all duration-200 hover:scale-105"
                >
                  <p className="font-semibold text-gray-800 dark:text-white">{fav.city}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">{fav.country}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search History */}
        {searchHistory.length > 0 && (
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                <Clock className="w-6 h-6 text-blue-500" />
                Recent Searches
              </h3>
              <button
                onClick={() => {
                  setSearchHistory([]);
                  localStorage.removeItem("weatherHistory");
                }}
                className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-semibold transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {searchHistory.map((item) => (
                <button
                  key={item.timestamp}
                  onClick={() => {
                    setSearchInput(item.city);
                    fetchWeatherData(item.city);
                  }}
                  className="bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-slate-700 dark:to-slate-700 rounded-full px-4 py-2 hover:shadow-md transition-all hover:scale-105 text-gray-700 dark:text-white font-semibold"
                >
                  {item.city}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
