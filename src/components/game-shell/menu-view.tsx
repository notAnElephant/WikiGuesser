import {CATEGORY_META, GAME_MODE_OPTIONS, primaryButtonClass, surfaceClass} from "@/src/components/game-shell/config";
import type {MessageAppearance} from "@/src/components/game-shell/types";
import {getCategoryMeta, getModeMeta, selectionCardClass} from "@/src/components/game-shell/utils";
import type {CategorySummary, GameMode} from "@/src/lib/types";
import {Compass, Play, Shuffle, Sparkles} from "lucide-react";

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
      <header className={`${surfaceClass} overflow-hidden p-5 sm:p-7`}>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#0f766e]/12 bg-[#0f766e]/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:border-[#24d4c2]/14 dark:bg-[#24d4c2]/8 dark:text-[#8ff4e7]">
            <Sparkles aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
            Fast rounds
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/76 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:border-white/10 dark:bg-white/6 dark:text-[#9aa9bb]">
            <Shuffle aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
            {totalEntityCount} answers live
          </span>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
          <div>
            <h1 className="m-0 max-w-[8ch] font-serif-display text-[clamp(2.6rem,9vw,4.8rem)] font-semibold leading-[0.9] tracking-[-0.065em] text-[#1f1b17] dark:text-[#f5f7fb]">
              WikiGuesser
            </h1>
            <p className="m-0 mt-4 max-w-xl text-[1.02rem] leading-7 text-[#6b6259] dark:text-[#9aa9bb]">
              Read the clues. Beat the reveal.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[26px] border border-black/8 bg-white/78 p-4 dark:border-white/10 dark:bg-white/6">
              <div className={`mb-3 inline-flex rounded-2xl bg-linear-to-br p-2.5 ${selectedCategoryCardMeta.accent}`}>
                <SelectedCategoryIcon
                  aria-hidden="true"
                  className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]"
                  strokeWidth={2.1}
                />
              </div>
              <p className="m-0 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:text-[#9aa9bb]">
                Deck
              </p>
              <strong className="mt-2 block font-serif-display text-[1.45rem] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">
                {selectedCategoryLabel}
              </strong>
              <span className="mt-1 block text-sm text-[#6b6259] dark:text-[#9aa9bb]">
                {selectedCategoryCardMeta.shortLabel}
              </span>
            </div>

            <div className="rounded-[26px] border border-black/8 bg-white/78 p-4 dark:border-white/10 dark:bg-white/6">
              <div className="mb-3 inline-flex rounded-2xl bg-[linear-gradient(135deg,rgba(15,118,110,0.16),rgba(255,219,112,0.12))] p-2.5 dark:bg-[linear-gradient(135deg,rgba(36,212,194,0.18),rgba(56,189,248,0.12))]">
                <SelectedModeIcon aria-hidden="true" className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]" strokeWidth={2.1} />
              </div>
              <p className="m-0 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:text-[#9aa9bb]">
                Mode
              </p>
              <strong className="mt-2 block font-serif-display text-[1.45rem] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">
                {selectedModeMeta.label}
              </strong>
              <span className="mt-1 block text-sm text-[#6b6259] dark:text-[#9aa9bb]">{selectedModeMeta.summary}</span>
            </div>
          </div>
        </div>
      </header>

      <section className={`${surfaceClass} p-5 sm:p-6`}>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_320px]">
          <div className="grid gap-5">
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">
                  <Compass aria-hidden="true" className="size-4" strokeWidth={2.2} />
                  Categories
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {showRandomMix ? (
                  <button
                    className={selectionCardClass(selectedCategory === "random")}
                    onClick={() => handleCategorySelect("random")}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={`inline-flex rounded-2xl bg-linear-to-br p-2.5 ${CATEGORY_META.random.accent}`}>
                        <Shuffle aria-hidden="true" className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]" strokeWidth={2.1} />
                      </span>
                    </div>
                    <strong className="font-serif-display text-[1.55rem] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">
                      Mixed deck
                    </strong>
                    <span className="text-sm text-[#6b6259] dark:text-[#9aa9bb]">Random across every live deck.</span>
                  </button>
                ) : null}

                {categories.map((category) => {
                  const categoryMeta = getCategoryMeta(category.id);
                  const CategoryIcon = categoryMeta.icon;

                  return (
                    <button
                      className={selectionCardClass(selectedCategory === category.id, category.entityCount === 0)}
                      disabled={category.entityCount === 0}
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className={`inline-flex rounded-2xl bg-linear-to-br p-2.5 ${categoryMeta.accent}`}>
                          <CategoryIcon
                            aria-hidden="true"
                            className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]"
                            strokeWidth={2.1}
                          />
                        </span>
                      </div>
                      <strong className="font-serif-display text-[1.55rem] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">
                        {category.label}
                      </strong>
                      <span className="text-sm text-[#6b6259] dark:text-[#9aa9bb]">{categoryMeta.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="inline-flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">
                <Sparkles aria-hidden="true" className="size-4" strokeWidth={2.2} />
                Modes
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {GAME_MODE_OPTIONS.map((mode) => {
                  const isDisabled = !selectedCategory || totalSelectedEntityCount === 0;
                  const ModeIcon = mode.icon;

                  return (
                    <button
                      className={selectionCardClass(selectedMode === mode.id, isDisabled)}
                      disabled={isDisabled}
                      key={mode.id}
                      onClick={() => handleModeSelect(mode.id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="inline-flex rounded-2xl bg-[linear-gradient(135deg,rgba(15,118,110,0.14),rgba(255,219,112,0.12))] p-2.5 dark:bg-[linear-gradient(135deg,rgba(36,212,194,0.18),rgba(56,189,248,0.12))]">
                          <ModeIcon aria-hidden="true" className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]" strokeWidth={2.1} />
                        </span>
                        <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-semibold text-[#6b6259] dark:bg-white/8 dark:text-[#9aa9bb]">
                          {mode.summary}
                        </span>
                      </div>
                      <strong className="font-serif-display text-[1.55rem] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">
                        {mode.label}
                      </strong>
                      <span className="text-sm text-[#6b6259] dark:text-[#9aa9bb]">{mode.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="grid content-start gap-4 rounded-[28px] border border-black/8 bg-white/78 p-4 dark:border-white/10 dark:bg-[rgba(255,255,255,0.05)]">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium ${statusAppearance.className}`}>
              <StatusIcon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.2} />
              <span>{message}</span>
            </div>

            <div className="grid gap-3 rounded-3xl border border-black/8 bg-[rgba(15,118,110,0.04)] p-4 dark:border-white/10 dark:bg-[rgba(36,212,194,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:text-[#9aa9bb]">
                  Ready
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#115e59] dark:bg-white/8 dark:text-[#8ff4e7]">
                  {totalSelectedEntityCount}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className={`inline-flex rounded-2xl bg-linear-to-br p-2.5 ${selectedCategoryCardMeta.accent}`}>
                  <SelectedCategoryIcon
                    aria-hidden="true"
                    className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]"
                    strokeWidth={2.1}
                  />
                </span>
                <div className="min-w-0">
                  <p className="m-0 text-xs uppercase tracking-[0.16em] text-[#6b6259] dark:text-[#9aa9bb]">Deck</p>
                  <strong className="block truncate text-[#1f1b17] dark:text-[#f5f7fb]">{selectedCategoryLabel}</strong>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex rounded-2xl bg-[linear-gradient(135deg,rgba(15,118,110,0.14),rgba(255,219,112,0.12))] p-2.5 dark:bg-[linear-gradient(135deg,rgba(36,212,194,0.18),rgba(56,189,248,0.12))]">
                  <SelectedModeIcon aria-hidden="true" className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]" strokeWidth={2.1} />
                </span>
                <div className="min-w-0">
                  <p className="m-0 text-xs uppercase tracking-[0.16em] text-[#6b6259] dark:text-[#9aa9bb]">Mode</p>
                  <strong className="block truncate text-[#1f1b17] dark:text-[#f5f7fb]">{selectedModeMeta.label}</strong>
                </div>
              </div>
            </div>

            <button className={`${primaryButtonClass} w-full`} disabled={!canStartRound} onClick={startRound} type="button">
              <Play aria-hidden="true" className="size-4.5" strokeWidth={2.3} />
              Deal round
            </button>
          </aside>
        </div>
      </section>
    </div>
  );
}
