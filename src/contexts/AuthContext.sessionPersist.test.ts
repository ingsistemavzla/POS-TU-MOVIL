import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guardas estructurales: el init no debe destruir tokens antes de getSession.
 */
describe('AuthContext session persistence guards', () => {
  const src = readFileSync(resolve(__dirname, 'AuthContext.tsx'), 'utf8');

  it('does not call clearAuthCache before getSession during initializeAuth', () => {
    const start = src.indexOf('const initializeAuth = async ()');
    const end = src.indexOf('timeoutId = setTimeout', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const initBlock = src.slice(start, end);
    // Ignorar comentarios de línea para no confundir menciones documentales.
    const codeOnly = initBlock
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    expect(codeOnly).toContain('supabase.auth.getSession()');
    expect(codeOnly).not.toMatch(/clearAuthCache\s*\(/);
    expect(codeOnly).not.toContain('auth_cache_cleared');
  });

  it('still clears auth cache on explicit SIGNED_OUT cleanup path', () => {
    const start = src.indexOf("plan.action === 'signed_out_cleanup'");
    const end = src.indexOf("plan.action === 'no_session'", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const signedOutBlock = src.slice(start, end);
    expect(signedOutBlock).toMatch(/clearAuthCache\s*\(/);
  });
});
