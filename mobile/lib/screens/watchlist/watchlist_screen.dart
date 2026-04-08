import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';
import '../../models/signal.dart';
import '../../widgets/signal_card.dart';

class WatchlistScreen extends StatelessWidget {
  final List<Signal> watchlistSignals;
  final void Function(Signal) onSignalTap;

  const WatchlistScreen({
    super.key,
    required this.watchlistSignals,
    required this.onSignalTap,
  });

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          floating: true,
          title: Text('Watchlist',
              style: GoogleFonts.sora(fontWeight: FontWeight.w700)),
          actions: [
            IconButton(
              icon: const Icon(Icons.add_rounded),
              onPressed: () {},
            ),
          ],
        ),
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              Text(
                '${watchlistSignals.length} stocks tracked',
                style: TextStyle(color: Colors.grey[500], fontSize: 14),
              ),
              const SizedBox(height: 16),
              ...watchlistSignals.map((s) => SignalCard(
                    signal: s,
                    onTap: () => onSignalTap(s),
                  )),
              if (watchlistSignals.isEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 80),
                  child: Column(
                    children: [
                      Icon(Icons.star_border_rounded,
                          size: 48, color: Colors.grey[600]),
                      const SizedBox(height: 16),
                      Text('No stocks in your watchlist yet.',
                          style: TextStyle(color: Colors.grey[500])),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () {},
                        child: const Text('Browse picks',
                            style: TextStyle(color: AppColors.emerald)),
                      ),
                    ],
                  ),
                ),
            ]),
          ),
        ),
      ],
    );
  }
}
