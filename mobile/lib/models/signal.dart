class Signal {
  final String id;
  final String ticker;
  final String stockName;
  final String signalType;
  final double scoreTotal;
  final double? entryPrice;
  final double? stopPrice;
  final double? targetPrice;
  final SignalBreakdown? breakdown;
  final DateTime createdAt;

  Signal({
    required this.id,
    required this.ticker,
    required this.stockName,
    required this.signalType,
    required this.scoreTotal,
    this.entryPrice,
    this.stopPrice,
    this.targetPrice,
    this.breakdown,
    required this.createdAt,
  });

  factory Signal.fromJson(Map<String, dynamic> json) => Signal(
        id: json['id'],
        ticker: json['ticker'],
        stockName: json['stockName'],
        signalType: json['signalType'],
        scoreTotal: (json['scoreTotal'] as num).toDouble(),
        entryPrice: json['entryPrice']?.toDouble(),
        stopPrice: json['stopPrice']?.toDouble(),
        targetPrice: json['targetPrice']?.toDouble(),
        breakdown: json['breakdown'] != null
            ? SignalBreakdown.fromJson(json['breakdown'])
            : null,
        createdAt: DateTime.parse(json['createdAt']),
      );

  String get signalTypeDisplay => switch (signalType) {
        'BuyToday' => 'BUY TODAY',
        'Watch' => 'WATCH',
        'Avoid' => 'AVOID',
        'TakeProfit' => 'TAKE PROFIT',
        'HighRisk' => 'HIGH RISK',
        _ => signalType,
      };

  bool get isBuy => signalType == 'BuyToday';
}

class SignalBreakdown {
  final double momentum;
  final double volume;
  final double catalyst;
  final double fundamental;
  final double sentiment;
  final double trend;
  final double risk;

  SignalBreakdown({
    required this.momentum,
    required this.volume,
    required this.catalyst,
    required this.fundamental,
    required this.sentiment,
    required this.trend,
    required this.risk,
  });

  factory SignalBreakdown.fromJson(Map<String, dynamic> json) =>
      SignalBreakdown(
        momentum: (json['momentumScore'] as num).toDouble(),
        volume: (json['volumeScore'] as num).toDouble(),
        catalyst: (json['catalystScore'] as num).toDouble(),
        fundamental: (json['fundamentalScore'] as num).toDouble(),
        sentiment: (json['sentimentScore'] as num).toDouble(),
        trend: (json['trendScore'] as num).toDouble(),
        risk: (json['riskScore'] as num).toDouble(),
      );
}
