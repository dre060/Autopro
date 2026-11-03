// Demo mode for store screenshots: `flutter run --dart-define=DEMO=true`.
// Skips sign-in and answers every Supabase request from the made-up shop
// below, so no account is needed and no real customer ever appears.
// Release builds never set DEMO, so none of this runs in the store app.
import 'dart:convert';

import 'package:http/http.dart' as http;

const demoMode = bool.fromEnvironment('DEMO');

String _d(int daysAgo) => DateTime.now().subtract(Duration(days: daysAgo)).toIso8601String().substring(0, 10);
String _ts(int daysAgo, [int hour = 10]) {
  final n = DateTime.now().subtract(Duration(days: daysAgo));
  return DateTime(n.year, n.month, n.day, hour).toUtc().toIso8601String();
}

final _customers = [
  {'id': 'c1', 'first_name': 'Marcus', 'last_name': 'Bell', 'phone': '(352) 555-0142', 'email': 'marcus.bell@example.com', 'company': null, 'address_street': '1180 Lakeshore Dr', 'address_city': 'Leesburg', 'address_state': 'FL', 'address_zip': '34748', 'is_active': true, 'default_terms': 'due_on_receipt', 'tax_exempt': false, 'notes': null, 'created_at': _ts(200)},
  {'id': 'c2', 'first_name': 'Dana', 'last_name': 'Ortiz', 'phone': '(352) 555-0187', 'email': 'dana.ortiz@example.com', 'company': null, 'address_street': '42 Palm Ct', 'address_city': 'Tavares', 'address_state': 'FL', 'address_zip': '32778', 'is_active': true, 'default_terms': 'due_on_receipt', 'tax_exempt': false, 'created_at': _ts(150)},
  {'id': 'c3', 'first_name': 'Rick', 'last_name': 'Alvarez', 'phone': '(352) 555-0119', 'email': 'office@lakesidelawn.example', 'company': 'Lakeside Landscaping', 'address_street': '900 Industrial Blvd', 'address_city': 'Leesburg', 'address_state': 'FL', 'address_zip': '34748', 'is_active': true, 'default_terms': 'net_30', 'tax_exempt': false, 'created_at': _ts(400)},
  {'id': 'c4', 'first_name': 'Priya', 'last_name': 'Shah', 'phone': '(407) 555-0163', 'email': 'priya.shah@example.com', 'company': null, 'address_street': '77 Orange Blossom Ln', 'address_city': 'Eustis', 'address_state': 'FL', 'address_zip': '32726', 'is_active': true, 'default_terms': 'due_on_receipt', 'tax_exempt': false, 'created_at': _ts(60)},
  {'id': 'c5', 'first_name': 'Tom', 'last_name': 'Reynolds', 'phone': '(352) 555-0108', 'email': 'tomr@example.com', 'company': null, 'address_street': '5 Hilltop Rd', 'address_city': 'Fruitland Park', 'address_state': 'FL', 'address_zip': '34731', 'is_active': true, 'default_terms': 'due_on_receipt', 'tax_exempt': false, 'created_at': _ts(30)},
];

final _vehicles = [
  {'id': 'v1', 'customer_id': 'c1', 'year': 2018, 'make': 'Ford', 'model': 'F-150 XLT', 'vin': '1FTEW1EP5JFA00001', 'license_plate': 'LKE 4821', 'mileage': 96412, 'color': 'Blue', 'created_at': _ts(200)},
  {'id': 'v2', 'customer_id': 'c2', 'year': 2016, 'make': 'Honda', 'model': 'Accord EX', 'vin': '1HGCR2F80GA000002', 'license_plate': 'PLM 0193', 'mileage': 121880, 'color': 'Silver', 'created_at': _ts(150)},
  {'id': 'v3', 'customer_id': 'c3', 'year': 2014, 'make': 'Chevrolet', 'model': 'Silverado 2500HD', 'vin': '1GC1KVEG0EF000003', 'license_plate': 'LSL 2290', 'mileage': 184300, 'color': 'White', 'created_at': _ts(400)},
  {'id': 'v4', 'customer_id': 'c4', 'year': 2020, 'make': 'Toyota', 'model': 'Camry SE', 'vin': '4T1G11AK5LU000004', 'license_plate': 'ORB 7710', 'mileage': 48210, 'color': 'Red', 'created_at': _ts(60)},
  {'id': 'v5', 'customer_id': 'c5', 'year': 2019, 'make': 'Nissan', 'model': 'Rogue SV', 'vin': '5N1AT2MV0KC000005', 'license_plate': 'HTP 3355', 'mileage': 71900, 'color': 'Gray', 'created_at': _ts(30)},
];

