import {
  buildEmailSuggestionDrafts,
  decryptJson,
  type EmailSuggestionDraft,
  encryptJson,
  type ImapConnectionConfig,
  type RawEmailMessage,
} from "@jobtracker/email";
import { getEnv } from "@jobtracker/shared/env";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { createId } from "../ids";
import {
  company,
  emailConnection,
  emailMessageRef,
  emailSuggestion,
  opportunity,
  opportunityEvent,
} from "../schema/tracking";

type ProposedEventPayload = {
  type?: unknown;
  source?: unknown;
  metadata?: unknown;
  confidence?: unknown;
};

type ImapSettingsInput = {
  label?: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  mailbox?: string;
  syncWindowDays?: number;
  storeSubject?: boolean;
};

function getEncryptionKey() {
  const key = getEnv().ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY is required before configuring email.");
  }
  return key;
}

function clampSyncWindowDays(value?: number) {
  if (!value || Number.isNaN(value)) {
    return 14;
  }
  return Math.max(1, Math.min(60, Math.round(value)));
}

function buildImapConfig(input: ImapSettingsInput): ImapConnectionConfig {
  return {
    provider: "imap",
    host: input.host.trim(),
    port: input.port,
    secure: input.secure,
    username: input.username.trim(),
    password: input.password,
    mailbox: input.mailbox?.trim() || "INBOX",
    maxMessages: 50,
  };
}

function asProposedEvent(value: Record<string, unknown>): {
  type: string;
  source: string;
  metadata: Record<string, unknown>;
  confidence: number | null;
} {
  const payload = value as ProposedEventPayload;
  return {
    type: typeof payload.type === "string" ? payload.type : "EMAIL_SIGNAL",
    source: typeof payload.source === "string" ? payload.source : "email",
    metadata:
      payload.metadata &&
      typeof payload.metadata === "object" &&
      !Array.isArray(payload.metadata)
        ? (payload.metadata as Record<string, unknown>)
        : {},
    confidence:
      typeof payload.confidence === "number"
        ? Math.max(0, Math.min(100, Math.round(payload.confidence)))
        : null,
  };
}

export async function listOpportunityMatchTargets(userId: string) {
  return db
    .select({
      id: opportunity.id,
      title: opportunity.title,
      companyName: company.name,
      companyDomain: company.domain,
      sourceUrl: opportunity.sourceUrl,
    })
    .from(opportunity)
    .innerJoin(company, eq(company.id, opportunity.companyId))
    .where(
      and(eq(opportunity.userId, userId), eq(opportunity.status, "ACTIVE")),
    );
}

export async function ensureLocalEmailConnection(userId: string) {
  const [existing] = await db
    .select()
    .from(emailConnection)
    .where(
      and(
        eq(emailConnection.userId, userId),
        eq(emailConnection.provider, "imap"),
        eq(emailConnection.label, "Local fixture import"),
      ),
    )
    .limit(1);
  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(emailConnection)
    .values({
      id: createId("emc"),
      userId,
      provider: "imap",
      label: "Local fixture import",
      encryptedConfig: null,
      status: "paused",
    })
    .returning();
  if (!created) {
    throw new Error("Failed to create email connection.");
  }
  return created;
}

export async function listEmailConnections(userId: string) {
  return db
    .select({
      id: emailConnection.id,
      provider: emailConnection.provider,
      label: emailConnection.label,
      status: emailConnection.status,
      lastSyncAt: emailConnection.lastSyncAt,
      lastError: emailConnection.lastError,
      syncWindowDays: emailConnection.syncWindowDays,
      storeSubject: emailConnection.storeSubject,
      createdAt: emailConnection.createdAt,
      updatedAt: emailConnection.updatedAt,
    })
    .from(emailConnection)
    .where(eq(emailConnection.userId, userId))
    .orderBy(desc(emailConnection.createdAt));
}

export async function listActiveEmailConnectionsForSync() {
  return db
    .select({
      connectionId: emailConnection.id,
      userId: emailConnection.userId,
    })
    .from(emailConnection)
    .where(eq(emailConnection.status, "active"));
}

