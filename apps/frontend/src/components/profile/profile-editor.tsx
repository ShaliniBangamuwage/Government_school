'use client';

import { useEffect, useState } from 'react';
import type { AppUser, UserRole } from '@edunexa/shared-types';
import { useLocale } from '@/lib/i18n/locale';

type ProfileUpdates = {
  fullName: string;
  bio: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  grade?: number;
  medium?: 'Sinhala' | 'Tamil' | 'English';
};

const MEDIUMS = ['Sinhala', 'Tamil', 'English'] as const;

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unable to read this image.'));
    reader.readAsDataURL(file);
  });
}

async function prepareImage(file: File): Promise<string> {
  const source = await readImage(file);
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Unable to load this image.'));
    image.src = source;
  });

  const maxDimension = 512;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', 0.8);
}

export function ProfileEditor({ profile, role, onSave }: { profile: AppUser | null; role: UserRole; onSave: (updates: ProfileUpdates) => Promise<void> }) {
  const { t } = useLocale();
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? '');
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(profile?.coverPhotoUrl ?? '');
  const [grade, setGrade] = useState(profile?.grade ?? 6);
  const [medium, setMedium] = useState<(typeof MEDIUMS)[number]>(profile?.medium ?? 'English');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setFullName(profile?.fullName ?? '');
    setBio(profile?.bio ?? '');
    setAvatarUrl(profile?.avatarUrl ?? '');
    setCoverPhotoUrl(profile?.coverPhotoUrl ?? '');
    setGrade(profile?.grade ?? 6);
    setMedium(profile?.medium ?? 'English');
  }, [profile]);

  const chooseImage = async (file: File | undefined, setter: (value: string) => void) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('Please choose an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage('Images must be 2 MB or smaller.');
      return;
    }
    try {
      setter(await prepareImage(file));
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load image.');
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fullName.trim()) {
      setMessage(t('fullNameRequired'));
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await onSave({ fullName: fullName.trim(), bio: bio.trim(), avatarUrl, coverPhotoUrl, ...(role === 'student' ? { grade, medium } : {}) });
      setMessage(t('profileUpdated'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update your profile.');
    } finally {
      setSaving(false);
    }
  };

  const initials = fullName.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'E';

  return (
    <form onSubmit={submit} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-slate-950/20">
      <div className="relative h-40 bg-slate-800">
        {coverPhotoUrl ? <img src={coverPhotoUrl} alt="" className="h-full w-full object-cover" /> : <div className="h-full bg-gradient-to-r from-cyan-950 via-slate-800 to-blue-950" />}
        <label className="absolute right-4 top-4 cursor-pointer rounded-lg border border-white/20 bg-slate-950/80 px-3 py-2 text-xs font-semibold text-white">
          {t('editCoverPhoto')}
          <input type="file" accept="image/*" className="sr-only" onChange={(event) => void chooseImage(event.target.files?.[0], setCoverPhotoUrl)} />
        </label>
        <div className="absolute -bottom-10 left-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-slate-900 bg-cyan-500 text-2xl font-bold text-slate-950">
          {avatarUrl ? <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" /> : initials}
        </div>
      </div>

      <div className="space-y-5 p-6 pt-14">
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400">
            {t('changeProfilePhoto')}
            <input type="file" accept="image/*" className="sr-only" onChange={(event) => void chooseImage(event.target.files?.[0], setAvatarUrl)} />
          </label>
          {avatarUrl ? <button type="button" onClick={() => setAvatarUrl('')} className="text-sm text-red-300 hover:text-red-200">{t('removePhoto')}</button> : null}
        </div>

        <div>
          <label htmlFor={`${role}-profile-name`} className="mb-1 block text-sm font-medium text-slate-200">{t('fullName')}</label>
          <input id={`${role}-profile-name`} value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400" />
        </div>

        <div>
          <label htmlFor={`${role}-profile-bio`} className="mb-1 block text-sm font-medium text-slate-200">{t('aboutYou')}</label>
          <textarea id={`${role}-profile-bio`} value={bio} onChange={(event) => setBio(event.target.value)} maxLength={240} placeholder={t('addIntroduction')} className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400" />
        </div>

        {role === 'student' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-200">{t('grade')}<select value={grade} onChange={(event) => setGrade(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white">{[6, 7, 8, 9, 10, 11, 12, 13].map((value) => <option key={value} value={value}>{t('grade')} {value}</option>)}</select></label>
            <label className="text-sm font-medium text-slate-200">{t('medium')}<select value={medium} onChange={(event) => setMedium(event.target.value as (typeof MEDIUMS)[number])} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white">{MEDIUMS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          </div>
        ) : null}

        {message ? <p role="status" className="text-sm text-slate-300">{message}</p> : null}
        <button type="submit" disabled={saving} className="rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60">{saving ? t('savingChanges') : t('saveProfile')}</button>
      </div>
    </form>
  );
}
