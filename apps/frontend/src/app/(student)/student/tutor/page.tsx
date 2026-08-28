'use client';

import { FormEvent, useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api/client';
import { ProtectedRoute } from '@/lib/auth/route-guard';
import { useAuth } from '@/lib/auth/auth-context';
import { useLocale } from '@/lib/i18n/locale';

type TutorResponse = { answer: string; steps: string[]; practiceQuestion: string | null };
type LiveTeacherResponse = { conversationUrl: string; conversationId: string | null; status: string };
type TutorOutputMedium = 'Sinhala' | 'Tamil' | 'English' | 'Singlish';

type SpeechRecognitionResult = { transcript: string };
type SpeechRecognitionEventLike = { results: ArrayLike<ArrayLike<SpeechRecognitionResult>> };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export default function StudentTutorPage() {
  const { profile, grade, medium } = useAuth();
  const { t } = useLocale();
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [outputMedium, setOutputMedium] = useState<TutorOutputMedium>(() => profile?.medium ?? medium ?? 'English');
  const [response, setResponse] = useState<TutorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [liveTeacher, setLiveTeacher] = useState<LiveTeacherResponse | null>(null);
  const [startingLiveTeacher, setStartingLiveTeacher] = useState(false);

  const studentMedium = profile?.medium ?? medium ?? 'English';
  const speechLanguage = studentMedium === 'Sinhala' ? 'si-LK' : studentMedium === 'Tamil' ? 'ta-LK' : 'en-US';

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const speakResponse = () => {
    if (liveTeacher || !response || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance([response.answer, ...response.steps].join('. '));
    speech.lang = speechLanguage;
    speech.rate = 0.92;
    speech.onstart = () => setSpeaking(true);
    speech.onend = () => setSpeaking(false);
    speech.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(speech);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  const listenForQuestion = () => {
    const speechWindow = window as Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError(t('voiceUnavailable'));
      return;
    }
    const recognition = new Recognition();
    recognition.lang = speechLanguage;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => setQuestion(event.results[0][0].transcript);
    recognition.onend = () => setListening(false);
    setError(null);
    setListening(true);
    recognition.start();
  };

  const askTutor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setError(null);
    try {
      await startLiveTeacher(question);
      setResponse(await fetchWithAuth<TutorResponse>('/api/student/tutor/answer', {
        method: 'POST',
        body: JSON.stringify({
          question: question.trim(),
          topic: topic.trim(),
          grade: profile?.grade ?? grade ?? 6,
          medium: profile?.medium ?? medium ?? 'English',
          outputMedium,
        }),
      }));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('tutorError'));
    } finally {
      setAsking(false);
    }
  };

  const startLiveTeacher = async (prompt = question) => {
    setStartingLiveTeacher(true);
    setError(null);
    try {
      setLiveTeacher(await fetchWithAuth<LiveTeacherResponse>('/api/student/tutor/live/start', {
        method: 'POST',
        body: JSON.stringify({
          topic: topic.trim(),
          question: prompt.trim(),
          grade: profile?.grade ?? grade ?? 6,
          medium: studentMedium,
        }),
      }));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('liveTeacherSetup'));
    } finally {
      setStartingLiveTeacher(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <main className="space-y-6">
        <header className="rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/15 via-slate-900 to-slate-950 p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">{t('mathsTutor')}</p>
          <h1 className="mt-3 text-3xl font-black text-white">{t('mathsTutor')}</h1>
          <p className="mt-2 max-w-2xl text-slate-300">{t('tutorSubtitle')}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void startLiveTeacher()} disabled={startingLiveTeacher || Boolean(liveTeacher) || !question.trim()} className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60">
              {startingLiveTeacher ? t('liveTeacherStarting') : t('startLiveTeacher')}
            </button>
            {liveTeacher ? <button type="button" onClick={() => setLiveTeacher(null)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300">{t('stopLiveTeacher')}</button> : null}
          </div>
        </header>

        {liveTeacher ? <section className="overflow-hidden rounded-2xl border border-cyan-400/40 bg-slate-900 shadow-xl shadow-cyan-950/20">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-3"><div><p className="text-sm font-bold text-white">{t('liveTeacher')}</p><p className="text-xs text-slate-400">{t('liveTeacherReady')} · {studentMedium}</p></div><span className="flex items-center gap-2 text-xs font-semibold text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Live</span></div>
          <iframe title={t('liveTeacher')} src={liveTeacher.conversationUrl} allow="camera; microphone; autoplay; display-capture; fullscreen" className="h-[min(70vh,720px)] w-full border-0 bg-black" />
        </section> : null}

        <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <form onSubmit={askTutor} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-slate-950/20">
            <div className="mb-5 flex items-center justify-between gap-3 text-sm text-slate-400">
              <span>{t('grade')} {profile?.grade ?? grade ?? 6}</span>
              <span>{studentMedium}</span>
            </div>
            <label className="block text-sm font-medium text-slate-200">
              Response language
              <select value={outputMedium} onChange={(event) => setOutputMedium(event.target.value as TutorOutputMedium)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20">
                {(['Sinhala', 'Tamil', 'English', 'Singlish'] as const).map((language) => <option key={language} value={language}>{language}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-200">
              {t('tutorTopic')}
              <input value={topic} onChange={(event) => setTopic(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20" />
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-200">
              {t('tutorQuestion')}
              <div className="relative mt-2">
                <textarea required value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={t('tutorQuestionPlaceholder')} className="min-h-40 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 pr-14 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20" />
                <button type="button" onClick={listenForQuestion} disabled={asking || listening} aria-label={t('voiceInput')} title={t('voiceInput')} className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-500/10 text-lg text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50">{listening ? '●' : '🎙'}</button>
              </div>
            </label>
            {error ? <p role="alert" className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
            <button type="submit" disabled={asking || !question.trim()} className="mt-5 w-full rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60">
              {asking ? t('tutorThinking') : t('tutorAsk')}
            </button>
          </form>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-slate-950/20">
            {!response ? <div className="flex min-h-72 items-center justify-center text-center text-slate-500"><p>{t('tutorEmpty')}</p></div> : (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">{t('tutorAnswer')}</p><p className="mt-3 whitespace-pre-wrap leading-7 text-slate-200">{response.answer}</p></div>{!liveTeacher ? <button type="button" onClick={speaking ? stopSpeaking : speakResponse} className="shrink-0 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20">{speaking ? t('stopSpeaking') : t('speakAnswer')}</button> : null}</div>
                {response.steps.length > 0 ? <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">{t('tutorSteps')}</p><ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-300">{response.steps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol></div> : null}
                {response.practiceQuestion ? <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4"><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">{t('tutorPractice')}</p><p className="mt-2 text-slate-200">{response.practiceQuestion}</p></div> : null}
              </div>
            )}
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
