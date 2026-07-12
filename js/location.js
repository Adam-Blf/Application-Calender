/* Géolocalisation + recherche de la grande ville la plus proche (Open-Meteo geocoding) */
const Location = (() => {
  let current = null; // { lat, lon, city, country }

  /** Obtient la position GPS de l'appareil */
  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Géolocalisation non disponible'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        err => reject(err),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
      );
    });
  }

  /** Reverse geocoding : trouve la localité la plus proche de coordonnées */
  async function reverseGeocode(lat, lon) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?latitude=${lat}&longitude=${lon}&count=1&language=fr&format=json`;
    // L'API de recherche ne fait pas de reverse direct ; on utilise BigDataCloud (gratuit, sans clé)
    const rev = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=fr`;
    const res = await fetch(rev);
    if (!res.ok) throw new Error('Reverse geocoding échoué');
    const data = await res.json();
    return {
      city: data.city || data.locality || data.principalSubdivision || 'Lieu inconnu',
      country: data.countryName || ''
    };
  }

  /**
   * Trouve la grande ville la plus proche.
   * Stratégie : on récupère le nom de la zone via reverse geocoding, puis on
   * cherche la plus grande ville correspondante (par population) via Open-Meteo.
   */
  async function nearestBigCity(lat, lon) {
    let baseName = '';
    try {
      const rev = await reverseGeocode(lat, lon);
      // On part de la subdivision/ville pour élargir la recherche
      baseName = rev.city;
    } catch (e) { /* on continue sans nom */ }

    // Recherche de villes par nom et tri par population
    if (baseName) {
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(baseName)}&count=10&language=fr&format=json`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.results && data.results.length) {
          // On garde la ville la plus peuplée dans un rayon raisonnable
          const withPop = data.results
            .filter(r => typeof r.population === 'number')
            .sort((a, b) => b.population - a.population);
          const best = withPop[0] || data.results[0];
          return {
            name: best.name,
            lat: best.latitude,
            lon: best.longitude,
            country: best.country || '',
            population: best.population || null
          };
        }
      } catch (e) { /* fallback ci-dessous */ }
    }
    return null;
  }

  /** Initialise la localisation courante (position + ville) */
  async function init() {
    const pos = await getPosition();
    current = { lat: pos.lat, lon: pos.lon };
    try {
      const rev = await reverseGeocode(pos.lat, pos.lon);
      current.city = rev.city;
      current.country = rev.country;
    } catch (e) {
      current.city = 'Position actuelle';
    }
    return current;
  }

  function getCurrent() { return current; }

  return { init, getPosition, reverseGeocode, nearestBigCity, getCurrent };
})();
