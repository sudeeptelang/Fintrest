export const metadata = { title: "Risk Disclosure — Fintrest.ai" };

export default function RiskDisclosurePage() {
  const lastUpdated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="max-w-3xl mx-auto px-6 py-16 prose prose-sm">
      <h1 className="font-[var(--font-heading)] text-3xl font-bold mb-2">Risk disclosure</h1>
      <p className="text-muted-foreground text-sm">Last updated: {lastUpdated}</p>

      <p className="mt-6 text-base">
        Trading stocks is risky. Before using Fintrest research to inform any
        trading decision, please read this page carefully.
      </p>

      <h2 className="mt-8 text-xl font-semibold">1. You can lose money</h2>
      <p>
        Any stock position can lose some or all of its value. Even positions
        flagged with the highest signal score can lose money. Even signals
        with favorable historical hit rates produce losers — often in streaks.
        Past performance of the Fintrest scoring engine, including its
        backtested performance, does not guarantee you will profit from any
        specific signal or set of signals. You should not trade money you
        cannot afford to lose.
      </p>

      <h2 className="mt-6 text-xl font-semibold">2. Signals are not certainties</h2>
      <p>
        Fintrest signals are the output of a 7-factor quantitative model
        combined with an AI research layer (Lens). The model is built, tuned,
        and maintained by humans; it reflects assumptions about how markets
        behave. Those assumptions can be wrong — particularly in unusual
        market conditions, regime changes, macro shocks, or company-specific
        events the model did not anticipate. A BUY TODAY designation is a
        research classification, not a prediction that the stock will rise.
      </p>

      <h2 className="mt-6 text-xl font-semibold">3. Reference levels are not instructions</h2>
      <p>
        Every signal includes reference entry, stop, and target levels. These
        are derived from technical structure (support/resistance, volatility,
        average true range) and represent the scoring engine&apos;s view of
        plausible trade structure for that setup. They are research outputs.
        They are not instructions to you to enter at the entry price, exit at
        the stop, or exit at the target. If you choose to use these levels,
        you do so on your own judgment and at your own risk.
      </p>

      <h2 className="mt-6 text-xl font-semibold">4. Real-world trading costs</h2>
      <p>
        Fintrest&apos;s backtested performance statistics do not include
        slippage, bid-ask spread, commissions, taxes, borrow fees (for short
        positions), capacity constraints, missed fills, or execution delays.
        In real trading, these frictions reduce returns — often materially,
        especially for small-cap and thinly-traded stocks, high-frequency
        strategies, or during volatile conditions. Your real-world results
        from acting on Fintrest signals will be lower than the backtested
        numbers suggest, and potentially significantly lower.
      </p>

      <h2 className="mt-6 text-xl font-semibold">5. Concentrated risk</h2>
      <p>
        Acting on a small number of signals concentrates your risk in a
        handful of stocks. Following only the &ldquo;BUY TODAY&rdquo; signals
        in a narrow time window may over-concentrate your exposure in a
        single sector or factor regime. Diversification is a basic
        risk-management principle, and Fintrest does not assess or manage
        your portfolio-level diversification. That is your responsibility.
      </p>

      <h2 className="mt-6 text-xl font-semibold">6. Volatility, gaps, and overnight risk</h2>
      <p>
        Stocks can gap through stop-loss levels overnight or on news, meaning
        a stop-loss at $870 may execute at $830 or lower if the stock opens
        below that level. Earnings reports, regulatory actions, merger
        announcements, geopolitical events, and broader market shocks can
        cause severe, immediate price moves that exceed any reference stop.
        Fintrest flags some of these risks (earnings within 21 days, elevated
        short interest, high beta, high RSI) but cannot flag all of them, and
        cannot prevent them from happening.
      </p>

      <h2 className="mt-6 text-xl font-semibold">7. Leverage and margin</h2>
      <p>
        Using margin or leverage amplifies both gains and losses. A 10%
        decline on a 2x margined position is a 20% account loss; a 30%
        decline can wipe out a leveraged account entirely. Fintrest research
        assumes unleveraged cash positions unless explicitly stated otherwise.
        If you apply Fintrest research to a leveraged or margined account,
        the risks described above are materially greater.
      </p>

      <h2 className="mt-6 text-xl font-semibold">8. Options, derivatives, and crypto</h2>
      <p>
        Fintrest covers US equities. If you trade options, futures, ETFs,
        leveraged ETFs, cryptocurrencies, or other derivatives based on
        Fintrest signals for underlying stocks, you are introducing
        additional risks (time decay, strike risk, contango, expiration,
        counterparty risk) that Fintrest research does not account for. You
        should not assume Fintrest research on the underlying translates
        directly to these instruments.
      </p>

      <h2 className="mt-6 text-xl font-semibold">9. Tax consequences</h2>
      <p>
        Short-term trading generally produces short-term capital gains, which
        are taxed at ordinary-income rates in the US. Wash-sale rules, the
        constructive-sale doctrine, qualified dividend treatment, and state
        tax treatment all add complexity. Fintrest does not provide tax
        advice and does not compute tax consequences of any signal or trade.
        Consult a tax professional.
      </p>

      <h2 className="mt-6 text-xl font-semibold">10. Psychological and behavioral risk</h2>
      <p>
        Trading on morning signals without discipline produces predictable
        behavioral losses: chasing breakouts after they&apos;ve run,
        abandoning stops, doubling down on losers, trading outside the signal
        framework, and overreacting to short losing streaks. The Fintrest
        scoring engine produces a research set; how a user handles that set
        — position sizing, discipline, stop adherence, sample size —
        determines real-world outcomes as much as the signals themselves.
        Most retail traders underperform passive benchmarks because of
        behavioral issues, not because of bad signals.
      </p>

      <h2 className="mt-6 text-xl font-semibold">11. Survivorship and reporting bias</h2>
      <p>
        Fintrest publishes its full audit log, including losing signals. You
        should not rely on anecdotal success stories, testimonials,
        social-media posts, or highlight reels to assess the real performance
        of the engine. Always look at the complete audit log — winners and
        losers — when evaluating whether Fintrest research is useful to your
        process.
      </p>

      <h2 className="mt-6 text-xl font-semibold">12. No guarantees</h2>
      <p>
        Fintrest makes no representation, warranty, or guarantee of any kind
        about any signal, score, thesis, reference level, or audit-log
        statistic. We do not guarantee accuracy, completeness, timeliness,
        continuity, fitness for any purpose, or non-infringement. Your use of
        Fintrest research is at your own risk.
      </p>

      <h2 className="mt-6 text-xl font-semibold">13. If you are uncertain</h2>
      <p>
        If you do not fully understand the risks above — or if you are
        uncertain whether trading stocks is suitable for you — do not trade.
        Consider index-fund investing, consult a licensed financial
        professional, or use Fintrest purely as an educational tool until you
        are confident in your own process.
      </p>

      <h2 className="mt-6 text-xl font-semibold">14. Questions</h2>
      <p>
        Questions about risk or this disclosure:{" "}
        <a href="mailto:legal@dsysinc.com">legal@dsysinc.com</a> · DSYS Inc.,
        United States.
      </p>
    </article>
  );
}
