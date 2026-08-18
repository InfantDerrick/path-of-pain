import {
  enqueueEmailConnectionSync,
  listEmailConnections,
  upsertImapEmailConnection,
} from "@jobtracker/db";
import { testImapConnection } from "@jobtracker/email";
import { jsonError, requireApiSession } from "@/lib/api";

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function GET() {
  const auth = await requireApiSession();
  if (!auth.ok) {
    return auth.response;
  }

  return Response.json({
    connections: await listEmailConnections(auth.session.user.id),
  });
}

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return jsonError("Invalid email settings.");
  }

  const host = stringValue("host" in body ? body.host : "");
  const username = stringValue("username" in body ? body.username : "");
  const password = stringValue("password" in body ? body.password : "");
  const mailbox = stringValue("mailbox" in body ? body.mailbox : "") || "INBOX";
  const port = numberValue("port" in body ? body.port : undefined, 993);
  const secure = booleanValue("secure" in body ? body.secure : undefined, true);
  const syncWindowDays = numberValue(
    "syncWindowDays" in body ? body.syncWindowDays : undefined,
    14,
  );
  const storeSubject = booleanValue(
    "storeSubject" in body ? body.storeSubject : undefined,
    true,
  );

  if (!host || !username || !password) {
    return jsonError("Host, username, and app password are required.");
  }
  if (port < 1 || port > 65_535) {
    return jsonError("IMAP port must be between 1 and 65535.");
  }

  const config = {
    provider: "imap" as const,
    host,
    port,
    secure,
    username,
    password,
    mailbox,
    maxMessages: 50,
  };

  if ("testConnection" in body && body.testConnection) {
    try {
      await testImapConnection(config);
    } catch (error) {
      return jsonError(
        error instanceof Error
          ? error.message
          : "Could not reach that mailbox.",
      );
    }
  }

  try {
    const connection = await upsertImapEmailConnection(auth.session.user.id, {
      label: stringValue("label" in body ? body.label : "") || username,
      host,
      port,
      secure,
      username,
      password,
      mailbox,
      syncWindowDays,
      storeSubject,
    });

    if (!connection) {
      return jsonError("Could not save email settings.");
    }

    if ("syncNow" in body && body.syncNow) {
      await enqueueEmailConnectionSync({
        userId: auth.session.user.id,
        connectionId: connection.id,
      });
    }

    return Response.json({ ok: true, connectionId: connection.id });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not save email settings.",
    );
  }
}
