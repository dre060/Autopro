// Shared pieces for the Auto Pro Admin app: Supabase, theme, formatting, widgets.
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

export 'package:supabase_flutter/supabase_flutter.dart';

// ---------------------------------------------------------------- config
/// Supabase project "Auto pro". The publishable key is safe to ship in the app;
/// row-level security decides what each signed-in staff member can see.
const supabaseUrl = 'https://txvhdybrezkljpzzmppm.supabase.co';
const supabasePublishableKey = 'sb_publishable_uMJ21_m3QCHOaK4pEJcQDQ_9Ig-JsrF';
const siteUrl = 'https://www.autoprorepairs.com';

const shopName = 'Auto Pro Repairs';
const shopPhone = '3529335181';

Future<void> initAutoPro() => Supabase.initialize(url: supabaseUrl, publishableKey: supabasePublishableKey);

SupabaseClient get db => Supabase.instance.client;

/// Calls an /api/admin/* route on the website with the signed-in session.
Future<Map<String, dynamic>> siteApi(String path, [Map<String, dynamic>? body]) async {
  final token = db.auth.currentSession?.accessToken;
  final uri = Uri.parse('$siteUrl$path');
  final headers = {'Content-Type': 'application/json', if (token != null) 'Authorization': 'Bearer $token'};
  final res = body == null
      ? await http.get(uri, headers: headers)
      : await http.post(uri, headers: headers, body: jsonEncode(body));
  final data = res.body.isEmpty ? <String, dynamic>{} : jsonDecode(res.body) as Map<String, dynamic>;
  if (res.statusCode >= 400) throw Exception(data['error'] ?? 'Request failed (${res.statusCode})');
  return data;
}

Future<void> openUrl(String url) => launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
Future<void> openWebAdmin(String path) => openUrl('$siteUrl$path');

// ---------------------------------------------------------------- theme
/// Auto Pro brand: deep navy, logo blue and red.
const navy = Color(0xFF0E1A33);
const brandBlue = Color(0xFF2F7BFF);
const brandRed = Color(0xFFE11D2E);
const surface = Color(0xFFF4F6FA);

ThemeData autoProTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: navy,
    primary: navy,
    secondary: brandBlue,
    onSecondary: Colors.white,
    tertiary: brandRed,
    surface: Colors.white,
  );
  return ThemeData(
    colorScheme: scheme,
    useMaterial3: true,
    scaffoldBackgroundColor: surface,
    appBarTheme: const AppBarTheme(backgroundColor: navy, foregroundColor: Colors.white, centerTitle: false),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(backgroundColor: brandBlue, foregroundColor: Colors.white),
    filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(backgroundColor: brandBlue)),
    inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder(), isDense: true),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: Color(0xFFE3E7EF))),
    ),
    navigationBarTheme: const NavigationBarThemeData(backgroundColor: Colors.white, indicatorColor: Color(0xFFDCE7FF)),
  );
}

// ---------------------------------------------------------------- format
final _money = NumberFormat.currency(symbol: r'$');
final _money0 = NumberFormat.currency(symbol: r'$', decimalDigits: 0);
final _date = DateFormat.yMMMd();
final _dateTime = DateFormat('MMM d, h:mm a');

String money(Object? v) => _money.format(toNum(v));
String money0(Object? v) => _money0.format(toNum(v));
num toNum(Object? v) => v is num ? v : num.tryParse('${v ?? ''}'.replaceAll(RegExp(r'[^\d.\-]'), '')) ?? 0;
num r2(num v) => (v * 100).round() / 100;
DateTime? parseDate(Object? v) => v == null ? null : DateTime.tryParse('$v')?.toLocal();
String fmtDate(Object? v) {
  final d = v is DateTime ? v : parseDate(v);
  return d == null ? '—' : _date.format(d);
}

String fmtDateTime(Object? v) {
  final d = v is DateTime ? v : parseDate(v);
  return d == null ? '' : _dateTime.format(d);
}

String isoDate(DateTime d) => DateFormat('yyyy-MM-dd').format(d);
String label(String? s) {
  if (s == null || s.isEmpty) return '';
  final t = s.replaceAll(RegExp(r'[_-]'), ' ');
  return t[0].toUpperCase() + t.substring(1);
}

