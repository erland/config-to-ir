export type PropertiesParseResult = {
  values: Record<string, string>;
  lineByKey: Record<string, number>;
};

/**
 * Very small .properties parser:
 * - supports key=value and key: value
 * - ignores blank lines and comment lines starting with # or !
 * - trims whitespace around keys/values
 * - does not handle multiline continuation (\) yet (can be added later)
 */
export function parseProperties(content: string): PropertiesParseResult {
  const values: Record<string, string> = {};
  const lineByKey: Record<string, number> = {};

  const lines = content.split(/\r\n|\r|\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNo = i + 1;
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#") || line.startsWith("!")) continue;

    const sepIdxEq = line.indexOf("=");
    const sepIdxColon = line.indexOf(":");

    let sepIdx = -1;
    if (sepIdxEq >= 0 && sepIdxColon >= 0) sepIdx = Math.min(sepIdxEq, sepIdxColon);
    else sepIdx = Math.max(sepIdxEq, sepIdxColon);

    if (sepIdx < 0) continue;

    const key = line.slice(0, sepIdx).trim();
    const value = line.slice(sepIdx + 1).trim();

    if (!key) continue;

    values[key] = value;
    lineByKey[key] = lineNo;
  }

  return { values, lineByKey };
}
