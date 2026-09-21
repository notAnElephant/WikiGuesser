import { TopNavHeading } from "@astryxdesign/core/TopNav";

import { WikiGuesserLogo } from "@/src/components/wikiguesser-logo";

/**
 * Brand heading for the app shell.
 *
 * The "WikiGuesser" wordmark is hidden below the `sm` breakpoint so the top
 * navigation does not overflow on small screens; the logo mark stays visible
 * and the link keeps its accessible name via `logoLabel`.
 */
export function AppBrand() {
  return (
    <TopNavHeading
      headingHref="/"
      logo={
        <>
          <WikiGuesserLogo className="size-9 shrink-0" />
          <span className="hidden font-heading text-lg font-semibold tracking-tight text-primary sm:inline">
            WikiGuesser
          </span>
        </>
      }
      logoLabel="WikiGuesser"
    />
  );
}
