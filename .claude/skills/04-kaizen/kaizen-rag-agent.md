# RAG Agent Pattern

Retrieval-Augmented Generation implementation.

## Signature

```python
from kailash.kaizen import Signature, InputField, OutputField

class RAGSignature(Signature):
    query = InputField("User query")
    documents = InputField("Retrieved documents as JSON")
    answer = OutputField("Answer based on documents")
    sources = OutputField("Source citations as JSON")
```

## Agent

```python
import json
from kailash.kaizen import BaseAgent

class RAGAgent(BaseAgent):
    def __init__(self, retriever):
        super().__init__(name="rag-agent", model=os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"))
        self.retriever = retriever

    def execute(self, input_data):
        # Implement your own retrieval + LLM call here
        question = input_data if isinstance(input_data, str) else str(input_data)
        docs = self.retriever.search(question, top_k=5)
        # Use your LLM client to generate answer from docs
        return {
            "response": question,
            "documents": docs,
            "document_count": len(docs)
        }
```

> **Note**: `BaseAgent` provides `run()`, `extract_str()`, `extract_dict()`, and `write_to_memory()` convenience methods (P17-002). Override `execute()` with your retrieval and LLM logic.

## References

- **Specialist**: `.claude/agents/frameworks/kaizen-specialist.md`
- **Pattern**: Advanced RAG agent example (retrieval-augmented generation with source citations)
