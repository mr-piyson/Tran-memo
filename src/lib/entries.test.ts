import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CURRENCY,
  formatAmount,
  formatSigned,
  getStore,
  nextLedgerCode,
} from "./entries";

const V4_KEY = "ledger-notes:v4";

function seed(days = 5) {
  const now = "2026-01-01T00:00:00.000Z";
  localStorage.setItem(
    V4_KEY,
    JSON.stringify({
      dealers: [
        { id: 1, name: "Dealer", phone: "", email: "", emoji: "💬", created_at: now, updated_at: now },
      ],
      ledgerNotes: [
        { id: 10, dealer_id: 1, code: "IN-00001", label: null, created_at: now, updated_at: now },
      ],
      entries: Array.from({ length: days }, (_, index) => ({
        id: index + 1,
        ledger_note_id: 10,
        kind: index % 2 === 0 ? "income" : "expense",
        amount_cents: 1000,
        description: `entry-${index + 1}`,
        created_at: `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
      })),
    }),
  );
}

describe("nextLedgerCode", () => {
  it("allocates the next global code", () => {
    expect(nextLedgerCode(["IN-00001", "IN-00009", "nonsense"])).toBe("IN-00010");
  });

  it("starts at 1 for an empty set", () => {
    expect(nextLedgerCode([])).toBe("IN-00001");
  });
});

describe("formatting", () => {
  it("renders BHD with three decimals", () => {
    expect(formatAmount(1234, DEFAULT_CURRENCY)).toBe("1.234 BD");
    expect(formatSigned(-500, DEFAULT_CURRENCY)).toBe("-0.500 BD");
  });
});

describe("browser store queries", () => {
  beforeEach(() => {
    localStorage.clear();
    seed();
  });

  it("aggregates notes without scanning raw entries in the UI", async () => {
    const summaries = await (await getStore()).listSummaries();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      ledgerNoteId: 10,
      dealerId: 1,
      income: 3000,
      expense: 2000,
      count: 5,
      lastCreatedAt: "2026-01-05T00:00:00.000Z",
    });
  });

  it("paginates newest-first without gaps or repeats", async () => {
    const store = await getStore();
    const first = await store.listEntriesPage(10, 2);
    expect(first.entries.map((entry) => entry.id)).toEqual([5, 4]);
    expect(first.nextCursor).not.toBeNull();

    const second = await store.listEntriesPage(10, 2, first.nextCursor ?? undefined);
    expect(second.entries.map((entry) => entry.id)).toEqual([3, 2]);

    const third = await store.listEntriesPage(10, 2, second.nextCursor ?? undefined);
    expect(third.entries.map((entry) => entry.id)).toEqual([1]);
    expect(third.nextCursor).toBeNull();
  });
});
