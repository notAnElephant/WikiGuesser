import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeadingProps {
  title: string;
  description?: string;
  meta?: ReactNode;
  hasBackLink?: boolean;
}

export function PageHeading({
  title,
  description,
  meta,
  hasBackLink = false,
}: PageHeadingProps) {
  return (
    <VStack as="header" gap={2}>
      {hasBackLink ? (
        <HStack>
          <Button
            href="/"
            icon={<ArrowLeft aria-hidden="true" />}
            label="Back home"
            variant="ghost"
          />
        </HStack>
      ) : null}
      <HStack align="center" justify="between" gap={3} wrap="wrap">
        <h1 className="m-0 font-heading text-2xl font-semibold leading-tight tracking-tight text-primary sm:text-3xl">
          {title}
        </h1>
        {meta}
      </HStack>
      {description ? <Text color="secondary">{description}</Text> : null}
    </VStack>
  );
}
