# RAG Comprehensive Guide

You are an expert in implementing Retrieval Augmented Generation (RAG) systems with Kailash SDK. Guide users through complete RAG implementations from data ingestion to query execution.

## Core Responsibilities

### 1. RAG System Architecture

- Document ingestion and chunking
- Vector embedding generation
- Vector database integration
- Semantic search and retrieval
- LLM integration for generation

### 2. Complete RAG Pipeline

```python
import kailash

# Document Ingestion Workflow
def create_ingestion_workflow():
    builder = kailash.WorkflowBuilder()

    # Read document
    builder.add_node("FileReaderNode", "reader", {
        "file_path": "document.txt"
    })

    # Chunk document
    builder.add_node("EmbeddedPythonNode", "chunker", {
        "code": """
# Split into chunks
text = content
chunk_size = 500
overlap = 50

chunks = []
for i in range(0, len(text), chunk_size - overlap):
    chunk = text[i:i + chunk_size]
    chunks.append({
        'text': chunk,
        'index': len(chunks),
        'start': i,
        'end': i + len(chunk)
    })

result = {'chunks': chunks}
"""
    })

    # Generate embeddings
    builder.add_node("EmbeddedPythonNode", "embedder", {
        "code": """
# Generate embeddings for each chunk
import openai  # or any embedding model

embeddings = []
for chunk in chunks:
    embedding = openai.Embedding.create(
        input=chunk['text'],
        model="text-embedding-ada-002"
    )
    embeddings.append({
        'chunk_index': chunk['index'],
        'embedding': embedding['data'][0]['embedding'],
        'text': chunk['text']
    })

result = {'embeddings': embeddings}
"""
    })

    # Store in vector database
    builder.add_node("EmbeddedPythonNode", "store", {
        "code": """
# Store in vector database (ChromaDB example)
import chromadb

client = chromadb.Client()
collection = client.get_or_create_collection("documents")

for emb in embeddings:
    collection.add(
        embeddings=[emb['embedding']],
        documents=[emb['text']],
        ids=[f"chunk_{emb['chunk_index']}"]
    )

result = {'stored': len(embeddings), 'collection': 'documents'}
"""
    })

    # Connections
    builder.connect("reader", "chunker", "content", "content")
    builder.connect("chunker", "embedder", "result", "chunks")
    builder.connect("embedder", "store", "result", "embeddings")

    return workflow
```

### 3. Query Workflow

```python
import kailash

def create_query_workflow():
    builder = kailash.WorkflowBuilder()

    # Generate query embedding
    builder.add_node("EmbeddedPythonNode", "query_embedder", {
        "code": """
import openai

embedding = openai.Embedding.create(
    input=query,
    model="text-embedding-ada-002"
)

result = {'query_embedding': embedding['data'][0]['embedding']}
"""
    })

    # Search vector database
    builder.add_node("EmbeddedPythonNode", "search", {
        "code": """
import chromadb

client = chromadb.Client()
collection = client.get_collection("documents")

results = collection.query(
    query_embeddings=[query_embedding],
    n_results=5
)

result = {
    'documents': results['documents'][0],
    'distances': results['distances'][0],
    'ids': results['ids'][0]
}
"""
    })

    # Generate answer with LLM
    builder.add_node("LLMNode", "generator", {
        "provider": "openai",
        "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"),
        "messages": []  # Will be constructed dynamically
    })

    builder.add_node("EmbeddedPythonNode", "construct_prompt", {
        "code": """
# Construct prompt with retrieved context
context = '\\n\\n'.join(documents)

prompt = f\"\"\"Answer the question using the following context:

Context:
{context}

Question: {query}

Answer:\"\"\"

result = {'prompt': prompt}
"""
    })

    # Connections
    builder.connect("query_embedder", "search", "result", "query_embedding")
    builder.connect("search", "construct_prompt", "result", "documents")
    builder.connect("construct_prompt", "generator", "prompt", "messages")

    return workflow
```

### 4. Advanced RAG with Reranking

```python
import kailash

def create_reranking_workflow():
    builder = kailash.WorkflowBuilder()

    # Initial retrieval (same as above)
    builder.add_node("EmbeddedPythonNode", "initial_search", {
        "code": """
# Retrieve top 20 candidates
results = collection.query(
    query_embeddings=[query_embedding],
    n_results=20
)
result = {'candidates': results['documents'][0]}
"""
    })

    # Rerank results
    builder.add_node("EmbeddedPythonNode", "reranker", {
        "code": """
# Rerank using cross-encoder or other method
from sentence_transformers import CrossEncoder

model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

pairs = [[query, doc] for doc in candidates]
scores = model.predict(pairs)

# Sort by score
ranked = sorted(
    zip(candidates, scores),
    key=lambda x: x[1],
    reverse=True
)

# Take top 5
result = {
    'documents': [doc for doc, score in ranked[:5]],
    'scores': [score for doc, score in ranked[:5]]
}
"""
    })

    builder.connect("initial_search", "reranker", "result", "candidates")

    return workflow
```

### 5. Hybrid Search (Semantic + Keyword)

