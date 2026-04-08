import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';
import '../../models/signal.dart';
import '../../widgets/signal_card.dart';

class HomeScreen extends StatelessWidget {
  final List<Signal> topSignals;
  final void Function(Signal) onSignalTap;

  const HomeScreen({
    super.key,
    required this.topSignals,
    required this.onSignalTap,
  });

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          floating: true,
          title: Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: 'Fintrest',
                  style: GoogleFonts.sora(fontSize: 20, fontWeight: FontWeight.w700),
                ),
                TextSpan(
                  text: '.ai',
                  style: GoogleFonts.sora(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: AppColors.emerald),
                ),
              ],
            ),
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.notifications_outlined),
              onPressed: () {},
            ),
          ],
        ),
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              // Greeting
              Text('Good morning',
                  style: GoogleFonts.sora(
                      fontSize: 24, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text("Here's your market overview for today.",
                  style: TextStyle(color: Colors.grey[500], fontSize: 14)),
              const SizedBox(height: 24),

              // Summary cards
              Row(
                children: [
                  _SummaryCard(
                    title: 'Top Signal',
                    value: topSignals.isNotEmpty ? topSignals.first.ticker : '—',
                    subtitle: topSignals.isNotEmpty
                        ? 'Score: ${topSignals.first.scoreTotal.round()}'
                        : 'No signals',
                    color: AppColors.emerald,
                  ),
                  const SizedBox(width: 12),
                  _SummaryCard(
                    title: 'Active Signals',
                    value: topSignals.length.toString(),
                    subtitle: '${topSignals.where((s) => s.isBuy).length} buy signals',
                    color: AppColors.emeraldLight,
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Today's signals
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text("Today's Signals",
                      style: GoogleFonts.sora(
                          fontSize: 18, fontWeight: FontWeight.w600)),
                  TextButton(
                    onPressed: () {},
                    child: const Text('View all',
                        style: TextStyle(color: AppColors.emerald)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ...topSignals.take(5).map((s) => SignalCard(
                    signal: s,
                    onTap: () => onSignalTap(s),
                  )),
            ]),
          ),
        ),
      ],
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final Color color;

  const _SummaryCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: TextStyle(fontSize: 12, color: Colors.grey[500])),
              const SizedBox(height: 8),
              Text(value,
                  style: GoogleFonts.sora(
                      fontSize: 22, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text(subtitle,
                  style: TextStyle(fontSize: 12, color: color)),
            ],
          ),
        ),
      ),
    );
  }
}
