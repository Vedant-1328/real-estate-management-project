import { createContext, useCallback, useContext, useRef, useState } from 'react';
import Button from './Button.jsx';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback(
    ({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger' }) =>
      new Promise((resolve) => {
        resolverRef.current = resolve;
        setState({ title, message, confirmLabel, cancelLabel, variant });
      }),
    []
  );

  const close = (result) => {
    setState(null);
    resolverRef.current?.(result);
    resolverRef.current = null;
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <section
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <article className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">{state.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{state.message}</p>
            <footer className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => close(false)}>
                {state.cancelLabel}
              </Button>
              <Button
                type="button"
                variant={state.variant === 'danger' ? 'danger' : 'primary'}
                onClick={() => close(true)}
              >
                {state.confirmLabel}
              </Button>
            </footer>
          </article>
        </section>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return ctx.confirm;
}
