import { AlertCircle, CheckCircle, Wind } from "lucide-react";

interface AirQualityProps {
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
}

export default function AirQuality({ aqi, pm25, pm10, no2, o3 }: AirQualityProps) {
  const getAQIStatus = (value: number) => {
    if (value === 1) return { label: "Good", color: "green", bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-700 dark:text-green-400" };
    if (value === 2) return { label: "Fair", color: "yellow", bg: "bg-yellow-50 dark:bg-yellow-900/20", text: "text-yellow-700 dark:text-yellow-400" };
    if (value === 3) return { label: "Moderate", color: "orange", bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-700 dark:text-orange-400" };
    if (value === 4) return { label: "Poor", color: "red", bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-400" };
    return { label: "Very Poor", color: "red", bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-400" };
  };

  const status = getAQIStatus(aqi);

  const getPollutantStatus = (value: number, type: string) => {
    // Simple classification based on common thresholds
    if (type === "pm25") {
      if (value <= 12) return "Good";
      if (value <= 35.4) return "Moderate";
      if (value <= 55.4) return "Unhealthy for Sensitive Groups";
      if (value <= 150.4) return "Unhealthy";
      return "Very Unhealthy";
    }
    if (type === "pm10") {
      if (value <= 54) return "Good";
      if (value <= 154) return "Moderate";
      if (value <= 254) return "Unhealthy for Sensitive Groups";
      if (value <= 354) return "Unhealthy";
      return "Very Unhealthy";
    }
    return "Moderate";
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <Wind className="w-8 h-8 text-blue-500" />
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          Air Quality Index
        </h2>
      </div>

      {/* Main AQI Status */}
      <div className={`${status.bg} rounded-xl p-6 mb-8 border-l-4 border-${status.color}-500`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 dark:text-gray-400 mb-2">Current AQI Status</p>
            <p className={`text-4xl font-bold ${status.text}`}>
              {status.label}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              {status.label === "Good" && "Air quality is satisfactory."}
              {status.label === "Fair" && "Air quality is acceptable, but sensitive groups should consider limiting prolonged outdoor activities."}
              {status.label === "Moderate" && "Members of sensitive groups may experience health effects."}
              {status.label === "Poor" && "Members of the general public may begin to experience health effects."}
              {status.label === "Very Poor" && "Health alert: The entire population is more likely to be affected."}
            </p>
          </div>
          {status.label === "Good" ? (
            <CheckCircle className={`w-16 h-16 ${status.text}`} />
          ) : (
            <AlertCircle className={`w-16 h-16 ${status.text}`} />
          )}
        </div>
      </div>

      {/* Pollutant Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* PM2.5 */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-semibold">PM2.5</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">{Math.round(pm25)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">µg/m³</p>
            </div>
            <span className="bg-blue-200 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold px-3 py-1 rounded-full">
              {getPollutantStatus(pm25, "pm25")}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Fine particulate matter</p>
        </div>

        {/* PM10 */}
        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-semibold">PM10</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">{Math.round(pm10)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">µg/m³</p>
            </div>
            <span className="bg-cyan-200 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 text-xs font-semibold px-3 py-1 rounded-full">
              {getPollutantStatus(pm10, "pm10")}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Coarse particulate matter</p>
        </div>

        {/* NO2 */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-semibold">NO₂</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">{Math.round(no2)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">µg/m³</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Nitrogen dioxide</p>
        </div>

        {/* O3 */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-semibold">O₃</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">{Math.round(o3)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">µg/m³</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Ozone</p>
        </div>
      </div>
    </div>
  );
}
