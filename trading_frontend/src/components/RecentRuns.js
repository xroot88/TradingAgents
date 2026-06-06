import React, { useEffect, useState } from 'react';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RecentRuns({ onOpen }) {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState(null);
  const [loadingName, setLoadingName] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/reports')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))))
      .then((data) => {
        if (!cancelled) setReports(data.reports || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Failed to load reports');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const open = async (name) => {
    setLoadingName(name);
    try {
      const res = await fetch(`/demo/${encodeURIComponent(name)}`, { method: 'POST' });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      onOpen(data.job_id);
    } catch (e) {
      setError(e.message || 'Failed to open report');
      setLoadingName(null);
    }
  };

  if (reports === null && !error) {
    return (
      <div className="card card-pad recent-runs">
        <h2 className="card-title">Previous runs</h2>
        <p className="card-subtitle">Loading…</p>
      </div>
    );
  }

  if (reports && reports.length === 0 && !error) {
    return null;
  }

  return (
    <div className="card card-pad recent-runs">
      <h2 className="card-title">Previous runs</h2>
      <p className="card-subtitle">Open a saved report to view the full analysis.</p>
      {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}
      <ul className="recent-list">
        {(reports || []).map((r) => (
          <li key={r.name}>
            <button
              type="button"
              className="recent-item"
              onClick={() => open(r.name)}
              disabled={loadingName !== null}
            >
              <span className="recent-ticker">{r.ticker}</span>
              <span className="recent-date">{formatDate(r.started_at)}</span>
              <span className="recent-action">
                {loadingName === r.name ? 'Opening…' : 'Open'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RecentRuns;
