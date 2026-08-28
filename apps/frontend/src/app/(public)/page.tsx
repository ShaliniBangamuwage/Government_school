 'use client';

import Link from 'next/link';
import { useLocale, type Locale } from '@/lib/i18n/locale';

const landingCopy: Record<Locale, {
  eyebrow: string; slogan: string; description: string; start: string; account: string; signIn: string; promise: string;
  clarity: string; clarityDetail: string; practice: string; practiceDetail: string; together: string; togetherDetail: string;
  students: string; studentsDetail: string; teachers: string; teachersDetail: string; schools: string; schoolsDetail: string;
}> = {
  en: { eyebrow: "Sri Lanka's maths learning space", slogan: 'Make every problem a possibility.', description: 'Maths ලංකා brings lessons, official textbooks, quizzes, simulators, progress insights, and playful challenges into one focused learning space.', start: 'Start learning', account: 'I have an account', signIn: 'Sign in', promise: 'One place to grow', clarity: 'Learn with clarity', clarityDetail: 'Curriculum-aligned resources for your grade and medium.', practice: 'Practise with purpose', practiceDetail: 'Quizzes, explanations, and progress signals that keep you moving.', together: 'Think together', togetherDetail: 'Interactive simulators and live maths challenges make ideas memorable.', students: 'For students', studentsDetail: 'Build confidence with resources, quizzes, progress, and brain games.', teachers: 'For teachers', teachersDetail: 'Create, review, and understand learning with practical tools.', schools: 'For schools', schoolsDetail: 'Keep content, access, and learning operations in one place.' },
  si: { eyebrow: 'ශ්‍රී ලංකාවේ ගණිත ඉගෙනුම් අවකාශය', slogan: 'සෑම ගැටලුවක්ම හැකියාවක් කරගන්න.', description: 'Maths ලංකා පාඩම්, නිල පාඩම් පොත්, ප්‍රශ්නාවලි, අනුකරණ, ප්‍රගති අවබෝධය සහ විනෝදජනක අභියෝග එක් ඉගෙනුම් අවකාශයකට ගෙන එයි.', start: 'ඉගෙනීම ආරම්භ කරන්න', account: 'මට ගිණුමක් තිබේ', signIn: 'ඇතුළු වන්න', promise: 'වර්ධනයට එකම ස්ථානයක්', clarity: 'පැහැදිලිව ඉගෙන ගන්න', clarityDetail: 'ඔබේ ශ්‍රේණියට සහ මාධ්‍යයට ගැළපෙන විෂයමාලා සම්පත්.', practice: 'අරමුණක් සහිතව පුහුණු වන්න', practiceDetail: 'ඔබව ඉදිරියට ගෙන යන ප්‍රශ්නාවලි, පැහැදිලි කිරීම් සහ ප්‍රගති සලකුණු.', together: 'එකට සිතන්න', togetherDetail: 'අන්තර්ක්‍රියාකාරී අනුකරණ සහ සජීවී ගණිත අභියෝග අදහස් මතකයේ රඳවයි.', students: 'සිසුන් සඳහා', studentsDetail: 'සම්පත්, ප්‍රශ්නාවලි, ප්‍රගතිය සහ මනස් ක්‍රීඩා සමඟ විශ්වාසය ගොඩනගන්න.', teachers: 'ගුරුවරුන් සඳහා', teachersDetail: 'ප්‍රායෝගික මෙවලම් සමඟ නිර්මාණය කරන්න, සමාලෝචනය කරන්න සහ ඉගෙනීම තේරුම් ගන්න.', schools: 'පාසල් සඳහා', schoolsDetail: 'අන්තර්ගතය, ප්‍රවේශය සහ ඉගෙනුම් මෙහෙයුම් එකම ස්ථානයක තබා ගන්න.' },
  ta: { eyebrow: 'இலங்கையின் கணிதக் கற்றல் தளம்', slogan: 'ஒவ்வொரு பிரச்சினையையும் ஒரு வாய்ப்பாக மாற்றுங்கள்.', description: 'Maths ලංකா பாடங்கள், அதிகாரப்பூர்வ பாடப்புத்தகங்கள், வினாடி வினாக்கள், செயற்கை மாதிரிகள், முன்னேற்ற நுண்ணறிவுகள் மற்றும் விளையாட்டுத்தனமான சவால்களை ஒரே கற்றல் தளத்தில் வழங்குகிறது.', start: 'கற்றலைத் தொடங்கு', account: 'எனக்கு கணக்கு உள்ளது', signIn: 'உள்நுழைக', promise: 'வளர்ச்சிக்கான ஒரே இடம்', clarity: 'தெளிவாகக் கற்றுக்கொள்ளுங்கள்', clarityDetail: 'உங்கள் தரம் மற்றும் மொழிமூலத்திற்கான பாடத்திட்ட வளங்கள்.', practice: 'நோக்கத்துடன் பயிற்சி செய்யுங்கள்', practiceDetail: 'உங்களை முன்னேற்றும் வினாடி வினாக்கள், விளக்கங்கள் மற்றும் முன்னேற்றக் குறியீடுகள்.', together: 'ஒன்றாகச் சிந்தியுங்கள்', togetherDetail: 'ஊடாடும் செயற்கை மாதிரிகள் மற்றும் நேரடி கணிதச் சவால்கள் கருத்துகளை நினைவில் பதிக்கின்றன.', students: 'மாணவர்களுக்கு', studentsDetail: 'வளங்கள், வினாடி வினாக்கள், முன்னேற்றம் மற்றும் மூளை விளையாட்டுகள் மூலம் நம்பிக்கையை வளர்க்கவும்.', teachers: 'ஆசிரியர்களுக்கு', teachersDetail: 'நடைமுறை கருவிகளுடன் உருவாக்கவும், மதிப்பாய்வு செய்யவும், கற்றலைப் புரிந்துகொள்ளவும்.', schools: 'பள்ளிகளுக்கு', schoolsDetail: 'உள்ளடக்கம், அணுகல் மற்றும் கற்றல் செயல்பாடுகளை ஒரே இடத்தில் வைத்திருங்கள்.' },
};

