/* Suggestions d'activités autour d'une ville via Overpass API (OpenStreetMap) */
const Activities = (() => {

  // Filtres Overpass par catégorie + emoji
  const CATEGORIES = {
    tourism: {
      icon: '🏛️',
      query: tags => `
        node["tourism"~"museum|gallery|attraction|artwork|viewpoint|theme_park|zoo"](${tags});
        node["historic"](${tags});`
    },
    leisure: {
      icon: '🌳',
      query: tags => `
        node["leisure"~"park|garden|nature_reserve|sports_centre|fitness_centre|stadium|swimming_pool"](${tags});
        node["tourism"="picnic_site"](${tags});`
    },
    food: {
      icon: '🍽️',
      query: tags => `
        node["amenity"~"restaurant|cafe|bar|pub|ice_cream"](${tags});`
    },
    entertainment: {
      icon: '🎭',
      query: tags => `
        node["amenity"~"cinema|theatre|nightclub|arts_centre"](${tags});
        node["leisure"~"bowling_alley|escape_game|amusement_arcade"](${tags});`
    }
  };

  const ICON_BY_TAG = {
    museum: '🏛️', gallery: '🖼️', artwork: '🎨', viewpoint: '🌄', zoo: '🦁',
    theme_park: '🎡', attraction: '⭐', park: '🌳', garden: '🌷',
    nature_reserve: '🌲', sports_centre: '🏟️', swimming_pool: '🏊',
    restaurant: '🍽️', cafe: '☕', bar: '🍸', pub: '🍺', ice_cream: '🍦',
    cinema: '🎬', theatre: '🎭', nightclub: '🪩', arts_centre: '🎨',
    bowling_alley: '🎳'
  };

  function pickIcon(tags, fallback) {
    for (const key of Object.values(tags)) {
      if (ICON_BY_TAG[key]) return ICON_BY_TAG[key];
    }
    return fallback;
  }

  /** Rayon (~6km) autour d'un point, format bbox Overpass "S,W,N,E" */
  function bbox(lat, lon, km = 6) {
    const dLat = km / 111;
    const dLon = km / (111 * Math.cos(lat * Math.PI / 180));
    return `${(lat - dLat).toFixed(4)},${(lon - dLon).toFixed(4)},${(lat + dLat).toFixed(4)},${(lon + dLon).toFixed(4)}`;
  }

  async function fetchActivities(lat, lon, category = 'tourism') {
    const cat = CATEGORIES[category] || CATEGORIES.tourism;
    const box = bbox(lat, lon);
    const query = `[out:json][timeout:25];(${cat.query(box)});out body 40;`;

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: query
    });
    if (!res.ok) throw new Error('Service d\'activités indisponible');
    const data = await res.json();

    const seen = new Set();
    return (data.elements || [])
      .filter(el => el.tags && el.tags.name)
      .filter(el => {
        if (seen.has(el.tags.name)) return false;
        seen.add(el.tags.name);
        return true;
      })
      .map(el => ({
        name: el.tags.name,
        icon: pickIcon(el.tags, cat.icon),
        type: prettyType(el.tags),
        lat: el.lat,
        lon: el.lon,
        address: buildAddress(el.tags)
      }))
      .slice(0, 25);
  }

  function prettyType(tags) {
    const raw = tags.tourism || tags.leisure || tags.amenity || tags.historic || '';
    const map = {
      museum: 'Musée', gallery: 'Galerie', attraction: 'Attraction',
      artwork: 'Œuvre d\'art', viewpoint: 'Point de vue', zoo: 'Zoo',
      theme_park: 'Parc à thème', park: 'Parc', garden: 'Jardin',
      nature_reserve: 'Réserve naturelle', sports_centre: 'Centre sportif',
      swimming_pool: 'Piscine', restaurant: 'Restaurant', cafe: 'Café',
      bar: 'Bar', pub: 'Pub', ice_cream: 'Glacier', cinema: 'Cinéma',
      theatre: 'Théâtre', nightclub: 'Boîte de nuit', arts_centre: 'Centre d\'art',
      bowling_alley: 'Bowling'
    };
    return map[raw] || (raw ? raw.replace(/_/g, ' ') : 'Lieu');
  }

  function buildAddress(tags) {
    const parts = [];
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:city']) parts.push(tags['addr:city']);
    return parts.join(' ');
  }

  return { fetchActivities, CATEGORIES };
})();
