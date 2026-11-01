import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import 'core.dart';

/// Plain-English categories → chart-of-accounts codes (same list as the website).
const expenseCategories = [
  ('parts', '5000', 'Parts & materials (for a job)'),
  ('parts_stock', '1200', 'Parts for stock (inventory)'),
  ('sublet', '5010', 'Sublet (outside shop)'),
  ('rent', '6000', 'Rent'),
  ('utilities', '6010', 'Utilities'),
  ('tools', '6020', 'Tools & small equipment'),
  ('equipment', '1500', 'Equipment over \$2,500'),
  ('insurance', '6030', 'Insurance'),
  ('advertising', '6040', 'Advertising'),
  ('software', '6050', 'Software & subscriptions'),
  ('repairs', '6060', 'Repairs & maintenance'),
  ('licenses', '6070', 'Licenses & fees'),
  ('contract_labor', '6080', 'Contract labor'),
  ('office', '6100', 'Office'),
  ('vehicle', '6110', 'Vehicle expense (gas, tolls)'),
  ('meals', '6120', 'Meals (50%)'),
  ('bank_fees', '6130', 'Bank & card fees'),
  ('shop_supplies', '6160', 'Shop supplies'),
  ('interest', '6150', 'Interest'),
  ('other', '6900', 'Other'),
  ('draw', '3100', 'Owner draw (personal)'),
];
const _useTaxCodes = {'6020', '1500', '6060', '6100', '6160', '6900'};
const paidFrom = {'1010': 'Business checking', '1000': 'Cash', '2300': 'Business credit card', '3000': 'Owner paid personally'};

// =================================================================== tab
class MoneyTab extends StatefulWidget {
  const MoneyTab({super.key});
  @override
  State<MoneyTab> createState() => _MoneyTabState();
}

class _MoneyTabState extends State<MoneyTab> {
  var _view = 'expenses';
  late Future<List<Map>> _rows = _load();

  Future<List<Map>> _load() async {
    final now = DateTime.now();
    var q = db.from('expenses').select('*, vendor:vendors(name), lines:expense_lines(account_id, amount, description)');
    if (_view == 'bills') {
      q = q.eq('status', 'unpaid').isFilter('voided_at', null);
      return List<Map>.from(await q.order('due_date', nullsFirst: false));
    }
    q = q.gte('expense_date', isoDate(DateTime(now.year, now.month - 2, 1)));
    return List<Map>.from(await q.order('expense_date', ascending: false).limit(300));
  }

  void _reload() => setState(() => _rows = _load());

  Future<void> _edit([Map? e, bool snap = false, bool bill = false]) async {
    await push(context, ExpenseEditor(expense: e, snapFirst: snap, bill: bill));
    _reload();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Money'), actions: [
          IconButton(tooltip: 'Add bill', icon: const Icon(Icons.event_note_outlined), onPressed: () => _edit(null, false, true)),
          IconButton(tooltip: 'Add expense', icon: const Icon(Icons.add), onPressed: () => _edit()),
        ]),
        floatingActionButton: FloatingActionButton.extended(onPressed: () => _edit(null, true), icon: const Icon(Icons.document_scanner_outlined), label: const Text('Snap receipt')),
        body: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
            child: SegmentedButton<String>(
              segments: const [ButtonSegment(value: 'expenses', label: Text('Expenses')), ButtonSegment(value: 'bills', label: Text('Bills to pay'))],
              selected: {_view},
              onSelectionChanged: (s) => setState(() {
                _view = s.first;
                _rows = _load();
              }),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async => _reload(),
              child: Loader(
                future: _rows,
                builder: (c, rows) {
                  if (rows.isEmpty) {
                    return ListView(children: [
                      EmptyState(_view == 'bills' ? Icons.check_circle_outline : Icons.receipt_long_outlined,
                          _view == 'bills' ? 'No unpaid bills.' : 'No expenses yet.\nTap Snap receipt to add one in seconds.'),
                    ]);
                  }
                  final today = isoDate(DateTime.now());
                  final monthKey = today.substring(0, 7);
                  final thisMonth = rows.where((e) => '${e['expense_date']}'.startsWith(monthKey) && e['voided_at'] == null).fold<num>(0, (s, e) => s + toNum(e['total']));
                  return ListView(padding: const EdgeInsets.only(bottom: 90), children: [
                    if (_view == 'expenses')
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                        child: Text('This month: ${money(thisMonth)}', style: const TextStyle(fontWeight: FontWeight.w600, color: navy)),
                      ),
                    for (final e in rows)
                      Card(
                        child: ListTile(
                          onTap: () => _edit(e),
                          leading: CircleAvatar(
                            backgroundColor: e['status'] == 'unpaid' ? const Color(0xFFFFF1E6) : const Color(0xFFEAF7EE),
                            child: Icon(e['receipt_path'] != null ? Icons.receipt : Icons.payments_outlined, color: e['status'] == 'unpaid' ? Colors.orange.shade800 : Colors.green.shade700, size: 20),
                          ),
                          title: Text('${e['vendor_name'] ?? e['vendor']?['name'] ?? 'Expense'}', style: TextStyle(decoration: e['voided_at'] != null ? TextDecoration.lineThrough : null)),
                          subtitle: Text(e['status'] == 'unpaid'
                              ? 'Due ${fmtDate(e['due_date'])}${e['due_date'] != null && '${e['due_date']}'.compareTo(today) < 0 ? ' · overdue' : ''}'
                              : '${fmtDate(e['expense_date'])}${toNum(e['use_tax_amount']) > 0 ? ' · use tax' : ''}'),
                          trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                            Text(money(e['total']), style: const TextStyle(fontWeight: FontWeight.w600)),
                            if (e['status'] == 'unpaid')
                              GestureDetector(
                                onTap: () async {
                                  await db.from('expenses').update({'status': 'paid', 'paid_at': today, 'paid_from_account_id': e['paid_from_account_id'] ?? await accountId('1010')}).eq('id', e['id']);
                                  if (context.mounted) showMessage(context, 'Marked paid');
                                  _reload();
                                },
                                child: const Text('Mark paid', style: TextStyle(color: brandBlue, fontWeight: FontWeight.w600, fontSize: 12.5)),
                              ),
                          ]),
                        ),
                      ),
                  ]);
                },
              ),
            ),
          ),
        ]),
      );
}

