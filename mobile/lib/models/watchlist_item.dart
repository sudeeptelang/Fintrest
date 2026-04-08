class WatchlistItem {
  final String id;
  final String stockId;
  final String ticker;
  final String stockName;
  final DateTime addedAt;

  WatchlistItem({
    required this.id,
    required this.stockId,
    required this.ticker,
    required this.stockName,
    required this.addedAt,
  });

  factory WatchlistItem.fromJson(Map<String, dynamic> json) => WatchlistItem(
        id: json['id'],
        stockId: json['stockId'],
        ticker: json['ticker'],
        stockName: json['stockName'],
        addedAt: DateTime.parse(json['addedAt']),
      );
}
