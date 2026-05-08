# 7% Dividend ETF Portfolio — Tax-Efficient, Principal-Preserving

*Drafted 2026-05-04. All ETFs verified to exist; yields are approximate as of late April 2026 and will drift. Re-verify before investing.*

---

## Honest Framing First

You asked for four things at once: **7% yield, principal preservation, inflation/recession resilience, and growth participation.** These pull against each other. Yield is a risk premium — a 7% blended yield in a world where Treasuries pay ~4% means roughly 3 percentage points of *something* (credit risk, equity beta, distribution-coverage uncertainty, illiquidity). You cannot make that risk vanish through clever construction; you can only diversify and structure it tax-efficiently.

This portfolio is built around that honesty. It targets **~7.0% blended yield** with meaningful tax deferral, holds **no leveraged ETFs**, spans **13 holdings across 7 uncorrelated income sleeves**, and explicitly captures partial Nasdaq upside through covered-call structures. The realistic 2008-style drawdown is **~30%**, which the ~7% income stream can recover within ~4–5 years if reinvested.

> **Note on "principal preservation":** Over a 10-year window with these holdings, nominal principal preservation is highly likely if income is reinvested or partially reinvested. It is *not* guaranteed in any individual year — see Stress Testing.

---

## Executive Summary

| Metric | Target | Realistic Estimate |
|---|---|---|
| Pre-tax distribution yield | ≥7% | ~7.0% |
| Tax deferral via ROC | Maximize | ~33% of distributions are ROC (deferred) |
| Federally tax-free | — | ~6% of distributions |
| Equity beta to S&P 500 | Limited | ~0.50 (S&P + Nasdaq covered-call exposure raises this vs. v1) |
| Severe-recession drawdown | Limited | ~30% (2008-style) |
| Years of income to recover that drawdown | <5 | ~4–5 years if income reinvested |
| Inflation hedge | Multiple layers | Floating-rate credit + midstream contracts + REIT rents + equity pricing power |
| Leverage anywhere in the portfolio | None | **No leveraged ETFs** |
| Tax forms | 1099 only | **No K-1s** — every ETF here is structured to issue 1099-DIV |

---

## Portfolio Allocation

| # | Ticker | Name | Weight | Approx. Yield | Tax Profile |
|---|--------|------|-------:|--------------:|-------------|
| 1 | **AMLP** | Alerian MLP ETF | 12% | ~7.5% | ~80% ROC; 1099-DIV. Fund taxed as C-corp — caveat below |
| 2 | **MLPX** | Global X MLP & Energy Infrastructure | 8% | ~5.5% | RIC structure (no C-corp drag); QDI + ordinary mix |
| 3 | **SPYI** | NEOS S&P 500 High Income | 13% | ~12% | 2025 distributions were 94% ROC; Section 1256 index options |
| 4 | **JEPQ** | JPMorgan Nasdaq Equity Premium Income | 8% | ~10% | ELN premium = ordinary; underlying divs = QDI |
| 5 | **DIVO** | Amplify CWP Enhanced Dividend Income | 7% | ~5.0% | Mostly QDI from underlying; option premium ordinary |
| 6 | **SCHD** | Schwab US Dividend Equity | 10% | ~3.5% | ~100% qualified dividends |
| 7 | **VNQ** | Vanguard Real Estate | 6% | ~4.0% | Mostly ordinary; eligible for 20% Section 199A deduction |
| 8 | **SRLN** | SPDR Blackstone Senior Loan | 9% | ~8.0% | Ordinary income; floating rate (sub-IG credit) |
| 9 | **JBBB** | Janus Henderson B-BBB CLO | 4% | ~7.5% | Ordinary income; floating rate |
| 10 | **PFF** | iShares Preferred & Income | 8% | ~6.5% | Mostly QDI; **unlevered** (replaces PFFA) |
| 11 | **VRP** | Invesco Variable Rate Preferred | 6% | ~7.0% | QDI mix; floating-rate preferreds |
| 12 | **HYD** | VanEck High Yield Muni | 6% | ~5.0% | Federally tax-exempt |
| 13 | **VTEB** | Vanguard Tax-Exempt Bond | 3% | ~3.5% | Federally tax-exempt; investment-grade muni anchor |

