import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';
import '../../core/network/api_service.dart';
import '../../core/network/api_client.dart';

class _ChatMessage {
  final String text;
  final bool isUser;
  final DateTime timestamp;
  const _ChatMessage({required this.text, required this.isUser, required this.timestamp});
}

class AthenaScreen extends StatefulWidget {
  const AthenaScreen({super.key});

  @override
  State<AthenaScreen> createState() => _AthenaScreenState();
}

class _AthenaScreenState extends State<AthenaScreen> {
  late final ApiService _api;
  final TextEditingController _inputCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();

  final List<_ChatMessage> _messages = [];
  List<Map<String, dynamic>> _sessions = [];

  int? _currentSessionId;
  bool _sending = false;

  static const List<String> _starters = [
    'Which sectors are leading today?',
    'Explain momentum scoring',
    'What is a BUY TODAY signal?',
    'Show me high-conviction picks',
  ];

  @override
  void initState() {
    super.initState();
    _api = ApiService(ApiClient());
    _loadSessions();
    // Show welcome message
    _messages.add(_ChatMessage(
      text:
          "Hi! I'm Athena, your AI market research assistant. I can help you understand signals, analyze sectors, and explain market dynamics. What would you like to explore today?",
      isUser: false,
      timestamp: DateTime.now(),
    ));
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadSessions() async {
    try {
      final sessions = await _api.getAthenaSessions();
      if (mounted) setState(() => _sessions = sessions);
    } catch (_) {
      // Not authenticated or no sessions — ignore silently
    }
  }

  Future<void> _send(String text) async {
    final msg = text.trim();
    if (msg.isEmpty || _sending) return;

    _inputCtrl.clear();
    setState(() {
      _messages.add(_ChatMessage(text: msg, isUser: true, timestamp: DateTime.now()));
      _sending = true;
    });
    _scrollToBottom();

    try {
      final resp = await _api.athenaChat(msg, sessionId: _currentSessionId);
      final reply = resp['reply']?.toString() ??
          resp['message']?.toString() ??
          'Sorry, I couldn\'t generate a response right now.';
      final sessionId = resp['sessionId'] as int?;

      if (mounted) {
        setState(() {
          _currentSessionId ??= sessionId;
          _messages.add(_ChatMessage(text: reply, isUser: false, timestamp: DateTime.now()));
          _sending = false;
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages.add(_ChatMessage(
            text: 'I\'m having trouble connecting right now. Please try again in a moment.',
            isUser: false,
            timestamp: DateTime.now(),
          ));
          _sending = false;
        });
        _scrollToBottom();
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0a1f17), Color(0xFF14352a)],
                ),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.emerald.withValues(alpha: 0.4)),
              ),
              child: const Icon(Icons.auto_awesome, color: AppColors.emerald, size: 15),
            ),
            const SizedBox(width: 10),
            Text(
              'Athena',
              style: GoogleFonts.sora(fontSize: 18, fontWeight: FontWeight.w700),
            ),
          ],
        ),
        actions: [
          if (_sessions.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.history_rounded),
              onPressed: _showSessionsSheet,
              tooltip: 'Past sessions',
            ),
          IconButton(
            icon: const Icon(Icons.add_comment_outlined),
            onPressed: _newSession,
            tooltip: 'New chat',
          ),
        ],
      ),
      body: Column(
        children: [
          // Disclaimer banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: AppColors.amber.withValues(alpha: 0.12),
            child: Text(
              'Educational content only — not financial advice. Past performance does not guarantee future results.',
              style: TextStyle(fontSize: 10, color: AppColors.amber.withValues(alpha: 0.9)),
              textAlign: TextAlign.center,
            ),
          ),

          // Message list
          Expanded(
            child: ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              itemCount: _messages.length + (_sending ? 1 : 0),
              itemBuilder: (context, i) {
                if (i == _messages.length && _sending) {
                  return _TypingIndicator();
                }
                final m = _messages[i];
                return _MessageBubble(message: m);
              },
            ),
          ),

          // Starter chips (show when only welcome message is present)
          if (_messages.length == 1)
            SizedBox(
              height: 44,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: _starters.length,
                separatorBuilder: (_, i) => const SizedBox(width: 8),
                itemBuilder: (context, i) {
                  return ActionChip(
                    label: Text(_starters[i], style: const TextStyle(fontSize: 12)),
                    onPressed: () => _send(_starters[i]),
                    backgroundColor: AppColors.navyLight,
                    side: BorderSide(color: AppColors.emerald.withValues(alpha: 0.4)),
                    labelStyle: const TextStyle(color: AppColors.emerald),
                  );
                },
              ),
            ),

          // Input row
          _InputBar(
            controller: _inputCtrl,
            sending: _sending,
            onSend: _send,
          ),
        ],
      ),
    );
  }

  void _newSession() {
    setState(() {
      _currentSessionId = null;
      _messages.clear();
      _messages.add(_ChatMessage(
        text: "Starting a new conversation. What would you like to explore?",
        isUser: false,
        timestamp: DateTime.now(),
      ));
    });
  }

  void _showSessionsSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.navyLight,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Column(
          children: [
            const SizedBox(height: 12),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text('Past Sessions',
                  style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700)),
            ),
            Expanded(
              child: ListView.builder(
                itemCount: _sessions.length,
                itemBuilder: (context, i) {
                  final s = _sessions[i];
                  return ListTile(
                    leading: const Icon(Icons.chat_bubble_outline, color: AppColors.emerald),
                    title: Text(
                      s['title']?.toString() ?? 'Session ${s['id']}',
                      style: const TextStyle(fontSize: 14),
                    ),
                    subtitle: s['createdAt'] != null
                        ? Text(s['createdAt'].toString().substring(0, 10),
                            style: TextStyle(fontSize: 12, color: Colors.grey[500]))
                        : null,
                    onTap: () {
                      setState(() => _currentSessionId = s['id'] as int?);
                      Navigator.pop(context);
                    },
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }
}

// ─── Message Bubble ────────────────────────────────────────────────────────────

class _MessageBubble extends StatelessWidget {
  final _ChatMessage message;
  const _MessageBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    if (message.isUser) {
      return Align(
        alignment: Alignment.centerRight,
        child: Container(
          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
          margin: const EdgeInsets.only(bottom: 12, left: 40),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.emerald.withValues(alpha: 0.9),
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(16),
              topRight: Radius.circular(16),
              bottomLeft: Radius.circular(16),
              bottomRight: Radius.circular(4),
            ),
          ),
          child: Text(
            message.text,
            style: const TextStyle(fontSize: 14, color: Colors.white),
          ),
        ),
      );
    }

    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.80),
        margin: const EdgeInsets.only(bottom: 12, right: 40),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF0a1f17), Color(0xFF14352a)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(4),
            topRight: Radius.circular(16),
            bottomLeft: Radius.circular(16),
            bottomRight: Radius.circular(16),
          ),
          border: Border.all(color: AppColors.emerald.withValues(alpha: 0.2)),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.auto_awesome, color: AppColors.emerald, size: 12),
                  const SizedBox(width: 5),
                  Text(
                    'Athena',
                    style: GoogleFonts.sora(
                        fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.emerald),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(message.text, style: const TextStyle(fontSize: 14, color: Colors.white)),
              const SizedBox(height: 8),
              Text(
                'Educational content — not financial advice',
                style: TextStyle(fontSize: 9, color: Colors.white.withValues(alpha: 0.35)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Typing Indicator ──────────────────────────────────────────────────────────

class _TypingIndicator extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF0a1f17), Color(0xFF14352a)],
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.emerald.withValues(alpha: 0.2)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(
              width: 24,
              height: 16,
              child: _DotAnimation(),
            ),
            const SizedBox(width: 8),
            Text(
              'Athena is thinking…',
              style: TextStyle(
                  fontSize: 12, color: Colors.white.withValues(alpha: 0.6), fontStyle: FontStyle.italic),
            ),
          ],
        ),
      ),
    );
  }
}

