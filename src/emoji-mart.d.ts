export {};

declare module "@solidjs/web" {
  export namespace JSX {
    interface IntrinsicElements {
      "em-emoji": {
        id?: string;
        native?: string;
        shortcodes?: string;
        size?: string;
        set?: string;
        skin?: string | number;
        fallback?: string;
        class?: string;
        style?: string;
        "aria-hidden"?: string;
      };
    }
  }
}