export async function upsertImapEmailConnection(
  userId: string,
  input: ImapSettingsInput,
) {
  const config = buildImapConfig(input);
  const label = input.label?.trim() || config.username;
  const encryptedConfig = encryptJson(config, getEncryptionKey());
  const syncWindowDays = clampSyncWindowDays(input.syncWindowDays);

  const [existing] = await db
    .select({ id: emailConnection.id })
    .from(emailConnection)
    .where(
      and(
        eq(emailConnection.userId, userId),
        eq(emailConnection.provider, "imap"),
        eq(emailConnection.label, label),
      ),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(emailConnection)
      .set({
        encryptedConfig,
        status: "active",
        lastError: null,
        syncWindowDays,
        storeSubject: input.storeSubject ?? true,
        updatedAt: new Date(),
      })
      .where(eq(emailConnection.id, existing.id))
      .returning({ id: emailConnection.id });
    return updated;
  }

  const [created] = await db
    .insert(emailConnection)
    .values({
      id: createId("emc"),
      userId,
      provider: "imap",
      label,
      encryptedConfig,
      status: "active",
      syncWindowDays,
      storeSubject: input.storeSubject ?? true,
    })
    .returning({ id: emailConnection.id });
  return created;
}

export async function getEmailConnectionSyncTarget(input: {
  userId: string;
  connectionId: string;
}) {
  const [connection] = await db
    .select()
    .from(emailConnection)
    .where(
      and(
        eq(emailConnection.userId, input.userId),
        eq(emailConnection.id, input.connectionId),
      ),
    )
    .limit(1);
  if (!connection?.encryptedConfig) {
    return null;
  }

  const decrypted = decryptJson<ImapConnectionConfig>(
    connection.encryptedConfig,
    getEncryptionKey(),
  );
  if (decrypted.provider !== "imap") {
    return null;
  }

  return {
    id: connection.id,
    userId: connection.userId,
    provider: connection.provider,
    syncWindowDays: connection.syncWindowDays,
    config: decrypted,
  };
}

export async function markEmailConnectionSyncStarted(input: {
  userId: string;
  connectionId: string;
}) {
  await db
    .update(emailConnection)
    .set({ status: "syncing", lastError: null, updatedAt: new Date() })
    .where(
      and(
        eq(emailConnection.userId, input.userId),
        eq(emailConnection.id, input.connectionId),
      ),
    );
}

export async function markEmailConnectionSyncSucceeded(input: {
  userId: string;
  connectionId: string;
}) {
  await db
    .update(emailConnection)
    .set({
      status: "active",
      lastSyncAt: new Date(),
      lastError: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(emailConnection.userId, input.userId),
        eq(emailConnection.id, input.connectionId),
      ),
    );
}

export async function markEmailConnectionSyncFailed(input: {
  userId: string;
  connectionId: string;
  error: string;
}) {
  await db
    .update(emailConnection)
    .set({
      status: "error",
      lastError: input.error.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(emailConnection.userId, input.userId),
        eq(emailConnection.id, input.connectionId),
      ),
    );
}

export async function createEmailSuggestionsFromDrafts(input: {
  userId: string;
  connectionId: string;
  drafts: EmailSuggestionDraft[];
}) {
  const [connection] = await db
    .select({ storeSubject: emailConnection.storeSubject })
    .from(emailConnection)
    .where(
      and(
        eq(emailConnection.userId, input.userId),
        eq(emailConnection.id, input.connectionId),
      ),
    )
    .limit(1);
  const storeSubject = connection?.storeSubject ?? true;
  const createdIds: string[] = [];
  for (const draft of input.drafts) {
    await db.transaction(async (tx) => {
      const [existingRef] = await tx
        .select({ id: emailMessageRef.id })
        .from(emailMessageRef)
        .where(
          and(
            eq(emailMessageRef.userId, input.userId),
            eq(emailMessageRef.provider, draft.messageRef.provider),
            eq(
              emailMessageRef.providerMessageId,
              draft.messageRef.providerMessageId,
            ),
          ),
        )
        .limit(1);

      const messageRefId = existingRef?.id ?? createId("emr");
      if (!existingRef) {
        await tx.insert(emailMessageRef).values({
          id: messageRefId,
          userId: input.userId,
          connectionId: input.connectionId,
          provider: draft.messageRef.provider,
          providerMessageId: draft.messageRef.providerMessageId,
          threadId: draft.messageRef.threadId,
          fromEmail: draft.messageRef.fromEmail,
          fromDomain: draft.messageRef.fromDomain,
          subject: storeSubject ? draft.messageRef.subject : null,
          subjectHash: draft.messageRef.subjectHash,
          receivedAt: draft.messageRef.receivedAt,
          processedAt: new Date(),
          metadata: draft.messageRef.metadata,
        });
      }

      const [existingSuggestion] = await tx
        .select({ id: emailSuggestion.id })
        .from(emailSuggestion)
        .where(
          and(
            eq(emailSuggestion.messageRefId, messageRefId),
            eq(emailSuggestion.type, draft.assertion.type),
            eq(emailSuggestion.opportunityId, draft.match?.opportunityId ?? ""),
          ),
        )
        .limit(1);

      if (existingSuggestion || !draft.match) {
        return;
      }

      const suggestionId = createId("ems");
      await tx.insert(emailSuggestion).values({
        id: suggestionId,
        userId: input.userId,
        messageRefId,
        opportunityId: draft.match.opportunityId,
        type: draft.assertion.type,
        confidence: draft.assertion.confidence,
        status: "pending",
        summary: draft.assertion.summary,
        evidence: draft.assertion.evidence,
        matchReasons: draft.match.reasons,
        proposedEvent: draft.proposedEvent,
      });
      createdIds.push(suggestionId);
    });
  }
  return createdIds;
}

