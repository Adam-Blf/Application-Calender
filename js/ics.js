/* Export des événements au format iCalendar (.ics) */
const Ics = (() => {

  function pad(n) { return String(n).padStart(2, '0'); }

  /** Formate une date "YYYY-MM-DD" + heure "HH:MM" en valeur ICS */
  function formatDate(dateStr, timeStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (timeStr) {
      const [hh, mm] = timeStr.split(':').map(Number);
      return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
    }
    // Événement sur la journée entière (valeur DATE)
    return `${y}${pad(m)}${pad(d)}`;
  }

  function escape(text) {
    return String(text || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  function stamp() {
    const now = new Date();
    return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  }

  function buildEvent(ev) {
    const lines = ['BEGIN:VEVENT'];
    lines.push(`UID:${ev.id}@mon-calendrier`);
    lines.push(`DTSTAMP:${stamp()}`);
    if (ev.time) {
      lines.push(`DTSTART:${formatDate(ev.date, ev.time)}`);
      // Durée par défaut : 1 heure
      const [hh, mm] = ev.time.split(':').map(Number);
      const end = `${ev.date.replace(/-/g, '')}T${pad((hh + 1) % 24)}${pad(mm)}00`;
      lines.push(`DTEND:${end}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${formatDate(ev.date)}`);
    }
    lines.push(`SUMMARY:${escape(ev.title)}`);
    if (ev.location) lines.push(`LOCATION:${escape(ev.location)}`);
    if (ev.notes) lines.push(`DESCRIPTION:${escape(ev.notes)}`);
    lines.push('END:VEVENT');
    return lines.join('\r\n');
  }

  function build(events) {
    const head = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Mon Calendrier//PWA//FR',
      'CALSCALE:GREGORIAN'
    ];
    const body = events.map(buildEvent);
    return head.concat(body, ['END:VCALENDAR']).join('\r\n');
  }

  /** Télécharge un fichier .ics contenant les événements fournis */
  function download(events, filename = 'mon-calendrier.ics') {
    if (!events.length) return false;
    const blob = new Blob([build(events)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }

  return { build, download };
})();
