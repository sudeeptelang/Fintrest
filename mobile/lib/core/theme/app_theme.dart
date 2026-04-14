import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Semantic color palette.
/// Brand: blue + purple (per new design direction).
/// Semantics: green = gain, red = loss, amber = watch.
/// Names kept (emerald/navy) for zero-refactor across existing widgets —
/// the values are what changed.
class AppColors {
  // Brand (was emerald green, now blue)
  static const emerald = Color(0xFF2563EB);      // primary blue
  static const emeraldLight = Color(0xFF8B5CF6); // secondary purple
  static const emeraldDark = Color(0xFF1D4ED8);  // darker blue

  // Dark surfaces (was navy, now slate-black)
  static const navy = Color(0xFF0B1020);
  static const navyLight = Color(0xFF111827);

  // Neutrals
  static const white = Color(0xFFFFFFFF);
  static const grey50 = Color(0xFFF8FAFC);
  static const grey100 = Color(0xFFF1F5F9);
  static const grey200 = Color(0xFFE2E8F0);
  static const grey400 = Color(0xFF94A3B8);
  static const grey500 = Color(0xFF64748B);
  static const grey600 = Color(0xFF475569);
  static const grey800 = Color(0xFF1E293B);
  static const grey900 = Color(0xFF0F172A);

  // Semantic (gains/losses/watch)
  static const gain = Color(0xFF10B981);     // emerald-500 — for positive changes
  static const red = Color(0xFFEF4444);      // loss
  static const amber = Color(0xFFF59E0B);    // watch/warning

  static const seedBlue = Color(0xFF4F8CFF);
  static const seedPurple = Color(0xFF8B5CF6);
}

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.seedBlue,
        brightness: Brightness.light,
      ).copyWith(
        primary: AppColors.emerald,          // blue
        secondary: AppColors.emeraldLight,   // purple
        tertiary: const Color(0xFF6366F1),
        surface: AppColors.grey50,
        onSurface: AppColors.grey900,
        error: AppColors.red,
      ),
      scaffoldBackgroundColor: AppColors.grey50,
      textTheme: GoogleFonts.interTextTheme(ThemeData.light().textTheme),
      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: GoogleFonts.sora(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: AppColors.grey900,
        ),
        iconTheme: const IconThemeData(color: AppColors.grey800),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.white,
        selectedItemColor: AppColors.emerald,
        unselectedItemColor: AppColors.grey400,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: AppColors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: AppColors.grey200),
        ),
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.grey50,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.grey200),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.grey200),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.emerald),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.emerald,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: GoogleFonts.sora(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.emerald,
          side: const BorderSide(color: AppColors.grey200),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: GoogleFonts.sora(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.seedPurple,
        brightness: Brightness.dark,
      ).copyWith(
        primary: const Color(0xFF93C5FD),
        secondary: const Color(0xFFC4B5FD),
        tertiary: const Color(0xFFA5B4FC),
        surface: AppColors.grey900,
        onSurface: const Color(0xFFE2E8F0),
        error: const Color(0xFFF87171),
      ),
      scaffoldBackgroundColor: AppColors.navy,
      textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: GoogleFonts.sora(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: AppColors.white,
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.navyLight,
        selectedItemColor: Color(0xFF93C5FD),
        unselectedItemColor: AppColors.grey500,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: AppColors.navyLight,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: Colors.white.withValues(alpha: 0.06)),
        ),
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.05),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF93C5FD)),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.emerald,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: GoogleFonts.sora(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.white,
          side: BorderSide(color: Colors.white.withValues(alpha: 0.2)),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: GoogleFonts.sora(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
