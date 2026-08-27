import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseAdminService } from '../infrastructure/firebase/firebase-admin.service';
import { SimulatorCodeValidatorService } from './simulator-code-validator.service';
import { SimulatorAiProvider } from './providers/simulator-ai-provider.interface';
import { SimulatorRequirementsExtractorService } from './simulator-requirements-extractor.service';
import { SimulatorQualityReviewService } from './simulator-quality-review.service';

function normalizeSimulatorConfig(prompt: string, title?: string, aiResult?: Record<string, unknown> | null) {
  const cleanPrompt = prompt.trim();
  const candidate = aiResult && typeof aiResult === 'object' && !Array.isArray(aiResult) ? aiResult : null;
  const safeType = typeof candidate?.type === 'string' ? candidate.type : typeof candidate?.simulatorType === 'string' ? candidate.simulatorType : null;

  if (safeType && candidate) {
    const config = {
      ...candidate,
      type: safeType,
      title: title ?? (typeof candidate.title === 'string' ? candidate.title : safeType),
      prompt: cleanPrompt,
    } as Record<string, unknown>;

    if (!Array.isArray(config.actions)) {
      config.actions = ['Check Answer', 'Reset', 'Show Hint', 'New Challenge'];
    }

    if (!config.challenge && safeType === 'fractions') {
      config.challenge = {
        prompt: 'Which fraction is larger: 1/2 or 3/4?',
        answer: '3/4',
        options: ['1/2', '2/4', '3/4', '1/3'],
        hint: '3/4 is greater than 1/2 because 0.75 > 0.5.',
      };
    }

    return config;
  }

  return {
    type: 'generic',
    title: title ?? 'Custom simulator',
    description: cleanPrompt || 'Interactive classroom simulator.',
    prompt: cleanPrompt,
    actions: ['Check Answer', 'Reset', 'Show Hint', 'New Challenge'],
    theme: {
      primaryColor: '#2563eb',
      secondaryColor: '#8b5cf6',
      backgroundColor: '#f8fbff',
    },
    challenge: {
      prompt: cleanPrompt || 'Adjust the controls to explore the scenario and complete the challenge.',
      answer: 'Use the controls to reason through the task.',
      hint: 'The simulator is driven by the teacher prompt and should adapt to the generated task.',
    },
  };
}

