import { Cloud, CloudRain, Sun, CloudSnow, CloudDrizzle, Zap } from "lucide-react";

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

interface ForecastProps {
  forecast: ForecastDay[];
  isCelsius: boolean;
}

export default function Forecast({ forecast, isCelsius }: ForecastProps) {
  const getWeatherIcon = (code: number) => {
    if (code === 0 || code === 1) return "☀️";
    if (code === 2) return "⛅";
    if (code === 3) return "☁️";
    if (code === 45 || code === 48) return "🌫️";
    if (code >= 51 && code <= 67) return "🌧️";
    if (code >= 80 && code <= 82) return "🌧️";
    if (code >= 85 && code === 86) return "🌨️";
    if (code >= 71 && code <= 77) return "🌨️";
    if (code === 95 || code === 96 || code === 99) return "⛈️";
    return "🌤️";
  };

  const convertTemp = (celsius: number) => {
    return isCelsius ? Math.round(celsius) : Math.round((celsius * 9/5) + 32);
  };

  const tempUnit = isCelsius ? "°C" : "°F";

  const getDayName = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
        5-Day Forecast
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {forecast.map((day, index) => (
          <div
            key={index}
            className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-700 dark:to-slate-600 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
          >
            <div className="text-center">
              <p className="font-bold text-gray-700 dark:text-white mb-2">
                {getDayName(day.date)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>

              <div className="text-5xl mb-4 text-center">
                {getWeatherIcon(day.code)}
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 capitalize h-10 flex items-center justify-center">
                {day.description}
              </p>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">High</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {convertTemp(day.tempMax)}{tempUnit}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Low</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">
                    {convertTemp(day.tempMin)}{tempUnit}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200 dark:border-slate-500 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-gray-500">💧 Humidity</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{day.humidity}%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-gray-500">💨 Wind</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{day.windSpeed} km/h</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
