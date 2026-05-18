import { useEffect, useState } from 'react';
import { getServerError, subscribeServerErrors } from '../utils/serverErrors.js';

export function useServerFieldError(field) {
  const [message, setMessage] = useState(getServerError(field));

  useEffect(() => {
    const unsub = subscribeServerErrors(() => {
      setMessage(getServerError(field));
    });
    return unsub;
  }, [field]);

  return message;
}
