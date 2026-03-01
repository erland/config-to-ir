import { EntityExtract } from "../../config/types";
import { extractWithRegex } from "../../parse/regexExtractor";
import { extractFromProperties } from "../../parse/propertiesExtractor";
import { extractFromYaml } from "../../parse/yamlExtractor";

export function runExtract(ex: EntityExtract, filePathAbs: string, content: string) {
  switch (ex.type) {
    case "regex":
      return extractWithRegex({
        filePath: filePathAbs,
        content,
        pattern: ex.pattern,
        flags: ex.flags,
        pickCaptures: ex.pickCaptures,
      });
    case "properties":
      return extractFromProperties({
        filePath: filePathAbs,
        content,
        keys: ex.keys,
        captureName: ex.captureName,
        emitMissing: ex.emitMissing,
      });
    case "yaml":
      return extractFromYaml({
        filePath: filePathAbs,
        content,
        selectPath: ex.selectPath,
        keys: ex.keys,
        captureName: ex.captureName,
        emitMissing: ex.emitMissing,
      });
    default:
      return [];
  }
}
