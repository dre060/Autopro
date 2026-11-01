import 'package:flutter/material.dart';

import 'core.dart';
import 'jobs.dart';
import 'money.dart';
import 'more.dart';

class TodayTab extends StatefulWidget {
  const TodayTab({super.key, required this.onTab});
  final void Function(int tab) onTab;
  @override
  State<TodayTab> createState() => _TodayTabState();
}

class _TodayTabState extends State<TodayTab> {
  late Future<Map<String, dynamic>> _data = _load();

  Future<Map<String, dynamic>> _load() async {
    final now = DateTime.now();
    final today = isoDate(now);
    final monthStart = isoDate(DateTime(now.year, now.month, 1));
    final monthEnd = isoDate(DateTime(now.year, now.month + 1, 0));
    final soon = isoDate(now.add(const Duration(days: 7)));
    final r = await Future.wait<dynamic>([
      db.from('repair_orders').select('id, status, total').inFilter('status', ['estimate', 'approved', 'in_progress', 'waiting_parts', 'ready']).isFilter('voided_at', null),
      db.from('repair_orders').select('id, balance_due, due_date').not('invoiced_at', 'is', null).isFilter('voided_at', null).eq('doc_type', 'invoice').gt('balance_due', 0),
      db.from('appointments').select('id').eq('status', 'pending'),
      db.from('contact_messages').select('id').eq('responded', false),
      db.from('expenses').select('id, total').eq('status', 'unpaid').isFilter('voided_at', null).lte('due_date', soon),
      db.rpc('gl_summary', params: {'p_from': monthStart, 'p_to': today}),
      db.rpc('dr15_worksheet', params: {'p_start': monthStart, 'p_end': monthEnd}),
      db.from('appointments').select('id, customer_name, name, service, appointment_time, time, status, vehicle_year, vehicle_make, vehicle_model')
          .eq('appointment_date', today).neq('status', 'cancelled').order('appointment_time'),
    ]);
    final open = List<Map>.from(r[0]);
    final ar = List<Map>.from(r[1]);
    num income = 0, costs = 0;
    for (final a in List<Map>.from(r[5])) {
      final d = toNum(a['debit']), c = toNum(a['credit']);
      if (a['type'] == 'income') income += c - d;
      if (a['type'] == 'cogs' || a['type'] == 'expense') costs += d - c;
    }
    return {
      'ready': open.where((x) => x['status'] == 'ready').length,
      'open': open.length,
      'estimates': open.where((x) => x['status'] == 'estimate').length,
      'arTotal': ar.fold<num>(0, (s, x) => s + toNum(x['balance_due'])),
      'arOverdue': ar.where((x) => x['due_date'] != null && '${x['due_date']}'.compareTo(today) < 0).length,
      'requests': (r[2] as List).length,
      'messages': (r[3] as List).length,
      'billsDue': (r[4] as List).length,
      'billsTotal': (r[4] as List).fold<num>(0, (s, x) => s + toNum(x['total'])),
      'income': income,
      'net': income - costs,
      'salesTax': toNum((r[6] as Map?)?['amount_due_with_fees']),
      'appts': List<Map>.from(r[7]),
    };
  }

  Future<void> _go(Widget page) async {
    await push(context, page);
    if (mounted) setState(() => _data = _load());
  }