@Injectable()
export class SimulatorGenerationService {
  private static readonly GENERATION_LIMIT_PER_HOUR = 30;
  private readonly generationAttempts = new Map<string, number[]>();

  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    @Inject('SIMULATOR_AI_PROVIDER') private readonly ai: SimulatorAiProvider,
    private readonly validator: SimulatorCodeValidatorService,
    private readonly requirementsExtractor: SimulatorRequirementsExtractorService,
    private readonly qualityReview: SimulatorQualityReviewService,
  ) {}

  private checkRateLimit(teacherUid: string) {
    const now = Date.now();
    const entries = this.generationAttempts.get(teacherUid) ?? [];
    const recent = entries.filter((timestamp) => now - timestamp < 60 * 60 * 1000);
    if (recent.length >= SimulatorGenerationService.GENERATION_LIMIT_PER_HOUR) {
      throw new Error('Generation limit reached: 30 simulator generations per teacher per hour.');
    }
    this.generationAttempts.set(teacherUid, recent);
  }

  private recordSuccessfulGeneration(teacherUid: string) {
    const entries = this.generationAttempts.get(teacherUid) ?? [];
    entries.push(Date.now());
    this.generationAttempts.set(teacherUid, entries);
  }

  private async generateStructuredSimulator(prompt: string, title?: string) {
    const model = process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b';
    const buildCodePrompt = (repairContext?: string) => `
You are extracting the requirements and generating a real interactive React TypeScript mathematics simulator in one response.
Return only valid JSON with this exact schema:
{
  "title": "string",
  "description": "string",
  "learningObjectives": ["string"],
  "files": {
    "/App.tsx": "complete React TypeScript component",
    "/styles.css": "complete CSS stylesheet"
  },
  "dependencies": {
    "react": "latest",
    "react-dom": "latest",
    "recharts": "latest",
    "katex": "latest",
    "mathjs": "latest"
  },
  "teacherInstructions": "string"
}

Teacher prompt:
${prompt}

Rules:
- Infer the learning goal, visual elements, controls, calculations, interactions, special cases, and buttons directly from the teacher prompt.
- Generate a simulator that matches all inferred requirements exactly.
- Use React state for all values and controls.
- Use mouse/touch interactions and real calculations in code.
- Do not render the raw teacher prompt as the main simulator UI.
- Do not use generic sliders, midpoint cards, or fallback templates.
- Do not use eval, new Function, fetch, XMLHttpRequest, localStorage, sessionStorage, document.cookie, external scripts, or unsafe imports.
- Use inline SVG, CSS, Recharts, mathjs, or approved sandbox-safe packages only.
- Keep the response compact enough for the token limit: App.tsx under 4500 characters and styles.css under 1800 characters.
- Prefer inline SVG and plain CSS. Do not include comments, long explanations, unused dependencies, or repeated markup.
- Return JSON only.
${repairContext ? `\nRepair context:\n${repairContext}\n` : ''}
`;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const repairContext = attempt === 0 ? undefined : `Previous generation failed. The generated code missed requirements. Keep the same topic but repair the implementation.`;
        const aiResult = await this.ai.generate(buildCodePrompt(repairContext), model, [], 16384);
        const rawText = typeof aiResult === 'string' ? aiResult : JSON.stringify(aiResult);
        let parsed: unknown;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          throw new Error('invalid AI JSON');
        }

        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('invalid AI JSON');
        }

        const files = (parsed as { files?: Record<string, unknown> }).files;
        if (!files || typeof files['/App.tsx'] !== 'string' || typeof files['/styles.css'] !== 'string') {
          throw new Error('missing App.tsx/styles.css');
        }

        let validated;
        try {
          validated = this.validator.validate(parsed);
        } catch (error) {
          throw new Error(`failed schema validation: ${error instanceof Error ? error.message : String(error)}`);
        }

        try {
          this.validator.scanGeneratedFiles(validated.files);
        } catch (error) {
          throw new Error(`unsafe generated code: ${error instanceof Error ? error.message : String(error)}`);
        }

        const sanitizedDependencies = this.validator.sanitizeDependencies(validated.dependencies);
        return {
          ...validated,
          dependencies: sanitizedDependencies,
          files: {
            '/App.tsx': validated.files['/App.tsx'],
            '/styles.css': validated.files['/styles.css'],
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw new Error(lastError?.message ?? 'Simulator generation failed.');
  }

  async generateFromPrompt(teacherUid: string, body: { ideaId?: string; prompt: string; title?: string }) {
    if (!body || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
      throw new BadRequestException('Prompt is required');
    }

    try {
      this.checkRateLimit(teacherUid);

      const firestore = this.firebaseAdmin.getFirestore();
      const generated = await this.generateStructuredSimulator(body.prompt, body.title);
      const safeConfig = normalizeSimulatorConfig(body.prompt, body.title ?? generated.title, {
        type: 'generic',
        title: generated.title,
        description: generated.description,
        prompt: body.prompt,
        actions: ['Check Answer', 'Reset', 'Show Hint', 'New Challenge'],
      });

      const now = admin.firestore.FieldValue.serverTimestamp();
      const docRef = firestore.collection('simulators').doc();
      const doc = {
        id: docRef.id,
        teacherId: teacherUid,
        ideaId: body.ideaId ?? null,
        prompt: body.prompt,
        title: body.title ?? generated.title,
        description: generated.description,
        generatedFiles: generated.files,
        dependencies: generated.dependencies,
        teacherInstructions: generated.teacherInstructions,
        learningObjectives: generated.learningObjectives,
        config: safeConfig,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      } as Record<string, unknown>;

      await docRef.set(doc);
      this.recordSuccessfulGeneration(teacherUid);
      return { simulator: doc };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'The simulator could not be generated. Please revise the prompt and try again.';
      throw new BadRequestException(message);
    }
  }

  async listTeacherSimulators(teacherUid: string) {
    const firestore = this.firebaseAdmin.getFirestore();
    const snap = await firestore.collection('simulators').where('teacherId', '==', teacherUid).get();
    const items: any[] = [];
    snap.forEach((d) => {
      const data = d.data();
      items.push({ id: d.id, ...data });
    });
    items.sort((a, b) => {
      const ta = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
      const tb = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
      return tb - ta;
    });
    return items;
  }

  async updateSimulator(teacherUid: string, simulatorId: string, patch: Record<string, unknown>) {
    const firestore = this.firebaseAdmin.getFirestore();
    const docRef = firestore.collection('simulators').doc(simulatorId);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Simulator not found');
    const data = doc.data() || {};
    if (data.teacherId !== teacherUid) throw new Error('Not authorized');
    const now = admin.firestore.FieldValue.serverTimestamp();
    await docRef.set({ ...patch, updatedAt: now }, { merge: true });
    const updated = await docRef.get();
    return { id: updated.id, ...(updated.data() || {}) };
  }

  async publishSimulator(teacherUid: string, simulatorId: string) {
    const firestore = this.firebaseAdmin.getFirestore();
    const docRef = firestore.collection('simulators').doc(simulatorId);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Simulator not found');
    const data = doc.data() || {};
    if (data.teacherId !== teacherUid) throw new Error('Not authorized');
    const now = admin.firestore.FieldValue.serverTimestamp();
    await docRef.set({ status: 'published', publishedAt: now, updatedAt: now }, { merge: true });
    const updated = await docRef.get();
    return { id: updated.id, ...(updated.data() || {}) };
  }

  async listStudentSimulators() {
    const firestore = this.firebaseAdmin.getFirestore();
    const snap = await firestore.collection('simulators').where('status', '==', 'published').get();
    const items: any[] = [];
    snap.forEach((d) => items.push({ id: d.id, ...(d.data() || {}) }));
    return items;
  }

  async getPublishedSimulatorById(simulatorId: string) {
    const firestore = this.firebaseAdmin.getFirestore();
    const docRef = firestore.collection('simulators').doc(simulatorId);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Simulator not found');
    const data = doc.data() || {};
    if (data.status !== 'published') throw new Error('Simulator not published');
    return { id: doc.id, ...data };
  }

  async getTeacherSimulatorById(teacherUid: string, simulatorId: string) {
    const firestore = this.firebaseAdmin.getFirestore();
    const docRef = firestore.collection('simulators').doc(simulatorId);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Simulator not found');
    const data = doc.data() || {};
    if (data.teacherId !== teacherUid) throw new Error('Not authorized');
    return { id: doc.id, ...data };
  }
}
