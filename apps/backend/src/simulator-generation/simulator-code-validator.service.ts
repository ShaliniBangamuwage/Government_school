import { Injectable } from '@nestjs/common';
import { z } from 'zod';

const allowedDependencies = new Set([
  'react',
  'react-dom',
  'react-is',
  'recharts',
  'katex',
  'mathjs',
  'framer-motion',
  'lucide-react',
  'plotly.js',
  'react-plotly.js',
  '@codesandbox/sandpack-react',
]);

const generatedSimulatorSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(500),
  learningObjectives: z.array(z.string().min(2).max(120)).min(1).max(6),
  files: z.object({
    '/App.tsx': z.string().min(100).max(20000),
    '/styles.css': z.string().min(20).max(20000),
  }),
  dependencies: z.record(z.string().min(1), z.string().min(1)).default({
    react: 'latest',
    'react-dom': 'latest',
  }),
  teacherInstructions: z.string().min(10).max(1000),
});

@Injectable()
export class SimulatorCodeValidatorService {
  validate(payload: unknown) {
    return generatedSimulatorSchema.parse(payload);
  }

  scanGeneratedFiles(files: Record<string, string>) {
    for (const [filePath, content] of Object.entries(files)) {
      if (!filePath.endsWith('.tsx') && !filePath.endsWith('.css')) {
        throw new Error(`Unsupported generated file type: ${filePath}`);
      }

      this.validateFileContent(filePath, content);
    }
  }

  private validateFileContent(filePath: string, content: string) {
    const trimmed = content.trim();
    if (!trimmed || trimmed.length < 10) {
      throw new Error(`Generated file is empty or too short: ${filePath}`);
    }

    const blockedPatterns = [
      'eval(',
      'new Function',
      'window.parent',
      'localStorage',
      'sessionStorage',
      'document.cookie',
      'fetch(',
      'WebSocket',
      'XMLHttpRequest',
      'iframe',
      'window.top',
      'fs.',
      'require(',
      'process.env',
      'firebase',
      'import.meta.url',
      'document.write',
      'navigator.sendBeacon',
      'new URL(',
      'error.message =',
      'error.stack =',
      'error.name =',
      'Object.defineProperty(error',
    ];

    const lower = content.toLowerCase();
    for (const pattern of blockedPatterns) {
      if (lower.includes(pattern.toLowerCase())) {
        throw new Error(`Blocked API pattern detected in generated code: ${pattern} (${filePath})`);
      }
    }

    const importMatches = Array.from(content.matchAll(/import\s+(?:[^;]+?)\s+from\s+['"]([^'"]+)['"]/g));
    for (const match of importMatches) {
      const dependency = match[1];
      const normalized = dependency.startsWith('.') ? '' : dependency.split('/')[0];
      if (normalized && !allowedDependencies.has(normalized)) {
        throw new Error(`Disallowed import detected: ${dependency} in ${filePath}`);
      }
    }

    const unsafeScriptPattern = /<script|<iframe|onerror=|javascript:/i;
    if (unsafeScriptPattern.test(content)) {
      throw new Error(`Unsafe HTML or script pattern detected in ${filePath}`);
    }
  }

  sanitizeDependencies(input: Record<string, string> | undefined) {
    const cleaned: Record<string, string> = {};
    for (const [name, version] of Object.entries(input ?? {})) {
      const raw = name.trim();
      if (!raw) {
        continue;
      }
      const normalized = raw.startsWith('@') ? raw.split('/')[0] + '/' + raw.split('/')[1] : raw.split('/')[0];
      if (!allowedDependencies.has(normalized) && !allowedDependencies.has(raw)) {
        continue;
      }
      cleaned[raw] = String(version || 'latest');
    }
    return {
      react: 'latest',
      'react-dom': 'latest',
      'react-is': 'latest',
      ...cleaned,
    };
  }
}
