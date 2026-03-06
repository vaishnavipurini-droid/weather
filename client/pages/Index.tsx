import { useState, useEffect } from "react";
import { Search, Cloud, CloudRain, Sun, Wind, Droplets, Eye, Gauge, X, Clock, Heart, MapPin, Settings, Zap, TrendingUp, Moon, Sunrise, Sunset } from "lucide-react";

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
  uvIndex?: number;
  rainChance?: number;
  sunrise?: string;
  sunset?: string;
}

interface SearchHistory {
  city: string;
  timestamp: number;
}

interface Favorite {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

export default function Index() {
  const [searchInput, setSearchInput] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isCelsius, setIsCelsius] = useState(true);
  const [lastLocation, setLastLocation] = useState<{ city: string; latitude: number; longitude: number } | null>(null);

  // Load favorites and search history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("weatherHistory");
    const savedFavorites = localStorage.getItem("weatherFavorites");
    const savedUnit = localStorage.getItem("weatherUnit");

    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse search history:", e);
      }
    }

    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error("Failed to parse favorites:", e);
      }
    }

    if (savedUnit) {
      setIsCelsius(JSON.parse(savedUnit));
    }

    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeatherByCoords(latitude, longitude);
        },
        () => {
          // Silently fail if geolocation is denied
        }
      );
    }
  }, []);

  const fetchWeatherByCoords = async (latitude: number, longitude: number) => {
    try {
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );

      if (!geoResponse.ok) return;

      const geoData = await geoResponse.json();
      const cityName = geoData.address?.city || geoData.address?.town || geoData.address?.village || "Unknown";

      setLastLocation({ city: cityName, latitude, longitude });

      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,visibility,pressure_msl&daily=sunrise,sunset&temperature_unit=${isCelsius ? "celsius" : "fahrenheit"}&wind_speed_unit=kmh&visibility_unit=km&timezone=auto`
      );

      if (!weatherResponse.ok) return;

      const weatherData = await weatherResponse.json();
      const current = weatherData.current;
      const daily = weatherData.daily;

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

      const weatherObj: WeatherData = {
        city: cityName,
        country: geoData.address?.country || "Unknown",
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
      };

      setWeather(weatherObj);
      setSearchInput(cityName);
    } catch (err) {
      console.error("Failed to fetch weather by coordinates:", err);
    }
  };

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

      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,visibility,pressure_msl&daily=sunrise,sunset&temperature_unit=${isCelsius ? "celsius" : "fahrenheit"}&wind_speed_unit=kmh&visibility_unit=km&timezone=auto`
      );

      if (!weatherResponse.ok) throw new Error("Failed to fetch weather");

      const weatherDataResponse = await weatherResponse.json();
      const current = weatherDataResponse.current;
      const daily = weatherDataResponse.daily;

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

      const weatherData: WeatherData = {
        city: name,
        country: country || "Unknown",
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

  const toggleFavorite = () => {
    if (!weather) return;

    const isFavorited = favorites.some(fav => fav.city.toLowerCase() === weather.city.toLowerCase());

    if (isFavorited) {
      const newFavorites = favorites.filter(fav => fav.city.toLowerCase() !== weather.city.toLowerCase());
      setFavorites(newFavorites);
      localStorage.setItem("weatherFavorites", JSON.stringify(newFavorites));
    } else {
      // Get coordinates from the last successful search
      // For now, we'll store city and country as identifier
      const newFavorite: Favorite = {
        city: weather.city,
        country: weather.country,
        latitude: 0,
        longitude: 0
      };
      const newFavorites = [...favorites, newFavorite];
      setFavorites(newFavorites);
      localStorage.setItem("weatherFavorites", JSON.stringify(newFavorites));
    }
  };

  const isFavorited = weather && favorites.some(fav => fav.city.toLowerCase() === weather.city.toLowerCase());

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("weatherHistory");
  };

  const removeFromHistory = (city: string) => {
    const newHistory = searchHistory.filter(h => h.city !== city);
    setSearchHistory(newHistory);
    localStorage.setItem("weatherHistory", JSON.stringify(newHistory));
  };

  const convertTemp = (celsius: number) => {
    return isCelsius ? celsius : Math.round((celsius * 9/5) + 32);
  };

  const tempUnit = isCelsius ? "°C" : "°F";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Header with Settings */}
        <div className="flex items-center justify-between mb-10 sm:mb-14">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent mb-2">
              Weather Hub
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">Real-time weather for every location</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCelsius(!isCelsius)}
              className="px-4 py-2 bg-white dark:bg-slate-800 border-2 border-blue-200 dark:border-slate-700 rounded-lg font-semibold text-gray-700 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
            >
              {isCelsius ? "°C" : "°F"}
            </button>
          </div>
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
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-white dark:bg-slate-800 border-2 border-transparent focus:border-blue-400 dark:focus:border-blue-500 focus:outline-none transition-all duration-200 shadow-lg dark:text-white text-gray-800 placeholder-gray-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 sm:px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-md"
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
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Weather Display */}
        {weather && (
          <div className="mb-10 animate-in fade-in duration-300">
            {/* Main Weather Card */}
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-2xl p-8 sm:p-10 mb-8">
              {/* Header with Favorite Button */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white">
                      {weather.city}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">{weather.country}</p>
                  </div>
                </div>
                <button
                  onClick={toggleFavorite}
                  className={`p-3 rounded-full transition-all duration-200 ${
                    isFavorited
                      ? "bg-red-100 dark:bg-red-900/30 text-red-500"
                      : "bg-gray-100 dark:bg-slate-700 text-gray-400 hover:text-red-400"
                  }`}
                >
                  <Heart className="w-6 h-6" fill={isFavorited ? "currentColor" : "none"} />
                </button>
              </div>

              {/* Temperature Section */}
              <div className="text-center mb-10 pb-10 border-b border-gray-200 dark:border-slate-600">
                <div className="text-8xl sm:text-9xl mb-4 animate-float">
                  {weather.icon}
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-xl mb-4 font-semibold">
                  {weather.description}
                </p>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <div>
                    <div className="text-6xl sm:text-7xl font-bold text-blue-600 dark:text-blue-400">
                      {convertTemp(weather.temperature)}{tempUnit}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-400 text-lg">Feels like</p>
                    <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                      {convertTemp(weather.feelsLike)}{tempUnit}
                    </p>
                  </div>
                </div>
              </div>

              {/* Weather Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                {/* Humidity */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-700/50 dark:to-slate-700 rounded-xl p-4 sm:p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="flex justify-center mb-3">
                    <Droplets className="w-7 h-7 text-blue-500 dark:text-blue-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 font-medium">Humidity</p>
                  <p className="text-3xl font-bold text-gray-800 dark:text-white">
                    {weather.humidity}%
                  </p>
                </div>

                {/* Wind Speed */}
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-slate-700/50 dark:to-slate-700 rounded-xl p-4 sm:p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="flex justify-center mb-3">
                    <Wind className="w-7 h-7 text-cyan-500 dark:text-cyan-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 font-medium">Wind Speed</p>
                  <p className="text-3xl font-bold text-gray-800 dark:text-white">
                    {weather.windSpeed} <span className="text-sm">km/h</span>
                  </p>
                </div>

                {/* Visibility */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-slate-700/50 dark:to-slate-700 rounded-xl p-4 sm:p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="flex justify-center mb-3">
                    <Eye className="w-7 h-7 text-amber-500 dark:text-amber-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 font-medium">Visibility</p>
                  <p className="text-3xl font-bold text-gray-800 dark:text-white">
                    {weather.visibility} <span className="text-sm">km</span>
                  </p>
                </div>

                {/* Pressure */}
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-slate-700/50 dark:to-slate-700 rounded-xl p-4 sm:p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="flex justify-center mb-3">
                    <Gauge className="w-7 h-7 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 font-medium">Pressure</p>
                  <p className="text-3xl font-bold text-gray-800 dark:text-white">
                    {weather.pressure} <span className="text-sm">hPa</span>
                  </p>
                </div>

                {/* Rain Chance */}
                {weather.rainChance !== undefined && (
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-slate-700/50 dark:to-slate-700 rounded-xl p-4 sm:p-6 text-center hover:shadow-lg transition-shadow">
                    <div className="flex justify-center mb-3">
                      <CloudRain className="w-7 h-7 text-purple-500 dark:text-purple-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 font-medium">Precipitation</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-white">
                      {weather.rainChance} <span className="text-sm">mm</span>
                    </p>
                  </div>
                )}

                {/* Sunrise */}
                {weather.sunrise && (
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-slate-700/50 dark:to-slate-700 rounded-xl p-4 sm:p-6 text-center hover:shadow-lg transition-shadow">
                    <div className="flex justify-center mb-3">
                      <Sunrise className="w-7 h-7 text-orange-500 dark:text-orange-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 font-medium">Sunrise</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-white">
                      {weather.sunrise}
                    </p>
                  </div>
                )}

                {/* Sunset */}
                {weather.sunset && (
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-slate-700/50 dark:to-slate-700 rounded-xl p-4 sm:p-6 text-center hover:shadow-lg transition-shadow">
                    <div className="flex justify-center mb-3">
                      <Sunset className="w-7 h-7 text-pink-500 dark:text-pink-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 font-medium">Sunset</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-white">
                      {weather.sunset}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !weather && (
          <div className="text-center py-16">
            <div className="inline-block">
              <div className="w-20 h-20 border-4 border-blue-200 dark:border-slate-700 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-xl font-semibold">Loading weather data...</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">This may take a moment</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!weather && !loading && !error && (
          <div className="text-center py-16">
            <div className="inline-block">
              <Cloud className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-6 animate-bounce" />
              <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">No Weather Data</h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg">Search for a city to get started with real-time weather updates</p>
            </div>
          </div>
        )}

        {/* Favorites Section */}
        {favorites.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 sm:p-8 mb-8">
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
                    fetchWeather(fav.city);
                  }}
                  className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-slate-700 dark:to-slate-700 rounded-xl px-4 py-3 text-center hover:shadow-lg transition-all duration-200 hover:scale-105"
                >
                  <p className="font-semibold text-gray-800 dark:text-white text-sm sm:text-base">{fav.city}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">{fav.country}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search History */}
        {searchHistory.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                <Clock className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                Recent Searches
              </h3>
              <button
                onClick={clearHistory}
                className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-semibold transition-colors bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-lg"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {searchHistory.map((item) => (
                <div
                  key={item.timestamp}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-slate-700 dark:to-slate-700 rounded-full px-4 py-2 hover:shadow-md transition-all group"
                >
                  <button
                    onClick={() => handleHistoryClick(item.city)}
                    className="text-gray-700 dark:text-gray-200 font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm sm:text-base"
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