  @override
  Widget build(BuildContext context) {
    final hour = DateTime.now().hour;
    final greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    final month = DateTime.now();
    final monthName = const ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month.month];
    return Scaffold(
      appBar: AppBar(title: const Text('Auto Pro')),
      body: RefreshIndicator(
        onRefresh: () async => setState(() => _data = _load()),
        child: Loader(
          future: _data,
          builder: (c, d) => ListView(padding: const EdgeInsets.fromLTRB(12, 12, 12, 24), children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 0, 4, 10),
              child: Text(greet, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700, color: navy)),
            ),
            Wrap(spacing: 8, runSpacing: 8, children: [
              ActionChip(avatar: const Icon(Icons.add), label: const Text('New repair order'), onPressed: () => _go(const NewRepairOrder())),
              ActionChip(avatar: const Icon(Icons.document_scanner_outlined), label: const Text('Snap receipt'), onPressed: () => _go(const ExpenseEditor(snapFirst: true))),
              ActionChip(avatar: const Icon(Icons.post_add), label: const Text('New invoice'), onPressed: () => _go(const NewRepairOrder(asInvoice: true))),
              ActionChip(avatar: const Icon(Icons.route_outlined), label: const Text('Log a trip'), onPressed: () => _go(const TripEditor())),
            ]),
            const SizedBox(height: 14),
            GridView.count(
              crossAxisCount: MediaQuery.sizeOf(context).width > 700 ? 4 : 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.55,
              children: [
                StatTile('Ready for pickup', '${d['ready']}', icon: Icons.check_circle_outline, color: d['ready'] > 0 ? Colors.green.shade700 : null, onTap: () => widget.onTab(1)),
                StatTile('Open jobs', '${d['open']}', icon: Icons.build_outlined, sub: '${d['estimates']} estimates', onTap: () => widget.onTab(1)),
                StatTile('Owed to you', money0(d['arTotal']), icon: Icons.receipt_long_outlined,
                    color: d['arOverdue'] > 0 ? brandRed : null, sub: d['arOverdue'] > 0 ? '${d['arOverdue']} overdue' : 'Nothing overdue', onTap: () => widget.onTab(2)),
                StatTile('Revenue $monthName', money0(d['income']), icon: Icons.trending_up, color: Colors.green.shade700, sub: 'Net profit ${money0(d['net'])}'),
                StatTile('Sales tax owed', money(d['salesTax']), icon: Icons.account_balance_outlined, sub: 'For $monthName so far', onTap: () => _go(const TaxesScreen())),
                StatTile('Bills due (7 days)', '${d['billsDue']}', icon: Icons.event_note_outlined, color: d['billsDue'] > 0 ? brandRed : null,
                    sub: money(d['billsTotal']), onTap: () => widget.onTab(3)),
                StatTile('Appointment requests', '${d['requests']}', icon: Icons.calendar_month_outlined, color: d['requests'] > 0 ? Colors.orange.shade800 : null, onTap: () => _go(const ScheduleScreen())),
                StatTile('New messages', '${d['messages']}', icon: Icons.forum_outlined, color: d['messages'] > 0 ? brandRed : null, onTap: () => _go(const MessagesScreen())),
              ],
            ),
            SectionHeader("Today's schedule", trailing: TextButton(onPressed: () => _go(const ScheduleScreen()), child: const Text('All'))),
            if ((d['appts'] as List).isEmpty)
              const Card(child: ListTile(leading: Icon(Icons.event_available_outlined), title: Text('Nothing booked today')))
            else
              for (final a in d['appts'] as List<Map>)
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.schedule, color: brandBlue),
                    title: Text('${a['customer_name'] ?? a['name'] ?? 'Customer'}'),
                    subtitle: Text([a['service'], [a['vehicle_year'], a['vehicle_make'], a['vehicle_model']].where((x) => x != null).join(' ')].where((x) => '$x'.trim().isNotEmpty).join(' · ')),
                    trailing: Text(time12(a['appointment_time'] ?? a['time'])),
                    onTap: () => _go(const ScheduleScreen()),
                  ),
                ),
          ]),
        ),
      ),
    );
  }
}

String time12(Object? t) {
  final m = RegExp(r'^(\d{1,2}):(\d{2})').firstMatch('${t ?? ''}');
  if (m == null) return '${t ?? ''}';
  final h = int.parse(m.group(1)!);
  return '${h % 12 == 0 ? 12 : h % 12}:${m.group(2)} ${h < 12 ? 'AM' : 'PM'}';
}
