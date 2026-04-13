import 'dart:convert';
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
      ]);

      final snapshot = results[0] as Map<String, dynamic>;
      final analyst = results[1] as Map<String, dynamic>;
      final earnings = results[2] as List<Map<String, dynamic>>;
      final allSignals = results[3] as List<Signal>;
      final newsItems = results[4] as List<Map<String, dynamic>>;

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
          colors: [Color(0xFF0d1a2e), Color(0xFF172640)],
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
