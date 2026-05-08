import React, { useState, useEffect, useCallback } from 'react';
import AnalysisForm from './components/AnalysisForm';
import AgentProgress from './components/AgentProgress';
import AnalysisResult from './components/AnalysisResult';

const API = '';

function App() {
  const [jobId, setJobId] = useState(null);
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`${API}/status/${jobId}`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setJob(data);
        if (
          data.status === 'completed' ||
          data.status === 'failed' ||
          data.status === 'cancelled'
        ) {
          clearInterval(timer);
        }
      } catch (e) {
        if (!cancelled) setError('Lost connection to backend');
      }
    };

    poll();
    const timer = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [jobId]);

  const start = useCallback(async ({ ticker, apiKey, effort }) => {
    setError(null);
    setJob(null);
    try {
      const res = await fetch(`${API}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, api_key: apiKey || null, effort }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setJobId(data.job_id);
    } catch (e) {
      setError(e.message || 'Failed to start analysis');
    }
  }, []);

  const reset = useCallback(() => {
    setJobId(null);
    setJob(null);
    setError(null);
  }, []);

  const cancel = useCallback(async () => {
    if (!jobId) return;
    try {
      await fetch(`${API}/cancel/${jobId}`, { method: 'POST' });
    } catch (e) {
      // best-effort: poller will reflect server state
    }
  }, [jobId]);

  const phase = (() => {
    if (job?.status === 'completed') return 'complete';
    if (job?.status === 'failed') return 'failed';
    if (job?.status === 'cancelled') return 'cancelled';
    if (jobId) return 'running';
    return 'form';
  })();

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">TA</div>
          <span>TradingAgents</span>
        </div>
        <h1 className="app-title">Multi-agent market intelligence</h1>
        <p className="app-subtitle">
          Run a panel of analyst, researcher, and risk-management agents on any
          ticker.
        </p>
      </header>

      <main className="app-main">
        {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

        {phase === 'form' && <AnalysisForm onSubmit={start} />}

        {phase === 'running' && <AgentProgress job={job} onStop={cancel} />}

        {phase === 'complete' && (
          <AnalysisResult
            job={job}
            result={job.result}
            onReset={reset}
          />
        )}

        {phase === 'failed' && (
          <div className="card card-pad">
            <h2 className="card-title">Analysis failed</h2>
            <p className="card-subtitle">{job?.error || 'Unknown error'}</p>
            <button className="btn-secondary" onClick={reset}>
              Try again
            </button>
          </div>
        )}

        {phase === 'cancelled' && (
          <div className="card card-pad">
            <h2 className="card-title">Run cancelled</h2>
            <p className="card-subtitle">The analysis was stopped.</p>
            <button className="btn-secondary" onClick={reset}>
              Start over
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
