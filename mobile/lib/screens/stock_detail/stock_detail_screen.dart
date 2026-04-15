import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_service.dart';
import '../../models/signal.dart';
import '../../widgets/score_bar.dart';
import '../../widgets/stock_logo.dart';

class StockDetailScreen extends StatefulWidget {
  final Signal signal;

  const StockDetailScreen({super.key, required this.signal});

  @override
  State<StockDetailScreen> createState() => _StockDetailScreenState();
}

class _StockDetailScreenState extends State<StockDetailScreen> {
  late final ApiService _api;
  Map<String, dynamic>? _snapshot;
  Map<String, dynamic>? _analyst;
  List<Map<String, dynamic>>? _earnings;
  List<Map<String, dynamic>>? _news;
  List<Signal>? _peers;
  Map<String, dynamic>? _ownership;
  bool _loading = true;

  Signal get signal => widget.signal;

  @override
  void initState() {
    super.initState();
    _api = ApiService(ApiClient());
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final results = await Future.wait([
        _api.getStockSnapshot(signal.ticker).catchError((_) => <String, dynamic>{}),
        _api.getStockAnalyst(signal.ticker).catchError((_) => <String, dynamic>{}),
        _api.getStockEarnings(signal.ticker).catchError((_) => <Map<String, dynamic>>[]),
        _api.getTopPicks(limit: 50).catchError((_) => <Signal>[]),
        _api.getStockNews(signal.ticker).catchError((_) => <Map<String, dynamic>>[]),
        _api.getStockOwnership(signal.ticker).catchError((_) => <String, dynamic>{}),
      ]);

      final snapshot = results[0] as Map<String, dynamic>;
      final analyst = results[1] as Map<String, dynamic>;
      final earnings = results[2] as List<Map<String, dynamic>>;
      final allSignals = results[3] as List<Signal>;
      final newsItems = results[4] as List<Map<String, dynamic>>;
      final ownership = results[5] as Map<String, dynamic>;

      // Peers = same sector, excluding self, top 5 by score
      final sector = snapshot['sector'] as String?;
      final peers = sector != null
          ? allSignals
              .where((s) => s.ticker != signal.ticker)
              .take(5)
              .toList()
          : <Signal>[];

      if (mounted) {
        setState(() {
          _snapshot = snapshot.isNotEmpty ? snapshot : null;
          _analyst = analyst.isNotEmpty ? analyst : null;
          _earnings = earnings.isNotEmpty ? earnings : null;
          _news = newsItems.isNotEmpty ? newsItems : null;
          _peers = peers.isNotEmpty ? peers : null;
          _ownership = ownership.isNotEmpty ? ownership : null;
          _loading = false;
        });
      }
    } catch (e) {
      debugPrint('Stock detail load failed: $e');
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Parse AI explanation from breakdown
    Map<String, dynamic> explanation = {};
    if (signal.breakdown?.explanationJson != null) {
      try {
        explanation = jsonDecode(signal.breakdown!.explanationJson!);
      } catch (_) {}
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(signal.ticker,
            style: GoogleFonts.dmMono(fontWeight: FontWeight.w700)),
        actions: [
          IconButton(icon: const Icon(Icons.star_border_rounded), onPressed: () {}),
          IconButton(icon: const Icon(Icons.notifications_outlined), onPressed: () {}),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── Hero Header ───
            _buildHeader(),
            const SizedBox(height: 20),

            // ─── Score + Trade Zone ───
            _buildScoreAndTradeZone(),
            const SizedBox(height: 20),

            // ─── Athena Summary (WHY this signal) ───
            if (explanation['Summary'] != null)
              _buildAthenaSummary(explanation),
            if (explanation['Summary'] != null) const SizedBox(height: 20),

            // ─── Athena Snowflake (5-axis) ───
            if (_snapshot != null) _buildSnowflake(),
            if (_snapshot != null) const SizedBox(height: 20),

            // ─── Rewards & Risks (Simply Wall St-style) ───
            if (_snapshot != null) _buildRewardsRisks(),
            if (_snapshot != null) const SizedBox(height: 20),

            // ─── Valuation (Fair Value + Range + Sensitivity) ───
            if (_snapshot != null) _buildValuation(),
            if (_snapshot != null) const SizedBox(height: 20),

            // ─── Ownership & Insider Activity ───
            if (_ownership != null) _buildOwnership(),
            if (_ownership != null) const SizedBox(height: 20),

            // ─── Snapshot Metrics (Finviz-style) ───
            if (_snapshot != null) _buildSnapshotGrid(),
            if (_snapshot != null) const SizedBox(height: 20),

            // ─── Analyst Consensus ───
            if (_analyst != null && (_analyst!['totalAnalysts'] ?? 0) > 0)
              _buildAnalystConsensus(),
            if (_analyst != null && (_analyst!['totalAnalysts'] ?? 0) > 0)
              const SizedBox(height: 20),

            // ─── Earnings History ───
            if (_earnings != null && _earnings!.isNotEmpty)
              _buildEarningsHistory(),
            if (_earnings != null && _earnings!.isNotEmpty)
              const SizedBox(height: 20),

            // ─── Recent News ───
            if (_news != null && _news!.isNotEmpty) _buildNews(),
            if (_news != null && _news!.isNotEmpty) const SizedBox(height: 20),

            // ─── Score Breakdown ───
            if (signal.breakdown != null) _buildScoreBreakdown(),
            if (signal.breakdown != null) const SizedBox(height: 20),

            // ─── Bullish / Bearish Factors ───
            if (explanation['BullishFactors'] != null ||
                explanation['BearishFactors'] != null)
              _buildFactors(explanation),
            if (explanation['BullishFactors'] != null ||
                explanation['BearishFactors'] != null)
              const SizedBox(height: 20),

            // ─── Peer Comparison ───
            if (_peers != null && _peers!.isNotEmpty) _buildPeerComparison(),
            if (_peers != null && _peers!.isNotEmpty) const SizedBox(height: 20),

            // ─── Loading indicator ───
            if (_loading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: CircularProgressIndicator(),
                ),
              ),

            // ─── Compliance Footer ───
            Padding(
              padding: const EdgeInsets.only(top: 8, bottom: 24),
              child: Text(
                'Educational content only — not financial advice. Past signal performance does not guarantee future results.',
                style: TextStyle(fontSize: 10, color: Colors.grey[600]),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      children: [
        StockLogo(ticker: signal.ticker, size: 52, borderRadius: 14),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Text(signal.ticker, style: GoogleFonts.sora(fontSize: 20, fontWeight: FontWeight.w700)),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: signal.isBuy
                        ? AppColors.emerald.withValues(alpha: 0.1)
                        : AppColors.amber.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(signal.signalTypeDisplay,
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                          color: signal.isBuy ? AppColors.emerald : AppColors.amber)),
                ),
              ]),
              const SizedBox(height: 2),
              Text(signal.stockName, style: TextStyle(fontSize: 13, color: Colors.grey[500])),
              if (signal.currentPrice != null) ...[
                const SizedBox(height: 4),
                Row(children: [
                  Text('\$${signal.currentPrice!.toStringAsFixed(2)}',
                      style: GoogleFonts.dmMono(fontSize: 18, fontWeight: FontWeight.w700)),
                  if (signal.changeDisplay != null) ...[
                    const SizedBox(width: 8),
                    Text(signal.changeDisplay!,
                        style: GoogleFonts.dmMono(
                          fontSize: 14, fontWeight: FontWeight.w700,
                          color: signal.isPositiveChange ? AppColors.emerald : Colors.red[400],
                        )),
                  ],
                ]),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildScoreAndTradeZone() {
    return Row(
      children: [
        Expanded(
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Signal Score', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                  const SizedBox(height: 8),
                  Text(signal.scoreTotal.round().toString(),
                      style: GoogleFonts.sora(fontSize: 32, fontWeight: FontWeight.w800)),
                  Row(children: [
                    Text('/ 100  ', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                    Text(signal.horizonLabel,
                        style: TextStyle(fontSize: 10, color: Colors.grey[500])),
                  ]),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Trade Zone', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                  const SizedBox(height: 8),
                  _TradeRow('Entry', signal.entryRange ?? '—'),
                  _TradeRow('Target', signal.targetRange ?? '—', color: AppColors.emerald),
                  _TradeRow('Stop', signal.stopDisplay ?? '—', color: AppColors.red),
                  if (signal.riskLevel != null)
                    _TradeRow('Risk', signal.riskLevel!, color: signal.riskLevel == 'LOW'
                        ? AppColors.emerald : signal.riskLevel == 'HIGH' ? AppColors.red : AppColors.amber),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAthenaSummary(Map<String, dynamic> explanation) {
    final nextEarnings = _snapshot?['nextEarningsDate'];
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E1B4B), Color(0xFF2D2A6B)],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.emerald.withValues(alpha: 0.2)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Container(
              width: 28, height: 28,
              decoration: BoxDecoration(color: AppColors.emerald, borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.auto_awesome, size: 16, color: Colors.white),
            ),
            const SizedBox(width: 8),
            Text('Athena\'s Analysis', style: GoogleFonts.sora(
                fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white)),
          ]),
          const SizedBox(height: 12),
          Text(explanation['Summary'],
              style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.8), height: 1.5)),
          if (nextEarnings != null) ...[
            const SizedBox(height: 12),
            Row(children: [
              Icon(Icons.event, size: 14, color: Colors.white.withValues(alpha: 0.5)),
              const SizedBox(width: 6),
              Text('Next Earnings: ${_formatDate(nextEarnings)}',
                  style: TextStyle(fontSize: 11, color: Colors.white.withValues(alpha: 0.6))),
            ]),
          ],
          if (explanation['TradeZoneNarrative'] != null) ...[
            const SizedBox(height: 10),
            Text(explanation['TradeZoneNarrative'],
                style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic,
                    color: Colors.white.withValues(alpha: 0.6))),
          ],
        ],
      ),
    );
  }

  Widget _buildSnapshotGrid() {
    final s = _snapshot!;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Snapshot', style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            _SnapshotRow('Market Cap', _fmtMarketCap(s['marketCap'])),
            _SnapshotRow('P/E', _fmtRatio(s['peRatio'])),
            _SnapshotRow('Forward P/E', _fmtRatio(s['forwardPe'])),
            _SnapshotRow('PEG', _fmtRatio(s['pegRatio'])),
            _SnapshotRow('P/B', _fmtRatio(s['priceToBook'])),
            _SnapshotRow('Beta', _fmtRatio(s['beta'])),
            _SnapshotRow('ROE', _fmtPct(s['returnOnEquity'])),
            _SnapshotRow('ROA', _fmtPct(s['returnOnAssets'])),
            _SnapshotRow('Op Margin', _fmtPct(s['operatingMargin'])),
            _SnapshotRow('Gross Margin', _fmtPct(s['grossMargin'])),
            _SnapshotRow('RSI (14)', s['rsi']?.toStringAsFixed(1) ?? '—',
                color: (s['rsi'] ?? 50) > 70 ? Colors.red[400] : (s['rsi'] ?? 50) < 30 ? AppColors.emerald : null),
            _SnapshotRow('52W High', s['week52High'] != null ? '\$${(s['week52High'] as num).toStringAsFixed(2)}' : '—'),
            _SnapshotRow('52W Low', s['week52Low'] != null ? '\$${(s['week52Low'] as num).toStringAsFixed(2)}' : '—'),
            if (s['analystTargetPrice'] != null)
              _SnapshotRow('Analyst Target', '\$${(s['analystTargetPrice'] as num).toStringAsFixed(2)}',
                  color: (s['analystTargetPrice'] ?? 0) > (s['price'] ?? 0) ? AppColors.emerald : Colors.red[400]),
            _SnapshotRow('Perf Week', _fmtChangePct(s['perfWeek'])),
            _SnapshotRow('Perf Month', _fmtChangePct(s['perfMonth'])),
            _SnapshotRow('Perf YTD', _fmtChangePct(s['perfYtd'])),
          ],
        ),
      ),
    );
  }

  Widget _buildAnalystConsensus() {
    final a = _analyst!;
    final total = (a['totalAnalysts'] as num?)?.toInt() ?? 0;
    final rating = (a['rating'] as num?)?.toDouble() ?? 0;
    final counts = [a['strongBuy'] ?? 0, a['buy'] ?? 0, a['hold'] ?? 0, a['sell'] ?? 0, a['strongSell'] ?? 0]
        .map((e) => (e as num).toInt())
        .toList();
    final labels = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];
    final colors = [AppColors.emerald, const Color(0xFF66BB6A), AppColors.amber, Colors.red[300]!, Colors.red[600]!];

    String ratingLabel = rating >= 4.5 ? 'Strong Buy' : rating >= 3.5 ? 'Buy' : rating >= 2.5 ? 'Hold' : rating >= 1.5 ? 'Sell' : 'Strong Sell';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text('Analyst Consensus', style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w600)),
              Text('$total analysts', style: TextStyle(fontSize: 11, color: Colors.grey[500])),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              Text(rating.toStringAsFixed(1), style: GoogleFonts.sora(fontSize: 28, fontWeight: FontWeight.w800,
                  color: rating >= 3.5 ? AppColors.emerald : rating >= 2.5 ? AppColors.amber : Colors.red[400])),
              const SizedBox(width: 8),
              Text(ratingLabel, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                  color: rating >= 3.5 ? AppColors.emerald : rating >= 2.5 ? AppColors.amber : Colors.red[400])),
            ]),
            const SizedBox(height: 12),
            // Stacked bar
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: SizedBox(
                height: 12,
                child: Row(
                  children: List.generate(5, (i) {
                    final pct = total > 0 ? counts[i] / total : 0.0;
                    if (pct == 0) return const SizedBox.shrink();
                    return Expanded(
                      flex: (pct * 100).round().clamp(1, 100),
                      child: Container(color: colors[i]),
                    );
                  }),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: List.generate(5, (i) => Column(children: [
                Text('${counts[i]}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                Text(labels[i].split(' ').last, style: TextStyle(fontSize: 9, color: Colors.grey[500])),
              ])),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEarningsHistory() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Earnings History', style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            ..._earnings!.take(4).map((e) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  SizedBox(width: 70, child: Text(e['period'] ?? '—',
                      style: GoogleFonts.dmMono(fontSize: 12, fontWeight: FontWeight.w600))),
                  Expanded(child: Text(
                    e['revenue'] != null ? _fmtRevenue((e['revenue'] as num).toDouble()) : '—',
                    style: TextStyle(fontSize: 12, color: Colors.grey[400]),
                  )),
                  SizedBox(width: 60, child: Text(
                    e['eps'] != null ? '\$${(e['eps'] as num).toStringAsFixed(2)}' : '—',
                    style: GoogleFonts.dmMono(fontSize: 12, fontWeight: FontWeight.w600),
                    textAlign: TextAlign.right,
                  )),
                  SizedBox(width: 60, child: Text(
                    _fmtChangePct(e['revenueGrowth']),
                    style: GoogleFonts.dmMono(fontSize: 11, fontWeight: FontWeight.w600,
                        color: ((e['revenueGrowth'] as num?)?.toDouble() ?? 0) >= 0 ? AppColors.emerald : Colors.red[400]),
                    textAlign: TextAlign.right,
                  )),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildScoreBreakdown() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Score Breakdown', style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        ScoreBar(label: 'Momentum', score: signal.breakdown!.momentum, weight: '25%'),
        ScoreBar(label: 'Rel. Volume', score: signal.breakdown!.volume, weight: '15%'),
        ScoreBar(label: 'News Catalyst', score: signal.breakdown!.catalyst, weight: '15%'),
        ScoreBar(label: 'Fundamentals', score: signal.breakdown!.fundamental, weight: '15%'),
        ScoreBar(label: 'Sentiment', score: signal.breakdown!.sentiment, weight: '10%'),
        ScoreBar(label: 'Trend Strength', score: signal.breakdown!.trend, weight: '10%'),
        ScoreBar(label: 'Risk Filter', score: signal.breakdown!.risk, weight: '10%'),
      ],
    );
  }

  Widget _buildFactors(Map<String, dynamic> explanation) {
    final bullish = (explanation['BullishFactors'] as List?)?.cast<String>() ?? [];
    final bearish = (explanation['BearishFactors'] as List?)?.cast<String>() ?? [];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (bullish.isNotEmpty) ...[
          Text('BULLISH', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
              color: AppColors.emerald, letterSpacing: 1.5)),
          const SizedBox(height: 8),
          ...bullish.map((f) => Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(width: 3, height: 16, margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(color: AppColors.emerald.withValues(alpha: 0.4),
                      borderRadius: BorderRadius.circular(2))),
              Expanded(child: Text(f, style: TextStyle(fontSize: 12, color: Colors.grey[400]))),
            ]),
          )),
          const SizedBox(height: 12),
        ],
        if (bearish.isNotEmpty) ...[
          Text('BEARISH', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
              color: Colors.red[400], letterSpacing: 1.5)),
          const SizedBox(height: 8),
          ...bearish.map((f) => Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(width: 3, height: 16, margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.4),
                      borderRadius: BorderRadius.circular(2))),
              Expanded(child: Text(f, style: TextStyle(fontSize: 12, color: Colors.grey[400]))),
            ]),
          )),
        ],
      ],
    );
  }

  Widget _buildPeerComparison() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Peer Comparison', style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            ..._peers!.map((peer) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  SizedBox(width: 50, child: Text(peer.ticker,
                      style: GoogleFonts.dmMono(fontSize: 13, fontWeight: FontWeight.w700))),
                  Expanded(child: Text(peer.stockName,
                      style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                      maxLines: 1, overflow: TextOverflow.ellipsis)),
                  if (peer.changeDisplay != null)
                    SizedBox(width: 55, child: Text(peer.changeDisplay!,
                        style: GoogleFonts.dmMono(fontSize: 11, fontWeight: FontWeight.w600,
                            color: peer.isPositiveChange ? AppColors.emerald : Colors.red[400]),
                        textAlign: TextAlign.right)),
                  SizedBox(width: 40, child: Text('${peer.scoreTotal.round()}',
                      style: GoogleFonts.dmMono(fontSize: 13, fontWeight: FontWeight.w700),
                      textAlign: TextAlign.right)),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildValuation() {
    final s = _snapshot!;
    final currentPrice = (signal.currentPrice ?? s['price'] as num?)?.toDouble() ?? 0.0;
    final analystTarget = (s['analystTargetPrice'] as num?)?.toDouble();
    final w52High = (s['week52High'] as num?)?.toDouble();
    final w52Low = (s['week52Low'] as num?)?.toDouble();
    final peRatio = (s['peRatio'] as num?)?.toDouble()
        ?? (s['forwardPe'] as num?)?.toDouble();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.insights_rounded, size: 18, color: AppColors.emerald),
            const SizedBox(width: 8),
            Text('Valuation',
                style: GoogleFonts.sora(fontSize: 17, fontWeight: FontWeight.w700)),
          ],
        ),
        const SizedBox(height: 12),

        // Fair Value hero
        if (analystTarget != null && currentPrice > 0) ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Text('FAIR VALUE — ANALYST CONSENSUS',
                      style: TextStyle(
                          fontSize: 10,
                          color: Colors.grey[500],
                          letterSpacing: 1.2,
                          fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  Text('\$${analystTarget.toStringAsFixed(2)}',
                      style: GoogleFonts.sora(
                          fontSize: 38, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Builder(builder: (_) {
                    final upsidePct =
                        (analystTarget - currentPrice) / currentPrice * 100;
                    final positive = upsidePct >= 0;
                    return Text(
                      '${positive ? '+' : ''}${upsidePct.toStringAsFixed(1)}% vs current \$${currentPrice.toStringAsFixed(2)}',
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: positive ? AppColors.emerald : Colors.red[400]),
                    );
                  }),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Valuation Range bar
        if (w52High != null && w52Low != null && currentPrice > 0) ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: _ValuationRangeBar(
                currentPrice: currentPrice,
                target: analystTarget ?? (w52High + w52Low) / 2,
                low: w52Low,
                high: analystTarget != null
                    ? (analystTarget > w52High ? analystTarget : w52High) * 1.05
                    : w52High * 1.1,
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Sensitivity table
        if (peRatio != null && peRatio > 0) ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Sensitivity',
                      style: GoogleFonts.sora(
                          fontSize: 15, fontWeight: FontWeight.w600)),
                  Text('Implied price at different P/E multiples',
                      style:
                          TextStyle(fontSize: 11, color: Colors.grey[500])),
                  const SizedBox(height: 12),
                  Builder(builder: (_) {
                    final eps = currentPrice / peRatio;
                    final scenarios = [
                      ('Contraction', peRatio * 0.8),
                      ('Consensus', peRatio * 0.9),
                      ('Current', peRatio),
                      ('Expansion', peRatio * 1.1),
                      ('Bullish', peRatio * 1.2),
                    ];
                    return Column(
                      children: scenarios.map((sc) {
                        final impliedPrice = eps * sc.$2;
                        final returnPct =
                            (impliedPrice - currentPrice) / currentPrice * 100;
                        final isCurrent = sc.$1 == 'Current';
                        return Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 6),
                          margin: const EdgeInsets.only(bottom: 4),
                          decoration: isCurrent
                              ? BoxDecoration(
                                  color: AppColors.emerald.withValues(alpha: 0.08),
                                  borderRadius: BorderRadius.circular(6),
                                )
                              : null,
                          child: Row(
                            children: [
                              Expanded(
                                  flex: 3,
                                  child: Text(sc.$1,
                                      style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: isCurrent
                                              ? FontWeight.w700
                                              : FontWeight.w500,
                                          color: isCurrent
                                              ? AppColors.emerald
                                              : null))),
                              Expanded(
                                  flex: 2,
                                  child: Text('${sc.$2.toStringAsFixed(1)}x',
                                      style: GoogleFonts.dmMono(fontSize: 11))),
                              Expanded(
                                  flex: 3,
                                  child: Text(
                                      '\$${impliedPrice.toStringAsFixed(2)}',
                                      style: GoogleFonts.dmMono(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700),
                                      textAlign: TextAlign.right)),
                              Expanded(
                                  flex: 2,
                                  child: Text(
                                      '${returnPct >= 0 ? '+' : ''}${returnPct.toStringAsFixed(1)}%',
                                      style: GoogleFonts.dmMono(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          color: returnPct >= 0
                                              ? AppColors.emerald
                                              : Colors.red[400]),
                                      textAlign: TextAlign.right)),
                            ],
                          ),
                        );
                      }).toList(),
                    );
                  }),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildNews() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Recent News', style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            ..._news!.take(6).map((n) {
              final sentiment = (n['sentimentScore'] as num?)?.toDouble();
              final dotColor = sentiment != null
                  ? (sentiment > 0.2 ? AppColors.emerald : sentiment < -0.2 ? Colors.red[400]! : AppColors.amber)
                  : Colors.grey;
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 8, height: 8,
                      margin: const EdgeInsets.only(top: 5, right: 10),
                      decoration: BoxDecoration(shape: BoxShape.circle, color: dotColor),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            n['headline'] ?? '',
                            style: const TextStyle(fontSize: 13, height: 1.4),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Row(children: [
                            if (n['source'] != null)
                              Text(n['source'], style: TextStyle(fontSize: 10, color: Colors.grey[500])),
                            if (n['catalystType'] != null) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppColors.emerald.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(n['catalystType'],
                                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: AppColors.emerald)),
                              ),
                            ],
                          ]),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  // ─── Formatters ───

  String _fmtMarketCap(dynamic v) {
    if (v == null) return '—';
    final n = (v as num).toDouble();
    if (n >= 1e12) return '\$${(n / 1e12).toStringAsFixed(2)}T';
    if (n >= 1e9) return '\$${(n / 1e9).toStringAsFixed(1)}B';
    if (n >= 1e6) return '\$${(n / 1e6).toStringAsFixed(0)}M';
    return '\$${n.toStringAsFixed(0)}';
  }

  String _fmtRatio(dynamic v) => v != null ? (v as num).toDouble().toStringAsFixed(2) : '—';

  String _fmtPct(dynamic v) {
    if (v == null) return '—';
    final n = (v as num).toDouble() * 100;
    return '${n.toStringAsFixed(1)}%';
  }

  // ─── Athena Snowflake (5-axis 0-6 tier profile) ───
  Widget _buildSnowflake() {
    final s = _snapshot!;
    final scores = _snowflakeScores(s);
    final avg = scores.values.reduce((a, b) => a + b) / scores.length;
    final tier = avg >= 4
        ? ('Strong', AppColors.gain)
        : avg >= 2.5
            ? ('Balanced', AppColors.emerald)
            : avg >= 1.5
                ? ('Mixed', AppColors.amber)
                : ('Weak', AppColors.red);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('ATHENA SNOWFLAKE',
                  style: TextStyle(
                      fontSize: 10,
                      color: Colors.grey[500],
                      letterSpacing: 1.2,
                      fontWeight: FontWeight.w700)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: tier.$2.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(tier.$1,
                    style: TextStyle(
                        fontSize: 10,
                        color: tier.$2,
                        fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text('Five-dimensional profile · 0–6 per axis',
              style: TextStyle(fontSize: 11, color: Colors.grey[500])),
          const SizedBox(height: 16),
          SizedBox(
            height: 200,
            child: _SnowflakePainter(scores: scores, color: tier.$2),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: scores.entries.map((e) {
              final color = e.value >= 4
                  ? AppColors.gain
                  : e.value >= 2.5
                      ? AppColors.emerald
                      : e.value >= 1.5
                          ? AppColors.amber
                          : AppColors.red;
              return Column(
                children: [
                  Text(e.key.toUpperCase(),
                      style: TextStyle(
                          fontSize: 9,
                          color: Colors.grey[500],
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.8)),
                  const SizedBox(height: 4),
                  Text(e.value.toStringAsFixed(1),
                      style: GoogleFonts.dmMono(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: color)),
                ],
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Map<String, double> _snowflakeScores(Map<String, dynamic> s) {
    double value = 0;
    final pe = (s['peRatio'] ?? s['forwardPe']) as num?;
    final peg = s['pegRatio'] as num?;
    final pb = s['priceToBook'] as num?;
    if (pe != null) {
      if (pe < 12) value += 2;
      else if (pe < 20) value += 1.5;
      else if (pe < 30) value += 0.75;
    }
    if (peg != null) {
      if (peg < 1) value += 2;
      else if (peg < 1.5) value += 1.25;
      else if (peg < 2) value += 0.5;
    }
    if (pb != null) {
      if (pb < 2) value += 2;
      else if (pb < 4) value += 1;
      else if (pb < 8) value += 0.25;
    }
    value = value.clamp(0, 6).toDouble();

    double growth = 0;
    final revG = s['revenueGrowth'] as num?;
    final epsG = s['epsGrowth'] as num?;
    if (revG != null) {
      if (revG > 25) growth += 3;
      else if (revG > 10) growth += 2;
      else if (revG > 0) growth += 1;
    }
    if (epsG != null) {
      if (epsG > 25) growth += 3;
      else if (epsG > 10) growth += 2;
      else if (epsG > 0) growth += 1;
    }
    growth = growth.clamp(0, 6).toDouble();

    double past = 0;
    final pY = s['perfYear'] as num?;
    final pQ = s['perfQuarter'] as num?;
    final r52 = s['week52RangePct'] as num?;
    if (pY != null) {
      if (pY > 30) past += 3;
      else if (pY > 10) past += 2;
      else if (pY > 0) past += 1;
    }
    if (pQ != null) {
      if (pQ > 10) past += 2;
      else if (pQ > 0) past += 1;
    }
    if (r52 != null && r52 > 70) past += 1;
    past = past.clamp(0, 6).toDouble();

    double health = 0;
    final de = s['debtToEquity'] as num?;
    final om = s['operatingMargin'] as num?;
    final roe = s['returnOnEquity'] as num?;
    if (de != null) {
      if (de < 0.5) health += 2;
      else if (de < 1) health += 1.25;
      else if (de < 2) health += 0.5;
    }
    if (om != null) {
      if (om > 0.25) health += 2;
      else if (om > 0.12) health += 1.25;
      else if (om > 0) health += 0.5;
    }
    if (roe != null) {
      if (roe > 0.2) health += 2;
      else if (roe > 0.1) health += 1.25;
      else if (roe > 0) health += 0.5;
    }
    health = health.clamp(0, 6).toDouble();

    const income = 0.0; // No dividend yield on current snapshot — defaulted.

    return {
      'Value': value,
      'Growth': growth,
      'Past': past,
      'Health': health,
      'Income': income,
    };
  }

  // ─── Rewards & Risks (plain-English bullets) ───
  Widget _buildRewardsRisks() {
    final s = _snapshot!;
    final rewards = _deriveRewards(s);
    final risks = _deriveRisks(s);

    if (rewards.isEmpty && risks.isEmpty) return const SizedBox.shrink();

    return Column(
      children: [
        _ProsConsCard(
          title: 'REWARDS',
          items: rewards,
          color: AppColors.gain,
          icon: Icons.check_circle_outline,
          emptyLabel: 'No notable rewards flagged right now.',
        ),
        if (rewards.isNotEmpty && risks.isNotEmpty) const SizedBox(height: 12),
        _ProsConsCard(
          title: 'RISKS',
          items: risks,
          color: AppColors.red,
          icon: Icons.warning_amber_rounded,
          emptyLabel: 'No material risks flagged right now.',
        ),
      ],
    );
  }

  List<String> _deriveRewards(Map<String, dynamic> s) {
    final out = <String>[];
    final pe = (s['peRatio'] ?? s['forwardPe']) as num?;
    if (pe != null && pe < 15 && pe > 0) {
      out.add('Trading at ${pe.toStringAsFixed(1)}× earnings — below market average');
    }
    final peg = s['pegRatio'] as num?;
    if (peg != null && peg < 1 && peg > 0) {
      out.add('PEG ${peg.toStringAsFixed(2)} suggests growth may be undervalued');
    }
    final revG = s['revenueGrowth'] as num?;
    if (revG != null && revG > 15) {
      out.add('Revenue growing at ${revG.toStringAsFixed(1)}% — well above peers');
    }
    final epsG = s['epsGrowth'] as num?;
    if (epsG != null && epsG > 20) {
      out.add('Earnings expanding at ${epsG.toStringAsFixed(0)}% year-over-year');
    }
    final roe = s['returnOnEquity'] as num?;
    if (roe != null && roe > 0.2) {
      out.add('ROE of ${(roe * 100).toStringAsFixed(0)}% signals efficient capital use');
    }
    final om = s['operatingMargin'] as num?;
    if (om != null && om > 0.25) {
      out.add('Operating margin ${(om * 100).toStringAsFixed(0)}% — strong pricing power');
    }
    final de = s['debtToEquity'] as num?;
    if (de != null && de < 0.5) {
      out.add('Low debt (D/E ${de.toStringAsFixed(2)}) — balance sheet resilient');
    }
    final tgt = s['analystTargetPrice'] as num?;
    final px = s['price'] as num?;
    if (tgt != null && px != null && tgt > px) {
      final up = ((tgt - px) / px) * 100;
      if (up > 10) {
        out.add('Analyst target implies ${up.toStringAsFixed(0)}% upside');
      }
    }
    final pY = s['perfYear'] as num?;
    if (pY != null && pY > 25) {
      out.add('Up ${pY.toStringAsFixed(0)}% over the past year — sustained momentum');
    }
    return out.take(5).toList();
  }

  List<String> _deriveRisks(Map<String, dynamic> s) {
    final out = <String>[];
    final pe = (s['peRatio'] ?? s['forwardPe']) as num?;
    if (pe != null && pe > 40) {
      out.add('Priced at ${pe.toStringAsFixed(0)}× earnings — richly valued');
    }
    final peg = s['pegRatio'] as num?;
    if (peg != null && peg > 2.5) {
      out.add('PEG ${peg.toStringAsFixed(1)} — growth may not justify multiple');
    }
    final revG = s['revenueGrowth'] as num?;
    if (revG != null && revG < 0) {
      out.add('Revenue contracting (${revG.toStringAsFixed(1)}%)');
    }
    final epsG = s['epsGrowth'] as num?;
    if (epsG != null && epsG < 0) {
      out.add('Earnings declined ${epsG.abs().toStringAsFixed(0)}% YoY');
    }
    final de = s['debtToEquity'] as num?;
    if (de != null && de > 2) {
      out.add('Elevated leverage (D/E ${de.toStringAsFixed(1)})');
    }
    final om = s['operatingMargin'] as num?;
    if (om != null && om < 0.05 && om > -1) {
      out.add('Thin operating margin (${(om * 100).toStringAsFixed(1)}%)');
    }
    final r52 = s['week52RangePct'] as num?;
    if (r52 != null && r52 > 95) {
      out.add('Trading near 52-week high — pullback risk elevated');
    }
    final rsi = s['rsi'] as num?;
    if (rsi != null && rsi > 75) {
      out.add('RSI ${rsi.toStringAsFixed(0)} signals overbought conditions');
    }
    final beta = s['beta'] as num?;
    if (beta != null && beta > 1.5) {
      out.add('Beta ${beta.toStringAsFixed(2)} — more volatile than the market');
    }
    if (signal.riskLevel == 'HIGH') {
      out.add('Athena flags overall risk as HIGH');
    }
    return out.take(5).toList();
  }

  // ─── Ownership & Insider Activity ───
  Widget _buildOwnership() {
    final o = _ownership!;
    final instPct = (o['institutionalPercent'] as num?)?.toDouble();
    final investors = o['investorsHolding'] as int?;
    final investorsChange = (o['investorsHoldingChange'] as int?) ?? 0;
    final trades = (o['recentInsiderTrades'] as List?) ?? [];
    final buys = trades
        .where((t) => _isInsiderBuy(t['transactionType'] as String?))
        .length;
    final sells = trades.length - buys;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.apartment_outlined,
                  size: 16, color: Colors.grey[700]),
              const SizedBox(width: 6),
              Text('OWNERSHIP & INSIDERS',
                  style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey[600],
                      letterSpacing: 1.2,
                      fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _StatTile(
                    label: 'Institutional %',
                    value: instPct != null
                        ? '${instPct.toStringAsFixed(1)}%'
                        : '—'),
              ),
              Expanded(
                child: _StatTile(
                    label: 'Investors',
                    value: investors?.toString() ?? '—',
                    sub: investorsChange != 0
                        ? '${investorsChange >= 0 ? '+' : ''}$investorsChange QoQ'
                        : null,
                    subColor:
                        investorsChange >= 0 ? AppColors.gain : AppColors.red),
              ),
              Expanded(
                child: _StatTile(
                    label: 'Insider Buys / Sells',
                    value: '$buys / $sells',
                    valueColor: buys > sells
                        ? AppColors.gain
                        : (sells > buys ? AppColors.red : null)),
              ),
            ],
          ),
          if (trades.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text('RECENT INSIDER TRANSACTIONS',
                style: TextStyle(
                    fontSize: 10,
                    color: Colors.grey[500],
                    letterSpacing: 1.2,
                    fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            ...trades.take(5).map((t) => _InsiderRow(
                  map: t as Map<String, dynamic>,
                  isBuy: _isInsiderBuy(t['transactionType'] as String?),
                )),
          ],
        ],
      ),
    );
  }

  bool _isInsiderBuy(String? t) {
    if (t == null) return false;
    final u = t.toUpperCase();
    return u.contains('P-') || u.contains('PURCHASE') || u.startsWith('P');
  }

  String _fmtChangePct(dynamic v) {
    if (v == null) return '—';
    final n = (v as num).toDouble();
    return '${n >= 0 ? '+' : ''}${n.toStringAsFixed(1)}%';
  }

  String _fmtRevenue(double v) {
    if (v >= 1e9) return '\$${(v / 1e9).toStringAsFixed(1)}B';
    if (v >= 1e6) return '\$${(v / 1e6).toStringAsFixed(0)}M';
    return '\$${v.toStringAsFixed(0)}';
  }

  String _formatDate(String dateStr) {
    try {
      final d = DateTime.parse(dateStr);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return '${months[d.month - 1]} ${d.day}';
    } catch (_) {
      return dateStr;
    }
  }
}

class _TradeRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;

  const _TradeRow(this.label, this.value, {this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[500])),
          Text(value, style: GoogleFonts.dmMono(fontSize: 13, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }
}

class _SnapshotRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;

  const _SnapshotRow(this.label, this.value, {this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[500])),
          Text(value, style: GoogleFonts.dmMono(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }
}

/// Valuation range visualization: Bear / Current / Target / Bull along a gradient bar.
class _ValuationRangeBar extends StatelessWidget {
  final double currentPrice;
  final double target;
  final double low;
  final double high;

  const _ValuationRangeBar({
    required this.currentPrice,
    required this.target,
    required this.low,
    required this.high,
  });

  @override
  Widget build(BuildContext context) {
    final range = high - low;
    final currentPos = range > 0 ? ((currentPrice - low) / range).clamp(0.0, 1.0) : 0.5;
    final targetPos = range > 0 ? ((target - low) / range).clamp(0.0, 1.0) : 0.5;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('VALUATION RANGE',
            style: TextStyle(
                fontSize: 10,
                color: Colors.grey[500],
                letterSpacing: 1.2,
                fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth;
            return Stack(
              clipBehavior: Clip.none,
              children: [
                // Gradient bar
                Container(
                  height: 24,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [
                      Colors.red.withValues(alpha: 0.25),
                      Colors.amber.withValues(alpha: 0.2),
                      AppColors.emerald.withValues(alpha: 0.3),
                    ]),
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                // Current marker (dashed)
                Positioned(
                  left: (width * currentPos) - 1,
                  top: -6,
                  bottom: -6,
                  child: Container(
                    width: 2,
                    color: Colors.grey[800],
                  ),
                ),
                // Target marker (solid blue)
                Positioned(
                  left: (width * targetPos) - 2,
                  top: -2,
                  bottom: -2,
                  child: Container(
                    width: 4,
                    decoration: BoxDecoration(
                      color: AppColors.emerald,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _RangeLabel(
                label: 'BEAR',
                value: '\$${low.toStringAsFixed(0)}',
                color: Colors.red[400]!),
            _RangeLabel(
                label: 'NOW',
                value: '\$${currentPrice.toStringAsFixed(2)}',
                color: Colors.grey[700]!),
            _RangeLabel(
                label: 'TARGET',
                value: '\$${target.toStringAsFixed(0)}',
                color: AppColors.emerald),
            _RangeLabel(
                label: 'BULL',
                value: '\$${high.toStringAsFixed(0)}',
                color: AppColors.emerald),
          ],
        ),
      ],
    );
  }
}

class _RangeLabel extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _RangeLabel({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(label,
            style: TextStyle(
                fontSize: 9,
                color: color,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.0)),
        const SizedBox(height: 2),
        Text(value,
            style: GoogleFonts.dmMono(fontSize: 11, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

/// 5-axis pentagon radar painter for the Athena Snowflake.
class _SnowflakePainter extends StatelessWidget {
  final Map<String, double> scores;
  final Color color;
  const _SnowflakePainter({required this.scores, required this.color});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size.fromHeight(200),
      painter: _SnowflakeCustomPainter(
        scores: scores.values.toList(),
        labels: scores.keys.toList(),
        color: color,
      ),
    );
  }
}

class _SnowflakeCustomPainter extends CustomPainter {
  final List<double> scores;
  final List<String> labels;
  final Color color;

  _SnowflakeCustomPainter({
    required this.scores,
    required this.labels,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.shortestSide / 2) * 0.78;
    final n = scores.length;
    final angleStep = (2 * 3.14159265) / n;
    const startAngle = -3.14159265 / 2; // start at top

    final gridPaint = Paint()
      ..style = PaintingStyle.stroke
      ..color = Colors.grey.withValues(alpha: 0.25)
      ..strokeWidth = 1;

    // Background rings at 2, 4, 6
    for (final frac in [1.0 / 3, 2.0 / 3, 1.0]) {
      final path = Path();
      for (var i = 0; i < n; i++) {
        final a = startAngle + angleStep * i;
        final p = Offset(
          center.dx + radius * frac * _cos(a),
          center.dy + radius * frac * _sin(a),
        );
        if (i == 0) {
          path.moveTo(p.dx, p.dy);
        } else {
          path.lineTo(p.dx, p.dy);
        }
      }
      path.close();
      canvas.drawPath(path, gridPaint);
    }

    // Radial spokes
    for (var i = 0; i < n; i++) {
      final a = startAngle + angleStep * i;
      canvas.drawLine(
        center,
        Offset(center.dx + radius * _cos(a), center.dy + radius * _sin(a)),
        gridPaint,
      );
    }

    // Data polygon (scale 0-6)
    final dataPath = Path();
    for (var i = 0; i < n; i++) {
      final a = startAngle + angleStep * i;
      final r = (scores[i] / 6.0).clamp(0.0, 1.0) * radius;
      final p = Offset(center.dx + r * _cos(a), center.dy + r * _sin(a));
      if (i == 0) {
        dataPath.moveTo(p.dx, p.dy);
      } else {
        dataPath.lineTo(p.dx, p.dy);
      }
    }
    dataPath.close();

    canvas.drawPath(
      dataPath,
      Paint()
        ..style = PaintingStyle.fill
        ..color = color.withValues(alpha: 0.28),
    );
    canvas.drawPath(
      dataPath,
      Paint()
        ..style = PaintingStyle.stroke
        ..color = color
        ..strokeWidth = 2,
    );

    // Dots at data points
    for (var i = 0; i < n; i++) {
      final a = startAngle + angleStep * i;
      final r = (scores[i] / 6.0).clamp(0.0, 1.0) * radius;
      final p = Offset(center.dx + r * _cos(a), center.dy + r * _sin(a));
      canvas.drawCircle(p, 3, Paint()..color = color);
    }

    // Axis labels
    for (var i = 0; i < n; i++) {
      final a = startAngle + angleStep * i;
      final labelR = radius + 14;
      final p =
          Offset(center.dx + labelR * _cos(a), center.dy + labelR * _sin(a));
      final tp = TextPainter(
        text: TextSpan(
          text: labels[i],
          style: const TextStyle(
              fontSize: 11, fontWeight: FontWeight.w600, color: Colors.black87),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, Offset(p.dx - tp.width / 2, p.dy - tp.height / 2));
    }
  }

  @override
  bool shouldRepaint(covariant _SnowflakeCustomPainter old) =>
      old.scores != scores || old.color != color;

  double _cos(double a) => math.cos(a);
  double _sin(double a) => math.sin(a);
}

/// Rewards / Risks card.
class _ProsConsCard extends StatelessWidget {
  final String title;
  final List<String> items;
  final Color color;
  final IconData icon;
  final String emptyLabel;

  const _ProsConsCard({
    required this.title,
    required this.items,
    required this.color,
    required this.icon,
    required this.emptyLabel,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.22)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 6),
              Text(title,
                  style: TextStyle(
                      fontSize: 11,
                      color: color,
                      letterSpacing: 1.2,
                      fontWeight: FontWeight.w800)),
              const Spacer(),
              Text('${items.length} signal${items.length == 1 ? '' : 's'}',
                  style: TextStyle(fontSize: 10, color: color.withValues(alpha: 0.8))),
            ],
          ),
          const SizedBox(height: 10),
          if (items.isEmpty)
            Text(emptyLabel,
                style: TextStyle(fontSize: 12, color: Colors.grey[600]))
          else
            ...items.map((t) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        margin: const EdgeInsets.only(top: 6),
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                            color: color, shape: BoxShape.circle),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(t,
                            style: const TextStyle(
                                fontSize: 13, height: 1.4)),
                      ),
                    ],
                  ),
                )),
        ],
      ),
    );
  }
}

