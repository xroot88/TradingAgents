import React, { useState } from 'react';

const EFFORTS = [
  { value: 'low', label: 'Low', hint: 'Fast, single-round debate' },
  { value: 'medium', label: 'Medium', hint: 'Balanced — 2 debate rounds' },
  { value: 'high', label: 'High', hint: 'Thorough — 3 debate rounds' },
];

function AnalysisForm({ onSubmit }) {
  const [ticker, setTicker] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [effort, setEffort] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!ticker.trim() || !apiKey.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        ticker: ticker.trim().toUpperCase(),
        apiKey: apiKey.trim(),
        effort,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const activeHint = EFFORTS.find((e) => e.value === effort)?.hint;

  return (
    <form className="card card-pad" onSubmit={submit}>
      <h2 className="card-title">New analysis</h2>
      <p className="card-subtitle">Configure the run and submit to the agent graph.</p>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="ticker">Ticker</label>
          <input
            id="ticker"
            className="input"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="e.g. AAPL, NVDA, SPY"
            autoComplete="off"
            spellCheck="false"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="apiKey">API key</label>
          <input
            id="apiKey"
            className="input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="VLLM API key"
            autoComplete="off"
            required
          />
        </div>

        <div className="field">
          <label>Effort</label>
          <div className="segmented" role="radiogroup" aria-label="Effort">
            {EFFORTS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={effort === opt.value}
                className={`seg-btn ${effort === opt.value ? 'active' : ''}`}
                onClick={() => setEffort(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="seg-hint">{activeHint}</div>
        </div>

        <button className="btn-primary" type="submit" disabled={submitting || !ticker.trim() || !apiKey.trim()}>
          {submitting ? 'Starting…' : 'Run analysis'}
        </button>
      </div>
    </form>
  );
}

export default AnalysisForm;
