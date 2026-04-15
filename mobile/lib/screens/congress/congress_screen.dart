import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_service.dart';
import '../../widgets/stock_logo.dart';

class CongressScreen extends StatefulWidget {
  const CongressScreen({super.key});

  @override
  State<CongressScreen> createState() => _CongressScreenState();
}

enum _Chamber { all, senate, house }

enum _Side { all, buy, sell }

class _CongressScreenState extends State<CongressScreen> {
  late final ApiService _api;
  List<Map<String, dynamic>> _rows = [];
  bool _loading = true;
  _Chamber _chamber = _Chamber.all;
  _Side _side = _Side.all;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _api = ApiService(ApiClient());
    _load();
  }

  Future<void> _load() async {
    try {
      final rows = await _api.getCongressLatest(limit: 150);
      if (mounted) {
        setState(() {
          _rows = rows;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool _isBuy(String? t) {
    if (t == null) return false;
    final u = t.toUpperCase();
    return u.contains('PURCHASE') || u.contains('BUY');
  }

  List<Map<String, dynamic>> get _filtered {
    final q = _search.trim().toUpperCase();
    return _rows.where((t) {
      if (_chamber != _Chamber.all && t['chamber'] != _chamber.name) return false;
      final buy = _isBuy(t['transactionType'] as String?);
      if (_side == _Side.buy && !buy) return false;
      if (_side == _Side.sell && buy) return false;
      if (q.isNotEmpty) {
        final ticker = (t['ticker'] as String? ?? '').toUpperCase();
        final rep = (t['representative'] as String? ?? '').toUpperCase();
        if (!ticker.contains(q) && !rep.contains(q)) return false;
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;
    final senate = _rows.where((t) => t['chamber'] == 'senate').length;
    final house = _rows.where((t) => t['chamber'] == 'house').length;
    final buys = _rows.where((t) => _isBuy(t['transactionType'] as String?)).length;

    // Top-traded tickers
    final counts = <String, int>{};
    for (final t in _rows) {
      final ticker = t['ticker'] as String?;
      if (ticker == null || ticker.isEmpty) continue;
      counts[ticker] = (counts[ticker] ?? 0) + 1;
    }
    final topTickers = counts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return Scaffold(
      appBar: AppBar(
        title: Text('Congress Trading',
            style: GoogleFonts.poppins(fontWeight: FontWeight.w700)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text('Stock disclosures filed under the STOCK Act. Amounts are disclosed as ranges.',
                      style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                  const SizedBox(height: 16),

                  Row(children: [
                    Expanded(child: _stat('TOTAL', '${_rows.length}', null)),
                    Expanded(child: _stat('SENATE', '$senate', Colors.blue[700])),
                    Expanded(child: _stat('HOUSE', '$house', Colors.purple[600])),
                    Expanded(child: _stat('BUYS', '$buys', AppColors.gain)),
                  ]),

                  if (topTickers.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Theme.of(context).cardColor,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.withValues(alpha: 0.15)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('MOST-TRADED BY MEMBERS',
                              style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.grey[500],
                                  letterSpacing: 1.2,
                                  fontWeight: FontWeight.w700)),
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: topTickers.take(6).map((e) {
                              return Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                      color: Colors.grey.withValues(alpha: 0.2)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    StockLogo(ticker: e.key, size: 20),
                                    const SizedBox(width: 6),
                                    Text(e.key,
                                        style: GoogleFonts.dmMono(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700)),
                                    const SizedBox(width: 4),
                                    Text('×${e.value}',
                                        style: TextStyle(
                                            fontSize: 10,
                                            color: Colors.grey[600])),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 16),

                  // Chamber filter
                  Row(children: [
                    _chip('All', _chamber == _Chamber.all,
                        () => setState(() => _chamber = _Chamber.all)),
                    const SizedBox(width: 8),
                    _chip('Senate', _chamber == _Chamber.senate,
                        () => setState(() => _chamber = _Chamber.senate)),
                    const SizedBox(width: 8),
                    _chip('House', _chamber == _Chamber.house,
                        () => setState(() => _chamber = _Chamber.house)),
                  ]),
                  const SizedBox(height: 8),
                  Row(children: [
                    _chip('All trades', _side == _Side.all,
                        () => setState(() => _side = _Side.all)),
                    const SizedBox(width: 8),
                    _chip('Buys', _side == _Side.buy,
                        () => setState(() => _side = _Side.buy)),
                    const SizedBox(width: 8),
                    _chip('Sells', _side == _Side.sell,
                        () => setState(() => _side = _Side.sell)),
                  ]),
                  const SizedBox(height: 10),
                  TextField(
                    decoration: InputDecoration(
                      hintText: 'Ticker or name…',
                      prefixIcon: const Icon(Icons.search, size: 18),
                      contentPadding:
                          const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10)),
                      isDense: true,
                    ),
                    style: const TextStyle(fontSize: 12),
                    onChanged: (v) => setState(() => _search = v),
                  ),
                  const SizedBox(height: 12),
                  Text('${filtered.length} disclosures',
                      style: TextStyle(fontSize: 11, color: Colors.grey[600])),
                  const SizedBox(height: 8),

                  ...filtered.map(_row),

                  const SizedBox(height: 16),
                  Text(
                      'Source: US Senate & House STOCK Act disclosures via FMP. Educational only.',
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

  Widget _chip(String label, bool selected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
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

  Widget _row(Map<String, dynamic> t) {
    final isBuy = _isBuy(t['transactionType'] as String?);
    final ticker = t['ticker'] as String? ?? '';
    final rep = t['representative'] as String? ?? '—';
    final chamber = t['chamber'] as String? ?? '';
    final txType = t['transactionType'] as String? ?? '—';
    final amount = t['amount'] as String? ?? '—';
    final disclosure = t['disclosureDate'] as String?;
    final transaction = t['transactionDate'] as String?;
    final chamberColor =
        chamber == 'senate' ? Colors.blue[700]! : Colors.purple[600]!;
    final sideColor = isBuy ? AppColors.gain : AppColors.red;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            if (ticker.isNotEmpty) ...[
              StockLogo(ticker: ticker, size: 28),
              const SizedBox(width: 8),
              Text(ticker,
                  style: GoogleFonts.dmMono(
                      fontSize: 13, fontWeight: FontWeight.w700)),
              const SizedBox(width: 6),
            ] else ...[
              const SizedBox(width: 2),
            ],
            Expanded(
              child: Text(rep,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: chamberColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(chamber.toUpperCase(),
                  style: TextStyle(
                      fontSize: 9,
                      color: chamberColor,
                      fontWeight: FontWeight.w800)),
            ),
          ]),
          const SizedBox(height: 8),
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: sideColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(txType.toUpperCase(),
                  style: TextStyle(
                      fontSize: 9,
                      color: sideColor,
                      fontWeight: FontWeight.w800)),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(amount,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.dmMono(
                      fontSize: 11, color: Colors.grey[700])),
            ),
          ]),
          const SizedBox(height: 4),
          Text(
              'Disclosed ${_fmtShortDate(disclosure)} · Traded ${_fmtShortDate(transaction)}',
              style: TextStyle(fontSize: 10, color: Colors.grey[600])),
        ],
      ),
    );
  }

  String _fmtShortDate(String? iso) {
    if (iso == null) return '—';
    try {
      final d = DateTime.parse(iso);
      const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return '${m[d.month - 1]} ${d.day}';
    } catch (_) {
      return '—';
    }
  }
}
