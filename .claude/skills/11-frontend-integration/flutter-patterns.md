# Flutter Integration Patterns for Kailash Rust SDK

Flutter UI patterns for apps backed by the Kailash Rust SDK -- Riverpod state management, Nexus/DataFlow/Kaizen clients, FFI/platform channels, responsive design, forms, and testing.

## Material Design 3 Theming

```dart
ThemeData appTheme = ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(seedColor: Colors.purple, brightness: Brightness.light),
);
```

## Kailash SDK Integration

### Nexus API Client

```dart
class NexusClient {
  final Dio _dio = Dio(BaseOptions(
    baseUrl: 'http://localhost:8000',
    connectTimeout: Duration(seconds: 5),
    receiveTimeout: Duration(seconds: 30),
    headers: {'Content-Type': 'application/json'},
  ));

  Future<WorkflowResult> executeWorkflow(String workflowId, Map<String, dynamic> params) async {
    try {
      final response = await _dio.post('/workflows/$workflowId/execute', data: params);
      return WorkflowResult.fromJson(response.data);
    } on DioException catch (e) {
      throw NexusException('Workflow execution failed: ${e.message}');
    }
  }

  Future<List<WorkflowDefinition>> listWorkflows() async {
    final response = await _dio.get('/workflows');
    return (response.data as List).map((json) => WorkflowDefinition.fromJson(json)).toList();
  }
}
```

### Riverpod State Management

```dart
final nexusClientProvider = Provider<NexusClient>((ref) => NexusClient());

final workflowListProvider = FutureProvider<List<WorkflowDefinition>>((ref) async {
  return ref.watch(nexusClientProvider).listWorkflows();
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
      state = AsyncValue.data(await _client.executeWorkflow(id, params));
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }
}
```

### DataFlow List with Pull-to-Refresh

```dart
class DataFlowModelsList extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ref.watch(dataFlowModelsProvider).when(
      data: (models) => RefreshIndicator(
        onRefresh: () => ref.refresh(dataFlowModelsProvider.future),
        child: ListView.builder(itemCount: models.length, itemBuilder: (_, i) => ModelCard(model: models[i])),
      ),
      loading: () => Center(child: CircularProgressIndicator()),
      error: (e, _) => ErrorView(error: e.toString(), onRetry: () => ref.refresh(dataFlowModelsProvider)),
    );
  }
}
```

### Kaizen AI Chat (Optimistic Updates)

```dart
// ConsumerStatefulWidget pattern -- optimistic add on send, append response on complete
void _sendMessage() {
  final text = _controller.text.trim();
  if (text.isEmpty) return;
  setState(() => _messages.add(ChatMessage(text: text, isUser: true, timestamp: DateTime.now())));
  _controller.clear();
  ref.read(kaizenChatProvider.notifier).sendMessage(text).then((response) {
    setState(() => _messages.add(ChatMessage(text: response, isUser: false, timestamp: DateTime.now())));
  });
}

// Layout: Scaffold > Column > [Expanded(ListView.builder), ChatInput]
```

## Platform Channels (Dart-to-Rust Communication)

```dart
class NativeFeatures {
  static const platform = MethodChannel('com.kailash.studio/native');

  Future<String> getDeviceInfo() async {
    try {
      return await platform.invokeMethod('getDeviceInfo');
    } on PlatformException catch (e) {
      return 'Failed to get device info: ${e.message}';
    }
  }

  Future<void> shareWorkflow(WorkflowDefinition workflow) async {
    await platform.invokeMethod('shareWorkflow', {'id': workflow.id, 'name': workflow.name});
  }
}
```

### Rust FFI via flutter_rust_bridge

```dart
// Dart side -- generated bindings, no serialization overhead
import 'package:app/src/rust/api.dart';
final result = await api.executeWorkflow(workflowId: id, params: params);
final models = await api.listDataFlowModels();
final response = await api.kaizenChat(message: userMessage);
```

```rust
// Rust side (src/api.rs) -- exposed to Dart via flutter_rust_bridge
#[flutter_rust_bridge::frb]
pub async fn execute_workflow(workflow_id: String, params: HashMap<String, Value>) -> Result<WorkflowResult> {
    KailashSdk::instance().workflows().execute(&workflow_id, params).await
}
```

## Architecture

```
lib/
  main.dart
  core/
    providers/          # Global Riverpod providers
    models/             # Shared data models
    services/           # API clients (Nexus, DataFlow, Kaizen)
  features/
    workflows/
      presentation/     # screens/ + widgets/
      providers/        # Feature-specific providers
      models/
    dataflow/
    kaizen/
  shared/
    widgets/            # Reusable UI components
    theme/
```

## Responsive Layout

