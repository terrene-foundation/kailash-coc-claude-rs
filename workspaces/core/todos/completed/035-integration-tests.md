# P17-035: Integration Tests for Coverage Gaps

**Status**: COMPLETED
**Evidence**: 32 new tests in `tests/integration/test_p17_polish.py`, all passing

## Tests Added

### JourneyOrchestrator (5 tests)

- `test_basic_journey_execution` — 3-step journey runs all steps, verifies JourneyResult
- `test_journey_context_propagation` — initial_context passed to agent
- `test_journey_resume_from_step` — resume_from_step=1 skips first step
- `test_journey_single_step` — single-step journey completes
- `test_journey_name_and_repr` — properties and repr work

### StructuredOutput (7 tests)

- `test_parse_raw_json` — direct JSON parsing
- `test_parse_from_markdown_fence` — code fence extraction
- `test_parse_with_retry_success_first_attempt` — no retry needed
- `test_parse_with_retry_recovers_on_retry` — mock LLM corrects on retry
- `test_parse_with_retry_exhausted` — RuntimeError after max retries
- `test_max_retries_property` — property accessor
- `test_parse_invalid_json_raises` — ValueError on garbage input

### VisionProcessor (5 tests)

- `test_analyze_image_input` — ImageInput analysis with mock LLM
- `test_analyze_batch` — batch analysis of multiple images
- `test_analyze_file` — file I/O with tempfile
- `test_vision_processor_providers` — openai/anthropic/google
- `test_vision_processor_invalid_provider` — ValueError

### AudioProcessor (6 tests)

- `test_transcribe_audio_input` — AudioInput transcription
- `test_transcribe_with_timestamps` — structured timing data
- `test_transcribe_with_language_hint` — language parameter
- `test_transcribe_file` — file I/O with tempfile
- `test_audio_processor_providers` — openai_whisper/google/whisper
- `test_audio_processor_invalid_provider` — ValueError

### MiddlewareConfig (9 tests)

- `test_middleware_builder_chaining` — full chain with all methods
- `test_middleware_from_preset_enterprise` — enterprise preset
- `test_middleware_from_preset_lightweight` — lightweight preset
- `test_middleware_from_preset_none` — none preset (all disabled)
- `test_middleware_invalid_preset_raises` — ValueError
- `test_middleware_applied_to_nexus` — set_middleware on Nexus
- `test_middleware_default_constructor` — all flags false
- `test_middleware_repr` — repr string
- `test_all_presets_valid` — all 5 documented presets
