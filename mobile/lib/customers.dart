import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import 'core.dart';
import 'jobs.dart';

Future<List<Map>> _searchCustomers(String q) async {
  var query = db.from('customers').select('id, first_name, last_name, company, phone, email, default_terms, tax_exempt').eq('is_active', true);
  final t = q.trim().replaceAll(RegExp(r'[%,()]'), ' ');
  if (t.isNotEmpty) {
    final digits = t.replaceAll(RegExp(r'\D'), '');
    query = query.or([
      'first_name.ilike.%$t%', 'last_name.ilike.%$t%', 'company.ilike.%$t%', 'email.ilike.%$t%',
      if (digits.length >= 3) 'phone.ilike.%$digits%',
    ].join(','));
  }
  return List<Map>.from(await query.order('last_name', nullsFirst: false).limit(80));
}

// =================================================================== list (More → Customers)
class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key});
  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  var _q = '';
  late Future<List<Map>> _rows = _searchCustomers('');

  void _search(String v) => setState(() {
        _q = v;
        _rows = _searchCustomers(v);
      });

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Customers')),
        floatingActionButton: FloatingActionButton(
          onPressed: () async {
            final c = await push<Map>(context, const CustomerEditor());
            if (c != null && context.mounted) await push(context, CustomerScreen(id: '${c['id']}'));
            _search(_q);
          },
          child: const Icon(Icons.person_add_alt),
        ),
        body: Column(children: [
          _SearchBox(onChanged: _search),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async => _search(_q),
              child: Loader(
                future: _rows,
                builder: (c, rows) => rows.isEmpty
                    ? ListView(children: const [EmptyState(Icons.people_outline, 'No customers found.')])
                    : ListView(padding: const EdgeInsets.only(bottom: 80), children: [
                        for (final r in rows)
                          Card(
                            child: ListTile(
                              leading: CircleAvatar(backgroundColor: const Color(0xFFEEF3FF), child: Text(customerName(r).substring(0, 1).toUpperCase(), style: const TextStyle(color: brandBlue))),
                              title: Text(customerName(r)),
                              subtitle: Text([phoneFmt(r['phone']), r['email']].where((x) => x != null && '$x'.isNotEmpty).join(' · ')),
                              onTap: () async {
                                await push(context, CustomerScreen(id: '${r['id']}'));
                                _search(_q);
                              },
                            ),
                          ),
                      ]),
              ),
            ),
          ),
        ]),
      );
}

class _SearchBox extends StatelessWidget {
  const _SearchBox({required this.onChanged});
  final void Function(String) onChanged;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
        child: TextField(
          decoration: InputDecoration(
            hintText: 'Search name, phone, email',
            prefixIcon: const Icon(Icons.search),
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
          ),
          onChanged: onChanged,
        ),
      );
}

// =================================================================== picker
class CustomerPicker extends StatefulWidget {
  const CustomerPicker({super.key});
  @override
  State<CustomerPicker> createState() => _CustomerPickerState();
}

class _CustomerPickerState extends State<CustomerPicker> {
  late Future<List<Map>> _rows = _searchCustomers('');
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Choose customer')),
        body: Column(children: [
          _SearchBox(onChanged: (v) => setState(() => _rows = _searchCustomers(v))),
          Card(
            child: ListTile(
              leading: const Icon(Icons.person_add_alt, color: brandBlue),
              title: const Text('New customer'),
              onTap: () async {
                final c = await push<Map>(context, const CustomerEditor());
                if (c != null && context.mounted) Navigator.pop(context, c);
              },
            ),
          ),
          Expanded(
            child: Loader(
              future: _rows,
              builder: (c, rows) => ListView(children: [
                for (final r in rows)
                  ListTile(title: Text(customerName(r)), subtitle: Text(phoneFmt(r['phone'])), onTap: () => Navigator.pop(context, r)),
              ]),
            ),
          ),
        ]),
      );
}

// =================================================================== detail
class CustomerScreen extends StatefulWidget {
  const CustomerScreen({super.key, required this.id});
  final String id;
  @override
  State<CustomerScreen> createState() => _CustomerScreenState();
}

class _CustomerScreenState extends State<CustomerScreen> {
  late Future<Map<String, dynamic>> _data = _load();

  Future<Map<String, dynamic>> _load() async {
    final r = await Future.wait<dynamic>([
      db.from('customers').select().eq('id', widget.id).single(),
      db.from('customer_vehicles').select().eq('customer_id', widget.id).order('created_at'),
      db.from('repair_orders').select('id, number, invoice_number, status, total, balance_due, invoiced_at, voided_at, created_at, payment_status, vehicle:customer_vehicles(year,make,model)')
          .eq('customer_id', widget.id).order('created_at', ascending: false),
    ]);
    return {'c': r[0], 'vehicles': List<Map>.from(r[1]), 'ros': List<Map>.from(r[2])};
  }

