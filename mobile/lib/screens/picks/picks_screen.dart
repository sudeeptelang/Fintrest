import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/signal.dart';
import '../../widgets/signal_card.dart';

class PicksScreen extends StatelessWidget {
  final List<Signal> signals;
  final void Function(Signal) onSignalTap;

  const PicksScreen({
    super.key,
    required this.signals,
    required this.onSignalTap,
  });

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          floating: true,
          title: Text('Top Picks',
              style: GoogleFonts.sora(fontWeight: FontWeight.w700)),
          actions: [
            IconButton(
              icon: const Icon(Icons.filter_list_rounded),
              onPressed: () {},
            ),
          ],
        ),
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              Text(
                "Today's highest-ranked signals, scored 0–100.",
                style: TextStyle(color: Colors.grey[500], fontSize: 14),
              ),
              const SizedBox(height: 16),
              ...signals.map((s) => SignalCard(
                    signal: s,
                    onTap: () => onSignalTap(s),
                  )),
              if (signals.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 60),
                  child: Center(
                    child: Text('No signals available yet.',
                        style: TextStyle(color: Colors.grey)),
                  ),
                ),
            ]),
          ),
        ),
      ],
    );
  }
}
