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

export async function fetchRedirectAliases(title: string): Promise<string[]> {
  const params = new URLSearchParams({
    action: "query",
    prop: "redirects",
    titles: title,
    rdlimit: "max",
    format: "json",
    origin: "*",
  });
  const response = await fetch(`https://en.wikipedia.org/w/api.php?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`MediaWiki redirect request failed: ${response.status}`);
  }

  const data = (await response.json()) as RedirectResponse;
  const pages = Object.values(data.query?.pages ?? {});

  return pages.flatMap((page) => page.redirects?.map((redirect) => redirect.title) ?? []);
}
