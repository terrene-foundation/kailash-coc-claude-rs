---
name: gold-error-handling
description: "Gold standard for error handling in Kailash applications. Use when asking 'error handling standard', 'handle errors', or 'error patterns'."
---

# Gold Standard: Error Handling

> **Skill Metadata**
> Category: `gold-standards`
> Priority: `HIGH`

## Error Handling Patterns

### 1. Use Try/Except with Specific Exceptions

```python
import kailash

def run_payment_workflow():
    reg = kailash.NodeRegistry()
    builder = kailash.WorkflowBuilder()

    # Critical operation
    builder.add_node("HTTPRequestNode", "payment_api", {
        "url": "https://api.stripe.com/charge",
        "method": "POST",
        "timeout": 30,
    })

    wf = builder.build(reg)
    rt = kailash.Runtime(reg)

    try:
        result = rt.execute(wf)
        return result["results"]["payment_api"]
    except RuntimeError as e:
        raise PaymentError(f"Payment workflow failed: {e}") from e
```

### 2. Define Domain Exceptions

```python
class PaymentError(Exception):
    """Base exception for payment operations."""
    pass

class InvalidAmountError(PaymentError):
    def __init__(self, amount):
        super().__init__(f"Invalid amount: {amount} (must be positive)")
        self.amount = amount

class GatewayTimeoutError(PaymentError):
    def __init__(self, timeout_secs):
        super().__init__(f"Payment gateway timeout after {timeout_secs}s")
        self.timeout_secs = timeout_secs

class PaymentDeclinedError(PaymentError):
    def __init__(self, reason):
        super().__init__(f"Payment declined: {reason}")
        self.reason = reason
```

### 3. Validation Before Processing

```python
def validate_payment_input(inputs: dict) -> None:
    """Validate payment inputs, raising ValueError on invalid data."""
    amount = inputs.get("amount")
    if amount is None or not isinstance(amount, (int, float)):
        raise ValueError("amount is required and must be a number")

    if amount <= 0:
        raise ValueError(f"amount must be positive, got {amount}")

    email = inputs.get("email")
    if not email or not isinstance(email, str):
        raise ValueError("email is required")

    if "@" not in email:
        raise ValueError(f"invalid email format: {email}")
```

### 4. Graceful Degradation with Fallback

```python
import requests
import logging

logger = logging.getLogger(__name__)

def fetch_with_fallback(primary_url: str, fallback_url: str) -> str:
    """Fetch from primary URL, falling back to secondary on failure."""
    try:
        response = requests.get(primary_url, timeout=10)
        response.raise_for_status()
        return response.text
    except requests.RequestException as e:
        logger.warning(
            "Primary API failed (url=%s, error=%s), trying fallback",
            primary_url, e,
        )
        response = requests.get(fallback_url, timeout=10)
        response.raise_for_status()
        return response.text
```

### 5. Structured Error Logging

```python
import kailash
import logging

logger = logging.getLogger(__name__)

def execute_workflow_with_logging(rt, wf, inputs=None):
    """Execute a workflow with structured logging."""
    logger.info("Starting workflow execution")

    try:
        result = rt.execute(wf, inputs or {})
        logger.info(
            "Workflow completed successfully",
            extra={
                "run_id": result["run_id"],
                "node_count": len(result["results"]),
            },
        )
        return result
    except RuntimeError as e:
        logger.error(
            "Workflow execution failed",
            extra={"error": str(e)},
            exc_info=True,
        )
        raise
```

### 6. Retry with Exponential Backoff

```python
import time
import requests
import logging

logger = logging.getLogger(__name__)

def robust_api_call(url: str, max_retries: int = 3) -> dict:
    """Call an API with retry and exponential backoff."""
    last_error = None

    for attempt in range(max_retries):
        try:
            response = requests.get(url, timeout=10)
            if response.ok:
                return {
                    "result": response.text,
                    "status": "success",
                }
            last_error = f"HTTP {response.status_code}"
        except requests.RequestException as e:
            last_error = str(e)

        # Exponential backoff
        delay = 0.1 * (2 ** attempt)
        logger.warning(
            "Attempt %d failed (error=%s), retrying in %.1fs",
            attempt + 1, last_error, delay,
        )
        time.sleep(delay)

    raise RuntimeError(f"All {max_retries} retries exhausted: {last_error}")
```

## Anti-Patterns

```python
# BAD: Bare except
try:
    result = rt.execute(wf)
except:  # Catches everything including SystemExit!
    pass

# BAD: Silently swallowing errors
try:
    result = rt.execute(wf)
except Exception:
    pass  # Error discarded!

# BAD: Catch-all with no context
try:
    operation()
except Exception:
    raise  # What went wrong? No context added.

# GOOD: Specific exception with context
try:
    result = rt.execute(wf)
except RuntimeError as e:
    raise WorkflowError(f"Failed to execute payment workflow: {e}") from e

# GOOD: Logging before re-raise
try:
    result = rt.execute(wf)
except RuntimeError as e:
    logger.error("Workflow failed: %s", e, exc_info=True)
    raise
```

## Gold Standard Checklist

- [ ] All fallible operations wrapped in try/except
- [ ] Custom exception classes defined for domain errors
- [ ] Specific exceptions caught (never bare `except:`)
- [ ] Input validation before processing
- [ ] Fallback paths for external APIs
- [ ] Structured error logging with context
- [ ] Retry logic with exponential backoff for network calls
- [ ] Error context preserved (`raise ... from e`)
- [ ] Error tests in test suite (`pytest.raises`)

<!-- Trigger Keywords: error handling standard, handle errors, error patterns, error handling gold standard, exceptions, try except -->
