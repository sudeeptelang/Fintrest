import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_service.dart';
import '../../widgets/stock_logo.dart';

class InsidersScreen extends StatefulWidget {
  const InsidersScreen({super.key});

  @override
  State<InsidersScreen> createState() => _InsidersScreenState();
}

enum _Filter { all, buy, sell }

class _InsidersScreenState extends State<InsidersScreen> {
  late final ApiService _api;
  List<Map<String, dynamic>> _rows = [];
  bool _loading = true;
  _Filter _filter = _Filter.all;
  double _minValue = 0;

  @override
  void initState() {
    super.initState();
    _api = ApiService(ApiClient());
    _load();
  }

  Future<void> _load() async {
    try {
      final rows = await _api.getInsidersLatest(limit: 150);
      if (mounted) {
        setState(() {
          _rows = rows;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool _isBuy(String? t) {
    if (t == null) return false;
    final u = t.toUpperCase();
    return u.contains('P-') || u.contains('PURCHASE') || u.startsWith('P');
  }

  List<Map<String, dynamic>> get _filtered {
    return _rows.where((t) {
      final buy = _isBuy(t['transactionType'] as String?);
      if (_filter == _Filter.buy && !buy) return false;
      if (_filter == _Filter.sell && buy) return false;
      final val = (t['totalValue'] as num?)?.toDouble() ?? 0;
      if (_minValue > 0 && val < _minValue) return false;
      return true;
    }).toList();
  }

  Set<String> get _clusterTickers {
    final map = <String, Set<String>>{};
    for (final t in _rows) {
      if (!_isBuy(t['transactionType'] as String?)) continue;
      final name = t['reportingName'] as String?;
      if (name == null) continue;
      final ticker = t['ticker'] as String? ?? '';
      map.putIfAbsent(ticker, () => {}).add(name);
    }
    return map.entries.where((e) => e.value.length >= 3).map((e) => e.key).toSet();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;
    final clusters = _clusterTickers;
    final buys = _rows.where((t) => _isBuy(t['transactionType'] as String?)).length;
    final sells = _rows.length - buys;

    return Scaffold(
      appBar: AppBar(
        title: Text('Insider Activity',
            style: GoogleFonts.poppins(fontWeight: FontWeight.w700)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text('Recent Form 4 filings — when 3+ executives buy the same stock, history suggests conviction.',
                      style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                  const SizedBox(height: 16),

                  // Stats
                  Row(children: [
                    Expanded(child: _stat('FILINGS', '${_rows.length}', null)),
                    Expanded(child: _stat('BUYS', '$buys', AppColors.gain)),
                    Expanded(child: _stat('SELLS', '$sells', AppColors.red)),
                    Expanded(
                        child: _stat(
                            'CLUSTERS', '${clusters.length}', AppColors.emerald)),
                  ]),

                  if (clusters.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.emerald.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: AppColors.emerald.withValues(alpha: 0.3)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(children: [
                            Icon(Icons.local_fire_department,
                                size: 16, color: AppColors.emerald),
                            const SizedBox(width: 6),
                            Text('CLUSTER BUY ALERTS',
                                style: TextStyle(
                                    fontSize: 10,
                                    color: AppColors.emerald,
                                    letterSpacing: 1.2,
                                    fontWeight: FontWeight.w800)),
                          ]),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: clusters
                                .map((t) => Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 10, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: Theme.of(context).cardColor,
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(
                                            color: AppColors.emerald
                                                .withValues(alpha: 0.4)),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          StockLogo(ticker: t, size: 20),
                                          const SizedBox(width: 6),
                                          Text(t,
                                              style: GoogleFonts.dmMono(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w700)),
                                        ],
                                      ),
                                    ))
                                .toList(),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 16),

                  // Filter chips
                  Row(children: [
                    _chip('All', _Filter.all),
                    const SizedBox(width: 8),
                    _chip('Buys', _Filter.buy),
                    const SizedBox(width: 8),
                    _chip('Sells', _Filter.sell),
                    const Spacer(),
                    _valueMenu(),
                  ]),
                  const SizedBox(height: 12),
                  Text('${filtered.length} filings',
                      style: TextStyle(fontSize: 11, color: Colors.grey[600])),
                  const SizedBox(height: 8),

                  // Table
                  ...filtered.map((t) => _row(t, clusters.contains(t['ticker']))),

                  const SizedBox(height: 16),
                  Text(
                      'Source: SEC Form 4 filings via FMP. Educational only — not a recommendation.',
                      style: TextStyle(fontSize: 9, color: Colors.grey[500]),
                      textAlign: TextAlign.center),
                ],
              ),
            ),
    );
  }

  Widget _stat(String label, String value, Color? color) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: TextStyle(
                  fontSize: 9,
                  color: Colors.grey[500],
                  letterSpacing: 1.0,
                  fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(value,
              style: GoogleFonts.dmMono(
                  fontSize: 16, fontWeight: FontWeight.w700, color: color)),
        ],
      ),
    );
  }

  Widget _chip(String label, _Filter f) {
    final selected = _filter == f;
    return GestureDetector(
      onTap: () => setState(() => _filter = f),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.emerald.withValues(alpha: 0.12)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
              color: selected
                  ? AppColors.emerald
                  : Colors.grey.withValues(alpha: 0.3)),
        ),
        child: Text(label,
            style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: selected ? AppColors.emerald : Colors.grey[700])),
      ),
    );
  }

  Widget _valueMenu() {
    return PopupMenuButton<double>(
      initialValue: _minValue,
      onSelected: (v) => setState(() => _minValue = v),
      itemBuilder: (ctx) => const [
        PopupMenuItem(value: 0, child: Text('Any value')),
        PopupMenuItem(value: 10000, child: Text('\$10K+')),
        PopupMenuItem(value: 100000, child: Text('\$100K+')),
        PopupMenuItem(value: 1000000, child: Text('\$1M+')),
        PopupMenuItem(value: 10000000, child: Text('\$10M+')),
      ],
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey.withValues(alpha: 0.3)),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Text(_valueLabel(_minValue),
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
          const Icon(Icons.arrow_drop_down, size: 18),
        ]),
      ),
    );
  }

  String _valueLabel(double v) {
    if (v >= 10000000) return '\$10M+';
    if (v >= 1000000) return '\$1M+';
    if (v >= 100000) return '\$100K+';
    if (v >= 10000) return '\$10K+';
    return 'Any value';
  }

  Widget _row(Map<String, dynamic> t, bool cluster) {
    final isBuy = _isBuy(t['transactionType'] as String?);
    final color = isBuy ? AppColors.gain : AppColors.red;
    final ticker = t['ticker'] as String? ?? '';
    final name = t['reportingName'] as String? ?? '—';
    final role = t['relationship'] as String? ?? '';
    final shares = (t['sharesTraded'] as num?)?.toDouble() ?? 0;
    final price = (t['price'] as num?)?.toDouble();
    final value = (t['totalValue'] as num?)?.toDouble() ?? 0;
    final date = t['transactionDate'] as String?;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.12)),
      ),
      child: Row(
        children: [
          StockLogo(ticker: ticker, size: 32),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Text(ticker,
                      style: GoogleFonts.dmMono(
                          fontSize: 13, fontWeight: FontWeight.w700)),
                  if (cluster) ...[
                    const SizedBox(width: 4),
                    Icon(Icons.local_fire_department,
                        size: 12, color: AppColors.emerald),
                  ],
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(isBuy ? 'BUY' : 'SELL',
                        style: TextStyle(
                            fontSize: 9,
                            color: color,
                            fontWeight: FontWeight.w800)),
                  ),
                ]),
                const SizedBox(height: 2),
                Text(name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                if (role.isNotEmpty)
                  Text(role,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 10, color: Colors.grey[600])),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(_fmtMoney(value),
                  style: GoogleFonts.dmMono(
                      fontSize: 12, fontWeight: FontWeight.w700)),
              Text(
                  '${_fmtShares(shares)}${price != null ? ' @ \$${price.toStringAsFixed(2)}' : ''}',
                  style: TextStyle(fontSize: 9, color: Colors.grey[600])),
              if (date != null)
                Text(_fmtShortDate(date),
                    style: TextStyle(fontSize: 9, color: Colors.grey[500])),
            ],
          ),
        ],
      ),
    );
  }

  String _fmtMoney(double v) {
    final a = v.abs();
    if (a >= 1e9) return '\$${(v / 1e9).toStringAsFixed(2)}B';
    if (a >= 1e6) return '\$${(v / 1e6).toStringAsFixed(2)}M';
    if (a >= 1e3) return '\$${(v / 1e3).toStringAsFixed(0)}K';
    return '\$${v.toStringAsFixed(0)}';
  }

  String _fmtShares(double v) {
    final a = v.abs();
    if (a >= 1e6) return '${(v / 1e6).toStringAsFixed(2)}M';
    if (a >= 1e3) return '${(v / 1e3).toStringAsFixed(1)}K';
    return v.toStringAsFixed(0);
  }

  String _fmtShortDate(String iso) {
    try {
      final d = DateTime.parse(iso);
      const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return '${m[d.month - 1]} ${d.day}';
    } catch (_) {
      return '';
    }
  }
}
