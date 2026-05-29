/* Contrôleur principal de l'application */
(() => {
  'use strict';

  let bigCity = null;          // grande ville la plus proche (pour activités/météo)
  let weatherLoaded = false;
  let activitiesLoaded = false;

  /* ------------------ Utilitaires UI ------------------ */
  function $(id) { return document.getElementById(id); }

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.hidden = true; }, 2600);
  }

  function formatLongDate(dateStr) {
    return new Date(dateStr + 'T12:00:00')
      .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  /* ------------------ Onglets ------------------ */
  function initTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const name = tab.dataset.tab;
        document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
        document.querySelectorAll('.panel').forEach(p =>
          p.classList.toggle('active', p.id === 'tab-' + name));
        if (name === 'weather' && !weatherLoaded) loadWeather();
        if (name === 'activities' && !activitiesLoaded) loadActivities();
      });
    });
  }

  /* ------------------ Calendrier ------------------ */
  function renderDayEvents(dateStr) {
    $('dayEventsTitle').textContent = formatLongDate(dateStr);
    const list = $('dayEventsList');
    const events = Store.byDate(dateStr);
    if (!events.length) {
      list.innerHTML = '<li class="empty">Aucun événement ce jour-là.</li>';
      return;
    }
    list.innerHTML = events.map(ev => `
      <li class="event-item" data-id="${ev.id}">
        <div class="ev-title">${escapeHtml(ev.title)}</div>
        <div class="ev-meta">
          ${ev.time ? '🕒 ' + ev.time : 'Toute la journée'}
          ${ev.location ? ' · 📍 ' + escapeHtml(ev.location) : ''}
        </div>
        ${ev.notes ? `<div class="ev-meta">${escapeHtml(ev.notes)}</div>` : ''}
      </li>`).join('');
    list.querySelectorAll('.event-item').forEach(li => {
      li.addEventListener('click', () => openModal(Store.get(li.dataset.id)));
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function initCalendar() {
    Calendar.init(renderDayEvents);
    renderDayEvents(Calendar.getSelected());

    $('prevMonth').addEventListener('click', () => Calendar.prev());
    $('nextMonth').addEventListener('click', () => Calendar.next());
    $('todayBtn').addEventListener('click', () => Calendar.goToday());
    $('addEventBtn').addEventListener('click', () => openModal(null));
    $('exportIcsBtn').addEventListener('click', exportIcs);
  }

  function exportIcs() {
    const events = Store.all();
    if (!Ics.download(events)) {
      toast('Aucun événement à exporter');
    } else {
      toast('Calendrier exporté (.ics)');
    }
  }

  /* ------------------ Modale d'événement ------------------ */
  function openModal(event, prefill) {
    const modal = $('eventModal');
    modal.hidden = false;
    $('modalTitle').textContent = event ? 'Modifier l\'événement' : 'Nouvel événement';
    $('eventId').value = event ? event.id : '';
    $('eventTitle').value = event ? event.title : (prefill && prefill.title) || '';
    $('eventDate').value = event ? event.date : (prefill && prefill.date) || Calendar.getSelected();
    $('eventTime').value = event ? (event.time || '') : '';
    $('eventLocation').value = event ? (event.location || '') : (prefill && prefill.location) || '';
    $('eventNotes').value = event ? (event.notes || '') : (prefill && prefill.notes) || '';
    $('deleteEventBtn').hidden = !event;
    $('eventTitle').focus();
  }

  function closeModal() { $('eventModal').hidden = true; }

  function initModal() {
    $('cancelEventBtn').addEventListener('click', closeModal);
    $('eventModal').addEventListener('click', e => {
      if (e.target === $('eventModal')) closeModal();
    });
    $('deleteEventBtn').addEventListener('click', () => {
      const id = $('eventId').value;
      if (id && confirm('Supprimer cet événement ?')) {
        Store.remove(id);
        closeModal();
        Calendar.render();
        renderDayEvents(Calendar.getSelected());
        toast('Événement supprimé');
      }
    });
    $('eventForm').addEventListener('submit', e => {
      e.preventDefault();
      const event = {
        id: $('eventId').value || undefined,
        title: $('eventTitle').value.trim(),
        date: $('eventDate').value,
        time: $('eventTime').value,
        location: $('eventLocation').value.trim(),
        notes: $('eventNotes').value.trim()
      };
      if (!event.title || !event.date) return;
      Store.upsert(event);
      closeModal();
      // Aligner la vue sur la date enregistrée
      const [y, m] = event.date.split('-').map(Number);
      Calendar.setMonth(y, m - 1);
      Calendar.selectDay(event.date);
      toast('Événement enregistré');
    });
  }

  /* ------------------ Localisation ------------------ */
  async function initLocation() {
    const label = $('locationLabel');
    label.textContent = 'Localisation…';
    try {
      const loc = await Location.init();
      label.textContent = loc.city + (loc.country ? ', ' + loc.country : '');
      // Réinitialise les caches dépendant du lieu
      weatherLoaded = false;
      activitiesLoaded = false;
      bigCity = null;
      // Recharge l'onglet actif si nécessaire
      if (document.querySelector('.tab[data-tab="weather"]').classList.contains('active')) loadWeather();
      if (document.querySelector('.tab[data-tab="activities"]').classList.contains('active')) loadActivities();
    } catch (e) {
      label.textContent = '📍 Activer la localisation';
      console.warn('Géolocalisation refusée :', e.message);
    }
  }

  /* ------------------ Météo ------------------ */
  async function loadWeather() {
    const container = $('weatherContent');
    const loc = Location.getCurrent();
    if (!loc) {
      container.innerHTML = '<p class="muted">Activez la localisation pour voir la météo.</p>' +
        '<button class="ghost-btn" id="enableLocWeather">Activer la localisation</button>';
      $('enableLocWeather').addEventListener('click', initLocation);
      return;
    }
    container.innerHTML = '<div class="loader">Chargement de la météo…</div>';
    try {
      const data = await Weather.fetch7Day(loc.lat, loc.lon);
      const cur = data.current;
      const c = Weather.describe(cur.weather_code);
      const units = data.current_units || {};

      let html = `
        <div class="weather-now">
          <div class="icon">${c.icon}</div>
          <div class="temp">${Math.round(cur.temperature_2m)}°</div>
          <div class="desc">${c.label} · ${loc.city}</div>
          <div class="weather-meta">
            <span>Ressenti ${Math.round(cur.apparent_temperature)}°</span>
            <span>💧 ${cur.relative_humidity_2m}%</span>
            <span>💨 ${Math.round(cur.wind_speed_10m)} ${units.wind_speed_10m || 'km/h'}</span>
          </div>
        </div>
        <h3>Prévisions sur 7 jours</h3>
        <div class="forecast">`;

      const daily = data.daily;
      for (let i = 0; i < daily.time.length; i++) {
        const dc = Weather.describe(daily.weather_code[i]);
        html += `
          <div class="forecast-day">
            <div class="d">${i === 0 ? 'Auj.' : Weather.dayName(daily.time[i])}</div>
            <div class="ic">${dc.icon}</div>
            <div class="t"><span class="max">${Math.round(daily.temperature_2m_max[i])}°</span>
              <span class="min">${Math.round(daily.temperature_2m_min[i])}°</span></div>
          </div>`;
      }
      html += '</div>';
      container.innerHTML = html;
      weatherLoaded = true;
    } catch (e) {
      container.innerHTML = `<p class="muted">Impossible de charger la météo : ${e.message}</p>`;
    }
  }

  /* ------------------ Activités ------------------ */
  async function ensureBigCity() {
    if (bigCity) return bigCity;
    const loc = Location.getCurrent();
    if (!loc) return null;
    const city = await Location.nearestBigCity(loc.lat, loc.lon);
    bigCity = city || { name: loc.city, lat: loc.lat, lon: loc.lon, country: loc.country };
    return bigCity;
  }

  async function loadActivities() {
    const container = $('activitiesContent');
    const cityLabel = $('activitiesCity');
    const loc = Location.getCurrent();
    if (!loc) {
      cityLabel.textContent = '';
      container.innerHTML = '<p class="muted">Activez la localisation pour découvrir des activités.</p>' +
        '<button class="ghost-btn" id="enableLocAct">Activer la localisation</button>';
      $('enableLocAct').addEventListener('click', initLocation);
      return;
    }
    container.innerHTML = '<div class="loader">Recherche d\'activités…</div>';
    cityLabel.textContent = 'Recherche de la grande ville la plus proche…';
    try {
      const city = await ensureBigCity();
      const popTxt = city.population ? ` (${city.population.toLocaleString('fr-FR')} hab.)` : '';
      cityLabel.textContent = `Autour de ${city.name}${popTxt}`;

      const category = $('activityCategory').value;
      const places = await Activities.fetchActivities(city.lat, city.lon, category);
      if (!places.length) {
        container.innerHTML = '<p class="muted">Aucune activité trouvée dans cette catégorie. Essayez-en une autre.</p>';
        activitiesLoaded = true;
        return;
      }
      container.innerHTML = places.map((p, i) => `
        <div class="activity-card">
          <div class="a-icon">${p.icon}</div>
          <div class="a-body">
            <div class="a-title">${escapeHtml(p.name)}</div>
            <div class="a-meta">${escapeHtml(p.type)}${p.address ? ' · ' + escapeHtml(p.address) : ''}</div>
          </div>
          <button class="a-add" data-i="${i}">+ Agenda</button>
        </div>`).join('');

      container.querySelectorAll('.a-add').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = places[btn.dataset.i];
          openModal(null, {
            title: p.name,
            location: (p.address ? p.address + ', ' : '') + city.name,
            notes: p.type + ' suggéré près de ' + city.name
          });
        });
      });
      activitiesLoaded = true;
    } catch (e) {
      container.innerHTML = `<p class="muted">Impossible de charger les activités : ${e.message}</p>`;
    }
  }

  function initActivities() {
    $('activityCategory').addEventListener('change', () => {
      activitiesLoaded = false;
      loadActivities();
    });
  }

  /* ------------------ Service worker ------------------ */
  function initServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err =>
          console.warn('SW non enregistré :', err));
      });
    }
  }

  /* ------------------ Démarrage ------------------ */
  function start() {
    initTabs();
    initCalendar();
    initModal();
    initActivities();
    $('refreshLocationBtn').addEventListener('click', initLocation);
    initServiceWorker();
    initLocation();
  }

  document.addEventListener('DOMContentLoaded', start);
})();
