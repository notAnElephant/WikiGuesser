"use client";

import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import { normalizeGuess } from "@/src/lib/game/answer-matching";
import {
  COUNTRY_DATA,
  getMapCountryNames,
} from "@/src/lib/game/world-map-data";
import type {
  GuessDirection,
  GuessedCountryMapData,
  SolutionCountryMapData,
} from "@/src/lib/types";
import { geoMercator, geoPath, type GeoProjection } from "d3-geo";
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
import { useEffect, useMemo, useRef, useState } from "react";

interface WorldMapDialogProps {
  drawerState?: "hidden" | "medium" | "expanded";
  guessedCountries: readonly (GuessedCountryMapData & {
    markerTone?: "challenger" | "opponent";
  })[];
  isExpanded: boolean;
  onDrawerStateChange?: (drawerState: "hidden" | "medium" | "expanded") => void;
  onExpandedChange: (isExpanded: boolean) => void;
  onCountryGuess?: (countryName: string) => void;
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
  guessedCountries: readonly (GuessedCountryMapData & {
    markerTone?: "challenger" | "opponent";
  })[],
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

interface ResizeTransformOptions {
  currentTransform: ZoomTransform;
  mapSize: MapSize;
  previousMapSize: MapSize;
  previousProjection: GeoProjection;
  projection: GeoProjection;
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
  const geographicCenter = previousProjection.invert?.(previousMapCenter);

  if (!geographicCenter) {
    return null;
  }

  const nextMapCenter = projection(geographicCenter);

  if (!nextMapCenter) {
    return null;
  }

  const nextScale = Math.min(
    20,
    Math.max(
      1,
      currentTransform.k * (previousProjection.scale() / projection.scale()),
    ),
  );

