import { quoteDraftSchema } from "@/features/quote/schemas/quote-input-schema";
import type { QuoteInput } from "@/features/quote/types";

export const QUOTE_DRAFT_STORAGE_KEY = "restaurant-quote:draft:v1";
export const QUOTE_DRAFT_VERSION = 1 as const;
export const QUOTE_RULE_VERSION = "mvp-1.1" as const;

// sessionStorage is session-scoped, but retaining a bounded age prevents a
// restored tab from using an unexpectedly stale quote after a long pause.
export const QUOTE_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type DraftEnvelope = {
  draftVersion: typeof QUOTE_DRAFT_VERSION;
  ruleVersion: typeof QUOTE_RULE_VERSION;
  savedAt: string;
  values: QuoteInput;
};

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    // Storage can be disabled by browser privacy settings.
    return null;
  }
}

function discardStoredDraft(storage: Storage | null): null {
  if (storage === null) return null;

  try {
    storage.removeItem(QUOTE_DRAFT_STORAGE_KEY);
  } catch {
    // A storage failure must never prevent the quote flow from opening.
  }
  return null;
}

export function saveQuoteDraft(values: QuoteInput): void {
  const storage = getSessionStorage();
  if (storage === null) return;

  const parsed = quoteDraftSchema.safeParse(values);
  if (!parsed.success) {
    discardStoredDraft(storage);
    return;
  }

  const envelope: DraftEnvelope = {
    draftVersion: QUOTE_DRAFT_VERSION,
    ruleVersion: QUOTE_RULE_VERSION,
    savedAt: new Date().toISOString(),
    values: parsed.data as QuoteInput,
  };

  try {
    storage.setItem(QUOTE_DRAFT_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Quota and security errors are non-fatal; the in-memory form remains
    // usable even when a draft cannot be persisted.
  }
}

export function loadQuoteDraft(): QuoteInput | null {
  const storage = getSessionStorage();
  if (storage === null) return null;

  let stored: string | null;
  try {
    stored = storage.getItem(QUOTE_DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (stored === null) return null;

  try {
    const envelope: unknown = JSON.parse(stored);
    if (envelope === null || typeof envelope !== "object" || Array.isArray(envelope)) {
      throw new Error("invalid envelope");
    }

    const candidate = envelope as Partial<DraftEnvelope>;
    if (
      candidate.draftVersion !== QUOTE_DRAFT_VERSION ||
      candidate.ruleVersion !== QUOTE_RULE_VERSION ||
      typeof candidate.savedAt !== "string"
    ) {
      throw new Error("incompatible envelope");
    }

    const savedAt = Date.parse(candidate.savedAt);
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > QUOTE_DRAFT_TTL_MS) {
      throw new Error("expired draft");
    }

    return quoteDraftSchema.parse(candidate.values) as QuoteInput;
  } catch {
    return discardStoredDraft(storage);
  }
}

export function clearQuoteDraft(): void {
  discardStoredDraft(getSessionStorage());
}
