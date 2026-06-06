import React, { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import RatingGauge from './RatingGauge';
import Chart from './Chart';

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

const RATING_CLASS = {
  Buy: 'rating-buy',
  Overweight: 'rating-buy',
  Hold: 'rating-hold',
  Underweight: 'rating-sell',
  Sell: 'rating-sell',
};

const RATING_SCORE = {
  Buy: 1.0,
  Overweight: 0.5,
  Hold: 0.0,
  Underweight: -0.5,
  Sell: -1.0,
};

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function wordCount(s) {
  if (!s) return 0;
  const m = s.trim().match(/\S+/g);
  return m ? m.length : 0;
}

// Map rating + research/risk debate balance into a -1..+1 "lean" score that
// drives the gauge needle. The base comes from the rating; the debate volume
// nudges the needle within the rating's zone.
function computeLean(rating, research, risk) {
  const base = RATING_SCORE[rating] ?? 0;

  const bull = wordCount(research?.bull_history);
  const bear = wordCount(research?.bear_history);
  const total = bull + bear;
  const researchTilt = total > 0 ? (bull - bear) / total : 0;

  const agg = wordCount(risk?.aggressive_history);
  const con = wordCount(risk?.conservative_history);
  const totalRisk = agg + con;
  const riskTilt = totalRisk > 0 ? (agg - con) / totalRisk : 0;

  return clamp(base + 0.15 * researchTilt + 0.1 * riskTilt, -1, 1);
}

// Pull a labeled field out of the rendered Portfolio Manager markdown.
// Tolerant of variations in emphasis, leading colons/spaces, and capitalization.
// Handles both `**Label**: value` / `**Label:** value` (outer-bold) and
// `**Label: value**` (inner-bold, where label and value share one bold span).
function grabField(text, label, multiline) {
  if (!text) return undefined;
  const tail = multiline
    ? '(?=\\n\\s*\\n\\*\\*|\\n\\s*#{2,6}\\s|\\n\\s*---+\\s*\\n|$)'
    : '(?=\\n|$)';
  const outer = new RegExp(
    `\\*\\*\\s*(?:Final\\s+)?${label}\\s*:?\\s*\\*\\*\\s*:?\\s*([\\s\\S]+?)${tail}`,
    'i'
  );
  const inner = new RegExp(
    `\\*\\*\\s*(?:Final\\s+)?${label}\\s*:\\s*([^\\n*][^\\n]*?)\\s*\\*\\*`,
    'i'
  );
  const m = text.match(outer) || (!multiline && text.match(inner));
  if (!m) return undefined;
  return m[1]
    .trim()
    .replace(/^`+|`+$/g, '')
    .replace(/\n+\s*---+\s*$/g, '')
    .trim();
}

// Carve a section out of the markdown by header. Tolerant of extra emphasis
// markers in the header line ("### **Final Verdict**" etc).
function grabSection(text, headerPattern) {
  if (!text) return undefined;
  const re = new RegExp(
    `(?:^|\\n)#{2,4}\\s*\\*{0,2}\\s*(?:[^\\n]*?\\s)?${headerPattern}[^\\n]*\\n([\\s\\S]+?)(?=\\n#{2,4}|$)`,
    'i'
  );
  const m = text.match(re);
  return m ? m[1].trim() : undefined;
}

function splitSentences(text) {
  if (!text) return [];
  // Allow trailing closing-emphasis markers (** ` " etc.) between the
  // sentence-ending period and the whitespace before the next sentence.
  // Marker uses the SOH control character so it can never appear in input.
  const marker = '\u0001';
  const marked = text.replace(
    /([.!?][*`)\]"'”]*)(\s+)(?=[`*"“]|[A-Z])/g,
    `$1${marker}`
  );
  return marked
    .split(marker)
    .map((s) => s.trim())
    .filter(Boolean);
}

function stripMd(s) {
  return (s || '')
    .replace(/`+/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const ACTION_WORDS = [
  'Buy',
  'Hold',
  'Sell',
  'Overweight',
  'Underweight',
  'Maintain',
  'Trim',
  'Reduce',
  'Add',
  'Accumulate',
];

// Trim a leading framing clause like "The Neutral calibration delivers
// the only executable path:" so the verdict reads as a pure directive.
function trimFraming(sentence, anchorIdx) {
  if (anchorIdx <= 0) return sentence;
  const colonIdx = sentence.lastIndexOf(':', anchorIdx);
  if (colonIdx > 0 && anchorIdx - colonIdx < 200) {
    return sentence.slice(colonIdx + 1).trim();
  }
  return sentence;
}

// Find the single most actionable sentence in the PM decision.
// Looks at (1) inline bold labels (`**Final Verdict**:`, `**Bottom Line:**`),
// (2) section headers whose name implies the final-call paragraph, and
// (3) as a last resort, any sentence in the whole decision containing the
// rating word in bold. Within each candidate block, prefer sentences that
// contain the bolded rating action word; otherwise fall back to the longest
// sentence in the block.
function findFinalVerdict(decision, rating) {
  if (!decision) return '';
  const candidates = [];

  const inlinePatterns = [
    /\*\*\s*(?:Final\s+)?Verdict\s*:?\s*\*\*\s*:?\s*([\s\S]+?)(?=\n\s*\n|\n#|$)/i,
    /\*\*\s*Bottom Line\s*:?\s*\*\*\s*([\s\S]+?)(?=\n\s*\n|\n#|$)/i,
  ];
  for (const re of inlinePatterns) {
    const m = decision.match(re);
    if (m) {
      candidates.push(m[1].trim());
      break;
    }
  }

  const sectionPatterns = [
    '(?:Final\\s+)?Verdict',
    "Portfolio Manager.?s? Verdict",
    'Final Directive',
    'Final Trading Directive',
    'Final Trading Decision',
    'Final Rationale',
    'Final Recommendation',
  ];
  for (const p of sectionPatterns) {
    const sec = grabSection(decision, p);
    if (sec) {
      candidates.push(sec);
      break;
    }
  }

  const actionList = rating
    ? [rating, ...ACTION_WORDS.filter((w) => w.toLowerCase() !== rating.toLowerCase())]
    : ACTION_WORDS;

  for (const block of candidates) {
    const sentences = splitSentences(block);
    for (const word of actionList) {
      const re = new RegExp(`\\*\\*\\s*${word}\\b`, 'i');
      const hit = sentences.find((s) => re.test(s));
      if (hit) {
        const m = hit.match(re);
        return stripMd(trimFraming(hit, m.index));
      }
    }
    const longest = sentences.reduce((a, b) => (b.length > a.length ? b : a), '');
    if (longest && longest.length > 40) return stripMd(longest);
  }

  if (rating) {
    const re = new RegExp(`\\*\\*\\s*${rating}\\b`, 'i');
    const hit = splitSentences(decision).find((s) => re.test(s));
    if (hit) {
      const m = hit.match(re);
      return stripMd(trimFraming(hit, m.index));
    }
  }
  return '';
}

// Pull the action-oriented protocol section out of the PM decision so the
// executive summary can render it as-is. Falls back through several common
// section headers used across runs.
function findExecutionProtocol(decision) {
  if (!decision) return '';
  return (
    grabSection(decision, 'Execution Protocol') ||
    grabSection(decision, 'Executable Trade Parameters') ||
    grabSection(decision, 'Final Trading Decision') ||
    grabSection(decision, 'Trade Parameters') ||
    ''
  );
}

// Convert a free-text bear/conservative narrative into 3-5 short risk bullets.
// Prefers existing bullet lines; otherwise picks short, declarative sentences.
function extractRisks(...sources) {
  for (const text of sources) {
    if (!text) continue;
    const bullets = [];
    const lines = text.split('\n');
    for (const ln of lines) {
      const m = ln.match(/^\s*[-*]\s+(.+)/);
      if (m) {
        const cleaned = stripMd(m[1]).replace(/\.$/, '');
        if (cleaned.length > 10 && cleaned.length < 220) bullets.push(cleaned);
      }
      if (bullets.length >= 5) break;
    }
    if (bullets.length >= 3) return bullets.slice(0, 5);

    const sentences = splitSentences(text)
      .map(stripMd)
      .filter((s) => s.length > 35 && s.length < 220);
    if (sentences.length >= 3) return sentences.slice(0, 4);
  }
  return [];
}

const VALID_RATINGS = ['Buy', 'Overweight', 'Hold', 'Underweight', 'Sell'];

function normalizeRating(raw) {
  const candidate = (raw || '').replace(/[`*\s]+/g, ' ').trim().split(/\s+/)[0] || '';
  if (!candidate) return '';
  const canonical = VALID_RATINGS.find(
    (r) => r.toLowerCase() === candidate.toLowerCase()
  );
  return canonical || '';
}

// Parse the **Trailing Stops** bullet list. Each line of the form
// `- At <trigger> → move stop to <new_stop> (<note>)` becomes one entry.
// Tolerant of variants the LLM might emit: ASCII arrow `->`, the word "to",
// and missing notes. Returns [] when no list is present.
function parseTrailingStops(decision) {
  if (!decision) return [];
  const re = /\*\*Trailing Stops\*\*:\s*\n((?:[ \t]*-[ \t]*[^\n]+\n?)+)/i;
  const m = decision.match(re);
  if (!m) return [];
  const out = [];
  for (const raw of m[1].split('\n')) {
    const line = raw.replace(/^\s*-\s*/, '').trim();
    if (!line) continue;
    // Pull out the two numbers and the optional trailing note in parens.
    const lm = line.match(
      /(?:at\s+)?\$?([\d,]+(?:\.\d+)?)\s*(?:→|->|to)\s*(?:move\s+stop\s+to\s+)?\$?([\d,]+(?:\.\d+)?)\s*(?:\((.+?)\))?\s*$/i
    );
    if (!lm) continue;
    const trigger = parseFloat(lm[1].replace(/,/g, ''));
    const newStop = parseFloat(lm[2].replace(/,/g, ''));
    if (!isFinite(trigger) || !isFinite(newStop)) continue;
    out.push({ trigger, newStop, note: (lm[3] || '').trim() });
  }
  return out;
}

function parsePmFields(decision) {
  if (!decision) return {};
  let rating = '';
  for (const label of ['Rating', 'Recommendation', 'Trading Decision', 'Action']) {
    rating = normalizeRating(grabField(decision, label, false));
    if (rating) break;
  }
  const executiveSummary = grabField(decision, 'Executive Summary', true);
  const investmentThesis =
    grabField(decision, 'Investment Thesis', true) ||
    grabField(decision, "Portfolio Manager.?s? Verdict", true) ||
    grabSection(decision, "Portfolio Manager.?s? Verdict");
  return {
    rating,
    executiveSummary,
    investmentThesis,
    timeHorizon: grabField(decision, 'Time Horizon', false),
    priceTarget: grabField(decision, 'Price Target', false),
    stopLoss: grabField(decision, 'Stop Loss', false),
    trailingStops: parseTrailingStops(decision),
  };
}

// Pull a longer rationale paragraph. When the PM emits structured output we
// have two distinct fields — ``executive_summary`` (the short action plan)
// and ``investment_thesis`` (the detailed reasoning). We use the verdict line
// for the executive summary and the rationale for the thesis so they don't
// repeat. The free-text fallbacks (Final Verdict section, etc.) only fire
// when neither structured field is present.
function findRationale(decision, finalVerdict, fields) {
  if (fields.investmentThesis) {
    return fields.investmentThesis;
  }
  // No thesis available — fall back to whichever Verdict-section prose we can
  // find, with the verdict sentence itself trimmed out so the two boxes don't
  // duplicate text.
  const section =
    grabSection(decision, '(?:Final\\s+)?Verdict') ||
    grabSection(decision, "Portfolio Manager.?s? Verdict");
  if (!section) return '';
  const firstPara = section.split(/\n\n/)[0];
  if (!finalVerdict) return firstPara.trim();
  const verdictKey = stripMd(finalVerdict).slice(0, 50).toLowerCase();
  const kept = splitSentences(firstPara).filter(
    (s) => !stripMd(s).toLowerCase().includes(verdictKey)
  );
  return kept.join(' ').trim();
}

function SummaryCard({ ticker, companyName, decision, asOf, lean, rating }) {
  const fields = parsePmFields(decision);
  const ratingClass = RATING_CLASS[rating] || 'rating-unknown';
  const verdict =
    fields.executiveSummary ||
    findFinalVerdict(decision, rating) ||
    'No verdict available.';
  let rationale = findRationale(decision, verdict, fields);
  // If both blocks resolved to the same text (e.g. provider returned identical
  // executive_summary and investment_thesis), hide the rationale to avoid
  // displaying the same paragraph twice.
  if (rationale && stripMd(rationale) === stripMd(verdict)) {
    rationale = '';
  }

  return (
    <div className={`card card-pad summary-card ${ratingClass}`}>
      <div className="summary-header">
        <div>
          <div className="decision-label">Trade Decision Summary</div>
          <div className="summary-ticker">{ticker}</div>
          {companyName && (
            <div className="summary-company">{companyName}</div>
          )}
        </div>
        <div className="summary-asof">
          {asOf && (
            <>
              <div className="summary-asof-label">As Of</div>
              <div className="summary-asof-value">{asOf}</div>
            </>
          )}
        </div>
      </div>

      <div className="summary-gauge">
        <RatingGauge score={lean} rating={rating} />
      </div>

      <div className="summary-section">
        <div className="summary-section-label">Final Verdict</div>
        <div className="summary-verdict">{verdict}</div>
      </div>

      {rationale && (
        <div className="summary-section">
          <div className="summary-section-label">Rationale</div>
          <div className="summary-rationale markdown">
            <MD>{rationale}</MD>
          </div>
        </div>
      )}
    </div>
  );
}

// Format raw numeric strings ("225.0", "$225") into "$225.00".
// Returns the original string if it's not parseable as a number.
function formatPrice(raw) {
  if (raw === undefined || raw === null) return raw;
  const cleaned = String(raw).replace(/[$,]/g, '').trim();
  const n = parseFloat(cleaned);
  if (!isFinite(n)) return raw;
  return `$${n.toFixed(2)}`;
}

function PriceLevels({ priceTarget, stopLoss, trailingStops }) {
  const hasAny =
    priceTarget || stopLoss || (trailingStops && trailingStops.length);
  if (!hasAny) return null;
  return (
    <section className="exec-block">
      <h4 className="exec-block-title">Price Levels</h4>
      <div className="price-levels">
        {priceTarget && (
          <div className="price-pill price-target">
            <div className="price-pill-label">Price Target</div>
            <div className="price-pill-value">{formatPrice(priceTarget)}</div>
          </div>
        )}
        {stopLoss && (
          <div className="price-pill price-stop">
            <div className="price-pill-label">Stop Loss</div>
            <div className="price-pill-value">{formatPrice(stopLoss)}</div>
          </div>
        )}
      </div>
      {trailingStops && trailingStops.length > 0 && (
        <div className="trailing-stops">
          <div className="trailing-stops-label">Trailing Stops</div>
          <ul className="trailing-stops-list">
            {trailingStops.map((t, i) => (
              <li key={i}>
                <span className="ts-rule">
                  At <strong>{formatPrice(t.trigger)}</strong> → move stop to{' '}
                  <strong>{formatPrice(t.newStop)}</strong>
                </span>
                {t.note && <span className="ts-note"> · {t.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ExecutiveSummary({ decision, research, risk }) {
  const fields = parsePmFields(decision);
  const protocol = findExecutionProtocol(decision);
  const risks = extractRisks(
    research?.bear_history,
    risk?.conservative_history
  );
  const horizon = fields.timeHorizon;
  const thesis = fields.investmentThesis || fields.executiveSummary;

  return (
    <details className="card card-pad exec-summary" open>
      <summary className="exec-summary-header">
        <span className="decision-label">Executive Summary</span>
      </summary>

      <div className="exec-body">
        {thesis && (
          <section className="exec-block">
            <h4 className="exec-block-title">Investment Thesis</h4>
            <div className="markdown"><MD>{thesis}</MD></div>
          </section>
        )}

        <PriceLevels
          priceTarget={fields.priceTarget}
          stopLoss={fields.stopLoss}
          trailingStops={fields.trailingStops}
        />

        {horizon && (
          <section className="exec-block exec-meta-row">
            <div className="exec-meta">
              <div className="exec-meta-label">Time Horizon</div>
              <div className="exec-meta-value">{horizon}</div>
            </div>
          </section>
        )}

        {risks.length > 0 && (
          <section className="exec-block">
            <h4 className="exec-block-title">Key Risks</h4>
            <ul className="risk-list">
              {risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </section>
        )}

        {protocol && (
          <section className="exec-block">
            <h4 className="exec-block-title">Execution Protocol</h4>
            <div className="markdown"><MD>{protocol}</MD></div>
          </section>
        )}
      </div>
    </details>
  );
}

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

  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!job?.ticker) return;
    fetch(`/company/${encodeURIComponent(job.ticker)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.name) setCompanyName(data.name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [job?.ticker]);

  const fields = parsePmFields(decision);
  const rating = fields.rating || '';
  const lean = computeLean(rating, research, risk);

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

        <SummaryCard
          ticker={job.ticker}
          companyName={companyName}
          decision={decision}
          asOf={job.started_at}
          lean={lean}
          rating={rating}
        />

        {result?.chart && <Chart chart={result.chart} />}

        <ExecutiveSummary
          decision={decision}
          research={research}
          risk={risk}
        />

        <details className="card card-pad decision-card" open={false}>
          <summary className="decision-label">Full Portfolio Manager Decision</summary>
          <div className="decision-text markdown">
            {decision ? <MD>{decision}</MD> : <span className="empty">No decision returned.</span>}
          </div>
        </details>

        {result?.investment_plan && (
          <details className="card card-pad" open={false}>
            <summary className="card-title">Investment Plan</summary>
            <div className="report-body markdown" style={{ padding: '8px 0 0', maxHeight: 'none' }}>
              <MD>{result.investment_plan}</MD>
            </div>
          </details>
        )}

        {result?.trader_plan && (
          <details className="card card-pad" open={false}>
            <summary className="card-title">Trader Plan</summary>
            <div className="report-body markdown" style={{ padding: '8px 0 0', maxHeight: 'none' }}>
              <MD>{result.trader_plan}</MD>
            </div>
          </details>
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
