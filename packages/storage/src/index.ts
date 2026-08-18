export type StorageObject = {
  key: string;
  filename: string;
  contentType: string;
  size: number;
};

export type StorageAdapter = {
  put(
    key: string,
    body: Uint8Array,
    metadata: Omit<StorageObject, "key" | "size">,
  ): Promise<StorageObject>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
};

export type StorageDriver = "local" | "s3";
