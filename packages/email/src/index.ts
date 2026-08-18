export type EmailProvider = "gmail" | "imap";

export type EmailConnectionConfig = {
  provider: EmailProvider;
  userId: string;
};

export type EmailConnector = {
  id: EmailProvider;
  connect(config: EmailConnectionConfig): Promise<void>;
  disconnect(userId: string): Promise<void>;
};
