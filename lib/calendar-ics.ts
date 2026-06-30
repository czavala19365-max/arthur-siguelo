/**
 * Generar archivo iCalendar (.ics) para agregar eventos a cualquier calendario
 * (Gmail, Outlook, Apple Calendar, etc.) sin necesidad de OAuth
 */

export interface CalendarEvent {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  attendeeEmail?: string;
}

export function generateICalendar(event: CalendarEvent): string {
  /**
   * Formato: YYYYMMDDTHHMMSSZ (UTC)
   * Ejemplo: 20260615T093000Z
   */
  const formatDate = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  };

  const sanitize = (s: string) => s.replace(/\n/g, '\\n').replace(/,/g, '\\,');

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Arthur Judicial//arthur-ia.com//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Arthur Judicial
X-WR-TIMEZONE:America/Lima
BEGIN:VEVENT
UID:${Date.now()}-${Math.random().toString(36).substr(2, 9)}@arthur-ia.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(event.startDate)}
DTEND:${formatDate(event.endDate)}
SUMMARY:${sanitize(event.title)}
DESCRIPTION:${sanitize(event.description)}
LOCATION:${sanitize(event.location || 'Sin ubicación')}
${event.attendeeEmail ? `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION:mailto:${event.attendeeEmail}` : ''}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;

  return ics;
}

/**
 * Convertir iCalendar a buffer para adjuntar en email
 */
export function icsToBuffer(ics: string): Buffer {
  return Buffer.from(ics, 'utf-8');
}