String customerName(Map? c) {
  if (c == null) return 'No customer';
  final n = [c['first_name'], c['last_name']].where((x) => x != null && '$x'.isNotEmpty).join(' ');
  final co = '${c['company'] ?? ''}';
  return co.isNotEmpty ? (n.isNotEmpty ? '$co ($n)' : co) : (n.isEmpty ? 'Customer' : n);
}

String vehicleName(Map? v) => v == null ? '' : [v['year'], v['make'], v['model']].where((x) => x != null && '$x'.isNotEmpty).join(' ');
String phoneFmt(Object? p) {
  final d = '${p ?? ''}'.replaceAll(RegExp(r'\D'), '');
  return d.length == 10 ? '(${d.substring(0, 3)}) ${d.substring(3, 6)}-${d.substring(6)}' : '${p ?? ''}';
}

// ---------------------------------------------------------------- statuses
const roStatus = {
  'estimate': ('Estimate', Colors.deepPurple),
  'approved': ('Approved', Colors.indigo),
  'in_progress': ('In progress', Colors.blue),
  'waiting_parts': ('Waiting on parts', Colors.orange),
  'ready': ('Ready for pickup', Colors.green),
  'completed': ('Completed', Colors.blueGrey),
  'cancelled': ('Cancelled', Colors.red),
};
const nextStep = {
  'estimate': ('approved', 'Mark approved'),
  'approved': ('in_progress', 'Start work'),
  'in_progress': ('ready', 'Ready for pickup'),
  'waiting_parts': ('in_progress', 'Parts arrived'),
  'ready': ('completed', 'Picked up'),
};
const payStatus = {
  'unpaid': ('Unpaid', Colors.red),
  'partial': ('Partial', Colors.orange),
  'paid': ('Paid', Colors.green),
  'refunded': ('Refunded', Colors.blueGrey),
};

// ---------------------------------------------------------------- widgets
String? requiredField(String? v) => (v ?? '').trim().isEmpty ? 'Required' : null;

void showMessage(BuildContext context, String text, {bool error = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Text(text),
      behavior: SnackBarBehavior.floating,
      backgroundColor: error ? Theme.of(context).colorScheme.error : navy,
    ));
}

String errorText(Object e) => e is PostgrestException ? e.message : e is AuthException ? e.message : '$e'.replaceFirst('Exception: ', '');

Future<bool> confirm(BuildContext context, String title, {String? message, String action = 'OK', bool danger = false}) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (c) => AlertDialog(
      title: Text(title),
      content: message == null ? null : Text(message),
      actions: [
        TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
        FilledButton(
          style: danger ? FilledButton.styleFrom(backgroundColor: brandRed) : null,
          onPressed: () => Navigator.pop(c, true),
          child: Text(action),
        ),
      ],
    ),
  );
  return ok ?? false;
}

class Pill extends StatelessWidget {
  const Pill(this.text, this.color, {super.key});
  final String text;
  final MaterialColor color;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
        child: Text(text, style: TextStyle(color: color.shade800, fontWeight: FontWeight.w600, fontSize: 12)),
      );
}

Widget roPill(String? s) {
  final v = roStatus[s] ?? (label(s), Colors.grey);
  return Pill(v.$1, v.$2);
}

Widget payPill(String? s) {
  final v = payStatus[s] ?? (label(s), Colors.grey);
  return Pill(v.$1, v.$2);
}

class EmptyState extends StatelessWidget {
  const EmptyState(this.icon, this.text, {super.key, this.action});
  final IconData icon;
  final String text;
  final Widget? action;
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, size: 56, color: Colors.black26),
            const SizedBox(height: 12),
            Text(text, textAlign: TextAlign.center, style: const TextStyle(color: Colors.black54)),
            if (action != null) ...[const SizedBox(height: 16), action!],
          ]),
        ),
      );
}

/// Loads [future] and shows a spinner / error / [builder] result.
class Loader<T> extends StatelessWidget {
  const Loader({super.key, required this.future, required this.builder});
  final Future<T> future;
  final Widget Function(BuildContext, T) builder;
  @override
  Widget build(BuildContext context) => FutureBuilder<T>(
        future: future,
        builder: (c, s) {
          if (s.hasError) {
            return ListView(children: [EmptyState(Icons.cloud_off, 'Could not load. Pull down to try again.\n${errorText(s.error!)}')]);
          }
          if (!s.hasData) return const Center(child: CircularProgressIndicator());
          return builder(c, s.data as T);
        },
      );
}