**Weighted yield: ≈7.0%**

### What Changed from Version 1

| Change | Reason |
|--------|--------|
| Removed PFFA (8%) → added PFF (8%) and grew VRP from 5% to 6% | Eliminates 20–30% borrowed leverage; ~4pp less drawdown in rate-spike scenarios |
| Added VNQ (6%) | Real estate is the missing asset class; rent escalators add a 4th inflation-hedge layer |
| Added JEPQ (8%) | Captures Nasdaq/tech upside that SCHD's value tilt misses — closes the "grow when market grows" gap |
| Reduced AMLP 15% → 12% | Trims energy concentration from 25% to 20% |
| Reduced SCHD 12% → 10%, DIVO 10% → 7% | Made room for VNQ and JEPQ without losing growth participation in aggregate |

---

## Why Each Holding

### Energy Infrastructure (20%) — the ROC engine

**AMLP (12%)** — Largest US midstream MLPs (Enterprise Products, MPLX, Energy Transfer, Plains, Western Midstream). Distributions are heavily ROC because MLPs pass through depreciation. The fund issues a **1099-DIV, not a K-1** — the simplification is the whole reason to use the ETF wrapper.
- **Major caveat:** Because AMLP holds >25% MLPs, IRS rules force it to be taxed as a **C-corporation**. The fund pays ~21% corporate tax on its own gains, creating a structural drag of ~1–2% per year on NAV vs. holding the underlying MLPs directly. Real cost — don't ignore it.

**MLPX (8%)** — A **RIC-structured** midstream ETF. Caps MLP holdings under 25% and fills the rest with C-corp midstream (Williams, Kinder Morgan, Oneok, Cheniere) plus Canadian midstream (Enbridge, TC Energy). No C-corp drag, more capital appreciation, but lower yield and less ROC than AMLP. The pair balances the structural tradeoff.

### Tax-Advantaged Equity Income (28%) — the principal-preservation engine

