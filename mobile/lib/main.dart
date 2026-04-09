import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/supabase_config.dart';
import 'core/theme/app_theme.dart';
import 'models/signal.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/signup_screen.dart';
import 'screens/home/home_screen.dart';
import 'screens/picks/picks_screen.dart';
import 'screens/watchlist/watchlist_screen.dart';
import 'screens/settings/settings_screen.dart';
import 'screens/stock_detail/stock_detail_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
  ));

  await SupabaseConfig.initialize();

  runApp(const FintrestApp());
}

class FintrestApp extends StatelessWidget {
  const FintrestApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Fintrest.ai',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.dark,
      home: const AuthGate(),
    );
  }
}

/// Listens to Supabase auth state and shows login or main app.
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool _showSignup = false;
  bool _demoMode = false;

  Future<void> _handleLogin(String email, String password) async {
    // Demo mode: skip Supabase auth for preview
    if (email == 'demo' || SupabaseConfig.supabaseAnonKey.contains('YOUR_')) {
      setState(() => _demoMode = true);
      return;
    }

    final response = await SupabaseConfig.auth.signInWithPassword(
      email: email,
      password: password,
    );
    if (response.session == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Invalid email or password')),
        );
      }
    }
  }

  Future<void> _handleSignup(String email, String password, String? name) async {
    if (email == 'demo') {
      setState(() => _demoMode = true);
      return;
    }

    final response = await SupabaseConfig.auth.signUp(
      email: email,
      password: password,
      data: name != null ? {'full_name': name} : null,
    );
    if (response.user != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Check your email to confirm your account')),
      );
      setState(() => _showSignup = false);
    }
  }

  Future<void> _handleLogout() async {
    await SupabaseConfig.auth.signOut();
  }

  @override
  Widget build(BuildContext context) {
    // Demo mode — skip auth entirely
    if (_demoMode) {
      return MainShell(
        onLogout: () => setState(() => _demoMode = false),
        user: null,
      );
    }

    return StreamBuilder<AuthState>(
      stream: SupabaseConfig.auth.onAuthStateChange,
      builder: (context, snapshot) {
        final session = SupabaseConfig.auth.currentSession;

        if (session != null) {
          return MainShell(
            onLogout: _handleLogout,
            user: SupabaseConfig.currentUser,
          );
        }

        if (_showSignup) {
          return SignupScreen(
            onLoginTap: () => setState(() => _showSignup = false),
            onSignup: _handleSignup,
          );
        }

        return LoginScreen(
          onSignupTap: () => setState(() => _showSignup = true),
          onLogin: _handleLogin,
        );
      },
    );
  }
}

// Mock data for development
final _mockSignals = [
  Signal(
    id: '1', ticker: 'NVDA', stockName: 'NVIDIA Corp', signalType: 'BuyToday',
    scoreTotal: 92, entryPrice: 892, stopPrice: 865, targetPrice: 945,
    createdAt: DateTime.now(),
    breakdown: SignalBreakdown(momentum: 95, volume: 88, catalyst: 92, fundamental: 85, sentiment: 78, trend: 90, risk: 72),
  ),
  Signal(
    id: '2', ticker: 'AAPL', stockName: 'Apple Inc', signalType: 'BuyToday',
    scoreTotal: 87, entryPrice: 198, stopPrice: 190, targetPrice: 215,
    createdAt: DateTime.now(),
    breakdown: SignalBreakdown(momentum: 88, volume: 80, catalyst: 75, fundamental: 90, sentiment: 82, trend: 85, risk: 78),
  ),
  Signal(
    id: '3', ticker: 'MSFT', stockName: 'Microsoft Corp', signalType: 'Watch',
    scoreTotal: 84, entryPrice: 425, stopPrice: 410, targetPrice: 450,
    createdAt: DateTime.now(),
    breakdown: SignalBreakdown(momentum: 82, volume: 75, catalyst: 80, fundamental: 92, sentiment: 76, trend: 88, risk: 80),
  ),
  Signal(
    id: '4', ticker: 'TSLA', stockName: 'Tesla Inc', signalType: 'Watch',
    scoreTotal: 78, entryPrice: 175, stopPrice: 165, targetPrice: 195,
    createdAt: DateTime.now(),
    breakdown: SignalBreakdown(momentum: 80, volume: 85, catalyst: 70, fundamental: 65, sentiment: 72, trend: 78, risk: 60),
  ),
  Signal(
    id: '5', ticker: 'META', stockName: 'Meta Platforms', signalType: 'Watch',
    scoreTotal: 71, entryPrice: 510, stopPrice: 490, targetPrice: 540,
    createdAt: DateTime.now(),
    breakdown: SignalBreakdown(momentum: 72, volume: 68, catalyst: 65, fundamental: 78, sentiment: 70, trend: 74, risk: 75),
  ),
  Signal(
    id: '6', ticker: 'AMZN', stockName: 'Amazon.com', signalType: 'Watch',
    scoreTotal: 81, entryPrice: 186, stopPrice: 178, targetPrice: 200,
    createdAt: DateTime.now(),
    breakdown: SignalBreakdown(momentum: 78, volume: 82, catalyst: 76, fundamental: 86, sentiment: 74, trend: 80, risk: 82),
  ),
];

class MainShell extends StatefulWidget {
  final VoidCallback onLogout;
  final User? user;
  const MainShell({super.key, required this.onLogout, this.user});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  void _navigateToStock(Signal signal) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => StockDetailScreen(signal: signal),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final userEmail = widget.user?.email;
    final userName = widget.user?.userMetadata?['full_name'] as String?;

    final screens = [
      HomeScreen(topSignals: _mockSignals, onSignalTap: _navigateToStock),
      PicksScreen(signals: _mockSignals, onSignalTap: _navigateToStock),
      WatchlistScreen(
          watchlistSignals: _mockSignals.take(3).toList(),
          onSignalTap: _navigateToStock),
      SettingsScreen(
        userEmail: userEmail,
        userName: userName,
        plan: 'Free',
        onLogout: widget.onLogout,
      ),
    ];

    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: screens),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(color: Colors.white.withValues(alpha: 0.06)),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (i) => setState(() => _currentIndex = i),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_rounded),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.trending_up_rounded),
              label: 'Picks',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.star_rounded),
              label: 'Watchlist',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.settings_rounded),
              label: 'Settings',
            ),
          ],
        ),
      ),
    );
  }
}
