/**
 * Prompt-as-Code Core Library
 *
 * Capabilities:
 * - Variable extraction: parse `{{variableName}}` from template text
 * - Variable validation against VariableSpec array
 * - Type validation: string/number/boolean/enum/json
 * - Constraint validation: max_tokens, temperature, banned_topics, required_facts, output_format
 * - Prompt lint: 5-rule structural validation, returns score 0-100
 * - Template diff between versions (structured diff)
 * - Fork functionality: copy template + set attribution metadata
 * - Fork tree: track upstream forks
 * - Slug generation: unique, URL-safe, derived from name
 */

// ─── Variable Extraction ────────────────────────────────────────────────────────

/**
 * Extract all variable names from a template text.
 * Matches {{variableName}} patterns.
 * Returns array of unique variable names in order of appearance.
 */
export function extractVariables(text: string): string[] {
  const regex = /\{\{([^}]*)\}\}/g;
  const vars: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const name = match[1].trim();
    // Include empty variable names (e.g. {{}}) as empty string, deduplicated
    if (!vars.includes(name)) {
      vars.push(name);
    }
  }
  return vars;
}

// ─── Variable Spec Types ───────────────────────────────────────────────────────

export type VariableType = 'string' | 'number' | 'boolean' | 'enum' | 'json';

export interface VariableSpec {
  name: string;
  type: VariableType;
  description?: string;
  required?: boolean;
  defaultValue?: unknown;
  enumValues?: string[];       // for type='enum'
  min?: number;                // for type='number'
  max?: number;                // for type='number'
}

// ─── Variable Validation ───────────────────────────────────────────────────────

export interface VariableValidationError {
  variable: string;
  error: string;
}

/**
 * Validate that all variables in text have corresponding entries in variableSpecs.
 * Returns array of errors (empty if all valid).
 */
export function validateVariables(
  text: string,
  variableSpecs: VariableSpec[]
): VariableValidationError[] {
  const extracted = extractVariables(text);
  const errors: VariableValidationError[] = [];
  const specNames = new Set(variableSpecs.map(s => s.name));

  for (const varName of extracted) {
    if (!specNames.has(varName)) {
      errors.push({ variable: varName, error: `Missing variable spec for {{${varName}}}` });
    }
  }

  // Check for spec entries with no corresponding variable in text
  // Only flag as error if spec is explicitly marked required=true
  for (const spec of variableSpecs) {
    if (spec.required === true && !extracted.includes(spec.name)) {
      errors.push({ variable: spec.name, error: `Required variable {{${spec.name}}} not found in template` });
    }
  }

  return errors;
}

/**
 * Validate the type field of each variable spec.
 * Returns array of errors (empty if all valid).
 */
export function validateTypes(variableSpecs: VariableSpec[]): VariableValidationError[] {
  const validTypes: VariableType[] = ['string', 'number', 'boolean', 'enum', 'json'];
  const errors: VariableValidationError[] = [];

  for (const spec of variableSpecs) {
    if (!validTypes.includes(spec.type)) {
      errors.push({ variable: spec.name, error: `Invalid type '${spec.type}' for variable '${spec.name}'` });
      continue;
    }
    if (spec.type === 'enum') {
      if (!Array.isArray(spec.enumValues) || spec.enumValues.length === 0) {
        errors.push({ variable: spec.name, error: `Enum variable '${spec.name}' requires non-empty enumValues array` });
      }
    }
    if (spec.type === 'number') {
      if (spec.min !== undefined && spec.max !== undefined && spec.min > spec.max) {
        errors.push({ variable: spec.name, error: `Variable '${spec.name}': min > max` });
      }
    }
  }

  return errors;
}

// ─── Constraint Types & Validation ────────────────────────────────────────────

export interface ConstraintSpec {
  maxTokens?: number;
  temperature?: number;        // 0.0 - 2.0
  bannedTopics?: string[];
  requiredFacts?: string[];
  outputFormat?: 'text' | 'json' | 'markdown' | 'xml';
}

/**
 * Validate constraint fields.
 * Returns array of errors (empty if all valid).
 */
