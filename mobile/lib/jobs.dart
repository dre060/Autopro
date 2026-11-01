import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'core.dart';
import 'customers.dart';
import 'signature_pad.dart';

const _roSelect = '*, customer:customers(*), vehicle:customer_vehicles(*)';

// =================================================================== list
class JobsTab extends StatefulWidget {
  const JobsTab({super.key, this.invoices = false});
  final bool invoices;
  @override
  State<JobsTab> createState() => _JobsTabState();
}

class _JobsTabState extends State<JobsTab> {
  var _filter = 'open';
  var _q = '';
  late Future<List<Map>> _rows = _load();

  @override
  void initState() {
    super.initState();
    _filter = widget.invoices ? 'unpaid' : 'open';
    _rows = _load();
  }

  Future<List<Map>> _load() async {
    var q = db.from('repair_orders').select('id, number, invoice_number, status, total, balance_due, payment_status, due_date, invoiced_at, voided_at, doc_type, created_at, promised_at, customer:customers(first_name,last_name,company), vehicle:customer_vehicles(year,make,model)');
    if (widget.invoices) {
      q = q.not('invoiced_at', 'is', null).isFilter('stock_vehicle_id', null);
      if (_filter == 'unpaid') q = q.isFilter('voided_at', null).gt('balance_due', 0);
      if (_filter == 'paid') q = q.eq('payment_status', 'paid');
      final r = await q.order('invoice_number', ascending: false).limit(300);
      return List<Map>.from(r);
    }
    if (_filter == 'open') q = q.inFilter('status', ['estimate', 'approved', 'in_progress', 'waiting_parts', 'ready']).isFilter('voided_at', null);
    if (_filter == 'estimates') q = q.eq('status', 'estimate');
    if (_filter == 'ready') q = q.eq('status', 'ready');
    final r = await q.order('created_at', ascending: false).limit(300);
    return List<Map>.from(r);
  }

  void _reload() => setState(() => _rows = _load());

  Future<void> _open(Map r) async {
    await push(context, RepairOrderScreen(id: '${r['id']}'));
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    final filters = widget.invoices
        ? const {'unpaid': 'Unpaid', 'paid': 'Paid', 'all': 'All'}
        : const {'open': 'In the shop', 'estimates': 'Estimates', 'ready': 'Ready', 'all': 'All'};
    return Scaffold(
      appBar: AppBar(title: Text(widget.invoices ? 'Invoices' : 'Repair orders')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await push(context, NewRepairOrder(asInvoice: widget.invoices));
          _reload();
        },
        icon: const Icon(Icons.add),
        label: Text(widget.invoices ? 'New invoice' : 'New RO'),
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
          child: TextField(
            decoration: InputDecoration(
              hintText: 'Search name, vehicle or #',
              prefixIcon: const Icon(Icons.search),
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
            ),
            onChanged: (v) => setState(() => _q = v.trim().toLowerCase()),
          ),
        ),
        SizedBox(
          height: 46,
          child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 12), children: [
            for (final e in filters.entries)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(e.value),
                  selected: _filter == e.key,
                  onSelected: (_) => setState(() {
                    _filter = e.key;
                    _rows = _load();
                  }),
                ),
              ),
          ]),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async => _reload(),
            child: Loader(
              future: _rows,
              builder: (c, rows) {
                final shown = rows.where((r) {
                  if (_q.isEmpty) return true;
                  return '${customerName(r['customer'])} ${vehicleName(r['vehicle'])} ${r['number']} ${r['invoice_number'] ?? ''}'.toLowerCase().contains(_q);
                }).toList();
                if (shown.isEmpty) {
                  return ListView(children: [EmptyState(widget.invoices ? Icons.receipt_long_outlined : Icons.build_outlined, rows.isEmpty ? 'Nothing here yet.' : 'No matches.')]);
                }
                return ListView.builder(
                  padding: const EdgeInsets.only(bottom: 90),
                  itemCount: shown.length,
                  itemBuilder: (c, i) => _RoCard(row: shown[i], invoice: widget.invoices, onTap: () => _open(shown[i])),
                );
              },
            ),
          ),
        ),
      ]),
    );
  }
}

class _RoCard extends StatelessWidget {
  const _RoCard({required this.row, required this.invoice, required this.onTap});
  final Map row;
  final bool invoice;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    final r = row;
    final credit = r['doc_type'] == 'credit_memo';
    final title = invoice ? '${credit ? 'Credit memo' : 'Invoice'} #${r['invoice_number']}' : 'RO #${r['number']}';
    final overdue = invoice && r['voided_at'] == null && toNum(r['balance_due']) > 0 && r['due_date'] != null && '${r['due_date']}'.compareTo(isoDate(DateTime.now())) < 0;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w700, color: navy)),
                  const SizedBox(width: 8),
                  if (r['voided_at'] != null) const Pill('Void', Colors.red) else if (invoice) payPill(r['payment_status']) else roPill(r['status']),
                ]),
                const SizedBox(height: 4),
                Text(customerName(r['customer']), style: const TextStyle(fontSize: 15)),
                if (vehicleName(r['vehicle']).isNotEmpty) Text(vehicleName(r['vehicle']), style: const TextStyle(color: Colors.black54, fontSize: 13)),
              ]),
            ),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(money(r['total']), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              if (invoice && toNum(r['balance_due']) > 0 && r['voided_at'] == null)
                Text('Due ${money(r['balance_due'])}', style: TextStyle(fontSize: 12, color: overdue ? brandRed : Colors.black54)),
              Text(fmtDate(invoice ? r['invoiced_at'] : r['created_at']), style: const TextStyle(fontSize: 12, color: Colors.black45)),
            ]),
          ]),
        ),
      ),
    );
  }
}

