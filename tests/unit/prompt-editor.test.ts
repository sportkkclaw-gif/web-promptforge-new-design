/**
 * Unit Tests: PromptEditor Component
 * Tests: {{variable}} token recognition and highlighting
 */

/** @jest-environment node */

import React from 'react';
import { highlightPromptVariables } from '../../components/ui/prompt-editor';

describe('PromptEditor: highlightPromptVariables', () => {
  it('returns a React node array', () => {
    const result = highlightPromptVariables('Hello world');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('recognizes and highlights a single {{name}} token', () => {
    const result = highlightPromptVariables('Hello {{name}}');
    // The result should contain a span with class prompt-var-token wrapping {{name}}
    const rendered = require('react').createElement;
    const hasVarToken = result.some(
      (node: React.ReactNode) =>
        React.isValidElement(node) &&
        node.type === 'span' &&
        (node.props as { className?: string }).className === 'prompt-var-token' &&
        (node.props as { children?: React.ReactNode }).children === '{{name}}'
    );
    expect(hasVarToken).toBe(true);
  });

  it('recognizes multiple distinct {{token}} tokens', () => {
    const result = highlightPromptVariables('You are {{role}} and {{action}}');
    const varTokens = result.filter(
      (node: React.ReactNode) =>
        React.isValidElement(node) &&
        (node.props as { className?: string }).className === 'prompt-var-token'
    );
    expect(varTokens.length).toBe(2);
    expect((varTokens[0] as React.ReactElement).props.children).toBe('{{role}}');
    expect((varTokens[1] as React.ReactElement).props.children).toBe('{{action}}');
  });

  it('handles deduplicated repeated tokens', () => {
    const result = highlightPromptVariables('{{name}} said to {{name}}: please help {{name}}');
    const varTokens = result.filter(
      (node: React.ReactNode) =>
        React.isValidElement(node) &&
        (node.props as { className?: string }).className === 'prompt-var-token'
    );
    // The function splits on the regex, so repeated tokens appear separately in the array.
    // What matters is that each occurrence is correctly wrapped.
    const tokenValues = varTokens.map(
      (n: React.ReactNode) => (n as React.ReactElement).props.children
    );
    expect(tokenValues.filter((v: string) => v === '{{name}}').length).toBe(3);
  });

  it('preserves plain text segments', () => {
    const result = highlightPromptVariables('Plain text without tokens');
    const textSegments = result.filter(
      (node: React.ReactNode) =>
        React.isValidElement(node) &&
        (node.props as { className?: string }).className !== 'prompt-var-token'
    );
    const combinedText = textSegments
      .map((n: React.ReactNode) => (n as React.ReactElement).props.children ?? '')
      .join('');
    expect(combinedText).toBe('Plain text without tokens');
  });

  it('returns a single empty span for empty string', () => {
    const result = highlightPromptVariables('');
    expect(result.length).toBe(1);
    expect(React.isValidElement(result[0])).toBe(true);
    expect((result[0] as React.ReactElement).props.children).toBe('');
  });

  it('handles tokens with spaces in variable name', () => {
    const result = highlightPromptVariables('Write about {{topic name}}');
    const hasVarToken = result.some(
      (node: React.ReactNode) =>
        React.isValidElement(node) &&
        (node.props as { className?: string }).className === 'prompt-var-token' &&
        (node.props as { children?: string }).children === '{{topic name}}'
    );
    expect(hasVarToken).toBe(true);
  });
});
