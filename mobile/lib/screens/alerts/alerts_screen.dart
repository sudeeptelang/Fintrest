import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';
import '../../core/network/api_service.dart';
import '../../core/network/api_client.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  late final ApiService _api;
  List<Map<String, dynamic>> _alerts = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _api = ApiService(ApiClient());
    _loadAlerts();
  }

  Future<void> _loadAlerts() async {
    try {
      final alerts = await _api.getAlerts();
      if (mounted) setState(() { _alerts = alerts; _loading = false; });
    } catch (e) {
      debugPrint('Alerts load error: $e');
      if (mounted) setState(() { _loading = false; _error = e.toString(); });
    }
  }

  Future<void> _toggleAlert(int index, bool value) async {
    setState(() => _alerts[index] = {..._alerts[index], 'isActive': value});
    // The backend patch would go here; silently fail if not implemented
  }

  Future<void> _deleteAlert(int index) async {
    final alert = _alerts[index];
    setState(() => _alerts.removeAt(index));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Alert "${_alertLabel(alert)}" removed'),
        action: SnackBarAction(
          label: 'Undo',
          onPressed: () => setState(() => _alerts.insert(index, alert)),
        ),
      ),
    );
  }

  String _alertLabel(Map<String, dynamic> a) {
    final ticker = a['ticker']?.toString() ?? '';
    final type = a['alertType']?.toString() ?? a['type']?.toString() ?? 'Alert';
    return ticker.isNotEmpty ? '$ticker · $type' : type;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Alerts', style: GoogleFonts.sora(fontWeight: FontWeight.w700)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateAlertSheet(),
        icon: const Icon(Icons.add_rounded),
        label: Text('New Alert', style: GoogleFonts.sora(fontWeight: FontWeight.w600)),
        backgroundColor: AppColors.emerald,
        foregroundColor: Colors.white,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.emerald))
          : _error != null
              ? _ErrorState(onRetry: () {
                  setState(() { _loading = true; _error = null; });
                  _loadAlerts();
                })
              : _alerts.isEmpty
                  ? _EmptyState(onCreateTap: _showCreateAlertSheet)
                  : RefreshIndicator(
                      onRefresh: _loadAlerts,
                      color: AppColors.emerald,
                      child: ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                        itemCount: _alerts.length,
                        separatorBuilder: (_, i) => const SizedBox(height: 10),
                        itemBuilder: (context, i) {
                          return _AlertTile(
                            alert: _alerts[i],
                            onToggle: (v) => _toggleAlert(i, v),
                            onDelete: () => _deleteAlert(i),
                          );
                        },
                      ),
                    ),
    );
  }

  void _showCreateAlertSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.navyLight,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _CreateAlertSheet(
        onSubmit: (req) async {
          Navigator.pop(ctx);
          try {
            final created = await _api.createAlert(req);
            setState(() => _alerts.insert(0, created));
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Alert created')),
              );
            }
          } catch (e) {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Failed to create alert: $e')),
              );
            }
          }
        },
      ),
    );
  }
}

// ─── Alert Tile ────────────────────────────────────────────────────────────────

class _AlertTile extends StatelessWidget {
  final Map<String, dynamic> alert;
  final void Function(bool) onToggle;
  final VoidCallback onDelete;

  const _AlertTile({
    required this.alert,
    required this.onToggle,
    required this.onDelete,
  });

  IconData _typeIcon() {
    final t = alert['alertType']?.toString().toLowerCase() ??
        alert['type']?.toString().toLowerCase() ??
        '';
    if (t.contains('price')) return Icons.attach_money_rounded;
    if (t.contains('signal')) return Icons.trending_up_rounded;
    if (t.contains('news')) return Icons.article_outlined;
    if (t.contains('volume')) return Icons.bar_chart_rounded;
    return Icons.notifications_outlined;
  }

  Color _typeColor() {
    final t = alert['alertType']?.toString().toLowerCase() ??
        alert['type']?.toString().toLowerCase() ??
        '';
    if (t.contains('price')) return AppColors.amber;
    if (t.contains('signal')) return AppColors.emerald;
    if (t.contains('news')) return const Color(0xFF3b6fd4);
    return AppColors.grey400;
  }

  String _channelLabel() {
    final c = alert['channel']?.toString().toLowerCase() ?? '';
    if (c == 'push') return 'Push';
    if (c == 'email') return 'Email';
    if (c == 'sms') return 'SMS';
    return c.isNotEmpty ? c : 'Push';
  }

