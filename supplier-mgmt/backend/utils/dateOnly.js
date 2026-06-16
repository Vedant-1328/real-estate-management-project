/** Calendar date YYYY-MM-DD in a given IANA timezone (default: India). */
export const dateOnlyInTimeZone = (date = new Date(), timeZone = 'Asia/Kolkata') =>
  new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);

/** Today's date for business operations (IST). */
export const todayDate = () => dateOnlyInTimeZone(new Date(), 'Asia/Kolkata');

const toDdMmYyyy = (year, month, day) =>
  `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;

/** Display calendar dates as dd-mm-yyyy (IST-safe for YYYY-MM-DD strings). */
export const formatDisplayDate = (date) => {
  if (date == null || date === '') return '—';
  const raw = String(date).trim();
  if (/^invalid/i.test(raw)) return '—';

  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return toDdMmYyyy(isoDate[1], isoDate[2], isoDate[3]);

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return toDdMmYyyy(d.getFullYear(), d.getMonth() + 1, d.getDate());
};
