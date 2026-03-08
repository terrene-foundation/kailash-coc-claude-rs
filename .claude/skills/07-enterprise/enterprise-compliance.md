---
skill: enterprise-compliance
description: "ComplianceManager for evaluating regulatory compliance frameworks (GDPR, SOC2, HIPAA, PCI-DSS). Use when asking about 'compliance', 'GDPR', 'SOC2', 'HIPAA', 'PCI-DSS', 'regulatory', 'compliance check', or 'compliance evaluation'."
priority: MEDIUM
tags: [enterprise, compliance, gdpr, soc2, hipaa, pci-dss, regulatory]
---

# Enterprise Compliance Manager

Evaluate regulatory compliance frameworks with built-in and custom rules.

## Quick Reference

- **ComplianceManager**: Core class for managing compliance evaluations
- **Built-in Frameworks**: GDPR (7 rules), SOC2 (5 rules), HIPAA (5 rules), PCI-DSS
- **Custom Rules**: Add Python callables for custom compliance checks
- **Context**: Boolean keys describing your system's compliance posture

## Import

```python
from kailash.enterprise import ComplianceManager
```

## Basic Usage

```python
from kailash.enterprise import ComplianceManager

cm = ComplianceManager()

# Add a built-in compliance framework
cm.add_framework("gdpr")

# Set compliance context -- boolean keys describing your system
cm.set_context({
    "encryption_at_rest": True,
    "encryption_in_transit": True,
    "audit_logging_enabled": True,
    "data_retention_configured": True,
    "access_control_enabled": True,
    "consent_tracking_enabled": True,
    "data_deletion_capable": True,
})

# Evaluate a single framework
result = cm.evaluate("gdpr")
assert result["overall_status"] == "pass"
```

## Built-in Frameworks

### GDPR (7 Rules)

```python
cm = ComplianceManager()
cm.add_framework("gdpr")

# Required context keys for GDPR
cm.set_context({
    "encryption_at_rest": True,
    "encryption_in_transit": True,
    "audit_logging_enabled": True,
    "data_retention_configured": True,
    "access_control_enabled": True,
    "consent_tracking_enabled": True,
    "data_deletion_capable": True,
})

result = cm.evaluate("gdpr")
```

### SOC2 (5 Rules)

```python
cm = ComplianceManager()
cm.add_framework("soc2")

cm.set_context({
    "encryption_at_rest": True,
    "encryption_in_transit": True,
    "audit_logging_enabled": True,
    "access_control_enabled": True,
    "change_management_enabled": True,
})

result = cm.evaluate("soc2")
```

### HIPAA (5 Rules)

```python
cm = ComplianceManager()
cm.add_framework("hipaa")

cm.set_context({
    "encryption_at_rest": True,
    "encryption_in_transit": True,
    "audit_logging_enabled": True,
    "access_control_enabled": True,
    "phi_access_controls": True,
})

result = cm.evaluate("hipaa")
```

### PCI-DSS

```python
cm = ComplianceManager()
cm.add_framework("pci-dss")
# Set relevant context keys for PCI-DSS rules
cm.set_context({...})
result = cm.evaluate("pci-dss")
```

## Evaluate All Frameworks

```python
cm = ComplianceManager()
cm.add_framework("gdpr")
cm.add_framework("soc2")

cm.set_context({
    "encryption_at_rest": True,
    "encryption_in_transit": True,
    "audit_logging_enabled": True,
    "data_retention_configured": True,
    "access_control_enabled": True,
    "consent_tracking_enabled": True,
    "data_deletion_capable": True,
    "monitoring_enabled": True,
})

# Evaluate all frameworks at once
results = cm.evaluate_all()
# Returns a list of result dicts, one per framework
for r in results:
    print(f"{r['framework']}: {r['overall_status']}")
```

## Custom Compliance Rules

Add custom rules using `add_rule(framework, rule_id, rule_name, callable)`:

```python
cm = ComplianceManager()
cm.add_framework("gdpr")

# add_rule(framework, rule_id, rule_name, callable)
# The callable receives the context dict, returns {"status": "pass"|"fail"|"warning", "details": "..."}
def check_data_residency(context):
    return {"status": "pass" if context.get("data_residency_eu", False) else "fail",
            "details": "Data residency check"}

cm.add_rule("gdpr", "data_residency", "Data Residency in EU", check_data_residency)

cm.set_context({
    "encryption_at_rest": True,
    "encryption_in_transit": True,
    "audit_logging_enabled": True,
    "data_retention_configured": True,
    "access_control_enabled": True,
    "consent_tracking_enabled": True,
    "data_deletion_capable": True,
    "data_residency_eu": True,  # custom context key
})

result = cm.evaluate("gdpr")
# Now includes 8 rules (7 built-in + 1 custom)
```

