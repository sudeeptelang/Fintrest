import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';

/// Notifications screen.
///
/// Currently shows static placeholder data.
/// Wire to a real push notifications provider (e.g. Firebase Cloud Messaging
/// or OneSignal) once the backend push pipeline is ready. The placeholder data
/// below mirrors the schema expected from the backend:
///   { id, type, title, body, ticker, isRead, timestamp }
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  // Placeholder data — replace with real push/in-app notification records
  final List<Map<String, dynamic>> _notifications = [
    {
      'id': 1,
      'type': 'SIGNAL',
      'title': 'New BUY TODAY signal',
      'body': 'NVDA has a new high-conviction buy signal with a score of 87.',
      'ticker': 'NVDA',
      'isRead': false,
      'timestamp': DateTime.now().subtract(const Duration(minutes: 14)),
    },
    {
      'id': 2,
      'type': 'PRICE_ALERT',
      'title': 'AAPL crossed \$195',
      'body': 'Apple Inc. hit your price alert at \$195.00.',
      'ticker': 'AAPL',
      'isRead': false,
      'timestamp': DateTime.now().subtract(const Duration(hours: 1, minutes: 6)),
    },
    {
      'id': 3,
      'type': 'SIGNAL',
      'title': 'TSLA signal updated',
      'body': 'Tesla signal changed from WATCH to AVOID. Score dropped to 38.',
      'ticker': 'TSLA',
      'isRead': true,
      'timestamp': DateTime.now().subtract(const Duration(hours: 3, minutes: 22)),
    },
    {
      'id': 4,
      'type': 'NEWS',
      'title': 'Breaking: Fed holds rates',
      'body': 'The Federal Reserve kept interest rates unchanged at 5.25–5.50%.',
      'ticker': null,
      'isRead': true,
      'timestamp': DateTime.now().subtract(const Duration(hours: 5)),
    },
    {
      'id': 5,
      'type': 'WEEKLY_SUMMARY',
      'title': 'Your weekly signal summary',
      'body': '12 signals generated this week. Top performer: META +8.2%.',
      'ticker': null,
      'isRead': true,
      'timestamp': DateTime.now().subtract(const Duration(days: 2)),
    },
    {
      'id': 6,
      'type': 'PRICE_ALERT',
      'title': 'MSFT touched \$420',
      'body': 'Microsoft Corp. reached your price-above alert at \$420.00.',
      'ticker': 'MSFT',
      'isRead': true,
      'timestamp': DateTime.now().subtract(const Duration(days: 3)),
    },
  ];

  int get _unreadCount => _notifications.where((n) => n['isRead'] == false).length;

  void _markAllRead() {
    setState(() {
      for (final n in _notifications) {
        n['isRead'] = true;
      }
    });
  }

  void _markRead(int index) {
    setState(() => _notifications[index]['isRead'] = true);
  }

  void _deleteNotification(int index) {
    final removed = _notifications.removeAt(index);
    setState(() {});
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Notification dismissed'),
        action: SnackBarAction(
          label: 'Undo',
          onPressed: () => setState(() => _notifications.insert(index, removed)),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Text('Notifications', style: GoogleFonts.sora(fontWeight: FontWeight.w700)),
            if (_unreadCount > 0) ...[
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.emerald,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$_unreadCount',
                  style: const TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white),
                ),
              ),
            ],
          ],
        ),
        actions: [
          if (_unreadCount > 0)
            TextButton(
              onPressed: _markAllRead,
              child: const Text('Mark all read',
                  style: TextStyle(color: AppColors.emerald, fontSize: 13)),
            ),
        ],
      ),
      body: _notifications.isEmpty
          ? _EmptyState()
          : Column(
              children: [
                // Push notifications note banner
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  color: const Color(0xFF3b6fd4).withValues(alpha: 0.1),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline_rounded,
                          size: 14, color: Color(0xFF3b6fd4)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Push notifications coming soon. Alerts and signals will appear here in real time.',
                          style: TextStyle(
                              fontSize: 11,
                              color: const Color(0xFF3b6fd4).withValues(alpha: 0.85)),
                        ),
                      ),
                    ],
                  ),
                ),

                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                    itemCount: _notifications.length,
                    separatorBuilder: (_, i) => const SizedBox(height: 8),
                    itemBuilder: (context, i) {
                      return Dismissible(
                        key: Key(_notifications[i]['id'].toString()),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 20),
                          decoration: BoxDecoration(
                            color: AppColors.red.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(Icons.close_rounded, color: AppColors.red),
                        ),
                        onDismissed: (_) => _deleteNotification(i),
                        child: GestureDetector(
                          onTap: () => _markRead(i),
                          child: _NotificationTile(notification: _notifications[i]),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }
}

// ─── Notification Tile ─────────────────────────────────────────────────────────

class _NotificationTile extends StatelessWidget {
  final Map<String, dynamic> notification;
  const _NotificationTile({required this.notification});

  IconData _icon() => switch (notification['type']?.toString()) {
        'SIGNAL' => Icons.trending_up_rounded,
        'PRICE_ALERT' => Icons.attach_money_rounded,
        'NEWS' => Icons.article_outlined,
        'WEEKLY_SUMMARY' => Icons.bar_chart_rounded,
        _ => Icons.notifications_outlined,
      };

  Color _iconColor() => switch (notification['type']?.toString()) {
        'SIGNAL' => AppColors.emerald,
        'PRICE_ALERT' => AppColors.amber,
        'NEWS' => const Color(0xFF3b6fd4),
        'WEEKLY_SUMMARY' => AppColors.emeraldLight,
        _ => AppColors.grey400,
      };

  String _timeLabel(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    final isRead = notification['isRead'] as bool? ?? true;
    final timestamp = notification['timestamp'] as DateTime? ?? DateTime.now();
    final ticker = notification['ticker']?.toString();

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isRead
            ? AppColors.navyLight
            : AppColors.navyLight.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isRead
              ? Colors.white.withValues(alpha: 0.06)
              : _iconColor().withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Icon badge
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: _iconColor().withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(_icon(), color: _iconColor(), size: 18),
          ),
          const SizedBox(width: 12),

          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (!isRead)
                      Container(
                        width: 6,
                        height: 6,
                        margin: const EdgeInsets.only(right: 6, top: 1),
                        decoration: BoxDecoration(
                          color: _iconColor(),
                          shape: BoxShape.circle,
                        ),
                      ),
                    Expanded(
                      child: Text(
                        notification['title']?.toString() ?? '',
                        style: GoogleFonts.sora(
                          fontSize: 13,
                          fontWeight: isRead ? FontWeight.w500 : FontWeight.w700,
                          color: Colors.white,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  notification['body']?.toString() ?? '',
                  style: TextStyle(
                      fontSize: 12,
                      color: Colors.white.withValues(alpha: isRead ? 0.5 : 0.75)),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    if (ticker != null) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: Text(
                          ticker,
                          style: GoogleFonts.dmMono(fontSize: 10, color: Colors.white70),
                        ),
                      ),
                      const SizedBox(width: 8),
                    ],
                    Text(
                      _timeLabel(timestamp),
                      style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Empty State ───────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.notifications_none_rounded, size: 56, color: Colors.grey[600]),
            const SizedBox(height: 16),
            Text(
              'No notifications',
              style: GoogleFonts.sora(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Text(
              "You're all caught up! Price alerts and signal notifications will appear here.",
              style: TextStyle(color: Colors.grey[500], fontSize: 14),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
