import { WeatherValues } from '../types/weather';

/**
 * Generate an expressive, poetic weather description based on conditions.
 * Replaces robotic "Partly Cloudy, 15°C" with "Crisp autumn morning" style text.
 */
export function getExpressiveDescription(
  weather: WeatherValues | null,
  weatherLabel: string,
): string {
  if (!weather) return 'Waiting for the sky to speak...';

  const temp = weather.temperature;
  const humidity = weather.humidity;
  const windSpeed = weather.windSpeed;
  const cloudCover = weather.cloudCover;
  const code = weather.weatherCode;
  const hour = new Date().getHours();

  const isNight = hour < 6 || hour >= 20;
  const isMorning = hour >= 6 && hour < 12;
  const isAfternoon = hour >= 12 && hour < 17;
  const isEvening = hour >= 17 && hour < 20;

  // Thunderstorm
  if (code === 8000) {
    if (isNight) return 'Thunder rolls through the dark. Stay inside.';
    return 'Storm clouds sparking. Not the day for a stroll.';
  }

  // Heavy rain / freezing rain
  if ([4001, 4201, 6001, 6201].includes(code)) {
    if (windSpeed > 7) return 'Sheets of rain riding the wind. Hunker down.';
    if (isNight) return 'Rain hammering the roof. Sleep-worthy weather.';
    return 'Proper rain — the kind that earns an umbrella.';
  }

  // Light rain / drizzle
  if ([4000, 4200, 6000, 6200].includes(code)) {
    if (isMorning) return 'A gentle drizzle to start the day. Jacket weather.';
    if (isEvening) return 'Light rain tapering off. The streets will gleam.';
    return 'Soft drizzle — barely enough to notice, just enough to feel.';
  }

  // Snow
  if ([5000, 5001, 5100, 5101].includes(code)) {
    if (code === 5101) return 'Heavy snow coming down. The world goes quiet.';
    if (isMorning) return 'Snow dusting the morning. Bundle up tight.';
    if (isNight) return 'Flakes falling in the dark. Tomorrow will be white.';
    return 'Snow in the air. Everything feels slower, softer.';
  }

  // Ice pellets
  if ([7000, 7101, 7102].includes(code)) {
    return 'Ice pellets rattling down. Watch your step out there.';
  }

  // Fog
  if ([2000, 2100].includes(code)) {
    if (isMorning) return 'Fog draping the morning. The world in soft focus.';
    if (isNight) return 'Thick mist. Headlights won\'t help much tonight.';
    return 'Visibility down. The air itself feels heavy.';
  }

  // Strong wind
  if ([3002].includes(code) || windSpeed > 11) {
    return 'Wind with real teeth today. Hold onto your hat.';
  }

  // Windy
  if ([3000, 3001].includes(code) || windSpeed > 7) {
    if (temp > 25) return 'Warm but breezy. A wind that actually feels good.';
    return 'Blustery out there. Trees are having a conversation.';
  }

  // Clear sky
  if (code === 1000) {
    if (isNight) return 'Clear night sky. Good for stargazing.';
    if (isMorning && temp < 10) return 'Crisp, clear morning. The kind that wakes you right up.';
    if (isMorning && temp >= 10) return 'Golden morning light. Not a cloud to speak of.';
    if (isAfternoon && temp > 30) return 'Blazing sun, blue sky. Find shade and hydrate.';
    if (isAfternoon && temp > 20) return 'Perfect afternoon. Warm sun, clean sky.';
    if (isEvening) return 'Clear skies as the sun dips. Lovely evening ahead.';
    return 'Wide open sky. The kind of day that makes you look up.';
  }

  // Mostly clear
  if (code === 1100) {
    if (isMorning) return 'Mostly clear skies greeting the morning.';
    if (isEvening) return 'A few wisps of cloud catching the last light.';
    if (temp > 25) return 'Warm and mostly clear. Summer doing its thing.';
    return 'Nearly cloudless. Just enough sky drama to keep it interesting.';
  }

  // Partly cloudy
  if (code === 1101) {
    if (isMorning && temp < 15) return 'Cool morning under a patchwork sky.';
    if (isAfternoon && temp > 20) return 'Sun playing hide-and-seek with the clouds.';
    if (isEvening) return 'Clouds and breaks. The sky can\'t make up its mind.';
    return 'A mix of sun and cloud. Classic in-between weather.';
  }

  // Mostly cloudy
  if (code === 1102) {
    if (humidity > 70) return 'Grey and muggy. The kind of day that drags.';
    if (temp < 10) return 'Overcast and chilly. Layers are your friend.';
    return 'Thick cloud cover, but no rain yet. Just brooding.';
  }

  // Cloudy
  if (code === 1001) {
    if (isMorning) return 'Overcast morning. Coffee weather.';
    if (isEvening) return 'Grey blanket overhead. Cozy evening incoming.';
    if (temp < 5) return 'Cold and grey. The sky feels low today.';
    return 'Full cloud cover. The sun\'s taking a day off.';
  }

  // Fallback based on temp/humidity
  if (temp > 35) return 'Scorching. Stay hydrated, find shade.';
  if (temp > 28 && humidity > 70) return 'Hot and sticky. The air itself feels thick.';
  if (temp < 0) return 'Below freezing. The cold bites today.';
  if (temp < 5) return 'Bitter cold. Dress in layers, cover your extremities.';

  return `${weatherLabel}. ${temp > 20 ? 'Comfortable out there.' : 'Layer up.'}`;
}

/**
 * Get seasonal accent tones based on the current month.
 */
export function getSeasonalColors(): {
  blobColor1: string;
  blobColor2: string;
  accentTint: string;
} {
  const month = new Date().getMonth(); // 0-11

  // Winter: Dec, Jan, Feb
  if (month === 11 || month <= 1) {
    return {
      blobColor1: '#6b8cae',
      blobColor2: '#3a5f8a',
      accentTint: 'rgba(58,95,138,0.08)',
    };
  }

  // Spring: Mar, Apr, May
  if (month >= 2 && month <= 4) {
    return {
      blobColor1: '#7ab77e',
      blobColor2: '#4a9f5f',
      accentTint: 'rgba(74,159,95,0.06)',
    };
  }

  // Summer: Jun, Jul, Aug
  if (month >= 5 && month <= 7) {
    return {
      blobColor1: '#e8a838',
      blobColor2: '#d47920',
      accentTint: 'rgba(212,121,32,0.06)',
    };
  }

  // Autumn: Sep, Oct, Nov
  return {
    blobColor1: '#c47040',
    blobColor2: '#9e4a28',
    accentTint: 'rgba(158,74,40,0.06)',
  };
}
