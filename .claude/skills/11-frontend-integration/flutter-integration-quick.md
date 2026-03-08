---
name: flutter-integration-quick
description: "Flutter + Kailash integration. Use when asking 'flutter integration', 'flutter kailash', or 'mobile kailash'."
---

# Flutter + Kailash Integration

## Quick Setup

### 1. Backend API (Python)

```python
from kailash.nexus import NexusApp
import kailash
import os

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("LLMNode", "chat", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),  # provider auto-detected from model name
    "prompt": "{{input.message}}",
})
wf = builder.build(reg)
rt = kailash.Runtime(reg)

app = NexusApp(preset="standard")

@app.handler("execute")
async def execute(message: str) -> dict:
    result = rt.execute(wf, {"message": message})
    return result["results"]["chat"]

app.start()  # Serves on port 3000
```

### 2. Flutter Frontend

```dart
// lib/services/workflow_service.dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class WorkflowService {
  static const String baseUrl = 'http://localhost:3000';

  Future<Map<String, dynamic>> executeWorkflow(String message) async {
    final response = await http.post(
      Uri.parse('$baseUrl/execute'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'inputs': {'message': message}}),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to execute workflow');
    }
  }
}

// lib/screens/chat_screen.dart
import 'package:flutter/material.dart';
import '../services/workflow_service.dart';

class ChatScreen extends StatefulWidget {
  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _controller = TextEditingController();
  final _service = WorkflowService();
  String _response = '';

  void _sendMessage() async {
    final result = await _service.executeWorkflow(_controller.text);
    setState(() {
      _response = result['outputs']['chat']['response'];
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          TextField(
            controller: _controller,
            decoration: InputDecoration(hintText: 'Ask a question...'),
          ),
          ElevatedButton(
            onPressed: _sendMessage,
            child: Text('Send'),
          ),
          if (_response.isNotEmpty) Text(_response),
        ],
      ),
    );
  }
}
```

<!-- Trigger Keywords: flutter integration, flutter kailash, mobile kailash, flutter workflows -->
