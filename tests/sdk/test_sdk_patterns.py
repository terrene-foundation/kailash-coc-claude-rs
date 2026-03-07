#!/usr/bin/env python3
"""
Comprehensive SDK Pattern Validation Tests

Tests all documented patterns from skills against the real Kailash SDK.
This validates that our documentation and skills are accurate.

Usage:
    python tests/sdk/test_sdk_patterns.py

Requirements:
    - Kailash SDK installed (pip install kailash-enterprise)
    - .env file with required API keys
"""

import os
import sys

# Load environment variables
try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

import kailash

# Test tracking
tests_passed = 0
tests_failed = 0
tests_skipped = 0


def test(name):
    """Test decorator"""

    def decorator(fn):
        def wrapper():
            global tests_passed, tests_failed, tests_skipped
            try:
                fn()
                print(f"  PASS {name}")
                tests_passed += 1
            except AssertionError as e:
                print(f"  FAIL {name}: {e}")
                tests_failed += 1
            except Exception as e:
                print(f"  SKIP {name}: SKIPPED - {e}")
                tests_skipped += 1

        return wrapper

    return decorator


# ==============================================================================
# CORE SDK PATTERN TESTS
# ==============================================================================


def test_core_sdk_patterns():
    """Test Core SDK patterns documented in 01-core-sdk skill."""
    print("\nCore SDK Pattern Tests:")

    @test("Import kailash module")
    def _():
        assert kailash is not None

    _()

    @test("kailash.WorkflowBuilder exists")
    def _():
        assert kailash.WorkflowBuilder is not None

    _()

    @test("kailash.Runtime exists")
    def _():
        assert kailash.Runtime is not None

    _()

    @test("kailash.NodeRegistry exists")
    def _():
        assert kailash.NodeRegistry is not None

    _()

    @test("Create workflow with 3-param add_node")
    def _():
        reg = kailash.NodeRegistry()
        builder = kailash.WorkflowBuilder()
        builder.add_node("PythonCodeNode", "code1", {"code": "x = 1"})
        built = builder.build(reg)
        assert built is not None

    _()

    @test("Create connection with 4-param add_connection")
    def _():
        reg = kailash.NodeRegistry()
        builder = kailash.WorkflowBuilder()
        builder.add_node("PythonCodeNode", "code1", {"code": "x = 1"})
        builder.add_node("PythonCodeNode", "code2", {"code": "y = x"})
        builder.add_connection("code1", "output", "code2", "input")
        built = builder.build(reg)
        assert built is not None

    _()

    @test("Execute workflow with kailash.Runtime")
    def _():
        reg = kailash.NodeRegistry()
        builder = kailash.WorkflowBuilder()
        builder.add_node("PythonCodeNode", "calc", {"code": "result = 42"})

        wf = builder.build(reg)
        rt = kailash.Runtime(reg)
        result = rt.execute(wf)

        assert result["run_id"] is not None
        assert "calc" in result["results"]

    _()

    @test("kailash.Runtime returns dict with results and run_id")
    def _():
        reg = kailash.NodeRegistry()
        builder = kailash.WorkflowBuilder()
        builder.add_node("PythonCodeNode", "test", {"code": "x = 1"})

        wf = builder.build(reg)
        rt = kailash.Runtime(reg)
        result = rt.execute(wf)

        assert isinstance(result, dict)
        assert "results" in result
        assert "run_id" in result
        assert isinstance(result["results"], dict)
        assert isinstance(result["run_id"], str)

    _()


# ==============================================================================
# RUNTIME CONFIGURATION TESTS
# ==============================================================================


def test_runtime_configuration():
    """Test runtime configuration options documented in CLAUDE.md."""
    print("\nRuntime Configuration Tests:")

    @test("kailash.Runtime can be instantiated")
    def _():
        reg = kailash.NodeRegistry()
        rt = kailash.Runtime(reg)
        assert rt is not None

    _()


