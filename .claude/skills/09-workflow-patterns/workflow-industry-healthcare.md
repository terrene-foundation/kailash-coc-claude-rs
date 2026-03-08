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
builder.add_node("DatabaseQueryNode", "check_access", {
    "query": "SELECT role FROM healthcare_staff WHERE id = ? AND hipaa_certified = TRUE",
    "parameters": ["{{authenticate.user_id}}"]
})

# 3. Fetch patient record (encrypted)
builder.add_node("DatabaseQueryNode", "fetch_record", {
    "query": "SELECT encrypted_data FROM patient_records WHERE patient_id = ?",
    "parameters": ["{{input.patient_id}}"]
})

# 4. Decrypt data
builder.add_node("TransformNode", "decrypt", {
    "input": "{{fetch_record.encrypted_data}}",
    "transformation": "aes_decrypt(value, secret_key)"
})

# 5. Audit log
builder.add_node("SQLQueryNode", "audit", {
    "query": "INSERT INTO hipaa_audit_log (staff_id, patient_id, action, timestamp) VALUES (?, ?, 'record_access', NOW())",
    "parameters": ["{{authenticate.user_id}}", "{{input.patient_id}}"]
})

builder.connect("authenticate", "user_id", "check_access", "parameters")
builder.connect("check_access", "role", "fetch_record", "authorization")
builder.connect("fetch_record", "encrypted_data", "decrypt", "input")
builder.connect("decrypt", "data", "audit", "parameters")
```

<!-- Trigger Keywords: healthcare workflow, patient workflow, HIPAA, medical records, patient data -->