**SPYI (13%)** — NEOS sells out-of-the-money calls on the S&P 500 using **Section 1256 index options**. The structure produces ~12% distribution rate with **94% classified as ROC in 2025** (per NEOS's 19a-1 reporting). Captures partial S&P upside (~50–70% of strong months) and cushions drawdowns via premium income. Limited live track record (launched 2022) — you're partly trusting the structure.

**JEPQ (8%)** — JPMorgan's Nasdaq equivalent of JEPI. Sells call exposure on tech/growth names via equity-linked notes (ELNs). **Adds tech beta the rest of the portfolio lacks** — without JEPQ, an AI/tech-driven rally leaves you ~15pp behind a 60/40 over a year. Less tax-efficient than SPYI (ELN premium is ordinary income, not Section 1256), but the diversification value is worth the tax drag. Larger AUM and longer track record than SPYI.

**DIVO (7%)** — Active dividend equity (~25 names) with selective covered-call overlay. Lower yield than SPYI/JEPQ but more upside participation. Dividend portion is qualified.

### Quality Dividend Equity (10%)

**SCHD (10%)** — The growth anchor. 100-name screen for quality dividend payers. 100% qualified dividends. Lower yield (~3.5%) but the highest expected long-run capital appreciation in the portfolio. **This is your "grow when the market grows" bucket for value-style markets** — JEPQ handles growth-style markets.

### Real Estate (6%) — the missing asset class

**VNQ (6%)** — Broad US REIT exposure across apartments (AvalonBay, Equity Residential), industrial (Prologis), data centers (Equinix, Digital Realty), towers (American Tower), and retail/healthcare. Why this matters:
- **Different cycle** than energy, credit, or equity — REIT supply/demand depends on demographics, local construction, and rent renewals
- **Inflation hedge** via rent escalators (commercial leases typically 2–4% annual bumps; residential resets at lease renewal)
- **Section 199A**: 20% pass-through deduction reduces effective tax rate on REIT ordinary distributions to ~19% at a 24% bracket

**Caveat:** REITs got crushed in 2008 (-65% peak-to-trough) because commercial mortgage funding froze. They also lost ~26% in 2022 when rates spiked. Sized at 6% (not 10–15%) to bound that risk.

### Floating-Rate Credit (13%) — the inflation hedge

**SRLN (9%)** — Senior secured leveraged loans (BB/B rated, **not investment grade** — the asset class is sub-IG; that's what generates the yield). First-lien, floating rate resets quarterly off SOFR, so coupons rise with rates. Historical recovery in default ~70%. In 2008 the asset class drew down ~30%; in 2020 ~20% intraday before snapping back.

**JBBB (4%)** — BBB-tranche CLO ETF. Floating-rate, structurally senior to equity tranches, slightly higher yield than direct senior loans. Limited recession history (CLO ETFs are new) — sized small.

### Preferreds (14%) — yield with QDI treatment, no leverage

**PFF (8%)** — Broad iShares preferred & income ETF. ~$15B AUM, the standard institutional preferred vehicle. Mix of fixed-rate and floating-rate preferreds from US banks, insurers, REITs, utilities. **Unlevered** — this is the principal-preservation upgrade over PFFA. Loses ~3% of yield vs. levered alternatives but eliminates the amplification that hurt PFFA in 2022.

**VRP (6%)** — Variable-rate preferreds. Coupons reset, so duration is short. Diversifies PFF's longer-duration profile and adds another inflation-rate hedge.

### Munis (9%) — tax-free anchor

**HYD (6%)** — High-yield (BB/lower IG) munis. ~5% tax-free yield = ~7.5–8% taxable equivalent at a 35% bracket. State-specific munis would be more efficient if you live in a high-tax state — replace HYD with your state's analog if so.

**VTEB (3%)** — Investment-grade munis. Lower yield, lower volatility, anchors the muni sleeve. Acts as dry powder in a sharp drawdown.

---

## Tax Analysis — per $1,000 invested per year

| Sleeve | Income | ROC (deferred) | Tax-Free | Qualified Div | Ordinary |
|--------|-------:|---------------:|---------:|--------------:|---------:|
| AMLP (12%) | $9.00 | $7.20 | — | $0.90 | $0.90 |
| MLPX (8%) | $4.40 | $0.90 | — | $2.20 | $1.30 |
| SPYI (13%) | $15.60 | $14.65 | — | — | $0.95 |
| JEPQ (8%) | $8.00 | — | — | $1.60 | $6.40 |
| DIVO (7%) | $3.50 | $0.35 | — | $2.10 | $1.05 |
| SCHD (10%) | $3.50 | — | — | $3.50 | — |
| VNQ (6%) | $2.40 | — | — | $0.30 | $2.10* |
| SRLN (9%) | $7.20 | — | — | — | $7.20 |
| JBBB (4%) | $3.00 | — | — | — | $3.00 |
| PFF (8%) | $5.20 | — | — | $4.16 | $1.04 |
| VRP (6%) | $4.20 | — | — | $3.00 | $1.20 |
| HYD (6%) | $3.00 | — | $3.00 | — | — |
| VTEB (3%) | $1.05 | — | $1.05 | — | — |
| **Total** | **$70.05** | **$23.10** | **$4.05** | **$17.76** | **$25.14** |

*VNQ ordinary distributions qualify for the 20% Section 199A pass-through deduction, lowering the effective rate to ~80% of your marginal ordinary rate.

**Distribution buckets per $1,000 invested:**
- Total distributions: **$70.05 (7.00% yield)**
- Currently taxed: $42.90 (61% of income)
- Deferred via ROC: $23.10 (33%) — taxed only on sale, reduces cost basis
- Federally tax-free: $4.05 (6%)

**Estimated current-year tax (assumes 24% ordinary, 15% qualified, 19.2% effective on REIT ordinary after §199A, 0% on muni/ROC):**
- VNQ ordinary (with §199A): $2.10 × 19.2% = $0.40
- Other ordinary: $23.04 × 24% = $5.53
- Qualified div: $17.76 × 15% = $2.66
- Tax-free: $0
- Deferred ROC: $0 now (taxed at sale)
- **Current tax: $8.59 per $1,000 → effective current rate of 12.3%**
- **After-tax current income: $61.46 per $1,000 (6.15% after-tax yield)**

> The after-tax current yield is slightly lower than v1 (~6.32%) because JEPQ's option premium is ordinary income rather than Section 1256. The trade is intentional: JEPQ gives you Nasdaq beta you cannot get tax-efficiently any other way.

**ROC reminder:** That $23.10/year of deferred ROC reduces your cost basis dollar-for-dollar. If you hold for 10 years, basis falls by ~$231 per $1,000 invested (more if reinvested). On sale, the recovered basis is taxed as long-term capital gains (15–20%). The benefit is *deferral* and *rate conversion* (ordinary → LTCG), not exemption. If basis hits zero (~30+ years of heavy ROC), further ROC distributions become immediately taxable as LTCG.

---

## Stress Testing (honest)

### Scenario A: Mild Recession (2001-style)

| Sleeve | Drawdown | Contribution |
|--------|---------:|-------------:|
| Energy infra (AMLP+MLPX, 20%) | -18% | -3.6% |
| Equity income (SPYI+JEPQ+DIVO, 28%) | -14% | -3.9% |
| SCHD (10%) | -12% | -1.2% |
| VNQ (6%) | -15% | -0.9% |
| Senior loans/CLO (SRLN+JBBB, 13%) | -8% | -1.0% |
| Preferreds (PFF+VRP, 14%) | -10% | -1.4% |
| Munis (HYD+VTEB, 9%) | -3% | -0.3% |
| **Total** | | **~-12%** |

Income (~7%) covers in roughly 2 years if reinvested.

### Scenario B: Severe Crisis (2008-style)

| Sleeve | Drawdown | Contribution |
|--------|---------:|-------------:|
| Energy infra (20%) | -45% | -9.0% |
| Equity income (28%) | -30% (Nasdaq covered-call hit harder) | -8.4% |
| SCHD (10%) | -35% | -3.5% |
| VNQ (6%) | -55% (REITs crushed in GFC) | -3.3% |
| Senior loans/CLO (13%) | -28% | -3.6% |
| Preferreds (14%) | -28% (no leverage = better than v1) | -3.9% |
| Munis (9%) | -8% | -0.7% |
| **Total** | | **~-32%** |

Income covers in ~4.5–5 years if reinvested. Slightly better than v1 in non-real-estate scenarios; slightly worse if the crisis specifically targets real estate (which 2008 did). The PFFA-removal saves ~1pp in 2022-style rate spikes specifically.

### Scenario C: Stagflation (1970s-style)

| Sleeve | Direction | Reason |
|--------|----------:|--------|
| Energy infra | **Positive** | Midstream contracts often have CPI escalators; energy demand rises |
| SRLN/JBBB/VRP | **Positive** | Floating-rate coupons reset upward |
| VNQ | **Positive** | Rent escalators reset; replacement-cost values rise |
| SCHD/DIVO | **Mixed** | Quality names with pricing power weather it; high-yield reach suffers |
| SPYI/JEPQ | **Mixed** | Premium income rises with vol; equity real returns historically poor in stagflation |
| Fixed-rate preferreds (PFF) | **Negative** | Duration hurts |
| Munis | **Negative** | Long-duration munis lose value to rising rates |

Net: Holds up better than a 60/40 in stagflation. Floating-rate sleeve, energy infra, and REITs are the offsets. **Adding VNQ in v2 strengthens this scenario meaningfully.**

### Scenario D: Strong Bull Market (S&P +20%/yr, Nasdaq +30%/yr)

| Sleeve | Annual Return | Contribution |
|--------|--------------:|-------------:|
| Energy infra (20%) | +12% | +2.4% |
| SPYI (13%) | +13% (capped vs. S&P, plus distributions) | +1.7% |
| JEPQ (8%) | +18% (capped vs. Nasdaq, plus distributions) | +1.4% |
| DIVO (7%) | +14% | +1.0% |
| SCHD (10%) | +18% | +1.8% |
| VNQ (6%) | +12% | +0.7% |
| Floating-rate (13%) | +6% | +0.8% |
| Preferreds (14%) | +6% | +0.8% |
| Munis (9%) | +3% | +0.3% |
| **Total** | | **~10.9%** |

You will lag a roaring tech-led rally. **JEPQ closes most of the gap** — without it, this would lag by another ~2–3pp in a Nasdaq-dominant year. Expect ~55–65% of S&P upside in roaring markets.

---

## 10-Year Projection (Conservative)

Assumptions: 7.0% pre-tax distribution yield, 2.5% annual NAV appreciation (slightly higher than v1 due to added equity beta), 12% effective current-year tax rate, distributions reinvested.

| Year | Start Value | Distributions | Tax | After-Tax Reinvested | NAV Growth | End Value |
|-----:|------------:|--------------:|----:|---------------------:|-----------:|----------:|
| 1 | $100,000 | $7,000 | $860 | $6,140 | $2,500 | $108,640 |
| 2 | $108,640 | $7,605 | $935 | $6,670 | $2,716 | $118,026 |
| 3 | $118,026 | $8,262 | $1,016 | $7,246 | $2,951 | $128,222 |
| 5 | $139,398 | $9,758 | $1,200 | $8,558 | $3,485 | $151,441 |
| 10 | $221,580 | $15,511 | $1,907 | $13,604 | $5,540 | $240,724 |

**Year-10 outcome (reinvested): ~$241k portfolio value.** Annualized total return ~9.2% after current-year tax — **before** the deferred ROC tax bill that comes due on sale.

**If you spend all distributions instead of reinvesting:** ~$128k portfolio value + ~$78k cumulative cash income = ~$206k total economic value. Annualized ~7.5%.

**Year-5 stress overlay:** A single -32% drawdown in Year 5 (Scenario B) reduces Year-10 value to roughly **$178k reinvested / $158k spending** — still above the $100k starting principal in nominal terms. Whether it's above in real (inflation-adjusted) terms depends on the inflation regime that caused the crisis.

---

## Maintenance & Rebalancing

### Quarterly
- Verify no ETF has been delisted or restructured.
- Check AMLP's distribution coverage (Alerian publishes coverage ratios). If sustained <0.95x, trim AMLP 3pp and add to MLPX.
- Check SPYI's actual ROC % from monthly 19a-1 notices. If ROC drops materially below 80%, reassess.
- Check JEPQ's premium income trajectory — if Nasdaq vol collapses for an extended period, JEPQ's yield will compress.

### Semi-annually
- If blended yield drops below 6.7%, accept it as the price of safer markets. Do not chase yield.
- If blended yield exceeds 8.5%, the market is pricing in distress somewhere. **Don't celebrate.** Identify which holding is driving it and assess sustainability.

### Annually
- Rebalance to target weights ±2pp.
- Track ROC adjustments to cost basis in each holding (broker reports on 1099-DIV box 3, but verify against fund 19a-1 notices).
- Verify that combined equity exposure (SPYI+JEPQ+DIVO+SCHD+VNQ = 44% target) hasn't drifted beyond ~50%. Beyond that, you've taken on more equity risk than designed.

### Trigger reactions
| Trigger | Action |
|---------|--------|
| AMLP cuts distribution >10% | Trim 3pp, add to MLPX |
| Senior loan spreads >500 bp over Treasuries | Trim SRLN by 3pp, add to VTEB |
| SCHD drops >25% from 52-week high | Add 3pp from PFF (buy quality on weakness) |
| VNQ drops >35% (commercial real estate stress) | Hold; do not add — REIT downturns can run multi-year |
| Yield <6.5% for two quarters | Accept it; do not reach into junkier credit |

---

## Risk Summary — read this before investing

1. **Energy concentration (20%):** AMLP+MLPX still concentrate in one sector. The 2015–16 MLP washout drew AMLP down ~60%. The 2020 oil crash drew it down ~70% intraday. The structural case for midstream is strong (toll-road economics on essential infrastructure), but sector dislocations are real.

2. **AMLP's C-corp drag:** This is a quiet ~1–2%/year tax inefficiency. The ROC-rich distributions are real, but you pay for them in NAV growth. **Account placement matters:** if you have an IRA, don't waste it on AMLP — that account's tax-deferral is wasted on a holding that already produces deferred distributions. Use the IRA for SRLN/JBBB instead.

3. **SPYI and JEPQ have limited or moderate history.** SPYI launched 2022; JEPQ launched 2022. Both have performed as advertised so far but are unproven across a full bear market.

4. **REITs (VNQ) carry sector-specific risk.** Commercial real estate downturns can run 5+ years (1989–94, 2007–12). The 6% sizing already reflects caution, but if you have strong views against commercial real estate (work-from-home, retail decline), trim to 3% and split the rest between SCHD and PFF.

5. **Senior loans are sub-investment-grade.** SRLN holds BB and B credits. Defaults rise in recessions. First-lien position helps, but losses are real (~5–8% peak-cycle default rates with ~30% loss-given-default).

6. **All ETFs issue 1099-DIV — none issue K-1.** This is intentional and verified. AMLP and SPYI both produce only 1099-DIVs because of their fund structures.

7. **Yields shown are estimates and will change.** Verify each holding's current SEC yield and trailing-12-month distribution rate at purchase.

8. **This is not financial advice.** It is one analyst's construction. Run it past a fee-only fiduciary and a CPA before investing real money.

---

## What this portfolio explicitly does NOT do

- It does **not** preserve principal in nominal terms in the worst year. Realistic max drawdown is ~30%.
- It does **not** keep up with a strong bull market. Expect ~55–65% of S&P upside in roaring years (better than v1's ~50% thanks to JEPQ).
- It does **not** eliminate taxes. ROC defers ~33% of distributions; the rest is taxed currently at ordinary or qualified rates.
- It does **not** hedge a deflationary depression. Floating-rate coupons go to zero, MLPs fall with energy demand, REITs lose tenants, equity income falls with markets. The munis would be the only positive contributor.

What it **does** do is generate **~7% pre-tax / ~6.15% after-tax current income** with meaningful tax deferral, broad diversification across 7 uncorrelated income sources, no leverage, and partial equity participation across both value (SCHD) and growth (JEPQ) styles — making a 30% drawdown survivable on a 10-year horizon if income is reinvested.

---

## Quick Setup

1. Verify your broker — any major US broker handles all 13 of these ETFs in either taxable or IRA accounts.
2. **Account placement matters:**
   - **Taxable account (priority):** AMLP, SPYI, MLPX, DIVO, SCHD, PFF, VRP, HYD, VTEB, VNQ (these benefit from ROC, QDI, §199A, or muni treatment)
   - **IRA / tax-deferred (priority):** SRLN, JBBB, JEPQ (their ordinary-income distributions get sheltered)
3. For a $100k taxable contribution at target weights:
   - AMLP: $12,000 · MLPX: $8,000 · SPYI: $13,000 · JEPQ: $8,000 · DIVO: $7,000 · SCHD: $10,000
   - VNQ: $6,000 · SRLN: $9,000 · JBBB: $4,000 · PFF: $8,000 · VRP: $6,000
   - HYD: $6,000 · VTEB: $3,000
4. Enable DRIP on every position.
5. Set quarterly calendar reminders to verify distribution coverage and ROC %.

---

*Sources for verification: NEOS 19a-1 distribution classifications (SPYI), JPMorgan ETF prospectus (JEPQ), Alerian distribution coverage reports (AMLP), Vanguard fund pages (VNQ, VTEB), iShares fund pages (PFF). Yields current as of late April 2026; re-verify before purchase.*
