export default function Toast({ message, type = 'info', onClose }) {
  const types = {
    info: 'border-slate-200 bg-white text-slate-800',
    success: 'border-green-200 bg-green-50 text-green-800',
    error: 'border-red-200 bg-red-50 text-red-800',
  };

  if (!message) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex max-w-sm items-center gap-3 rounded-lg border px-4 py-3 shadow-lg ${types[type]}`}
      role="alert"
    >
      <p className="flex-1 text-sm">{message}</p>
      {onClose && (
        <button type="button" onClick={onClose} className="text-sm opacity-70 hover:opacity-100">
          Dismiss
        </button>
      )}
    </div>
  );
}
