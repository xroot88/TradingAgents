import React, { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MD = ({ children }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]}>{children || ''}</ReactMarkdown>
);

const REPORTS = [
  { key: 'market', title: 'Market Analysis' },
  { key: 'sentiment', title: 'Social Sentiment' },
  { key: 'news', title: 'News Report' },
  { key: 'fundamentals', title: 'Fundamentals' },
];

const SPEAKERS = [
  'Bull Analyst',
  'Bear Analyst',
  'Aggressive Analyst',
  'Conservative Analyst',
  'Neutral Analyst',
  'Risky Analyst',
  'Safe Analyst',
];

const SPEAKER_CLASS = {
  'Bull Analyst': 'turn-bull',
  'Bear Analyst': 'turn-bear',
  'Aggressive Analyst': 'turn-aggressive',
  'Risky Analyst': 'turn-aggressive',
  'Conservative Analyst': 'turn-conservative',
  'Safe Analyst': 'turn-conservative',
  'Neutral Analyst': 'turn-neutral',
};

// Split a debate history string into ordered turns by leading "<Speaker>:" labels.
function parseDebate(history) {
  if (!history || !history.trim()) return [];
  const pattern = new RegExp(
    `(?:^|\\n)\\s*(${SPEAKERS.join('|')}):`,
    'g'
  );
  const turns = [];
  const matches = [...history.matchAll(pattern)];
  if (!matches.length) {
    return [{ speaker: null, text: history.trim() }];
  }
  matches.forEach((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : history.length;
    const text = history.slice(start, end).trim();
    if (text) turns.push({ speaker: m[1], text });
  });
  return turns;
}

function Report({ title, body }) {
  return (
    <details className="report" open={false}>
      <summary>{title}</summary>
      <div className="report-body markdown">
        {body ? <MD>{body}</MD> : <span className="empty">No report generated.</span>}
      </div>
    </details>
  );
}

function Debate({ title, history, judgeLabel, judgeDecision }) {
  const turns = parseDebate(history);
  const hasContent = turns.length > 0 || (judgeDecision && judgeDecision.trim());
  if (!hasContent) return null;
  return (
    <details className="report debate" open={false}>
      <summary>{title}</summary>
      <div className="debate-body">
        {turns.map((t, i) => (
          <div
            key={i}
            className={`debate-turn ${t.speaker ? SPEAKER_CLASS[t.speaker] || '' : ''}`}
          >
            {t.speaker && <div className="turn-speaker">{t.speaker}</div>}
            <div className="turn-text markdown"><MD>{t.text}</MD></div>
          </div>
        ))}
        {judgeDecision && judgeDecision.trim() && (
          <div className="debate-turn turn-judge">
            <div className="turn-speaker">{judgeLabel}</div>
            <div className="turn-text markdown"><MD>{judgeDecision}</MD></div>
          </div>
        )}
      </div>
    </details>
  );
}

function AnalysisResult({ job, result, onReset }) {
  const decision = result?.final_decision || '';
  const details = result?.details || {};
  const research = result?.research_debate || {};
  const risk = result?.risk_debate || {};

  const downloadPdf = useCallback(() => {
    const detailsEls = Array.from(document.querySelectorAll('.printable details'));
    const previouslyOpen = detailsEls.map((d) => d.open);
    detailsEls.forEach((d) => {
      d.open = true;
    });
    document.body.classList.add('printing');
    const cleanup = () => {
      document.body.classList.remove('printing');
      detailsEls.forEach((d, i) => {
        d.open = previouslyOpen[i];
      });
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  }, []);

  return (
    <div className="result-stack">
      <div className="result-actions no-print">
        <button className="btn-secondary" onClick={onReset}>
          Run new analysis
        </button>
        <button className="btn-secondary" onClick={downloadPdf}>
          Download PDF
        </button>
      </div>

      <div className="printable">
        <div className="print-header">
          <h1>TradingAgents Report · {job.ticker}</h1>
          <div className="print-meta">
            Effort: {job.effort} · Started: {job.started_at}
          </div>
        </div>

        <div className="card card-pad decision-card">
          <div className="decision-label">Final Trade Decision · {job.ticker}</div>
          <div className="decision-text markdown">
            {decision ? <MD>{decision}</MD> : <span className="empty">No decision returned.</span>}
          </div>
        </div>

        {result?.investment_plan && (
          <div className="card card-pad">
            <h3 className="card-title">Investment Plan</h3>
            <div className="report-body markdown" style={{ padding: 0, maxHeight: 'none' }}>
              <MD>{result.investment_plan}</MD>
            </div>
          </div>
        )}

        {result?.trader_plan && (
          <div className="card card-pad">
            <h3 className="card-title">Trader Plan</h3>
            <div className="report-body markdown" style={{ padding: 0, maxHeight: 'none' }}>
              <MD>{result.trader_plan}</MD>
            </div>
          </div>
        )}

        <Debate
          title="Researcher Debate · Bull vs Bear"
          history={research.history}
          judgeLabel="Research Manager"
          judgeDecision={research.judge_decision}
        />

        <Debate
          title="Risk Debate · Aggressive · Conservative · Neutral"
          history={risk.history}
          judgeLabel="Portfolio Manager"
          judgeDecision={risk.judge_decision}
        />

        <div className="report-grid">
          {REPORTS.map((r) => (
            <Report key={r.key} title={r.title} body={details[r.key]} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default AnalysisResult;
