import { describe, it, expect } from 'vitest';
import { toKey, extractJson } from '../src/llm-prompts';

describe('toKey', () => {
	it('lowercases and underscores section names', () => {
		expect(toKey('Methods And Results')).toBe('methods_and_results');
	});
});

describe('extractJson', () => {
	it('pulls JSON out of a fenced code block', () => {
		expect(extractJson('prefix\n```json\n{"a":1}\n```\nsuffix')).toBe('{"a":1}');
	});

	it('falls back to the outermost braces', () => {
		expect(extractJson('noise {"b":2} trailing')).toBe('{"b":2}');
	});
});
