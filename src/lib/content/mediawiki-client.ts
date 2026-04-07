import { fetchWikimediaJson } from "@/src/lib/content/wikimedia-fetch";

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
  const data = await fetchWikimediaJson<RedirectResponse>(`https://en.wikipedia.org/w/api.php?${params.toString()}`);
  const pages = Object.values(data.query?.pages ?? {});

  return pages.flatMap((page) => page.redirects?.map((redirect) => redirect.title) ?? []);
}
