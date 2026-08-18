import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { ImapConnectionConfig, RawEmailMessage } from "./types";

type ImapFetchEnvelope = {
  messageId?: string | null;
  inReplyTo?: string | null;
  subject?: string | false | null;
  date?: Date | null;
  from?: { address?: string | null; name?: string | null }[] | null;
};

type ImapFetchMessage = {
  uid: number;
  envelope?: ImapFetchEnvelope | false;
  source?: Buffer;
};

function toAddress(envelope: ImapFetchEnvelope | false | undefined) {
  const first = usableEnvelope(envelope)?.from?.[0];
  if (!first) {
    return "";
  }
  return first.name
    ? `${first.name} <${first.address ?? ""}>`
    : (first.address ?? "");
}

function normalizeSearchSince(since: Date) {
  return new Date(since.getFullYear(), since.getMonth(), since.getDate());
}

function usableEnvelope(envelope: ImapFetchEnvelope | false | undefined) {
  return envelope || undefined;
}

export async function fetchRecentImapMessages(
  config: ImapConnectionConfig,
  since: Date,
): Promise<RawEmailMessage[]> {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
  });

  await client.connect();
  try {
    const lock = await client.getMailboxLock(config.mailbox);
    try {
      const foundUids = await client.search({
        since: normalizeSearchSince(since),
      });
      const uids = foundUids || [];
      const limitedUids = uids.slice(-(config.maxMessages ?? 50));
      const messages: RawEmailMessage[] = [];

      for await (const item of client.fetch(limitedUids, {
        envelope: true,
        source: true,
        uid: true,
      })) {
        const message = item as ImapFetchMessage;
        if (!message.source) {
          continue;
        }

        const parsed = await simpleParser(message.source);
        const envelope = usableEnvelope(message.envelope);
        const messageId =
          parsed.messageId ??
          envelope?.messageId ??
          `${config.mailbox}:${message.uid}`;

        messages.push({
          provider: "imap",
          providerMessageId: messageId,
          threadId: parsed.inReplyTo ?? envelope?.inReplyTo ?? null,
          from: parsed.from?.text ?? toAddress(envelope),
          subject:
            parsed.subject ??
            (typeof envelope?.subject === "string" ? envelope.subject : null),
          receivedAt: parsed.date ?? envelope?.date ?? new Date(),
          text: parsed.text ?? null,
          html: typeof parsed.html === "string" ? parsed.html : null,
        });
      }

      return messages;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function testImapConnection(config: ImapConnectionConfig) {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
  });

  await client.connect();
  try {
    const lock = await client.getMailboxLock(config.mailbox);
    lock.release();
  } finally {
    await client.logout().catch(() => undefined);
  }
}