// =================================================================== editor
class ExpenseEditor extends StatefulWidget {
  const ExpenseEditor({super.key, this.expense, this.snapFirst = false, this.bill = false});
  final Map? expense;
  final bool snapFirst;
  final bool bill;
  @override
  State<ExpenseEditor> createState() => _ExpenseEditorState();
}

class _ExpenseEditorState extends State<ExpenseEditor> {
  final _vendor = TextEditingController();
  final _amount = TextEditingController();
  final _tax = TextEditingController();
  final _memo = TextEditingController();
  final _ref = TextEditingController();
  var _category = 'parts';
  var _paidFrom = '1010';
  var _unpaid = false;
  var _useTax = false;
  DateTime _date = DateTime.now();
  DateTime? _due;
  String? _receiptPath;
  Map? _ocr;
  ImageProvider? _preview;
  var _reading = false;
  var _busy = false;

  bool get _editing => widget.expense != null;

  @override
  void initState() {
    super.initState();
    final e = widget.expense;
    if (e != null) {
      _vendor.text = '${e['vendor_name'] ?? e['vendor']?['name'] ?? ''}';
      _amount.text = toNum(e['total']).toStringAsFixed(2);
      _tax.text = toNum(e['tax_charged']) > 0 ? toNum(e['tax_charged']).toStringAsFixed(2) : '';
      _memo.text = '${e['memo'] ?? ''}';
      _ref.text = '${e['ref_number'] ?? ''}';
      _unpaid = e['status'] == 'unpaid';
      _useTax = toNum(e['use_tax_amount']) > 0;
      _date = parseDate(e['expense_date']) ?? DateTime.now();
      _due = parseDate(e['due_date']);
      _receiptPath = e['receipt_path'];
      _loadCategory(e);
      if (_receiptPath != null) {
        db.storage.from('documents').createSignedUrl(_receiptPath!, 600).then((u) {
          if (mounted) setState(() => _preview = NetworkImage(u));
        }).catchError((_) {});
      }
    } else {
      _unpaid = widget.bill;
      if (widget.bill) _due = DateTime.now().add(const Duration(days: 14));
      if (widget.snapFirst) WidgetsBinding.instance.addPostFrameCallback((_) => _snap());
    }
  }

  Future<void> _loadCategory(Map e) async {
    final lines = (e['lines'] as List?) ?? [];
    if (lines.isEmpty) return;
    final rows = await db.from('accounts').select('id, code');
    final code = rows.firstWhere((a) => a['id'] == lines.first['account_id'], orElse: () => {})['code'];
    final cat = expenseCategories.where((c) => c.$2 == code).firstOrNull;
    final paid = rows.firstWhere((a) => a['id'] == e['paid_from_account_id'], orElse: () => {})['code'];
    if (mounted) setState(() {
      if (cat != null) _category = cat.$1;
      if (paidFrom.containsKey(paid)) _paidFrom = '$paid';
    });
  }