  void _reload() => setState(() => _data = _load());

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Customer'), actions: [
          FutureBuilder(
            future: _data,
            builder: (c, s) => s.hasData
                ? IconButton(
                    icon: const Icon(Icons.edit_outlined),
                    onPressed: () async {
                      await push(context, CustomerEditor(customer: s.data!['c']));
                      _reload();
                    })
                : const SizedBox(),
          ),
        ]),
        body: RefreshIndicator(
          onRefresh: () async => _reload(),
          child: Loader(
            future: _data,
            builder: (ctx, d) {
              final c = Map<String, dynamic>.from(d['c']);
              final vehicles = d['vehicles'] as List<Map>;
              final ros = d['ros'] as List<Map>;
              final owed = ros.where((r) => r['invoiced_at'] != null && r['voided_at'] == null).fold<num>(0, (s, r) => s + toNum(r['balance_due']));
              final spent = ros.where((r) => r['invoiced_at'] != null && r['voided_at'] == null).fold<num>(0, (s, r) => s + toNum(r['total']));
              final address = [c['address_street'], c['address_city'], [c['address_state'], c['address_zip']].where((x) => x != null).join(' ')].where((x) => x != null && '$x'.trim().isNotEmpty).join(', ');
              return ListView(padding: const EdgeInsets.only(top: 8, bottom: 24), children: [
                Panel(children: [
                  Text(customerName(c), style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700, color: navy)),
                  if (c['phone'] != null) Text(phoneFmt(c['phone'])),
                  if (c['email'] != null) Text('${c['email']}', style: const TextStyle(color: Colors.black54)),
                  if (address.isNotEmpty) Text(address, style: const TextStyle(color: Colors.black54)),
                  const SizedBox(height: 10),
                  Row(children: [
                    if (c['phone'] != null) Expanded(child: OutlinedButton.icon(onPressed: () => callPhone(c['phone']), icon: const Icon(Icons.call_outlined), label: const Text('Call'))),
                    if (c['phone'] != null) const SizedBox(width: 8),
                    if (c['phone'] != null) Expanded(child: OutlinedButton.icon(onPressed: () => textPhone(c['phone']), icon: const Icon(Icons.sms_outlined), label: const Text('Text'))),
                    if (c['email'] != null) const SizedBox(width: 8),
                    if (c['email'] != null) Expanded(child: OutlinedButton.icon(onPressed: () => emailTo(c['email']), icon: const Icon(Icons.email_outlined), label: const Text('Email'))),
                  ]),
                ]),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Row(children: [
                    Expanded(child: SizedBox(height: 86, child: StatTile('Total spent', money0(spent), icon: Icons.paid_outlined))),
                    const SizedBox(width: 10),
                    Expanded(child: SizedBox(height: 86, child: StatTile('Balance owed', money(owed), icon: Icons.receipt_long_outlined, color: owed > 0 ? brandRed : Colors.green.shade700))),
                  ]),
                ),
                SectionHeader('Vehicles', trailing: TextButton.icon(
                    onPressed: () async {
                      await push(context, VehicleEditor(customerId: widget.id));
                      _reload();
                    },
                    icon: const Icon(Icons.add),
                    label: const Text('Add'))),
                if (vehicles.isEmpty) const Card(child: ListTile(title: Text('No vehicles on file'))),
                for (final v in vehicles)
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.directions_car_outlined, color: brandBlue),
                      title: Text(vehicleName(v)),
                      subtitle: Text([v['license_plate'], v['vin'], v['mileage'] != null ? '${v['mileage']} mi' : null].where((x) => x != null && '$x'.isNotEmpty).join(' · ')),
                      trailing: IconButton(icon: const Icon(Icons.edit_outlined), onPressed: () async {
                        await push(context, VehicleEditor(customerId: widget.id, vehicle: v));
                        _reload();
                      }),
                    ),
                  ),
                SectionHeader('History', trailing: TextButton.icon(
                    onPressed: () async {
                      await push(context, NewRepairOrder(customer: c));
                      _reload();
                    },
                    icon: const Icon(Icons.add),
                    label: const Text('New RO'))),
                if (ros.isEmpty) const Card(child: ListTile(title: Text('No repair orders yet'))),
                for (final r in ros)
                  Card(
                    child: ListTile(
                      title: Text(r['invoiced_at'] != null ? 'Invoice #${r['invoice_number']}' : 'RO #${r['number']}'),
                      subtitle: Text([fmtDate(r['created_at']), vehicleName(r['vehicle'])].where((x) => x.isNotEmpty).join(' · ')),
                      trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                        Text(money(r['total']), style: const TextStyle(fontWeight: FontWeight.w600)),
                        if (r['voided_at'] != null) const Pill('Void', Colors.red) else if (r['invoiced_at'] != null) payPill(r['payment_status']) else roPill(r['status']),
                      ]),
                      onTap: () async {
                        await push(context, RepairOrderScreen(id: '${r['id']}'));
                        _reload();
                      },
                    ),
                  ),
                if ((c['notes'] ?? '').toString().isNotEmpty) ...[const SectionHeader('Notes'), Panel(children: [Text('${c['notes']}')])],
              ]);
            },
          ),
        ),
      );
}

