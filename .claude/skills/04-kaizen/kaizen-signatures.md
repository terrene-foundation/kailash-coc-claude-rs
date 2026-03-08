# Kaizen Signatures

Define agent input/output contracts using `Signature`, `InputField`, and `OutputField`.

## API

```python
from kailash.kaizen import Signature, InputField, OutputField

sig = Signature()

# InputField(description, default) — 2 positional args
# OutputField(description) — 1 positional arg

# Signature methods:
# - input_fields() -> dict  (field_name -> {description, default})
# - output_fields() -> dict
# - json_schema() -> dict
# - validate_inputs(data: dict) -> dict  (returns validation errors dict, empty = valid)
```

## Usage

```python
from kailash.kaizen import Signature, InputField, OutputField

sig = Signature()

# Check schema
schema = sig.json_schema()
print(schema)

# Validate inputs (returns dict of errors; empty dict = valid)
errors = sig.validate_inputs({"query": "hello"})
is_valid = len(errors) == 0
```

## InputField

| Property      | Type | Description       |
| ------------- | ---- | ----------------- |
| `description` | str  | Field description |
| `default`     | str  | Default value     |

Constructor: `InputField(description: str, default: str = None)`

## OutputField

| Property      | Type | Description       |
| ------------- | ---- | ----------------- |
| `description` | str  | Field description |

Constructor: `OutputField(description: str)`

## Limitations

- No `name` property on InputField/OutputField (name comes from dict key in `input_fields()`)
- No `add_input()`/`add_output()` methods on Signature (fields come from Rust-backed registration)
- No validation constraints (ge, le, min_length) — only descriptions and defaults
- The `.pyi` stubs may show different signatures — trust the runtime behavior documented here
