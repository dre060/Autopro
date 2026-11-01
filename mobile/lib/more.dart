import 'package:flutter/material.dart';

import 'core.dart';
import 'customers.dart';
import 'tech.dart';
import 'today.dart' show time12;

class MoreTab extends StatelessWidget {
  const MoreTab({super.key});

  @override
  Widget build(BuildContext context) {
    Widget tile(IconData i, String t, String? s, VoidCallback onTap, {bool web = false}) => ListTile(
          leading: Icon(i, color: brandBlue),
          title: Text(t),
          subtitle: s == null ? null : Text(s),
          trailing: Icon(web ? Icons.open_in_new : Icons.chevron_right, size: 20),
          onTap: onTap,
        );
    return Scaffold(
      appBar: AppBar(title: const Text('More')),
      body: ListView(padding: const EdgeInsets.only(bottom: 24), children: [
        const SectionHeader('Shop'),
        Card(child: Column(children: [
          tile(Icons.people_outline, 'Customers', 'Search, vehicles, history', () => push(context, const CustomersScreen())),
          tile(Icons.calendar_month_outlined, 'Schedule', 'Appointment requests and bookings', () => push(context, const ScheduleScreen())),
          tile(Icons.forum_outlined, 'Website messages', null, () => push(context, const MessagesScreen())),
          tile(Icons.timer_outlined, 'Time clock & my jobs', null, () => push(context, const TechHome(standalone: true))),
        ])),
        const SectionHeader('Money & taxes'),
        Card(child: Column(children: [
          tile(Icons.account_balance_outlined, 'Florida sales tax', 'What you owe and when it\'s due', () => push(context, const TaxesScreen())),
          tile(Icons.route_outlined, 'Mileage', 'Business trips and deduction', () => push(context, const MileageScreen())),
        ])),
        const SectionHeader('On the website'),
        Card(child: Column(children: [
          tile(Icons.directions_car_outlined, 'Cars for sale & vehicle sales', null, () => openWebAdmin('/admin/deals'), web: true),
          tile(Icons.inventory_2_outlined, 'Parts inventory', null, () => openWebAdmin('/admin/parts'), web: true),
          tile(Icons.bar_chart, 'Reports', 'Profit & loss, balance sheet, aging', () => openWebAdmin('/admin/reports'), web: true),
          tile(Icons.badge_outlined, 'Team & payroll', 'Employees, timesheets, pay runs', () => openWebAdmin('/admin/team'), web: true),
          tile(Icons.menu_book_outlined, 'Books & ledger', null, () => openWebAdmin('/admin/books'), web: true),
          tile(Icons.event_available_outlined, 'Year-end & 1099s', null, () => openWebAdmin('/admin/year-end'), web: true),
          tile(Icons.settings_outlined, 'Settings', null, () => openWebAdmin('/admin/settings'), web: true),
        ])),
        const SizedBox(height: 8),
        Card(
          child: ListTile(
            leading: const Icon(Icons.logout, color: brandRed),
            title: Text('Sign out'),
            subtitle: Text(db.auth.currentUser?.email ?? ''),
            onTap: () async {
              if (await confirm(context, 'Sign out?', action: 'Sign out')) await db.auth.signOut();
            },
          ),
        ),
      ]),
    );
  }
}

