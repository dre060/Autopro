import 'package:flutter/material.dart';

import 'core.dart';
import 'jobs.dart';
import 'money.dart';
import 'more.dart';
import 'tech.dart';
import 'today.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initAutoPro();
  runApp(const AutoProApp());
}

class AutoProApp extends StatelessWidget {
  const AutoProApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Auto Pro Admin',
    debugShowCheckedModeBanner: false,
    theme: autoProTheme(),
    home: demoMode
        ? const AdminHome()
        : StreamBuilder<AuthState>(
            stream: db.auth.onAuthStateChange,
            builder: (c, _) => db.auth.currentSession == null
                ? const SignInScreen()
                : const _StaffGate(),
          ),
  );
}

/// Only emails in public.admin_users get in; the role decides which screens open.
class _StaffGate extends StatelessWidget {
  const _StaffGate();

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Loader(
      future: db.rpc('staff_role'),
      builder: (c, role) => switch (role) {
        'owner' || 'manager' => const AdminHome(),
        'technician' => const TechHome(),
        'bookkeeper' => const BookkeeperHome(),
        _ => Scaffold(
          body: const EmptyState(
            Icons.lock_outline,
            'This account is not on the Auto Pro staff list.\nAsk the owner to add you under Team → App access.',
          ),
          bottomNavigationBar: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: FilledButton(
                onPressed: () => db.auth.signOut(),
                child: const Text('Sign out'),
              ),
            ),
          ),
        ),
      },
    ),
  );
}

class AdminHome extends StatefulWidget {
  const AdminHome({super.key});
  @override
  State<AdminHome> createState() => _AdminHomeState();
}

class _AdminHomeState extends State<AdminHome> {
  var _tab = 0;
  // Bumped when a tab is opened so it reloads data changed on other tabs.
  final _visits = List.filled(5, 0);

  void _select(int i) => setState(() {
    _tab = i;
    _visits[i]++;
  });

  @override
  Widget build(BuildContext context) => Scaffold(
    body: IndexedStack(
      index: _tab,
      children: [
        for (final (i, page) in [
          TodayTab(onTab: _select),
          const JobsTab(),
          const JobsTab(invoices: true),
          const MoneyTab(),
          const MoreTab(),
        ].indexed)
          KeyedSubtree(key: ValueKey('$i-${_visits[i]}'), child: page),
      ],
    ),
    bottomNavigationBar: NavigationBar(
      selectedIndex: _tab,
      onDestinationSelected: _select,
      destinations: const [
        NavigationDestination(
          icon: Icon(Icons.dashboard_outlined),
          selectedIcon: Icon(Icons.dashboard),
          label: 'Today',
        ),
        NavigationDestination(
          icon: Icon(Icons.build_outlined),
          selectedIcon: Icon(Icons.build),
          label: 'Jobs',
        ),
        NavigationDestination(
          icon: Icon(Icons.receipt_long_outlined),
          selectedIcon: Icon(Icons.receipt_long),
          label: 'Invoices',
        ),
        NavigationDestination(
          icon: Icon(Icons.payments_outlined),
          selectedIcon: Icon(Icons.payments),
          label: 'Money',
        ),
        NavigationDestination(icon: Icon(Icons.more_horiz), label: 'More'),
      ],
    ),
  );
}

class BookkeeperHome extends StatelessWidget {
  const BookkeeperHome({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Auto Pro'),
      actions: [
        IconButton(
          onPressed: () => db.auth.signOut(),
          icon: const Icon(Icons.logout),
        ),
      ],
    ),
    body: ListView(
      children: [
        const SizedBox(height: 8),
        for (final (t, s, p, i) in [
          (
            'Reports',
            'Profit & loss, balance sheet, aging',
            '/admin/reports',
            Icons.bar_chart,
          ),
          (
            'Florida & income taxes',
            'DR-15 worksheet and IRS estimate',
            '/admin/taxes',
            Icons.account_balance,
          ),
          (
            'Books & ledger',
            'Accounts, ledger, trial balance',
            '/admin/books',
            Icons.menu_book,
          ),
          (
            'Year-end & 1099s',
            'Checklist, 1099-NEC, CPA package',
            '/admin/year-end',
            Icons.event_available,
          ),
        ])
          Card(
            child: ListTile(
              leading: Icon(i, color: brandBlue),
              title: Text(t),
              subtitle: Text(s),
              trailing: const Icon(Icons.open_in_new),
              onTap: () => openWebAdmin(p),
            ),
          ),
      ],
    ),
  );
}

// ---------------------------------------------------------------- sign in
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});
  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  var _busy = false;
  var _hide = true;

  Future<void> _signIn() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await db.auth.signInWithPassword(
        email: _email.text.trim().toLowerCase(),
        password: _password.text,
      );
    } catch (e) {
      if (mounted) showMessage(context, errorText(e), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: navy,
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              children: [
                Image.asset('assets/emblem.png', height: 120),
                const SizedBox(height: 4),
                const Text(
                  'Shop manager',
                  style: TextStyle(color: Colors.white70, letterSpacing: 2),
                ),
                const SizedBox(height: 24),
                Card(
                  margin: EdgeInsets.zero,
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Form(
                      key: _form,
                      child: AutofillGroup(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'Sign in',
                              style: Theme.of(context).textTheme.headlineSmall
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _email,
                              decoration: const InputDecoration(
                                labelText: 'Email',
                                prefixIcon: Icon(Icons.mail_outline),
                              ),
                              keyboardType: TextInputType.emailAddress,
                              autofillHints: const [AutofillHints.email],
                              validator: (v) => (v ?? '').contains('@')
                                  ? null
                                  : 'Enter your email',
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _password,
                              obscureText: _hide,
                              autofillHints: const [AutofillHints.password],
                              onFieldSubmitted: (_) => _signIn(),
                              decoration: InputDecoration(
                                labelText: 'Password',
                                prefixIcon: const Icon(Icons.lock_outline),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _hide
                                        ? Icons.visibility
                                        : Icons.visibility_off,
                                  ),
                                  onPressed: () =>
                                      setState(() => _hide = !_hide),
                                ),
                              ),
                              validator: requiredField,
                            ),
                            const SizedBox(height: 20),
                            FilledButton(
                              onPressed: _busy ? null : _signIn,
                              style: FilledButton.styleFrom(
                                minimumSize: const Size.fromHeight(48),
                              ),
                              child: _busy
                                  ? const SizedBox.square(
                                      dimension: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Text('Sign in'),
                            ),
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: () => openWebAdmin('/admin/login'),
                              child: const Text(
                                'No password yet? Get an email link on the website',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}
