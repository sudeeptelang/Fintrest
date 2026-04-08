import 'package:flutter_test/flutter_test.dart';
import 'package:fintrest/main.dart';

void main() {
  testWidgets('App starts and shows login', (WidgetTester tester) async {
    await tester.pumpWidget(const FintrestApp());
    expect(find.text('Welcome back'), findsOneWidget);
  });
}
