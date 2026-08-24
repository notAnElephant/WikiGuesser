"use client";

import { normalizeGuess } from "@/src/lib/game/answer-matching";
import type { GuessedCountryMapData, GuessDirection } from "@/src/lib/types";
import { geoMercator, geoPath } from "d3-geo";
import { select } from "d3-selection";
import {
  zoom,
  zoomIdentity,
  type ZoomBehavior,
  type ZoomTransform,
} from "d3-zoom";
import type { FeatureCollection, Geometry } from "geojson";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
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
  onClose: () => void;
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
  onClose,
}: WorldMapDialogProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(
    null,
  );
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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

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
      .scaleExtent([1, 8])
      .extent([
        [0, 0],
        [mapSize.width, mapSize.height],
      ])
      .translateExtent([
        [0, 0],
        [mapSize.width, mapSize.height],
      ])
      .on("zoom", (event) => setMapTransform(event.transform));
    const selection = select(svg);
    selection.call(behavior);
    selection.call(behavior.transform, zoomIdentity);
    zoomBehaviorRef.current = behavior;

    return () => {
      selection.on(".zoom", null);
      zoomBehaviorRef.current = null;
    };
  }, [mapSize]);

  function changeZoom(factor: number) {
    const svg = svgRef.current;
    const behavior = zoomBehaviorRef.current;

    if (svg && behavior) {
      select(svg).call(behavior.scaleBy, factor);
    }
  }

  function resetWorld() {
    const svg = svgRef.current;
    const behavior = zoomBehaviorRef.current;

    if (svg && behavior) {
      select(svg).call(behavior.transform, zoomIdentity);
    }
  }

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab" || !dialogRef.current) {
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
      className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(20,26,28,0.54)] p-2 backdrop-blur-[3px] sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-describedby="world-map-help"
        aria-labelledby="world-map-title"
        aria-modal="true"
        className="grid h-[min(780px,calc(100dvh-1rem))] w-full max-w-[1120px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[28px] border border-black/16 bg-[#fbf7ef] shadow-[0_28px_90px_rgba(17,24,39,0.34)] outline-none dark:border-white/14 dark:bg-[#101a27] dark:shadow-[0_28px_90px_rgba(0,0,0,0.62)] sm:h-[min(760px,calc(100dvh-2.5rem))]"
        onKeyDown={handleDialogKeyDown}
        ref={dialogRef}
        role="dialog"
      >
        <header className="flex items-center justify-between gap-4 border-b border-black/10 bg-white/76 px-4 py-3 dark:border-white/10 dark:bg-white/5 sm:px-6 sm:py-4">
          <h2
            className="m-0 font-serif-display text-[clamp(1.8rem,5vw,3rem)] font-semibold leading-none tracking-[-0.05em] text-[#1f1b17] dark:text-[#f5f7fb]"
            id="world-map-title"
          >
            World map
          </h2>
          <button
            aria-label="Close world map"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white/82 text-[#1f1b17] transition hover:-translate-y-0.5 hover:border-[#0f766e]/30 hover:text-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/35 dark:border-white/12 dark:bg-white/7 dark:text-[#f5f7fb] dark:hover:border-[#24d4c2]/35 dark:hover:text-[#8ff4e7]"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="size-5" strokeWidth={2.2} />
          </button>
        </header>

        <div
          aria-label="Interactive unlabeled world map. Guessed countries are red and display their names and direction arrows."
          className="map-world-canvas relative min-h-0 overflow-hidden"
          ref={mapContainerRef}
          role="application"
        >
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
                    const isGuessed = guessedNames.has(name);

                    return countryPath ? (
                      <path
                        className={
                          isGuessed
                            ? "map-country map-country--guessed"
                            : "map-country"
                        }
                        d={countryPath}
                        key={`${country.id ?? name}-${index}`}
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
                  <div
                    aria-label={`${country.name}. Goal is ${DIRECTION_LABEL[country.direction]}.`}
                    className="map-guess-marker absolute z-[5]"
                    key={country.qid}
                    style={{ left, top }}
                  >
                    <span>{country.name}</span>
                    <span className="map-guess-marker-arrow">
                      <DirectionArrow direction={country.direction} />
                    </span>
                  </div>
                );
              })
            : null}

          <div className="absolute bottom-4 left-4 z-10 grid gap-2">
            <div className="grid w-11 overflow-hidden rounded-2xl border border-black/16 bg-[#fbf7ef]/94 shadow-lg backdrop-blur dark:border-white/16 dark:bg-[#132131]/94">
              <button
                aria-label="Zoom in"
                className="inline-flex size-11 items-center justify-center text-[#17313a] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0f766e]/40 dark:text-[#e9f2f8] dark:hover:bg-white/10"
                onClick={() => changeZoom(1.45)}
                type="button"
              >
                <Plus aria-hidden="true" className="size-5" strokeWidth={2.2} />
              </button>
              <button
                aria-label="Zoom out"
                className="inline-flex size-11 items-center justify-center border-t border-black/12 text-[#17313a] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0f766e]/40 dark:border-white/12 dark:text-[#e9f2f8] dark:hover:bg-white/10"
                onClick={() => changeZoom(1 / 1.45)}
                type="button"
              >
                <Minus
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={2.2}
                />
              </button>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-black/16 bg-[#fbf7ef]/94 px-3 py-2.5 text-sm font-semibold text-[#17313a] shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f766e]/35 dark:border-white/16 dark:bg-[#132131]/94 dark:text-[#e9f2f8] dark:hover:bg-[#1a2c3f]"
              onClick={resetWorld}
              type="button"
            >
              <RotateCcw
                aria-hidden="true"
                className="size-4"
                strokeWidth={2.2}
              />
              Reset world
            </button>
          </div>

          <span className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full bg-white/72 px-2 py-1 text-[0.62rem] font-medium text-[#53636a] backdrop-blur dark:bg-[#0d1723]/72 dark:text-[#aab8c6]">
            Map data: Natural Earth
          </span>
        </div>

        <footer
          className="border-t border-black/10 bg-white/76 px-4 py-3 text-center text-sm text-[#5f5a54] dark:border-white/10 dark:bg-white/5 dark:text-[#aab8c6]"
          id="world-map-help"
        >
          Drag to explore · Scroll or pinch to zoom
        </footer>
      </div>
    </div>
  );
}
