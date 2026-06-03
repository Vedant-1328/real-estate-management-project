/** Calendar date YYYY-MM-DD in a given IANA timezone (default: India). */
export const dateOnlyInTimeZone = (date = new Date(), timeZone = 'Asia/Kolkata') =>
  new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);

/** Today's date for forms and filters (IST). */
export const todayDate = () => dateOnlyInTimeZone(new Date(), 'Asia/Kolkata');