  Future<void> _snap([ImageSource source = ImageSource.camera]) async {
    final file = await ImagePicker().pickImage(source: source, maxWidth: 1600, maxHeight: 1600, imageQuality: 75);
    if (file == null) return;
    final bytes = await file.readAsBytes();
    setState(() {
      _preview = MemoryImage(bytes);
      _reading = true;
    });
    try {
      final now = DateTime.now();
      final path = 'receipts/${now.year}/${now.month.toString().padLeft(2, '0')}/${now.microsecondsSinceEpoch}.jpg';
      await db.storage.from('documents').uploadBinary(path, bytes, fileOptions: const FileOptions(contentType: 'image/jpeg'));
      _receiptPath = path;
      final res = await siteApi('/api/admin/receipt', {'image': base64Encode(bytes), 'mediaType': 'image/jpeg'});
      final d = Map<String, dynamic>.from(res['data'] ?? {});
      if (d['is_receipt'] != true) {
        if (mounted) showMessage(context, 'That doesn\'t look like a receipt — fill it in by hand.');
        return;
      }
      setState(() {
        _ocr = d;
        if (d['vendor'] != null) _vendor.text = '${d['vendor']}';
        if (d['total'] != null) _amount.text = toNum(d['total']).toStringAsFixed(2);
        final tax = toNum(d['tax']);
        _tax.text = tax > 0 ? tax.toStringAsFixed(2) : '';
        if (d['date'] != null) _date = DateTime.tryParse('${d['date']}') ?? _date;
        if (expenseCategories.any((c) => c.$1 == d['category'])) _category = '${d['category']}';
        final code = expenseCategories.firstWhere((c) => c.$1 == _category).$2;
        _useTax = tax == 0 && _useTaxCodes.contains(code);
        if (d['notes'] != null) _memo.text = '${d['notes']}';
      });
    } catch (e) {
      if (mounted) showMessage(context, '${errorText(e)} You can type the details in.');
    } finally {
      if (mounted) setState(() => _reading = false);
    }
  }

  Future<void> _pickDate(bool due) async {
    final d = await showDatePicker(context: context, initialDate: (due ? _due : _date) ?? DateTime.now(), firstDate: DateTime(2020), lastDate: DateTime(2035));
    if (d != null) setState(() => due ? _due = d : _date = d);
  }

  Future<void> _save() async {
    final total = r2(toNum(_amount.text));
    if (_vendor.text.trim().isEmpty) return showMessage(context, 'Who did you pay?', error: true);
    if (total == 0) return showMessage(context, 'Enter the amount', error: true);
    setState(() => _busy = true);
    try {
      final name = _vendor.text.trim();
      final existing = await db.from('vendors').select('id').ilike('name', name).limit(1);
      final catCode = expenseCategories.firstWhere((c) => c.$1 == _category).$2;
      final vendorId = existing.isNotEmpty
          ? existing.first['id']
          : (await db.from('vendors').insert({'name': name, 'default_account_id': await accountId(catCode)}).select('id').single())['id'];
      final useBase = _useTax ? total : 0;
      final row = {
        'kind': _unpaid ? 'bill' : 'expense',
        'vendor_id': vendorId,
        'vendor_name': name,
        'ref_number': _ref.text.trim().isEmpty ? null : _ref.text.trim(),
        'expense_date': isoDate(_date),
        'due_date': _unpaid && _due != null ? isoDate(_due!) : null,
        'total': total,
        'tax_charged': r2(toNum(_tax.text)),
        'use_tax_base': useBase,
        'use_tax_amount': r2(useBase * 0.07),
        'status': _unpaid ? 'unpaid' : 'paid',
        'paid_at': _unpaid ? null : isoDate(_date),
        'paid_from_account_id': await accountId(_paidFrom),
        'memo': _memo.text.trim().isEmpty ? null : _memo.text.trim(),
        'receipt_path': _receiptPath,
        if (_ocr != null) 'ocr': _ocr,
      };
      String id;
      if (_editing) {
        id = '${widget.expense!['id']}';
        await db.from('expenses').update(row).eq('id', id);
        await db.from('expense_lines').delete().eq('expense_id', id);
      } else {
        id = '${(await db.from('expenses').insert(row).select('id').single())['id']}';
      }
      await db.from('expense_lines').insert({
        'expense_id': id,
        'account_id': await accountId(catCode),
        'amount': total,
        'description': _memo.text.trim().isEmpty ? null : _memo.text.trim(),
        'use_taxable': _useTax,
      });
      if (!_editing && _receiptPath != null) {
        await db.from('documents').insert({'entity_type': 'expense', 'entity_id': id, 'kind': 'receipt', 'path': _receiptPath, 'file_name': 'receipt.jpg', 'mime_type': 'image/jpeg'});
      }
      if (mounted) {
        showMessage(context, _unpaid ? 'Bill saved' : 'Expense saved');
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) showMessage(context, errorText(e), error: true);
      setState(() => _busy = false);
    }
  }

