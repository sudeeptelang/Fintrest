class ApiConstants {
  static const baseUrl = 'http://10.0.2.2:5000/api/v1'; // Android emulator -> localhost
  static const iosBaseUrl = 'http://localhost:5000/api/v1';

  // Auth
  static const signup = '/auth/signup';
  static const login = '/auth/login';
  static const me = '/auth/me';

  // Market
  static const marketSummary = '/market/summary';
  static const topPicks = '/picks/top-today';
  static const swingWeek = '/picks/swing-week';
  static String stock(String ticker) => '/stocks/$ticker';
  static String stockChart(String ticker, {String range = '3m'}) =>
      '/stocks/$ticker/chart?range=$range';
  static String stockSignals(String ticker) => '/stocks/$ticker/signals';
  static String stockNews(String ticker) => '/stocks/$ticker/news';
  static const performanceOverview = '/performance/overview';

  // Authenticated
  static const watchlists = '/watchlists';
  static String watchlistItems(String id) => '/watchlists/$id/items';
  static const alerts = '/alerts';
  static const subscription = '/subscription';
}
