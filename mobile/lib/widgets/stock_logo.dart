import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme/app_theme.dart';

/// Stock logo from FMP CDN with initials fallback.
class StockLogo extends StatelessWidget {
  final String ticker;
  final double size;
  final double borderRadius;

  const StockLogo({
    super.key,
    required this.ticker,
    this.size = 40,
    this.borderRadius = 12,
  });

  @override
  Widget build(BuildContext context) {
    final url =
        'https://financialmodelingprep.com/image-stock/${ticker.toUpperCase()}.png';

    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: SizedBox(
        width: size,
        height: size,
        child: Image.network(
          url,
          width: size,
          height: size,
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => _Fallback(ticker: ticker, size: size),
          loadingBuilder: (_, child, progress) {
            if (progress == null) return Container(color: Colors.white, child: child);
            return _Fallback(ticker: ticker, size: size);
          },
        ),
      ),
    );
  }
}

class _Fallback extends StatelessWidget {
  final String ticker;
  final double size;

  const _Fallback({required this.ticker, required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.emerald.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Text(
          ticker.length >= 2 ? ticker.substring(0, 2) : ticker,
          style: GoogleFonts.dmMono(
            fontSize: size * 0.3,
            fontWeight: FontWeight.w700,
            color: AppColors.emerald,
          ),
        ),
      ),
    );
  }
}
