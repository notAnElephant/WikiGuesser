import { geoMercator } from "d3-geo";
import { zoomIdentity } from "d3-zoom";
import { describe, expect, it } from "vitest";

import { getResizedMapTransform } from "@/src/components/game-shell/world-map-dialog";

describe("getResizedMapTransform", () => {
  it("keeps the same geographic point centered through a map resize", () => {
    const geographicCenter: [number, number] = [19.82, 41.33];
    const previousMapSize = { width: 390, height: 240 };
    const mapSize = { width: 390, height: 760 };
    const previousProjection = geoMercator()
      .scale(72)
      .translate([previousMapSize.width / 2, previousMapSize.height / 2]);
    const projection = geoMercator()
      .scale(96)
      .translate([mapSize.width / 2, mapSize.height / 2]);
    const previousProjectedCenter = previousProjection(geographicCenter);

    expect(previousProjectedCenter).not.toBeNull();

    const currentTransform = zoomIdentity
      .translate(previousMapSize.width / 2, previousMapSize.height / 2)
      .scale(3)
      .translate(-previousProjectedCenter![0], -previousProjectedCenter![1]);
    const resizedTransform = getResizedMapTransform({
      currentTransform,
      mapSize,
      previousMapSize,
      previousProjection,
      projection,
    });
    const nextProjectedCenter = projection(geographicCenter);

    expect(resizedTransform).not.toBeNull();
    expect(nextProjectedCenter).not.toBeNull();
    expect(resizedTransform!.apply(nextProjectedCenter!)[0]).toBeCloseTo(
      mapSize.width / 2,
    );
    expect(resizedTransform!.apply(nextProjectedCenter!)[1]).toBeCloseTo(
      mapSize.height / 2,
    );
    expect(resizedTransform!.k * projection.scale()).toBeCloseTo(
      currentTransform.k * previousProjection.scale(),
    );
  });
});