// =================================================================== schedule
class ScheduleScreen extends StatefulWidget {
  const ScheduleScreen({super.key});
  @override
  State<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends State<ScheduleScreen> {
  late Future<List<Map>> _rows = _load();
  Future<List<Map>> _load() async => List<Map>.from(await db
      .from('appointments')
      .select()
      .gte('appointment_date', isoDate(DateTime.now().subtract(const Duration(days: 1))))
      .not('status', 'in', '(cancelled,completed,no-show)')
      .order('appointment_date')
      .order('appointment_time'));

  Future<void> _set(Map a, String status) async {
    await db.from('appointments').update({'status': status}).eq('id', a['id']);
    if (mounted) showMessage(context, 'Appointment ${label(status).toLowerCase()}');
    setState(() => _rows = _load());
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Schedule'), actions: [
          IconButton(icon: const Icon(Icons.open_in_new), tooltip: 'Calendar on the website', onPressed: () => openWebAdmin('/admin/schedule')),
        ]),
        body: RefreshIndicator(
          onRefresh: () async => setState(() => _rows = _load()),
          child: Loader(
            future: _rows,
            builder: (c, rows) => rows.isEmpty
                ? ListView(children: const [EmptyState(Icons.event_available_outlined, 'No upcoming appointments.')])
                : ListView(padding: const EdgeInsets.only(top: 6, bottom: 24), children: [
                    for (final a in rows)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Row(children: [
                              Expanded(child: Text('${a['customer_name'] ?? a['name'] ?? 'Customer'}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15))),
                              Pill(label(a['status']), a['status'] == 'pending' ? Colors.orange : Colors.indigo),
                            ]),
                            const SizedBox(height: 4),
                            Text('${fmtDate(a['appointment_date'] ?? a['date'])} · ${time12(a['appointment_time'] ?? a['time'])}', style: const TextStyle(color: navy)),
                            Text([a['service'], [a['vehicle_year'], a['vehicle_make'], a['vehicle_model']].where((x) => x != null).join(' ')].where((x) => '${x ?? ''}'.trim().isNotEmpty).join(' · '),
                                style: const TextStyle(color: Colors.black54)),
                            if ((a['notes'] ?? a['message'] ?? '').toString().isNotEmpty) Padding(padding: const EdgeInsets.only(top: 4), child: Text('${a['notes'] ?? a['message']}')),
                            const SizedBox(height: 8),
                            Wrap(spacing: 8, children: [
                              if (a['status'] == 'pending') FilledButton.tonal(onPressed: () => _set(a, 'confirmed'), child: const Text('Confirm')),
                              if ((a['customer_phone'] ?? a['phone']) != null) OutlinedButton.icon(onPressed: () => callPhone(a['customer_phone'] ?? a['phone']), icon: const Icon(Icons.call_outlined, size: 18), label: const Text('Call')),
                              if ((a['customer_phone'] ?? a['phone']) != null) OutlinedButton.icon(onPressed: () => textPhone(a['customer_phone'] ?? a['phone']), icon: const Icon(Icons.sms_outlined, size: 18), label: const Text('Text')),
                              TextButton(onPressed: () => _set(a, 'cancelled'), child: const Text('Cancel', style: TextStyle(color: brandRed))),
                            ]),
                          ]),
                        ),
                      ),
                  ]),
          ),
        ),
      );
}

// =================================================================== messages
class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key});
  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  late Future<List<Map>> _rows = _load();
  Future<List<Map>> _load() async => List<Map>.from(await db.from('contact_messages').select().order('created_at', ascending: false).limit(100));

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Website messages')),
        body: RefreshIndicator(
          onRefresh: () async => setState(() => _rows = _load()),
          child: Loader(
            future: _rows,
            builder: (c, rows) => rows.isEmpty
                ? ListView(children: const [EmptyState(Icons.forum_outlined, 'No messages yet.')])
                : ListView(padding: const EdgeInsets.only(top: 6, bottom: 24), children: [
                    for (final m in rows)
                      Card(
                        child: ExpansionTile(
                          leading: Icon(m['responded'] == true ? Icons.mark_email_read_outlined : Icons.mark_email_unread_outlined, color: m['responded'] == true ? Colors.black38 : brandRed),
                          title: Text('${m['name']}', style: TextStyle(fontWeight: m['responded'] == true ? FontWeight.normal : FontWeight.w700)),
                          subtitle: Text('${m['subject'] ?? ''} · ${fmtDateTime(m['created_at'])}', maxLines: 1, overflow: TextOverflow.ellipsis),
                          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                          expandedCrossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${m['message']}'),
                            const SizedBox(height: 10),
                            Wrap(spacing: 8, children: [
                              if (m['phone'] != null) OutlinedButton.icon(onPressed: () => callPhone(m['phone']), icon: const Icon(Icons.call_outlined, size: 18), label: const Text('Call')),
                              if (m['phone'] != null) OutlinedButton.icon(onPressed: () => textPhone(m['phone']), icon: const Icon(Icons.sms_outlined, size: 18), label: const Text('Text')),
                              if (m['email'] != null) OutlinedButton.icon(onPressed: () => emailTo(m['email']), icon: const Icon(Icons.email_outlined, size: 18), label: const Text('Email')),
                              if (m['responded'] != true)
                                FilledButton.tonal(
                                  onPressed: () async {
                                    await db.from('contact_messages').update({'responded': true}).eq('id', m['id']);
                                    setState(() => _rows = _load());
                                  },
                                  child: const Text('Mark handled'),
                                ),
                            ]),
                          ],
                        ),
                      ),
                  ]),
          ),
        ),
      );
}