## Result Structure

The `evaluate()` method returns a dict:

```python
result = cm.evaluate("gdpr")

# Top-level result structure
result["framework"]       # "gdpr"
result["overall_status"]  # "pass" or "fail"
result["pass_count"]      # number of passing rules (e.g., 7)
result["fail_count"]      # number of failing rules (e.g., 0)
result["findings"]        # list of finding dicts
result["timestamp"]       # ISO timestamp of evaluation

# Each finding in result["findings"]
finding = result["findings"][0]
finding["rule_id"]         # "gdpr-001"
finding["rule_name"]       # "Encryption at Rest"
finding["status"]          # "pass" or "fail"
finding["details"]         # "Encryption at rest is enabled"
finding["recommendation"]  # "Enable encryption at rest for all data stores"
finding["severity"]        # "high", "medium", or "low"
```

## Handling Failures

```python
import os
from kailash.enterprise import ComplianceManager

cm = ComplianceManager()
cm.add_framework("gdpr")

# Intentionally missing some requirements
cm.set_context({
    "encryption_at_rest": True,
    "encryption_in_transit": True,
    "audit_logging_enabled": False,   # not enabled
    "data_retention_configured": True,
    "access_control_enabled": True,
    "consent_tracking_enabled": False, # not enabled
    "data_deletion_capable": True,
})

result = cm.evaluate("gdpr")
assert result["overall_status"] == "fail"
assert result["fail_count"] == 2

# Inspect failures
for finding in result["findings"]:
    if finding["status"] == "fail":
        print(f"FAIL: {finding['rule_name']}")
        print(f"  Recommendation: {finding['recommendation']}")
        print(f"  Severity: {finding['severity']}")
```

## Production Pattern

```python
import os
import json
from kailash.enterprise import ComplianceManager

def run_compliance_audit():
    """Run compliance audit and return structured results."""
    cm = ComplianceManager()
    cm.add_framework("gdpr")
    cm.add_framework("soc2")
    cm.add_framework("hipaa")

    # Build context from actual system state
    cm.set_context({
        "encryption_at_rest": os.getenv("ENCRYPTION_AT_REST", "false").lower() == "true",
        "encryption_in_transit": os.getenv("ENCRYPTION_IN_TRANSIT", "false").lower() == "true",
        "audit_logging_enabled": os.getenv("AUDIT_LOGGING", "false").lower() == "true",
        "data_retention_configured": os.getenv("DATA_RETENTION", "false").lower() == "true",
        "access_control_enabled": os.getenv("ACCESS_CONTROL", "false").lower() == "true",
        "consent_tracking_enabled": os.getenv("CONSENT_TRACKING", "false").lower() == "true",
        "data_deletion_capable": os.getenv("DATA_DELETION", "false").lower() == "true",
        "change_management_enabled": os.getenv("CHANGE_MGMT", "false").lower() == "true",
        "incident_response_configured": os.getenv("INCIDENT_RESPONSE", "false").lower() == "true",
    })

    results = cm.evaluate_all()

    # Summary
    for r in results:
        status_icon = "PASS" if r["overall_status"] == "pass" else "FAIL"
        print(f"[{status_icon}] {r['framework']}: {r['pass_count']} pass, {r['fail_count']} fail")

    return results
```

## Best Practices

1. **Evaluate all frameworks together** -- Use `evaluate_all()` for comprehensive audits
2. **Build context from real state** -- Pull context values from system configuration, not hardcoded
3. **Add custom rules** -- Extend built-in frameworks with organization-specific requirements
4. **Log results** -- Store compliance evaluation results for audit trails
5. **Automate checks** -- Run compliance evaluations in CI/CD pipelines

## Related Skills

- [enterprise-policy](enterprise-policy.md) - Fine-grained policy evaluation
- [enterprise-tokens](enterprise-tokens.md) - Token lifecycle management
- [python-framework-bindings](../06-python-bindings/python-framework-bindings.md) - Enterprise type reference

<!-- Trigger Keywords: compliance, GDPR, SOC2, HIPAA, PCI-DSS, regulatory, compliance check, compliance evaluation, compliance manager, audit -->
