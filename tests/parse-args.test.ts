import { describe, expect, it } from "bun:test";

import { HelpRequestedError, parseArgs } from "../src/lib/parse-args";

describe("parseArgs", () => {
  it("parses positional inputs and defaults to mermaid", () => {
    const options = parseArgs(["schema.json"]);
    expect(options).toMatchObject({ inputPaths: ["schema.json"], format: "mermaid" });
  });

  it("accepts all long flags", () => {
    const options = parseArgs(["--input", "in.json", "--output", "out.mmd", "--format", "json"]);
    expect(options).toEqual({
      inputPaths: ["in.json"],
      ddl: undefined,
      output: "out.mmd",
      format: "json",
      sample: false,
    });
  });

  it("supports short aliases with the sample flag", () => {
    const options = parseArgs(["--sample", "-f", "mmd"]);
    expect(options.format).toBe("mermaid");
    expect(options.sample).toBe(true);
  });

  it("throws when more than one schema source is provided", () => {
    expect(() => parseArgs(["--sample", "--input", "schema.json"])).toThrow(/only one schema source/i);
  });

  it("throws when format is unsupported", () => {
    expect(() => parseArgs(["--format", "dot"])).toThrow(/unsupported format/i);
  });

  it("throws HelpRequestedError for --help", () => {
    expect(() => parseArgs(["--help"])).toThrow(HelpRequestedError);
  });

  it("collects multiple paths from repeated flags and positionals", () => {
    const options = parseArgs(["--input", "first", "second", "--input", "third"]);
    expect(options.inputPaths).toEqual(["first", "second", "third"]);
  });
});
