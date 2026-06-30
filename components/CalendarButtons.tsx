'use client';

interface CalendarButtonsProps {
  title: string;
  date: string;
  description?: string;
  disabled?: boolean;
}

function parseISODateLocal(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toGoogleCalendarUrl(title: string, date: string, description: string): string {
  const [year, month, day] = date.split('-');

  const start = `${year}${month}${day}`;

  const endDate = new Date(Number(year), Number(month) - 1, Number(day));
  endDate.setDate(endDate.getDate() + 1);

  const end =
    `${endDate.getFullYear()}` +
    `${String(endDate.getMonth() + 1).padStart(2, '0')}` +
    `${String(endDate.getDate()).padStart(2, '0')}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    details: description,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function toOutlookUrl(title: string, date: string, description: string): string {
  const d = parseISODateLocal(date);
  const end = new Date(d.getTime() + 60 * 60 * 1000);
  const params = new URLSearchParams({
    subject: title,
    startdt: d.toISOString(),
    enddt: end.toISOString(),
    body: description,
    path: '/calendar/action/compose',
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
}

export default function CalendarButtons({ title, date, description = '', disabled = false }: CalendarButtonsProps) {
  const btnStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '9px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    padding: '5px 10px',
    border: '1px solid var(--line-mid)',
    background: 'transparent',
    color: disabled ? 'rgba(0,0,0,0.25)' : 'var(--muted)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textDecoration: disabled ? 'line-through' : 'none',
    display: 'inline-block',
    transition: 'all 0.15s',
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <span style={{ display: 'inline-flex', gap: '6px', marginLeft: '8px', alignItems: 'center' }}>
      {disabled && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Fecha pasada
        </span>
      )}
      <button
        type="button"
        disabled={disabled}
        style={btnStyle}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          window.open(toGoogleCalendarUrl(title, date, description), '_blank');
        }}
        onMouseOver={e => {
          if (disabled) return;
          e.currentTarget.style.borderColor = '#4285f4';
          e.currentTarget.style.color = '#4285f4';
        }}
        onMouseOut={e => {
          if (disabled) return;
          e.currentTarget.style.borderColor = 'var(--line-mid)';
          e.currentTarget.style.color = 'var(--muted)';
        }}
      >
        Google Calendar
      </button>
      <button
        type="button"
        disabled={disabled}
        style={btnStyle}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          window.open(toOutlookUrl(title, date, description), '_blank');
        }}
        onMouseOver={e => {
          if (disabled) return;
          e.currentTarget.style.borderColor = '#0078d4';
          e.currentTarget.style.color = '#0078d4';
        }}
        onMouseOut={e => {
          if (disabled) return;
          e.currentTarget.style.borderColor = 'var(--line-mid)';
          e.currentTarget.style.color = 'var(--muted)';
        }}
      >
        Outlook Calendar
      </button>
    </span>
  );
}
