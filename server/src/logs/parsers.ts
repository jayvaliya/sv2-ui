import type { ContainerLogLine, LogDiagnostic, LogParser } from './types.js';

// Central registry for scenario-specific parsers. New log-derived diagnostics
// should be added here without changing the collection pipeline.
export const logParsers: LogParser[] = [];

function toDiagnosticsArray(
  diagnostic: LogDiagnostic | LogDiagnostic[] | null
): LogDiagnostic[] {
  if (!diagnostic) {
    return [];
  }

  return Array.isArray(diagnostic) ? diagnostic : [diagnostic];
}

function getDiagnosticKey(diagnostic: LogDiagnostic): string {
  return [
    diagnostic.code,
    diagnostic.streamId,
    diagnostic.severity,
    diagnostic.title,
    diagnostic.message,
    diagnostic.recommendation,
    [...diagnostic.containers].sort().join(','),
  ].join('::');
}

function getLatestTimestamp(
  left: string | null,
  right: string | null
): string | null {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return Date.parse(left) >= Date.parse(right) ? left : right;
}

function mergeDiagnostics(
  current: LogDiagnostic,
  incoming: LogDiagnostic
): LogDiagnostic {
  const evidence = [...current.evidence, ...incoming.evidence].filter(
    (item, index, items) =>
      items.findIndex((candidate) =>
        candidate.container === item.container &&
        candidate.stream === item.stream &&
        candidate.timestamp === item.timestamp &&
        candidate.line === item.line
      ) === index
  );

  return {
    ...current,
    containers: [...new Set([...current.containers, ...incoming.containers])],
    detectedAt: getLatestTimestamp(current.detectedAt, incoming.detectedAt),
    evidence,
  };
}

function deduplicateDiagnostics(diagnostics: LogDiagnostic[]): LogDiagnostic[] {
  const deduplicated = new Map<string, LogDiagnostic>();

  diagnostics.forEach((diagnostic) => {
    const key = getDiagnosticKey(diagnostic);
    const existing = deduplicated.get(key);

    deduplicated.set(
      key,
      existing ? mergeDiagnostics(existing, diagnostic) : diagnostic
    );
  });

  return [...deduplicated.values()];
}

// Parsers operate on the collated logical stream and can return one or many
// diagnostics each. We deduplicate equivalent diagnostics here so retry loops
// or repeated log emissions do not surface as duplicated user-facing errors.
export function collectDiagnostics(
  lines: ContainerLogLine[],
  parsers: LogParser[] = logParsers
): LogDiagnostic[] {
  const diagnostics = parsers.flatMap((parser) => toDiagnosticsArray(parser.match(lines)));

  return deduplicateDiagnostics(diagnostics);
}
