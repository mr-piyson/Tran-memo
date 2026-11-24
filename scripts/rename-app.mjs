import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = join(root, "app.config.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));

// Flags override app.config.json and are written back to it.
// Usage: bun rename --display-name "My App" --version 1.2.0 [--name my-app]
//        bun rename --identifier com.me.myapp [--native]
// Native projects regenerate automatically when the package name changes.
const args = process.argv.slice(2);
const valueFlags = new Set(["name", "display-name", "displayName", "identifier", "version"]);
const flags = {};
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (!arg.startsWith("--")) continue;
  const raw = arg.slice(2);
  const separator = raw.indexOf("=");
  const key = separator === -1 ? raw : raw.slice(0, separator);
  if (key === "native") {
    flags.native = true;
    continue;
  }
  if (!valueFlags.has(key)) throw new Error(`Unknown flag: --${key}`);
  const value = separator === -1 ? args[++index] : raw.slice(separator + 1);
  if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
  flags[key === "displayName" ? "display-name" : key] = value;
}

if (flags["display-name"]) config.displayName = flags["display-name"];
if (flags.identifier) config.identifier = flags.identifier;
if (flags.version) config.version = flags.version;
if (flags.name) {
  config.name = flags.name;
} else if (flags["display-name"]) {
  config.name = config.displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const rules = {
  name: /^[a-z0-9][a-z0-9-]*$/,
  displayName: /^\S.*\S$|^\S$/,
  identifier: /^[A-Za-z0-9]+(\.[A-Za-z0-9-]+)+$/,
  version: /^\d+\.\d+\.\d+/,
};
for (const [key, pattern] of Object.entries(rules)) {
  if (!pattern.test(config[key])) {
    throw new Error(`Invalid ${key}: ${JSON.stringify(config[key])} (must match ${pattern})`);
  }
}

const cargoPath = join(root, "src-tauri/Cargo.toml");
const mainRsPath = join(root, "src-tauri/src/main.rs");
const appleProjectPath = join(root, "src-tauri/gen/apple/project.yml");
const cargoText = readFileSync(cargoPath, "utf8");
const mainRsText = readFileSync(mainRsPath, "utf8");
const currentPackageName = cargoText.match(/^name = "([^"]+)"/m)?.[1];
const currentLibName = cargoText.match(/\[lib\][\s\S]*?^name = "([^"]+)"/m)?.[1];
const expectedLibName = `${config.name.replace(/-/g, "_")}_lib`;
const mainUsesExpectedLib = new RegExp(`^\\s*${expectedLibName}::run\\(\\)`, "m").test(mainRsText);
const appleNameMatches =
  !existsSync(appleProjectPath) ||
  new RegExp(`^name: ${config.name}$`, "m").test(readFileSync(appleProjectPath, "utf8"));
const regenerateNative =
  flags.native ||
  currentPackageName !== config.name ||
  currentLibName !== expectedLibName ||
  !mainUsesExpectedLib ||
  !appleNameMatches;

writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

function updateJsonStrings(path, values) {
  let text = readFileSync(path, "utf8");
  for (const [key, value] of Object.entries(values)) {
    const pattern = new RegExp(`("${key}"\\s*:\\s*)"[^"]*"`, "m");
    if (!pattern.test(text)) throw new Error(`Missing ${key} in ${path}`);
    text = text.replace(pattern, `$1${JSON.stringify(value)}`);
  }
  writeFileSync(path, text);
  console.log(`  ${relative(root, path)}`);
}

function updateCargoSection(path, sectionName, values) {
  const text = readFileSync(path, "utf8");
  const marker = `[${sectionName}]`;
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`No ${marker} section in ${path}`);
  const nextSection = text.indexOf("\n[", start + 1);
  const end = nextSection < 0 ? text.length : nextSection;
  const section = text.slice(start, end);

  let updated = section;
  for (const [key, value] of Object.entries(values)) {
    const pattern = new RegExp(`^${key} = "[^"]*"`, "m");
    if (!pattern.test(updated)) throw new Error(`Missing ${key} in ${path}`);
    updated = updated.replace(pattern, `${key} = "${value}"`);
  }
  writeFileSync(path, text.slice(0, start) + updated + text.slice(end));
  console.log(`  ${relative(root, path)}`);
}

function updateRustLibUse(path, libName) {
  const text = readFileSync(path, "utf8");
  const pattern = /^(\s*)[A-Za-z0-9_]+::run\(\)/m;
  if (!pattern.test(text)) throw new Error(`Missing lib::run() in ${path}`);
  writeFileSync(path, text.replace(pattern, `$1${libName}::run()`));
  console.log(`  ${relative(root, path)}`);
}

console.log("Updating app identity:");
updateJsonStrings(join(root, "package.json"), {
  name: config.name,
  version: config.version,
});
updateCargoSection(cargoPath, "package", {
  name: config.name,
  version: config.version,
});
updateCargoSection(cargoPath, "lib", { name: expectedLibName });
updateRustLibUse(mainRsPath, expectedLibName);
updateJsonStrings(join(root, "src-tauri/tauri.conf.json"), {
  productName: config.displayName,
  version: config.version,
  identifier: config.identifier,
  title: config.displayName,
});

console.log("Refreshing Cargo.lock:");
try {
  execFileSync(
    "cargo",
    ["check", "--offline", "--manifest-path", join(root, "src-tauri/Cargo.toml")],
    { stdio: "inherit" },
  );
} catch {
  console.warn("  cargo check failed; run `cd src-tauri && cargo check` manually.");
}

if (regenerateNative) {
  console.log("Regenerating native projects:");
  process.env.JAVA_HOME ||= "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home";
  process.env.ANDROID_HOME ||= "/opt/homebrew/share/android-commandlinetools";
  const ndkRoot = join(process.env.ANDROID_HOME, "ndk");
  if (!process.env.NDK_HOME && existsSync(ndkRoot)) {
    const versions = readdirSync(ndkRoot).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
    const latest = versions.at(-1);
    if (latest) process.env.NDK_HOME = join(ndkRoot, latest);
  }
  process.env.ANDROID_SDK_ROOT = process.env.ANDROID_HOME;
  process.env.PATH = [
    join(process.env.JAVA_HOME, "bin"),
    join(process.env.ANDROID_HOME, "cmdline-tools/latest/bin"),
    join(process.env.ANDROID_HOME, "platform-tools"),
    process.env.PATH ?? "",
  ].join(delimiter);

  for (const platform of ["ios", "android"]) {
    const generated = join(root, "src-tauri/gen", platform === "ios" ? "apple" : "android");
    rmSync(generated, { recursive: true, force: true });
    try {
      execFileSync("pnpm", ["tauri", platform, "init", "--ci"], {
        cwd: root,
        stdio: "inherit",
      });
    } catch {
      console.warn(`  ${platform} init failed; run \`pnpm tauri ${platform} init --ci\` manually.`);
    }
  }
} else {
  console.log("Done. App identity is in sync.");
}
