/* Rendu de la grille du calendrier mensuel */
const Calendar = (() => {
  const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  let viewYear, viewMonth; // mois affiché
  let selected = null;     // 'YYYY-MM-DD' sélectionné
  let onSelectDay = () => {};

  function pad(n) { return String(n).padStart(2, '0'); }
  function iso(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

  function todayIso() {
    const t = new Date();
    return iso(t.getFullYear(), t.getMonth(), t.getDate());
  }

  function init(selectHandler) {
    onSelectDay = selectHandler;
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    selected = todayIso();
    renderWeekdays();
    render();
  }

  function renderWeekdays() {
    const el = document.getElementById('weekdays');
    el.innerHTML = WEEKDAYS.map(d => `<span>${d}</span>`).join('');
  }

  function setMonth(year, month) {
    viewYear = year;
    viewMonth = month;
    render();
  }

  function prev() {
    if (viewMonth === 0) { viewMonth = 11; viewYear--; }
    else viewMonth--;
    render();
  }

  function next() {
    if (viewMonth === 11) { viewMonth = 0; viewYear++; }
    else viewMonth++;
    render();
  }

  function goToday() {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    selectDay(todayIso());
  }

  function selectDay(dateStr) {
    selected = dateStr;
    render();
    onSelectDay(dateStr);
  }

  function getSelected() { return selected; }

  function render() {
    const title = new Date(viewYear, viewMonth, 1)
      .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    document.getElementById('monthTitle').textContent = title;

    const grid = document.getElementById('calendarGrid');
    const counts = Store.countsForMonth(viewYear, viewMonth);
    const today = todayIso();

    // Jour de la semaine du 1er (lundi = 0)
    const firstDay = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];

    // Jours du mois précédent (grisés)
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: daysInPrev - i, other: true, date: null });
    }
    // Jours du mois courant
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, other: false, date: iso(viewYear, viewMonth, d) });
    }
    // Compléter la dernière semaine
    while (cells.length % 7 !== 0) {
      cells.push({ day: cells.length, other: true, date: null });
    }

    grid.innerHTML = cells.map(c => {
      if (c.other) return `<div class="day other-month"><span>${c.day}</span></div>`;
      const classes = ['day'];
      if (c.date === today) classes.push('today');
      if (c.date === selected) classes.push('selected');
      const n = counts[c.date] || 0;
      const dots = n > 0
        ? `<div class="dots">${Array.from({ length: Math.min(n, 3) }).map(() => '<span class="dot"></span>').join('')}</div>`
        : '';
      return `<div class="${classes.join(' ')}" data-date="${c.date}"><span>${c.day}</span>${dots}</div>`;
    }).join('');

    grid.querySelectorAll('.day[data-date]').forEach(el => {
      el.addEventListener('click', () => selectDay(el.dataset.date));
    });
  }

  return { init, prev, next, goToday, selectDay, getSelected, render, setMonth, todayIso };
})();
