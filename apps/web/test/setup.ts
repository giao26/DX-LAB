import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: () => '12345678-1234-4234-8234-123456789012' },
});
