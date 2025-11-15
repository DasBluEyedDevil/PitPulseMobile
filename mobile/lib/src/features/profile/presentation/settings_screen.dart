import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/providers.dart';

// Theme Mode Provider
final themeModeProvider = StateNotifierProvider<ThemeModeNotifier, ThemeMode>(
  (ref) => ThemeModeNotifier(),
);

class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  ThemeModeNotifier() : super(ThemeMode.system) {
    _loadThemeMode();
  }

  Future<void> _loadThemeMode() async {
    final prefs = await SharedPreferences.getInstance();
    final themeModeString = prefs.getString('themeMode') ?? 'system';
    state = _stringToThemeMode(themeModeString);
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    state = mode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('themeMode', _themeModeToString(mode));
  }

  String _themeModeToString(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
        return 'system';
    }
  }

  ThemeMode _stringToThemeMode(String mode) {
    switch (mode) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      case 'system':
      default:
        return ThemeMode.system;
    }
  }
}

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        children: [
          // Appearance Section
          const _SectionHeader(title: 'Appearance'),
          _SettingsTile(
            title: 'Theme',
            subtitle: _getThemeModeLabel(themeMode),
            leading: const Icon(Icons.palette),
            trailing: DropdownButton<ThemeMode>(
              value: themeMode,
              underline: const SizedBox(),
              items: const [
                DropdownMenuItem(
                  value: ThemeMode.system,
                  child: Text('System'),
                ),
                DropdownMenuItem(
                  value: ThemeMode.light,
                  child: Text('Light'),
                ),
                DropdownMenuItem(
                  value: ThemeMode.dark,
                  child: Text('Dark'),
                ),
              ],
              onChanged: (ThemeMode? mode) {
                if (mode != null) {
                  ref.read(themeModeProvider.notifier).setThemeMode(mode);
                }
              },
            ),
          ),
          const Divider(),

          // Notifications Section
          const _SectionHeader(title: 'Notifications'),
          _SettingsTile(
            title: 'Push Notifications',
            subtitle: 'Get notified about new reviews and badges',
            leading: const Icon(Icons.notifications),
            trailing: Switch(
              value: true,
              onChanged: (value) {
                // TODO: Implement notification preferences
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Notification preferences coming soon'),
                  ),
                );
              },
            ),
          ),
          _SettingsTile(
            title: 'Email Notifications',
            subtitle: 'Receive email updates',
            leading: const Icon(Icons.email),
            trailing: Switch(
              value: false,
              onChanged: (value) {
                // TODO: Implement email notification preferences
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Email notification preferences coming soon'),
                  ),
                );
              },
            ),
          ),
          const Divider(),

          // Privacy Section
          const _SectionHeader(title: 'Privacy & Legal'),
          _SettingsTile(
            title: 'Privacy Policy',
            leading: const Icon(Icons.privacy_tip),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              _launchUrl('https://pitpulse.app/privacy');
            },
          ),
          _SettingsTile(
            title: 'Terms of Service',
            leading: const Icon(Icons.description),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              _launchUrl('https://pitpulse.app/terms');
            },
          ),
          const Divider(),

          // About Section
          const _SectionHeader(title: 'About'),
          _SettingsTile(
            title: 'About PitPulse',
            subtitle: 'Version 1.0.0',
            leading: const Icon(Icons.info),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              showAboutDialog(
                context: context,
                applicationName: 'PitPulse',
                applicationVersion: '1.0.0',
                applicationIcon: const Icon(
                  Icons.music_note,
                  size: 48,
                  color: AppTheme.primary,
                ),
                children: [
                  const Text(
                    'Discover and review concert venues and bands. '
                    'Share your experiences with the music community.',
                  ),
                ],
              );
            },
          ),
          _SettingsTile(
            title: 'Contact Support',
            leading: const Icon(Icons.support_agent),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              _launchUrl('mailto:support@pitpulse.app');
            },
          ),
          const Divider(),

          // Account Section
          const _SectionHeader(title: 'Account'),
          _SettingsTile(
            title: 'Logout',
            leading: const Icon(Icons.logout, color: Colors.red),
            textColor: Colors.red,
            onTap: () async {
              final shouldLogout = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Logout'),
                  content: const Text('Are you sure you want to logout?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(false),
                      child: const Text('Cancel'),
                    ),
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(true),
                      child: const Text(
                        'Logout',
                        style: TextStyle(color: Colors.red),
                      ),
                    ),
                  ],
                ),
              );

              if (shouldLogout == true && context.mounted) {
                await ref.read(authStateProvider.notifier).logout();
                if (context.mounted) {
                  context.go('/login');
                }
              }
            },
          ),
          const SizedBox(height: AppTheme.spacing32),
        ],
      ),
    );
  }

  String _getThemeModeLabel(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'Light mode';
      case ThemeMode.dark:
        return 'Dark mode';
      case ThemeMode.system:
        return 'System default';
    }
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;

  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppTheme.spacing16,
        AppTheme.spacing24,
        AppTheme.spacing16,
        AppTheme.spacing8,
      ),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
              color: AppTheme.primary,
              fontWeight: FontWeight.bold,
            ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget leading;
  final Widget? trailing;
  final VoidCallback? onTap;
  final Color? textColor;

  const _SettingsTile({
    required this.title,
    required this.leading, this.subtitle,
    this.trailing,
    this.onTap,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: leading,
      title: Text(
        title,
        style: TextStyle(color: textColor),
      ),
      subtitle: subtitle != null ? Text(subtitle!) : null,
      trailing: trailing,
      onTap: onTap,
    );
  }
}