class SectionHeader extends StatelessWidget {
  const SectionHeader(this.text, {super.key, this.trailing});
  final String text;
  final Widget? trailing;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 18, 12, 6),
        child: Row(children: [
          Expanded(
            child: Text(text, style: Theme.of(context).textTheme.titleSmall?.copyWith(color: navy, fontWeight: FontWeight.w700, letterSpacing: .2)),
          ),
          ?trailing,
        ]),
      );
}

/// Big number tile for dashboards.
class StatTile extends StatelessWidget {
  const StatTile(this.title, this.value, {super.key, this.icon, this.onTap, this.color, this.sub});
  final String title;
  final String value;
  final String? sub;
  final IconData? icon;
  final VoidCallback? onTap;
  final Color? color;
  @override
  Widget build(BuildContext context) => Card(
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
              Row(children: [
                if (icon != null) Icon(icon, size: 18, color: color ?? brandBlue),
                if (icon != null) const SizedBox(width: 6),
                Expanded(child: Text(title, style: const TextStyle(color: Colors.black54, fontSize: 13), overflow: TextOverflow.ellipsis)),
              ]),
              const SizedBox(height: 6),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color ?? navy)),
              ),
              if (sub != null) Text(sub!, style: const TextStyle(fontSize: 11.5, color: Colors.black45), maxLines: 1, overflow: TextOverflow.ellipsis),
            ]),
          ),
        ),
      );
}

/// Rounded white section used on detail screens.
class Panel extends StatelessWidget {
  const Panel({super.key, required this.children, this.padding = const EdgeInsets.all(16)});
  final List<Widget> children;
  final EdgeInsets padding;
  @override
  Widget build(BuildContext context) => Card(
        child: Padding(padding: padding, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children)),
      );
}

class KeyValue extends StatelessWidget {
  const KeyValue(this.k, this.v, {super.key, this.bold = false, this.color});
  final String k;
  final String v;
  final bool bold;
  final Color? color;
  @override
  Widget build(BuildContext context) {
    final style = TextStyle(fontWeight: bold ? FontWeight.w700 : FontWeight.w400, fontSize: bold ? 16 : 14, color: color);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(children: [Expanded(child: Text(k, style: style.copyWith(color: bold ? null : Colors.black54))), Text(v, style: style)]),
    );
  }
}

Future<T?> push<T>(BuildContext context, Widget page) => Navigator.push<T>(context, MaterialPageRoute(builder: (_) => page));

/// Opens the phone dialer / Messages / email.
Future<void> callPhone(String? p) async {
  final d = '${p ?? ''}'.replaceAll(RegExp(r'[^\d+]'), '');
  if (d.isNotEmpty) await launchUrl(Uri.parse('tel:$d'));
}

Future<void> textPhone(String? p, [String body = '']) async {
  final d = '${p ?? ''}'.replaceAll(RegExp(r'[^\d+]'), '');
  if (d.isEmpty) return;
  await launchUrl(Uri.parse('sms:$d${body.isEmpty ? '' : '?body=${Uri.encodeComponent(body)}'}'));
}

Future<void> emailTo(String? e) async {
  if ((e ?? '').isNotEmpty) await launchUrl(Uri.parse('mailto:$e'));
}

/// Settings row from public.settings.
Future<Map<String, dynamic>> setting(String key) async {
  final r = await db.from('settings').select('value').eq('key', key).maybeSingle();
  return Map<String, dynamic>.from(r?['value'] ?? {});
}

/// Account id by chart-of-accounts code (cached).
final Map<String, String> _acctCache = {};
Future<String?> accountId(String code) async {
  if (_acctCache.isEmpty) {
    final rows = await db.from('accounts').select('id, code');
    for (final r in rows) {
      _acctCache['${r['code']}'] = '${r['id']}';
    }
  }
  return _acctCache[code];
}

String dueDateFor(String terms, [DateTime? from]) {
  final m = RegExp(r'(\d+)').firstMatch(terms);
  final days = m == null ? 0 : int.parse(m.group(1)!);
  return isoDate((from ?? DateTime.now()).add(Duration(days: days)));
}

const termsOptions = ['Due on receipt', 'Net 7', 'Net 15', 'Net 30', 'Net 60'];
const payMethods = {'cash': 'Cash', 'card': 'Card', 'check': 'Check', 'zelle': 'Zelle', 'cashapp': 'Cash App', 'ach': 'Bank transfer', 'financing': 'Financing', 'other': 'Other'};
