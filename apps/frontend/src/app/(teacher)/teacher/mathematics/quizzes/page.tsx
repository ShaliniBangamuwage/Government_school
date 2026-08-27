'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/api/client';
import { ProtectedRoute } from '@/lib/auth/route-guard';

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
};

type DraftQuiz = {
  id?: string;
  title: string;
  questions: QuizQuestion[];
};

const GRADES = [6, 7, 8, 9, 10, 11, 12, 13] as const;
const MEDIA = ['Sinhala', 'English', 'Tamil'] as const;
const DEFAULT_QUESTION_COUNT = 10;

export default function TeacherMathematicsQuizzesPage() {
  const router = useRouter();
  const [selectedGrade, setSelectedGrade] = useState<number>(8);
  const [selectedMedium, setSelectedMedium] = useState<(typeof MEDIA)[number]>('English');
  const [teacherPrompt, setTeacherPrompt] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(DEFAULT_QUESTION_COUNT);
  const [draftQuiz, setDraftQuiz] = useState<DraftQuiz | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = selectedGrade > 0 && selectedMedium.length > 0 && teacherPrompt.trim().length >= 15 && !isGenerating;

  const draftQuestionCount = useMemo(() => draftQuiz?.questions.length ?? 0, [draftQuiz]);

  const updateQuestion = (index: number, field: 'question' | 'explanation', value: string) => {
    if (!draftQuiz) return;
    const questions = [...draftQuiz.questions];
    questions[index] = { ...questions[index], [field]: value };
    setDraftQuiz({ ...draftQuiz, questions });
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    if (!draftQuiz) return;
    const questions = [...draftQuiz.questions];
    const options = [...questions[questionIndex].options];
    options[optionIndex] = value;
    questions[questionIndex] = { ...questions[questionIndex], options };
    setDraftQuiz({ ...draftQuiz, questions });
  };

  const removeQuestion = (questionIndex: number) => {
    if (!draftQuiz) return;
    const questions = draftQuiz.questions.filter((_, index) => index !== questionIndex);
    if (questions.length === 0) {
      setDraftQuiz({ ...draftQuiz, questions: [] });
      return;
    }
    setDraftQuiz({ ...draftQuiz, questions });
  };

  const handleGenerateQuiz = async () => {
    if (!selectedGrade || !selectedMedium || teacherPrompt.trim().length < 15) {
      setError('Grade, Medium, and teacher instructions are required. The instructions must be at least 15 characters long.');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      const response = await fetchWithAuth<{ quiz?: { id?: string; title?: string; questions?: QuizQuestion[] } }>('/api/quiz-generation/generate-from-prompt', {
        method: 'POST',
        body: JSON.stringify({
          grade: selectedGrade,
          medium: selectedMedium,
          teacherPrompt: teacherPrompt.trim(),
          questionCount,
        }),
      });

      const generatedQuiz = response.quiz ?? null;
      if (!generatedQuiz?.questions?.length) {
        throw new Error('Groq did not return any generated quiz questions.');
      }

      setDraftQuiz({
        id: generatedQuiz.id,
        title: generatedQuiz.title ?? `Grade ${selectedGrade} ${selectedMedium} Quiz`,
        questions: generatedQuiz.questions,
      });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to generate the Mathematics quiz.';
      setError(message);
      setDraftQuiz(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!draftQuiz?.id) {
      setError('Create a draft quiz before saving it.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await fetchWithAuth(`/api/teacher/quizzes/${draftQuiz.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          grade: selectedGrade,
          medium: selectedMedium,
          teacherPrompt: teacherPrompt.trim(),
          title: draftQuiz.title,
          questions: draftQuiz.questions,
          status: 'pending',
        }),
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save the draft quiz.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!draftQuiz?.id) {
      setError('Create a draft quiz before publishing it.');
      return;
    }

    try {
      setIsPublishing(true);
      setError(null);
      await fetchWithAuth(`/api/teacher/quizzes/${draftQuiz.id}/publish`, {
        method: 'POST',
      });
      setDraftQuiz(null);
      router.push('/teacher/dashboard');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to publish the quiz.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!draftQuiz?.id) {
      setError('There is no quiz to delete.');
      return;
    }

    try {
      setError(null);
      await fetchWithAuth(`/api/teacher/quizzes/${draftQuiz.id}`, {
        method: 'DELETE',
      });
      setDraftQuiz(null);
      router.push('/teacher/dashboard');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to delete the quiz.');
    }
  };

  const handleRegenerate = async () => {
    await handleGenerateQuiz();
  };

  return (
    <ProtectedRoute allowedRoles={['teacher']}>
      <main className="min-h-screen bg-slate-950 p-6 text-slate-50">
        <div className="mx-auto max-w-6xl space-y-6">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Teaching</p>
            <h1 className="mt-2 text-3xl font-bold">Mathematics Quiz Builder</h1>
          </header>

          {error ? <div className="rounded-xl border border-red-600 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-300">
                Grade
                <select
                  value={selectedGrade}
                  onChange={(event) => setSelectedGrade(Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  {GRADES.map((grade) => (
                    <option key={grade} value={grade}>Grade {grade}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-300">
                Medium
                <select
                  value={selectedMedium}
                  onChange={(event) => setSelectedMedium(event.target.value as (typeof MEDIA)[number])}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  {MEDIA.map((medium) => (
                    <option key={medium} value={medium}>{medium}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4">
              <label className="block text-sm text-slate-300">
                Quiz topic or teacher instructions
                <textarea
                  value={teacherPrompt}
                  onChange={(event) => setTeacherPrompt(event.target.value)}
                  placeholder="Example: Create a basic Grade 8 Mathematics quiz about fractions, including addition, subtraction, comparing fractions, and simple word problems."
                  className="mt-2 min-h-[120px] w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  required
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-300">
                Question count
                <select
                  value={questionCount}
                  onChange={(event) => setQuestionCount(Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  {[5, 10, 15, 20].map((count) => (
                    <option key={count} value={count}>{count}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <div className="text-sm text-slate-300">
                {teacherPrompt.trim().length >= 15 ? 'Prompt ready for Groq generation.' : 'Prompt must be at least 15 characters.'}
              </div>
              <button
                type="button"
                onClick={() => void handleGenerateQuiz()}
                disabled={!canGenerate}
                className="rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating ? 'Generating quiz with Groq…' : 'Generate with Groq'}
              </button>
            </div>
          </section>

          {draftQuiz ? (
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <input
                  value={draftQuiz.title}
                  onChange={(event) => setDraftQuiz({ ...draftQuiz, title: event.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xl font-semibold text-white md:max-w-xl"
                />
                <div className="text-sm text-slate-400">{draftQuestionCount} questions</div>
              </div>

              <div className="space-y-5">
                {draftQuiz.questions.map((question, questionIndex) => (
                  <article key={question.id || `${question.question}-${questionIndex}`} className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Question {questionIndex + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeQuestion(questionIndex)}
                        className="rounded-lg border border-red-700 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-200"
                      >
                        Delete
                      </button>
                    </div>

                    <label className="block text-sm text-slate-300">
                      Question text
                      <textarea
                        value={question.question}
                        onChange={(event) => updateQuestion(questionIndex, 'question', event.target.value)}
                        className="mt-2 min-h-[80px] w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                      />
                    </label>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {question.options.map((option, optionIndex) => (
                        <label key={`${question.id}-${optionIndex}`} className="block text-sm text-slate-300">
                          Option {optionIndex + 1}
                          <input
                            value={option}
                            onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                          />
                        </label>
                      ))}
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm text-slate-300">
                        Correct answer
                        <select
                          value={question.correctAnswerIndex}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            const questions = [...draftQuiz.questions];
                            questions[questionIndex] = { ...questions[questionIndex], correctAnswerIndex: next };
                            setDraftQuiz({ ...draftQuiz, questions });
                          }}
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white md:max-w-xs"
                        >
                          {question.options.map((_, index) => (
                            <option key={`${question.id}-answer-${index}`} value={index}>Option {index + 1}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="mt-4 block text-sm text-slate-300">
                      Explanation
                      <textarea
                        value={question.explanation}
                        onChange={(event) => updateQuestion(questionIndex, 'explanation', event.target.value)}
                        className="mt-2 min-h-[80px] w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                      />
                    </label>
                  </article>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
                <button
                  type="button"
                  onClick={() => void handleRegenerate()}
                  className="rounded-xl border border-cyan-500 px-4 py-2 font-semibold text-cyan-300"
                >
                  Regenerate full draft
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveDraft()}
                  disabled={isSaving}
                  className="rounded-xl bg-slate-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Saving Draft…' : 'Save Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteQuiz()}
                  className="rounded-xl border border-red-600 bg-red-500/10 px-4 py-2 font-semibold text-red-200"
                >
                  Delete Quiz
                </button>
                <button
                  type="button"
                  onClick={() => void handlePublish()}
                  disabled={isPublishing}
                  className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPublishing ? 'Publishing…' : 'Publish Quiz'}
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </ProtectedRoute>
  );
}
