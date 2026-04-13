class Signal {
  final int id;
  final String ticker;
  final String stockName;
  final String signalType;
  final double scoreTotal;
  final double? currentPrice;
  final double? entryLow;
  final double? entryHigh;
  final double? stopLoss;
  final double? targetLow;
  final double? targetHigh;
  final String? riskLevel;
  final int? horizonDays;
  final SignalBreakdown? breakdown;
  final DateTime createdAt;

  Signal({
    required this.id,
    required this.ticker,
    required this.stockName,
    required this.signalType,
    required this.scoreTotal,
    this.currentPrice,
    this.entryLow,
    this.entryHigh,
    this.stopLoss,
    this.targetLow,
    this.targetHigh,
    this.riskLevel,
    this.horizonDays,
    this.breakdown,
    required this.createdAt,
  });

  factory Signal.fromJson(Map<String, dynamic> json) => Signal(
        id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
        ticker: json['ticker'] ?? '',
        stockName: json['stockName'] ?? '',
        signalType: json['signalType'] ?? 'WATCH',
        scoreTotal: (json['scoreTotal'] as num?)?.toDouble() ?? 0,
        currentPrice: (json['currentPrice'] as num?)?.toDouble(),
        entryLow: (json['entryLow'] as num?)?.toDouble(),
        entryHigh: (json['entryHigh'] as num?)?.toDouble(),
        stopLoss: (json['stopLoss'] as num?)?.toDouble(),
        targetLow: (json['targetLow'] as num?)?.toDouble(),
        targetHigh: (json['targetHigh'] as num?)?.toDouble(),
        riskLevel: json['riskLevel'] as String?,
        horizonDays: json['horizonDays'] as int?,
        breakdown: json['breakdown'] != null
            ? SignalBreakdown.fromJson(json['breakdown'])
            : null,
        createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      );

  String get signalTypeDisplay => switch (signalType) {
        'BUY_TODAY' => 'BUY TODAY',
        'WATCH' => 'WATCH',
        'AVOID' => 'AVOID',
        'HIGH_RISK' => 'HIGH RISK',
        _ => signalType.replaceAll('_', ' '),
      };

  bool get isBuy => signalType == 'BUY_TODAY';

  String? get entryRange {
    if (entryLow == null || entryHigh == null) return null;
    return '\$${entryLow!.toStringAsFixed(0)}–\$${entryHigh!.toStringAsFixed(0)}';
  }

  String? get targetRange {
    if (targetLow == null || targetHigh == null) return null;
    return '\$${targetLow!.toStringAsFixed(0)}–\$${targetHigh!.toStringAsFixed(0)}';
  }

  String? get stopDisplay =>
      stopLoss != null ? '\$${stopLoss!.toStringAsFixed(0)}' : null;

  String? get priceDisplay =>
      currentPrice != null ? '\$${currentPrice!.toStringAsFixed(2)}' : null;
}

class SignalBreakdown {
  final double momentum;
  final double volume;
  final double catalyst;
  final double fundamental;
  final double sentiment;
  final double trend;
  final double risk;
  final String? explanationJson;
  final String? whyNowSummary;

  SignalBreakdown({
    required this.momentum,
    required this.volume,
    required this.catalyst,
    required this.fundamental,
    required this.sentiment,
    required this.trend,
    required this.risk,
    this.explanationJson,
    this.whyNowSummary,
  });

  factory SignalBreakdown.fromJson(Map<String, dynamic> json) =>
      SignalBreakdown(
        momentum: (json['momentumScore'] as num?)?.toDouble() ?? 50,
        volume: (json['relVolumeScore'] as num?)?.toDouble() ?? 50,
        catalyst: (json['newsScore'] as num?)?.toDouble() ?? 50,
        fundamental: (json['fundamentalsScore'] as num?)?.toDouble() ?? 50,
        sentiment: (json['sentimentScore'] as num?)?.toDouble() ?? 50,
        trend: (json['trendScore'] as num?)?.toDouble() ?? 50,
        risk: (json['riskScore'] as num?)?.toDouble() ?? 50,
        explanationJson: json['explanationJson'] as String?,
        whyNowSummary: json['whyNowSummary'] as String?,
      );
}
