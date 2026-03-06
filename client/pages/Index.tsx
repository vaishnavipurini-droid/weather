import { useState, useEffect } from "react";
import { Search, Cloud, CloudRain, Sun, Wind, Droplets, Eye, Gauge, X, Clock } from "lucide-react";

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
}

interface SearchHistory {
  city: string;
  timestamp: number;
}

export default function Index() {
  const [searchInput, setSearchInput] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("weatherHistory");
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse search history:", e);
      }
    }
  }, []);

  // Save search history to localStorage
  const updateSearchHistory = (city: string) => {
    const newHistory = [
      { city, timestamp: Date.now() },
      ...searchHistory.filter(h => h.city.toLowerCase() !== city.toLowerCase())
    ].slice(0, 10);
    
    setSearchHistory(newHistory);
    localStorage.setItem("weatherHistory", JSON.stringify(newHistory));
  };

  const fetchWeather = async (city: string) => {
    if (!city.trim()) {
      setError("Please enter a city name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Using Open-Meteo API (free, no API key required) with geocoding
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
      );
      
      if (!geoResponse.ok) throw new Error("Failed to find city");
      
      const geoData = await geoResponse.json();
      if (!geoData.results || geoData.results.length === 0) {
        setError("City not found. Please try another search.");
        setWeather(null);
        setLoading(false);
        return;
      }

      const { latitude, longitude, name, country } = geoData.results[0];

      // Get weather data
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,visibility&temperature_unit=celsius&wind_speed_unit=kmh&visibility_unit=km&timezone=auto`
      );

      if (!weatherResponse.ok) throw new Error("Failed to fetch weather");

      const weatherDataResponse = await weatherResponse.json();
      const current = weatherDataResponse.current;

      // Map WMO weather codes to descriptions
      const getWeatherDescription = (code: number) => {
        if (code === 0 || code === 1) return "Clear";
        if (code === 2) return "Partly cloudy";
        if (code === 3) return "Overcast";
        if (code === 45 || code === 48) return "Foggy";
        if (code >= 51 && code <= 67) return "Drizzle";
        if (code >= 80 && code <= 82) return "Rain showers";
        if (code >= 85 && code <= 86) return "Snow showers";
        if (code >= 71 && code <= 77) return "Snow";
        if (code >= 80 && code <= 82) return "Rain";
        if (code >= 85 && code <= 86) return "Snow";
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

      const weatherData: WeatherData = {
        city: name,
        country: country || "Unknown",
        temperature: Math.round(current.temperature_2m),
        description: getWeatherDescription(current.weather_code),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        visibility: Math.round(current.visibility * 10) / 10,
        pressure: Math.round(current.wind_direction_10m),
        feelsLike: Math.round(current.apparent_temperature),
        icon: getWeatherIcon(current.weather_code),
      };

      setWeather(weatherData);
      updateSearchHistory(name);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch weather data. Please try again.";
      setError(errorMessage);
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWeather(searchInput);
  };

  const handleHistoryClick = (city: string) => {
    setSearchInput(city);
    fetchWeather(city);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("weatherHistory");
  };

  const removeFromHistory = (city: string) => {
    const newHistory = searchHistory.filter(h => h.city !== city);
    setSearchHistory(newHistory);
    localStorage.setItem("weatherHistory", JSON.stringify(newHistory));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent mb-2">
            Weather Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Get real-time weather information for any location</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-10">
          <div className="relative flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search for a city..."
                className="w-full pl-12 pr-4 py-3 sm:py-4 rounded-lg bg-white dark:bg-slate-800 border-2 border-transparent focus:border-blue-400 dark:focus:border-blue-500 focus:outline-none transition-all duration-200 shadow-lg dark:text-white text-gray-800"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-md"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">Searching...</span>
                </div>
              ) : (
                "Search"
              )}
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Weather Display */}
        {weather && (
          <div className="mb-10 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 sm:p-10 mb-8">
              {/* Main Weather Info */}
              <div className="text-center mb-10">
                <div className="text-6xl sm:text-8xl mb-4 animate-float">
                  {weather.icon}
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white mb-2">
                  {weather.city}, {weather.country}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
                  {weather.description}
                </p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-5xl sm:text-6xl font-bold text-blue-600 dark:text-blue-400">
                    {weather.temperature}°C
                  </span>
                  <span className="text-xl text-gray-500 dark:text-gray-400">
                    Feels like {weather.feelsLike}°C
                  </span>
                </div>
              </div>

              {/* Weather Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4 sm:p-6 text-center">
                  <div className="flex justify-center mb-2">
                    <Droplets className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Humidity</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
                    {weather.humidity}%
                  </p>
                </div>

                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4 sm:p-6 text-center">
                  <div className="flex justify-center mb-2">
                    <Wind className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Wind Speed</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
                    {weather.windSpeed} km/h
                  </p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4 sm:p-6 text-center">
                  <div className="flex justify-center mb-2">
                    <Eye className="w-6 h-6 text-amber-500 dark:text-amber-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Visibility</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
                    {weather.visibility} km
                  </p>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4 sm:p-6 text-center">
                  <div className="flex justify-center mb-2">
                    <Gauge className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Wind Direction</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
                    {weather.pressure}°
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !weather && (
          <div className="text-center py-16">
            <div className="inline-block">
              <div className="w-16 h-16 border-4 border-blue-200 dark:border-slate-700 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">Loading weather data...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!weather && !loading && !error && (
          <div className="text-center py-16">
            <Cloud className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">Search for a city to get started</p>
          </div>
        )}

        {/* Search History */}
        {searchHistory.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                Search History
              </h3>
              <button
                onClick={clearHistory}
                className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((item) => (
                <div
                  key={item.timestamp}
                  className="flex items-center gap-2 bg-gray-100 dark:bg-slate-700 rounded-full px-4 py-2 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors group"
                >
                  <button
                    onClick={() => handleHistoryClick(item.city)}
                    className="text-gray-700 dark:text-gray-200 font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {item.city}
                  </button>
                  <button
                    onClick={() => removeFromHistory(item.city)}
                    className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