// =================================================================== mileage
Future<num> _mileageRate(DateTime on) async {
  final rows = await db.from('tax_rates').select('value, effective_from').eq('code', 'irs_mileage_rate').lte('effective_from', isoDate(on)).order('effective_from', ascending: false).limit(1);
  return rows.isEmpty ? 0.725 : toNum(rows.first['value']);
}

class MileageScreen extends StatefulWidget {
  const MileageScreen({super.key});
  @override
  State<MileageScreen> createState() => _MileageScreenState();
}

class _MileageScreenState extends State<MileageScreen> {
  final _year = DateTime.now().year;
  late Future<Map<String, dynamic>> _data = _load();

  Future<Map<String, dynamic>> _load() async {
    final r = await Future.wait<dynamic>([
      db.from('mileage_trips').select().gte('trip_date', '$_year-01-01').lte('trip_date', '$_year-12-31').order('trip_date', ascending: false),
      db.from('tax_rates').select('value, effective_from').eq('code', 'irs_mileage_rate').order('effective_from'),
    ]);
    final rates = List<Map>.from(r[1]);
    num rateOn(String d) => rates.where((x) => '${x['effective_from']}'.compareTo(d) <= 0).fold<num>(0.725, (s, x) => toNum(x['value']));
    final trips = List<Map>.from(r[0]);
    num miles = 0, ded = 0;
    for (final t in trips) {
      final m = toNum(t['miles']) * (t['round_trip'] == true ? 2 : 1);
      miles += m;
      ded += m * rateOn('${t['trip_date']}');
    }
    return {'trips': trips, 'miles': miles, 'ded': r2(ded)};
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Mileage')),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () async {
            await push(context, const TripEditor());
            setState(() => _data = _load());
          },
          icon: const Icon(Icons.add),
          label: const Text('Log trip'),
        ),
        body: RefreshIndicator(
          onRefresh: () async => setState(() => _data = _load()),
          child: Loader(
            future: _data,
            builder: (c, d) => ListView(padding: const EdgeInsets.fromLTRB(0, 10, 0, 90), children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Row(children: [
                  Expanded(child: SizedBox(height: 86, child: StatTile('Miles $_year', toNum(d['miles']).round().toString(), icon: Icons.route_outlined))),
                  const SizedBox(width: 10),
                  Expanded(child: SizedBox(height: 86, child: StatTile('Deduction', money(d['ded']), icon: Icons.savings_outlined, color: Colors.green.shade700))),
                ]),
              ),
              const SectionHeader('Trips'),
              if ((d['trips'] as List).isEmpty) const Card(child: ListTile(title: Text('No trips logged yet'), subtitle: Text('Every parts run counts.'))),
              for (final t in d['trips'] as List<Map>)
                Card(
                  child: ListTile(
                    leading: Icon(t['round_trip'] == true ? Icons.sync_alt : Icons.arrow_forward, color: brandBlue),
                    title: Text('${t['to_place'] ?? 'Trip'}'),
                    subtitle: Text('${fmtDate(t['trip_date'])} · ${label(t['purpose'])}'),
                    trailing: Text('${toNum(t['miles']) * (t['round_trip'] == true ? 2 : 1)} mi', style: const TextStyle(fontWeight: FontWeight.w600)),
                    onTap: () async {
                      await push(context, TripEditor(trip: t));
                      setState(() => _data = _load());
                    },
                  ),
                ),
            ]),
          ),
        ),
      );
}

class TripEditor extends StatefulWidget {
  const TripEditor({super.key, this.trip});
  final Map? trip;
  @override
  State<TripEditor> createState() => _TripEditorState();
}