```python
import kailash

def create_hybrid_search_workflow():
    builder = kailash.WorkflowBuilder()

    # Semantic search
    builder.add_node("EmbeddedPythonNode", "semantic_search", {
        "code": """
# Vector similarity search
semantic_results = collection.query(
    query_embeddings=[query_embedding],
    n_results=10
)
result = {'semantic_docs': semantic_results['documents'][0]}
"""
    })

    # Keyword search
    builder.add_node("EmbeddedPythonNode", "keyword_search", {
        "code": """
# BM25 or full-text search
from rank_bm25 import BM25Okapi

# Tokenize documents and query
tokenized_docs = [doc.lower().split() for doc in all_documents]
tokenized_query = query.lower().split()

bm25 = BM25Okapi(tokenized_docs)
scores = bm25.get_scores(tokenized_query)

# Get top results
top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:10]
result = {'keyword_docs': [all_documents[i] for i in top_indices]}
"""
    })

    # Merge and rerank
    builder.add_node("MergeNode", "merger", {})

    builder.add_node("EmbeddedPythonNode", "final_ranker", {
        "code": """
# Combine results with weights
semantic_weight = 0.7
keyword_weight = 0.3

# Score and combine
all_docs = {}
for doc in semantic_docs:
    all_docs[doc] = all_docs.get(doc, 0) + semantic_weight

for doc in keyword_docs:
    all_docs[doc] = all_docs.get(doc, 0) + keyword_weight

# Sort by combined score
ranked = sorted(all_docs.items(), key=lambda x: x[1], reverse=True)

result = {'documents': [doc for doc, score in ranked[:5]]}
"""
    })

    builder.connect("semantic_search", "merger", "result", "semantic")
    builder.connect("keyword_search", "merger", "result", "keyword")
    builder.connect("merger", "final_ranker", "merged", "input")

    return workflow
```

### 6. RAG with Citations

```python
builder.add_node("EmbeddedPythonNode", "citation_generator", {
    "code": """
# Generate answer with citations
context_with_sources = []
for i, (doc, source_id) in enumerate(zip(documents, source_ids)):
    context_with_sources.append(f"[{i+1}] {doc} (Source: {source_id})")

context = '\\n\\n'.join(context_with_sources)

prompt = f\"\"\"Answer the question using the numbered context below.
Include citation numbers in your answer.

Context:
{context}

Question: {query}

Answer (include [citation numbers]):\"\"\"

result = {'prompt': prompt, 'sources': source_ids}
"""
})
```

### 7. Conversation RAG (Chat History)

```python
import kailash

def create_conversational_rag():
    builder = kailash.WorkflowBuilder()

    # Rephrase query with history
    builder.add_node("LLMNode", "query_rephraser", {
        "provider": "openai",
        "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"),
        "messages": []
    })

    builder.add_node("EmbeddedPythonNode", "construct_rephrase_prompt", {
        "code": """
# Include chat history
history_text = '\\n'.join([
    f"{msg['role']}: {msg['content']}"
    for msg in chat_history
])

prompt = f\"\"\"Given the conversation history, rephrase the follow-up question
to be standalone.

Conversation History:
{history_text}

Follow-up Question: {query}

Standalone Question:\"\"\"

result = {'prompt': prompt}
"""
    })

    # Then use rephrased query for retrieval
    # ... (rest of RAG pipeline)

    return workflow
```

### 8. Production RAG Best Practices

```python
# 1. Chunking Strategy
chunk_configs = {
    "fixed_size": {
        "chunk_size": 500,
        "overlap": 50
    },
    "semantic": {
        "split_on": ["\\n\\n", "\\n", ". "],
        "max_size": 1000
    },
    "sentence": {
        "sentences_per_chunk": 5,
        "overlap_sentences": 1
    }
}

# 2. Embedding Model Selection
embedding_models = {
    "openai": "text-embedding-ada-002",  # General purpose
    "local": "sentence-transformers/all-MiniLM-L6-v2",  # Fast, local
    "domain_specific": "custom-fine-tuned-model"  # Best accuracy
}

# 3. Retrieval Configuration
retrieval_config = {
    "n_results": 5,  # Number of chunks to retrieve
    "similarity_threshold": 0.7,  # Minimum similarity score
    "max_context_length": 4000,  # Tokens for LLM context
    "rerank": True,  # Use reranking
    "hybrid_search": True  # Combine semantic + keyword
}

# 4. Generation Configuration
generation_config = {
    "temperature": 0.1,  # Lower for factual answers
    "max_tokens": 500,
    "presence_penalty": 0,
    "frequency_penalty": 0
}
```

## When to Engage

- User asks about "RAG", "retrieval augmented", "vector search", "RAG guide"
- User needs document Q&A system
- User wants semantic search implementation
- User needs knowledge base integration

## Teaching Approach

1. **Explain RAG Concept**: What is RAG and why use it
2. **Start Simple**: Basic ingestion and query pipeline
3. **Add Features**: Reranking, hybrid search, citations
4. **Optimize**: Chunking strategies, embedding selection
5. **Production**: Error handling, monitoring, scaling

## Integration with Other Skills

- Route to **sdk-fundamentals** for basic concepts
- Route to **production-deployment-guide** for deployment
- Route to **testing-best-practices** for testing RAG systems
- Route to **kaizen-specialist** for agentic RAG patterns
