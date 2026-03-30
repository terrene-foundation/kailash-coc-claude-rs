# Validation Patterns

Custom field validation for DataFlow models with built-in validators, rule composition, and CRUD enforcement.

## Key Types

| Type                   | Source                                      | Purpose                                   |
| ---------------------- | ------------------------------------------- | ----------------------------------------- |
| `FieldValidator`       | `crates/kailash-dataflow/src/validators.rs` | Trait for custom field validators         |
| `FieldValidationError` | same                                        | Error with field, message, validator name |
| `EmailValidator`       | same                                        | Email format validator                    |
| `UrlValidator`         | same                                        | URL format validator (http/https)         |
| `UuidValidator`        | same                                        | UUID format validator (8-4-4-4-12)        |
| `PhoneValidator`       | same                                        | International phone number validator      |
| `LengthValidator`      | same                                        | String length bounds validator            |
| `RangeValidator`       | same                                        | Numeric range bounds validator            |
| `PatternValidator`     | same                                        | Regex pattern validator                   |
| `ValidationRule`       | `crates/kailash-dataflow/src/validation.rs` | Built-in rule enum (MinLength, etc.)      |
| `ValidationLayer`      | same                                        | Rule + validator registry per model/field |
| `ValidationErrors`     | same                                        | Aggregated error collection               |

## FieldValidator Trait

```rust
pub trait FieldValidator: Send + Sync {
    fn name(&self) -> &str;
    fn validate(&self, field_name: &str, value: &Value) -> Result<(), FieldValidationError>;
}
```

All built-in validators skip non-matching types (e.g., `EmailValidator` returns `Ok(())` for non-string values).

## Built-in Validators (7)

```rust
use kailash_dataflow::validators::*;
use kailash_value::Value;

// Email: exactly one @, non-empty parts, domain has a dot
let v = EmailValidator;
v.validate("email", &Value::String("alice@example.com".into()))?;

// URL: must have http:// or https:// scheme + non-empty host
let v = UrlValidator;
v.validate("website", &Value::String("https://example.com".into()))?;

// UUID: 8-4-4-4-12 hex format
let v = UuidValidator;
v.validate("id", &Value::String("550e8400-e29b-41d4-a716-446655440000".into()))?;

// Phone: starts with +, 7-15 digits (ignores spaces, hyphens, parens)
let v = PhoneValidator;
v.validate("phone", &Value::String("+1 (555) 123-4567".into()))?;

// Length: min/max character count (uses chars().count())
let v = LengthValidator { min: Some(2), max: Some(50) };
v.validate("name", &Value::String("Alice".into()))?;

// Range: numeric bounds (supports Integer and Float)
let v = RangeValidator { min: Some(0.0), max: Some(100.0) };
v.validate("score", &Value::Float(85.5))?;

// Pattern: regex match
let v = PatternValidator::new(r"^\d{3}-\d{4}$")?;
v.validate("code", &Value::String("123-4567".into()))?;
```

## ValidationRule Enum

Built-in rules for quick registration without creating custom validators:

```rust
use kailash_dataflow::validation::{ValidationLayer, ValidationRule};
use kailash_value::value_map;

let mut layer = ValidationLayer::new();
layer.add_rule("User", "name", ValidationRule::MinLength(2));
layer.add_rule("User", "name", ValidationRule::MaxLength(100));
layer.add_rule("User", "status", ValidationRule::one_of(vec!["active", "inactive"]));
layer.add_rule("Product", "price", ValidationRule::range(0.0, 10000.0));
layer.add_rule("Product", "sku", ValidationRule::Pattern("^[A-Z]{3}-\\d{4}$".into()));

// Validate data against rules only
let errors = layer.validate("User", &value_map! { "name" => "A" });
// errors: [ValidationError { field: "name", rule: "min_length", message: "..." }]
```

## ValidationLayer (Combined Validation)

Combines built-in rules and custom `FieldValidator` implementations:

```rust
use kailash_dataflow::validation::ValidationLayer;
use kailash_dataflow::validators::{EmailValidator, RangeValidator};

let mut layer = ValidationLayer::new();

// Add built-in rules
layer.add_rule("Product", "name", ValidationRule::MinLength(2));

// Add custom validators
layer.add_validator("Product", "price", Box::new(RangeValidator {
    min: Some(0.0),
    max: Some(1000.0),
}));
layer.add_validator("Product", "contact", Box::new(EmailValidator));

// validate() -- runs built-in rules only, returns Vec<ValidationError>
let rule_errors = layer.validate("Product", &data);

// validate_all() -- runs BOTH rules AND custom validators
let result = layer.validate_all("Product", &data);
match result {
    Ok(()) => println!("all valid"),
    Err(errors) => println!("{} errors: {}", errors.len(), errors),
}
```

## CRUD Enforcement

Register model nodes with automatic validation before database operations:

```rust
use kailash_dataflow::nodes::register_model_nodes_validated;
use std::sync::Arc;

let validation = Arc::new(layer);

// Registers 11 nodes (7 CRUD + 4 bulk) with validation on CRUD operations
register_model_nodes_validated(&mut registry, model, pool, validation);

// Validation failures return DataFlowError::ValidationFailed
```

The validated CRUD nodes run `ValidationLayer::validate_all()` BEFORE executing the SQL statement. If validation fails, no database query is executed.

## Gotchas

1. **RangeValidator rejects NaN/Infinity**: The `RangeValidator` checks `is_finite()` before comparing. `f64::NAN` and `f64::INFINITY` produce a `FieldValidationError` with message `"value is not a finite number"`. This prevents NaN bypass attacks where `NaN < max` is always false.

2. **Null values are skipped**: `ValidationLayer::validate()` skips `Value::Null` values. Nullability enforcement is handled separately by the model's field definition (`required` flag).

3. **validate() vs validate_all()**: `validate()` only runs `ValidationRule` checks. `validate_all()` runs BOTH rules AND custom `FieldValidator` implementations. Use `validate_all()` for complete validation.

4. **ValidationRule::Range uses f64 comparison**: The built-in `Range` rule in `ValidationRule` does NOT check for NaN. For NaN-safe range validation, use the `RangeValidator` custom validator instead.

5. **LengthValidator uses chars().count()**: Character count, not byte length. A 4-character emoji string has length 4, not 16.

6. **Bulk nodes are not validated**: `register_model_nodes_validated()` only applies validation to the 7 CRUD nodes. The 4 bulk nodes skip validation (different code path for batch operations).

## Cross-References

- `02-dataflow/` -- `ModelDefinition`, field definitions, node generation
- `data-classification.md` -- field-level classification (orthogonal to validation)
- `crates/kailash-dataflow/src/nodes/crud.rs` -- CRUD node implementation with validation hooks
