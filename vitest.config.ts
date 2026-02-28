import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', '**/.worktrees/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov']
    }
  }
});
