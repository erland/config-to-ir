import path from "node:path";
import { loadConfig, ConfigError } from "../loadConfig";

describe("loadConfig", () => {
  test("loads and validates a valid YAML config", () => {
    const p = path.join(__dirname, "fixtures", "valid.yml");
    const { config } = loadConfig(p);
    expect(config.version).toBe(1);
    expect(config.inputs.include.length).toBeGreaterThan(0);
  });

  test("throws ConfigError for invalid config shape", () => {
    const p = path.join(__dirname, "fixtures", "invalid.yml");
    expect(() => loadConfig(p)).toThrow(ConfigError);
  });

  test("throws ConfigError when file does not exist", () => {
    const p = path.join(__dirname, "fixtures", "nope.yml");
    expect(() => loadConfig(p)).toThrow(ConfigError);
  });
});
