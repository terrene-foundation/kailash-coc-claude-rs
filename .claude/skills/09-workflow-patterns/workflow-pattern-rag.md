---
name: workflow-pattern-rag
description: "RAG (Retrieval Augmented Generation) workflow patterns. Use when asking 'RAG', 'retrieval augmented', 'vector search', 'semantic search', or 'document Q&A'."
---

# RAG Workflow Patterns

Retrieval Augmented Generation patterns for AI-powered document search and Q&A.

> **Skill Metadata**
> Category: `workflow-patterns`
> Priority: `HIGH`
> Related Skills: [`nodes-ai-reference`](../nodes/nodes-ai-reference.md), [`workflow-pattern-ai-document`](workflow-pattern-ai-document.md)
> Related Subagents: `pattern-expert` (RAG workflows), `kaizen-specialist` (AI agents)

## Quick Reference

RAG workflow components:

- **Document ingestion** - Load and chunk documents
- **Embedding generation** - Convert text to vectors
- **Vector storage** - Store in vector database
- **Similarity search** - Find relevant chunks
- **LLM generation** - Generate answers with context

## Pattern 1: Document Ingestion Pipeline

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Load document
builder.add_node("PDFReaderNode", "load_doc", {
    "file_path": "{{input.document_path}}",
    "extract_metadata": True
})

# 2. Split into chunks
builder.add_node("TextChunkerNode", "chunk_text", {
    "input": "{{load_doc.content}}",
    "chunk_size": 512,
    "chunk_overlap": 50,
    "strategy": "semantic"  # Preserve sentence boundaries
})

# 3. Generate embeddings
builder.add_node("EmbeddingNode", "generate_embeddings", {
    "model": "text-embedding-3-small",  # provider auto-detected from model name
    "text": "{{chunk_text.chunks}}"
})

# 4. Store in vector database
builder.add_node("VectorStoreNode", "store_vectors", {
    "collection": "documents",
    "vectors": "{{generate_embeddings.embeddings}}",
    "metadata": {
        "doc_id": "{{input.document_id}}",
        "chunk_index": "{{chunk_text.indices}}",
        "text": "{{chunk_text.chunks}}"
    }
})

builder.connect("load_doc", "content", "chunk_text", "input")
builder.connect("chunk_text", "chunks", "generate_embeddings", "text")
builder.connect("generate_embeddings", "embeddings", "store_vectors", "vectors")

reg = kailash.NodeRegistry()

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg), inputs={
        "document_path": "docs/manual.pdf",
        "document_id": "doc_001"
    })
```

## Pattern 2: RAG Query Pipeline

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Generate query embedding
builder.add_node("EmbeddingNode", "query_embedding", {
    "model": "text-embedding-3-small",  # provider auto-detected from model name
    "text": "{{input.query}}"
})

# 2. Vector similarity search
builder.add_node("VectorSearchNode", "search_similar", {
    "collection": "documents",
    "query_vector": "{{query_embedding.embedding}}",
    "top_k": 5,
    "min_score": 0.7
})

# 3. Rerank results (optional)
builder.add_node("RerankNode", "rerank", {
    "query": "{{input.query}}",
    "documents": "{{search_similar.results}}",
    "model": "rerank-english-v2.0"
})

# 4. Build context prompt
builder.add_node("EmbeddedPythonNode", "build_prompt", {
    "code": """
context = '\n\n'.join([doc['text'] for doc in input])
result = f'''Answer the question based on this context:

Context:
{context}

Question: {query}

Answer:'''
    """,
    "output_vars": ["result"]
})

# 5. Generate answer with LLM
builder.add_node("LLMNode", "generate_answer", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),  # provider auto-detected from model name
    "prompt": "{{build_prompt.result}}",
    "temperature": 0.3
})

builder.connect("query_embedding", "embedding", "search_similar", "query_vector")
builder.connect("search_similar", "results", "rerank", "documents")
builder.connect("rerank", "documents", "build_prompt", "input")
builder.connect("build_prompt", "result", "generate_answer", "prompt")
```

## Pattern 3: Multi-Document RAG

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Query embedding
builder.add_node("EmbeddingNode", "query_embed", {
    "model": "text-embedding-3-small",  # provider auto-detected from model name
    "text": "{{input.query}}"
})

# 2. Search multiple collections in parallel
builder.add_node("VectorSearchNode", "search_docs", {
    "collection": "documents",
    "query_vector": "{{query_embed.embedding}}",
    "top_k": 3
})

builder.add_node("VectorSearchNode", "search_code", {
    "collection": "codebase",
    "query_vector": "{{query_embed.embedding}}",
    "top_k": 3
})

builder.add_node("VectorSearchNode", "search_api", {
    "collection": "api_docs",
    "query_vector": "{{query_embed.embedding}}",
    "top_k": 3
})

# 3. Merge and rerank all results
builder.add_node("MergeNode", "merge_results", {
    "inputs": [
        "{{search_docs.results}}",
        "{{search_code.results}}",
        "{{search_api.results}}"
    ],
    "strategy": "combine"
})

builder.add_node("RerankNode", "rerank_all", {
    "query": "{{input.query}}",
    "documents": "{{merge_results.combined}}",
    "top_k": 5
})

# 4. Generate comprehensive answer
builder.add_node("LLMNode", "generate", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),  # provider auto-detected from model name
    "prompt": """Answer using context from docs, code, and API:

Context: {{rerank_all.documents}}

Question: {{input.query}}

Provide a comprehensive answer with examples."""
})

# Parallel searches
builder.connect("query_embed", "embedding", "search_docs", "query_vector")
builder.connect("query_embed", "embedding", "search_code", "query_vector")
builder.connect("query_embed", "embedding", "search_api", "query_vector")

builder.connect("search_docs", "results", "merge_results", "input_docs")
builder.connect("search_code", "results", "merge_results", "input_code")
builder.connect("search_api", "results", "merge_results", "input_api")

builder.connect("merge_results", "combined", "rerank_all", "documents")
builder.connect("rerank_all", "documents", "generate", "context")
```

## Pattern 4: Conversational RAG with Memory

```python
builder = kailash.WorkflowBuilder()

# 1. Load conversation history
builder.add_node("SQLQueryNode", "load_history", {
    "query": """
        SELECT role, content FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at DESC LIMIT 5
    """,
    "parameters": ["{{input.conversation_id}}"]
})

# 2. Build conversation context
builder.add_node("EmbeddedPythonNode", "build_context", {
    "code": "result = '\\n'.join([f'{m[\"role\"]}: {m[\"content\"]}' for m in input])",
    "output_vars": ["result"]
})

# 3. Embed query with context
builder.add_node("EmbeddingNode", "embed_query", {
    "model": "text-embedding-3-small",  # provider auto-detected from model name
    "text": "{{input.query}} Context: {{build_context.context}}"
})

# 4. Vector search
builder.add_node("VectorSearchNode", "search", {
    "collection": "documents",
    "query_vector": "{{embed_query.embedding}}",
    "top_k": 5
})

# 5. Generate answer with history
builder.add_node("LLMNode", "generate", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),  # provider auto-detected from model name
    "prompt": """Conversation History:
{{build_context.context}}

Relevant Documents:
{{search.results}}

User: {{input.query}}
```
