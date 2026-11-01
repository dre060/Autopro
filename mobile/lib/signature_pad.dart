// Draw a signature with a finger or stylus; export as a PNG data URL for
// public.document_signatures (same format the website uses).
import 'dart:convert';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

class SignatureController extends ChangeNotifier {
  final List<List<Offset>> strokes = [];
  Size size = Size.zero;

  bool get isEmpty => strokes.every((s) => s.length < 2);

  void start(Offset p) {
    strokes.add([p]);
    notifyListeners();
  }

  void add(Offset p) {
    if (strokes.isEmpty) return;
    strokes.last.add(p);
    notifyListeners();
  }

  void clear() {
    strokes.clear();
    notifyListeners();
  }

  /// Dark ink on a transparent background, cropped to the signature.
  Future<String?> toDataUrl() async {
    if (isEmpty) return null;
    final pts = strokes.expand((s) => s);
    var minX = double.infinity, minY = double.infinity, maxX = 0.0, maxY = 0.0;
    for (final p in pts) {
      if (p.dx < minX) minX = p.dx;
      if (p.dy < minY) minY = p.dy;
      if (p.dx > maxX) maxX = p.dx;
      if (p.dy > maxY) maxY = p.dy;
    }
    const pad = 10.0, scale = 2.0;
    final w = (maxX - minX + pad * 2), h = (maxY - minY + pad * 2);
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    canvas.scale(scale);
    canvas.translate(pad - minX, pad - minY);
    _paintStrokes(canvas, strokes, const Color(0xFF111827));
    final image = await recorder.endRecording().toImage((w * scale).ceil(), (h * scale).ceil());
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    if (bytes == null) return null;
    return 'data:image/png;base64,${base64Encode(bytes.buffer.asUint8List())}';
  }
}

void _paintStrokes(Canvas canvas, List<List<Offset>> strokes, Color color) {
  final paint = Paint()
    ..color = color
    ..strokeWidth = 2.6
    ..strokeCap = StrokeCap.round
    ..strokeJoin = StrokeJoin.round
    ..style = PaintingStyle.stroke;
  for (final s in strokes) {
    if (s.length == 1) {
      canvas.drawCircle(s.first, 1.3, paint..style = PaintingStyle.fill);
      paint.style = PaintingStyle.stroke;
      continue;
    }
    final path = Path()..moveTo(s.first.dx, s.first.dy);
    for (var i = 1; i < s.length; i++) {
      final mid = Offset((s[i - 1].dx + s[i].dx) / 2, (s[i - 1].dy + s[i].dy) / 2);
      path.quadraticBezierTo(s[i - 1].dx, s[i - 1].dy, mid.dx, mid.dy);
    }
    path.lineTo(s.last.dx, s.last.dy);
    canvas.drawPath(path, paint);
  }
}

class SignaturePad extends StatelessWidget {
  const SignaturePad({super.key, required this.controller, this.height = 180});
  final SignatureController controller;
  final double height;

  @override
  Widget build(BuildContext context) {
    final box = Container(
          height: height.isFinite ? height : null,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFCBD5E1), width: 1.5),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Listener(
              onPointerDown: (e) => controller.start(e.localPosition),
              onPointerMove: (e) => controller.add(e.localPosition),
              child: AnimatedBuilder(
                animation: controller,
                builder: (c, _) => CustomPaint(
                  painter: _Painter(controller),
                  child: controller.isEmpty
                      ? const Center(child: Text('Sign here', style: TextStyle(color: Colors.black26, fontSize: 16)))
                      : const SizedBox.expand(),
                ),
              ),
            ),
          ),
        );
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      if (height.isFinite) box else Expanded(child: box),
      Align(alignment: Alignment.centerRight, child: TextButton(onPressed: controller.clear, child: const Text('Clear'))),
    ]);
  }
}

class _Painter extends CustomPainter {
  _Painter(this.c) : super(repaint: c);
  final SignatureController c;
  @override
  void paint(Canvas canvas, Size size) {
    final base = Paint()
      ..color = const Color(0xFFE2E8F0)
      ..strokeWidth = 1;
    canvas.drawLine(Offset(16, size.height - 34), Offset(size.width - 16, size.height - 34), base);
    _paintStrokes(canvas, c.strokes, const Color(0xFF111827));
  }

  @override
  bool shouldRepaint(_Painter old) => true;
}

/// Full-screen signing page to hand to the customer. Returns {name, signature}.
class SignatureScreen extends StatefulWidget {
  const SignatureScreen({super.key, required this.title, required this.terms, this.name = '', this.amount});
  final String title;
  final String terms;
  final String name;
  final String? amount;
  @override
  State<SignatureScreen> createState() => _SignatureScreenState();
}

class _SignatureScreenState extends State<SignatureScreen> {
  final _sig = SignatureController();
  late final _name = TextEditingController(text: widget.name);
  var _agree = false;
  var _busy = false;

  Future<void> _done() async {
    final m = ScaffoldMessenger.of(context);
    void say(String t) => m.showSnackBar(SnackBar(content: Text(t)));
    if (_name.text.trim().length < 2) return say('Enter the customer name');
    if (_sig.isEmpty) return say('Please sign in the box');
    if (!_agree) return say('Please tick the box to agree');
    setState(() => _busy = true);
    final url = await _sig.toDataUrl();
    if (!mounted) return;
    Navigator.pop(context, {'name': _name.text.trim(), 'signature': url});
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(title: Text(widget.title)),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              if (widget.amount != null)
                Text(widget.amount!, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w700), textAlign: TextAlign.center),
              const SizedBox(height: 8),
              TextField(controller: _name, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'Customer name')),
              const SizedBox(height: 12),
              Expanded(child: SignaturePad(controller: _sig, height: double.infinity)),
              CheckboxListTile(
                value: _agree,
                onChanged: (v) => setState(() => _agree = v ?? false),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
                title: Text(widget.terms, style: const TextStyle(fontSize: 13)),
              ),
              FilledButton.icon(
                onPressed: _busy ? null : _done,
                icon: const Icon(Icons.draw_outlined),
                label: const Text('Save signature'),
                style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50)),
              ),
            ]),
          ),
        ),
      );
}

const authorizationText =
    'I authorize Auto Pro to perform the repairs listed and agree to pay for them. I understand the shop will contact me for approval before doing any additional work.';
const acceptanceText =
    'I acknowledge the repairs listed were completed and I received my vehicle in satisfactory condition. I agree to pay the balance due.';
