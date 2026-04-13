import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';
import '../../core/network/api_service.dart';
import '../../core/network/api_client.dart';

class PortfolioScreen extends StatefulWidget {
  const PortfolioScreen({super.key});

  @override
  State<PortfolioScreen> createState() => _PortfolioScreenState();
}

class _PortfolioScreenState extends State<PortfolioScreen> {
  late final ApiService _api;
  List<Map<String, dynamic>> _portfolios = [];
  bool _loading = true;
  String? _error;
  int? _expandedId;

  // Cached holdings per portfolio id
  final Map<int, List<Map<String, dynamic>>> _holdingsCache = {};
  final Map<int, bool> _holdingsLoading = {};

  @override
  void initState() {
    super.initState();
    _api = ApiService(ApiClient());
    _loadPortfolios();
  }

  Future<void> _loadPortfolios() async {
    try {
      final portfolios = await _api.getPortfolios();
      if (mounted) setState(() { _portfolios = portfolios; _loading = false; });
    } catch (e) {
      debugPrint('Portfolio load error: $e');
      if (mounted) setState(() { _loading = false; _error = e.toString(); });
    }
  }

  Future<void> _loadHoldings(int portfolioId) async {
    if (_holdingsCache.containsKey(portfolioId)) return;
    setState(() => _holdingsLoading[portfolioId] = true);
    try {
      final holdings = await _api.getPortfolioHoldings(portfolioId);
      if (mounted) {
        setState(() {
          _holdingsCache[portfolioId] = holdings;
          _holdingsLoading[portfolioId] = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _holdingsLoading[portfolioId] = false);
    }
  }

  void _toggleExpand(int portfolioId) {
    setState(() {
      if (_expandedId == portfolioId) {
        _expandedId = null;
      } else {
        _expandedId = portfolioId;
        _loadHoldings(portfolioId);
      }
    });
  }

  double _totalValue() => _portfolios.fold(0.0, (sum, p) {
        return sum + ((p['totalValue'] ?? p['value'] as num?)?.toDouble() ?? 0);
      });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            floating: true,
            title: Text('Portfolio', style: GoogleFonts.sora(fontWeight: FontWeight.w700)),
            actions: [
              IconButton(
                icon: const Icon(Icons.add_rounded),
                onPressed: () {},
                tooltip: 'Add holding',
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
                _loadPortfolios();
              }),
            )
          else if (_portfolios.isEmpty)
            const SliverFillRemaining(child: _EmptyState())
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // Summary banner
                  _SummaryBanner(
                    totalValue: _totalValue(),
                    portfolioCount: _portfolios.length,
                  ),
                  const SizedBox(height: 20),

                  Text(
                    'Your Portfolios',
                    style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),

                  // Portfolio cards
                  ..._portfolios.map((p) {
                    final id = p['id'] as int? ?? 0;
                    final isExpanded = _expandedId == id;
                    return _PortfolioCard(
                      portfolio: p,
                      isExpanded: isExpanded,
                      holdings: _holdingsCache[id] ?? [],
                      holdingsLoading: _holdingsLoading[id] ?? false,
                      onToggle: () => _toggleExpand(id),
                    );
                  }),
                ]),
              ),
            ),
        ],
      ),
    );
  }
}

// ─── Summary Banner ────────────────────────────────────────────────────────────

class _SummaryBanner extends StatelessWidget {
  final double totalValue;
  final int portfolioCount;
  const _SummaryBanner({required this.totalValue, required this.portfolioCount});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0d1a2e), Color(0xFF172640)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.emerald.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Total Portfolio Value',
                  style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.6)),
                ),
                const SizedBox(height: 6),
                Text(
                  '\$${totalValue.toStringAsFixed(2)}',
                  style: GoogleFonts.dmMono(
                      fontSize: 26, fontWeight: FontWeight.w700, color: Colors.white),
                ),
                const SizedBox(height: 4),
                Text(
                  '$portfolioCount portfolio${portfolioCount != 1 ? 's' : ''}',
                  style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.5)),
                ),
              ],
            ),
          ),
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.emerald.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.account_balance_wallet_rounded,
                color: AppColors.emerald, size: 22),
          ),
        ],
      ),
    );
  }
}

// ─── Portfolio Card ────────────────────────────────────────────────────────────

class _PortfolioCard extends StatelessWidget {
  final Map<String, dynamic> portfolio;
  final bool isExpanded;
  final List<Map<String, dynamic>> holdings;
  final bool holdingsLoading;
  final VoidCallback onToggle;

