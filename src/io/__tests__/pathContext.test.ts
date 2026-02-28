import { extractContextFromPath } from "../pathContext";

describe("extractContextFromPath", () => {
  test("uses first capturing group when no named group exists", () => {
    const ctx = extractContextFromPath("env/prod/apps/foo/file.cli", [
      { name: "env", regex: "/(dev|prod)/" },
      { name: "app", regex: "/apps/([^/]+)/" },
    ]);
    expect(ctx).toEqual({ env: "prod", app: "foo" });
  });

  test("uses named group matching rule name when present", () => {
    const ctx = extractContextFromPath("prod/apps/bar/x.yml", [
      { name: "env", regex: "^(?<env>dev|prod)/" },
      { name: "app", regex: "/apps/(?<app>[^/]+)/" },
    ]);
    expect(ctx).toEqual({ env: "prod", app: "bar" });
  });

  
test("supports regexes written with surrounding slashes (matches beginning segment)", () => {
  const ctx = extractContextFromPath("prod/apps/app1/a.cli", [
    { name: "env", regex: "/(dev|prod)/" },
    { name: "app", regex: "/apps/([^/]+)/" },
  ]);
  expect(ctx).toEqual({ env: "prod", app: "app1" });
});

  test("does not set context when regex matches but no capture exists", () => {
    const ctx = extractContextFromPath("prod/apps/bar/x.yml", [
      { name: "env", regex: "^prod/" }, // no capture
    ]);
    expect(ctx).toEqual({});
  });
});
