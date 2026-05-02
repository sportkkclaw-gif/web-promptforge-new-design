'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface TeamMember {
  userId: string;
  username: string;
  role: string;
  quotaUsed: number;
  quotaAllocated: number;
}

interface TeamData {
  id: string;
  name: string;
  slug: string;
  plan: string;
  totalQuota: number;
  usedQuota: number;
  members: TeamMember[];
}

export default function TeamPage() {
  const { slug } = useParams<{ slug: string }>();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTeam() {
      try {
        const token = localStorage.getItem('session_token');
        const res = await fetch(`/api/teams/${slug}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (json.ok) {
          setTeam(json.data);
        } else {
          setError('Team not found or access denied');
        }
      } catch {
        setError('Failed to load team');
      } finally {
        setLoading(false);
      }
    }
    if (slug) loadTeam();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading team…</div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Team Not Found</h1>
          <p className="text-muted-foreground mb-4">{error || 'This team does not exist or you do not have access.'}</p>
          <Link href="/dashboard" className="text-primary hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const remainingQuota = team.totalQuota - team.usedQuota;
  const usagePercent = team.totalQuota > 0 ? Math.round((team.usedQuota / team.totalQuota) * 100) : 0;

  return (
    <div className="pf-lux-page">
      <nav className="pf-lux-nav px-6 py-4 flex items-center justify-between">
        <Link href="/" className="pf-lux-brand font-bold text-xl">PromptForge Studio</Link>
        <div className="flex gap-4">
          <Link href="/browse" className="pf-lux-link text-sm">Explore</Link>
          <Link href="/marketplace" className="pf-lux-link text-sm">Marketplace</Link>
          <Link href="/dashboard" className="pf-lux-link text-sm">Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{team.name}</h1>
            <p className="text-muted-foreground text-sm">@{team.slug} · {team.plan} plan</p>
          </div>
          <Link href="/dashboard/team" className="text-sm text-primary hover:underline">Manage Team</Link>
        </div>

        {/* Quota Overview */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="border rounded-xl p-6">
            <div className="text-3xl font-bold text-primary">{team.totalQuota.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground mt-1">Total Quota (monthly)</div>
          </div>
          <div className="border rounded-xl p-6">
            <div className="text-3xl font-bold">{remainingQuota.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground mt-1">Remaining</div>
          </div>
          <div className="border rounded-xl p-6">
            <div className="text-3xl font-bold">{usagePercent}%</div>
            <div className="text-sm text-muted-foreground mt-1">Usage This Period</div>
          </div>
        </div>

        {/* Usage Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Quota Usage</span>
            <span className="text-muted-foreground">{team.usedQuota} / {team.totalQuota}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className="bg-primary rounded-full h-3 transition-all"
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Members Table */}
        <div className="border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b bg-muted/30">
            <h2 className="font-semibold">Team Members ({team.members.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left px-6 py-3 text-muted-foreground font-medium">Username</th>
                <th className="text-left px-6 py-3 text-muted-foreground font-medium">Role</th>
                <th className="text-right px-6 py-3 text-muted-foreground font-medium">Used</th>
                <th className="text-right px-6 py-3 text-muted-foreground font-medium">Allocated</th>
              </tr>
            </thead>
            <tbody>
              {team.members.map((member) => (
                <tr key={member.userId} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-6 py-3">@{member.username}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-0.5 bg-secondary text-xs rounded">{member.role}</span>
                  </td>
                  <td className="px-6 py-3 text-right">{member.quotaUsed.toLocaleString()}</td>
                  <td className="px-6 py-3 text-right">{member.quotaAllocated.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
