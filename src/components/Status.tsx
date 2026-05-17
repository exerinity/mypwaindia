export function LoadingRow({ children = 'Retrieving data...' }) {
  return (
    <div className="loading-row">
      <span className="spinner lg" />
      <span>{children}</span>
    </div>
  );
}

export function Empty({ children = 'Nothing here.' }) {
  return <div className="empty">{children}</div>;
}

export function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="alert alert-error">
      {error.message || String(error)}
    </div>
  );
}