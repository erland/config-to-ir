export function getExitCode(opts: {
  errorCount: number;
  warningCount: number;
  strict: boolean;
}): number {
  if (opts.errorCount > 0) return 2;
  if (opts.strict && opts.warningCount > 0) return 2;
  return 0;
}
