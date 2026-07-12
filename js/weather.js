/* Météo via Open-Meteo (gratuit, sans clé API) */
const Weather = (() => {

  // Correspondance code météo WMO -> emoji + libellé FR
  const WMO = {
    0:  ['☀️', 'Ciel dégagé'],
    1:  ['🌤️', 'Plutôt dégagé'],
    2:  ['⛅', 'Partiellement nuageux'],
    3:  ['☁️', 'Couvert'],
    45: ['🌫️', 'Brouillard'],
    48: ['🌫️', 'Brouillard givrant'],
    51: ['🌦️', 'Bruine légère'],
    53: ['🌦️', 'Bruine'],
    55: ['🌧️', 'Bruine dense'],
    61: ['🌧️', 'Pluie faible'],
    63: ['🌧️', 'Pluie'],
    65: ['🌧️', 'Forte pluie'],
    66: ['🌧️', 'Pluie verglaçante'],
    67: ['🌧️', 'Forte pluie verglaçante'],
    71: ['🌨️', 'Neige faible'],
    73: ['🌨️', 'Neige'],
    75: ['❄️', 'Forte neige'],
    77: ['🌨️', 'Grains de neige'],
    80: ['🌦️', 'Averses faibles'],
    81: ['🌧️', 'Averses'],
    82: ['⛈️', 'Fortes averses'],
    85: ['🌨️', 'Averses de neige'],
    86: ['❄️', 'Fortes averses de neige'],
    95: ['⛈️', 'Orage'],
    96: ['⛈️', 'Orage avec grêle'],
    99: ['⛈️', 'Violent orage avec grêle']
  };

  function describe(code) {
    const entry = WMO[code] || ['🌡️', 'Conditions inconnues'];
    return { icon: entry[0], label: entry[1] };
  }

  async function fetch7Day(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&timezone=auto&forecast_days=7`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Météo indisponible');
    return res.json();
  }

  function dayName(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  }

  return { fetch7Day, describe, dayName };
})();
