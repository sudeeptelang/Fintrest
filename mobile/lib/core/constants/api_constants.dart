class ApiConstants {
  static const baseUrl = 'http://10.0.2.2:5185/api/v1'; // Android emulator -> localhost
  static const iosBaseUrl = 'http://localhost:5185/api/v1';

  // Auth
  static const signup = '/auth/signup';
  static const login = '/auth/login';
  static const me = '/auth/me';

  // Market / Dashboard
  static const marketSummary = '/market/summary';
  static const marketTrending = '/market/trending';
  static const marketMostActive = '/market/most-active';
  static const marketSectors = '/market/sectors';
  static const marketIndices = '/market/indices';
  static const marketEarningsCalendar = '/market/earnings-calendar';
  static const marketNews = '/market/news';
  static const topPicks = '/picks/top-today';
  static const swingWeek = '/picks/swing-week';
  static const performanceOverview = '/performance/overview';

  // Stocks
  static String stock(String ticker) => '/stocks/$ticker';
  static String stockChart(String ticker, {String range = '3m'}) =>
      '/stocks/$ticker/chart?range=$range';
  static String stockSignals(String ticker) => '/stocks/$ticker/signals';
  static String stockNews(String ticker) => '/stocks/$ticker/news';
  static String stockSnapshot(String ticker) => '/stocks/$ticker/snapshot';
  static String stockAnalyst(String ticker) => '/stocks/$ticker/analyst';
  static String stockEarnings(String ticker) => '/stocks/$ticker/earnings';
  static String stockOwnership(String ticker) => '/stocks/$ticker/ownership';

  // Insiders & Congress (global feeds)
  static const insidersLatest = '/market/insiders/latest';
  static const congressLatest = '/market/congress/latest';

  // Authenticated
  static const watchlists = '/watchlists';
  static String watchlistItems(int id) => '/watchlists/$id/items';
  static const alerts = '/alerts';
  static const subscription = '/subscription';
  static const athenaChat = '/athena/chat';
  static const athenaSessions = '/athena/sessions';
  static const portfolios = '/portfolios';
  static String portfolioHoldings(int id) => '/portfolios/$id/holdings';
  static String portfolioAdvisor(int id) => '/portfolios/$id/advisor';
}
