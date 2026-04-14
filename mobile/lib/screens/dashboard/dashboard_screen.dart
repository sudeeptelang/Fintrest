import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';
import '../../core/network/api_service.dart';
import '../../core/network/api_client.dart';
import '../../models/signal.dart';

class DashboardScreen extends StatefulWidget {
  final void Function(Signal) onSignalTap;

  const DashboardScreen({super.key, required this.onSignalTap});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late final ApiService _api;

  List<Map<String, dynamic>> _indices = [];
  List<Signal> _topPicks = [];
  List<Map<String, dynamic>> _trending = [];
  List<Map<String, dynamic>> _mostActive = [];
  List<Map<String, dynamic>> _news = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _api = ApiService(ApiClient());
    _loadAll();
  }

  Future<void> _loadAll() async {
    try {
      final results = await Future.wait([
        _api.getMarketIndices(),
        _api.getTopPicks(limit: 5),
        _api.getTrending(limit: 8),
        _api.getMostActive(limit: 8),
        _api.getMarketNews(limit: 8),
      ]);
      if (mounted) {
        setState(() {
          _indices = results[0] as List<Map<String, dynamic>>;
          _topPicks = results[1] as List<Signal>;
          _trending = results[2] as List<Map<String, dynamic>>;
          _mostActive = results[3] as List<Map<String, dynamic>>;
          _news = results[4] as List<Map<String, dynamic>>;
          _loading = false;
        });
      }
    } catch (e) {
      debugPrint('Dashboard load error: $e');
      if (mounted) setState(() { _loading = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            floating: true,
            title: Text.rich(
              TextSpan(children: [
                TextSpan(
                  text: 'Fintrest',
                  style: GoogleFonts.sora(fontSize: 20, fontWeight: FontWeight.w700),
                ),
                TextSpan(
                  text: '.ai',
                  style: GoogleFonts.sora(
                      fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.emerald),
                ),
              ]),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined),
                onPressed: () {},
              ),
            ],
          ),
          if (_loading)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator(color: AppColors.emerald)),
            )
          else if (_error != null)
            SliverFillRemaining(
              child: _ErrorState(onRetry: () {
                setState(() { _loading = true; _error = null; });
                _loadAll();
              }),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // Market indices strip
                  _IndicesStrip(indices: _indices),
                  const SizedBox(height: 20),

                  // Athena top picks in navy card
                  _AthenaPicks(picks: _topPicks, onSignalTap: widget.onSignalTap),
                  const SizedBox(height: 20),

                  // Trending stocks
                  _SectionHeader(title: 'Trending Stocks', icon: Icons.trending_up_rounded),
                  const SizedBox(height: 10),
                  _StockGrid(stocks: _trending),
                  const SizedBox(height: 20),

                  // Most active
                  _SectionHeader(title: 'Most Active', icon: Icons.bar_chart_rounded),
                  const SizedBox(height: 10),
                  _StockGrid(stocks: _mostActive),
                  const SizedBox(height: 20),

                  // News
                  _SectionHeader(title: 'Market News', icon: Icons.article_outlined),
                  const SizedBox(height: 10),
                  ..._news.map((n) => _NewsCard(item: n)),
                ]),
              ),
            ),
        ],
      ),
    );
  }
}

// ─── Market Indices Strip ──────────────────────────────────────────────────────

class _IndicesStrip extends StatelessWidget {
  final List<Map<String, dynamic>> indices;
  const _IndicesStrip({required this.indices});

