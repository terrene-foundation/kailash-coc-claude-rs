# Inter-Agent Protocols

Inter-agent protocols handle structured communication between parent and child agents, including task delegation, clarification, and escalation.

## Delegation Protocol

Parent-to-child task assignment and completion handling.

DelegationProtocol provides two operations:

1. **compose_delegation(task, context_keys, parent_objective)** -- Uses LLM to compose a structured delegation message containing task description, context keys, priority, and deadline.
2. **process_completion(result)** -- Processes completion results from child agents, returning success status, context updates, and any errors.

### Priority Levels

DelegationPriority: Low, Normal (default), High, Critical

## Clarification Protocol

Inter-agent Q&A with blocking/non-blocking modes.

ClarificationProtocol provides:

1. **compose_question(context, blocking)** -- Child asks parent a question. When blocking=true, the child waits for an answer before proceeding.
2. **compose_answer(question, context)** -- Parent answers a child's question.

**Invariant**: The is_response and blocking fields are enforced programmatically regardless of LLM output, preventing the LLM from accidentally swapping question/answer semantics.

## Escalation Protocol

Child escalates problems to parent with action recommendation.

EscalationProtocol provides:

- **escalate(problem, attempted_mitigations, context)** -- Returns an EscalationMessage with severity, problem description, attempted mitigations, recommended action, and detail.

### Escalation Actions

EscalationAction: Retry, Recompose, EscalateFurther, Abandon

### Severity Levels

EscalationSeverity: Low, Medium, High, Critical