export async function createEmailSuggestionsFromMessages(input: {
  userId: string;
  connectionId: string;
  messages: RawEmailMessage[];
}) {
  const opportunities = await listOpportunityMatchTargets(input.userId);
  const drafts = input.messages.flatMap((message) =>
    buildEmailSuggestionDrafts(message, opportunities),
  );

  return createEmailSuggestionsFromDrafts({
    userId: input.userId,
    connectionId: input.connectionId,
    drafts,
  });
}

export async function listPendingEmailSuggestions(userId: string) {
  return db
    .select({
      id: emailSuggestion.id,
      type: emailSuggestion.type,
      confidence: emailSuggestion.confidence,
      summary: emailSuggestion.summary,
      evidence: emailSuggestion.evidence,
      matchReasons: emailSuggestion.matchReasons,
      createdAt: emailSuggestion.createdAt,
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      companyName: company.name,
      fromDomain: emailMessageRef.fromDomain,
      subject: emailMessageRef.subject,
      receivedAt: emailMessageRef.receivedAt,
    })
    .from(emailSuggestion)
    .innerJoin(opportunity, eq(opportunity.id, emailSuggestion.opportunityId))
    .innerJoin(company, eq(company.id, opportunity.companyId))
    .innerJoin(
      emailMessageRef,
      eq(emailMessageRef.id, emailSuggestion.messageRefId),
    )
    .where(
      and(
        eq(emailSuggestion.userId, userId),
        eq(emailSuggestion.status, "pending"),
      ),
    )
    .orderBy(desc(emailSuggestion.createdAt))
    .limit(20);
}

export async function resolveEmailSuggestion(input: {
  userId: string;
  suggestionId: string;
  status: "ignored" | "wrong_job";
}) {
  const [updated] = await db
    .update(emailSuggestion)
    .set({ status: input.status, resolvedAt: new Date() })
    .where(
      and(
        eq(emailSuggestion.userId, input.userId),
        eq(emailSuggestion.id, input.suggestionId),
        eq(emailSuggestion.status, "pending"),
      ),
    )
    .returning({ id: emailSuggestion.id });
  return Boolean(updated);
}

export async function confirmEmailSuggestion(input: {
  userId: string;
  suggestionId: string;
}) {
  return db.transaction(async (tx) => {
    const [suggestion] = await tx
      .select()
      .from(emailSuggestion)
      .where(
        and(
          eq(emailSuggestion.userId, input.userId),
          eq(emailSuggestion.id, input.suggestionId),
          eq(emailSuggestion.status, "pending"),
        ),
      )
      .limit(1);
    if (!suggestion) {
      return false;
    }

    const proposed = asProposedEvent(suggestion.proposedEvent);
    await tx.insert(opportunityEvent).values({
      id: createId("evt"),
      opportunityId: suggestion.opportunityId,
      userId: input.userId,
      type: proposed.type,
      source: proposed.source,
      sourceReference: suggestion.messageRefId,
      metadata: proposed.metadata,
      confidence: proposed.confidence,
    });
    await tx
      .update(opportunity)
      .set({ lastActivityAt: new Date(), updatedAt: new Date() })
      .where(eq(opportunity.id, suggestion.opportunityId));
    await tx
      .update(emailSuggestion)
      .set({ status: "confirmed", resolvedAt: new Date() })
      .where(eq(emailSuggestion.id, suggestion.id));
    return true;
  });
}
