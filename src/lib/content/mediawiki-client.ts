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

    Object.entries(data.query?.pages ?? {}).forEach(([, page]) => {
      const qid = page.pageprops?.wikibase_item;
      const title = page.title;

      if (qid && title) {
        titleToQid[title] = qid;
      }
    });
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

  return scopedTitles
    .map((title) => titleToQid[title])
    .filter((qid): qid is string => Boolean(qid));
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
