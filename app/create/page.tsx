'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_GENERATOR_PATH = '/generator/default-template';

export default function CreatePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(DEFAULT_GENERATOR_PATH);
  }, [router]);

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#05030f] px-6 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute -left-44 top-[-260px] h-[660px] w-[660px] rounded-full bg-[radial-gradient(circle,_rgba(34,211,238,0.34)_0%,_rgba(34,211,238,0.08)_42%,_transparent_72%)] blur-3xl" />
        <div className="absolute right-[-240px] top-10 h-[780px] w-[780px] rounded-full bg-[radial-gradient(circle,_rgba(168,85,247,0.42)_0%,_rgba(99,102,241,0.12)_44%,_transparent_74%)] blur-3xl" />
      </div>
      <section className="relative z-10 max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 text-center shadow-[0_0_80px_rgba(34,211,238,0.14)] backdrop-blur-xl">
        <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/25 bg-cyan-300/10 text-2xl shadow-[0_0_35px_rgba(34,211,238,0.25)]">✦</div>
        <p className="text-sm uppercase tracking-[0.32em] text-cyan-100/70">Opening Prompt Generator</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Create workspace is loading.</h1>
        <p className="mt-4 text-slate-300">如果瀏覽器沒有自動前往生成工作台，請使用下方按鈕進入預設範本。</p>
        <Link href={DEFAULT_GENERATOR_PATH} className="mt-6 inline-flex rounded-full bg-white px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-100">
          前往 Prompt Generator
        </Link>
      </section>
    </main>
  );
}
