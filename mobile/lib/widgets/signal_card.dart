import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme/app_theme.dart';
import '../models/signal.dart';

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
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.emerald.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        signal.ticker.length >= 2
                            ? signal.ticker.substring(0, 2)
                            : signal.ticker,
                        style: GoogleFonts.dmMono(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.emerald,
                        ),
                      ),
                    ),
                  ),
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
                                  color: Colors.grey[400],
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          signal.stockName,
                          style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
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
