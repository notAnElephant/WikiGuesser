import { fetchWikimediaJson } from "@/src/lib/content/wikimedia-fetch";

interface ParseSectionsResponse {
  parse?: {
    sections?: Array<{
      index: string;
      line: string;
    }>;
  };
}

interface ParseLinksResponse {
  parse?: {
    links?: Array<{
      ns: number;
      exists?: string;
      "*": string;
    }>;
  };
}

interface PagePropsResponse {
  query?: {
    normalized?: Array<{ from: string; to: string }>;
    redirects?: Array<{ from: string; to: string }>;
    pages?: Record<
      string,
      {
        title?: string;
        pageprops?: {
          wikibase_item?: string;
        };
      }
    >;
  };
}

interface RedirectResponse {
  query?: {
    pages?: Record<
      string,
      {
        redirects?: Array<{
          title: string;
        }>;
      }
    >;
  };
}

const COUNTRY_TITLE_QID_OVERRIDES: Record<string, string> = {
  // Simple Wikipedia links "China" to the broad historical/geographical
  // concept Q29520. Country rounds need the modern sovereign state instead.
  China: "Q148",
};

export function resolveCountryQid(
  title: string,
  titleToQid: Record<string, string>,
): string | undefined {
  return COUNTRY_TITLE_QID_OVERRIDES[title] ?? titleToQid[title];
}

export function mapWikibaseItemsToRequestedTitles(
  titles: readonly string[],
  query: NonNullable<PagePropsResponse["query"]>,
): Record<string, string> {
  const titleToQid: Record<string, string> = {};
  const qidByPageTitle = new Map(
    Object.values(query.pages ?? [])
      .filter((page) => page.title && page.pageprops?.wikibase_item)
      .map((page) => [page.title!, page.pageprops!.wikibase_item!] as const),
  );
  const rewrittenTitle = new Map(
    [...(query.normalized ?? []), ...(query.redirects ?? [])].map(
      ({ from, to }) => [from, to],
    ),
  );

  for (const title of titles) {
    let resolvedTitle = title;
    const visited = new Set<string>();

    while (rewrittenTitle.has(resolvedTitle) && !visited.has(resolvedTitle)) {
      visited.add(resolvedTitle);
      resolvedTitle = rewrittenTitle.get(resolvedTitle)!;
    }

    const qid = qidByPageTitle.get(resolvedTitle);
    if (qid) titleToQid[title] = qid;
  }

  return titleToQid;
}

export function resolveCountryQids(
  titles: readonly string[],
  titleToQid: Record<string, string>,
): string[] {
  const missingTitles = titles.filter(
    (title) => !resolveCountryQid(title, titleToQid),
  );

  if (missingTitles.length > 0) {
    throw new Error(
      `Wikipedia country links have no Wikidata item: ${missingTitles.join(", ")}`,
    );
  }

  return titles.map((title) => resolveCountryQid(title, titleToQid)!);
}

async function fetchSectionIndex(
  pageTitle: string,
  sectionTitle: string,
  wikiHost = "simple.wikipedia.org",
): Promise<string> {
  const params = new URLSearchParams({
    action: "parse",
    page: pageTitle,
    prop: "sections",
    format: "json",
    origin: "*",
  });
  const data = await fetchWikimediaJson<ParseSectionsResponse>(
    `https://${wikiHost}/w/api.php?${params.toString()}`,
  );
  const section = data.parse?.sections?.find(
    (candidate) => candidate.line === sectionTitle,
  );

  if (!section) {
    throw new Error(
      `Unable to find section "${sectionTitle}" on ${pageTitle}.`,
    );
  }

  return section.index;
}

async function fetchSectionLinks(
  pageTitle: string,
  sectionIndex: string,
  wikiHost = "simple.wikipedia.org",
): Promise<string[]> {
  const params = new URLSearchParams({
    action: "parse",
    page: pageTitle,
    prop: "links",
    section: sectionIndex,
    format: "json",
    origin: "*",
  });
  const data = await fetchWikimediaJson<ParseLinksResponse>(
    `https://${wikiHost}/w/api.php?${params.toString()}`,
  );

  return (data.parse?.links ?? [])
    .filter((link) => link.ns === 0 && link.exists !== undefined)
    .map((link) => link["*"]);
}

export async function fetchWikibaseItemsForTitles(
  titles: string[],
  wikiHost = "simple.wikipedia.org",
): Promise<Record<string, string>> {
  const titleToQid: Record<string, string> = {};

  for (let index = 0; index < titles.length; index += 50) {
    const chunk = titles.slice(index, index + 50);
    const params = new URLSearchParams({
      action: "query",
      prop: "pageprops",
      ppprop: "wikibase_item",
      redirects: "1",
      titles: chunk.join("|"),
      format: "json",
      origin: "*",
    });
    const data = await fetchWikimediaJson<PagePropsResponse>(
      `https://${wikiHost}/w/api.php?${params.toString()}`,
    );

    Object.assign(
      titleToQid,
      mapWikibaseItemsToRequestedTitles(chunk, data.query ?? {}),
    );
  }

  return titleToQid;
}

export async function fetchSimpleWikipediaCountryQids(
  limit?: number,
): Promise<string[]> {
  const sectionIndex = await fetchSectionIndex(
    "List_of_countries",
    "Countries",
  );
  const linkedTitles = await fetchSectionLinks(
    "List_of_countries",
    sectionIndex,
  );
  const dedupedTitles = [...new Set(linkedTitles)];
  const scopedTitles = limit ? dedupedTitles.slice(0, limit) : dedupedTitles;
  const titleToQid = await fetchWikibaseItemsForTitles(scopedTitles);

  return resolveCountryQids(scopedTitles, titleToQid);
}

export async function fetchRedirectAliases(title: string): Promise<string[]> {
  const params = new URLSearchParams({
    action: "query",
    prop: "redirects",
    titles: title,
    rdlimit: "max",
    format: "json",
    origin: "*",
  });
  const data = await fetchWikimediaJson<RedirectResponse>(
    `https://en.wikipedia.org/w/api.php?${params.toString()}`,
  );
  const pages = Object.values(data.query?.pages ?? {});

  return pages.flatMap(
    (page) => page.redirects?.map((redirect) => redirect.title) ?? [],
  );
}
