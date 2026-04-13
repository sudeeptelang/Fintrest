import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';
import '../../core/network/api_service.dart';
import '../../core/network/api_client.dart';

class MarketsScreen extends StatefulWidget {
  const MarketsScreen({super.key});

  @override
  State<MarketsScreen> createState() => _MarketsScreenState();
}

class _MarketsScreenState extends State<MarketsScreen> {
  late final ApiService _api;
  List<Map<String, dynamic>> _indices = [];
  List<Map<String, dynamic>> _sectors = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _api = ApiService(ApiClient());
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final indices = await _api.getMarketIndices();
      final sectors = await _api.getMarketSectors();
      if (mounted) {
        setState(() {
          _indices = indices;
          _sectors = sectors;
          _loading = false;
        });
      }
    } catch (e) {
      debugPrint('Markets load error: $e');
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
            title: Text('Markets', style: GoogleFonts.sora(fontWeight: FontWeight.w700)),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh_rounded),
                onPressed: () {
                  setState(() { _loading = true; _error = null; });
                  _loadData();
                },
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
                _loadData();
              }),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // Major indices
                  Text(
                    'Major Indices',
                    style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),
                  ..._buildIndexCards(),
                  const SizedBox(height: 24),

                  // Sector performance
                  Row(
                    children: [
                      Text(
                        'Sector Performance',
                        style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Today',
                        style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (_sectors.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      child: Center(
                        child: Text('Sector data unavailable',
                            style: TextStyle(color: Colors.grey[500])),
                      ),
                    )
                  else
                    ..._sectors.map((s) => _SectorRow(sector: s)),
                ]),
              ),
            ),
        ],
      ),
    );
  }

  List<Widget> _buildIndexCards() {
    // Ensure we show at least the key 4 indices even when API has more/less
    final keyed = {for (final i in _indices) i['symbol']?.toString() ?? '': i};
    final ordered = ['SPY', 'QQQ', 'DIA', 'IWM'];
    final display = _indices.isEmpty
        ? ordered.map((s) => {'symbol': s, 'price': null, 'changePercent': null}).toList()
        : (ordered.map((s) => keyed[s] ?? keyed.values.firstWhere(
                (i) => i['symbol'] == s,
                orElse: () => {'symbol': s})).toList()
            ..addAll(_indices.where((i) => !ordered.contains(i['symbol']?.toString()))));

    return [
      GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: display.length.clamp(0, 6),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1.8,
        ),
        itemBuilder: (context, i) => _IndexCard(index: display[i]),
      ),
    ];
  }
}

// ─── Index Card ────────────────────────────────────────────────────────────────

class _IndexCard extends StatelessWidget {
  final Map<String, dynamic> index;
  const _IndexCard({required this.index});

  @override
  Widget build(BuildContext context) {
    final symbol = index['symbol']?.toString() ?? '—';
    final name = index['name']?.toString() ?? _defaultName(symbol);
    final price = (index['price'] as num?)?.toDouble();
    final change = (index['changePercent'] ?? index['changesPercentage'] as num?)?.toDouble();
    final isPos = (change ?? 0) >= 0;
    final color = isPos ? AppColors.emerald : AppColors.red;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.navyLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                symbol,
                style: GoogleFonts.sora(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  change != null ? '${isPos ? '+' : ''}${change.toStringAsFixed(2)}%' : '—',
                  style: GoogleFonts.dmMono(fontSize: 11, color: color, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                price != null ? '\$${price.toStringAsFixed(2)}' : '—',
                style: GoogleFonts.dmMono(fontSize: 16, color: Colors.white, fontWeight: FontWeight.w600),
              ),
              Text(
                name,
                style: TextStyle(fontSize: 10, color: Colors.grey[500]),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _defaultName(String symbol) {
    return const {
      'SPY': 'S&P 500 ETF',
      'QQQ': 'Nasdaq-100 ETF',
      'DIA': 'Dow Jones ETF',
      'IWM': 'Russell 2000 ETF',
      'VIX': 'Volatility Index',
    }[symbol] ?? symbol;
  }
}

// ─── Sector Row ────────────────────────────────────────────────────────────────

class _SectorRow extends StatelessWidget {
  final Map<String, dynamic> sector;
  const _SectorRow({required this.sector});

  @override
  Widget build(BuildContext context) {
    final name = sector['sector']?.toString() ?? sector['name']?.toString() ?? '—';
    final change = (sector['changesPercentage'] ?? sector['changePercent'] as num?)?.toDouble() ?? 0;
    final isPos = change >= 0;
    final color = isPos ? AppColors.emerald : AppColors.red;

    // Normalise to a 0–1 bar fill. Treat ±5% as max.
    final fill = ((change.abs() / 5.0).clamp(0.0, 1.0));

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.navyLight,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  name,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text(
                '${isPos ? '+' : ''}${change.toStringAsFixed(2)}%',
                style: GoogleFonts.dmMono(
                    fontSize: 13, fontWeight: FontWeight.w600, color: color),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: Stack(
              children: [
                Container(height: 4, color: Colors.white.withValues(alpha: 0.07)),
                FractionallySizedBox(
                  widthFactor: fill,
                  child: Container(
                    height: 4,
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
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