// =================================================================== new RO
class NewRepairOrder extends StatefulWidget {
  const NewRepairOrder({super.key, this.asInvoice = false, this.customer});
  final bool asInvoice;
  final Map? customer;
  @override
  State<NewRepairOrder> createState() => _NewRepairOrderState();
}

class _NewRepairOrderState extends State<NewRepairOrder> {
  Map? _customer;
  Map? _vehicle;
  final _complaint = TextEditingController();
  final _mileage = TextEditingController();
  var _busy = false;

  @override
  void initState() {
    super.initState();
    _customer = widget.customer;
  }

  Future<void> _pickCustomer() async {
    final c = await push<Map>(context, const CustomerPicker());
    if (c != null) setState(() {
      _customer = c;
      _vehicle = null;
    });
  }

  Future<void> _pickVehicle() async {
    if (_customer == null) return;
    final v = await push<Map>(context, VehiclePicker(customerId: '${_customer!['id']}'));
    if (v != null) setState(() {
      _vehicle = v;
      if (v['mileage'] != null && _mileage.text.isEmpty) _mileage.text = '${v['mileage']}';
    });
  }

  Future<void> _create() async {
    if (_customer == null) return showMessage(context, 'Pick a customer', error: true);
    setState(() => _busy = true);
    try {
      final shop = await setting('shop');
      final terms = '${_customer!['default_terms'] ?? shop['default_terms'] ?? 'Due on receipt'}';
      final row = await db.from('repair_orders').insert({
        'customer_id': _customer!['id'],
        'vehicle_id': _vehicle?['id'],
        'status': widget.asInvoice ? 'completed' : 'estimate',
        'complaint': _complaint.text.trim().isEmpty ? null : _complaint.text.trim(),
        'mileage_in': int.tryParse(_mileage.text.replaceAll(RegExp(r'\D'), '')),
        'terms': terms,
        'tax_exempt': _customer!['tax_exempt'] == true,
        if (widget.asInvoice) 'invoiced_at': DateTime.now().toUtc().toIso8601String(),
        if (widget.asInvoice) 'due_date': dueDateFor(terms),
      }).select('id').single();
      if (!mounted) return;
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => RepairOrderScreen(id: '${row['id']}')));
    } catch (e) {
      if (mounted) showMessage(context, errorText(e), error: true);
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(widget.asInvoice ? 'New invoice' : 'New repair order')),
        body: ListView(padding: const EdgeInsets.only(top: 8, bottom: 24), children: [
          Card(
            child: ListTile(
              leading: const Icon(Icons.person_outline, color: brandBlue),
              title: Text(_customer == null ? 'Choose customer' : customerName(_customer)),
              subtitle: _customer == null ? const Text('Search or add a new one') : Text(phoneFmt(_customer!['phone'])),
              trailing: const Icon(Icons.chevron_right),
              onTap: _pickCustomer,
            ),
          ),
          Card(
            child: ListTile(
              enabled: _customer != null,
              leading: const Icon(Icons.directions_car_outlined, color: brandBlue),
              title: Text(_vehicle == null ? 'Choose vehicle (optional)' : vehicleName(_vehicle)),
              subtitle: _vehicle == null ? null : Text([_vehicle!['license_plate'], _vehicle!['vin']].where((x) => x != null).join(' · ')),
              trailing: const Icon(Icons.chevron_right),
              onTap: _pickVehicle,
            ),
          ),
          Panel(children: [
            TextField(controller: _complaint, maxLines: 3, textCapitalization: TextCapitalization.sentences, decoration: const InputDecoration(labelText: 'Customer concern', hintText: 'What did the customer report?')),
            const SizedBox(height: 12),
            TextField(controller: _mileage, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Mileage in')),
          ]),
          Padding(
            padding: const EdgeInsets.all(12),
            child: FilledButton.icon(
              onPressed: _busy ? null : _create,
              icon: const Icon(Icons.check),
              label: Text(widget.asInvoice ? 'Create invoice' : 'Create estimate'),
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50)),
            ),
          ),
        ]),
      );
}

// =================================================================== detail
class RepairOrderScreen extends StatefulWidget {
  const RepairOrderScreen({super.key, required this.id});
  final String id;
  @override
  State<RepairOrderScreen> createState() => _RepairOrderScreenState();
}

class _RepairOrderScreenState extends State<RepairOrderScreen> {
  late Future<Map<String, dynamic>> _data = _load();

