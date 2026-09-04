import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { SelectableCard } from "@astryxdesign/core/SelectableCard";
import {
  CATEGORY_META,
  GAME_MODE_OPTIONS,
} from "@/src/components/game-shell/config";
import type { MessageAppearance } from "@/src/components/game-shell/types";
import {
  getCategoryMeta,
  getModeMeta,
} from "@/src/components/game-shell/utils";
import type { CategorySummary, GameMode } from "@/src/lib/types";
import { Compass, Play, Shuffle, Sparkles } from "lucide-react";

interface GameMenuViewProps {
  canStartRound: boolean;
  categories: CategorySummary[];
  handleCategorySelect: (categoryId: string) => void;
  handleModeSelect: (mode: GameMode) => void;
  message: string;
  selectedCategory: string | null;
  selectedCategoryLabel: string;
  selectedMode: GameMode | null;
  showRandomMix: boolean;
  startRound: () => void;
  statusAppearance: MessageAppearance;
  totalEntityCount: number;
  totalSelectedEntityCount: number;
}

export function GameMenuView({
  canStartRound,
  categories,
  handleCategorySelect,
  handleModeSelect,
  message,
  selectedCategory,
  selectedCategoryLabel,
  selectedMode,
  showRandomMix,
  startRound,
  statusAppearance,
  totalEntityCount,
  totalSelectedEntityCount,
}: GameMenuViewProps) {
  const selectedCategoryCardMeta = getCategoryMeta(selectedCategory);
  const selectedModeMeta = getModeMeta(selectedMode);
  const SelectedCategoryIcon = selectedCategoryCardMeta.icon;
  const SelectedModeIcon = selectedModeMeta.icon;
  const StatusIcon = statusAppearance.icon;

  return (
    <div className="grid min-h-[calc(100dvh-1rem)] gap-4 sm:min-h-[calc(100dvh-1.5rem)] sm:gap-5">
      <Card className="overflow-hidden p-5 sm:p-7" elevation="low" padding={0}>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-bg bg-accent-bg/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
            <Sparkles
              aria-hidden="true"
              className="size-3.5"
              strokeWidth={2.2}
            />
            Free play
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-secondary">
            <Shuffle
              aria-hidden="true"
              className="size-3.5"
              strokeWidth={2.2}
            />
            {totalEntityCount} answers live
          </span>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
          <div>
            <h1 className="m-0 max-w-[8ch] font-heading text-4xl sm:text-5xl font-semibold leading-tight tracking-tight text-primary">
              WikiGuesser
            </h1>
            <p className="m-0 mt-4 max-w-xl text-base leading-7 text-secondary">
              Unlimited rounds. No daily lock.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card padding={4}>
              <div
                className={`mb-3 inline-flex rounded-2xl bg-linear-to-br p-2.5 ${selectedCategoryCardMeta.accent}`}
              >
                <SelectedCategoryIcon
                  aria-hidden="true"
                  className="size-5 text-primary"
                  strokeWidth={2.1}
                />
              </div>
              <p className="m-0 text-xs font-semibold uppercase tracking-wider text-secondary">
                Category
              </p>
              <strong className="mt-2 block font-heading text-xl tracking-tight text-primary">
                {selectedCategoryLabel}
              </strong>
              <span className="mt-1 block text-sm text-secondary">
                {selectedCategoryCardMeta.shortLabel}
              </span>
            </Card>

            <Card padding={4}>
              <div className="mb-3 inline-flex rounded-2xl bg-accent-muted p-2.5 bg-accent-muted">
                <SelectedModeIcon
                  aria-hidden="true"
                  className="size-5 text-primary"
                  strokeWidth={2.1}
                />
              </div>
              <p className="m-0 text-xs font-semibold uppercase tracking-wider text-secondary">
                Mode
              </p>
              <strong className="mt-2 block font-heading text-xl tracking-tight text-primary">
                {selectedModeMeta.label}
              </strong>
              <span className="mt-1 block text-sm text-secondary">
                {selectedModeMeta.summary}
              </span>
            </Card>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6" elevation="low" padding={0}>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_320px]">
          <div className="grid gap-5">
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
                  <Compass
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={2.2}
                  />
                  Categories
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {showRandomMix ? (
                  <SelectableCard
                    isSelected={selectedCategory === "random"}
                    label="Mixed category"
                    onChange={() => handleCategorySelect("random")}
                    padding={4}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`inline-flex rounded-2xl bg-linear-to-br p-2.5 ${CATEGORY_META.random.accent}`}
                      >
                        <Shuffle
                          aria-hidden="true"
                          className="size-5 text-primary"
                          strokeWidth={2.1}
                        />
                      </span>
                    </div>
                    <strong className="font-heading text-xl tracking-tight text-primary">
                      Mixed category
                    </strong>
                    <span className="text-sm text-secondary">
                      Random across every live category.
                    </span>
                  </SelectableCard>
                ) : null}

                {categories.map((category) => {
                  const categoryMeta = getCategoryMeta(category.id);
                  const CategoryIcon = categoryMeta.icon;

                  return (
                    <SelectableCard
                      isDisabled={category.entityCount === 0}
                      isSelected={selectedCategory === category.id}
                      key={category.id}
                      label={category.label}
                      onChange={() => handleCategorySelect(category.id)}
                      padding={4}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={`inline-flex rounded-2xl bg-linear-to-br p-2.5 ${categoryMeta.accent}`}
                        >
                          <CategoryIcon
                            aria-hidden="true"
                            className="size-5 text-primary"
                            strokeWidth={2.1}
                          />
                        </span>
                      </div>
                      <strong className="font-heading text-xl tracking-tight text-primary">
                        {category.label}
                      </strong>
                      <span className="text-sm text-secondary">
                        {categoryMeta.shortLabel}
                      </span>
                    </SelectableCard>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
                <Sparkles
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={2.2}
                />
                Modes
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {GAME_MODE_OPTIONS.map((mode) => {
                  const isDisabled =
                    !selectedCategory || totalSelectedEntityCount === 0;
                  const ModeIcon = mode.icon;

                  return (
                    <SelectableCard
                      isDisabled={isDisabled}
                      isSelected={selectedMode === mode.id}
                      key={mode.id}
                      label={mode.label}
                      onChange={() => handleModeSelect(mode.id)}
                      padding={4}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="inline-flex rounded-2xl bg-accent-muted p-2.5 bg-accent-muted">
                          <ModeIcon
                            aria-hidden="true"
                            className="size-5 text-primary"
                            strokeWidth={2.1}
                          />
                        </span>
                        <span className="rounded-full bg-neutral px-2.5 py-1 text-xs font-semibold text-secondary">
                          {mode.summary}
                        </span>
                      </div>
                      <strong className="font-heading text-xl tracking-tight text-primary">
                        {mode.label}
                      </strong>
                      <span className="text-sm text-secondary">
                        {mode.hint}
                      </span>
                    </SelectableCard>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="grid content-start gap-4 rounded-xl border border-border bg-card p-4 ">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium ${statusAppearance.className}`}
            >
              <StatusIcon
                aria-hidden="true"
                className="size-4 shrink-0"
                strokeWidth={2.2}
              />
              <span>{message}</span>
            </div>

            <div className="grid gap-3 rounded-3xl border border-border bg-accent-muted p-4 ">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                  Ready
                </span>
                <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-accent">
                  {totalSelectedEntityCount}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex rounded-2xl bg-linear-to-br p-2.5 ${selectedCategoryCardMeta.accent}`}
                >
                  <SelectedCategoryIcon
                    aria-hidden="true"
                    className="size-5 text-primary"
                    strokeWidth={2.1}
                  />
                </span>
                <div className="min-w-0">
                  <p className="m-0 text-xs uppercase tracking-wider text-secondary">
                    Category
                  </p>
                  <strong className="block truncate text-primary">
                    {selectedCategoryLabel}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex rounded-2xl bg-accent-muted p-2.5 bg-accent-muted">
                  <SelectedModeIcon
                    aria-hidden="true"
                    className="size-5 text-primary"
                    strokeWidth={2.1}
                  />
                </span>
                <div className="min-w-0">
                  <p className="m-0 text-xs uppercase tracking-wider text-secondary">
                    Mode
                  </p>
                  <strong className="block truncate text-primary">
                    {selectedModeMeta.label}
                  </strong>
                </div>
              </div>
            </div>

            <Button
              icon={<Play aria-hidden="true" />}
              isDisabled={!canStartRound}
              label="Deal round"
              onClick={startRound}
              variant="primary"
              width="100%"
            />
          </aside>
        </div>
      </Card>
    </div>
  );
}