class _DotAnimation extends StatefulWidget {
  const _DotAnimation();

  @override
  State<_DotAnimation> createState() => _DotAnimationState();
}

class _DotAnimationState extends State<_DotAnimation> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))
      ..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (ctx, child) {
        final t = _ctrl.value;
        return Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List.generate(3, (i) {
            final opacity = ((t * 3 - i) % 1.0).clamp(0.2, 1.0);
            return Container(
              width: 5,
              height: 5,
              decoration: BoxDecoration(
                color: AppColors.emerald.withValues(alpha: opacity),
                shape: BoxShape.circle,
              ),
            );
          }),
        );
      },
    );
  }
}

// ─── Input Bar ─────────────────────────────────────────────────────────────────

class _InputBar extends StatelessWidget {
  final TextEditingController controller;
  final bool sending;
  final void Function(String) onSend;

  const _InputBar({
    required this.controller,
    required this.sending,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(12, 8, 12, MediaQuery.of(context).viewInsets.bottom + 12),
      decoration: BoxDecoration(
        color: AppColors.navyLight,
        border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.07))),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              maxLines: null,
              keyboardType: TextInputType.multiline,
              textInputAction: TextInputAction.newline,
              style: const TextStyle(fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Ask Athena anything…',
                hintStyle: TextStyle(color: Colors.grey[600], fontSize: 14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: const BorderSide(color: AppColors.emerald),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                filled: true,
                fillColor: Colors.white.withValues(alpha: 0.04),
              ),
            ),
          ),
          const SizedBox(width: 8),
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: sending ? AppColors.grey600 : AppColors.emerald,
              shape: BoxShape.circle,
            ),
            child: IconButton(
              icon: sending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.send_rounded, color: Colors.white, size: 18),
              onPressed: sending ? null : () => onSend(controller.text),
            ),
          ),
        ],
      ),
    );
  }
}
