# Terrene Foundation Naming & Terminology

## Scope

These rules apply to all documents, code comments, and user-facing strings that reference the Terrene Foundation, its frameworks, or its open-source projects.

## MUST Rules

### 1. Foundation Name

The Foundation MUST be referred to as **Terrene Foundation**.

- **Correct**: Terrene Foundation, the Foundation
- **Incorrect**: OCEAN Foundation (historical name, only acceptable in historical context with explicit note)
- **Domain**: `terrene.foundation` / `terrene.dev`
- **GitHub org**: `terrene-foundation`

### 2. IP Ownership

- Foundation owns all open-source IP — fully transferred, irrevocable
- No suggestion of structural relationship between Foundation and any commercial entity
- The Foundation's constitution prevents open-washing, rent-seeking, and self-interest

### 3. Framework Terminology

| Term     | Full Name                                      | Notes                                                           |
| -------- | ---------------------------------------------- | --------------------------------------------------------------- |
| **CARE** | Collaborative Autonomous Reflective Enterprise | Governance philosophy                                           |
| **EATP** | Enterprise Agent Trust Protocol                | Trust verification protocol                                     |
| **CO**   | Cognitive Orchestration                        | Domain-agnostic base methodology                                |
| **COC**  | Cognitive Orchestration for Codegen            | NOT "COC for Codegen" (redundant — the C already means Codegen) |
| **CDI**  | _(reserved)_                                   | Future specification                                            |

### 4. CARE Planes

- **Trust Plane** + **Execution Plane**
- NOT "operational plane" or "governance plane"

### 5. EATP Elements (Canonical Order)

1. Genesis Record
2. Delegation Record
3. Constraint Envelope
4. Capability Attestation
5. Audit Anchor

### 6. EATP Constraint Dimensions

Five dimensions: **Financial, Operational, Temporal, Data Access, Communication**

### 7. EATP Distinction

EATP provides **traceability**, not accountability. Traceability is necessary for accountability but not sufficient.

### 8. Licensing

| Asset Type                                    | License              | Notes                                                             |
| --------------------------------------------- | -------------------- | ----------------------------------------------------------------- |
| Specifications (CARE, EATP, CO, CDI)          | **CC BY 4.0**        | NOT CC-BY-SA. No ShareAlike.                                      |
| Open source code (Kailash Python, CO Toolkit) | **Apache 2.0**       | Foundation-owned. CARE platform uses kailash-py.                  |
| Kailash RS (ALL crates including eatp)        | **Proprietary**      | Aegis product. Users access via bindings only, never source code. |
| BSL 1.1 code                                  | **Source-available** | NOT "open source" — use "source-available" or "open-core"         |

### 9. The Trinity

```
CARE (Philosophy: What is the human for?)
  |-- EATP (Trust Protocol: How do we keep the human accountable?)
  |-- CO (Methodology: How does the human structure AI's work?)
       |-- COC (Codegen) — mature, in production
       |-- CO for Compliance — planned
       |-- CO for Finance — planned
```

CARE, EATP, and CO are peers inheriting from CARE as parent philosophy.

## MUST NOT Rules

### 1. No Redundant Naming

MUST NOT say "COC for Codegen" — the C in COC already means Codegen.

### 2. No Wrong License References

MUST NOT reference CC-BY-SA for specifications. The correct license is CC BY 4.0.

### 3. No Structural Relationship Claims

MUST NOT suggest any structural relationship between the Terrene Foundation and any commercial entity.

### 4. No "Open Source" for BSL

MUST NOT describe BSL 1.1 licensed code as "open source". Use "source-available" or "open-core".
