import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';

class SettingsScreen extends StatelessWidget {
  final String? userEmail;
  final String? userName;
  final String plan;
  final VoidCallback onLogout;

  const SettingsScreen({
    super.key,
    this.userEmail,
    this.userName,
    this.plan = 'Free',
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          floating: true,
          title: Text('Settings',
              style: GoogleFonts.sora(fontWeight: FontWeight.w700)),
        ),
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              // Profile card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor:
                            AppColors.emerald.withValues(alpha: 0.1),
                        child: Text(
                          (userName ?? userEmail ?? 'U')[0].toUpperCase(),
                          style: GoogleFonts.sora(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: AppColors.emerald,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(userName ?? 'User',
                                style: GoogleFonts.sora(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600)),
                            const SizedBox(height: 2),
                            Text(userEmail ?? '',
                                style: TextStyle(
                                    fontSize: 13, color: Colors.grey[500])),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: AppColors.emerald.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(plan,
                            style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.emerald)),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Settings sections
              _SettingsTile(
                icon: Icons.credit_card_rounded,
                title: 'Subscription',
                subtitle: '$plan plan',
                onTap: () {},
              ),
              _SettingsTile(
                icon: Icons.notifications_outlined,
                title: 'Notifications',
                subtitle: 'Alert preferences',
                onTap: () {},
              ),
              _SettingsTile(
                icon: Icons.palette_outlined,
                title: 'Appearance',
                subtitle: 'Dark mode',
                onTap: () {},
              ),
              _SettingsTile(
                icon: Icons.shield_outlined,
                title: 'Privacy & Security',
                onTap: () {},
              ),
              _SettingsTile(
                icon: Icons.help_outline_rounded,
                title: 'Help & Support',
                onTap: () {},
              ),
              _SettingsTile(
                icon: Icons.description_outlined,
                title: 'Legal',
                subtitle: 'Terms, Privacy, Disclaimer',
                onTap: () {},
              ),
              const SizedBox(height: 24),

              // Logout
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onLogout,
                  icon: const Icon(Icons.logout_rounded, size: 18),
                  label: const Text('Log out'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.red,
                    side: BorderSide(color: AppColors.red.withValues(alpha: 0.3)),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Center(
                child: Text('Fintrest.ai v1.0.0',
                    style: TextStyle(fontSize: 12, color: Colors.grey[600])),
              ),
            ]),
          ),
        ),
      ],
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  const _SettingsTile({
    required this.icon,
    required this.title,
    this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, size: 22, color: Colors.grey[400]),
        title: Text(title, style: const TextStyle(fontSize: 14)),
        subtitle: subtitle != null
            ? Text(subtitle!,
                style: TextStyle(fontSize: 12, color: Colors.grey[500]))
            : null,
        trailing: Icon(Icons.chevron_right_rounded,
            size: 20, color: Colors.grey[500]),
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      ),
    );
  }
}