  return zoomIdentity
    .translate(mapSize.width / 2, mapSize.height / 2)
    .scale(nextScale)
    .translate(-nextMapCenter[0], -nextMapCenter[1]);
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
  guessedCountries,
  isExpanded,
  drawerState,
  onDrawerStateChange,
  onExpandedChange,
  onCountryGuess,
  presentation = "game",
  solutionCountry = null,
}: WorldMapDialogProps) {
  const effectiveDrawerState =
    presentation === "game"
      ? (drawerState ?? (isExpanded ? "expanded" : "medium"))
      : "medium";
  const isMapExpanded = effectiveDrawerState === "expanded";
  const isMapHidden = effectiveDrawerState === "hidden";
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
  const focusedGuessedCountryCountRef = useRef(0);
  const previousMapSizeRef = useRef<MapSize | null>(null);
  const previousProjectionRef = useRef<GeoProjection | null>(null);
  const [mapSize, setMapSize] = useState<MapSize>({ width: 0, height: 0 });
  const [mapTransform, setMapTransform] = useState<ZoomTransform>(zoomIdentity);
  const [drawerDragOffsetY, setDrawerDragOffsetY] = useState(0);
  const [isDrawerDragging, setIsDrawerDragging] = useState(false);
  const guessedNames = useMemo(
    () =>
      new Set(
        guessedCountries.flatMap((country) => [
          ...getMapCountryNames(country.mapNames),
        ]),
      ),
    [guessedCountries],
  );
  const guessedCountryByName = useMemo(() => {
    const countriesByName = new Map<
      string,
      GuessedCountryMapData & { markerTone?: "challenger" | "opponent" }
    >();

    for (const country of guessedCountries) {
      for (const normalizedName of getMapCountryNames(country.mapNames)) {
        countriesByName.set(normalizedName, country);
      }
    }

    return countriesByName;
  }, [guessedCountries]);
  const solutionNames = useMemo(
    () =>
      solutionCountry
        ? getMapCountryNames(solutionCountry.mapNames)
        : new Set<string>(),
    [solutionCountry],
  );
  const projection = useMemo(() => {
    if (mapSize.width <= 0 || mapSize.height <= 0) {
      return null;
    }

    return geoMercator().fitExtent(
      [
        [18, 18],
        [mapSize.width - 18, mapSize.height - 18],
      ],
      COUNTRY_DATA,
    );
  }, [mapSize]);
  const path = useMemo(
    () => (projection ? geoPath(projection) : null),
    [projection],
  );

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
      const bounds = container.getBoundingClientRect();

      if (bounds.width > 0 && bounds.height > 0) {
        setMapSize({ width: bounds.width, height: bounds.height });
      }
    };
    updateSize();
    const animationFrame = window.requestAnimationFrame(updateSize);

    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [isMapHidden]);

  useEffect(() => {
    const svg = svgRef.current;

    if (!svg || mapSize.width <= 0 || mapSize.height <= 0) {
      return;
    }

    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 20])
      .extent([
        [0, 0],
        [mapSize.width, mapSize.height],
      ])
      .translateExtent([
        [0, 0],
        [mapSize.width, mapSize.height],
      ])
      .on("start.animation", (event) => {
        if (event.sourceEvent && animationFrameRef.current !== null) {
          window.cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      })
      .on("zoom", (event) => {
        mapTransformRef.current = event.transform;
        setMapTransform(event.transform);
      });
    const selection = select(svg);
    selection.call(behavior);
    selection.call(behavior.transform, mapTransformRef.current);
    zoomBehaviorRef.current = behavior;

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      selection.on(".zoom", null);
      zoomBehaviorRef.current = null;
    };
  }, [mapSize]);

  useEffect(() => {
    const previousMapSize = previousMapSizeRef.current;
    const previousProjection = previousProjectionRef.current;
    previousMapSizeRef.current = mapSize;
    previousProjectionRef.current = projection;

    if (
      !projection ||
      !previousProjection ||
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

    select(svg).call(behavior.transform, nextTransform);
  }, [mapSize, projection]);

  function changeZoom(factor: number) {
    const currentTransform = mapTransformRef.current;
    const centerX = mapSize.width / 2;
    const centerY = mapSize.height / 2;
    const [mapCenterX, mapCenterY] = currentTransform.invert([
      centerX,
      centerY,
    ]);
    const scale = Math.min(20, Math.max(1, currentTransform.k * factor));
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

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }

    const selection = select(svg);
    const startTransform = mapTransformRef.current;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      selection.call(behavior.transform, targetTransform);
      animationFrameRef.current = null;
      return;
    }

    const duration = 480;
    const startedAt = performance.now();

    const updateTransform = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startedAt) / duration);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const scale =
        startTransform.k *
        Math.pow(targetTransform.k / startTransform.k, easedProgress);
      const x =
        startTransform.x +
        (targetTransform.x - startTransform.x) * easedProgress;
      const y =
        startTransform.y +
        (targetTransform.y - startTransform.y) * easedProgress;
      const interpolatedTransform = zoomIdentity.translate(x, y).scale(scale);

      selection.call(behavior.transform, interpolatedTransform);

      if (progress < 1) {
        animationFrameRef.current =
          window.requestAnimationFrame(updateTransform);
      } else {
        animationFrameRef.current = null;
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

  function focusLocation(location: MapLocation) {
    const svg = svgRef.current;
    const behavior = zoomBehaviorRef.current;

    if (!svg || !behavior || !projection) {
      return;
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

  function focusLocations(
    locations: readonly MapLocation[],
    maximumScale: number,
    viewportCoverage: number,
  ): boolean {
    const behavior = zoomBehaviorRef.current;

    if (!behavior || !projection || locations.length === 0) {
      return false;
    }

    const points = locations
      .map((location) => projection([location.longitude, location.latitude]))
      .filter((point): point is [number, number] => point !== null);

    if (points.length === 0) {
      return false;
    }

    const left = Math.min(...points.map(([x]) => x));
    const top = Math.min(...points.map(([, y]) => y));
    const right = Math.max(...points.map(([x]) => x));
    const bottom = Math.max(...points.map(([, y]) => y));
    const boundsWidth = Math.max(32, right - left);
    const boundsHeight = Math.max(32, bottom - top);
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
    const transform = zoomIdentity
      .translate(mapSize.width / 2, mapSize.height / 2)
      .scale(scale)
      .translate(-(left + right) / 2, -(top + bottom) / 2);

    animateToTransform(transform);
    return true;
  }

  function fitGuessedCountries(): boolean {
    return focusLocations(guessedCountries, 10, 0.72);
  }

  function focusCountry(country: GuessedCountryMapData): boolean {
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
    if (presentation !== "result" || !solutionCountry) {
      return;
    }

    focusLocation(solutionCountry);
  }, [mapSize, presentation, projection, solutionCountry]);

  useEffect(() => {
    if (guessedCountries.length === 0) {
      focusedGuessedCountryCountRef.current = 0;
      return;
    }

    if (
      presentation !== "game" ||
      guessedCountries.length <= focusedGuessedCountryCountRef.current
    ) {
      return;
    }

    const lastGuessedCountry = getLastGuessedCountry(guessedCountries);

    if (lastGuessedCountry && focusCountry(lastGuessedCountry)) {
      focusedGuessedCountryCountRef.current = guessedCountries.length;
    }
  }, [guessedCountries, mapSize, presentation, projection]);

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

  if (presentation === "game" && isMapHidden) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center px-2 pb-2 sm:justify-end sm:px-5 sm:pb-5 lg:static lg:px-0 lg:pb-0">
        <Button
          elevation="med"
          icon={<ChevronUp aria-hidden="true" />}
          label="Show world map"
          onClick={() => setDrawerState("medium")}
          variant="secondary"
        >
          Show map
        </Button>
      </div>
    );
  }

  return (
    <div
      className={
        presentation === "result"
          ? "relative w-full"
          : isMapExpanded
            ? "fixed inset-0 z-[80] grid place-items-center bg-overlay p-2 backdrop-blur-[3px] sm:p-5"
            : "pointer-events-none fixed inset-0 z-[70] flex items-end justify-center px-2 sm:justify-end sm:px-5 lg:pointer-events-auto lg:static lg:z-auto lg:block lg:px-0"
      }
      onMouseDown={(event) => {
        if (isMapExpanded && event.target === event.currentTarget) {
          setDrawerState("medium");
        }
      }}
    >
      <div
        aria-describedby="world-map-help"
        aria-label="World map"
        aria-modal={isMapExpanded ? true : undefined}
        className={`pointer-events-auto grid w-full grid-rows-[minmax(0,1fr)_auto] overflow-hidden border border-border bg-body shadow-md outline-none transition-[height,width,border-radius,transform] ${isDrawerDragging ? "duration-0" : "duration-300"}  dark:shadow-md ${
          presentation === "result"
            ? "h-64 rounded-xl sm:h-72"
            : isMapExpanded
              ? "h-[min(780px,calc(100dvh-1rem))] max-w-[1120px] rounded-xl sm:h-[min(760px,calc(100dvh-2.5rem))]"
              : "h-[clamp(190px,28dvh,270px)] max-w-[720px] rounded-t-[26px] border-b-0 sm:mb-5 sm:h-[clamp(210px,30dvh,300px)] sm:rounded-xl sm:border-b lg:mb-0 lg:h-[clamp(320px,42dvh,460px)] lg:max-w-none"
        }`}
        onKeyDown={handleDialogKeyDown}
        ref={dialogRef}
        role={isMapExpanded ? "dialog" : "region"}
        style={
          presentation === "game" && isDrawerDragging
            ? { transform: `translateY(${drawerDragOffsetY}px)` }
            : undefined
        }
      >
        <div
          aria-label={
            presentation === "result"
              ? "Interactive duel result map. Each player's guesses use a different color and the answer is highlighted."
              : "Interactive unlabeled world map. Guessed countries display their names and direction arrows."
          }
          className="map-world-canvas relative min-h-0 overflow-hidden"
          ref={mapContainerRef}
          role="application"
        >
          {presentation === "game" ? (
            <>
              <button
                aria-expanded={isMapExpanded}
                aria-label={
                  isMapExpanded ? "Collapse world map" : "Expand world map"
                }
                className="absolute left-1/2 top-2 z-10 flex h-9 w-28 -translate-x-1/2 touch-none items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-accent-muted lg:hidden"
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
                className="absolute right-3 top-2 z-10 lg:hidden"
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
          {presentation === "game" && onCountryGuess ? (
            <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-accent-bg/20 bg-body px-3 py-1.5 text-xs font-semibold text-accent shadow-sm backdrop-blur  sm:left-4 sm:top-4">
              Tap a country · half points
            </span>
          ) : null}
          <svg
            aria-hidden="true"
            className={`size-full touch-none select-none ${onCountryGuess ? "map-world-guessing" : ""}`}
            ref={svgRef}
            viewBox={`0 0 ${mapSize.width || 1} ${mapSize.height || 1}`}
          >
            <g
              transform={`translate(${mapTransform.x} ${mapTransform.y}) scale(${mapTransform.k})`}
            >
              {path
                ? COUNTRY_DATA.features.map((country, index) => {
                    const name = country.properties.normalizedName;
                    const countryPath = path(country);
                    const guessedCountry = guessedCountryByName.get(name);
                    const isSolution = solutionNames.has(name);

                    return countryPath ? (
                      <path
                        className={
                          isSolution
                            ? "map-country map-country--solution"
                            : guessedCountry
                              ? `map-country map-country--guessed-${guessedCountry.markerTone ?? "challenger"}`
                              : "map-country"
                        }
                        d={countryPath}
                        key={`${country.id ?? name}-${index}`}
                        onClick={
                          guessedCountry
                            ? () => focusCountry(guessedCountry)
                            : onCountryGuess
                              ? () =>
                                  onCountryGuess(
                                    country.properties.name ?? name,
                                  )
                              : undefined
                        }
                        vectorEffect="non-scaling-stroke"
                      />
                    ) : null;
                  })
                : null}
            </g>
          </svg>

          {projection && solutionCountry
            ? (() => {
                const point = projection([
                  solutionCountry.longitude,
                  solutionCountry.latitude,
                ]);

                if (!point) {
                  return null;
                }

                const [left, top] = mapTransform.apply(point);

                return (
                  <button
                    aria-label={`Focus solution: ${solutionCountry.name}`}
                    className="map-solution-marker absolute z-5"
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

          {presentation === "game" && projection
            ? guessedCountries.map((country, index) => {
                const point = projection([country.longitude, country.latitude]);

                if (!point) {
                  return null;
                }

                const [left, top] = mapTransform.apply(point);

                return (
                  <button
                    aria-label={`${country.name}. Goal is ${DIRECTION_LABEL[country.direction]}.`}
                    className={`map-guess-marker absolute z-5 ${country.markerTone === "opponent" ? "map-guess-marker--opponent" : "map-guess-marker--challenger"}`}
                    key={`${country.markerTone ?? "challenger"}-${country.qid}-${index}`}
                    onClick={() => focusCountry(country)}
                    style={{ left, top }}
                    title={`Focus ${country.name}`}
                    type="button"
                  >
                    <span>{country.name}</span>
                    <span className="map-guess-marker-arrow">
                      <DirectionArrow direction={country.direction} />
                    </span>
                  </button>
                );
              })
            : null}

          {presentation === "result" && projection
            ? guessedCountries.map((country, index) => {
                const point = projection([country.longitude, country.latitude]);

                if (!point) {
                  return null;
                }

                const [left, top] = mapTransform.apply(point);

                return (
                  <button
                    aria-label={`Focus guess: ${country.name}. Goal is ${DIRECTION_LABEL[country.direction]}.`}
                    className={`map-guess-marker absolute z-5 ${country.markerTone === "opponent" ? "map-guess-marker--opponent" : "map-guess-marker--challenger"}`}
                    key={`${country.markerTone ?? "challenger"}-${country.qid}-${index}`}
                    onClick={() => focusCountry(country)}
                    style={{ left, top }}
                    title={`Focus ${country.name}`}
                    type="button"
                  >
                    <span>{country.name}</span>
                    <span className="map-guess-marker-arrow">
                      <DirectionArrow direction={country.direction} />
                    </span>
                  </button>
                );
              })
            : null}

          {presentation === "game" ? (
            <div className="absolute bottom-3 left-3 z-10 grid gap-1.5 sm:bottom-4 sm:left-4 sm:gap-2">
              <div className="grid w-9 overflow-hidden rounded-xl border border-border bg-body shadow-lg backdrop-blur  sm:w-11 sm:rounded-2xl">
                <IconButton
                  icon={<Plus aria-hidden="true" />}
                  label="Zoom in"
                  onClick={() => changeZoom(1.45)}
                  size="lg"
                  tooltip="Zoom in"
                  variant="ghost"
                />
                <IconButton
                  icon={<Minus aria-hidden="true" />}
                  label="Zoom out"
                  onClick={() => changeZoom(1 / 1.45)}
                  size="lg"
                  tooltip="Zoom out"
                  variant="ghost"
                />
              </div>
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
              <IconButton
                elevation="high"
                icon={<Scan aria-hidden="true" />}
                label="Reset map zoom"
                onClick={resetWorld}
                size="lg"
                tooltip="Reset map zoom"
                variant="secondary"
              />
            </div>
          ) : null}

          <span className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full bg-card px-2 py-1 text-xs font-medium text-secondary backdrop-blur  ">
            Map data: Natural Earth
          </span>
        </div>

        <footer
          className={`border-t border-border bg-card text-center text-sm text-secondary  ${
            isMapExpanded && presentation === "game" ? "px-4 py-3" : "sr-only"
          }`}
          id="world-map-help"
        >
          Drag to explore · Scroll or pinch to zoom
        </footer>
      </div>
    </div>
  );
}
