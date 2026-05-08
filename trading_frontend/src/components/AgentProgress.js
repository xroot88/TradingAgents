import React, { useState } from 'react';

const PHASES = [
  {
    title: 'Analyst Team',
    agents: ['Market Analyst', 'Social Analyst', 'News Analyst', 'Fundamentals Analyst'],
  },
  {
    title: 'Research Team',
    agents: ['Bull Researcher', 'Bear Researcher', 'Research Manager'],
  },
  {
    title: 'Trading Desk',
    agents: ['Trader'],
  },
  {
    title: 'Risk Management',
    agents: ['Aggressive Analyst', 'Conservative Analyst', 'Neutral Analyst', 'Portfolio Manager'],
  },
];

function StatusIcon({ status }) {
  if (status === 'done') {
    return (
      <span className="status-icon" aria-label="done">
        <svg viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" fill="#34d399" fillOpacity="0.18" />
          <path
            d="M4.5 8.2l2.4 2.4L11.6 5.8"
            stroke="#34d399"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (status === 'running') {
    return (
      <span className="status-icon" aria-label="running">
        <span className="ring" />
      </span>
    );
  }
  return (
    <span className="status-icon" aria-label="pending">
      <span className="ring" />
    </span>
  );
}

function AgentRow({ name, status }) {
  const label =
    status === 'done' ? 'Done' : status === 'running' ? 'Running' : 'Pending';
  return (
    <div className={`agent-row ${status}`}>
      <StatusIcon status={status} />
      <span className="agent-name">{name}</span>
      <span className="agent-status">{label}</span>
    </div>
  );
}

function AgentProgress({ job, onStop }) {
  const [stopping, setStopping] = useState(false);
  const handleStop = () => {
    setStopping(true);
    onStop?.();
  };
  const stopRequested = stopping || job?.cancelled;

  const progress = job?.progress;
  if (!progress) {
    return (
      <div className="card card-pad">
        <p className="card-subtitle">Submitting request…</p>
        {onStop && (
          <button
            className="btn-secondary"
            onClick={handleStop}
            disabled={stopRequested}
            style={{ marginTop: 12 }}
          >
            {stopRequested ? 'Stopping…' : 'Stop'}
          </button>
        )}
      </div>
    );
  }

  const { agent_status: status, completed, total, current_agent: current } = progress;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  // Latest agent we received an update for is "running" until next chunk
  // arrives. Once status is `completed`, no more "running" markers.
  const visualStatus = (name) => {
    const s = status?.[name] || 'pending';
    if (s === 'done' && name === current && job.status !== 'completed') {
      return 'running';
    }
    return s;
  };

  return (
    <div className="card card-pad">
      <div className="progress-head">
        <div>
          <div className="progress-counter">
            {completed} <span className="total">/ {total}</span>
          </div>
          <div className="card-subtitle" style={{ margin: 0 }}>
            agents complete
          </div>
        </div>
        <div className="progress-meta">
          <div className="ticker">{job.ticker}</div>
          <div>effort: {job.effort}</div>
          <div>{current ? `working: ${current}` : 'initializing…'}</div>
          {onStop && (
            <button
              className="btn-secondary"
              onClick={handleStop}
              disabled={stopRequested}
              style={{ marginTop: 8 }}
            >
              {stopRequested ? 'Stopping…' : 'Stop'}
            </button>
          )}
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="phases">
        {PHASES.map((phase) => (
          <div key={phase.title}>
            <h3 className="phase-title">{phase.title}</h3>
            <div className="agent-list">
              {phase.agents.map((name) => (
                <AgentRow key={name} name={name} status={visualStatus(name)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AgentProgress;
