---
name: workflow-industry-healthcare
description: "Healthcare workflows (patient data, HIPAA, medical records). Use when asking 'healthcare workflow', 'patient workflow', 'HIPAA', or 'medical records'."
---

# Healthcare Industry Workflows

> **Skill Metadata**
> Category: `industry-workflows`
> Priority: `MEDIUM`

## Pattern: Patient Record Management (HIPAA Compliant)

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Authenticate user
builder.add_node("HTTPRequestNode", "authenticate", {
    "url": "{{secrets.auth_endpoint}}",
    "method": "POST"
})

# 2. Check HIPAA authorization
builder.add_node("SQLQueryNode", "check_access", {
    "query": "SELECT role FROM healthcare_staff WHERE id = ? AND hipaa_certified = TRUE",
    "params": ["{{authenticate.body}}"]
})

# 3. Fetch patient record (encrypted)
builder.add_node("SQLQueryNode", "fetch_record", {
    "query": "SELECT encrypted_data FROM patient_records WHERE patient_id = ?",
    "params": ["{{input.patient_id}}"]
})

# 4. Decrypt data
builder.add_node("EmbeddedPythonNode", "decrypt", {
    "code": "result = aes_decrypt(data, secret_key)",
    "output_vars": ["result"]
})

# 5. Audit log
builder.add_node("SQLQueryNode", "audit", {
    "query": "INSERT INTO hipaa_audit_log (staff_id, patient_id, action, timestamp) VALUES (?, ?, 'record_access', NOW())",
    "params": ["{{authenticate.body}}", "{{input.patient_id}}"]
})

builder.connect("authenticate", "body", "check_access", "body")
builder.connect("check_access", "rows", "fetch_record", "body")
builder.connect("fetch_record", "rows", "decrypt", "inputs")
builder.connect("decrypt", "outputs", "audit", "body")
```

<!-- Trigger Keywords: healthcare workflow, patient workflow, HIPAA, medical records, patient data -->