  Future<void> _void() async {
    if (!await confirm(context, 'Void this expense?', message: 'It stays on file but no longer counts. A reversing entry is posted today.', action: 'Void', danger: true)) return;
    await db.from('expenses').update({'voided_at': DateTime.now().toUtc().toIso8601String(), 'recurrence': null}).eq('id', widget.expense!['id']);
    if (mounted) Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    final code = expenseCategories.firstWhere((c) => c.$1 == _category).$2;
    return Scaffold(
      appBar: AppBar(title: Text(_editing ? (_unpaid ? 'Bill' : 'Expense') : _unpaid ? 'New bill' : 'New expense'), actions: [
        if (_editing && widget.expense!['voided_at'] == null) IconButton(onPressed: _void, icon: const Icon(Icons.block)),
      ]),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        GestureDetector(
          onTap: () => _snap(),
          onLongPress: () => _snap(ImageSource.gallery),
          child: Container(
            height: _preview == null ? 110 : 220,
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFD5DBE6))),
            clipBehavior: Clip.antiAlias,
            child: Stack(fit: StackFit.expand, children: [
              if (_preview != null) Image(image: _preview!, fit: BoxFit.contain)
              else const Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(Icons.photo_camera_outlined, size: 34, color: brandBlue),
                SizedBox(height: 6),
                Text('Take a photo of the receipt', style: TextStyle(color: Colors.black54)),
                Text('Long-press to pick from gallery', style: TextStyle(color: Colors.black38, fontSize: 12)),
              ]),
              if (_reading)
                Container(
                  color: Colors.black45,
                  child: const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                    CircularProgressIndicator(color: Colors.white),
                    SizedBox(height: 10),
                    Text('Reading receipt…', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                  ])),
                ),
            ]),
          ),
        ),
        if (_ocr != null) const Padding(padding: EdgeInsets.only(top: 8), child: Text('Read from your receipt — check it and save.', style: TextStyle(color: brandBlue))),
        const SizedBox(height: 16),
        SegmentedButton<bool>(
          segments: const [ButtonSegment(value: false, label: Text('Paid already')), ButtonSegment(value: true, label: Text('Bill — pay later'))],
          selected: {_unpaid},
          onSelectionChanged: (s) => setState(() {
            _unpaid = s.first;
            if (_unpaid) _due ??= DateTime.now().add(const Duration(days: 14));
          }),
        ),
        const SizedBox(height: 14),
        TextField(controller: _vendor, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'Vendor', hintText: 'NAPA, AutoZone, Duke Energy…')),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: TextField(controller: _amount, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Total', prefixText: r'$ '))),
          const SizedBox(width: 12),
          Expanded(child: TextField(controller: _tax, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Sales tax on receipt', prefixText: r'$ '))),
        ]),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: _category,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Category'),
          items: [for (final c in expenseCategories) DropdownMenuItem(value: c.$1, child: Text(c.$3))],
          onChanged: (v) => setState(() => _category = v ?? _category),
        ),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: OutlinedButton.icon(onPressed: () => _pickDate(false), icon: const Icon(Icons.event), label: Text(fmtDate(_date)))),
          if (_unpaid) ...[
            const SizedBox(width: 12),
            Expanded(child: OutlinedButton.icon(onPressed: () => _pickDate(true), icon: const Icon(Icons.event_busy), label: Text('Due ${fmtDate(_due)}'))),
          ],
        ]),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: _paidFrom,
          decoration: InputDecoration(labelText: _unpaid ? 'Will pay from' : 'Paid from'),
          items: [for (final p in paidFrom.entries) DropdownMenuItem(value: p.key, child: Text(p.value))],
          onChanged: (v) => setState(() => _paidFrom = v ?? _paidFrom),
        ),
        const SizedBox(height: 12),
        TextField(controller: _ref, decoration: const InputDecoration(labelText: 'Invoice / ref # (optional)')),
        const SizedBox(height: 4),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          value: _useTax,
          onChanged: (v) => setState(() => _useTax = v),
          title: const Text('No Florida tax charged (owe use tax)'),
          subtitle: Text(_useTax
              ? 'Use tax ${money(r2(toNum(_amount.text) * 0.07))} goes on this month\'s DR-15'
              : _useTaxCodes.contains(code) ? 'For tools/supplies bought online or out of state' : 'Only for things the shop uses itself'),
        ),
        TextField(controller: _memo, maxLines: 2, textCapitalization: TextCapitalization.sentences, decoration: const InputDecoration(labelText: 'Notes')),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: _busy || _reading ? null : _save,
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50)),
          child: Text(_unpaid ? 'Save bill' : 'Save expense'),
        ),
      ]),
    );
  }
}