```dart
class Responsive {
  static bool isMobile(BuildContext c) => MediaQuery.of(c).size.width < 600;
  static bool isTablet(BuildContext c) => MediaQuery.of(c).size.width >= 600 && MediaQuery.of(c).size.width < 1200;
  static bool isDesktop(BuildContext c) => MediaQuery.of(c).size.width >= 1200;
}

// Usage: if (Responsive.isMobile(context)) return MobileLayout(); ...
```

## AsyncBuilder (Loading/Error/Empty)

```dart
class AsyncBuilder<T> extends StatelessWidget {
  final AsyncValue<T> asyncValue;
  final Widget Function(T) builder;
  final Widget? loading, empty;
  final Widget Function(Object, StackTrace)? error;

  const AsyncBuilder({required this.asyncValue, required this.builder, this.loading, this.error, this.empty});

  @override
  Widget build(BuildContext context) {
    return asyncValue.when(
      data: (data) => (data is List && data.isEmpty && empty != null) ? empty! : builder(data),
      loading: () => loading ?? Center(child: CircularProgressIndicator()),
      error: (err, stack) => error?.call(err, stack) ?? ErrorView(error: err.toString()),
    );
  }
}
```

## Form Validation

```dart
class WorkflowFormNotifier extends StateNotifier<WorkflowFormState> {
  WorkflowFormNotifier() : super(WorkflowFormState.initial());
  void updateName(String name) => state = state.copyWith(name: name);
  String? validateName() => state.name.isEmpty ? 'Required' : state.name.length < 3 ? 'Min 3 chars' : null;
  bool isValid() => validateName() == null;
}

// Widget: TextFormField(onChanged: notifier.updateName, validator: (_) => notifier.validateName())
// Submit: ElevatedButton(onPressed: notifier.isValid() ? onSave : null, ...)
```

## Navigation (GoRouter)

```dart
final goRouter = GoRouter(routes: [
  GoRoute(path: '/', builder: (_, s) => HomeScreen()),
  GoRoute(path: '/workflows', builder: (_, s) => WorkflowListScreen()),
  GoRoute(path: '/workflows/:id', builder: (_, s) => WorkflowDetailScreen(id: s.pathParameters['id']!)),
  GoRoute(path: '/kaizen/chat', builder: (_, s) => KaizenChatScreen()),
]);
// Navigate: context.go('/workflows/123') or context.push('/kaizen/chat')
```

## Error Handling

```dart
class ErrorHandler {
  void handle(Object error, StackTrace stack, {String? context}) {
    debugPrint('Error in $context: $error\n$stack');
    if (error is DioException) {
      final msg = switch (error.type) {
        DioExceptionType.connectionTimeout => 'Connection timeout.',
        DioExceptionType.connectionError => 'Unable to connect.',
        _ => switch (error.response?.statusCode) {
          401 => 'Unauthorized.', 500 => 'Server error.', _ => 'Network error.',
        },
      };
      _showError(msg);
    } else if (error is NexusException) { _handleNexusError(error); }
    else { _showGenericError(error); }
  }
}
```

## Testing

```dart
// Unit: Riverpod provider state transitions
test('workflow execution updates state', () async {
  final container = ProviderContainer();
  expect(container.read(workflowExecutionProvider), isA<AsyncLoading>());
  await container.read(workflowExecutionProvider.notifier).executeWorkflow('test', {});
  expect(container.read(workflowExecutionProvider), isA<AsyncData<WorkflowResult>>());
});

// Widget: wrap in ProviderScope + MaterialApp
testWidgets('WorkflowCard displays info', (tester) async {
  await tester.pumpWidget(ProviderScope(child: MaterialApp(
    home: WorkflowCard(workflow: WorkflowDefinition(id: 't', name: 'Test', description: 'Desc')),
  )));
  expect(find.text('Test'), findsOneWidget);
});
```

## Design System

```dart
import 'package:[app]/core/design/design_system.dart';
// Colors: AppColors.primary (#1976D2), .secondary (#26A69A), .success | AppColorsDark.textPrimary
// Typography: AppTypography.h1-h4, .bodyLarge/Medium/Small
// Spacing: AppSpacing.xs/sm/md/lg/xl (4-64px), .allMd (EdgeInsets), .gapMd (SizedBox)

AppCard(
  header: Padding(padding: AppSpacing.allMd, child: Text('Title', style: AppTypography.h4)),
  child: Column(children: [
    AppInput(label: 'Name', isRequired: true), AppSpacing.gapMd,
    AppButton.primary(label: 'Save', isFullWidth: true, onPressed: _handleSubmit),
  ]),
);
```

## Performance

- `const` constructors for static subtrees prevent rebuilds
- `ListView.builder` for large lists -- only builds visible items
- `RepaintBoundary` around expensive custom paint widgets
- `CachedNetworkImage` for remote images; `cacheWidth`/`cacheHeight` on assets