  Future<Map<String, dynamic>> _load() async {
    final r = await Future.wait<dynamic>([
      db.from('repair_orders').select(_roSelect).eq('id', widget.id).single(),
      db.from('repair_order_items').select().eq('repair_order_id', widget.id).order('position').order('created_at'),
      db.from('payments').select().eq('repair_order_id', widget.id).order('received_at'),
      db.from('document_signatures').select('kind, signer_name, signed_at, source, signature').eq('repair_order_id', widget.id).order('signed_at', ascending: false),
      setting('shop'),
    ]);
    return {'ro': r[0], 'items': List<Map>.from(r[1]), 'payments': List<Map>.from(r[2]), 'sigs': List<Map>.from(r[3]), 'shop': r[4]};
  }

  void _reload() => setState(() => _data = _load());

  Future<void> _patch(Map<String, dynamic> patch, [String? msg]) async {
    try {
      await db.from('repair_orders').update(patch).eq('id', widget.id);
      if (msg != null && mounted) showMessage(context, msg);
    } catch (e) {
      if (mounted) showMessage(context, errorText(e), error: true);
    }
    _reload();
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<Map<String, dynamic>>(
        future: _data,
        builder: (c, s) {
          if (!s.hasData) {
            return Scaffold(appBar: AppBar(), body: s.hasError ? EmptyState(Icons.error_outline, errorText(s.error!)) : const Center(child: CircularProgressIndicator()));
          }
          final d = s.data!;
          final ro = Map<String, dynamic>.from(d['ro']);
          final items = d['items'] as List<Map>;
          final pays = (d['payments'] as List<Map>).where((p) => p['voided_at'] == null).toList();
          final sigs = d['sigs'] as List<Map>;
          final shop = d['shop'] as Map<String, dynamic>;
          final isInvoice = ro['invoiced_at'] != null;
          final isCredit = ro['doc_type'] == 'credit_memo';
          final voided = ro['voided_at'] != null;
          final next = nextStep[ro['status']];
          final title = isCredit ? 'Credit memo #${ro['invoice_number']}' : isInvoice ? 'Invoice #${ro['invoice_number']}' : 'RO #${ro['number']}';
          return Scaffold(
            appBar: AppBar(title: Text(title), actions: [
              PopupMenuButton<String>(
                onSelected: (v) => _menu(v, ro, shop),
                itemBuilder: (_) => [
                  const PopupMenuItem(value: 'link', child: ListTile(leading: Icon(Icons.open_in_new), title: Text('Open customer page / PDF'))),
                  const PopupMenuItem(value: 'copy', child: ListTile(leading: Icon(Icons.link), title: Text('Copy customer link'))),
                  PopupMenuItem(value: 'email', child: ListTile(leading: const Icon(Icons.email_outlined), title: Text(isInvoice ? 'Email invoice' : 'Email estimate'))),
                  const PopupMenuItem(value: 'status', child: ListTile(leading: Icon(Icons.swap_horiz), title: Text('Change status'))),
                  if (isInvoice && !voided && !isCredit) const PopupMenuItem(value: 'void', child: ListTile(leading: Icon(Icons.block, color: brandRed), title: Text('Void invoice'))),
                  const PopupMenuItem(value: 'web', child: ListTile(leading: Icon(Icons.language), title: Text('Open on website'))),
                ],
              ),
            ]),
            bottomNavigationBar: voided || isCredit
                ? null
                : SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                      child: Row(children: [
                        if (!isInvoice && ro['stock_vehicle_id'] == null)
                          Expanded(child: OutlinedButton.icon(onPressed: () => _convert(ro, shop), icon: const Icon(Icons.receipt_long), label: const Text('Convert to invoice'))),
                        if (isInvoice && toNum(ro['balance_due']) > 0)
                          Expanded(child: OutlinedButton.icon(onPressed: () => _payment(ro), icon: const Icon(Icons.attach_money), label: const Text('Payment'))),
                        if (next != null) ...[
                          const SizedBox(width: 8),
                          Expanded(
                            child: FilledButton(
                              onPressed: () => _setStatus(ro, next.$1, shop),
                              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(46)),
                              child: Text(next.$2),
                            ),
                          ),
                        ],
                      ]),
                    ),
                  ),
            body: RefreshIndicator(
              onRefresh: () async => _reload(),
              child: ListView(padding: const EdgeInsets.only(top: 6, bottom: 24), children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 6, 16, 4),
                  child: Wrap(spacing: 8, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [
                    if (voided) const Pill('Void', Colors.red) else roPill(ro['status']),
                    if (isInvoice && !voided) payPill(ro['payment_status']),
                    if (ro['approved_by_name'] != null) Pill('Approved by ${ro['approved_by_name']}', Colors.indigo),
                    if (ro['customer_notified_at'] != null) const Pill('Customer notified', Colors.teal),
                  ]),
                ),
                _customerCard(ro),
                if ((ro['complaint'] ?? '').toString().isNotEmpty || (ro['diagnosis'] ?? '').toString().isNotEmpty || !isInvoice)
                  Panel(children: [
                    _EditableText(label: 'Customer concern', value: ro['complaint'], onSave: (v) => _patch({'complaint': v})),
                    const Divider(height: 20),
                    _EditableText(label: 'Diagnosis / findings', value: ro['diagnosis'], onSave: (v) => _patch({'diagnosis': v})),
                  ]),
                SectionHeader('Labor & parts', trailing: voided ? null : TextButton.icon(onPressed: () => _editItem(null, items), icon: const Icon(Icons.add), label: const Text('Add'))),
                if (items.isEmpty)
                  Card(child: ListTile(leading: const Icon(Icons.playlist_add), title: const Text('No work added yet'), subtitle: const Text('Add labor, parts or fees'), onTap: () => _editItem(null, items)))
                else
                  Card(
                    child: Column(children: [
                      for (final it in items)
                        ListTile(
                          onTap: voided ? null : () => _editItem(it, items),
                          leading: CircleAvatar(
                            radius: 17,
                            backgroundColor: const Color(0xFFEEF3FF),
                            child: Icon(switch (it['kind']) { 'labor' => Icons.engineering, 'part' => Icons.settings, 'sublet' => Icons.handshake_outlined, _ => Icons.sell_outlined }, size: 18, color: brandBlue),
                          ),
                          title: Text('${it['item_name'] ?? ''}${(it['item_name'] ?? '').toString().isNotEmpty ? ' · ' : ''}${it['description']}',
                              style: TextStyle(decoration: it['approved'] == false ? TextDecoration.lineThrough : null, color: it['approved'] == false ? Colors.black38 : null)),
                          subtitle: Text('${_qty(it)} × ${money(it['unit_price'])}${it['taxable'] == true ? '' : ' · no tax'}'),
                          trailing: Text(money(toNum(it['quantity']) * toNum(it['unit_price'])), style: const TextStyle(fontWeight: FontWeight.w600)),
                        ),
                    ]),
                  ),
                Panel(children: [
                  KeyValue('Labor', money(ro['labor_total'])),
                  KeyValue('Parts', money(ro['parts_total'])),
                  KeyValue('Fees & sublet', money(ro['other_total'])),
                  if (toNum(ro['discount_amount']) > 0) KeyValue('Discount', '−${money(ro['discount_amount'])}'),
                  KeyValue('FL sales tax 6%', money(ro['tax_state'])),
                  KeyValue('${ro['surtax_county'] ?? 'Lake'} surtax', money(ro['tax_surtax'])),
                  const Divider(height: 18),
                  KeyValue('Total', money(ro['total']), bold: true),
                  if (isInvoice) ...[
                    KeyValue('Paid', money(ro['amount_paid'])),
                    KeyValue('Balance due', money(ro['balance_due']), bold: true, color: toNum(ro['balance_due']) > 0 ? brandRed : Colors.green.shade700),
                  ],
                  if (!isInvoice) ...[
                    const SizedBox(height: 4),
                    SwitchListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      value: ro['customer_supplied_parts'] == true,
                      onChanged: (v) => _patch({'customer_supplied_parts': v}),
                      title: const Text('Customer brought the parts'),
                      subtitle: const Text('Labor isn\'t taxed on labor-only jobs'),
                    ),
                  ],
                ]),
                if (pays.isNotEmpty) ...[
                  const SectionHeader('Payments'),
                  Card(
                    child: Column(children: [
                      for (final p in pays)
                        ListTile(
                          leading: const Icon(Icons.payments_outlined, color: Colors.green),
                          title: Text(money(p['amount'])),
                          subtitle: Text('${payMethods[p['method']] ?? p['method']} · ${fmtDate(p['received_at'])}${p['reference'] != null ? ' · ${p['reference']}' : ''}'),
                        ),
                    ]),
                  ),
                ],
                if (!isCredit && ro['stock_vehicle_id'] == null) ...[
                  const SectionHeader('Customer signatures'),
                  _sigTile(ro, sigs, 'estimate', 'Repair authorization', shop),
                  if (isInvoice && !voided) _sigTile(ro, sigs, 'invoice', 'Work accepted', shop),
                ],
                if (!voided && !isCredit)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
                    child: OutlinedButton.icon(
                      onPressed: () => _notify(ro, shop),
                      icon: const Icon(Icons.notifications_active_outlined),
                      label: const Text('Notify customer'),
                      style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(46)),
                    ),
                  ),
              ]),
            ),
          );
        },
      );

  String _qty(Map it) {
    final q = toNum(it['quantity']);
    final s = q == q.roundToDouble() ? q.toInt().toString() : q.toString();
    return it['kind'] == 'labor' ? '$s hr' : s;
  }

  Widget _customerCard(Map ro) {
    final c = ro['customer'] as Map?;
    final v = ro['vehicle'] as Map?;
    return Card(
      child: Column(children: [
        ListTile(
          leading: const Icon(Icons.person_outline, color: brandBlue),
          title: Text(customerName(c), style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: c?['phone'] != null ? Text(phoneFmt(c!['phone'])) : null,
          trailing: c == null
              ? null
              : Row(mainAxisSize: MainAxisSize.min, children: [
                  if (c['phone'] != null) IconButton(icon: const Icon(Icons.call_outlined), onPressed: () => callPhone(c['phone'])),
                  if (c['phone'] != null) IconButton(icon: const Icon(Icons.sms_outlined), onPressed: () => textPhone(c['phone'])),
                  if (c['email'] != null) IconButton(icon: const Icon(Icons.email_outlined), onPressed: () => emailTo(c['email'])),
                ]),
          onTap: c == null ? null : () => push(context, CustomerScreen(id: '${c['id']}')),
        ),
        if (v != null)
          ListTile(
            leading: const Icon(Icons.directions_car_outlined, color: brandBlue),
            title: Text(vehicleName(v)),
            subtitle: Text([v['license_plate'], v['vin'], if (ro['mileage_in'] != null) '${ro['mileage_in']} mi in'].where((x) => x != null && '$x'.isNotEmpty).join(' · ')),
          ),
      ]),
    );
  }

  Widget _sigTile(Map ro, List<Map> sigs, String kind, String title, Map shop) {
    final sg = sigs.where((s) => s['kind'] == kind).firstOrNull;
    final onlineApproval = kind == 'estimate' && sg == null && ro['approved_by_name'] != null;
    return Card(
      child: ListTile(
        leading: Icon(sg != null || onlineApproval ? Icons.verified_outlined : Icons.draw_outlined, color: sg != null || onlineApproval ? Colors.green : Colors.orange),
        title: Text(title),
        subtitle: Text(sg != null
            ? '${sg['signer_name']} · ${sg['source'] == 'in_shop' ? 'in shop' : 'online'} · ${fmtDateTime(sg['signed_at'])}'
            : onlineApproval
                ? 'Approved online by ${ro['approved_by_name']}'
                : 'Not signed yet'),
        trailing: sg == null ? FilledButton.tonal(onPressed: () => _sign(ro, kind), child: const Text('Sign now')) : null,
      ),
    );
  }

  // ------------------------------------------------------------- actions
  Future<void> _setStatus(Map ro, String status, Map shop) async {
    final patch = <String, dynamic>{'status': status};
    if (status == 'approved' && ro['approved_at'] == null) patch['approved_at'] = DateTime.now().toUtc().toIso8601String();
    await _patch(patch, 'Status → ${roStatus[status]?.$1 ?? status}');
    if (status == 'ready' && ro['customer'] != null && mounted) {
      final fresh = await db.from('repair_orders').select(_roSelect).eq('id', widget.id).single();
      if (mounted) _notify(fresh, shop, event: 'ready');
    }
  }

  Future<void> _convert(Map ro, Map shop) async {
    final terms = '${ro['terms'] ?? ro['customer']?['default_terms'] ?? shop['default_terms'] ?? 'Due on receipt'}';
    final ok = await confirm(context, 'Convert to invoice?',
        message: 'It gets the next invoice number, dated today, $terms. Any signature on the estimate stays with it.', action: 'Convert');
    if (!ok) return;
    final patch = <String, dynamic>{'invoiced_at': DateTime.now().toUtc().toIso8601String(), 'terms': terms, 'due_date': dueDateFor(terms)};
    if (['estimate', 'approved', 'in_progress', 'waiting_parts'].contains(ro['status'])) patch['status'] = 'ready';
    await _patch(patch, 'Invoice created');
  }

  Future<void> _sign(Map ro, String kind) async {
    final estimate = kind == 'estimate';
    final res = await push<Map>(
      context,
      SignatureScreen(
        title: estimate ? 'Authorize repairs' : 'Accept the work',
        terms: estimate ? authorizationText : acceptanceText,
        name: [ro['customer']?['first_name'], ro['customer']?['last_name']].where((x) => x != null).join(' '),
        amount: money(ro['total']),
      ),
    );
    if (res == null) return;
    try {
      await db.from('document_signatures').insert({
        'repair_order_id': widget.id,
        'kind': kind,
        'signer_name': res['name'],
        'signature': res['signature'],
        'source': 'in_shop',
        'total_at_signing': ro['total'],
        'user_agent': 'Auto Pro Admin app',
      });
      if (estimate && ro['status'] == 'estimate') {
        await db.from('repair_orders').update({'status': 'approved', 'approved_by_name': res['name'], 'approved_at': DateTime.now().toUtc().toIso8601String()}).eq('id', widget.id);
      }
      if (mounted) showMessage(context, estimate ? 'Signed and approved' : 'Signature saved');
    } catch (e) {
      if (mounted) showMessage(context, errorText(e), error: true);
    }
    _reload();
  }

  Future<void> _menu(String v, Map ro, Map shop) async {
    final link = '$siteUrl/i/${ro['public_token']}';
    switch (v) {
      case 'link':
        await openUrl(link);
      case 'copy':
        await Clipboard.setData(ClipboardData(text: link));
        if (mounted) showMessage(context, 'Customer link copied');
      case 'web':
        await openWebAdmin('/admin/repair-orders/${ro['id']}');
      case 'email':
        final to = TextEditingController(text: '${ro['customer']?['email'] ?? ''}');
        final ok = await showDialog<bool>(
          context: context,
          builder: (c) => AlertDialog(
            title: Text(ro['invoiced_at'] != null ? 'Email invoice' : 'Email estimate'),
            content: TextField(controller: to, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Send to')),
            actions: [TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')), FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Send'))],
          ),
        );
        if (ok != true) return;
        try {
          await siteApi('/api/admin/email', {'type': 'repair_order', 'id': ro['id'], 'to': to.text.trim()});
          if (mounted) showMessage(context, 'Sent to ${to.text.trim()}');
          _reload();
        } catch (e) {
          if (mounted) showMessage(context, errorText(e), error: true);
        }
      case 'status':
        final s = await showModalBottomSheet<String>(
          context: context,
          showDragHandle: true,
          builder: (c) => SafeArea(
            child: ListView(shrinkWrap: true, children: [
              for (final e in roStatus.entries)
                ListTile(leading: Icon(Icons.circle, size: 12, color: e.value.$2), title: Text(e.value.$1), trailing: ro['status'] == e.key ? const Icon(Icons.check) : null, onTap: () => Navigator.pop(c, e.key)),
            ]),
          ),
        );
        if (s != null && s != ro['status']) await _setStatus(ro, s, shop);
      case 'void':
        if (await confirm(context, 'Void invoice #${ro['invoice_number']}?', message: 'It keeps its number but no longer counts as owed. A reversing entry is posted.', action: 'Void', danger: true)) {
          await _patch({'voided_at': DateTime.now().toUtc().toIso8601String(), 'status': 'cancelled'}, 'Invoice voided');
        }
    }
  }

  Future<void> _payment(Map ro) async {
    final amount = TextEditingController(text: toNum(ro['balance_due']).toStringAsFixed(2));
    final ref = TextEditingController();
    var method = 'card';
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (c) => StatefulBuilder(
        builder: (c, set) => Padding(
          padding: EdgeInsets.fromLTRB(16, 0, 16, MediaQuery.viewInsetsOf(c).bottom + 16),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text('Record payment', style: Theme.of(c).textTheme.titleLarge),
            const SizedBox(height: 12),
            TextField(controller: amount, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Amount', prefixText: r'$ ')),
            const SizedBox(height: 12),
            Wrap(spacing: 8, runSpacing: 6, children: [
              for (final m in payMethods.entries) ChoiceChip(label: Text(m.value), selected: method == m.key, onSelected: (_) => set(() => method = m.key)),
            ]),
            const SizedBox(height: 12),
            TextField(controller: ref, decoration: const InputDecoration(labelText: 'Reference (check #, last 4…)')),
            const SizedBox(height: 16),
            FilledButton(onPressed: () => Navigator.pop(c, true), style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)), child: const Text('Save payment')),
          ]),
        ),
      ),
    );
    if (ok != true) return;
    final amt = r2(toNum(amount.text));
    if (amt == 0) return;
    try {
      await db.from('payments').insert({'repair_order_id': widget.id, 'amount': amt, 'method': method, 'reference': ref.text.trim().isEmpty ? null : ref.text.trim()});
      if (mounted) showMessage(context, 'Payment of ${money(amt)} recorded');
    } catch (e) {
      if (mounted) showMessage(context, errorText(e), error: true);
    }
    _reload();
  }

  Future<void> _notify(Map ro, Map shop, {String event = 'status'}) async {
    final c = ro['customer'] as Map?;
    if (c == null) return showMessage(context, 'Add a customer first', error: true);
    final ready = event == 'ready' || ro['status'] == 'ready';
    final notify = Map<String, dynamic>.from(shop['notify'] ?? {});
    final template = '${(ready ? notify['ready_template'] : notify['status_template']) ?? (ready ? 'Auto Pro: Hi {first_name}, your {vehicle} is ready for pickup! Total {total}. {link}' : 'Auto Pro: Hi {first_name}, update on your {vehicle}: {status}. Track it here: {link}')}';
    final vars = {
      'first_name': '${c['first_name'] ?? c['company'] ?? 'there'}',
      'name': customerName(c),
      'vehicle': vehicleName(ro['vehicle']).isEmpty ? 'vehicle' : vehicleName(ro['vehicle']),
      'total': money(ro['total']),
      'balance': money(ro['balance_due'] ?? ro['total']),
      'link': '$siteUrl/i/${ro['public_token']}',
      'status': (roStatus[ro['status']]?.$1 ?? '${ro['status']}').toLowerCase(),
      'shop': '${shop['name'] ?? shopName}',
      'shop_phone': '${shop['phone'] ?? '(352) 933-5181'}',
      'ro_number': '${ro['number']}',
      'invoice_number': '${ro['invoice_number'] ?? ''}',
    };
    final text = TextEditingController(text: template.replaceAllMapped(RegExp(r'\{(\w+)\}'), (m) => vars[m.group(1)] ?? m.group(0)!));
    final choice = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (bc) => Padding(
        padding: EdgeInsets.fromLTRB(16, 0, 16, MediaQuery.viewInsetsOf(bc).bottom + 16),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(ready ? 'Tell ${vars['first_name']} it\'s ready' : 'Update ${vars['first_name']}', style: Theme.of(bc).textTheme.titleLarge),
          const SizedBox(height: 12),
          TextField(controller: text, maxLines: 4, decoration: const InputDecoration(labelText: 'Message')),
          const SizedBox(height: 16),
          if (c['phone'] != null)
            FilledButton.icon(onPressed: () => Navigator.pop(bc, 'sms_manual'), icon: const Icon(Icons.sms_outlined), label: const Text('Text from my phone'), style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(46))),
          if (c['email'] != null) ...[
            const SizedBox(height: 8),
            OutlinedButton.icon(onPressed: () => Navigator.pop(bc, 'email'), icon: const Icon(Icons.email_outlined), label: Text('Email ${c['email']}'), style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(46))),
          ],
          TextButton(onPressed: () => Navigator.pop(bc), child: const Text('Not now')),
        ]),
      ),
    );
    if (choice == null) return;
    try {
      if (choice == 'sms_manual') await textPhone(c['phone'], text.text);
      await siteApi('/api/admin/notify', {'roId': ro['id'], 'channels': [choice], 'message': text.text, 'event': ready ? 'ready' : 'status'});
      if (mounted && choice == 'email') showMessage(context, 'Email sent');
    } catch (e) {
      if (mounted) showMessage(context, errorText(e), error: true);
    }
    _reload();
  }

  Future<void> _editItem(Map? it, List<Map> items) async {
    final changed = await push<bool>(context, ItemEditor(roId: widget.id, item: it, position: items.length));
    if (changed == true) _reload();
  }
}

