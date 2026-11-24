import { describe, expect, it } from "vitest";
import { mergeContacts, parseVCard } from "./contacts";

const vcard = (body: string) => `BEGIN:VCARD\nVERSION:3.0\n${body}\nEND:VCARD`;

describe("parseVCard", () => {
  it("reads names, numbers and email addresses from multiple cards", () => {
    const text = [
      vcard("FN:Ali Ahmed\nTEL;TYPE=CELL:+973 3600 1234\nEMAIL:ali@example.com"),
      vcard("FN:Sara Abbas\nTEL;TYPE=WORK;PREF=1:+973 3911 9999"),
    ].join("\n");

    expect(parseVCard(text)).toEqual([
      {
        id: "imported:97336001234",
        name: "Ali Ahmed",
        phone: "+973 3600 1234",
        email: "ali@example.com",
        source: "imported",
      },
      {
        id: "imported:97339119999",
        name: "Sara Abbas",
        phone: "+973 3911 9999",
        email: "",
        source: "imported",
      },
    ]);
  });

  it("unfolds wrapped lines and ignores colons inside quoted parameters", () => {
    const text = vcard('FN:Long Name\nTEL;type="CELL,VOICE":+973\r\n 3600 5555');
    expect(parseVCard(text)[0]?.phone).toBe("+973 3600 5555");
  });

  it("falls back to N when FN is missing and unescapes values", () => {
    const text = vcard("N:Hassan;Zainab\nTEL:+973\\, 3600 7777");
    expect(parseVCard(text)[0]).toMatchObject({
      name: "Zainab Hassan",
      phone: "+973, 3600 7777",
    });
  });

  it("skips empty cards", () => {
    expect(parseVCard(vcard("VERSION:3.0"))).toEqual([]);
  });
});

describe("mergeContacts", () => {
  it("deduplicates by phone number regardless of formatting", () => {
    const contact = {
      id: "a",
      name: "Ali",
      phone: "+973 3600 1234",
      email: "",
      source: "device" as const,
    };
    expect(
      mergeContacts([contact], [{ ...contact, id: "b", phone: "+97336001234" }]),
    ).toHaveLength(1);
  });
});