// =================================================================== editors
class CustomerEditor extends StatefulWidget {
  const CustomerEditor({super.key, this.customer});
  final Map? customer;
  @override
  State<CustomerEditor> createState() => _CustomerEditorState();
}

class _CustomerEditorState extends State<CustomerEditor> {
  final _form = GlobalKey<FormState>();
  late final Map<String, TextEditingController> _f = {
    for (final k in ['first_name', 'last_name', 'company', 'phone', 'email', 'address_street', 'address_city', 'address_state', 'address_zip', 'notes'])
      k: TextEditingController(text: '${widget.customer?[k] ?? ''}'),
  };
  late bool _taxExempt = widget.customer?['tax_exempt'] == true;
  var _busy = false;

  Future<void> _save() async {
    if (_f['first_name']!.text.trim().isEmpty && _f['company']!.text.trim().isEmpty) {
      return showMessage(context, 'Enter a first name or company', error: true);
    }
    setState(() => _busy = true);
    String? t(String k) => _f[k]!.text.trim().isEmpty ? null : _f[k]!.text.trim();
    final row = {
      'first_name': t('first_name'), 'last_name': t('last_name'), 'company': t('company'), 'phone': t('phone'),
      'email': t('email')?.toLowerCase(), 'address_street': t('address_street'), 'address_city': t('address_city'),
      'address_state': t('address_state')?.toUpperCase(), 'address_zip': t('address_zip'), 'notes': t('notes'), 'tax_exempt': _taxExempt,
    };
    try {
      final saved = widget.customer == null
          ? await db.from('customers').insert(row).select().single()
          : await db.from('customers').update(row).eq('id', widget.customer!['id']).select().single();
      if (mounted) Navigator.pop(context, saved);
    } catch (e) {
      if (mounted) showMessage(context, errorText(e), error: true);
      setState(() => _busy = false);
    }
  }

  Widget _field(String k, String label, {TextInputType? type, int lines = 1, TextCapitalization cap = TextCapitalization.words}) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextFormField(controller: _f[k], keyboardType: type, maxLines: lines, textCapitalization: cap, decoration: InputDecoration(labelText: label)),
      );

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(widget.customer == null ? 'New customer' : 'Edit customer')),
        body: Form(
          key: _form,
          child: ListView(padding: const EdgeInsets.all(16), children: [
            Row(children: [Expanded(child: _field('first_name', 'First name')), const SizedBox(width: 12), Expanded(child: _field('last_name', 'Last name'))]),
            _field('company', 'Company (optional)'),
            _field('phone', 'Phone', type: TextInputType.phone),
            _field('email', 'Email', type: TextInputType.emailAddress, cap: TextCapitalization.none),
            _field('address_street', 'Street'),
            Row(children: [
              Expanded(flex: 3, child: _field('address_city', 'City')),
              const SizedBox(width: 12),
              Expanded(child: _field('address_state', 'State', cap: TextCapitalization.characters)),
              const SizedBox(width: 12),
              Expanded(flex: 2, child: _field('address_zip', 'ZIP', type: TextInputType.number)),
            ]),
            SwitchListTile(contentPadding: EdgeInsets.zero, value: _taxExempt, onChanged: (v) => setState(() => _taxExempt = v), title: const Text('Tax-exempt'), subtitle: const Text('Resale / exempt organization certificate on file')),
            _field('notes', 'Notes', lines: 3, cap: TextCapitalization.sentences),
            FilledButton(onPressed: _busy ? null : _save, style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50)), child: const Text('Save customer')),
          ]),
        ),
      );
}

class VehiclePicker extends StatelessWidget {
  const VehiclePicker({super.key, required this.customerId});
  final String customerId;
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Choose vehicle')),
        body: Loader(
          future: db.from('customer_vehicles').select().eq('customer_id', customerId).order('created_at'),
          builder: (c, rows) => ListView(children: [
            Card(
              child: ListTile(
                leading: const Icon(Icons.add, color: brandBlue),
                title: const Text('Add a vehicle'),
                onTap: () async {
                  final v = await push<Map>(context, VehicleEditor(customerId: customerId));
                  if (v != null && context.mounted) Navigator.pop(context, v);
                },
              ),
            ),
            for (final v in List<Map>.from(rows))
              Card(
                child: ListTile(
                  leading: const Icon(Icons.directions_car_outlined),
                  title: Text(vehicleName(v)),
                  subtitle: Text([v['license_plate'], v['vin']].where((x) => x != null).join(' · ')),
                  onTap: () => Navigator.pop(context, v),
                ),
              ),
          ]),
        ),
      );
}