class _EditableText extends StatelessWidget {
  const _EditableText({required this.label, required this.value, required this.onSave});
  final String label;
  final Object? value;
  final void Function(String?) onSave;
  @override
  Widget build(BuildContext context) => InkWell(
        onTap: () async {
          final ctl = TextEditingController(text: '${value ?? ''}');
          final ok = await showDialog<bool>(
            context: context,
            builder: (c) => AlertDialog(
              title: Text(label),
              content: TextField(controller: ctl, maxLines: 5, autofocus: true, textCapitalization: TextCapitalization.sentences),
              actions: [TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')), FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Save'))],
            ),
          );
          if (ok == true) onSave(ctl.text.trim().isEmpty ? null : ctl.text.trim());
        },
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(fontSize: 12.5, color: Colors.black54)),
          const SizedBox(height: 3),
          Text('${value ?? 'Tap to add'}', style: TextStyle(color: value == null ? Colors.black38 : null)),
        ]),
      );
}

// =================================================================== line item editor
class ItemEditor extends StatefulWidget {
  const ItemEditor({super.key, required this.roId, this.item, this.position = 0});
  final String roId;
  final Map? item;
  final int position;
  @override
  State<ItemEditor> createState() => _ItemEditorState();
}

class _ItemEditorState extends State<ItemEditor> {
  late String _kind = '${widget.item?['kind'] ?? 'labor'}';
  late String _fee = '${widget.item?['fee_code'] ?? 'shop_supplies'}';
  late bool _approved = widget.item?['approved'] != false;
  late final _name = TextEditingController(text: '${widget.item?['item_name'] ?? ''}');
  late final _desc = TextEditingController(text: '${widget.item?['description'] ?? ''}');
  late final _qty = TextEditingController(text: widget.item == null ? '1' : '${widget.item!['quantity']}');
  late final _price = TextEditingController(text: widget.item == null ? '' : toNum(widget.item!['unit_price']).toStringAsFixed(2));
  late final _cost = TextEditingController(text: widget.item == null ? '' : toNum(widget.item!['unit_cost']).toStringAsFixed(2));
  late final _partNo = TextEditingController(text: '${widget.item?['part_number'] ?? ''}');
  String? _partId;
  var _busy = false;