/// Stat tile inside the Ownership card.
class _StatTile extends StatelessWidget {
  final String label;
  final String value;
  final String? sub;
  final Color? subColor;
  final Color? valueColor;
  const _StatTile({
    required this.label,
    required this.value,
    this.sub,
    this.subColor,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(),
            style: TextStyle(
                fontSize: 9,
                color: Colors.grey[500],
                letterSpacing: 1.0,
                fontWeight: FontWeight.w700)),
        const SizedBox(height: 4),
        Text(value,
            style: GoogleFonts.dmMono(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: valueColor)),
        if (sub != null) ...[
          const SizedBox(height: 2),
          Text(sub!,
              style: TextStyle(
                  fontSize: 9,
                  color: subColor ?? Colors.grey[500],
                  fontWeight: FontWeight.w600)),
        ],
      ],
    );
  }
}

/// A single insider transaction row (inside the Ownership card).
class _InsiderRow extends StatelessWidget {
  final Map<String, dynamic> map;
  final bool isBuy;
  const _InsiderRow({required this.map, required this.isBuy});

  @override
  Widget build(BuildContext context) {
    final name = map['reportingName'] as String? ?? '—';
    final role = map['relationship'] as String? ?? '';
    final shares = (map['sharesTraded'] as num?) ?? 0;
    final value = (map['totalValue'] as num?) ?? 0;
    final date = map['transactionDate'] as String?;
    final color = isBuy ? AppColors.gain : AppColors.red;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(isBuy ? 'BUY' : 'SELL',
                style: TextStyle(
                    fontSize: 9,
                    color: color,
                    fontWeight: FontWeight.w800)),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                if (role.isNotEmpty)
                  Text(role,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 10, color: Colors.grey[600])),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(_fmtMoney(value.toDouble()),
                  style: GoogleFonts.dmMono(
                      fontSize: 12, fontWeight: FontWeight.w700)),
              Text(
                  '${_fmtShares(shares.toDouble())}${date != null ? ' · ${_fmtShortDate(date)}' : ''}',
                  style: TextStyle(fontSize: 9, color: Colors.grey[600])),
            ],
          ),
        ],
      ),
    );
  }

  String _fmtMoney(double v) {
    final abs = v.abs();
    if (abs >= 1e9) return '\$${(v / 1e9).toStringAsFixed(2)}B';
    if (abs >= 1e6) return '\$${(v / 1e6).toStringAsFixed(2)}M';
    if (abs >= 1e3) return '\$${(v / 1e3).toStringAsFixed(0)}K';
    return '\$${v.toStringAsFixed(0)}';
  }

  String _fmtShares(double v) {
    final abs = v.abs();
    if (abs >= 1e6) return '${(v / 1e6).toStringAsFixed(2)}M sh';
    if (abs >= 1e3) return '${(v / 1e3).toStringAsFixed(1)}K sh';
    return '${v.toStringAsFixed(0)} sh';
  }

  String _fmtShortDate(String iso) {
    try {
      final d = DateTime.parse(iso);
      const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return '${m[d.month - 1]} ${d.day}';
    } catch (_) {
      return '';
    }
  }
}