class _TripEditorState extends State<TripEditor> {
  static const _purposes = {'parts_run': 'Parts run', 'test_drive': 'Test drive', 'delivery': 'Vehicle delivery', 'auction': 'Auction', 'customer': 'Customer pickup / drop-off', 'bank': 'Bank / supplies', 'other': 'Other'};
  late final _from = TextEditingController(text: '${widget.trip?['from_place'] ?? 'Shop — 806 Hood Ave, Leesburg'}');
  late final _to = TextEditingController(text: '${widget.trip?['to_place'] ?? ''}');
  late final _miles = TextEditingController(text: widget.trip == null ? '' : '${widget.trip!['miles']}');
  late String _purpose = '${widget.trip?['purpose'] ?? 'parts_run'}';
  late bool _round = widget.trip?['round_trip'] ?? true;
  late DateTime _date = parseDate(widget.trip?['trip_date']) ?? DateTime.now();
  num _rate = 0.725;

  @override
  void initState() {
    super.initState();
    _mileageRate(_date).then((r) => mounted ? setState(() => _rate = r) : null);
  }

  Future<void> _save() async {
    final m = toNum(_miles.text);
    if (m <= 0) return showMessage(context, 'Enter the miles', error: true);
    final row = {'trip_date': isoDate(_date), 'from_place': _from.text.trim(), 'to_place': _to.text.trim(), 'miles': m, 'round_trip': _round, 'purpose': _purpose};
    try {
      if (widget.trip == null) {
        await db.from('mileage_trips').insert(row);
      } else {
        await db.from('mileage_trips').update(row).eq('id', widget.trip!['id']);
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showMessage(context, errorText(e), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final total = toNum(_miles.text) * (_round ? 2 : 1);
    return Scaffold(
      appBar: AppBar(title: Text(widget.trip == null ? 'Log trip' : 'Edit trip'), actions: [
        if (widget.trip != null)
          IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: () async {
              if (!await confirm(context, 'Delete this trip?', action: 'Delete', danger: true)) return;
              await db.from('mileage_trips').delete().eq('id', widget.trip!['id']);
              if (context.mounted) Navigator.pop(context, true);
            },
          ),
      ]),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        OutlinedButton.icon(
          onPressed: () async {
            final d = await showDatePicker(context: context, initialDate: _date, firstDate: DateTime(2020), lastDate: DateTime.now());
            if (d != null) setState(() => _date = d);
          },
          icon: const Icon(Icons.event),
          label: Text(fmtDate(_date)),
        ),
        const SizedBox(height: 12),
        Wrap(spacing: 8, runSpacing: 6, children: [
          for (final p in _purposes.entries) ChoiceChip(label: Text(p.value), selected: _purpose == p.key, onSelected: (_) => setState(() => _purpose = p.key)),
        ]),
        const SizedBox(height: 12),
        TextField(controller: _from, decoration: const InputDecoration(labelText: 'From')),
        const SizedBox(height: 12),
        TextField(controller: _to, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'To', hintText: 'NAPA Leesburg, Manheim Orlando…')),
        const SizedBox(height: 12),
        TextField(controller: _miles, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Miles one way'), onChanged: (_) => setState(() {})),
        if (_to.text.trim().isNotEmpty)
          TextButton.icon(
            onPressed: () => openUrl('https://www.google.com/maps/dir/?api=1&origin=${Uri.encodeComponent(_from.text)}&destination=${Uri.encodeComponent(_to.text)}'),
            icon: const Icon(Icons.map_outlined),
            label: const Text('Check distance on the map'),
          ),
        SwitchListTile(contentPadding: EdgeInsets.zero, value: _round, onChanged: (v) => setState(() => _round = v), title: const Text('Round trip (×2)')),
        Text('$total mi · deduction ${money(total * _rate)}', textAlign: TextAlign.end, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        const SizedBox(height: 16),
        FilledButton(onPressed: _save, style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50)), child: const Text('Save trip')),
      ]),
    );
  }
}

// =================================================================== taxes
class TaxesScreen extends StatefulWidget {
  const TaxesScreen({super.key});
  @override
  State<TaxesScreen> createState() => _TaxesScreenState();
}