  static const _fees = {'shop_supplies': 'Shop supplies', 'disposal': 'Disposal fee', 'tire': 'FL tire fee', 'battery': 'FL battery fee', 'towing': 'Towing', 'other': 'Other'};

  @override
  void initState() {
    super.initState();
    _partId = widget.item?['part_id'];
    if (widget.item == null) _defaults();
  }

  Future<void> _defaults() async {
    final books = await setting('books');
    final shop = await setting('shop');
    final rates = (books['labor_rates'] as List?) ?? [];
    final rate = rates.isNotEmpty ? toNum(rates.first['rate']) : toNum(shop['labor_rate'] ?? 120);
    if (mounted && _kind == 'labor' && _price.text.isEmpty) _price.text = rate.toStringAsFixed(2);
  }

  Future<void> _pickPart() async {
    final parts = await db.from('parts').select('id, name, part_number, unit_price, unit_cost, quantity_on_hand').eq('active', true).order('name');
    if (!mounted) return;
    final p = await showModalBottomSheet<Map>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (c) => SizedBox(
        height: MediaQuery.sizeOf(c).height * .7,
        child: parts.isEmpty
            ? const EmptyState(Icons.inventory_2_outlined, 'No parts in stock yet. Type the part in instead.')
            : ListView(children: [
                for (final p in parts)
                  ListTile(
                    title: Text('${p['name']}'),
                    subtitle: Text('${p['part_number'] ?? ''}  ·  ${toNum(p['quantity_on_hand'])} on hand'),
                    trailing: Text(money(p['unit_price'])),
                    onTap: () => Navigator.pop(c, p),
                  ),
              ]),
      ),
    );
    if (p == null) return;
    setState(() {
      _partId = '${p['id']}';
      _desc.text = '${p['name']}';
      _partNo.text = '${p['part_number'] ?? ''}';
      _price.text = toNum(p['unit_price']).toStringAsFixed(2);
      _cost.text = toNum(p['unit_cost']).toStringAsFixed(2);
    });
  }

  Future<void> _save() async {
    if (_desc.text.trim().isEmpty) return showMessage(context, 'Add a description', error: true);
    setState(() => _busy = true);
    final row = {
      'repair_order_id': widget.roId,
      'kind': _kind,
      'item_name': _name.text.trim().isEmpty ? null : _name.text.trim(),
      'description': _desc.text.trim(),
      'quantity': toNum(_qty.text) == 0 ? 1 : toNum(_qty.text),
      'unit_price': r2(toNum(_price.text)),
      'unit_cost': r2(toNum(_cost.text)),
      'approved': _approved,
      'fee_code': _kind == 'fee' ? _fee : null,
      'labor_type': _kind == 'labor' ? 'hourly' : null,
      'part_id': _kind == 'part' ? _partId : null,
      'part_number': _kind == 'part' && _partNo.text.trim().isNotEmpty ? _partNo.text.trim() : null,
    };
    try {
      if (widget.item == null) {
        await db.from('repair_order_items').insert({...row, 'position': widget.position});
      } else {
        await db.from('repair_order_items').update(row).eq('id', widget.item!['id']);
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showMessage(context, errorText(e), error: true);
      setState(() => _busy = false);
    }
  }

  Future<void> _delete() async {
    if (!await confirm(context, 'Remove this line?', action: 'Remove', danger: true)) return;
    try {
      await db.from('repair_order_items').delete().eq('id', widget.item!['id']);
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showMessage(context, errorText(e), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final amount = toNum(_qty.text) * toNum(_price.text);
    return Scaffold(
      appBar: AppBar(title: Text(widget.item == null ? 'Add line' : 'Edit line'), actions: [
        if (widget.item != null) IconButton(onPressed: _delete, icon: const Icon(Icons.delete_outline)),
      ]),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        SegmentedButton<String>(
          segments: const [
            ButtonSegment(value: 'labor', label: Text('Labor'), icon: Icon(Icons.engineering)),
            ButtonSegment(value: 'part', label: Text('Part'), icon: Icon(Icons.settings)),
            ButtonSegment(value: 'fee', label: Text('Fee')),
            ButtonSegment(value: 'sublet', label: Text('Sublet')),
          ],
          selected: {_kind},
          onSelectionChanged: (s) => setState(() => _kind = s.first),
        ),
        const SizedBox(height: 16),
        if (_kind == 'part')
          OutlinedButton.icon(onPressed: _pickPart, icon: const Icon(Icons.inventory_2_outlined), label: const Text('Pick from parts in stock')),
        if (_kind == 'fee') ...[
          Wrap(spacing: 8, runSpacing: 6, children: [
            for (final f in _fees.entries)
              ChoiceChip(label: Text(f.value), selected: _fee == f.key, onSelected: (_) => setState(() {
                    _fee = f.key;
                    if (_desc.text.isEmpty || _fees.values.contains(_desc.text)) _desc.text = f.value;
                    if (f.key == 'tire') _price.text = '1.00';
                    if (f.key == 'battery') _price.text = '1.50';
                  })),
          ]),
        ],
        const SizedBox(height: 12),
        TextField(controller: _name, decoration: const InputDecoration(labelText: 'Product / service (optional)', hintText: 'e.g. Brakes')),
        const SizedBox(height: 12),
        TextField(controller: _desc, maxLines: 3, minLines: 1, textCapitalization: TextCapitalization.sentences, decoration: InputDecoration(labelText: 'Description', hintText: _kind == 'labor' ? 'Replace front brake pads & rotors' : null)),
        if (_kind == 'part') ...[
          const SizedBox(height: 12),
          TextField(controller: _partNo, decoration: const InputDecoration(labelText: 'Part #')),
        ],
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: TextField(controller: _qty, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: InputDecoration(labelText: _kind == 'labor' ? 'Hours' : 'Qty'), onChanged: (_) => setState(() {}))),
          const SizedBox(width: 12),
          Expanded(child: TextField(controller: _price, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: InputDecoration(labelText: _kind == 'labor' ? 'Rate' : 'Price', prefixText: r'$ '), onChanged: (_) => setState(() {}))),
        ]),
        if (_kind == 'part' || _kind == 'sublet') ...[
          const SizedBox(height: 12),
          TextField(controller: _cost, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Your cost (private)', prefixText: r'$ ')),
        ],
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          value: _approved,
          onChanged: (v) => setState(() => _approved = v),
          title: const Text('Include in total'),
          subtitle: const Text('Turn off for work the customer declined'),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Text('Line total ${money(amount)}', textAlign: TextAlign.end, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        ),
        const Text('Florida tax is figured automatically: when the shop supplies parts the whole job is taxable; labor-only jobs, towing and tire/battery fees aren\'t.',
            style: TextStyle(fontSize: 12, color: Colors.black45)),
        const SizedBox(height: 16),
        FilledButton(onPressed: _busy ? null : _save, style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50)), child: const Text('Save line')),
      ]),
    );
  }
}