Map _cust(String id) => _customers.firstWhere((c) => c['id'] == id);
Map _veh(String id) => _vehicles.firstWhere((v) => v['id'] == id);

Map<String, dynamic> _ro(String id, int number, String cust, String veh, String status,
    {int? invoice, num labor = 0, num parts = 0, num other = 0, num paid = 0, int age = 1, String? complaint, String? diagnosis, int dueIn = 0, String? approvedBy}) {
  final taxable = parts > 0 ? labor + parts + other : 0;
  final state = (taxable * 0.06 * 100).round() / 100, surtax = (taxable * 0.01 * 100).round() / 100;
  final total = labor + parts + other + state + surtax;
  final invoiced = invoice != null;
  return {
    'id': id, 'number': number, 'invoice_number': invoice, 'status': status, 'doc_type': invoiced ? 'invoice' : (status == 'estimate' ? 'estimate' : 'repair_order'),
    'labor_total': labor, 'parts_total': parts, 'other_total': other, 'discount_amount': 0, 'tax_state': state, 'tax_surtax': surtax, 'tax_charged': state + surtax,
    'surtax_county': 'Lake', 'total': total, 'amount_paid': paid, 'balance_due': invoiced ? total - paid : 0,
    'payment_status': !invoiced ? 'unpaid' : (paid >= total ? 'paid' : (paid > 0 ? 'partial' : 'unpaid')),
    'due_date': invoiced ? _d(-dueIn) : null, 'invoiced_at': invoiced ? _ts(age) : null, 'voided_at': null, 'created_at': _ts(age + 1, 9), 'promised_at': _ts(-1, 16),
    'complaint': complaint, 'diagnosis': diagnosis, 'recommendations': null, 'mileage_in': _veh(veh)['mileage'], 'terms': 'due_on_receipt', 'public_token': 'demo$number',
    'approved_by_name': approvedBy, 'approved_at': approvedBy != null ? _ts(age) : null, 'customer_notified_at': null, 'stock_vehicle_id': null,
    'customer_id': cust, 'vehicle_id': veh, 'customer': _cust(cust), 'vehicle': _veh(veh), 'notes': null, 'customer_supplied_parts': false,
  };
}

final _ros = [
  _ro('r1', 1048, 'c1', 'v1', 'in_progress', labor: 285, parts: 412.6, age: 0, complaint: 'Grinding noise when braking, pulls left', diagnosis: 'Front pads at 2 mm, rotors scored, left caliper sticking', approvedBy: 'Marcus Bell'),
  _ro('r2', 1047, 'c4', 'v4', 'ready', labor: 95, parts: 64.9, age: 1, complaint: 'Oil change and tire rotation', approvedBy: 'Priya Shah'),
  _ro('r3', 1046, 'c3', 'v3', 'waiting_parts', labor: 640, parts: 1185, age: 2, complaint: 'Transmission slipping in 3rd gear', diagnosis: 'Shift solenoid pack failed; ordering from dealer'),
  _ro('r4', 1045, 'c5', 'v5', 'estimate', labor: 380, parts: 289.99, age: 0, complaint: 'A/C blowing warm air', diagnosis: 'Compressor clutch worn, low refrigerant'),
  _ro('r5', 1044, 'c2', 'v2', 'completed', invoice: 1124, labor: 190, parts: 238.4, paid: 0, age: 3, complaint: 'Check engine light, rough idle', dueIn: 4),
  _ro('r6', 1043, 'c3', 'v3', 'completed', invoice: 1123, labor: 450, parts: 315, paid: 0, age: 12, complaint: 'Fleet service — brakes and fluids', dueIn: 18),
  _ro('r7', 1042, 'c1', 'v1', 'completed', invoice: 1122, labor: 120, parts: 89.5, paid: 224.17, age: 20, complaint: 'Battery and alternator test'),
];