  const _PortfolioCard({
    required this.portfolio,
    required this.isExpanded,
    required this.holdings,
    required this.holdingsLoading,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final name = portfolio['name']?.toString() ?? 'Portfolio';
    final value = (portfolio['totalValue'] ?? portfolio['value'] as num?)?.toDouble() ?? 0;
    final dayReturnPct =
        (portfolio['dailyReturnPercent'] ?? portfolio['dayReturnPct'] as num?)?.toDouble();
    final holdingsCount = portfolio['holdingsCount'] as int? ?? holdings.length;
    final isPos = (dayReturnPct ?? 0) >= 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.navyLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
      ),
      child: Column(
        children: [
          // Header row
          InkWell(
            onTap: onToggle,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.emerald.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.pie_chart_rounded,
                        color: AppColors.emerald, size: 18),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name,
                            style: GoogleFonts.sora(
                                fontSize: 15, fontWeight: FontWeight.w700)),
                        Text(
                          '$holdingsCount holding${holdingsCount != 1 ? 's' : ''}',
                          style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '\$${value.toStringAsFixed(2)}',
                        style: GoogleFonts.dmMono(
                            fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
                      ),
                      if (dayReturnPct != null)
                        Text(
                          '${isPos ? '+' : ''}${dayReturnPct.toStringAsFixed(2)}% today',
                          style: GoogleFonts.dmMono(
                              fontSize: 11,
                              color: isPos ? AppColors.emerald : AppColors.red),
                        ),
                    ],
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    isExpanded
                        ? Icons.keyboard_arrow_up_rounded
                        : Icons.keyboard_arrow_down_rounded,
                    color: Colors.grey[500],
                  ),
                ],
              ),
            ),
          ),

          // Holdings table (animated)
          AnimatedSize(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeInOut,
            child: isExpanded
                ? Column(
                    children: [
                      Divider(height: 1, color: Colors.white.withValues(alpha: 0.07)),
                      if (holdingsLoading)
                        const Padding(
                          padding: EdgeInsets.all(20),
                          child: Center(
                              child: CircularProgressIndicator(
                                  color: AppColors.emerald, strokeWidth: 2)),
                        )
                      else if (holdings.isEmpty)
                        Padding(
                          padding: const EdgeInsets.all(20),
                          child: Center(
                            child: Text('No holdings yet',
                                style: TextStyle(color: Colors.grey[500], fontSize: 13)),
                          ),
                        )
                      else
                        _HoldingsTable(holdings: holdings),
                    ],
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}

// ─── Holdings Table ────────────────────────────────────────────────────────────

class _HoldingsTable extends StatelessWidget {
  final List<Map<String, dynamic>> holdings;
  const _HoldingsTable({required this.holdings});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Column headers
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
          child: Row(
            children: [
              Expanded(
                flex: 3,
                child: Text('Ticker',
                    style: TextStyle(fontSize: 11, color: Colors.grey[500])),
              ),
              Expanded(
                flex: 2,
                child: Text('Shares',
                    textAlign: TextAlign.right,
                    style: TextStyle(fontSize: 11, color: Colors.grey[500])),
              ),
              Expanded(
                flex: 3,
                child: Text('Avg Cost',
                    textAlign: TextAlign.right,
                    style: TextStyle(fontSize: 11, color: Colors.grey[500])),
              ),
              Expanded(
                flex: 3,
                child: Text('Current',
                    textAlign: TextAlign.right,
                    style: TextStyle(fontSize: 11, color: Colors.grey[500])),
              ),
              Expanded(
                flex: 3,
                child: Text('P&L %',
                    textAlign: TextAlign.right,
                    style: TextStyle(fontSize: 11, color: Colors.grey[500])),
              ),
            ],
          ),
        ),
        ...holdings.map((h) => _HoldingRow(holding: h)),
        const SizedBox(height: 8),
      ],
    );
  }
}

class _HoldingRow extends StatelessWidget {
  final Map<String, dynamic> holding;
  const _HoldingRow({required this.holding});

  @override
  Widget build(BuildContext context) {
    final ticker = holding['ticker']?.toString() ?? '—';
    final shares = (holding['shares'] ?? holding['quantity'] as num?)?.toDouble() ?? 0;
    final avgCost = (holding['avgCost'] ?? holding['averageCost'] as num?)?.toDouble();
    final currentPrice =
        (holding['currentPrice'] ?? holding['price'] as num?)?.toDouble();
    double? plPct;
    if (avgCost != null && avgCost > 0 && currentPrice != null) {
      plPct = ((currentPrice - avgCost) / avgCost) * 100;
    }
    final isPos = (plPct ?? 0) >= 0;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(color: Colors.white.withValues(alpha: 0.05)),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: Text(
              ticker,
              style: GoogleFonts.dmMono(
                  fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              shares % 1 == 0 ? shares.toInt().toString() : shares.toStringAsFixed(3),
              textAlign: TextAlign.right,
              style: GoogleFonts.dmMono(fontSize: 12, color: Colors.white),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              avgCost != null ? '\$${avgCost.toStringAsFixed(2)}' : '—',
              textAlign: TextAlign.right,
              style: GoogleFonts.dmMono(fontSize: 12, color: Colors.grey[400]),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              currentPrice != null ? '\$${currentPrice.toStringAsFixed(2)}' : '—',
              textAlign: TextAlign.right,
              style: GoogleFonts.dmMono(fontSize: 12, color: Colors.white),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              plPct != null
                  ? '${isPos ? '+' : ''}${plPct.toStringAsFixed(2)}%'
                  : '—',
              textAlign: TextAlign.right,
              style: GoogleFonts.dmMono(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: plPct == null
                      ? Colors.grey[500]!
                      : isPos
                          ? AppColors.emerald
                          : AppColors.red),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Empty / Error States ──────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.account_balance_wallet_outlined, size: 56, color: Colors.grey[600]),
            const SizedBox(height: 16),
            Text(
              'No portfolios yet',
              style: GoogleFonts.sora(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Text(
              'Add your holdings to track performance, P&L, and get AI-powered rebalancing suggestions.',
              style: TextStyle(color: Colors.grey[500], fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.add_rounded),
              label: const Text('Add first holding'),
            ),
          ],
        ),
      ),
    );
  }
}

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
          Text('Unable to load portfolio', style: TextStyle(color: Colors.grey[500])),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}