class VehicleEditor extends StatefulWidget {
  const VehicleEditor({super.key, required this.customerId, this.vehicle});
  final String customerId;
  final Map? vehicle;
  @override
  State<VehicleEditor> createState() => _VehicleEditorState();
}

class _VehicleEditorState extends State<VehicleEditor> {
  late final Map<String, TextEditingController> _f = {
    for (final k in ['vin', 'year', 'make', 'model', 'trim', 'engine', 'license_plate', 'color', 'mileage']) k: TextEditingController(text: '${widget.vehicle?[k] ?? ''}'),
  };
  var _busy = false;
  var _decoding = false;

  Future<void> _decode() async {
    final vin = _f['vin']!.text.trim().toUpperCase();
    if (vin.length != 17) return showMessage(context, 'A VIN is 17 characters', error: true);
    setState(() => _decoding = true);
    try {
      final res = await http.get(Uri.parse('https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/$vin?format=json'));
      final r = (jsonDecode(res.body)['Results'] as List).first as Map;
      setState(() {
        _f['year']!.text = '${r['ModelYear'] ?? ''}';
        _f['make']!.text = _title('${r['Make'] ?? ''}');
        _f['model']!.text = '${r['Model'] ?? ''}';
        _f['trim']!.text = '${r['Trim'] ?? ''}';
        final disp = '${r['DisplacementL'] ?? ''}';
        final cyl = '${r['EngineCylinders'] ?? ''}';
        _f['engine']!.text = [if (disp.isNotEmpty) '${double.tryParse(disp)?.toStringAsFixed(1) ?? disp}L', if (cyl.isNotEmpty) '$cyl-cyl'].join(' ');
      });
    } catch (_) {
      if (mounted) showMessage(context, 'Couldn\'t decode that VIN', error: true);
    } finally {
      if (mounted) setState(() => _decoding = false);
    }
  }

  String _title(String s) => s.isEmpty ? s : s.split(' ').map((w) => w.isEmpty ? w : w[0] + w.substring(1).toLowerCase()).join(' ');

  Future<void> _save() async {
    String? t(String k) => _f[k]!.text.trim().isEmpty ? null : _f[k]!.text.trim();
    if (t('make') == null && t('vin') == null) return showMessage(context, 'Enter a VIN or the make & model', error: true);
    setState(() => _busy = true);
    final row = {
      'customer_id': widget.customerId, 'vin': t('vin')?.toUpperCase(), 'year': int.tryParse(_f['year']!.text), 'make': t('make'), 'model': t('model'),
      'trim': t('trim'), 'engine': t('engine'), 'license_plate': t('license_plate')?.toUpperCase(), 'color': t('color'),
      'mileage': int.tryParse(_f['mileage']!.text.replaceAll(RegExp(r'\D'), '')),
    };
    try {
      final saved = widget.vehicle == null
          ? await db.from('customer_vehicles').insert(row).select().single()
          : await db.from('customer_vehicles').update(row).eq('id', widget.vehicle!['id']).select().single();
      if (mounted) Navigator.pop(context, saved);
    } catch (e) {
      if (mounted) showMessage(context, errorText(e), error: true);
      setState(() => _busy = false);
    }
  }

  Widget _field(String k, String label, {TextInputType? type, TextCapitalization cap = TextCapitalization.words}) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextField(controller: _f[k], keyboardType: type, textCapitalization: cap, decoration: InputDecoration(labelText: label)),
      );

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(widget.vehicle == null ? 'Add vehicle' : 'Edit vehicle')),
        body: ListView(padding: const EdgeInsets.all(16), children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(child: _field('vin', 'VIN', cap: TextCapitalization.characters)),
            const SizedBox(width: 8),
            FilledButton.tonal(onPressed: _decoding ? null : _decode, child: _decoding ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Decode')),
          ]),
          Row(children: [Expanded(child: _field('year', 'Year', type: TextInputType.number)), const SizedBox(width: 12), Expanded(flex: 2, child: _field('make', 'Make'))]),
          Row(children: [Expanded(child: _field('model', 'Model')), const SizedBox(width: 12), Expanded(child: _field('trim', 'Trim'))]),
          _field('engine', 'Engine'),
          Row(children: [Expanded(child: _field('license_plate', 'Plate', cap: TextCapitalization.characters)), const SizedBox(width: 12), Expanded(child: _field('color', 'Color'))]),
          _field('mileage', 'Mileage', type: TextInputType.number),
          FilledButton(onPressed: _busy ? null : _save, style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50)), child: const Text('Save vehicle')),
        ]),
      );
}
