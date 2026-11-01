// Time clock + jobs in the shop (no prices). Used by technicians, and by
// owners from More → Time clock.
import 'dart:async';

import 'package:flutter/material.dart';

import 'core.dart';

class TechHome extends StatefulWidget {
  const TechHome({super.key, this.standalone = false});
  final bool standalone;
  @override
  State<TechHome> createState() => _TechHomeState();
}

class _TechHomeState extends State<TechHome> {
  late Future<List<dynamic>> _data = _load();
  final _notes = <String, TextEditingController>{};
  var _busy = false;
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(seconds: 30), (_) => mounted ? setState(() {}) : null);
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  Future<List<dynamic>> _load() => Future.wait<dynamic>([db.rpc('tech_me'), db.rpc('tech_jobs')]);
  void _reload() => setState(() => _data = _load());

  Future<void> _clock(String action, [String? ro]) async {
    setState(() => _busy = true);
    try {
      await db.rpc('tech_clock', params: {'p_action': action, 'p_repair_order': ro});
      if (mounted) showMessage(context, action == 'out' ? 'Clocked out' : action == 'in' ? 'Clocked in' : 'Switched job');
    } catch (e) {
      if (mounted) showMessage(context, errorText(e), error: true);
    }
    setState(() => _busy = false);
    _reload();
  }

  Future<void> _update(Map j, [String? status]) async {
    final note = _notes[j['id']]?.text.trim();
    try {
      await db.rpc('tech_update_job', params: {'p_repair_order': j['id'], 'p_status': status, 'p_note': (note ?? '').isEmpty ? null : note});
      _notes[j['id']]?.clear();
      if (mounted) showMessage(context, status != null ? 'RO #${j['number']} → ${roStatus[status]?.$1}' : 'Note saved');
    } catch (e) {
      if (mounted) showMessage(context, errorText(e), error: true);
    }
    _reload();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Time clock & jobs'), actions: [
          if (!widget.standalone) IconButton(icon: const Icon(Icons.logout), onPressed: () => db.auth.signOut()),
        ]),
        body: RefreshIndicator(
          onRefresh: () async => _reload(),
          child: Loader(
            future: _data,
            builder: (c, d) {
              final me = Map<String, dynamic>.from(d[0] ?? {});
              final jobs = List<Map>.from(d[1] ?? []);
              final open = me['open_entry'] as Map?;
              final since = open == null ? null : parseDate(open['clock_in']);
              final el = since == null ? Duration.zero : DateTime.now().difference(since);
              return ListView(padding: const EdgeInsets.only(top: 8, bottom: 24), children: [
                Card(
                  color: open != null ? const Color(0xFFEAF7EE) : Colors.white,
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: me['employee'] == null
                        ? const Text('Your login isn\'t linked to an employee yet. Ask the owner to link it under Team → App access on the website.')
                        : Row(children: [
                            Icon(Icons.timer_outlined, size: 40, color: open != null ? Colors.green.shade700 : Colors.black38),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text('${me['employee']['name']}', style: const TextStyle(color: Colors.black54)),
                                Text(open != null ? 'On the clock · ${el.inHours}h ${el.inMinutes % 60}m' : 'Off the clock', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                                Text('This week: ${toNum(me['week_hours']).toStringAsFixed(2)} hrs', style: const TextStyle(color: Colors.black45)),
                              ]),
                            ),
                            FilledButton(
                              onPressed: _busy ? null : () => _clock(open != null ? 'out' : 'in'),
                              style: FilledButton.styleFrom(backgroundColor: open != null ? brandRed : Colors.green.shade700, minimumSize: const Size(110, 48)),
                              child: Text(open != null ? 'Clock out' : 'Clock in'),
                            ),
                          ]),
                  ),
                ),
                const SectionHeader('Jobs in the shop'),
                if (jobs.isEmpty) const Card(child: ListTile(title: Text('No open jobs'))),
                for (final j in jobs)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Expanded(child: Text('RO #${j['number']} · ${vehicleName(j['vehicle'])}', style: const TextStyle(fontWeight: FontWeight.w700))),
                          roPill(j['status']),
                        ]),
                        if (j['customer'] != null) Text('${j['customer']}${j['technician'] != null ? ' · ${j['technician']}' : ''}', style: const TextStyle(color: Colors.black54)),
                        if ((j['complaint'] ?? '').toString().isNotEmpty) Padding(padding: const EdgeInsets.only(top: 6), child: Text('Concern: ${j['complaint']}')),
                        for (final it in List<Map>.from(j['items'] ?? []))
                          Padding(
                            padding: const EdgeInsets.only(top: 3),
                            child: Text('• ${it['description']}${it['hours'] != null ? ' (${it['hours']} hr)' : ''}${it['part_number'] != null ? ' · ${it['part_number']}' : ''}', style: const TextStyle(fontSize: 13.5)),
                          ),
                        if ((j['internal_notes'] ?? '').toString().isNotEmpty)
                          Container(
                            margin: const EdgeInsets.only(top: 8),
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(color: surface, borderRadius: BorderRadius.circular(8)),
                            child: Text('${j['internal_notes']}', style: const TextStyle(fontSize: 12.5, color: Colors.black54)),
                          ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _notes.putIfAbsent('${j['id']}', TextEditingController.new),
                          decoration: InputDecoration(
                            hintText: 'Add a note…',
                            suffixIcon: IconButton(icon: const Icon(Icons.send), onPressed: () => _update(j)),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(spacing: 8, runSpacing: 6, children: [
                          if (me['employee'] != null && open?['repair_order_id'] != j['id'])
                            OutlinedButton(onPressed: _busy ? null : () => _clock(open != null ? 'switch' : 'in', '${j['id']}'), child: Text(open != null ? 'Switch to this job' : 'Clock in on job')),
                          if (j['status'] != 'in_progress') OutlinedButton(onPressed: () => _update(j, 'in_progress'), child: const Text('Start work')),
                          if (j['status'] != 'waiting_parts') OutlinedButton(onPressed: () => _update(j, 'waiting_parts'), child: const Text('Waiting on parts')),
                          if (j['status'] != 'ready') FilledButton(onPressed: () => _update(j, 'ready'), style: FilledButton.styleFrom(backgroundColor: Colors.green.shade700), child: const Text('Done — ready')),
                        ]),
                      ]),
                    ),
                  ),
              ]);
            },
          ),
        ),
      );
}