class _TaxesScreenState extends State<TaxesScreen> {
  late Future<Map<String, dynamic>> _data = _load();

  Future<Map<String, dynamic>> _load() async {
    final now = DateTime.now();
    final cur = (DateTime(now.year, now.month, 1), DateTime(now.year, now.month + 1, 0));
    final prev = (DateTime(now.year, now.month - 1, 1), DateTime(now.year, now.month, 0));
    final r = await Future.wait<dynamic>([
      db.rpc('dr15_worksheet', params: {'p_start': isoDate(cur.$1), 'p_end': isoDate(cur.$2)}),
      db.rpc('dr15_worksheet', params: {'p_start': isoDate(prev.$1), 'p_end': isoDate(prev.$2)}),
      db.from('tax_periods').select().eq('period_start', isoDate(prev.$1)).maybeSingle(),
    ]);
    return {'cur': r[0], 'prev': r[1], 'prevFiled': r[2], 'curStart': cur.$1, 'prevStart': prev.$1};
  }

  String _month(DateTime d) => const ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.month];

  DateTime _lateAfter(DateTime periodStart) {
    var d = DateTime(periodStart.year, periodStart.month + 1, 20);
    while (d.weekday > 5) {
      d = d.add(const Duration(days: 1));
    }
    return d;
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Florida sales tax')),
        body: RefreshIndicator(
          onRefresh: () async => setState(() => _data = _load()),
          child: Loader(
            future: _data,
            builder: (c, d) {
              final prev = Map<String, dynamic>.from(d['prev'] ?? {});
              final cur = Map<String, dynamic>.from(d['cur'] ?? {});
              final filed = d['prevFiled'] != null && d['prevFiled']['status'] == 'filed';
              final prevStart = d['prevStart'] as DateTime;
              final late = _lateAfter(prevStart);
              final days = late.difference(DateTime.now()).inDays;
              return ListView(padding: const EdgeInsets.only(top: 8, bottom: 24), children: [
                Panel(children: [
                  Text('${_month(prevStart)} sales tax', style: const TextStyle(color: Colors.black54)),
                  const SizedBox(height: 4),
                  Text(filed ? 'Filed & paid' : money(prev['amount_due_with_fees']), style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: filed ? Colors.green.shade700 : navy)),
                  const SizedBox(height: 4),
                  if (!filed) Text('Due the 1st, late after ${fmtDate(late)} · ${days >= 0 ? '$days days left' : '${-days} days late'}', style: TextStyle(color: days <= 5 ? brandRed : Colors.black54)),
                  if (!filed && toNum(prev['total_tax_due']) == 0) const Padding(padding: EdgeInsets.only(top: 6), child: Text('A zero return is still required.', style: TextStyle(color: Colors.orange))),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(child: FilledButton.icon(onPressed: () => openWebAdmin('/admin/taxes'), icon: const Icon(Icons.description_outlined), label: const Text('DR-15 worksheet'))),
                    const SizedBox(width: 8),
                    Expanded(child: OutlinedButton.icon(onPressed: () => openUrl('https://floridarevenue.com/taxes/eservices/Pages/default.aspx'), icon: const Icon(Icons.open_in_new), label: const Text('FL e-file'))),
                  ]),
                ]),
                SectionHeader('${_month(d['curStart'] as DateTime)} so far'),
                Panel(children: [
                  KeyValue('Gross sales', money(cur['gross_sales'])),
                  KeyValue('Taxable sales', money(cur['taxable_sales'])),
                  KeyValue('Exempt sales', money(cur['exempt_sales'])),
                  KeyValue('Tax collected', money(cur['tax_collected'])),
                  KeyValue('Use tax', money(cur['use_tax'])),
                  KeyValue('Tire / battery fees', money(cur['govt_fees'])),
                  const Divider(height: 18),
                  KeyValue('Owed so far', money(cur['amount_due_with_fees']), bold: true),
                ]),
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('Estimate — confirm with your CPA before filing.', style: TextStyle(fontSize: 12, color: Colors.black45)),
                ),
              ]);
            },
          ),
        ),
      );
}
