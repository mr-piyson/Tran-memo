import { createEffect, createSignal, untrack } from "solid-js";
import {
  elementScroll,
  measureElement as measureVirtualElement,
  observeElementOffset,
  observeElementRect,
  Virtualizer,
  type VirtualItem,
  type VirtualizerOptions,
} from "@tanstack/virtual-core";

type CoreOptions<TItem extends HTMLElement> = VirtualizerOptions<HTMLDivElement, TItem>;

export type VirtualOptions<TItem extends HTMLElement> = Partial<CoreOptions<TItem>> &
  Pick<CoreOptions<TItem>, "count" | "estimateSize">;

export interface VirtualList<TItem extends HTMLElement> {
  virtualItems: () => VirtualItem[];
  totalSize: () => number;
  setScrollElement: (element: HTMLDivElement | null) => void;
  scrollToIndex: (
    index: number,
    options?: { align?: "start" | "center" | "end" | "auto"; behavior?: "auto" | "smooth" | "instant" },
  ) => void;
  measureElement: (element: TItem | null) => void;
}

export function createVirtualizer<TItem extends HTMLElement = HTMLDivElement>(
  options: () => VirtualOptions<TItem>,
): VirtualList<TItem> {
  const [scrollElement, setScrollElement] = createSignal<HTMLDivElement | null>(null);
  const [virtualItems, setVirtualItems] = createSignal<VirtualItem[]>([]);
  const [totalSize, setTotalSize] = createSignal(0);

  const initial = untrack(options);
  let userOnChange = initial.onChange;

  const publish = (instance: Virtualizer<HTMLDivElement, TItem>) => {
    setVirtualItems(instance.getVirtualItems().map((item) => ({ ...item })));
    setTotalSize(instance.getTotalSize());
  };

  const buildOptions = (opts: VirtualOptions<TItem>): CoreOptions<TItem> => ({
    ...opts,
    getScrollElement: () => scrollElement(),
    observeElementRect,
    observeElementOffset,
    scrollToFn: elementScroll,
    measureElement: measureVirtualElement,
    onChange: (instance, sync) => {
      publish(instance);
      userOnChange?.(instance, sync);
    },
  });

  const instance = new Virtualizer<HTMLDivElement, TItem>(buildOptions(initial));

  createEffect(
    () => options(),
    (opts) => {
      userOnChange = opts.onChange;
      instance.setOptions(buildOptions(opts));
      instance._willUpdate();
      publish(instance);
    },
  );

  createEffect(
    () => scrollElement(),
    (element) => {
      if (!element) return;
      const cleanup = instance._didMount();
      instance._willUpdate();
      publish(instance);
      return cleanup;
    },
  );

  return {
    virtualItems,
    totalSize,
    setScrollElement,
    scrollToIndex: (index, scrollOptions) =>
      instance.scrollToIndex(index, scrollOptions),
    measureElement: (element) => instance.measureElement(element),
  };
}
