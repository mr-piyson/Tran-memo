import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/entries";

/** A contact the user can pick from to prefill a dealer's name and phone. */
export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: "device" | "imported";
}

export interface ContactSource {
  contacts: Contact[];
  /** Set when the native address-book read failed; imported contacts still load. */
  nativeError: string | null;
}

interface NativeContact {
  name: string;
  phone: string;
  email?: string;
}

const STORAGE_KEY = "ledger-notes:contacts-v1";

function phoneKey(phone: string): string {
  return phone.replace(/\D/g, "");
}

function identity(contact: Pick<Contact, "name" | "phone">): string {
  const digits = phoneKey(contact.phone);
  return digits || `name:${contact.name.trim().toLowerCase()}`;
}

/** Merge by phone number (or name when there is no number), keeping the first value. */
export function mergeContacts(...groups: readonly Contact[][]): Contact[] {
  const seen = new Set<string>();
  const merged: Contact[] = [];
  for (const group of groups) {
    for (const contact of group) {
      if (!contact.name.trim() && !contact.phone.trim()) continue;
      const key = identity(contact);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(contact);
    }
  }
  return merged.sort((a, b) => a.name.localeCompare(b.name));
}

export function readImportedContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Contact =>
        typeof item === "object" &&
        item !== null &&
        typeof item.name === "string" &&
        typeof item.phone === "string",
    );
  } catch {
    return [];
  }
}

async function loadNativeContacts(): Promise<{ contacts: Contact[]; error: string | null }> {
  // Desktop builds have no device address book; the UI offers vCard import.
  if (!isTauri()) return { contacts: [], error: null };

  try {
    const rows = await invoke<NativeContact[]>("plugin:contacts|load_native_contacts");
    return {
      contacts: (rows ?? []).map((row, index) => ({
        id: `device:${index}:${identity(row)}`,
        name: row.name?.trim() ?? "",
        phone: row.phone?.trim() ?? "",
        email: row.email?.trim() ?? "",
        source: "device" as const,
      })),
      error: null,
    };
  } catch (cause) {
    return {
      contacts: [],
      error: cause instanceof Error ? cause.message : String(cause),
    };
  }
}

/** Device contacts on mobile, plus vCard imports cached on every platform. */
export async function loadContacts(): Promise<ContactSource> {
  const [native, imported] = await Promise.all([
    loadNativeContacts(),
    Promise.resolve(readImportedContacts()),
  ]);
  return {
    contacts: mergeContacts(native.contacts, imported),
    nativeError: native.error,
  };
}

/** Parse one or more vCard 2.1/3.0/4.0 entries into contacts. */
export function parseVCard(text: string): Contact[] {
  const lines = unfoldLines(text);
  const contacts: Contact[] = [];
  let current: { name: string; phone: string; email: string; nameFromN: string } | null = null;

  function finish() {
    if (!current) return;
    const name = current.name || current.nameFromN;
    const phone = current.phone.trim();
    if (name || phone) {
      contacts.push({
        id: `imported:${identity({ name, phone })}`,
        name: name.trim(),
        phone,
        email: current.email.trim(),
        source: "imported",
      });
    }
    current = null;
  }

  for (const line of lines) {
    const property = parseProperty(line);
    if (!property) continue;

    if (property.key === "BEGIN") {
      if (property.value.trim().toUpperCase() === "VCARD") {
        finish();
        current = { name: "", phone: "", email: "", nameFromN: "" };
      }
      continue;
    }
    if (property.key === "END") {
      if (property.value.trim().toUpperCase() === "VCARD") finish();
      continue;
    }
    if (!current) continue;

    switch (property.key) {
      case "FN":
        current.name = unescapeValue(property.value).trim();
        break;
      case "N": {
        const parts = unescapeValue(property.value).split(";");
        current.nameFromN = [parts[1] ?? "", parts[0] ?? ""].filter(Boolean).join(" ").trim();
        break;
      }
      case "TEL": {
        const value = unescapeValue(property.value).replace(/^tel:/i, "").trim();
        if (value && !current.phone) current.phone = value;
        break;
      }
      case "EMAIL": {
        const value = unescapeValue(property.value).replace(/^mailto:/i, "").trim();
        if (value && !current.email) current.email = value;
        break;
      }
    }
  }
  finish();
  return mergeContacts(contacts);
}

/** Import a .vcf file, cache the result, and return the full merged list. */
export async function importVCardFile(file: File): Promise<Contact[]> {
  const parsed = parseVCard(await file.text());
  if (parsed.length === 0) throw new Error("No contacts found in that vCard file.");

  const imported = mergeContacts(readImportedContacts(), parsed);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
  return imported;
}

function unfoldLines(text: string): string[] {
  const lines: string[] = [];
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (/^[ \t]/.test(line) && lines.length > 0) {
      // vCard unfolding removes the line break but keeps the leading whitespace.
      lines[lines.length - 1] += line;
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function parseProperty(line: string): { key: string; value: string } | null {
  let quote = false;
  let colon = -1;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') quote = !quote;
    if (char === ":" && !quote) {
      colon = index;
      break;
    }
  }
  if (colon < 0) return null;

  const head = line.slice(0, colon);
  const semicolon = head.indexOf(";");
  return {
    key: (semicolon >= 0 ? head.slice(0, semicolon) : head).toUpperCase(),
    value: line.slice(colon + 1),
  };
}

function unescapeValue(value: string): string {
  return value.replace(/\\([nN\\;,])/g, (_, char: string) =>
    char.toLowerCase() === "n" ? "\n" : char,
  );
}
