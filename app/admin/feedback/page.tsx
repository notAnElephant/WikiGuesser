import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { auth } from "@clerk/nextjs/server";
import { FeedbackKind } from "@prisma/client";
import { notFound } from "next/navigation";

import { PageHeading } from "@/src/components/page-heading";
import { isAdminUser } from "@/src/lib/auth/admin";
import { getPrismaClient } from "@/src/lib/repository/prisma";

export const metadata = { title: "Feedback inbox" };

const kinds = {
  POSITIVE: "Positive",
  BUG: "Bug",
  CONTENT_ISSUE: "Content issue",
  CONFUSING: "Confusing",
  FEATURE_IDEA: "Feature idea",
  OTHER: "Other",
} satisfies Record<FeedbackKind, string>;

const sources = {
  global: "Header",
  "round-result": "Round results",
  clue: "Clue",
};

const pageSize = 25;

export default async function FeedbackInbox({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await auth();
  if (!(await isAdminUser(userId))) notFound();

  const params = await searchParams;
  const kind = Object.values(FeedbackKind).find(
    (value) => value === params.kind,
  );
  const source = Object.keys(sources).find((value) => value === params.source);
  const requestedPage =
    typeof params.page === "string" ? Number(params.page) : 1;
  const page =
    Number.isInteger(requestedPage) &&
    requestedPage > 0 &&
    requestedPage <= 1_000_000
      ? requestedPage
      : 1;
  const feedback = await getPrismaClient().feedback.findMany({
    where: {
      kind,
      context: source ? { path: ["source"], equals: source } : undefined,
    },
    select: {
      id: true,
      kind: true,
      message: true,
      path: true,
      context: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
  });

  function pageHref(target: number) {
    const query = new URLSearchParams({ page: String(target) });
    if (kind) query.set("kind", kind);
    if (source) query.set("source", source);
    return `/admin/feedback?${query}`;
  }

  return (
    <VStack
      as="main"
      className="ph-no-capture mx-auto w-full max-w-6xl px-4 py-5"
      gap={4}
    >
      <PageHeading title="Feedback inbox" />
      <form action="/admin/feedback">
        <HStack align="center" gap={3} wrap="wrap">
          <label className="flex items-center gap-2">
            Type
            <select
              name="kind"
              defaultValue={kind ?? ""}
              className="rounded-md border bg-surface p-2"
            >
              <option value="">All types</option>
              {Object.entries(kinds).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            Source
            <select
              name="source"
              defaultValue={source ?? ""}
              className="rounded-md border bg-surface p-2"
            >
              <option value="">All sources</option>
              {Object.entries(sources).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button label="Apply filters" type="submit" variant="secondary" />
        </HStack>
      </form>
      {feedback.length === 0 ? (
        <Text color="secondary">No feedback matches these filters.</Text>
      ) : (
        <section
          aria-label="Feedback submissions"
          className="overflow-x-auto rounded-md border"
        >
          <Table verticalAlign="top">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Received (UTC)</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Message</TableHeaderCell>
                <TableHeaderCell>Page and context</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedback.slice(0, pageSize).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <time
                      dateTime={item.createdAt.toISOString()}
                      className="whitespace-nowrap"
                    >
                      {item.createdAt
                        .toISOString()
                        .slice(0, 16)
                        .replace("T", " ")}
                    </time>
                  </TableCell>
                  <TableCell>{kinds[item.kind]}</TableCell>
                  <TableCell>
                    <p className="m-0 whitespace-pre-wrap wrap-anywhere">
                      {item.message ?? "No written message"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="m-0 wrap-anywhere">
                      {item.path ?? "Unknown page"}
                    </p>
                    {item.context !== null && (
                      <details>
                        <summary className="cursor-pointer">
                          Submission context
                        </summary>
                        <pre className="m-0 whitespace-pre-wrap wrap-anywhere">
                          {JSON.stringify(item.context, null, 2)}
                        </pre>
                      </details>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
      {(page > 1 || feedback.length > pageSize) && (
        <HStack as="nav" aria-label="Feedback pages" gap={2}>
          {page > 1 && (
            <Button
              href={pageHref(page - 1)}
              label="Previous page"
              variant="secondary"
            />
          )}
          {feedback.length > pageSize && (
            <Button
              href={pageHref(page + 1)}
              label="Next page"
              variant="secondary"
            />
          )}
        </HStack>
      )}
    </VStack>
  );
}
