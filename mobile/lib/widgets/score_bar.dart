import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';

class ScoreBar extends StatelessWidget {
  final String label;
  final double score;
  final String? weight;

  const ScoreBar({
    super.key,
    required this.label,
    required this.score,
    this.weight,
  });

  @override
  Widget build(BuildContext context) {
    final color = score >= 80
        ? AppColors.emerald
        : score >= 60
            ? AppColors.emeraldLight
            : score >= 40
                ? AppColors.amber
                : AppColors.red;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontSize: 13)),
              Row(
                children: [
                  if (weight != null)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: Text(weight!,
                          style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                    ),
                  Text(
                    score.round().toString(),
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: score / 100,
              minHeight: 6,
              backgroundColor: Colors.grey.withValues(alpha: 0.15),
              valueColor: AlwaysStoppedAnimation(color),
            ),
          ),
        ],
      ),
    );
  }
}