export function validateConstraints(constraints: ConstraintSpec): VariableValidationError[] {
  const errors: VariableValidationError[] = [];

  if (constraints.maxTokens !== undefined) {
    if (typeof constraints.maxTokens !== 'number' || constraints.maxTokens < 1 || constraints.maxTokens > 128000) {
      errors.push({ variable: 'maxTokens', error: 'maxTokens must be a number between 1 and 128000' });
    }
  }

  if (constraints.temperature !== undefined) {
    if (typeof constraints.temperature !== 'number' || constraints.temperature < 0 || constraints.temperature > 2.0) {
      errors.push({ variable: 'temperature', error: 'temperature must be a number between 0.0 and 2.0' });
    }
  }

  if (constraints.bannedTopics !== undefined) {
    if (!Array.isArray(constraints.bannedTopics)) {
      errors.push({ variable: 'bannedTopics', error: 'bannedTopics must be an array' });
    }
  }

  if (constraints.requiredFacts !== undefined) {
    if (!Array.isArray(constraints.requiredFacts)) {
      errors.push({ variable: 'requiredFacts', error: 'requiredFacts must be an array' });
    }
  }

  if (constraints.outputFormat !== undefined) {
    const validFormats = ['text', 'json', 'markdown', 'xml'];
    if (!validFormats.includes(constraints.outputFormat)) {
      errors.push({ variable: 'outputFormat', error: `outputFormat must be one of: ${validFormats.join(', ')}` });
    }
  }

  return errors;
}

// ─── Prompt Lint ───────────────────────────────────────────────────────────────

export interface LintResult {
  score: number;        // 0-100
  ruleResults: LintRuleResult[];
  overall: 'pass' | 'warn' | 'fail';
}

export interface LintRuleResult {
  rule: string;
  passed: boolean;
  message: string;
  penalty: number;       // score deduction
}

/**
 * Prompt lint: 5-rule structural validation.
 * Returns score 0-100 and detailed rule results.
 *
 * Rules:
 * 1. Minimum length: prompt should have enough content (>50 chars)
 * 2. Variable coverage: all variables in text have specs
 * 3. No empty template blocks: no `{{}}` with no content
 * 4. Role clarity: contains a role definition or clear instruction
 * 5. Output format specified: output_format constraint or explicit instruction
 */
export function lintPrompt(
  text: string,
  variableSpecs: VariableSpec[],
  constraints?: ConstraintSpec
): LintResult {
  const ruleResults: LintRuleResult[] = [];
  const MAX_SCORE = 100;
  let totalPenalty = 0;

  // Rule 1: Minimum length
  const rule1Passed = text.trim().length > 50;
  const rule1Penalty = rule1Passed ? 0 : 20;
  ruleResults.push({
    rule: 'min-length',
    passed: rule1Passed,
    message: rule1Passed
      ? 'Prompt has sufficient length'
      : 'Prompt is too short (< 50 characters)',
    penalty: rule1Penalty,
  });
  totalPenalty += rule1Penalty;

  // Rule 2: Variable coverage
  const extractedVars = extractVariables(text);
  const specNames = new Set(variableSpecs.map(s => s.name));
  const missingVars = extractedVars.filter(v => !specNames.has(v));
  const rule2Passed = missingVars.length === 0;
  const rule2Penalty = rule2Passed ? 0 : 15;
  ruleResults.push({
    rule: 'variable-coverage',
    passed: rule2Passed,
    message: rule2Passed
      ? 'All variables have corresponding specs'
      : `Variables missing specs: ${missingVars.map(v => `{{${v}}}`).join(', ')}`,
    penalty: rule2Penalty,
  });
  totalPenalty += rule2Penalty;

  // Rule 3: No empty template blocks
  const hasEmptyBlocks = /\{\{\s*\}\}/.test(text);
  const rule3Passed = !hasEmptyBlocks;
  const rule3Penalty = rule3Passed ? 0 : 15;
  ruleResults.push({
    rule: 'no-empty-blocks',
    passed: rule3Passed,
    message: rule3Passed
      ? 'No empty template blocks found'
      : 'Found empty template blocks `{{}}`',
    penalty: rule3Penalty,
  });
  totalPenalty += rule3Penalty;

  // Rule 4: Role clarity — presence of role keywords, "you are", "act as", etc.
  const roleKeywords = ['you are', 'act as', 'role:', 'as a', 'assuming you', 'pretend', 'simulate', ' behave'];
  const hasRoleDefinition = roleKeywords.some(kw => text.toLowerCase().includes(kw));
  const rule4Passed = hasRoleDefinition;
  const rule4Penalty = rule4Passed ? 0 : 15;
  ruleResults.push({
    rule: 'role-clarity',
    passed: rule4Passed,
    message: rule4Passed
      ? 'Prompt contains role definition or clear instruction'
      : 'Prompt lacks role definition or clear instruction structure',
    penalty: rule4Penalty,
  });
  totalPenalty += rule4Penalty;

  // Rule 5: Output format specified — via constraint or explicit in text
  const outputKeywords = ['output', 'format', 'respond in', 'return as', 'json', 'markdown', 'xml'];
  const hasOutputFormat = constraints?.outputFormat
    || outputKeywords.some(kw => text.toLowerCase().includes(kw));
  const rule5Passed = !!hasOutputFormat;
  const rule5Penalty = rule5Passed ? 0 : 15;
  ruleResults.push({
    rule: 'output-format',
    passed: rule5Passed,
    message: rule5Passed
      ? 'Output format is specified'
      : 'Output format not specified (no constraint or explicit instruction)',
    penalty: rule5Penalty,
  });
  totalPenalty += rule5Penalty;

  const score = Math.max(0, MAX_SCORE - totalPenalty);
  const overall: LintResult['overall'] = score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail';

  return { score, ruleResults, overall };
}

