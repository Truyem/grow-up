const IP_API_URL = 'http://ip-api.com/json/';
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

export interface LocationData {
  lat: number;
  lon: number;
  city: string;
  country: string;
}

export interface WeatherData {
  temperature: number;
  weatherCode: number;
}

const weatherCodeToCondition = (code: number): string => {
  if (code === 0) return 'sunny';
  if (code >= 1 && code <= 3) return 'cloudy';
  if (code >= 51 && code <= 67) return 'rainy';
  if (code >= 80 && code <= 82) return 'rainy';
  if (code >= 95 && code <= 99) return 'thunder';
  if (code >= 71 && code <= 77) return 'snow';
  return 'cloudy';
};

const getSeason = (month: number): string => {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
};

export const getUserLocation = async (): Promise<LocationData | null> => {
  try {
    const response = await fetch(IP_API_URL, { method: 'GET' });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status === 'success') {
      return {
        lat: data.lat,
        lon: data.lon,
        city: data.city,
        country: data.country,
      };
    }
    return null;
  } catch (error) {
    console.error('[Weather] Failed to get location:', error);
    return null;
  }
};

export const getWeatherData = async (lat: number, lon: number): Promise<WeatherData | null> => {
  try {
    const url = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      temperature: Math.round(data.current.temperature_2m),
      weatherCode: data.current.weather_code,
    };
  } catch (error) {
    console.error('[Weather] Failed to get weather:', error);
    return null;
  }
};

export const getWeatherInfo = async () => {
  const location = await getUserLocation();
  if (!location) return null;

  const weather = await getWeatherData(location.lat, location.lon);
  if (!weather) return null;

  const month = new Date().getMonth() + 1;

  return {
    season: getSeason(month),
    condition: weatherCodeToCondition(weather.weatherCode),
    temperature: weather.temperature,
    location: `${location.city}, ${location.country}`,
  };
};