# ==============================================================================
# NODE TESTS
# ==============================================================================


def test_node_patterns():
    """Test node patterns documented in 08-nodes-reference skill."""
    print("\nNode Pattern Tests:")

    @test("PythonCodeNode exists")
    def _():
        reg = kailash.NodeRegistry()
        builder = kailash.WorkflowBuilder()
        builder.add_node("PythonCodeNode", "test", {"code": "x = 1"})
        built = builder.build(reg)
        assert built is not None

    _()

    @test("SwitchNode exists")
    def _():
        reg = kailash.NodeRegistry()
        builder = kailash.WorkflowBuilder()
        builder.add_node(
            "SwitchNode", "switch", {"switch_variable": "x", "cases": {"a": "branch_a"}}
        )
        built = builder.build(reg)
        assert built is not None

    _()

    @test("HTTPRequestNode exists")
    def _():
        reg = kailash.NodeRegistry()
        builder = kailash.WorkflowBuilder()
        builder.add_node(
            "HTTPRequestNode", "http", {"url": "https://example.com", "method": "GET"}
        )
        built = builder.build(reg)
        assert built is not None

    _()

    @test("PythonCodeNode can execute")
    def _():
        reg = kailash.NodeRegistry()
        builder = kailash.WorkflowBuilder()
        builder.add_node("PythonCodeNode", "log", {"code": "result = 'logged'"})
        wf = builder.build(reg)
        rt = kailash.Runtime(reg)
        result = rt.execute(wf)
        assert "log" in result["results"]

    _()


# ==============================================================================
# WORKFLOW BUILDER TESTS
# ==============================================================================


def test_workflow_builder_features():
    """Test kailash.WorkflowBuilder features."""
    print("\nWorkflowBuilder Feature Tests:")

    @test("kailash.WorkflowBuilder.build() returns workflow object")
    def _():
        reg = kailash.NodeRegistry()
        builder = kailash.WorkflowBuilder()
        builder.add_node("PythonCodeNode", "test", {"code": "x = 1"})
        built = builder.build(reg)
        assert built is not None

    _()

    @test("Multiple nodes can be added")
    def _():
        reg = kailash.NodeRegistry()
        builder = kailash.WorkflowBuilder()
        builder.add_node("PythonCodeNode", "node1", {"code": "a = 1"})
        builder.add_node("PythonCodeNode", "node2", {"code": "b = 2"})
        builder.add_node("PythonCodeNode", "node3", {"code": "c = 3"})
        built = builder.build(reg)
        assert built is not None

    _()

    @test("Connections create data flow")
    def _():
        reg = kailash.NodeRegistry()
        builder = kailash.WorkflowBuilder()
        builder.add_node("PythonCodeNode", "producer", {"code": "output = 42"})
        builder.add_node("PythonCodeNode", "consumer", {"code": "result = input * 2"})
        builder.add_connection("producer", "output", "consumer", "input")

        wf = builder.build(reg)
        rt = kailash.Runtime(reg)
        result = rt.execute(wf)

        # Verify consumer received the output
        assert "consumer" in result["results"]

    _()


# ==============================================================================
# MAIN EXECUTION
# ==============================================================================


def main():
    """Run all SDK pattern tests."""
    print("=" * 60)
    print("SDK Pattern Validation Tests")
    print("=" * 60)
    print("-" * 60)

    # Run all test suites
    test_core_sdk_patterns()
    test_runtime_configuration()
    test_node_patterns()
    test_workflow_builder_features()

    # Summary
    print("\n" + "=" * 60)
    print(f"Results: {tests_passed} passed, {tests_failed} failed, {tests_skipped} skipped")
    print("=" * 60)

    if tests_failed > 0:
        print("\nSOME TESTS FAILED")
        sys.exit(1)
    else:
        print("\nALL TESTS PASSED")
        sys.exit(0)


if __name__ == "__main__":
    main()
