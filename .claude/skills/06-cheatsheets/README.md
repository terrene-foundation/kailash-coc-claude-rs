# Cheatsheet Skills Index

Quick reference guide for all cheatsheet skills in this directory.

## Total Skills: 35

### Database & SQL (4 skills)
1. **asyncsql-advanced** - Advanced AsyncSQL patterns for complex queries
2. **distributed-transactions** - Distributed transaction coordination
3. **saga-pattern** - Saga pattern for distributed workflows
4. **query-builder** - Query builder patterns for dynamic SQL
5. **query-routing** - Query routing for multi-database workflows

### Data Integration (4 skills)
6. **node-selection-guide** - Decision guide for choosing the right node (CRITICAL)
7. **data-integration** - Data integration patterns for APIs/files/databases
8. **integration-mastery** - Master integration patterns
9. **workflow-composition** - Composing workflows from reusable components

### Development & Debugging (2 skills)
10. **pythoncode-data-science** - PythonCodeNode for data science workflows
11. **developer-tools** - Advanced developer tools and debugging

### Production & Operations (7 skills)
12. **performance-optimization** - Performance optimization patterns
13. **production-readiness** - Production readiness checklist
14. **production-patterns** - Production workflow patterns
15. **resilience-patterns** - Resilience and fault tolerance patterns
16. **monitoring-alerting** - Monitoring and alerting patterns
17. **validation-testing** - Validation and testing patterns
18. **workflow-api-deployment** - Deploy workflows as REST APIs

### Security & Configuration (3 skills)
19. **security-config** - Security configuration and best practices
20. **env-variables** - Environment variable management
21. **multi-tenancy-patterns** - Multi-tenancy and access control

### Quick Reference (3 skills)
22. **admin-nodes-reference** - Admin and utility nodes reference
23. **kailash-quick-tips** - Essential tips and tricks
24. **common-mistakes-catalog** - Common mistakes to avoid

### Advanced Patterns (3 skills)
25. **workflow-design-process** - Systematic workflow design methodology
26. **node-initialization** - Node initialization and parameter patterns
27. **directoryreader-patterns** - DirectoryReader file discovery patterns

### MCP & Integration (2 skills)
28. **enterprise-mcp** - Enterprise MCP for large-scale deployments
29. **mcp-resource-subscriptions** - MCP resource subscription patterns

### Agent Coordination (1 skill)
30. **a2a-coordination** - Agent-to-Agent (A2A) coordination patterns

### Specialized Integration (2 skills)
31. **ollama-integration** - Ollama LLM integration patterns
32. **custom-node-guide** - Creating custom nodes

### Workflow Utilities (3 skills)
33. **workflow-patterns-library** - Common workflow patterns library
34. **workflow-export** - Exporting and sharing workflows
35. **visualization** - Workflow visualization patterns

## Quick Access by Category

### By Priority
- **HIGH**: node-selection-guide, production patterns
- **MEDIUM**: Integration, database, MCP skills
- **REFERENCE**: Quick tips, admin nodes, common mistakes

### By Use Case
- **Getting Started**: kailash-quick-tips, workflow-patterns-library
- **Database Operations**: asyncsql-advanced, query-builder, saga-pattern
- **Production Deployment**: production-*, resilience-patterns, monitoring-alerting
- **Integration**: data-integration, integration-mastery, workflow-composition
- **Debugging**: developer-tools, common-mistakes-catalog

## Usage Patterns

### Trigger Keywords
Each skill includes trigger keywords in its frontmatter for automatic detection. Examples:
- "which node" → node-selection-guide.md
- "async SQL" → asyncsql-advanced.md
- "production ready" → production-readiness.md

### Related Skills
Skills are cross-referenced for easy navigation:
- Production skills link to monitoring and validation
- Integration skills link to data patterns

## File Structure

```
cheatsheets/
├── README.md (this file)
├── asyncsql-advanced.md
├── distributed-transactions.md
├── saga-pattern.md
├── query-builder.md
├── query-routing.md
├── node-selection-guide.md
├── data-integration.md
├── integration-mastery.md
├── workflow-composition.md
├── pythoncode-data-science.md
├── developer-tools.md
├── performance-optimization.md
├── production-readiness.md
├── production-patterns.md
├── resilience-patterns.md
├── monitoring-alerting.md
├── validation-testing.md
├── admin-nodes-reference.md
├── workflow-design-process.md
├── node-initialization.md
├── directoryreader-patterns.md
├── enterprise-mcp.md
├── mcp-resource-subscriptions.md
├── a2a-coordination.md
├── ollama-integration.md
├── custom-node-guide.md
├── security-config.md
├── env-variables.md
├── multi-tenancy-patterns.md
├── kailash-quick-tips.md
├── common-mistakes-catalog.md
├── workflow-patterns-library.md
├── workflow-api-deployment.md
├── workflow-export.md
└── visualization.md
```

## Version History

- Total: 35 skills
- Focus: Database operations, production deployment

### Phases 1-2
- Initial 12 skills
- Focus: Quick tips, common patterns, basic integration

## Contributing

When adding new skills:
1. Follow the standard template structure
2. Include clear trigger keywords
3. Add working code examples
4. Cross-reference related skills
5. Update this README

## Related Documentation
- **Skills Directory**: `.claude/skills/3-patterns/cheatsheets/`
- **Taxonomy**: See skills taxonomy document for complete skill hierarchy
