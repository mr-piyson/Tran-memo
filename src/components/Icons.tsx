import data from "@emoji-mart/data";
import { init } from "emoji-mart";

// <em-emoji> needs the dataset initialized once per page load.
init({ data });

type IconProps = { class?: string; size?: string };

const glyph = (id: string, props: IconProps) => (
  <em-emoji
    id={id}
    size={props.size ?? (props.class?.includes("size-4") ? "1em" : "1.25em")}
    class={props.class ?? "size-5"}
    aria-hidden="true"
  />
);

export const ChatIcon = (props: IconProps) => glyph("speech_balloon", props);

export const PlusIcon = (props: IconProps) => glyph("heavy_plus_sign", props);

export const SettingsIcon = (props: IconProps) => glyph("gear", props);

export const SearchIcon = (props: IconProps) => glyph("mag", props);

export const BackIcon = (props: IconProps) => glyph("arrow_left", props);

export const SendIcon = (props: IconProps) => glyph("rocket", props);

export const TrashIcon = (props: IconProps) => glyph("wastebasket", props);

export const CloseIcon = (props: IconProps) => glyph("x", props);
