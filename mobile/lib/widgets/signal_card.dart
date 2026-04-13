import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme/app_theme.dart';
import '../models/signal.dart';
import 'stock_logo.dart';

class SignalCard extends StatelessWidget {
  final Signal signal;
  final VoidCallback? onTap;

  const SignalCard({super.key, required this.signal, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Card(
        margin: const EdgeInsets.only(bottom: 10),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              // Top row: ticker + signal badge + score
              Row(
                children: [
                  StockLogo(ticker: signal.ticker, size: 44),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              signal.ticker,
                              style: GoogleFonts.dmMono(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            if (signal.priceDisplay != null) ...[
                              const SizedBox(width: 8),
                              Text(
                                signal.priceDisplay!,
                                style: GoogleFonts.dmMono(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                            if (signal.changeDisplay != null) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                decoration: BoxDecoration(
                                  color: signal.isPositiveChange
                                      ? AppColors.emerald.withValues(alpha: 0.1)
                                      : Colors.red.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  signal.changeDisplay!,
                                  style: GoogleFonts.dmMono(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: signal.isPositiveChange
                                        ? AppColors.emerald
                                        : Colors.red[400],
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                signal.stockName,
                                style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Text(
                              signal.horizonCategory,
                              style: TextStyle(
                                fontSize: 10,
                                color: Colors.grey[600],
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: signal.isBuy
                          ? AppColors.emerald.withValues(alpha: 0.1)
                          : AppColors.amber.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      signal.signalTypeDisplay,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: signal.isBuy ? AppColors.emerald : AppColors.amber,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    children: [
                      Text(
                        signal.scoreTotal.round().toString(),
                        style: GoogleFonts.dmMono(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        'score',
                        style: TextStyle(fontSize: 10, color: Colors.grey[500]),
                      ),
                    ],
                  ),
                ],
              ),
              // Trade zone row (only if we have entry/target/stop)
              if (signal.entryRange != null ||
                  signal.targetRange != null ||
                  signal.stopDisplay != null) ...[
                const SizedBox(height: 10),
                const Divider(height: 1),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _TradeZoneItem(
                      label: 'Entry',
                      value: signal.entryRange ?? '—',
                    ),
                    _TradeZoneItem(
                      label: 'Target',
                      value: signal.targetRange ?? '—',
                      color: AppColors.emerald,
                    ),
                    _TradeZoneItem(
                      label: 'Stop',
                      value: signal.stopDisplay ?? '—',
                      color: Colors.red[400],
                    ),
                    if (signal.riskLevel != null)
                      _TradeZoneItem(
                        label: 'Risk',
                        value: signal.riskLevel!,
                        color: signal.riskLevel == 'LOW'
                            ? AppColors.emerald
                            : signal.riskLevel == 'HIGH'
                                ? Colors.red[400]
                                : AppColors.amber,
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _TradeZoneItem extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;

  const _TradeZoneItem({
    required this.label,
    required this.value,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(fontSize: 10, color: Colors.grey[500]),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.dmMono(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ],
    );
  }
}
