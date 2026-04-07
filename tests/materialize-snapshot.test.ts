import { describe, expect, it } from "vitest";

import { materializeSnapshot } from "@/src/lib/content/materialize-snapshot";
import { demoSnapshot } from "@/src/lib/content/demo-snapshot";

describe("materializeSnapshot", () => {
  it("detects changed entities between snapshots", () => {
    const previousSnapshot = {
      ...demoSnapshot,
      entities: demoSnapshot.entities.slice(0, 2),
    };
    const changedFrance = {
      ...demoSnapshot.entities[0]!,
      sourceFingerprint: "changed",
    };
    const nextEntities = [changedFrance, demoSnapshot.entities[1]!, demoSnapshot.entities[2]!];

    const result = materializeSnapshot(nextEntities, previousSnapshot);

    expect(result.addedEntityIds).toEqual(["cities-budapest"]);
    expect(result.updatedEntityIds).toEqual(["countries-france"]);
    expect(result.removedEntityIds).toEqual([]);
  });
});