final _items = [
  {'id': 'i1', 'repair_order_id': 'r1', 'kind': 'labor', 'description': 'Replace front brake pads and rotors', 'quantity': 1.8, 'unit_price': 125, 'taxable': true, 'approved': true, 'position': 1},
  {'id': 'i2', 'repair_order_id': 'r1', 'kind': 'labor', 'description': 'Replace left front caliper, bleed brakes', 'quantity': 0.5, 'unit_price': 120, 'taxable': true, 'approved': true, 'position': 2},
  {'id': 'i3', 'repair_order_id': 'r1', 'kind': 'part', 'description': 'Ceramic brake pad set — front', 'part_number': 'MKD1414', 'quantity': 1, 'unit_price': 89.99, 'taxable': true, 'approved': true, 'position': 3},
  {'id': 'i4', 'repair_order_id': 'r1', 'kind': 'part', 'description': 'Brake rotor — front', 'part_number': '54183RGS', 'quantity': 2, 'unit_price': 92.5, 'taxable': true, 'approved': true, 'position': 4},
  {'id': 'i5', 'repair_order_id': 'r1', 'kind': 'part', 'description': 'Remanufactured caliper — LF', 'part_number': '18B4651', 'quantity': 1, 'unit_price': 137.61, 'taxable': true, 'approved': true, 'position': 5},
];

final _expenses = [
  {'id': 'e1', 'vendor_name': 'NAPA Auto Parts', 'vendor': {'name': 'NAPA Auto Parts'}, 'expense_date': _d(0), 'total': 412.6, 'status': 'paid', 'category': 'parts', 'use_tax_amount': 0, 'voided_at': null, 'due_date': null, 'lines': []},
  {'id': 'e2', 'vendor_name': 'Duke Energy', 'vendor': {'name': 'Duke Energy'}, 'expense_date': _d(2), 'total': 286.14, 'status': 'unpaid', 'category': 'utilities', 'use_tax_amount': 0, 'voided_at': null, 'due_date': _d(-5), 'lines': []},
  {'id': 'e3', 'vendor_name': 'AutoZone Commercial', 'vendor': {'name': 'AutoZone Commercial'}, 'expense_date': _d(3), 'total': 158.37, 'status': 'paid', 'category': 'parts', 'use_tax_amount': 0, 'voided_at': null, 'lines': []},
  {'id': 'e4', 'vendor_name': 'Shell', 'vendor': {'name': 'Shell'}, 'expense_date': _d(4), 'total': 64.2, 'status': 'paid', 'category': 'fuel', 'use_tax_amount': 0, 'voided_at': null, 'lines': []},
  {'id': 'e5', 'vendor_name': 'Snap-on Tools', 'vendor': {'name': 'Snap-on Tools'}, 'expense_date': _d(8), 'total': 349, 'status': 'unpaid', 'category': 'tools', 'use_tax_amount': 24.43, 'voided_at': null, 'due_date': _d(-12), 'lines': []},
  {'id': 'e6', 'vendor_name': 'Safety-Kleen', 'vendor': {'name': 'Safety-Kleen'}, 'expense_date': _d(11), 'total': 118.5, 'status': 'paid', 'category': 'shop_supplies', 'use_tax_amount': 0, 'voided_at': null, 'lines': []},
];