// ─── Template Diff ──────────────────────────────────────────────────────────────

export interface DiffSegment {
  type: 'unchanged' | 'added' | 'removed' | 'modified';
  content: string;
  variableChanges?: {
    added: string[];
    removed: string[];
  };
}

export interface TemplateDiff {
  segments: DiffSegment[];
  contentChanged: boolean;
  variablesAdded: string[];
  variablesRemoved: string[];
  variablesChanged: string[];
  score: number;  // similarity score 0-100
}

/**
 * Compute structured diff between two template versions.
 * Returns detailed change analysis.
 */
export function diffTemplates(
  oldText: string,
  newText: string,
  oldSpecs?: VariableSpec[],
  newSpecs?: VariableSpec[]
): TemplateDiff {
  const oldVars = oldSpecs ? oldSpecs.map(s => s.name) : extractVariables(oldText);
  const newVars = newSpecs ? newSpecs.map(s => s.name) : extractVariables(newText);

  const variablesAdded = newVars.filter(v => !oldVars.includes(v));
  const variablesRemoved = oldVars.filter(v => !newVars.includes(v));
  const variablesChanged = oldVars.filter(v => newVars.includes(v));  // present in both, but spec may have changed

  const contentChanged = oldText !== newText;

  // Simple line-by-line diff simulation using LCS approach
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const segments: DiffSegment[] = [];

  // Build a simple unified diff representation
  if (oldText === newText) {
    segments.push({ type: 'unchanged', content: oldText });
  } else {
    // Mark first difference point
    let firstDiffIdx = 0;
    for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
      if (oldLines[i] !== newLines[i]) {
        firstDiffIdx = i;
        break;
      }
    }

    const beforeLines = oldLines.slice(0, firstDiffIdx);
    const afterOldLines = oldLines.slice(firstDiffIdx);
    const afterNewLines = newLines.slice(firstDiffIdx);

    if (beforeLines.length > 0) {
      segments.push({ type: 'unchanged', content: beforeLines.join('\n') });
    }
    if (afterOldLines.length > 0) {
      segments.push({ type: 'removed', content: afterOldLines.join('\n') });
    }
    if (afterNewLines.length > 0) {
      segments.push({ type: 'added', content: afterNewLines.join('\n') });
    }
  }

  // Calculate similarity score
  const longerLength = Math.max(oldText.length, newText.length);
  const editDistance = levenshtein(oldText, newText);
  const score = longerLength === 0 ? 100 : Math.round((1 - editDistance / longerLength) * 100);

  return {
    segments: segments.length === 0 ? [{ type: 'unchanged', content: oldText }] : segments,
    contentChanged,
    variablesAdded,
    variablesRemoved,
    variablesChanged,
    score,
  };
}

