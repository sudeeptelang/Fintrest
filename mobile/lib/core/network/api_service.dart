import '../constants/api_constants.dart';
import '../../models/signal.dart';
import 'api_client.dart';

/// Typed wrapper around ApiClient. All screens call this, not ApiClient directly.
class ApiService {
  final ApiClient _client;

  ApiService(this._client);

  // --- Market / Dashboard ---

  Future<Map<String, dynamic>> getMarketSummary() async {
    final res = await _client.get(ApiConstants.marketSummary);
    return res.data as Map<String, dynamic>;
  }

  Future<List<Signal>> getTopPicks({int limit = 20}) async {
    final res = await _client.get(ApiConstants.topPicks, params: {'limit': limit});
    final data = res.data as Map<String, dynamic>;
    final list = data['signals'] as List;
    return list.map((j) => Signal.fromJson(j)).toList();
  }

  Future<List<Signal>> getSwingWeek() async {
    final res = await _client.get(ApiConstants.swingWeek);
    final data = res.data as Map<String, dynamic>;
    final list = data['signals'] as List;
    return list.map((j) => Signal.fromJson(j)).toList();
  }

  Future<List<Map<String, dynamic>>> getTrending({int limit = 10}) async {
    final res = await _client.get(ApiConstants.marketTrending, params: {'limit': limit});
    return (res.data as List).cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> getMostActive({int limit = 10}) async {
    final res = await _client.get(ApiConstants.marketMostActive, params: {'limit': limit});
    return (res.data as List).cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> getMarketIndices() async {
    final res = await _client.get(ApiConstants.marketIndices);
    return (res.data as List).cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> getMarketSectors() async {
    final res = await _client.get(ApiConstants.marketSectors);
    return (res.data as List).cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> getEarningsCalendar({int days = 14}) async {
    final res = await _client.get(ApiConstants.marketEarningsCalendar, params: {'days': days});
    return (res.data as List).cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> getMarketNews({int limit = 10}) async {
    final res = await _client.get(ApiConstants.marketNews, params: {'limit': limit});
    return (res.data as List).cast<Map<String, dynamic>>();
  }

  // --- Stock Detail ---

  Future<Map<String, dynamic>> getStock(String ticker) async {
    final res = await _client.get(ApiConstants.stock(ticker));
    return res.data as Map<String, dynamic>;
  }

  Future<List<Signal>> getStockSignals(String ticker) async {
    final res = await _client.get(ApiConstants.stockSignals(ticker));
    final data = res.data as Map<String, dynamic>;
    final list = data['signals'] as List;
    return list.map((j) => Signal.fromJson(j)).toList();
  }

  Future<List<Map<String, dynamic>>> getStockChart(String ticker, {String range = '3m'}) async {
    final res = await _client.get(ApiConstants.stockChart(ticker, range: range));
    return (res.data as List).cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> getStockNews(String ticker) async {
    final res = await _client.get(ApiConstants.stockNews(ticker));
    return (res.data as List).cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> getStockSnapshot(String ticker) async {
    final res = await _client.get(ApiConstants.stockSnapshot(ticker));
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getStockAnalyst(String ticker) async {
    final res = await _client.get(ApiConstants.stockAnalyst(ticker));
    return res.data as Map<String, dynamic>;
  }

  Future<List<Map<String, dynamic>>> getStockEarnings(String ticker) async {
    final res = await _client.get(ApiConstants.stockEarnings(ticker));
    return (res.data as List).cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> getStockOwnership(String ticker) async {
    final res = await _client.get(ApiConstants.stockOwnership(ticker));
    return res.data as Map<String, dynamic>;
  }

  // --- Insiders & Congress (global feeds) ---

  Future<List<Map<String, dynamic>>> getInsidersLatest({int limit = 100}) async {
    final res = await _client.get(ApiConstants.insidersLatest, params: {'limit': limit});
    return (res.data as List).cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> getCongressLatest({int limit = 100}) async {
    final res = await _client.get(ApiConstants.congressLatest, params: {'limit': limit});
    return (res.data as List).cast<Map<String, dynamic>>();
  }

  // --- Watchlists (authenticated) ---

  Future<List<Map<String, dynamic>>> getWatchlists() async {
    final res = await _client.get(ApiConstants.watchlists);
    return (res.data as List).cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> createWatchlist(String name) async {
    final res = await _client.post(ApiConstants.watchlists, data: {'name': name});
    return res.data as Map<String, dynamic>;
  }

  Future<void> addWatchlistItem(int watchlistId, int stockId) async {
    await _client.post(
      ApiConstants.watchlistItems(watchlistId),
      data: {'stockId': stockId},
    );
  }

  // --- Alerts (authenticated) ---

  Future<List<Map<String, dynamic>>> getAlerts() async {
    final res = await _client.get(ApiConstants.alerts);
    return (res.data as List).cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> createAlert(Map<String, dynamic> req) async {
    final res = await _client.post(ApiConstants.alerts, data: req);
    return res.data as Map<String, dynamic>;
  }

  // --- Athena (authenticated) ---

  Future<Map<String, dynamic>> athenaChat(String message, {int? sessionId}) async {
    final res = await _client.post(ApiConstants.athenaChat, data: {
      'message': message,
      if (sessionId != null) 'sessionId': sessionId,
    });
    return res.data as Map<String, dynamic>;
  }

  Future<List<Map<String, dynamic>>> getAthenaSessions() async {
    final res = await _client.get(ApiConstants.athenaSessions);
    return (res.data as List).cast<Map<String, dynamic>>();
  }

  // --- Portfolio (authenticated) ---

  Future<List<Map<String, dynamic>>> getPortfolios() async {
    final res = await _client.get(ApiConstants.portfolios);
    return (res.data as List).cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> getPortfolioHoldings(int id) async {
    final res = await _client.get(ApiConstants.portfolioHoldings(id));
    return (res.data as List).cast<Map<String, dynamic>>();
  }

  // --- Performance ---

  Future<Map<String, dynamic>> getPerformanceOverview() async {
    final res = await _client.get(ApiConstants.performanceOverview);
    return res.data as Map<String, dynamic>;
  }
}
