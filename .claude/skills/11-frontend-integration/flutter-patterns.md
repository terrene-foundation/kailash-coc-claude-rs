---
name: flutter-patterns
description: "Flutter implementation patterns for Kailash SDK integration including Riverpod state management, Nexus/DataFlow/Kaizen clients, responsive design, forms, and testing. Use for 'flutter patterns', 'flutter state management', 'flutter Kailash', 'flutter riverpod', or 'flutter design system'."
---

# Flutter Implementation Patterns

## Material Design 3 Theming

```dart
ThemeData appTheme = ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(
    seedColor: Colors.purple,
    brightness: Brightness.light,
  ),
);

class ResponsiveScaffold extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth < 600) return MobileLayout();
        else if (constraints.maxWidth < 1200) return TabletLayout();
        else return DesktopLayout();
      },
    );
  }
}
```

## Kailash SDK Integration

### Nexus API Client

```dart
class NexusClient {
  final Dio _dio = Dio(BaseOptions(
    baseUrl: 'http://localhost:3000',
    connectTimeout: Duration(seconds: 5),
    receiveTimeout: Duration(seconds: 30),
    headers: {'Content-Type': 'application/json'},
  ));

  Future<WorkflowResult> executeWorkflow(
    String workflowId, Map<String, dynamic> parameters,
  ) async {
    try {
      final response = await _dio.post('/workflows/$workflowId/execute', data: parameters);
      return WorkflowResult.fromJson(response.data);
    } on DioException catch (e) {
      throw NexusException('Workflow execution failed: ${e.message}');
    }
  }
}
```

### Riverpod State Management

```dart
final nexusClientProvider = Provider<NexusClient>((ref) => NexusClient());

final workflowListProvider = FutureProvider<List<WorkflowDefinition>>((ref) async {
  final client = ref.watch(nexusClientProvider);
  return client.listWorkflows();
});

final workflowExecutionProvider = StateNotifierProvider<WorkflowExecutionNotifier, AsyncValue<WorkflowResult>>((ref) {
  return WorkflowExecutionNotifier(ref.watch(nexusClientProvider));
});

class WorkflowExecutionNotifier extends StateNotifier<AsyncValue<WorkflowResult>> {
  final NexusClient _client;
  WorkflowExecutionNotifier(this._client) : super(const AsyncValue.loading());

  Future<void> executeWorkflow(String id, Map<String, dynamic> params) async {
    state = const AsyncValue.loading();
    try {
      final result = await _client.executeWorkflow(id, params);
      state = AsyncValue.data(result);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }
}
```

### Kaizen AI Chat Interface

```dart
class KaizenChatScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<KaizenChatScreen> createState() => _KaizenChatScreenState();
}

class _KaizenChatScreenState extends ConsumerState<KaizenChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final List<ChatMessage> _messages = [];

  void _sendMessage() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _messages.add(ChatMessage(text: text, isUser: true, timestamp: DateTime.now()));
    });
    _controller.clear();

    ref.read(kaizenChatProvider.notifier).sendMessage(text).then((response) {
      setState(() {
        _messages.add(ChatMessage(text: response, isUser: false, timestamp: DateTime.now()));
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Kaizen AI Chat')),
      body: Column(
        children: [
          Expanded(child: ListView.builder(
            itemCount: _messages.length,
            itemBuilder: (context, index) => ChatBubble(message: _messages[index]),
          )),
          ChatInput(controller: _controller, onSend: _sendMessage),
        ],
      ),
    );
  }
}
```

## Architecture: Feature-Based Structure

```
lib/
  main.dart
  core/
    providers/       # Global Riverpod providers
    models/          # Shared data models
    services/        # API clients (Nexus, DataFlow, Kaizen)
  features/
    workflows/
      presentation/  # UI widgets
      providers/     # Feature-specific providers
    dataflow/
    kaizen/
  shared/
    widgets/         # Reusable UI components
    theme/           # App theming
```

## Testing Patterns

```dart
void main() {
  test('workflow execution provider updates state correctly', () async {
    final container = ProviderContainer();
    await container.read(workflowExecutionProvider.notifier)
        .executeWorkflow('test-workflow', {});
    expect(container.read(workflowExecutionProvider), isA<AsyncData<WorkflowResult>>());
  });

  testWidgets('WorkflowCard displays workflow info', (tester) async {
    await tester.pumpWidget(ProviderScope(
      child: MaterialApp(
        home: WorkflowCard(workflow: WorkflowDefinition(id: 'test', name: 'Test Workflow')),
      ),
    ));
    expect(find.text('Test Workflow'), findsOneWidget);
  });
}
```

<!-- Trigger Keywords: flutter patterns, flutter state management, flutter kailash, flutter riverpod, flutter design system -->
