/* Gestion du stockage local des événements */
const Store = (() => {
  const KEY = 'mon-calendrier-events';

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function save(events) {
    localStorage.setItem(KEY, JSON.stringify(events));
  }

  function all() {
    return load();
  }

  function byDate(dateStr) {
    return load()
      .filter(e => e.date === dateStr)
      .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  }

  function get(id) {
    return load().find(e => e.id === id) || null;
  }

  function upsert(event) {
    const events = load();
    if (event.id) {
      const idx = events.findIndex(e => e.id === event.id);
      if (idx >= 0) events[idx] = event;
      else events.push(event);
    } else {
      event.id = 'ev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      events.push(event);
    }
    save(events);
    return event;
  }

  function remove(id) {
    save(load().filter(e => e.id !== id));
  }

  /** Renvoie un objet { 'YYYY-MM-DD': count } pour un mois donné */
  function countsForMonth(year, month) {
    const counts = {};
    load().forEach(e => {
      if (!e.date) return;
      const [y, m] = e.date.split('-').map(Number);
      if (y === year && m === month + 1) {
        counts[e.date] = (counts[e.date] || 0) + 1;
      }
    });
    return counts;
  }

  return { all, byDate, get, upsert, remove, countsForMonth };
})();