final _appointments = [
  {'id': 'a1', 'customer_name': 'Jordan Miles', 'service': 'Oil change', 'appointment_date': _d(0), 'appointment_time': '09:00:00', 'status': 'confirmed', 'vehicle_year': 2017, 'vehicle_make': 'Jeep', 'vehicle_model': 'Wrangler', 'customer_phone': '(352) 555-0175'},
  {'id': 'a2', 'customer_name': 'Alicia Grant', 'service': 'Brake inspection', 'appointment_date': _d(0), 'appointment_time': '11:30:00', 'status': 'confirmed', 'vehicle_year': 2015, 'vehicle_make': 'Toyota', 'vehicle_model': 'RAV4', 'customer_phone': '(352) 555-0131'},
  {'id': 'a3', 'customer_name': 'Ben Carter', 'service': 'Check engine light', 'appointment_date': _d(0), 'appointment_time': '14:00:00', 'status': 'pending', 'vehicle_year': 2012, 'vehicle_make': 'Ford', 'vehicle_model': 'Escape', 'customer_phone': '(407) 555-0122'},
];

final _trips = [
  {'id': 't1', 'trip_date': _d(0), 'from_place': 'Shop — 806 Hood Ave, Leesburg', 'to_place': 'NAPA Auto Parts, Leesburg', 'miles': 3.2, 'round_trip': true, 'purpose': 'parts_run'},
  {'id': 't2', 'trip_date': _d(2), 'from_place': 'Shop — 806 Hood Ave, Leesburg', 'to_place': 'Dealer parts counter, Tavares', 'miles': 11.4, 'round_trip': true, 'purpose': 'parts_run'},
  {'id': 't3', 'trip_date': _d(6), 'from_place': 'Shop — 806 Hood Ave, Leesburg', 'to_place': 'Customer test drive', 'miles': 8, 'round_trip': false, 'purpose': 'test_drive'},
];

final _tables = <String, List<Map>>{
  'customers': _customers, 'customer_vehicles': _vehicles, 'repair_orders': _ros, 'repair_order_items': _items,
  'payments': [{'id': 'p1', 'repair_order_id': 'r7', 'amount': 224.17, 'method': 'card', 'received_at': _ts(19)}],
  'document_signatures': [{'repair_order_id': 'r1', 'kind': 'estimate', 'signer_name': 'Marcus Bell', 'signed_at': _ts(0, 9), 'source': 'in_shop', 'signature': null}],
  'expenses': _expenses, 'appointments': _appointments, 'mileage_trips': _trips,
  'contact_messages': [
    {'id': 'm1', 'name': 'Sam Whitaker', 'email': 'sam@example.com', 'phone': '(352) 555-0150', 'subject': 'Quote for timing belt', 'message': 'Hi, how much for a timing belt on a 2011 Honda Odyssey?', 'responded': false, 'created_at': _ts(0, 8)},
  ],
  'tax_rates': [{'code': 'irs_mileage_rate', 'value': 0.725, 'effective_from': '2026-01-01'}],
  'tax_periods': [], 'settings': [], 'accounts': [], 'vendors': [], 'parts': [], 'documents': [],
};

const _dr15Prev = {'gross_sales': 18640.25, 'taxable_sales': 14210.4, 'exempt_sales': 4429.85, 'tax_collected': 994.73, 'use_tax': 24.43, 'govt_fees': 18, 'total_tax_due': 1019.16, 'amount_due_with_fees': 1037.16};
const _dr15Cur = {'gross_sales': 4310.5, 'taxable_sales': 3650.1, 'exempt_sales': 660.4, 'tax_collected': 255.51, 'use_tax': 0, 'govt_fees': 4, 'total_tax_due': 255.51, 'amount_due_with_fees': 259.51};

