import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';
import '../../models/signal.dart';
import '../../widgets/score_bar.dart';

class StockDetailScreen extends StatelessWidget {
  final Signal signal;

  const StockDetailScreen({super.key, required this.signal});

  @override
  Widget build(BuildContext context) {
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
            // Header
            Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: AppColors.emerald.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Center(
                    child: Text(
                      signal.ticker.substring(0, 2),
                      style: GoogleFonts.dmMono(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.emerald,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(signal.ticker,
                              style: GoogleFonts.sora(
                                  fontSize: 20, fontWeight: FontWeight.w700)),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: signal.isBuy
                                  ? AppColors.emerald.withValues(alpha: 0.1)
                                  : AppColors.amber.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              signal.signalTypeDisplay,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: signal.isBuy
                                    ? AppColors.emerald
                                    : AppColors.amber,
                              ),
                            ),
                          ),
                        ],
                      ),
                      Text(signal.stockName,
                          style: TextStyle(
                              fontSize: 13, color: Colors.grey[500])),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Score + Trade zone cards
            Row(
              children: [
                Expanded(
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Signal Score',
                              style: TextStyle(
                                  fontSize: 12, color: Colors.grey[500])),
                          const SizedBox(height: 8),
                          Text(
                            signal.scoreTotal.round().toString(),
                            style: GoogleFonts.sora(
                                fontSize: 32, fontWeight: FontWeight.w800),
                          ),
                          Text('/ 100',
                              style: TextStyle(
                                  fontSize: 12, color: Colors.grey[500])),
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
                          Text('Trade Zone',
                              style: TextStyle(
                                  fontSize: 12, color: Colors.grey[500])),
                          const SizedBox(height: 8),
                          _TradeRow('Entry',
                              '\$${signal.entryPrice?.toStringAsFixed(0) ?? '—'}'),
                          _TradeRow('Target',
                              '\$${signal.targetPrice?.toStringAsFixed(0) ?? '—'}',
                              color: AppColors.emerald),
                          _TradeRow('Stop',
                              '\$${signal.stopPrice?.toStringAsFixed(0) ?? '—'}',
                              color: AppColors.red),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Chart placeholder
            Card(
              child: Container(
                height: 200,
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                child: Center(
                  child: Text('Chart coming soon',
                      style: TextStyle(color: Colors.grey[500])),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Score breakdown
            if (signal.breakdown != null) ...[
              Text('Score Breakdown',
                  style:
                      GoogleFonts.sora(fontSize: 18, fontWeight: FontWeight.w600)),
              const SizedBox(height: 16),
              ScoreBar(
                  label: 'Momentum',
                  score: signal.breakdown!.momentum,
                  weight: '25%'),
              ScoreBar(
                  label: 'Rel. Volume',
                  score: signal.breakdown!.volume,
                  weight: '15%'),
              ScoreBar(
                  label: 'News Catalyst',
                  score: signal.breakdown!.catalyst,
                  weight: '15%'),
              ScoreBar(
                  label: 'Fundamentals',
                  score: signal.breakdown!.fundamental,
                  weight: '15%'),
              ScoreBar(
                  label: 'Sentiment',
                  score: signal.breakdown!.sentiment,
                  weight: '10%'),
              ScoreBar(
                  label: 'Trend Strength',
                  score: signal.breakdown!.trend,
                  weight: '10%'),
              ScoreBar(
                  label: 'Risk Filter',
                  score: signal.breakdown!.risk,
                  weight: '10%'),
            ],
          ],
        ),
      ),
    );
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
          Text(label,
              style: TextStyle(fontSize: 12, color: Colors.grey[500])),
          Text(value,
              style: GoogleFonts.dmMono(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: color,
              )),
        ],
      ),
    );
  }
}
