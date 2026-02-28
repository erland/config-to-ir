export type Evidence = {
  filePath: string;
  /**
   * 1-based line number if available.
   */
  line?: number;
  /**
   * Optional key name (for properties/yaml key based matches).
   */
  key?: string;
  /**
   * Optional short label for extractor/source.
   */
  extractor?: string;
};

export type ExtractionMatch = {
  captures: Record<string, string>;
  evidence: Evidence;
};