  @override
  Widget build(BuildContext context) {
    final ticker = alert['ticker']?.toString() ?? '';
    final alertType = alert['alertType']?.toString() ?? alert['type']?.toString() ?? 'Alert';
    final isActive = alert['isActive'] as bool? ?? true;
    final threshold = alert['threshold']?.toString();

    return Dismissible(
      key: Key(alert['id']?.toString() ?? alertType + ticker),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: AppColors.red.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Icon(Icons.delete_outline_rounded, color: AppColors.red),
      ),
      onDismissed: (_) => onDelete(),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.navyLight,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isActive
                ? _typeColor().withValues(alpha: 0.3)
                : Colors.white.withValues(alpha: 0.06),
          ),
        ),
        child: Row(
          children: [
            // Icon badge
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: _typeColor().withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(_typeIcon(), color: _typeColor(), size: 20),
            ),
            const SizedBox(width: 12),

            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (ticker.isNotEmpty) ...[
                        Text(
                          ticker,
                          style: GoogleFonts.dmMono(
                              fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                        const SizedBox(width: 8),
                      ],
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: _typeColor().withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          alertType.replaceAll('_', ' '),
                          style: TextStyle(
                              fontSize: 10, fontWeight: FontWeight.w600, color: _typeColor()),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.send_rounded, size: 11, color: Colors.grey[500]),
                      const SizedBox(width: 4),
                      Text(
                        _channelLabel(),
                        style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                      ),
                      if (threshold != null) ...[
                        Text('  ·  ', style: TextStyle(color: Colors.grey[600])),
                        Text(
                          'At \$$threshold',
                          style: GoogleFonts.dmMono(fontSize: 12, color: Colors.grey[500]),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),

            // Toggle
            Switch(
              value: isActive,
              onChanged: onToggle,
              activeThumbColor: AppColors.emerald,
              activeTrackColor: AppColors.emerald,
              inactiveThumbColor: AppColors.grey600,
              inactiveTrackColor: AppColors.grey800,
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Create Alert Sheet ────────────────────────────────────────────────────────

class _CreateAlertSheet extends StatefulWidget {
  final Future<void> Function(Map<String, dynamic>) onSubmit;
  const _CreateAlertSheet({required this.onSubmit});

  @override
  State<_CreateAlertSheet> createState() => _CreateAlertSheetState();
}

class _CreateAlertSheetState extends State<_CreateAlertSheet> {
  final _tickerCtrl = TextEditingController();
  final _thresholdCtrl = TextEditingController();
  String _alertType = 'PRICE_ABOVE';
  String _channel = 'push';
  bool _submitting = false;

  static const _types = [
    ('PRICE_ABOVE', 'Price Above'),
    ('PRICE_BELOW', 'Price Below'),
    ('SIGNAL_GENERATED', 'Signal Generated'),
    ('NEWS_MENTION', 'News Mention'),
  ];

  static const _channels = [
    ('push', 'Push'),
    ('email', 'Email'),
    ('sms', 'SMS'),
  ];

  @override
  void dispose() {
    _tickerCtrl.dispose();
    _thresholdCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text('Create Alert', style: GoogleFonts.sora(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 20),

          // Ticker
          TextField(
            controller: _tickerCtrl,
            textCapitalization: TextCapitalization.characters,
            style: GoogleFonts.dmMono(fontSize: 14),
            decoration: const InputDecoration(
              labelText: 'Ticker (optional)',
              prefixIcon: Icon(Icons.search_rounded, size: 18),
            ),
          ),
          const SizedBox(height: 14),

          // Alert type
          Text('Alert Type', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: _types.map((t) {
              final selected = _alertType == t.$1;
              return ChoiceChip(
                label: Text(t.$2, style: const TextStyle(fontSize: 12)),
                selected: selected,
                onSelected: (val) => setState(() => _alertType = t.$1),
                selectedColor: AppColors.emerald.withValues(alpha: 0.2),
                backgroundColor: AppColors.navyLight,
                side: BorderSide(
                    color: selected
                        ? AppColors.emerald
                        : Colors.white.withValues(alpha: 0.1)),
                labelStyle:
                    TextStyle(color: selected ? AppColors.emerald : Colors.grey[400]),
              );
            }).toList(),
          ),
          const SizedBox(height: 14),

          // Threshold (shown for price types)
          if (_alertType.startsWith('PRICE')) ...[
            TextField(
              controller: _thresholdCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              style: GoogleFonts.dmMono(fontSize: 14),
              decoration: const InputDecoration(
                labelText: 'Price threshold',
                prefixText: '\$ ',
              ),
            ),
            const SizedBox(height: 14),
          ],

          // Channel
          Text('Notify via', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
          const SizedBox(height: 8),
          Row(
            children: _channels.map((c) {
              final selected = _channel == c.$1;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(c.$2, style: const TextStyle(fontSize: 13)),
                  selected: selected,
                  onSelected: (val) => setState(() => _channel = c.$1),
                  selectedColor: AppColors.emerald.withValues(alpha: 0.2),
                  backgroundColor: AppColors.navyLight,
                  side: BorderSide(
                      color: selected
                          ? AppColors.emerald
                          : Colors.white.withValues(alpha: 0.1)),
                  labelStyle:
                      TextStyle(color: selected ? AppColors.emerald : Colors.grey[400]),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _submitting
                  ? null
                  : () async {
                      setState(() => _submitting = true);
                      final req = <String, dynamic>{
                        'alertType': _alertType,
                        'channel': _channel,
                        if (_tickerCtrl.text.trim().isNotEmpty)
                          'ticker': _tickerCtrl.text.trim().toUpperCase(),
                        if (_thresholdCtrl.text.trim().isNotEmpty)
                          'threshold': double.tryParse(_thresholdCtrl.text.trim()),
                      };
                      await widget.onSubmit(req);
                    },
              child: _submitting
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Create Alert'),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Empty / Error States ──────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  final VoidCallback onCreateTap;
  const _EmptyState({required this.onCreateTap});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.notifications_off_outlined, size: 56, color: Colors.grey[600]),
            const SizedBox(height: 16),
            Text(
              'No alerts yet',
              style: GoogleFonts.sora(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Text(
              'Create alerts to get notified about price moves, new signals, and breaking news.',
              style: TextStyle(color: Colors.grey[500], fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onCreateTap,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Create your first alert'),
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
          Text('Unable to load alerts', style: TextStyle(color: Colors.grey[500])),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}
