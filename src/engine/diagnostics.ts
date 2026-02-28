export type DiagnosticSeverity = "info" | "warning" | "error";

export type Diagnostic = {
  severity: DiagnosticSeverity;
  message: string;
  filePath?: string;
  ruleType?: string;
  entityType?: string;
  entityId?: string;
};

export function warn(message: string, fields: Partial<Diagnostic> = {}): Diagnostic {
  return { severity: "warning", message, ...fields };
}

export function err(message: string, fields: Partial<Diagnostic> = {}): Diagnostic {
  return { severity: "error", message, ...fields };
}