  @override
  Widget build(BuildContext context) {
    final displayIndices = indices.isNotEmpty
        ? indices
        : [
            {'symbol': 'SPY', 'price': 0.0, 'changePercent': 0.0},
            {'symbol': 'QQQ', 'price': 0.0, 'changePercent': 0.0},
            {'symbol': 'DIA', 'price': 0.0, 'changePercent': 0.0},
            {'symbol': 'IWM', 'price': 0.0, 'changePercent': 0.0},
          ];

    return SizedBox(
      height: 76,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: displayIndices.length,
        separatorBuilder: (_, i) => const SizedBox(width: 10),
        itemBuilder: (context, i) {
          final idx = displayIndices[i];
          final change = (idx['changePercent'] as num?)?.toDouble() ?? 0;
          final isPos = change >= 0;
          final color = isPos ? AppColors.emerald : AppColors.red;
          return Container(
            width: 100,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.navyLight,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  idx['symbol']?.toString() ?? '—',
                  style: GoogleFonts.sora(
                      fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
                ),
                Text(
                  idx['price'] != null
                      ? '\$${(idx['price'] as num).toStringAsFixed(2)}'
                      : '—',
                  style: GoogleFonts.dmMono(fontSize: 13, color: Colors.white),
                ),
                Text(
                  '${isPos ? '+' : ''}${change.toStringAsFixed(2)}%',
                  style: GoogleFonts.dmMono(fontSize: 11, color: color, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ─── Athena Top Picks Card ─────────────────────────────────────────────────────

class _AthenaPicks extends StatelessWidget {
  final List<Signal> picks;
  final void Function(Signal) onSignalTap;
  const _AthenaPicks({required this.picks, required this.onSignalTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E1B4B), Color(0xFF2D2A6B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.emerald.withValues(alpha: 0.25)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: AppColors.emerald.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.auto_awesome, color: AppColors.emerald, size: 16),
                ),
                const SizedBox(width: 10),
                Text(
                  "Athena's Top Picks Today",
                  style: GoogleFonts.sora(
                      fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Educational signals only — not financial advice',
              style: TextStyle(fontSize: 10, color: Colors.white.withValues(alpha: 0.45)),
            ),
            const SizedBox(height: 14),
            if (picks.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Center(
                  child: Text(
                    'No signals available today.',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 13),
                  ),
                ),
              )
            else
              ...picks.take(5).map((s) => _AthenaPickRow(signal: s, onTap: () => onSignalTap(s))),
          ],
        ),
      ),
    );
  }
}

class _AthenaPickRow extends StatelessWidget {
  final Signal signal;
  final VoidCallback onTap;
  const _AthenaPickRow({required this.signal, required this.onTap});

  Color _badgeColor() => switch (signal.signalType) {
        'BUY_TODAY' => AppColors.emerald,
        'AVOID' => AppColors.red,
        'HIGH_RISK' => AppColors.amber,
        _ => AppColors.grey500,
      };

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 7),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: Text(
                  signal.ticker.length > 3 ? signal.ticker.substring(0, 3) : signal.ticker,
                  style: GoogleFonts.sora(
                      fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    signal.ticker,
                    style: GoogleFonts.dmMono(
                        fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                  Text(
                    signal.stockName,
                    style: TextStyle(fontSize: 11, color: Colors.white.withValues(alpha: 0.5)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: _badgeColor().withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: _badgeColor().withValues(alpha: 0.5)),
                  ),
                  child: Text(
                    signal.signalTypeDisplay,
                    style: TextStyle(
                        fontSize: 9, fontWeight: FontWeight.w700, color: _badgeColor()),
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  'Score ${signal.scoreTotal.round()}',
                  style: GoogleFonts.dmMono(
                      fontSize: 11, color: Colors.white.withValues(alpha: 0.6)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Section Header ────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;
  const _SectionHeader({required this.title, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.emerald),
        const SizedBox(width: 8),
        Text(
          title,
          style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700),
        ),
      ],
    );
  }
}

// ─── Stock Grid (Trending / Most Active) ──────────────────────────────────────

class _StockGrid extends StatelessWidget {
  final List<Map<String, dynamic>> stocks;
  const _StockGrid({required this.stocks});

  @override
  Widget build(BuildContext context) {
    if (stocks.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Text('No data', style: TextStyle(color: Colors.grey[500])),
        ),
      );
    }
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: stocks.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 2.2,
      ),
      itemBuilder: (context, i) {
        final s = stocks[i];
        final change = (s['changePercent'] ?? s['changesPercentage'] as num?)?.toDouble() ?? 0;
        final isPos = change >= 0;
        final color = isPos ? AppColors.emerald : AppColors.red;
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.navyLight,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                s['symbol']?.toString() ?? s['ticker']?.toString() ?? '—',
                style: GoogleFonts.dmMono(
                    fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
              ),
              const SizedBox(height: 2),
              Text(
                s['name']?.toString() ?? s['companyName']?.toString() ?? '',
                style: TextStyle(fontSize: 10, color: Colors.grey[500]),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                '${isPos ? '+' : ''}${change.toStringAsFixed(2)}%',
                style: GoogleFonts.dmMono(
                    fontSize: 12, fontWeight: FontWeight.w600, color: color),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ─── News Card ─────────────────────────────────────────────────────────────────

class _NewsCard extends StatelessWidget {
  final Map<String, dynamic> item;
  const _NewsCard({required this.item});

  Color _sentimentColor() {
    final s = (item['sentiment'] ?? item['overallSentimentLabel'])?.toString().toLowerCase();
    if (s == 'positive' || s == 'bullish') return AppColors.emerald;
    if (s == 'negative' || s == 'bearish') return AppColors.red;
    return AppColors.amber;
  }

  @override
  Widget build(BuildContext context) {
    final headline = item['headline']?.toString() ?? item['title']?.toString() ?? '';
    final source = item['source']?.toString() ?? '';
    final pub = item['datetime'] != null
        ? _formatTime(item['datetime'])
        : item['publishedDate']?.toString() ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.navyLight,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 8,
            height: 8,
            margin: const EdgeInsets.only(top: 5),
            decoration: BoxDecoration(
              color: _sentimentColor(),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  headline,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(source, style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                    const SizedBox(width: 8),
                    Text('·', style: TextStyle(color: Colors.grey[500])),
                    const SizedBox(width: 8),
                    Text(pub, style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(dynamic raw) {
    try {
      final dt = raw is int
          ? DateTime.fromMillisecondsSinceEpoch(raw * 1000)
          : DateTime.parse(raw.toString());
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      return '${diff.inDays}d ago';
    } catch (_) {
      return raw.toString();
    }
  }
}

// ─── Error State ───────────────────────────────────────────────────────────────

class _ErrorState extends StatelessWidget {
  final VoidCallback onRetry;
  const _ErrorState({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.wifi_off_rounded, size: 48, color: Colors.grey[600]),
          const SizedBox(height: 16),
          Text('Unable to load market data', style: TextStyle(color: Colors.grey[500])),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}
