import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const SRC = resolve(__dirname, '..', 'src');
const MODULES = join(SRC, 'modules');

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : full.endsWith('.ts') ? [full] : [];
  });
}

function importsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

function resolveImport(file: string, specifier: string): string | null {
  return specifier.startsWith('.') ? resolve(dirname(file), specifier) : null;
}

const rel = (p: string) => relative(SRC, p).split(sep).join('/');

const allFiles = filesUnder(SRC);
const domainFiles = allFiles.filter((f) => /\/domain\//.test(rel(f)));
const applicationFiles = allFiles.filter((f) => /\/application\//.test(rel(f)));

describe('Arquitetura', () => {
  it.each(domainFiles.map((f) => [rel(f), f]))(
    'domínio não depende de framework, banco, aplicação ou infra: %s',
    (_name, file) => {
      for (const specifier of importsOf(file)) {
        expect(specifier).not.toMatch(/^(express|mongodb|dotenv)/);
        expect(specifier).not.toMatch(/\/(infra|application)\//);
      }
    },
  );

  it.each(applicationFiles.map((f) => [rel(f), f]))('aplicação não depende de infra nem de framework: %s', (_name, file) => {
    for (const specifier of importsOf(file)) {
      expect(specifier).not.toMatch(/^(express|mongodb|dotenv)/);
      expect(specifier).not.toMatch(/\/infra\//);
    }
  });

  it('módulos só usam outros módulos pela porta de entrada (index.ts)', () => {
    const violations: string[] = [];
    for (const file of filesUnder(MODULES)) {
      const ownModule = rel(file).split('/')[1];
      for (const specifier of importsOf(file)) {
        const target = resolveImport(file, specifier);
        if (!target || !target.startsWith(MODULES + sep)) continue;
        const [targetModule, ...rest] = relative(MODULES, target).split(sep);
        if (targetModule !== ownModule && rest.length > 0) {
          violations.push(`${rel(file)} -> ${specifier}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('só o composition root (main.ts) conhece implementações concretas de outros módulos', () => {
    const concrete = /(Mongo|InMemory)\w*Repository|ConsoleMailer|SystemClock/;
    const offenders = allFiles
      .filter((f) => !/\/infra\//.test(rel(f)) && rel(f) !== 'main.ts')
      .filter((f) => importsOf(f).some((s) => /infra\//.test(s)) || concrete.test(readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '')))
      .map(rel);
    expect(offenders).toEqual([]);
  });
});
