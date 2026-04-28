'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen">
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-primary">PromptForge Studio</Link>
        <div className="flex gap-4">
          <Link href="/browse" className="text-sm hover:text-primary">Explore</Link>
          <Link href="/dashboard" className="text-sm hover:text-primary">Dashboard</Link>
          <Link href={`/prompts/${id}`} className="text-sm hover:text-primary">View Prompt</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Prompt Editor</h1>
          <div className="flex gap-3">
            <select className="border rounded px-3 py-2 text-sm">
              <option value="draft">Draft</option>
              <option value="private">Private</option>
              <option value="published">Published</option>
              <option value="marketplace">Marketplace</option>
            </select>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">
              Save Version
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              className="w-full border rounded-lg px-4 py-3"
              placeholder="Enter prompt title..."
              defaultValue="My Awesome Prompt"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Prompt Content</label>
            <textarea
              className="w-full border rounded-lg px-4 py-3 h-40"
              placeholder="Enter your AI prompt..."
              defaultValue="A highly detailed portrait of a cyberpunk warrior, neon lighting, sharp focus, cinematic composition"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Negative Prompt</label>
            <textarea
              className="w-full border rounded-lg px-4 py-3 h-20"
              placeholder="What to avoid..."
              defaultValue="blurry, low quality, distorted"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Engine</label>
            <select className="w-full border rounded-lg px-4 py-3">
              <option value="stable-diffusion">Stable Diffusion</option>
              <option value="dall-e">DALL-E</option>
              <option value="midjourney">Midjourney</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Model</label>
            <select className="w-full border rounded-lg px-4 py-3">
              <option value="sd-xl">SD XL 1.0</option>
              <option value="sd-15">SD 1.5</option>
              <option value="sdxl-turbo">SDXL Turbo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Width</label>
            <select className="w-full border rounded-lg px-4 py-3">
              <option value="512">512</option>
              <option value="768">768</option>
              <option value="1024" selected>1024</option>
              <option value="2048">2048</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Height</label>
            <select className="w-full border rounded-lg px-4 py-3">
              <option value="512" selected>512</option>
              <option value="768">768</option>
              <option value="1024">1024</option>
              <option value="2048">2048</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Steps</label>
            <input type="number" className="w-full border rounded-lg px-4 py-3" defaultValue="30" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Seed</label>
            <input type="number" className="w-full border rounded-lg px-4 py-3" placeholder="Random if empty" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Guidance Scale</label>
            <input type="number" className="w-full border rounded-lg px-4 py-3" defaultValue="7.5" step="0.1" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Style</label>
            <select className="w-full border rounded-lg px-4 py-3">
              <option value="none">None</option>
              <option value="photograph">Photograph</option>
              <option value="digital-art">Digital Art</option>
              <option value="anime">Anime</option>
              <option value="cinematic">Cinematic</option>
            </select>
          </div>

          <div className="col-span-2 border rounded-xl p-4 bg-accent/20">
            <h3 className="font-semibold mb-3">Version Changelog</h3>
            <textarea
              className="w-full border rounded-lg px-4 py-3 h-20"
              placeholder="Describe what changed in this version..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