/**
 * Levenshtein edit distance for similarity scoring.
 */
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

// ─── Fork Functionality ───────────────────────────────────────────────────────

export interface ForkMetadata {
  originalTemplateId: string;
  originalTemplateSlug?: string;
  originalOwnerUsername?: string;
  forkedAt: Date;
  forkChain: string[];  // array of ancestor template IDs
}

/**
 * Create fork attribution metadata for a forked template.
 */
export function createForkMetadata(
  originalTemplateId: string,
  originalTemplateSlug?: string,
  originalOwnerUsername?: string,
  originalForkChain: string[] = []
): ForkMetadata {
  return {
    originalTemplateId,
    originalTemplateSlug,
    originalOwnerUsername,
    forkedAt: new Date(),
    forkChain: [...originalForkChain, originalTemplateId],
  };
}

// ─── Fork Tree ────────────────────────────────────────────────────────────────

export interface ForkTreeNode {
  templateId: string;
  forkedFrom: string | null;
  forkChain: string[];
  children: ForkTreeNode[];
}

/**
 * Build a fork tree from a list of templates with fork metadata.
 * Returns the tree rooted at the given template ID.
 */
export function buildForkTree(
  templates: Array<{
    id: string;
    forkedFrom: string | null;
    forkChain: string[];
  }>,
  rootTemplateId: string
): ForkTreeNode | null {
  const nodeMap = new Map<string, ForkTreeNode>();

  for (const t of templates) {
    nodeMap.set(t.id, {
      templateId: t.id,
      forkedFrom: t.forkedFrom,
      forkChain: t.forkChain,
      children: [],
    });
  }

  let root: ForkTreeNode | null = null;

  for (const [id, node] of nodeMap) {
    if (node.forkedFrom && nodeMap.has(node.forkedFrom)) {
      nodeMap.get(node.forkedFrom)!.children.push(node);
    }
    if (id === rootTemplateId) {
      root = node;
    }
  }

  return root;
}

// ─── Apply Variables ───────────────────────────────────────────────────────────

/**
 * Replace all {{variableName}} placeholders in template text with provided values.
 * Returns the rendered text. Unknown variables are left as-is.
 */
export function applyVariables(
  text: string,
  values: Record<string, string | number | boolean>
): string {
  return text.replace(/\{\{([^}]*)\}\}/g, (match, varName) => {
    const name = varName.trim();
    if (name in values) {
      return String(values[name]);
    }
    return match; // leave unknown variables as placeholders
  });
}

// ─── Slug Generation ───────────────────────────────────────────────────────────

/**
 * Generate a URL-safe, unique-looking slug from a template name.
 * Converts to lowercase, replaces spaces/special chars with hyphens,
 * removes non-alphanumeric chars, and trims hyphens.
 */
export function generateSlug(name: string, uniqueSuffix?: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // remove special chars
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/-+/g, '-')            // collapse multiple hyphens
    .replace(/^-|-$/g, '');         // trim leading/trailing hyphens

  if (!base) {
    return uniqueSuffix ? `template-${uniqueSuffix}` : `template-${Date.now()}`;
  }

  return uniqueSuffix ? `${base}-${uniqueSuffix}` : base;
}

/**
 * Generate a unique slug by checking against existing slugs.
 * Appends a short suffix if the generated slug already exists.
 */
export async function generateUniqueSlug(
  name: string,
  existingSlugs: string[],
  maxAttempts = 10
): Promise<string> {
  let slug = generateSlug(name);

  if (!existingSlugs.includes(slug)) {
    return slug;
  }

  for (let i = 0; i < maxAttempts; i++) {
    const candidate = generateSlug(name, String(i + 1));
    if (!existingSlugs.includes(candidate)) {
      return candidate;
    }
  }

  // Fallback: use timestamp-based suffix
  const fallback = generateSlug(name, Date.now().toString(36));
  return fallback;
}
