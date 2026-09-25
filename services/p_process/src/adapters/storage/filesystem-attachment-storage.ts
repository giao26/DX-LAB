import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

export interface AttachmentStorage {
  save(content: Buffer): Promise<string>;
  read(storageKey: string): Promise<Buffer>;
  remove(storageKey: string): Promise<void>;
}

interface StorageFileOps {
  mkdir: typeof mkdir;
  open: typeof open;
  readFile: typeof readFile;
  rename: typeof rename;
  rm: typeof rm;
}

const DEFAULT_FILE_OPS: StorageFileOps = { mkdir, open, readFile, rename, rm };

export class FilesystemAttachmentStorage implements AttachmentStorage {
  private readonly root: string;

  constructor(
    root = process.env.ATTACHMENT_STORAGE_PATH ?? resolve(process.cwd(), 'private-attachments'),
    private readonly fileOps: StorageFileOps = DEFAULT_FILE_OPS,
  ) {
    this.root = resolve(root);
  }

  private pathFor(storageKey: string): string {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storageKey)) {
      throw new Error('Invalid opaque storage key');
    }
    const target = resolve(this.root, storageKey.slice(0, 2), storageKey);
    if (!target.startsWith(`${this.root}${sep}`)) throw new Error('Storage path escaped private root');
    return target;
  }

  async save(content: Buffer): Promise<string> {
    const storageKey = randomUUID();
    const target = this.pathFor(storageKey);
    const partial = `${target}.partial`;
    await this.fileOps.mkdir(dirname(target), { recursive: true, mode: 0o700 });
    const handle = await this.fileOps.open(partial, 'wx', 0o600);
    try {
      await handle.writeFile(content);
      await handle.close();
      await this.fileOps.rename(partial, target);
    } catch (error) {
      try { await handle.close(); } catch { /* best-effort close before cleanup */ }
      await this.fileOps.rm(partial, { force: true });
      throw error;
    }
    return storageKey;
  }

  async remove(storageKey: string): Promise<void> {
    await this.fileOps.rm(this.pathFor(storageKey), { force: true });
  }

  async read(storageKey: string): Promise<Buffer> {
    return this.fileOps.readFile(this.pathFor(storageKey));
  }
}
