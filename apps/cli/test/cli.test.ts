import { describe, it, expect } from 'vitest';
import { runCli } from '../src/runner.js';

function createBufferIO() {
  let out = '';
  let err = '';
  return {
    io: {
      stdout: (t: string) => {
        out += t;
      },
      stderr: (t: string) => {
        err += t;
      },
    },
    getStdout: () => out,
    getStderr: () => err,
  };
}

describe('RepoDoc CLI', () => {
  it('should print help and return exit code 0', async () => {
    const buf = createBufferIO();
    const code = await runCli(['--help'], { io: buf.io, inMemory: true });
    expect(code).toBe(0);
    expect(buf.getStdout()).toContain('RepoDocAgent CLI');
  });

  it('should show resolved project config as JSON', async () => {
    const buf = createBufferIO();
    const code = await runCli(['config', 'show', '--json'], { io: buf.io, inMemory: true });
    expect(code).toBe(0);
    const parsed = JSON.parse(buf.getStdout()) as { project: { name: string } };
    expect(parsed.project.name).toBe('repo-doc-agent');
  });

  it('should preview documentation as JSON without writing files', async () => {
    const buf = createBufferIO();
    const code = await runCli(['docs', 'preview', '--depth', 'overview', '--json'], {
      io: buf.io,
      inMemory: true,
    });
    expect(code).toBe(0);
    const parsed = JSON.parse(buf.getStdout()) as { previewOnly: boolean; documents: unknown[] };
    expect(parsed.previewOnly).toBe(true);
    expect(parsed.documents.length).toBeGreaterThanOrEqual(2);
  });

  it('should deny docs generate without --yes (exit code 2)', async () => {
    const buf = createBufferIO();
    const code = await runCli(['docs', 'generate', '--depth', 'overview'], {
      io: buf.io,
      inMemory: true,
    });
    expect(code).toBe(2);
    expect(buf.getStderr()).toContain('Permission denied');
  });

  it('should return exit code 1 for unknown commands', async () => {
    const buf = createBufferIO();
    const code = await runCli(['unknown-cmd'], { io: buf.io, inMemory: true });
    expect(code).toBe(1);
    expect(buf.getStderr()).toContain('Unknown command');
  });
});
