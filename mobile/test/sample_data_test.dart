import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:autopro_admin/demo.dart';

const base = 'https://x.supabase.co';

Future<dynamic> call(http.Client c, String method, String path, [Object? body]) async {
  final req = http.Request(method, Uri.parse('$base$path'));
  if (body != null) req.body = jsonEncode(body);
  return jsonDecode(await (await c.send(req)).stream.bytesToString());
}

void main() {
  group('SampleRouter', () {
    late List<String> realCalls;
    late MockClient real;
    setUp(() {
      realCalls = [];
      real = MockClient((r) async {
        realCalls.add(r.url.path);
        return http.Response('{"from":"real"}', 200);
      });
    });

    test('other staff always reach the real server', () async {
      final c = SampleRouter(() => false, real: real);
      await call(c, 'GET', '/rest/v1/customers');
      await call(c, 'POST', '/rest/v1/rpc/staff_role', {});
      expect(realCalls, ['/rest/v1/customers', '/rest/v1/rpc/staff_role']);
    });

    test('review account data never reaches the real server, but sign-in does', () async {
      final c = SampleRouter(() => true, real: real);
      final customers = await call(c, 'GET', '/rest/v1/customers');
      expect(customers, isNotEmpty);
      expect(customers.every((r) => '${r['email']}'.contains('example')), isTrue);
      await call(c, 'POST', '/rest/v1/payments', {'repair_order_id': 'r5', 'amount': 1});
      await call(c, 'POST', '/storage/v1/object/documents/a.jpg', {});
      expect(realCalls, isEmpty);
      await call(c, 'POST', '/auth/v1/token', {});
      expect(realCalls, ['/auth/v1/token']);
    });

    test('checks the signed-in user on every request', () async {
      var review = true;
      final c = SampleRouter(() => review, real: real);
      await call(c, 'GET', '/rest/v1/customers');
      review = false;
      await call(c, 'GET', '/rest/v1/customers');
      expect(realCalls, ['/rest/v1/customers']);
    });
  });

  group('DemoClient writes', () {
    final c = DemoClient();
    Future<Map> ro(String id) async => (await call(c, 'GET', '/rest/v1/repair_orders?id=eq.$id')).first;

    test('a new estimate can be opened, priced, invoiced and paid', () async {
      final created = (await call(c, 'POST', '/rest/v1/repair_orders', {'customer_id': 'c1', 'vehicle_id': 'v1', 'status': 'estimate'})).first;
      final id = created['id'];
      expect(id, isNotNull);
      expect((await ro(id))['customer']['first_name'], 'Marcus');

      final item = (await call(c, 'POST', '/rest/v1/repair_order_items', {'repair_order_id': id, 'kind': 'part', 'quantity': 2, 'unit_price': 50})).first;
      expect((await ro(id))['parts_total'], 100);
      expect((await ro(id))['total'], 107);

      await call(c, 'PATCH', '/rest/v1/repair_order_items?id=eq.${item['id']}', {'quantity': 1});
      expect((await ro(id))['parts_total'], 50);

      await call(c, 'PATCH', '/rest/v1/repair_orders?id=eq.$id', {'invoiced_at': '2026-11-05T12:00:00Z'});
      final inv = await ro(id);
      expect(inv['invoice_number'], greaterThan(1124));
      expect(inv['balance_due'], 53.5);

      await call(c, 'POST', '/rest/v1/payments', {'repair_order_id': id, 'amount': 53.5, 'method': 'cash'});
      expect((await ro(id))['payment_status'], 'paid');

      await call(c, 'DELETE', '/rest/v1/repair_order_items?id=eq.${item['id']}');
      expect((await ro(id))['parts_total'], 0);
    });

    test('expense categories find a ledger account', () async {
      expect((await call(c, 'GET', '/rest/v1/accounts?code=eq.5000')).first['id'], 'acct-5000');
    });

    test('tables with no sample rows accept writes', () async {
      final row = (await call(c, 'POST', '/rest/v1/expense_lines', {'expense_id': 'e1', 'amount': 5})).first;
      expect(row['id'], isNotNull);
    });
  });
}