Object? _rpc(String fn, Map body) {
  switch (fn) {
    case 'staff_role':
      return 'owner';
    case 'gl_summary':
      return [
        {'type': 'income', 'debit': 0, 'credit': 14820},
        {'type': 'cogs', 'debit': 4630, 'credit': 0},
        {'type': 'expense', 'debit': 3105, 'credit': 0},
      ];
    case 'dr15_worksheet':
      final start = DateTime.tryParse('${body['p_start']}');
      final now = DateTime.now();
      return start != null && start.month == now.month && start.year == now.year ? _dr15Cur : _dr15Prev;
    case 'tech_me':
      return {'role': 'owner', 'employee': {'id': 'emp1', 'name': 'Chris Morgan'}, 'open_entry': {'id': 'te1', 'clock_in': DateTime.now().subtract(const Duration(hours: 3, minutes: 12)).toUtc().toIso8601String(), 'repair_order_id': 'r1'}, 'week_hours': 27.5};
    case 'tech_jobs':
      return [
        for (final r in _ros.where((r) => ['approved', 'in_progress', 'waiting_parts', 'ready'].contains(r['status'])))
          {...r, 'customer': '${(r['customer'] as Map)['first_name']} ${(r['customer'] as Map)['last_name']}', 'technician': 'Sam', 'items': _items.where((i) => i['repair_order_id'] == r['id']).toList()}
      ];
  }
  return null;
}

// PostgREST filters: col=op.value
bool _match(Map row, String col, String expr) {
  var neg = false;
  if (expr.startsWith('not.')) {
    neg = true;
    expr = expr.substring(4);
  }
  final dot = expr.indexOf('.');
  if (dot < 0) return true;
  final op = expr.substring(0, dot), val = expr.substring(dot + 1);
  final v = row[col];
  int cmp() {
    final a = num.tryParse('$v'), b = num.tryParse(val);
    return a != null && b != null ? a.compareTo(b) : '$v'.compareTo(val);
  }

  final ok = switch (op) {
    'eq' => '$v' == val,
    'neq' => '$v' != val,
    'gt' => v != null && cmp() > 0,
    'gte' => v != null && cmp() >= 0,
    'lt' => v != null && cmp() < 0,
    'lte' => v != null && cmp() <= 0,
    'is' => val == 'null' ? v == null : '$v' == val,
    'in' => val.replaceAll(RegExp(r'[()"]'), '').split(',').contains('$v'),
    'ilike' => '$v'.toLowerCase().contains(val.replaceAll('*', '').replaceAll('%', '').toLowerCase()),
    _ => true,
  };
  return neg ? !ok : ok;
}

const _reserved = {'select', 'order', 'limit', 'offset', 'on_conflict', 'columns'};

class DemoClient extends http.BaseClient {
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final path = request.url.path;
    final bodyText = request is http.Request ? request.body : '';
    Object? out;
    if (path.contains('/rest/v1/rpc/')) {
      final params = bodyText.isEmpty ? null : jsonDecode(bodyText);
      out = _rpc(path.split('/').last, params is Map ? params : {});
    } else if (path.contains('/rest/v1/')) {
      final table = path.split('/').last;
      if (request.method != 'GET' && request.method != 'HEAD') {
        // Writes are accepted and echoed but not kept.
        final b = bodyText.isEmpty ? {} : jsonDecode(bodyText);
        out = b is List ? b : [b];
      } else {
        var rows = List<Map>.from(_tables[table] ?? const []);
        request.url.queryParameters.forEach((k, v) {
          if (!_reserved.contains(k)) rows = rows.where((r) => _match(r, k, v)).toList();
        });
        out = rows;
      }
      if ((request.headers['Accept'] ?? '').contains('vnd.pgrst.object')) {
        out = (out as List).isEmpty ? null : out.first;
      }
    } else {
      out = {};
    }
    final bytes = utf8.encode(jsonEncode(out));
    return http.StreamedResponse(Stream.value(bytes), 200, headers: {'content-type': 'application/json'}, request: request);
  }
}
