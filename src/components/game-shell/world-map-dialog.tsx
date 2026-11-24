"use client";

import {
  captureAnalyticsEvent,
  isPostHogConfigured,
} from "@/src/lib/analytics";
import { measureMapInteraction } from "@/src/lib/map-performance";
import {
  COUNTRY_DATA,
  getAntimeridianCountryBorder,
  getMapCountryNames,
  getPlayableCountriesByMapName,
} from "@/src/lib/game/world-map-data";
import {
  PACIFIC_REGIONS,
  PACIFIC_REGIONS_SOURCE,
} from "@/src/lib/game/pacific-regions";
import {
  COUNTRY_TOUCH_TARGET_SIZE,
  getCountryMarkerOpacity,
  getCountryTargetGeometry,
  getOverlappingMapTargets,
} from "@/src/lib/game/map-country-targets";
import type {
  GuessDirection,
  GuessedCountryMapData,
  SolutionCountryMapData,
} from "@/src/lib/types";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Spinner } from "@astryxdesign/core/Spinner";
import { VStack } from "@astryxdesign/core/VStack";
import {
  geoContains,
  geoMercator,
  geoPath,
  geoTransform,
  type GeoProjection,
} from "d3-geo";
import { select } from "d3-selection";
import {
  zoom,
  type ZoomBehavior,
  zoomIdentity,
  type ZoomTransform,
} from "d3-zoom";
import {
  ChevronDown,
  ChevronUp,
  Focus,
  Minus,
  Plus,
  Scan,
  X,
} from "lucide-react";
import {
  type ComponentProps,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type DuelResultMarkerTone = "challenger" | "opponent" | "both";

export type DuelResultGuessedCountry = GuessedCountryMapData & {
  markerTone?: DuelResultMarkerTone;
};

interface WorldMapDialogProps {
  /** Fill the play surface instead of using the legacy floating map drawer. */
  embedded?: boolean;
  layeredMap?: boolean;
  countryOptions?: readonly string[];
  drawerState?: "hidden" | "medium" | "expanded";
  duelResult?: boolean;
  focusedGuess?: GuessedCountryMapData | null;
  guessedCountries: readonly DuelResultGuessedCountry[];
  isActive?: boolean;
  isBusy?: boolean;
  isCountryPicker?: boolean;
  isExpanded: boolean;
  onDrawerStateChange?: (drawerState: "hidden" | "medium" | "expanded") => void;
  onExpandedChange: (isExpanded: boolean) => void;
  onCountryGuess?: (countryName: string) => void;
  onMapClickDuringReveal?: () => void;
  presentation?: "game" | "result";
  solutionCountry?: SolutionCountryMapData | null;
}

interface MapSize {
  width: number;
  height: number;
}

interface MapLocation {
  latitude: number;
  longitude: number;
}

export function getLastGuessedCountry(
  guessedCountries: readonly DuelResultGuessedCountry[],
): GuessedCountryMapData | null {
  return guessedCountries.at(-1) ?? null;
}

const DIRECTION_ROTATION: Record<GuessDirection, number> = {
  north: 0,
  northeast: 45,
  east: 90,
  southeast: 135,
  south: 180,
  southwest: 225,
  west: 270,
  northwest: 315,
};

const DIRECTION_LABEL: Record<GuessDirection, string> = {
  north: "north",
  northeast: "northeast",
  east: "east",
  southeast: "southeast",
  south: "south",
  southwest: "southwest",
  west: "west",
  northwest: "northwest",
};

// Small-island countries (especially in the Pacific) stay tiny until the map
// is zoomed well past 20x, so let users zoom in much further on touch screens
// where the map canvas itself is smaller than on desktop.
const MIN_MAP_SCALE = 1;
const MAX_MAP_SCALE = 100;
const MAP_ZOOM_STEP = 1.45;
const MIN_SMALL_COUNTRY_TARGET_SCALE = MIN_MAP_SCALE * MAP_ZOOM_STEP ** 2;
const ISLAND_GROUP_COUNTRY_IDS = new Set(
  PACIFIC_REGIONS.features.flatMap(({ properties }) =>
    properties.anchor ? [properties.countryId] : [],
  ),
);
const MAP_COUNTRIES_BY_ID = new Map(
  COUNTRY_DATA.features.map((country) => [country.id, country.properties]),
);
const ANTIMERIDIAN_BORDERS = COUNTRY_DATA.features.map(({ geometry }) =>
  getAntimeridianCountryBorder(geometry),
);

function CountryShape({
  border,
  className,
  ...props
}: ComponentProps<"path"> & { border: string | null }) {
  return (
    <>
      <path
        {...props}
        className={border ? `${className} map-country--seam-fill` : className}
        vectorEffect="non-scaling-stroke"
      />
      {border ? (
        <path
          aria-hidden="true"
          className={`${className} map-country--seam-border`}
          d={border}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </>
  );
}

interface ResizeTransformOptions {
  currentTransform: ZoomTransform;
  mapSize: MapSize;
  previousMapSize: MapSize;
  previousProjection: GeoProjection;
  projection: GeoProjection;
}

export function getNearestWorldX(
  x: number,
  reference: number,
  worldWidth: number,
) {
  return worldWidth > 0
    ? x + Math.round((reference - x) / worldWidth) * worldWidth
    : x;
}

export function getVisibleWorldCopies(
  left: number,
  right: number,
  worldLeft: number,
  worldWidth: number,
) {
  if (worldWidth <= 0) return [0];
  const first = Math.floor((left - worldLeft) / worldWidth);
  const last = Math.ceil((right - worldLeft) / worldWidth) - 1;
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

export function getResizedMapTransform({
  currentTransform,
  mapSize,
  previousMapSize,
  previousProjection,
  projection,
}: ResizeTransformOptions): ZoomTransform | null {
  const previousMapCenter = currentTransform.invert([
    previousMapSize.width / 2,
    previousMapSize.height / 2,
  ]);
  const [previousOrigin] = previousProjection.translate();
  const geographicCenter = previousProjection.invert?.([
    getNearestWorldX(
      previousMapCenter[0],
      previousOrigin,
      2 * Math.PI * previousProjection.scale(),
    ),
    previousMapCenter[1],
  ]);

  if (!geographicCenter) {
    return null;
  }

  const nextMapCenter = projection(geographicCenter);

  if (!nextMapCenter) {
    return null;
  }

  const nextScale = Math.min(
    MAX_MAP_SCALE,
    Math.max(
      MIN_MAP_SCALE,
      currentTransform.k * (previousProjection.scale() / projection.scale()),
    ),
  );
  const expectedCenterX =
    projection.translate()[0] +
    (previousMapCenter[0] - previousOrigin) *
      (projection.scale() / previousProjection.scale());

  return zoomIdentity
    .translate(mapSize.width / 2, mapSize.height / 2)
    .scale(nextScale)
    .translate(
      -getNearestWorldX(
        nextMapCenter[0],
        expectedCenterX,
        2 * Math.PI * projection.scale(),
      ),
      -nextMapCenter[1],
    );
}

export function getFocusedMapTransform({
  location,
  mapSize,
  projection,
  scale = 7,
}: {
  location: MapLocation;
  mapSize: MapSize;
  projection: GeoProjection;
  scale?: number;
}): ZoomTransform | null {
  const point = projection([location.longitude, location.latitude]);

  if (!point) {
    return null;
  }

  return zoomIdentity
    .translate(mapSize.width / 2, mapSize.height / 2)
    .scale(scale)
    .translate(-point[0], -point[1]);
}

function DirectionArrow({ direction }: { direction: GuessDirection }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
      style={{ transform: `rotate(${DIRECTION_ROTATION[direction]}deg)` }}
      viewBox="0 0 24 24"
    >
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}

export function WorldMapDialog({
  embedded = false,
  layeredMap = false,
  countryOptions = [],
  focusedGuess,
  guessedCountries,
  isActive = false,
  isBusy = false,
  isCountryPicker = false,
  isExpanded,
  drawerState,
  onDrawerStateChange,
  onExpandedChange,
  onCountryGuess,
  onMapClickDuringReveal,
  duelResult = false,
  presentation = "game",
  solutionCountry = null,
}: WorldMapDialogProps) {
  const helpId = useId();
  const effectiveDrawerState =
    presentation === "game"
      ? (drawerState ?? (isExpanded ? "expanded" : "medium"))
      : "medium";
  const isMapExpanded = effectiveDrawerState === "expanded";
  const isMapHidden = effectiveDrawerState === "hidden";
  const hasLayeredCanvas = layeredMap && !isMapExpanded;
  const canInteractWithMap =
    embedded || presentation === "result" || Boolean(onCountryGuess);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const drawerDragStartYRef = useRef<number | null>(null);
  const drawerDragStartStateRef = useRef<"hidden" | "medium" | "expanded">(
    "medium",
  );
  const didDrawerDragRef = useRef(false);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(
    null,
  );
  const mapTransformRef = useRef<ZoomTransform>(zoomIdentity);
  const animationFrameRef = useRef<number | null>(null);
  const animationTargetRef = useRef<ZoomTransform | null>(null);
  const animationVelocityRef = useRef({ x: 0, y: 0, scale: 0 });
  const focusedGuessedCountryCountRef = useRef(0);
  const islandMapGuessRef = useRef<{ name: string; guessCount: number } | null>(
    null,
  );
  const previousMapSizeRef = useRef<MapSize | null>(null);
  const previousProjectionRef = useRef<GeoProjection | null>(null);
  const [mapSize, setMapSize] = useState<MapSize>({ width: 0, height: 0 });
  const [projectionSize, setProjectionSize] = useState(mapSize);
  const [mapTransform, setMapTransform] = useState<ZoomTransform>(zoomIdentity);
  const [suppressTouchHighlight, setSuppressTouchHighlight] = useState(false);
  const [drawerDragOffsetY, setDrawerDragOffsetY] = useState(0);
  const [isDrawerDragging, setIsDrawerDragging] = useState(false);
  const guessedCountryByName = useMemo(() => {
    const countriesByName = new Map<string, DuelResultGuessedCountry>();

    for (const country of guessedCountries) {
      for (const normalizedName of getMapCountryNames(country.mapNames)) {
        countriesByName.set(normalizedName, country);
      }
    }

    return countriesByName;
  }, [guessedCountries]);
  const playableCountryByMapName = useMemo(
    () => getPlayableCountriesByMapName(countryOptions),
    [countryOptions],
  );
  const solutionNames = useMemo(
    () =>
      solutionCountry
        ? getMapCountryNames(solutionCountry.mapNames)
        : new Set<string>(),
    [solutionCountry],
  );
  const projection = useMemo(() => {
    if (projectionSize.width <= 0 || projectionSize.height <= 0) {
      return null;
    }

    const projection = geoMercator().fitExtent(
      [
        [18, 18],
        [projectionSize.width - 18, projectionSize.height - 18],
      ],
      COUNTRY_DATA,
    );
    if (hasLayeredCanvas) {
      const [x, y] = projection.translate();
      const [, top] = geoPath(projection).bounds(COUNTRY_DATA)[0];
      projection.translate([x, y - top + 18]);
    }
    return projection;
  }, [hasLayeredCanvas, projectionSize]);
  const path = useMemo(
    () => (projection ? geoPath(projection) : null),
    [projection],
  );
  const worldWidth = projection ? 2 * Math.PI * projection.scale() : 0;
  const worldOrigin = projection?.translate()[0] ?? 0;
  const worldCopies = getVisibleWorldCopies(
    mapTransform.invertX(0),
    mapTransform.invertX(mapSize.width),
    worldOrigin - worldWidth / 2,
    worldWidth,
  );
  const pacificCopies = getVisibleWorldCopies(
    mapTransform.invertX(0),
    mapTransform.invertX(mapSize.width),
    worldOrigin,
    worldWidth,
  );
  // Geometry changes on resize; pan and zoom only change the group's transform.
  const countryPaths = useMemo(
    () =>
      COUNTRY_DATA.features.map((country, index) => {
        if (!path) return null;
        const border = ANTIMERIDIAN_BORDERS[index];
        return {
          outline: path(country),
          bounds: path.bounds(country),
          border: border ? path(border) : null,
        };
      }),
    [path],
  );
  function isMapBoundsVisible(
    [[left, top], [right, bottom]]: [[number, number], [number, number]],
    copy: number,
  ) {
    const offset = copy * worldWidth;
    return (
      mapTransform.applyX(left + offset) <= mapSize.width &&
      mapTransform.applyX(right + offset) >= 0 &&
      mapTransform.applyY(top) <= mapSize.height &&
      mapTransform.applyY(bottom) >= 0
    );
  }
  const pacificRegionPaths = useMemo(() => {
    if (!projection) return [];
    // Draw the Pacific as one piece, including regions crossing 180°.
    const pacificCenter = worldOrigin + worldWidth / 2;
    const regionPath = geoPath(
      geoTransform({
        point(longitude, latitude) {
          const point = projection([longitude, latitude]);
          if (point)
            this.stream.point(
              getNearestWorldX(point[0], pacificCenter, worldWidth),
              point[1],
            );
        },
      }),
    );
    return PACIFIC_REGIONS.features.map(({ geometry, properties }) => ({
      ...properties,
      mapName: MAP_COUNTRIES_BY_ID.get(properties.countryId)?.normalizedName,
      outline: regionPath(geometry),
      bounds: regionPath.bounds(geometry),
    }));
  }, [projection, worldOrigin, worldWidth]);
  const showPacificRegions = pacificRegionPaths.some(
    ({ anchor, mapName }) =>
      anchor &&
      mapName &&
      (playableCountryByMapName.has(mapName) ||
        guessedCountryByName.has(mapName) ||
        solutionNames.has(mapName)),
  );
  const countryTargets = useMemo(
    () =>
      path && projection
        ? COUNTRY_DATA.features.flatMap((country) => {
            if (ISLAND_GROUP_COUNTRY_IDS.has(String(country.id))) return [];
            const target = getCountryTargetGeometry(country, path, projection);
            return target ? [{ ...target, country }] : [];
          })
        : [],
    [path, projection],
  );
  const smallCountryTargets = countryTargets.flatMap((target) => {
    if (mapTransform.k < MIN_SMALL_COUNTRY_TARGET_SCALE) return [];

    const name = target.country.properties.normalizedName;
    if (
      !playableCountryByMapName.has(name) &&
      !guessedCountryByName.has(name) &&
      !solutionNames.has(name)
    )
      return [];
    const size = target.size * mapTransform.k;
    const y = mapTransform.applyY(target.point[1]);
    const radius = COUNTRY_TOUCH_TARGET_SIZE / 2;
    if (
      size >= COUNTRY_TOUCH_TARGET_SIZE ||
      y < -radius ||
      y > mapSize.height + radius
    )
      return [];
    return worldCopies.flatMap((copy) => {
      const x = mapTransform.applyX(target.point[0] + copy * worldWidth);
      return x >= -radius && x <= mapSize.width + radius
        ? [
            {
              ...target,
              copy,
              point: [x, y] as [number, number],
              opacity: getCountryMarkerOpacity(size),
            },
          ]
        : [];
    });
  });

  function selectSmallCountry(
    point: [number, number],
    targetSize = COUNTRY_TOUCH_TARGET_SIZE,
  ) {
    if (!projection || (!onCountryGuess && !onMapClickDuringReveal)) return;
    const candidates = new Set<string>();
    const overlappingTargets = getOverlappingMapTargets(
      targetSize < COUNTRY_TOUCH_TARGET_SIZE
        ? smallCountryTargets.filter((target) => target.opacity > 0)
        : smallCountryTargets,
      point,
      targetSize,
    );
    for (const target of overlappingTargets) {
      const name = target.country.properties.normalizedName;
      const playable = playableCountryByMapName.get(name);
      if (playable && !guessedCountryByName.has(name)) candidates.add(playable);
    }
    const [x, y] = mapTransform.invert(point);
    const location = projection.invert?.([
      getNearestWorldX(x, worldOrigin, worldWidth),
      y,
    ]);
    const hitsMarker = overlappingTargets.some(
      (target) =>
        target.opacity > 0 &&
        Math.hypot(target.point[0] - point[0], target.point[1] - point[1]) <= 5,
    );
    if (location && !hitsMarker) {
      // An enlarged target must not silently steal a tap on a neighbouring country.
      for (const country of COUNTRY_DATA.features) {
        const name = country.properties.normalizedName;
        const playable = playableCountryByMapName.get(name);
        if (
          playable &&
          !guessedCountryByName.has(name) &&
          geoContains(country, location)
        ) {
          candidates.add(playable);
        }
      }
    }
    if (candidates.size === 1) onCountryGuess?.([...candidates][0]);
    else if (candidates.size > 1 && location) {
      const transform = getFocusedMapTransform({
        location: { longitude: location[0], latitude: location[1] },
        mapSize,
        projection,
        scale: Math.min(MAX_MAP_SCALE, mapTransform.k * 3),
      });
      if (transform) animateToTransform(transform);
    }
  }

  useEffect(() => {
    if (!isMapExpanded) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    expandButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMapExpanded]);

  useEffect(() => {
    const container = mapContainerRef.current;

    if (!container) {
      return;
    }

    const updateSize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;

      setMapSize((size) =>
        size.width === width && size.height === height
          ? size
          : { width, height },
      );
      // Fit the world once per width. The layered SVG uses CSS pixels directly.
      const canvasHeight = hasLayeredCanvas ? width : height;
      setProjectionSize((size) =>
        size.width === width && size.height === canvasHeight
          ? size
          : { width, height: canvasHeight },
      );
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [hasLayeredCanvas, isMapHidden]);

  const hasMapSize = mapSize.width > 0 && mapSize.height > 0;

  // Keep one zoom behavior across resizes: d3-zoom keeps per-behavior tap
  // state, so a double tap that starts on one behavior and ends on a
  // replacement crashes in its touchend handler.
  useEffect(() => {
    const svg = svgRef.current;
    const container = mapContainerRef.current;

    if (!svg || !container || !canInteractWithMap || !hasMapSize) {
      return;
    }

    let measurement: ReturnType<typeof measureMapInteraction> | null = null;
    let zoomUpdates = 0;
    let zoomEnd = 1;
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_MAP_SCALE, MAX_MAP_SCALE])
      .on("start.animation", (event) => {
        if (event.sourceEvent && animationFrameRef.current !== null) {
          window.cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
          animationTargetRef.current = null;
          animationVelocityRef.current = { x: 0, y: 0, scale: 0 };
        }
        if (
          event.sourceEvent &&
          isPostHogConfigured &&
          document.visibilityState === "visible"
        ) {
          measurement?.cancel();
          zoomUpdates = 0;
          const zoomStart = event.transform.k;
          const { width, height } = container.getBoundingClientRect();
          const inputType = event.sourceEvent.type;
          measurement = measureMapInteraction((metrics) => {
            const size = container.getBoundingClientRect();
            if (
              zoomUpdates < 2 ||
              width !== size.width ||
              height !== size.height
            )
              return;
            captureAnalyticsEvent("map_interaction_performance", {
              ...metrics,
              measurement_version: 1,
              app_revision: process.env.NEXT_PUBLIC_APP_REVISION ?? "unknown",
              input_type: inputType,
              presentation,
              embedded,
              map_width: width,
              map_height: height,
              zoom_start: zoomStart,
              zoom_end: zoomEnd,
              zoom_updates: zoomUpdates,
            });
          });
        }
      })
      .on("zoom", (event) => {
        zoomUpdates += 1;
        mapTransformRef.current = event.transform;
        setMapTransform(event.transform);
      })
      .on("end.performance", () => {
        zoomEnd = mapTransformRef.current.k;
        measurement?.finish();
      });
    const selection = select(svg);
    selection.call(behavior);
    zoomBehaviorRef.current = behavior;

    return () => {
      measurement?.cancel();
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      selection.on(".zoom", null);
      delete (svg as SVGSVGElement & { __zooming?: unknown }).__zooming;
      zoomBehaviorRef.current = null;
    };
  }, [canInteractWithMap, hasMapSize, embedded, presentation]);

  useEffect(() => {
    const svg = svgRef.current;
    const behavior = zoomBehaviorRef.current;

    if (!svg || !behavior || !hasMapSize) {
      return;
    }

    const mapExtent: [[number, number], [number, number]] = [
      [0, 0],
      [mapSize.width, mapSize.height],
    ];
    behavior.extent(mapExtent).translateExtent([
      [-Infinity, 0],
      [Infinity, Math.max(mapSize.height, projectionSize.height)],
    ]);
    select(svg).call(behavior.transform, mapTransformRef.current);
  }, [canInteractWithMap, hasMapSize, mapSize, projectionSize.height]);

  useLayoutEffect(() => {
    const previousMapSize = previousMapSizeRef.current;
    const previousProjection = previousProjectionRef.current;
    previousMapSizeRef.current = mapSize;
    previousProjectionRef.current = projection;

    if (
      !projection ||
      !previousProjection ||
      projection === previousProjection ||
      !previousMapSize ||
      previousMapSize.width <= 0 ||
      previousMapSize.height <= 0 ||
      mapSize.width <= 0 ||
      mapSize.height <= 0
    ) {
      return;
    }

    const svg = svgRef.current;
    const behavior = zoomBehaviorRef.current;

    if (!svg || !behavior) {
      return;
    }

    const nextTransform = getResizedMapTransform({
      currentTransform: mapTransformRef.current,
      mapSize,
      previousMapSize,
      previousProjection,
      projection,
    });

    if (!nextTransform) {
      return;
    }

    // The animation target was calculated in the previous projection too.
    if (animationTargetRef.current) {
      animationTargetRef.current = getResizedMapTransform({
        currentTransform: animationTargetRef.current,
        mapSize,
        previousMapSize,
        previousProjection,
        projection,
      });
      animationVelocityRef.current = { x: 0, y: 0, scale: 0 };
    }

    select(svg).call(behavior.transform, nextTransform);
  }, [mapSize, projection]);

  function changeZoom(factor: number) {
    const currentTransform =
      animationTargetRef.current ?? mapTransformRef.current;
    const centerX = mapSize.width / 2;
    const centerY = mapSize.height / 2;
    const [mapCenterX, mapCenterY] = currentTransform.invert([
      centerX,
      centerY,
    ]);
    const scale = Math.min(
      MAX_MAP_SCALE,
      Math.max(MIN_MAP_SCALE, currentTransform.k * factor),
    );
    const targetTransform = zoomIdentity
      .translate(centerX, centerY)
      .scale(scale)
      .translate(-mapCenterX, -mapCenterY);

    animateToTransform(targetTransform);
  }

  function resetWorld() {
    animateToTransform(zoomIdentity);
  }

  function animateToTransform(targetTransform: ZoomTransform) {
    const svg = svgRef.current;
    const behavior = zoomBehaviorRef.current;

    if (!svg || !behavior) {
      return;
    }

    const selection = select(svg);
    const targetCenterX = targetTransform.invertX(mapSize.width / 2);
    const nearbyCenterX = getNearestWorldX(
      targetCenterX,
      mapTransformRef.current.invertX(mapSize.width / 2),
      worldWidth,
    );
    animationTargetRef.current = targetTransform.translate(
      targetCenterX - nearbyCenterX,
      0,
    );
    if (animationFrameRef.current !== null) {
      return;
    }

    animationVelocityRef.current = { x: 0, y: 0, scale: 0 };
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      selection.call(behavior.transform, animationTargetRef.current);
      animationTargetRef.current = null;
      return;
    }

    let previousTime = performance.now();

    const updateTransform = (timestamp: number) => {
      const target = animationTargetRef.current;
      if (!target) {
        animationFrameRef.current = null;
        return;
      }

      // A frame timestamp can precede the effect that scheduled its callback.
      const deltaTime = Math.max(
        0,
        Math.min((timestamp - previousTime) / 1000, 0.05),
      );
      previousTime = timestamp;
      const { width, height } = hasLayeredCanvas
        ? mapSize
        : svg.viewBox.baseVal;
      const centerX = width / 2;
      const centerY = height / 2;
      const transform = mapTransformRef.current;
      const center = transform.invert([centerX, centerY]);
      const targetCenter = target.invert([centerX, centerY]);
      const currentScale = Math.log(transform.k);
      const targetScale = Math.log(target.k);
      const velocity = animationVelocityRef.current;
      const stiffness = 180;
      const damping = 26;
      velocity.x =
        (velocity.x + (targetCenter[0] - center[0]) * stiffness * deltaTime) *
        Math.exp(-damping * deltaTime);
      velocity.y =
        (velocity.y + (targetCenter[1] - center[1]) * stiffness * deltaTime) *
        Math.exp(-damping * deltaTime);
      velocity.scale =
        (velocity.scale +
          (targetScale - currentScale) * stiffness * deltaTime) *
        Math.exp(-damping * deltaTime);
      const nextCenterX = center[0] + velocity.x * deltaTime;
      const nextCenterY = center[1] + velocity.y * deltaTime;
      const nextScale = Math.exp(currentScale + velocity.scale * deltaTime);
      const settled =
        Math.hypot(
          targetCenter[0] - nextCenterX,
          targetCenter[1] - nextCenterY,
        ) < 0.5 &&
        Math.abs(targetScale - Math.log(nextScale)) < 0.0001 &&
        Math.hypot(velocity.x, velocity.y, velocity.scale) < 1;
      const nextTransform = settled
        ? target
        : zoomIdentity
            .translate(centerX, centerY)
            .scale(nextScale)
            .translate(-nextCenterX, -nextCenterY);
      selection.call(behavior.transform, nextTransform);

      if (!settled) {
        animationFrameRef.current =
          window.requestAnimationFrame(updateTransform);
      } else {
        animationFrameRef.current = null;
        animationTargetRef.current = null;
        animationVelocityRef.current = { x: 0, y: 0, scale: 0 };
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(updateTransform);
  }

  function focusCountries(
    targetNames: ReadonlySet<string>,
    maximumScale: number,
    viewportCoverage: number,
  ): boolean {
    const svg = svgRef.current;
    const behavior = zoomBehaviorRef.current;

    if (!svg || !behavior || !path || targetNames.size === 0) {
      return false;
    }

    let left = Number.POSITIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;

    for (const country of COUNTRY_DATA.features) {
      if (!targetNames.has(country.properties.normalizedName)) {
        continue;
      }

      const [[countryLeft, countryTop], [countryRight, countryBottom]] =
        path.bounds(country);
      left = Math.min(left, countryLeft);
      top = Math.min(top, countryTop);
      right = Math.max(right, countryRight);
      bottom = Math.max(bottom, countryBottom);
    }

    if (![left, top, right, bottom].every(Number.isFinite)) {
      return false;
    }

    return focusBounds(
      [
        [left, top],
        [right, bottom],
      ],
      maximumScale,
      viewportCoverage,
    );
  }

  function focusBounds(
    [[left, top], [right, bottom]]: [[number, number], [number, number]],
    maximumScale: number,
    viewportCoverage: number,
  ): boolean {
    const boundsWidth = Math.max(1, right - left);
    const boundsHeight = Math.max(1, bottom - top);
    const scale = Math.min(
      maximumScale,
      Math.max(
        1,
        Math.min(
          (mapSize.width * viewportCoverage) / boundsWidth,
          (mapSize.height * viewportCoverage) / boundsHeight,
        ),
      ),
    );
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const transform = zoomIdentity
      .translate(mapSize.width / 2, mapSize.height / 2)
      .scale(scale)
      .translate(-centerX, -centerY);

    animateToTransform(transform);
    return true;
  }

  function focusLocation(
    location: MapLocation & { mapNames?: readonly string[] },
  ) {
    const svg = svgRef.current;
    const behavior = zoomBehaviorRef.current;

    if (!svg || !behavior || !projection) {
      return;
    }

    if (location.mapNames) {
      const region = findPacificRegion(location.mapNames);
      if (region) {
        focusBounds(region.bounds, 7, 0.56);
        return;
      }
    }

    const transform = getFocusedMapTransform({
      location,
      mapSize,
      projection,
    });

    if (transform) {
      animateToTransform(transform);
    }
  }

  function fitGuessedCountries(): boolean {
    const behavior = zoomBehaviorRef.current;

    if (!behavior || !projection || guessedCountries.length === 0) {
      return false;
    }

    const points = guessedCountries
      .map(getProjectedMarkerPoint)
      .filter((point): point is [number, number] => point !== null);

    if (points.length === 0) {
      return false;
    }

    const nearbyXs = points.map(([x]) =>
      getNearestWorldX(x, points[0][0], worldWidth),
    );
    const left = Math.min(...nearbyXs);
    const top = Math.min(...points.map(([, y]) => y));
    const right = Math.max(...nearbyXs);
    const bottom = Math.max(...points.map(([, y]) => y));
    const boundsWidth = Math.max(32, right - left);
    const boundsHeight = Math.max(32, bottom - top);
    const scale = Math.min(
      10,
      Math.max(
        1,
        Math.min(
          (mapSize.width * 0.72) / boundsWidth,
          (mapSize.height * 0.72) / boundsHeight,
        ),
      ),
    );
    const transform = zoomIdentity
      .translate(mapSize.width / 2, mapSize.height / 2)
      .scale(scale)
      .translate(-(left + right) / 2, -(top + bottom) / 2);

    animateToTransform(transform);
    return true;
  }

  function findPacificRegion(mapNames: readonly string[]) {
    const names = getMapCountryNames(mapNames);
    return pacificRegionPaths.find(
      ({ mapName, anchor }) => anchor && mapName && names.has(mapName),
    );
  }

  function getProjectedMarkerPoint(location: MapLocation) {
    return projection?.([location.longitude, location.latitude]) ?? null;
  }

  function getMarkerPosition(location: MapLocation) {
    const point = getProjectedMarkerPoint(location);
    if (!point) return null;
    point[0] = getNearestWorldX(
      point[0],
      mapTransform.invertX(mapSize.width / 2),
      worldWidth,
    );
    return mapTransform.apply(point);
  }

  function focusCountry(country: GuessedCountryMapData): boolean {
    const region = findPacificRegion(country.mapNames);
    if (region) return focusBounds(region.bounds, 7, 0.56);

    const didFocusCountry = focusCountries(
      getMapCountryNames(country.mapNames),
      7,
      0.56,
    );

    if (didFocusCountry) {
      return true;
    }

    if (!projection || !zoomBehaviorRef.current) {
      return false;
    }

    focusLocation(country);
    return true;
  }

  useEffect(() => {
    if (presentation !== "result" && focusedGuess === undefined) return;
    if (solutionCountry) focusLocation(solutionCountry);
    else if (focusedGuess) focusCountry(focusedGuess);
    else if (focusedGuess === null) resetWorld();
  }, [focusedGuess, mapSize, presentation, projection, solutionCountry]);

  useEffect(() => {
    if (guessedCountries.length === 0) {
      focusedGuessedCountryCountRef.current = 0;
      return;
    }

    if (
      layeredMap ||
      presentation !== "game" ||
      focusedGuess !== undefined ||
      guessedCountries.length <= focusedGuessedCountryCountRef.current
    ) {
      return;
    }

    const lastGuessedCountry = getLastGuessedCountry(guessedCountries);
    const mapGuess = islandMapGuessRef.current;
    islandMapGuessRef.current = null;
    if (
      mapGuess &&
      mapGuess.guessCount + 1 === guessedCountries.length &&
      lastGuessedCountry &&
      getMapCountryNames(lastGuessedCountry.mapNames).has(mapGuess.name)
    ) {
      focusedGuessedCountryCountRef.current = guessedCountries.length;
      return;
    }

    if (lastGuessedCountry && focusCountry(lastGuessedCountry)) {
      focusedGuessedCountryCountRef.current = guessedCountries.length;
    }
  }, [
    layeredMap,
    focusedGuess,
    guessedCountries,
    mapSize,
    presentation,
    projection,
  ]);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [],
  );

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (isMapExpanded && event.key === "Escape") {
      event.preventDefault();
      setDrawerState("medium");
      return;
    }

    if (!isMapExpanded || event.key !== "Tab" || !dialogRef.current) {
      return;
    }

    const focusableElements = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = focusableElements[0];
    const last = focusableElements.at(-1);

    if (!first || !last) {
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function setDrawerState(nextState: "hidden" | "medium" | "expanded") {
    if (onDrawerStateChange) {
      onDrawerStateChange(nextState);
      return;
    }

    onExpandedChange(nextState === "expanded");
  }

  function beginDrawerDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      return;
    }

    drawerDragStartYRef.current = event.clientY;
    drawerDragStartStateRef.current = effectiveDrawerState;
    didDrawerDragRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrawerDragOffsetY(0);
    setIsDrawerDragging(true);
  }

  function moveDrawerDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const startY = drawerDragStartYRef.current;

    if (startY === null) {
      return;
    }

    const deltaY = event.clientY - startY;
    didDrawerDragRef.current ||= Math.abs(deltaY) > 8;
    setDrawerDragOffsetY(Math.max(-220, Math.min(260, deltaY)));
  }

  function endDrawerDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const startY = drawerDragStartYRef.current;

    if (startY === null) {
      return;
    }

    const deltaY = event.clientY - startY;
    const startState = drawerDragStartStateRef.current;
    drawerDragStartYRef.current = null;
    setDrawerDragOffsetY(0);
    setIsDrawerDragging(false);

    if (startState === "expanded" && deltaY > 96) {
      setDrawerState("medium");
    } else if (startState === "medium" && deltaY < -72) {
      setDrawerState("expanded");
    } else if (startState === "medium" && deltaY > 96) {
      setDrawerState("hidden");
    }
  }

  if (presentation === "game" && !embedded && isMapHidden) {
    return (
      <HStack justify="center">
        <Button
          className="min-h-11 sm:min-h-0"
          elevation="med"
          icon={<ChevronUp aria-hidden="true" />}
          aria-label="Show world map"
          label="Show world map"
          onClick={() => setDrawerState("medium")}
          variant="secondary"
        >
          Show world map
        </Button>
      </HStack>
    );
  }

  return (
    <VStack
      className={
        embedded && !isMapExpanded
          ? "relative min-h-0 flex-1 w-full"
          : presentation === "result"
            ? "relative w-full"
            : isMapExpanded
              ? "fixed inset-0 z-80 grid place-items-center bg-overlay p-2 backdrop-blur-[3px] sm:p-5"
              : "pointer-events-none fixed inset-0 z-70 flex items-end justify-center px-2 sm:justify-end sm:px-5 lg:pointer-events-auto lg:static lg:z-auto lg:block lg:px-0"
      }
      onMouseDown={(event) => {
        if (isMapExpanded && event.target === event.currentTarget) {
          setDrawerState("medium");
        }
      }}
    >
      <VStack
        aria-describedby={helpId}
        aria-label="World map"
        aria-busy={isBusy}
        aria-modal={isMapExpanded ? true : undefined}
        className={`pointer-events-auto w-full ${hasLayeredCanvas ? "" : "overflow-hidden"} bg-body ${embedded && !isMapExpanded ? "min-h-0 flex-1 lg:rounded-xl lg:border lg:border-border" : "grid grid-rows-[minmax(0,1fr)_auto] border border-border shadow-md"} transition-[height,width,border-radius,transform] ${isDrawerDragging ? "duration-0" : "duration-300"} dark:shadow-md ${
          embedded && !isMapExpanded
            ? ""
            : presentation === "result"
              ? "h-44 rounded-xl sm:h-48"
              : isMapExpanded
                ? "h-[min(780px,calc(100dvh-1rem))] max-w-[1120px] rounded-xl sm:h-[min(760px,calc(100dvh-2.5rem))]"
                : "h-[clamp(190px,28dvh,270px)] max-w-[720px] rounded-t-[26px] border-b-0 sm:mb-5 sm:h-[clamp(210px,30dvh,300px)] sm:rounded-xl sm:border-b lg:mb-0 lg:h-[clamp(320px,42dvh,460px)] lg:max-w-none"
        } ${isActive ? "outline-2 outline-offset-2 outline-accent-bg" : "outline-none"}`}
        onKeyDown={handleDialogKeyDown}
        ref={dialogRef}
        role={isMapExpanded ? "dialog" : "region"}
        style={
          presentation === "game" && isDrawerDragging
            ? { transform: `translateY(${drawerDragOffsetY}px)` }
            : undefined
        }
      >
        <VStack
          aria-label={
            isCountryPicker
              ? "Interactive map for picking an answer country."
              : presentation === "result" && duelResult
                ? "Interactive duel result map. Each player's guesses use a different color, shared guesses are striped, and the correct answer is highlighted."
                : "Interactive unlabeled world map. Guessed countries are red and display their names and direction arrows."
          }
          className={`map-world-canvas relative min-h-0 flex-1 ${hasLayeredCanvas ? "" : "overflow-hidden"}`}
          ref={mapContainerRef}
          role="application"
        >
          {isBusy ? (
            <VStack
              className="absolute inset-0 z-20 bg-surface/60"
              align="center"
              justify="center"
            >
              <Spinner label="Loading…" size="lg" />
            </VStack>
          ) : null}
          {presentation === "game" && !embedded ? (
            <>
              <button
                aria-expanded={isMapExpanded}
                aria-label={
                  isMapExpanded ? "Collapse world map" : "Expand world map"
                }
                className="absolute left-1/2 top-2 z-10 flex h-11 w-28 -translate-x-1/2 touch-none items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-accent-muted lg:hidden"
                onClick={() => {
                  if (didDrawerDragRef.current) {
                    didDrawerDragRef.current = false;
                    return;
                  }

                  setDrawerState(isMapExpanded ? "medium" : "expanded");
                }}
                onPointerCancel={endDrawerDrag}
                onPointerDown={beginDrawerDrag}
                onPointerMove={moveDrawerDrag}
                onPointerUp={endDrawerDrag}
                ref={expandButtonRef}
                type="button"
              >
                <span className="h-1.5 w-12 rounded-full bg-muted shadow-sm" />
                <span className="sr-only">
                  {isMapExpanded ? "Collapse" : "Expand"} world map
                </span>
              </button>
              <IconButton
                className="absolute right-3 top-2 z-10 min-h-11 min-w-11 lg:hidden"
                elevation="high"
                icon={<X aria-hidden="true" />}
                label="Hide world map"
                onClick={() => setDrawerState("hidden")}
                tooltip="Hide world map"
                variant="secondary"
              />
              <Button
                className="absolute right-4 top-4 z-10 hidden lg:inline-flex"
                elevation="high"
                icon={
                  isMapExpanded ? (
                    <ChevronDown aria-hidden="true" />
                  ) : (
                    <ChevronUp aria-hidden="true" />
                  )
                }
                label={isMapExpanded ? "Minimize" : "Expand"}
                onClick={() =>
                  setDrawerState(isMapExpanded ? "medium" : "expanded")
                }
                variant="secondary"
              />
            </>
          ) : null}
          {presentation === "game" && onCountryGuess && !isCountryPicker ? (
            <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-accent-bg/20 bg-body px-3 py-1.5 text-xs font-semibold text-accent shadow-sm backdrop-blur  sm:left-4 sm:top-4">
              Tap a country
            </span>
          ) : null}
          <svg
            aria-label="Country outlines and small-country markers"
            className={`${hasLayeredCanvas ? "absolute inset-x-0 top-0 h-lvh w-full bg-muted" : "size-full"} touch-none select-none ${canInteractWithMap ? "" : "pointer-events-none"} ${onCountryGuess ? "map-world-guessing" : ""}`}
            data-suppress-touch-highlight={suppressTouchHighlight || undefined}
            onClick={onMapClickDuringReveal}
            onMouseDownCapture={(event) => {
              // Let the country click land before blurring the input resizes the map.
              if (layeredMap && onCountryGuess) event.preventDefault();
            }}
            onTouchStartCapture={(event) => {
              // Keep pinch hover suppressed after release until the next single touch.
              setSuppressTouchHighlight(event.touches.length > 1);
            }}
            ref={svgRef}
            viewBox={
              hasLayeredCanvas
                ? undefined
                : `0 0 ${mapSize.width || 1} ${mapSize.height || 1}`
            }
          >
            {worldCopies.map((copy) => (
              <g
                data-map-world-copy={copy}
                key={copy}
                transform={`translate(${mapTransform.applyX(copy * worldWidth)} ${mapTransform.y}) scale(${mapTransform.k})`}
              >
                {path
                  ? COUNTRY_DATA.features.map((country, index) => {
                      const name = country.properties.normalizedName;
                      const countryPath = countryPaths[index];
                      if (
                        !countryPath?.outline ||
                        !isMapBoundsVisible(countryPath.bounds, copy)
                      )
                        return null;
                      const guessedCountry = guessedCountryByName.get(name);
                      const playableCountry =
                        playableCountryByMapName.get(name);
                      const isSolution = solutionNames.has(name);
                      const isUnavailable =
                        Boolean(onCountryGuess) &&
                        !playableCountry &&
                        !guessedCountry;

                      return (
                        <CountryShape
                          border={countryPath.border}
                          className={
                            isSolution
                              ? duelResult
                                ? "map-country map-country--solution-duel"
                                : "map-country map-country--solution"
                              : guessedCountry
                                ? guessedCountry.markerTone
                                  ? `map-country map-country--guessed-${guessedCountry.markerTone}`
                                  : "map-country map-country--guessed"
                                : isUnavailable
                                  ? "map-country map-country--unavailable"
                                  : onCountryGuess && playableCountry
                                    ? "map-country map-country--playable"
                                    : "map-country"
                          }
                          d={countryPath.outline}
                          key={`${country.id ?? name}-${index}`}
                          onClick={
                            guessedCountry
                              ? () => focusCountry(guessedCountry)
                              : onCountryGuess && playableCountry
                                ? () => onCountryGuess(playableCountry)
                                : undefined
                          }
                        >
                          {isCountryPicker && playableCountry ? (
                            <title>{playableCountry}</title>
                          ) : isUnavailable && !isCountryPicker ? (
                            <title>{`${country.properties.name} is unavailable to guess`}</title>
                          ) : null}
                        </CountryShape>
                      );
                    })
                  : null}
                {/*
                Render highlighted countries a second time, after the base map.
                SVG paints later paths on top of earlier ones; without this
                overlay, a later-rendered neighbour can cover a highlighted
                country's shared border with its default stroke.
              */}
                {path
                  ? COUNTRY_DATA.features.map((country, index) => {
                      const name = country.properties.normalizedName;
                      const countryPath = countryPaths[index];
                      if (
                        !countryPath?.outline ||
                        !isMapBoundsVisible(countryPath.bounds, copy)
                      )
                        return null;
                      const guessedCountry = guessedCountryByName.get(name);
                      const isSolution = solutionNames.has(name);

                      if (!guessedCountry && !isSolution) {
                        return null;
                      }

                      return (
                        <CountryShape
                          border={countryPath.border}
                          className={
                            isSolution
                              ? duelResult
                                ? "map-country map-country--solution-duel"
                                : "map-country map-country--solution"
                              : guessedCountry!.markerTone
                                ? `map-country map-country--guessed-${guessedCountry!.markerTone}`
                                : "map-country map-country--guessed"
                          }
                          d={countryPath.outline}
                          key={`highlight-${country.id ?? name}-${index}`}
                          onClick={
                            guessedCountry
                              ? () => focusCountry(guessedCountry)
                              : undefined
                          }
                        />
                      );
                    })
                  : null}
              </g>
            ))}
            {smallCountryTargets.map(({ country, copy, point, opacity }) => {
              const name = country.properties.normalizedName;
              const guessedCountry = guessedCountryByName.get(name);
              const playableCountry = playableCountryByMapName.get(name);
              const isSolution = solutionNames.has(name);
              const isInteractive = Boolean(
                guessedCountry ||
                isSolution ||
                (playableCountry && (onCountryGuess || onMapClickDuringReveal)),
              );
              const activate = () => {
                if (guessedCountry) focusCountry(guessedCountry);
                else if (isSolution && solutionCountry)
                  focusLocation(solutionCountry);
                else if (isCountryPicker && playableCountry)
                  onCountryGuess?.(playableCountry);
                else selectSmallCountry(point);
              };
              return (
                <g
                  aria-label={
                    isInteractive
                      ? guessedCountry
                        ? `Focus guess: ${guessedCountry.name}`
                        : isSolution && solutionCountry
                          ? `Focus solution: ${solutionCountry.name}`
                          : isCountryPicker && playableCountry
                            ? `Select ${playableCountry}`
                            : "Select small country"
                      : undefined
                  }
                  className="group outline-none"
                  data-map-country-target={name}
                  key={`target-${country.id ?? name}-${name}-${copy}`}
                  onClick={
                    isInteractive
                      ? (event) => {
                          const bounds =
                            svgRef.current!.getBoundingClientRect();
                          if (
                            (onCountryGuess || onMapClickDuringReveal) &&
                            !guessedCountry &&
                            !isSolution
                          ) {
                            selectSmallCountry(
                              [
                                event.clientX - bounds.left,
                                event.clientY - bounds.top,
                              ],
                              "pointerType" in event.nativeEvent &&
                                event.nativeEvent.pointerType === "mouse"
                                ? 12
                                : COUNTRY_TOUCH_TARGET_SIZE,
                            );
                          } else activate();
                        }
                      : undefined
                  }
                  onKeyDown={
                    isInteractive
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            activate();
                            onMapClickDuringReveal?.();
                          }
                        }
                      : undefined
                  }
                  role={isInteractive ? "button" : undefined}
                  tabIndex={isInteractive ? 0 : undefined}
                  transform={`translate(${point[0]} ${point[1]})`}
                >
                  {isInteractive ? (
                    <rect
                      className="cursor-pointer fill-transparent stroke-transparent pointer-fine:pointer-events-none"
                      height={COUNTRY_TOUCH_TARGET_SIZE}
                      width={COUNTRY_TOUCH_TARGET_SIZE}
                      x={-COUNTRY_TOUCH_TARGET_SIZE / 2}
                      y={-COUNTRY_TOUCH_TARGET_SIZE / 2}
                    />
                  ) : null}
                  <circle
                    className={`pointer-events-none ${isInteractive && opacity > 0 ? "pointer-fine:pointer-events-auto cursor-pointer" : ""} ${
                      isSolution
                        ? duelResult
                          ? "map-country map-country--solution-duel"
                          : "map-country map-country--solution"
                        : guessedCountry
                          ? `map-country map-country--guessed${guessedCountry.markerTone ? `-${guessedCountry.markerTone}` : ""}`
                          : `fill-surface stroke-secondary ${playableCountry && !suppressTouchHighlight ? "group-hover:fill-blue-subtle group-hover:stroke-blue-vivid group-focus-visible:fill-blue-subtle group-focus-visible:stroke-blue-vivid" : ""}`
                    }`}
                    opacity={opacity}
                    r={4}
                  />
                  <circle
                    className="pointer-events-none fill-none stroke-blue-vivid opacity-0 group-focus-visible:opacity-100"
                    r={7}
                  />
                </g>
              );
            })}
            {showPacificRegions &&
              pacificCopies.map((copy) => (
                <g
                  key={copy}
                  transform={`translate(${mapTransform.applyX(copy * worldWidth)} ${mapTransform.y}) scale(${mapTransform.k})`}
                >
                  {pacificRegionPaths.map(
                    ({ countryId, mapName, anchor, outline, bounds }) => {
                      if (!outline || !isMapBoundsVisible(bounds, copy))
                        return null;
                      if (!anchor)
                        return (
                          <path
                            aria-hidden="true"
                            className="map-island-group map-island-group--context pointer-events-none"
                            d={outline}
                            key={countryId}
                            vectorEffect="non-scaling-stroke"
                          />
                        );
                      if (!mapName) return null;
                      const guessedCountry = guessedCountryByName.get(mapName);
                      const playableCountry =
                        playableCountryByMapName.get(mapName);
                      const isSolution = solutionNames.has(mapName);
                      if (!playableCountry && !guessedCountry && !isSolution)
                        return null;

                      const label =
                        guessedCountry?.name ??
                        (isSolution
                          ? solutionCountry?.name
                          : isCountryPicker
                            ? playableCountry
                            : undefined);
                      const isInteractive = Boolean(
                        guessedCountry ||
                        isSolution ||
                        (playableCountry &&
                          (onCountryGuess || onMapClickDuringReveal)),
                      );
                      const activate = () => {
                        if (guessedCountry || isSolution)
                          focusBounds(bounds, 7, 0.56);
                        else if (playableCountry && onCountryGuess) {
                          islandMapGuessRef.current = {
                            name: mapName,
                            guessCount: guessedCountries.length,
                          };
                          onCountryGuess(playableCountry);
                        }
                      };

                      return (
                        <path
                          aria-label={
                            isInteractive
                              ? (label ?? "Select island group")
                              : undefined
                          }
                          className={`map-island-group ${
                            isSolution
                              ? duelResult
                                ? "map-country--solution-duel"
                                : "map-country--solution"
                              : guessedCountry
                                ? `map-country--guessed${guessedCountry.markerTone ? `-${guessedCountry.markerTone}` : ""}`
                                : ""
                          }`}
                          d={outline}
                          data-map-island-group={mapName}
                          key={countryId}
                          onClick={isInteractive ? activate : undefined}
                          onKeyDown={
                            isInteractive
                              ? (event) => {
                                  if (
                                    event.key !== "Enter" &&
                                    event.key !== " "
                                  )
                                    return;
                                  event.preventDefault();
                                  activate();
                                  onMapClickDuringReveal?.();
                                }
                              : undefined
                          }
                          role={isInteractive ? "button" : undefined}
                          tabIndex={isInteractive ? 0 : undefined}
                          vectorEffect="non-scaling-stroke"
                        >
                          {label ? <title>{label}</title> : null}
                        </path>
                      );
                    },
                  )}
                </g>
              ))}
            <defs>
              <pattern
                height={8}
                id="map-duel-both-stripes"
                patternTransform="rotate(45)"
                patternUnits="userSpaceOnUse"
                width={8}
              >
                <rect
                  className="map-duel-stripe map-duel-stripe--challenger"
                  height={8}
                  width={4}
                  x={0}
                  y={0}
                />
                <rect
                  className="map-duel-stripe map-duel-stripe--opponent"
                  height={8}
                  width={4}
                  x={4}
                  y={0}
                />
              </pattern>
            </defs>
          </svg>

          {presentation === "game" && projection
            ? guessedCountries.map((country) => {
                const position = getMarkerPosition(country);
                if (!position) return null;
                const [left, top] = position;

                return (
                  <button
                    aria-label={`${country.name}. Goal is ${DIRECTION_LABEL[country.direction]}.`}
                    className="map-guess-marker absolute z-5"
                    key={country.qid}
                    onClick={() => {
                      focusCountry(country);
                      onMapClickDuringReveal?.();
                    }}
                    style={{ left, top }}
                    title={`Focus ${country.name}`}
                    type="button"
                  >
                    <span className="map-guess-marker-label">
                      {country.name}
                    </span>
                    <span className="map-guess-marker-arrow">
                      <DirectionArrow direction={country.direction} />
                    </span>
                  </button>
                );
              })
            : null}

          {presentation === "result" && projection
            ? guessedCountries.map((country) => {
                const position = getMarkerPosition(country);
                if (!position) return null;
                const [left, top] = position;

                return (
                  <button
                    aria-label={`Focus guess: ${country.name}. Goal is ${DIRECTION_LABEL[country.direction]}.`}
                    className={`map-guess-marker absolute z-5 ${country.markerTone ? `map-guess-marker--${country.markerTone}` : ""}`}
                    key={`${country.markerTone ?? "guess"}-${country.qid}`}
                    onClick={() => focusCountry(country)}
                    style={{ left, top }}
                    title={`Focus ${country.name}`}
                    type="button"
                  >
                    <span className="map-guess-marker-label">
                      {country.name}
                    </span>
                    <span className="map-guess-marker-arrow">
                      <DirectionArrow direction={country.direction} />
                    </span>
                  </button>
                );
              })
            : null}

          {projection && solutionCountry
            ? (() => {
                const position = getMarkerPosition(solutionCountry);
                if (!position) return null;
                const [left, top] = position;

                return (
                  <button
                    aria-label={`Focus solution: ${solutionCountry.name}`}
                    className={`map-solution-marker absolute z-5 ${duelResult ? "map-solution-marker--duel" : ""}`}
                    onClick={() => focusLocation(solutionCountry)}
                    style={{ left, top }}
                    title={`Focus ${solutionCountry.name}`}
                    type="button"
                  >
                    {solutionCountry.name}
                  </button>
                );
              })()
            : null}

          {presentation === "game" ? (
            <HStack
              className="absolute bottom-3 left-3 z-10 flex-nowrap lg:bottom-4 lg:left-4 lg:flex-col"
              onPointerDown={(event) => event.preventDefault()}
              gap={2}
            >
              <IconButton
                elevation="high"
                icon={<Plus aria-hidden="true" />}
                label="Zoom in"
                onClick={() => changeZoom(MAP_ZOOM_STEP)}
                size="lg"
                tooltip="Zoom in"
                variant="secondary"
              />
              <IconButton
                elevation="high"
                icon={<Minus aria-hidden="true" />}
                label="Zoom out"
                onClick={() => changeZoom(1 / MAP_ZOOM_STEP)}
                size="lg"
                tooltip="Zoom out"
                variant="secondary"
              />
              {!isCountryPicker ? (
                <IconButton
                  elevation="high"
                  icon={<Focus aria-hidden="true" />}
                  isDisabled={guessedCountries.length === 0}
                  label="Fit all guessed countries"
                  onClick={fitGuessedCountries}
                  size="lg"
                  tooltip="Fit all guessed countries"
                  variant="secondary"
                />
              ) : null}
              <IconButton
                elevation="high"
                icon={<Scan aria-hidden="true" />}
                label="Reset map zoom"
                onClick={resetWorld}
                size="lg"
                tooltip="Reset map zoom"
                variant="secondary"
              />
            </HStack>
          ) : null}

          <span className="pointer-events-none absolute bottom-3 right-3 z-10 hidden rounded-full bg-card px-2 py-1 text-xs font-medium text-secondary backdrop-blur sm:inline-flex">
            Map data: Natural Earth
            {showPacificRegions ? (
              <>
                {" "}
                ·{" "}
                <a
                  className="pointer-events-auto underline"
                  href={PACIFIC_REGIONS_SOURCE}
                  target="_blank"
                  rel="noreferrer"
                >
                  Pacific regions
                </a>
              </>
            ) : null}
          </span>
        </VStack>

        <footer
          className={`border-t border-border bg-card text-center text-sm text-secondary  ${
            isMapExpanded && presentation === "game" ? "px-4 py-3" : "sr-only"
          }`}
          id={helpId}
        >
          Drag to explore · Scroll or pinch to zoom
        </footer>
      </VStack>
    </VStack>
  );
}
