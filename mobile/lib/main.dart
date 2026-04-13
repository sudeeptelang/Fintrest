import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/supabase_config.dart';
import 'core/theme/app_theme.dart';
import 'core/network/api_client.dart';
import 'core/network/api_service.dart';
import 'models/signal.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/signup_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';
import 'screens/picks/picks_screen.dart';
import 'screens/athena/athena_screen.dart';
import 'screens/portfolio/portfolio_screen.dart';
import 'screens/alerts/alerts_screen.dart';
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

class MainShell extends StatefulWidget {
  final VoidCallback onLogout;
  final User? user;
  const MainShell({super.key, required this.onLogout, this.user});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;
  late final ApiService _api;

  // Signals passed down to Signals tab
  List<Signal> _topSignals = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _api = ApiService(ApiClient());
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final picks = await _api.getTopPicks(limit: 20);
      if (mounted) {
        setState(() {
          _topSignals = picks;
          _loading = false;
        });
      }
    } catch (e) {
      debugPrint('Failed to load top picks: $e');
      if (mounted) setState(() => _loading = false);
    }
  }

  void _navigateToStock(Signal signal) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => StockDetailScreen(signal: signal),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppColors.emerald)),
      );
    }

    // 5 tabs: Home (Dashboard), Signals (Picks), Athena, Portfolio, Alerts
    final screens = [
      DashboardScreen(onSignalTap: _navigateToStock),
      PicksScreen(signals: _topSignals, onSignalTap: _navigateToStock),
      const AthenaScreen(),
      const PortfolioScreen(),
      const AlertsScreen(),
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
              label: 'Signals',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.auto_awesome),
              label: 'Athena',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.account_balance_wallet_rounded),
              label: 'Portfolio',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.notifications_rounded),
              label: 'Alerts',
            ),
          ],
        ),
      ),
    );
  }
}
