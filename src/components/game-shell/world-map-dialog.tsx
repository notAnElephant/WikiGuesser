"use client";

import { normalizeGuess } from "@/src/lib/game/answer-matching";
import type { GuessDirection, GuessedCountryMapData } from "@/src/lib/types";
import { geoMercator, geoPath, type GeoProjection } from "d3-geo";
import { select } from "d3-selection";
import {
  zoom,
  type ZoomBehavior,
  zoomIdentity,
  type ZoomTransform,
} from "d3-zoom";
import type { FeatureCollection, Geometry } from "geojson";
import { ChevronDown, ChevronUp, Focus, Minus, Plus, Scan } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldTopology from "world-atlas/countries-110m.json";

interface CountryProperties {
  name?: string;
  normalizedName: string;
}

interface WorldMapDialogProps {
  guessedCountries: GuessedCountryMapData[];
  isExpanded: boolean;
  onExpandedChange: (isExpanded: boolean) => void;
}

interface MapSize {
  width: number;
  height: number;
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

function buildCountryData(): FeatureCollection<Geometry, CountryProperties> {
  const topology = worldTopology as unknown as Topology;
  const countries = topology.objects.countries as GeometryCollection<{
    name?: string;
  }>;
  const collection = feature(topology, countries);

  return {
    ...collection,
    features: collection.features
      .filter((country) => country.properties?.name !== "Antarctica")
      .map((country) => {
        const name = country.properties?.name ?? "";

        return {
          ...country,
          properties: {
            ...country.properties,
            normalizedName: normalizeGuess(name),
          },
        };
      }),
  };
}

const COUNTRY_DATA = buildCountryData();

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
  onExpandedChange,
}: WorldMapDialogProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(
    null,
  );
  const mapTransformRef = useRef<ZoomTransform>(zoomIdentity);
  const animationFrameRef = useRef<number | null>(null);
  const previousGuessedCountryCountRef = useRef(guessedCountries.length);
  const previousMapSizeRef = useRef<MapSize | null>(null);
  const previousProjectionRef = useRef<GeoProjection | null>(null);
  const [mapSize, setMapSize] = useState<MapSize>({ width: 0, height: 0 });
  const [mapTransform, setMapTransform] = useState<ZoomTransform>(zoomIdentity);
  const guessedNames = useMemo(
    () =>
      new Set(
        guessedCountries.flatMap((country) =>
          country.mapNames.map(normalizeGuess),
        ),
      ),
    [guessedCountries],
  );
  const guessedCountryByName = useMemo(() => {
    const countriesByName = new Map<string, GuessedCountryMapData>();

    for (const country of guessedCountries) {
      for (const mapName of country.mapNames) {
        countriesByName.set(normalizeGuess(mapName), country);
      }
    }

    return countriesByName;
  }, [guessedCountries]);
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
    if (!isExpanded) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    expandButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isExpanded]);

  useEffect(() => {
    const container = mapContainerRef.current;

    if (!container) {
      return;
    }

    const updateSize = () => {
      const bounds = container.getBoundingClientRect();
      setMapSize({ width: bounds.width, height: bounds.height });
    };
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

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
  ) {
    const svg = svgRef.current;
    const behavior = zoomBehaviorRef.current;

    if (!svg || !behavior || !path || targetNames.size === 0) {
      return;
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
      return;
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
  }

  function fitGuessedCountries() {
    focusCountries(guessedNames, 10, 0.72);
  }

  function focusCountry(country: GuessedCountryMapData) {
    focusCountries(new Set(country.mapNames.map(normalizeGuess)), 7, 0.56);
  }

  useEffect(() => {
    const previousCount = previousGuessedCountryCountRef.current;
    previousGuessedCountryCountRef.current = guessedCountries.length;

    if (guessedCountries.length <= previousCount) {
      return;
    }

    fitGuessedCountries();
  }, [guessedCountries]);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [],
  );

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (isExpanded && event.key === "Escape") {
      event.preventDefault();
      onExpandedChange(false);
      return;
    }

    if (!isExpanded || event.key !== "Tab" || !dialogRef.current) {
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

  return (
    <div
      className={
        isExpanded
          ? "fixed inset-0 z-[80] grid place-items-center bg-[rgba(20,26,28,0.54)] p-2 backdrop-blur-[3px] sm:p-5"
          : "pointer-events-none fixed inset-0 z-[70] flex items-end justify-center px-2 sm:justify-end sm:px-5 lg:pointer-events-auto lg:static lg:z-auto lg:block lg:px-0"
      }
      onMouseDown={(event) => {
        if (isExpanded && event.target === event.currentTarget) {
          onExpandedChange(false);
        }
      }}
    >
      <div
        aria-describedby="world-map-help"
        aria-label="World map"
        aria-modal={isExpanded ? true : undefined}
        className={`pointer-events-auto grid w-full grid-rows-[minmax(0,1fr)_auto] overflow-hidden border border-black/16 bg-[#fbf7ef] shadow-[0_18px_60px_rgba(17,24,39,0.3)] outline-none transition-[height,width,border-radius] duration-300 dark:border-white/14 dark:bg-[#101a27] dark:shadow-[0_18px_60px_rgba(0,0,0,0.58)] ${
          isExpanded
            ? "h-[min(780px,calc(100dvh-1rem))] max-w-[1120px] rounded-[28px] sm:h-[min(760px,calc(100dvh-2.5rem))]"
            : "h-[clamp(190px,28dvh,270px)] max-w-[720px] rounded-t-[26px] border-b-0 sm:mb-5 sm:h-[clamp(210px,30dvh,300px)] sm:rounded-[26px] sm:border-b lg:mb-0 lg:h-[clamp(320px,42dvh,460px)] lg:max-w-none"
        }`}
        onKeyDown={handleDialogKeyDown}
        ref={dialogRef}
        role={isExpanded ? "dialog" : "region"}
      >
        <div
          aria-label="Interactive unlabeled world map. Guessed countries are red and display their names and direction arrows."
          className="map-world-canvas relative min-h-0 overflow-hidden"
          ref={mapContainerRef}
          role="application"
        >
          <button
            aria-label={isExpanded ? "Minimize world map" : "Expand world map"}
            className="absolute right-4 top-4 z-10 inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-black/10 bg-white/90 px-3 text-sm font-semibold text-[#1f1b17] shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:border-[#0f766e]/30 hover:text-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/35 dark:border-white/12 dark:bg-[#132131]/90 dark:text-[#f5f7fb] dark:hover:border-[#24d4c2]/35 dark:hover:text-[#8ff4e7]"
            onClick={() => onExpandedChange(!isExpanded)}
            ref={expandButtonRef}
            title={isExpanded ? "Minimize world map" : "Expand world map"}
            type="button"
          >
            {isExpanded ? (
              <ChevronDown
                aria-hidden="true"
                className="size-5"
                strokeWidth={2.2}
              />
            ) : (
              <ChevronUp
                aria-hidden="true"
                className="size-5"
                strokeWidth={2.2}
              />
            )}
            {isExpanded ? "Minimize" : "Expand"}
          </button>
          <svg
            aria-hidden="true"
            className="size-full touch-none select-none"
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

                    return countryPath ? (
                      <path
                        className={
                          guessedCountry
                            ? "map-country map-country--guessed"
                            : "map-country"
                        }
                        d={countryPath}
                        key={`${country.id ?? name}-${index}`}
                        onClick={
                          guessedCountry
                            ? () => focusCountry(guessedCountry)
                            : undefined
                        }
                        vectorEffect="non-scaling-stroke"
                      />
                    ) : null;
                  })
                : null}
            </g>
          </svg>

          {projection
            ? guessedCountries.map((country) => {
                const point = projection([country.longitude, country.latitude]);

                if (!point) {
                  return null;
                }

                const [left, top] = mapTransform.apply(point);

                return (
                  <button
                    aria-label={`${country.name}. Goal is ${DIRECTION_LABEL[country.direction]}.`}
                    className="map-guess-marker absolute z-5"
                    key={country.qid}
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

          <div className="absolute bottom-3 left-3 z-10 grid gap-1.5 sm:bottom-4 sm:left-4 sm:gap-2">
            <div className="grid w-9 overflow-hidden rounded-xl border border-black/16 bg-[#fbf7ef]/94 shadow-lg backdrop-blur dark:border-white/14 dark:bg-[#132131]/94 sm:w-11 sm:rounded-2xl">
              <button
                aria-label="Zoom in"
                className="inline-flex size-9 items-center justify-center text-[#17313a] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0f766e]/40 dark:text-[#d7e1ec] dark:hover:bg-white/10 sm:size-11"
                onClick={() => changeZoom(1.45)}
                title="Zoom in"
                type="button"
              >
                <Plus
                  aria-hidden="true"
                  className="size-4 sm:size-5"
                  strokeWidth={2.2}
                />
              </button>
              <button
                aria-label="Zoom out"
                className="inline-flex size-9 items-center justify-center border-t border-black/12 text-[#17313a] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0f766e]/40 dark:border-white/12 dark:text-[#d7e1ec] dark:hover:bg-white/10 sm:size-11"
                onClick={() => changeZoom(1 / 1.45)}
                title="Zoom out"
                type="button"
              >
                <Minus
                  aria-hidden="true"
                  className="size-4 sm:size-5"
                  strokeWidth={2.2}
                />
              </button>
            </div>
            <button
              aria-label="Fit all guessed countries"
              className="inline-flex size-9 items-center justify-center rounded-xl border border-black/16 bg-[#fbf7ef]/94 text-[#17313a] shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f766e]/35 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/14 dark:bg-[#132131]/94 dark:text-[#d7e1ec] dark:hover:bg-[#1a2c3f] sm:size-11 sm:rounded-2xl"
              disabled={guessedCountries.length === 0}
              onClick={fitGuessedCountries}
              title="Fit all guessed countries"
              type="button"
            >
              <Focus
                aria-hidden="true"
                className="size-4 sm:size-5"
                strokeWidth={2.2}
              />
            </button>
            <button
              aria-label="Reset map zoom"
              className="inline-flex size-9 items-center justify-center rounded-xl border border-black/16 bg-[#fbf7ef]/94 text-[#17313a] shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f766e]/35 dark:border-white/14 dark:bg-[#132131]/94 dark:text-[#d7e1ec] dark:hover:bg-[#1a2c3f] sm:size-11 sm:rounded-2xl"
              onClick={resetWorld}
              title="Reset map zoom"
              type="button"
            >
              <Scan
                aria-hidden="true"
                className="size-4 sm:size-5"
                strokeWidth={2.2}
              />
            </button>
          </div>

          <span className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full bg-white/72 px-2 py-1 text-[0.62rem] font-medium text-[#53636a] backdrop-blur dark:bg-[#0d1723]/72 dark:text-[#aab8c6]">
            Map data: Natural Earth
          </span>
        </div>

        <footer
          className={`border-t border-black/10 bg-white/76 text-center text-sm text-[#5f5a54] dark:border-white/10 dark:bg-white/5 dark:text-[#aab8c6] ${
            isExpanded ? "px-4 py-3" : "sr-only"
          }`}
          id="world-map-help"
        >
          Drag to explore · Scroll or pinch to zoom
        </footer>
      </div>
    </div>
  );
}
