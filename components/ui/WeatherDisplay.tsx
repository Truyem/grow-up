import { useEffect, useState } from 'react';
import { getWeatherInfo, WeatherInfo as WeatherData } from '../../services/weatherService';

const seasonIcons: Record<string, string> = {
  spring: '/seasons/spring.webp',
  summer: '/seasons/summer.webp',
  fall: '/seasons/fall.webp',
  winter: '/seasons/winter.webp',
};

const weatherIcons: Record<string, string> = {
  sunny: '/weather/cloud.webp',
  cloudy: '/weather/cloud.webp',
  rainy: '/weather/rain.webp',
  thunder: '/weather/thunder.webp',
  snow: '/weather/snow.webp',
};

const tempIcons: Record<string, string> = {
  hot: '/temperature/hot.webp',
  cold: '/temperature/cold.webp',
};

export const WeatherDisplay = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      const data = await getWeatherInfo();
      setWeather(data);
      setLoading(false);
    };
    fetchWeather();
  }, []);

  if (loading) return null;
  if (!weather) return null;

  const isHot = weather.temperature >= 25;
  const isCold = weather.temperature <= 18;
  const showTempIcon = isHot || isCold;
  const tempType = isHot ? 'hot' : 'cold';

  return (
    <div className="flex items-center justify-center gap-2 text-sm text-gray-300 mt-2">
      <img src={seasonIcons[weather.season]} alt={weather.season} className="w-5 h-5" />
      <img src={weatherIcons[weather.condition] || weatherIcons.cloudy} alt={weather.condition} className="w-5 h-5" />
      {showTempIcon && <img src={tempIcons[tempType]} alt={tempType} className="w-5 h-5" />}
      <span className="font-medium">{weather.temperature}°C</span>
      <span className="text-gray-500">•</span>
      <span>{weather.location}</span>
    </div>
  );
};