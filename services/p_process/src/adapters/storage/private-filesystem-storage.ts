import { createHash, randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export class PrivateFilesystemStorage {
  constructor(private readonly root = process.env.ATTACHMENT_ROOT ?? '/var/lib/dxlab/attachments') {}

  async store(bytes: Buffer): Promise<{ key: string; sha256: string }> {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const key = randomUUID();
    await writeFile(join(this.root, key), bytes, { mode: 0o600, flag: 'wx' });
    return { key, sha256: createHash('sha256').update(bytes).digest('hex') };
  }

  async remove(key: string): Promise<void> {
    await unlink(join(this.root, key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}