export default function HomePage() {
  const { locale, setLocale, t } = useLocale();
  const copy = landingCopy[locale];
  return (
    <main className="maths-symbols relative h-[100svh] overflow-hidden bg-slate-950 px-4 py-5 text-slate-50 sm:px-6 sm:py-7">
      <div aria-hidden="true" className="pointer-events-none absolute right-[8%] top-24 hidden text-7xl font-black text-cyan-500/10 lg:block">∑</div>
      <div aria-hidden="true" className="pointer-events-none absolute bottom-20 left-[6%] hidden text-6xl font-black text-violet-400/10 lg:block">π</div>
      <div aria-hidden="true" className="pointer-events-none absolute left-[3%] top-[38%] text-4xl font-black text-cyan-400/10 sm:text-5xl">÷</div>
      <div aria-hidden="true" className="pointer-events-none absolute right-[3%] top-[58%] text-4xl font-black text-violet-400/10 sm:text-5xl">≠</div>
      <div aria-hidden="true" className="pointer-events-none absolute bottom-[12%] right-[28%] hidden text-4xl font-black text-cyan-400/10 sm:block">Δ</div>
      <div aria-hidden="true" className="pointer-events-none absolute left-[28%] top-[17%] hidden text-3xl font-black text-violet-400/10 sm:block">θ</div>
      <div className="relative mx-auto max-w-6xl">
        <nav className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <img src="/profile.jpg" alt="Maths ලංකා" className="h-14 w-14 rounded-2xl object-cover ring-2 ring-cyan-400/40" />
            <div><p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-300">Maths ලංකා</p><p className="text-xs text-slate-400">Learn. Explore. Excel.</p></div>
          </div>
          <div className="flex items-center gap-3">
            <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} aria-label={t('language')} className="rounded-xl border border-slate-700 bg-slate-900 px-2 py-2 text-xs font-semibold text-white">
              <option value="en">{t('english')}</option><option value="si">{t('sinhala')}</option><option value="ta">{t('tamil')}</option>
            </select>
            <Link href="/login" className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300">{copy.signIn}</Link>
          </div>
        </nav>

        <section className="grid items-center gap-7 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:py-12">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">{copy.eyebrow}</p>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl">{copy.slogan}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">{copy.description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/register" className="rounded-xl bg-cyan-500 px-6 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-400">{copy.start}</Link>
              <Link href="/login" className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 font-bold text-slate-100 transition hover:border-cyan-400 hover:text-cyan-300">{copy.account}</Link>
            </div>
          </div>
          <div className="relative rounded-[2rem] border border-cyan-400/30 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur sm:p-6">
            <div aria-hidden="true" className="absolute -right-5 -top-8 text-6xl font-black text-cyan-400/20">x²</div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">{copy.promise}</p>
            <div className="mt-4 space-y-2.5">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3"><p className="font-bold text-white">{copy.clarity}</p><p className="mt-1 text-sm text-slate-400">{copy.clarityDetail}</p></div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3"><p className="font-bold text-white">{copy.practice}</p><p className="mt-1 text-sm text-slate-400">{copy.practiceDetail}</p></div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3"><p className="font-bold text-white">{copy.together}</p><p className="mt-1 text-sm text-slate-400">{copy.togetherDetail}</p></div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 border-t border-slate-800 pt-5 md:grid-cols-3">
          <div><p className="text-sm font-bold text-cyan-300">{copy.students}</p><p className="mt-2 text-sm leading-6 text-slate-400">{copy.studentsDetail}</p></div>
          <div><p className="text-sm font-bold text-violet-300">{copy.teachers}</p><p className="mt-2 text-sm leading-6 text-slate-400">{copy.teachersDetail}</p></div>
          <div><p className="text-sm font-bold text-emerald-300">{copy.schools}</p><p className="mt-2 text-sm leading-6 text-slate-400">{copy.schoolsDetail}</p></div>
        </section>
      </div>
    </main>
  );
}
