import { categoryDefinitions } from "@/src/lib/content/category-definitions";
import { fetchSimpleWikipediaCountryQids } from "@/src/lib/content/mediawiki-client";
import { fetchWikimediaJson } from "@/src/lib/content/wikimedia-fetch";
import type {
  EntityCategory,
  SourceClaimValue,
  SourceEntity,
} from "@/src/lib/types";

interface WikidataLabelEntity {
  labels?: {
    en?: {
      value?: string;
    };
  };
}

function buildDiscoveryQuery(rawQuery: string, limit: number): string {
  return rawQuery.replace("__LIMIT__", String(limit));
}

export async function discoverCategoryQids(
  category: EntityCategory,
  limit?: number,
): Promise<string[]> {
  if (category === "countries") {
    return [...new Set(await fetchSimpleWikipediaCountryQids(limit))];
  }

  const defaultLimit = category === "cities" ? 250 : 50;
  const query = buildDiscoveryQuery(
    categoryDefinitions[category].discovery.query,
    limit ?? defaultLimit,
  );
  const body = new URLSearchParams({ query, format: "json" });
  const data = await fetchWikimediaJson<{
    results: { bindings: Array<{ item: { value: string } }> };
  }>("https://query.wikidata.org/sparql", {
    method: "POST",
    headers: {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  return [
    ...new Set(
      data.results.bindings
        .map((binding) => binding.item.value.split("/").pop())
        .filter((qid): qid is string => Boolean(qid)),
    ),
  ];
}

async function fetchRawEntity(qid: string): Promise<any> {
  const data = await fetchWikimediaJson<{ entities: Record<string, any> }>(
    `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`,
  );

  return data.entities[qid];
}

async function fetchEntityLabels(
  ids: string[],
): Promise<Record<string, string>> {
  if (ids.length === 0) {
    return {};
  }

  const labelMap: Record<string, string> = {};

  for (let index = 0; index < ids.length; index += 50) {
    const chunk = ids.slice(index, index + 50);
    const params = new URLSearchParams({
      action: "wbgetentities",
      format: "json",
      ids: chunk.join("|"),
      props: "labels",
      languages: "en",
      origin: "*",
    });
    const data = await fetchWikimediaJson<{
      entities: Record<string, WikidataLabelEntity>;
    }>(`https://www.wikidata.org/w/api.php?${params.toString()}`);

    Object.entries(data.entities).forEach(([id, entity]) => {
      const label = entity.labels?.en?.value;

      if (label) {
        labelMap[id] = label;
      }
    });
  }

  return labelMap;
}

function collectReferenceIds(
  rawEntity: any,
  allowedProperties: string[],
): string[] {
  const ids = new Set<string>();

  allowedProperties.forEach((propertyId) => {
    const claims = rawEntity.claims?.[propertyId] ?? [];

    claims.forEach((claim: any) => {
      const datavalue = claim.mainsnak?.datavalue;
      const entityId = datavalue?.value?.id;

      if (typeof entityId === "string") {
        ids.add(entityId);
      }
    });
  });

  return [...ids];
}

function toClaimValue(
  claim: any,
  labelMap: Record<string, string>,
): SourceClaimValue | null {
  const mainSnak = claim.mainsnak;

  if (!mainSnak || mainSnak.snaktype !== "value" || !mainSnak.datavalue) {
    return null;
  }

  const datavalue = mainSnak.datavalue;

  switch (datavalue.type) {
    case "wikibase-entityid":
      return {
        type: "entity",
        id: datavalue.value.id,
        label: labelMap[datavalue.value.id] ?? null,
      };
    case "string":
      return {
        type: "string",
        value: datavalue.value,
      };
    case "quantity":
      return {
        type: "quantity",
        amount: Number.parseFloat(datavalue.value.amount),
        unit: datavalue.value.unit || null,
      };
    case "time":
      return {
        type: "time",
        value: datavalue.value.time,
        precision: datavalue.value.precision ?? null,
      };
    case "globecoordinate":
      return {
        type: "coordinate",
        latitude: datavalue.value.latitude,
        longitude: datavalue.value.longitude,
        precision: datavalue.value.precision ?? null,
      };
    case "monolingualtext":
      return {
        type: "monolingualtext",
        text: datavalue.value.text,
        language: datavalue.value.language ?? null,
      };
    default:
      return null;
  }
}

function toSourceEntity(
  rawEntity: any,
  labelMap: Record<string, string>,
): SourceEntity {
  const label = rawEntity.labels?.en?.value ?? rawEntity.id;
  const description = rawEntity.descriptions?.en?.value ?? null;
  const wikipediaTitle = rawEntity.sitelinks?.enwiki?.title ?? null;
  const aliases = (rawEntity.aliases?.en ?? [])
    .map((alias: { value?: string }) => alias.value)
    .filter(Boolean);
  const claims = Object.fromEntries(
    Object.entries<any[]>(rawEntity.claims ?? {}).map(
      ([propertyId, propertyClaims]) => [
        propertyId,
        propertyClaims
          .map((claim) => toClaimValue(claim, labelMap))
          .filter((claim): claim is SourceClaimValue => claim !== null),
      ],
    ),
  );

  return {
    qid: rawEntity.id,
    label,
    description,
    wikipediaTitle,
    aliases,
    claims,
    raw: rawEntity,
  };
}

export async function hydrateEntities(
  category: EntityCategory,
  qids: string[],
): Promise<SourceEntity[]> {
  const definition = categoryDefinitions[category];
  const entities: SourceEntity[] = [];

  for (const qid of qids) {
    const rawEntity = await fetchRawEntity(qid);
    const referenceIds = collectReferenceIds(
      rawEntity,
      definition.allowedProperties,
    );
    const labelMap = await fetchEntityLabels(referenceIds);
    entities.push(toSourceEntity(rawEntity, labelMap));
  }

  return entities;
}
