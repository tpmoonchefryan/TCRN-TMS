// SPDX-License-Identifier: Apache-2.0
// TCRN-TMS-INC-001 — both sides of the declaration gate.
//
// The gate's whole value is refusing a fifty-sixth undeclared endpoint, and a
// gate that has only ever been seen green has not shown it can refuse anything.
// Each red below is exercised against an injected source rather than by editing a
// controller.

import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  type EndpointRecord,
  judgeEndpointDeclarations,
  REGISTERED_DECLARATION_DEBT,
  scanEndpoints,
} from "./endpoint-declaration-scan";

const API_SRC = path.resolve(__dirname, "../..");

const records = scanEndpoints(API_SRC);

describe("endpoint authorization declarations", () => {
  it("holds exactly the registered debt and nothing more", () => {
    const result = judgeEndpointDeclarations(records);

    expect(result.admitted).toEqual([]);
    expect(result.reasonCode).toBe("ENDPOINT_DECLARATION_HELD");
    expect(result.registeredDebt).toBe(REGISTERED_DECLARATION_DEBT.length);
    // A registered name that no longer matches anything means the list has stopped
    // describing the tree — the same failure the list exists to prevent.
    expect(result.settled).toEqual([]);
  });

  it("measures a tree it can be checked against by hand", () => {
    const result = judgeEndpointDeclarations(records);

    // These numbers are the whole finding, so they are asserted rather than logged.
    // `declaringPermission` is independently checkable: grep counts 309 literal
    // `@RequirePermissions(` in controller sources.
    expect(result.total).toBe(398);
    expect(result.declaringPermission).toBe(309);
    expect(result.declaringPublic).toBe(34);
    expect(result.admitted.length + REGISTERED_DECLARATION_DEBT.length).toBe(55);
  });

  it("REDS on a fifty-sixth undeclared endpoint", () => {
    const injected: EndpointRecord[] = [
      ...records,
      { id: "modules/invented/invented.controller.ts#takeEverything", declaration: "undeclared" },
    ];
    const result = judgeEndpointDeclarations(injected);

    expect(result.ok).toBe(false);
    expect(result.reasonCode).toBe("ENDPOINT_DECLARATION_MISSING");
    // Naming the endpoint matters: "something is undeclared" costs a search, and a
    // gate that costs a search is a gate people stop running.
    expect(result.admitted).toEqual(["modules/invented/invented.controller.ts#takeEverything"]);
  });

  it("stays green when a registered endpoint gains a declaration, and says so", () => {
    const repaired = records.map((record) =>
      record.id === REGISTERED_DECLARATION_DEBT[0]
        ? { ...record, declaration: "permission" as const }
        : record
    );
    const result = judgeEndpointDeclarations(repaired);

    // Declaring one is the goal, not a violation — but the debt count must stop
    // claiming it, or the gate reports a burn-down that never happened.
    expect(result.ok).toBe(true);
    expect(result.settled).toEqual([REGISTERED_DECLARATION_DEBT[0]]);
  });

  it("reads the decorator block by balancing brackets, not by a fixed lookback", () => {
    // The first draft looked back eight lines and reported 364 undeclared endpoints
    // against a tree holding 309 literal `@RequirePermissions` — multi-line
    // `@ApiOperation` blocks pushed the declaration out of the window. This is the
    // shape that broke it.
    const source = [
      "export class ThingController {",
      "  @ApiOperation({",
      "    summary: 'one',",
      "    description: 'two',",
      "    externalDocs: { url: 'three', description: 'four' },",
      "  })",
      "  @ApiResponse({ status: 200, description: 'five' })",
      "  @RequirePermissions({ resource: 'thing', action: 'read' })",
      "  @Get()",
      "  async list() {}",
      "}",
    ].join("\n");
    const found = scanEndpoints(API_SRC, ((filePath: string) =>
      String(filePath).endsWith("app.controller.ts") ? source : "") as never);

    expect(found).toEqual([{ id: "app.controller.ts#list", declaration: "permission" }]);
  });

  it("does not mistake a comment for the handler signature", () => {
    // A stray comment between the decorators and the method once became a roster
    // entry named `// Actually, keeping it generic is fine.` — an entry naming
    // nothing real can never be burned down, so it would sit in the debt forever.
    const source = [
      "export class ThingController {",
      "  @Get()",
      "  // Actually, keeping it generic is fine.",
      "  async realHandler() {}",
      "}",
    ].join("\n");
    const found = scanEndpoints(API_SRC, ((filePath: string) =>
      String(filePath).endsWith("app.controller.ts") ? source : "") as never);

    expect(found).toEqual([{ id: "app.controller.ts#realHandler", declaration: "undeclared" }]);
  });

  it("counts a class-level declaration as covering its handlers", () => {
    const source = [
      "@RequirePermissions({ resource: 'thing', action: 'read' })",
      "export class ThingController {",
      "  @Get()",
      "  async list() {}",
      "}",
    ].join("\n");
    const found = scanEndpoints(API_SRC, ((filePath: string) =>
      String(filePath).endsWith("app.controller.ts") ? source : "") as never);

    expect(found[0]?.declaration).toBe("permission");
  });
});
