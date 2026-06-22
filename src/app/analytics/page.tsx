'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useDb } from '@/context/DbContext';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Award,
  Users,
  RefreshCw,
  Info,
  Layers,
  Heart
} from 'lucide-react';

interface Episode {
  id: number;
  season: number;
  title: string;
  rating: number;
  votes: number;
  viewership: number;
  director: string;
  writers: string;
}

export default function AnalyticsDashboard() {
  const { dbType, getHeaders, connectionStatus } = useDb();
  
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Set mounted state to prevent hydration mismatches with Recharts
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchEpisodes = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getHeaders();
      const res = await fetch('/api/episodes?limit=5000', { headers });
      const data = await res.json();
      if (data.success) {
        setEpisodes(data.data || []);
      }
    } catch (e) {
      console.error('Failed to load episodes for charts:', e);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchEpisodes();
  }, [fetchEpisodes, dbType, connectionStatus]);

  // Aggregate Data Helpers
  const getSeasonData = () => {
    const seasonsMap: Record<number, { season: string; totalRating: number; totalViewership: number; count: number }> = {};
    
    episodes.forEach((ep) => {
      const s = ep.season;
      if (!seasonsMap[s]) {
        seasonsMap[s] = { season: `S${s}`, totalRating: 0, totalViewership: 0, count: 0 };
      }
      seasonsMap[s].totalRating += ep.rating;
      seasonsMap[s].totalViewership += ep.viewership;
      seasonsMap[s].count += 1;
    });

    return Object.values(seasonsMap).map((item) => ({
      season: item.season,
      avgRating: Number((item.totalRating / item.count).toFixed(2)),
      totalViewership: Number(item.totalViewership.toFixed(2)),
    })).sort((a, b) => a.season.localeCompare(b.season));
  };

  const getTopRatedEpisodes = () => {
    return [...episodes]
      .sort((a, b) => b.rating - a.rating || b.votes - a.votes)
      .slice(0, 10)
      .map((item) => ({
        title: item.title.length > 20 ? item.title.substring(0, 20) + '...' : item.title,
        rating: item.rating,
        viewership: item.viewership,
      }));
  };

  const getDirectorData = () => {
    const map: Record<string, { name: string; totalRating: number; count: number }> = {};
    episodes.forEach((ep) => {
      if (ep.director) {
        ep.director.split(',').forEach((d) => {
          const name = d.trim();
          if (!name) return;
          if (!map[name]) {
            map[name] = { name, totalRating: 0, count: 0 };
          }
          map[name].totalRating += ep.rating;
          map[name].count += 1;
        });
      }
    });

    // Top 8 directors by episode count
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((item) => ({
        name: item.name,
        episodes: item.count,
        avgRating: Number((item.totalRating / item.count).toFixed(2)),
      }));
  };

  const getWriterData = () => {
    const map: Record<string, { name: string; count: number }> = {};
    episodes.forEach((ep) => {
      if (ep.writers) {
        // split by pipe or 'and'
        ep.writers.split(/\||and/g).forEach((w) => {
          const name = w.trim();
          if (!name) return;
          if (!map[name]) {
            map[name] = { name, count: 0 };
          }
          map[name].count += 1;
        });
      }
    });

    // Top 8 writers by episode count
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((item) => ({
        name: item.name,
        episodes: item.count,
      }));
  };

  if (!mounted) return null;

  const seasonData = getSeasonData();
  const topEpisodes = getTopRatedEpisodes();
  const directorData = getDirectorData();
  const writerData = getWriterData();

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Series Analytics Room</h1>
        <p className="text-sm text-muted-foreground">Aggregated ratings, viewership spikes, and creative performance reports across seasons.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-36 space-y-3 bg-card border border-border rounded-xl shadow-sm">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground font-medium">Gathering database data and rendering charts...</span>
        </div>
      ) : episodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-card border border-border rounded-xl shadow-sm">
          <BarChart3 className="h-12 w-12 text-muted-foreground/30" />
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">No Analytics Available</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Please upload and migrate the dataset spreadsheet first to build these visual reports.
            </p>
          </div>
          <Link
            href="/import"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-all"
          >
            Start Data Import
          </Link>
        </div>
      ) : (
        /* Visual Charts Layout */
        <div className="space-y-8">
          
          {/* Row 1: Season Performance (Average Rating Line Chart & Viewership Bar Chart) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Average Rating by Season */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col h-[380px]">
              <div className="mb-4">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" /> Average Ratings per Season
                </h3>
                <p className="text-[10px] text-muted-foreground">Trends showing the quality index across the 9 seasons.</p>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={seasonData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="season" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} stroke="var(--border)" />
                    <YAxis domain={[6.5, 9.5]} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} stroke="var(--border)" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                      labelClassName="font-bold text-[11px]"
                      itemStyle={{ fontSize: 11 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgRating"
                      name="Avg Rating"
                      stroke="var(--primary)"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 1 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Viewership by Season */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col h-[380px]">
              <div className="mb-4">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" /> Total Viewership per Season
                </h3>
                <p className="text-[10px] text-muted-foreground">Aggregate viewership (in Millions) across the seasons.</p>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seasonData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="season" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} stroke="var(--border)" />
                    <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} stroke="var(--border)" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                      labelClassName="font-bold text-[11px]"
                      itemStyle={{ fontSize: 11 }}
                    />
                    <Bar
                      dataKey="totalViewership"
                      name="Viewers (M)"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 2: Top 10 Rated Episodes (Horizontal Bar Chart) */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col h-[400px]">
            <div className="mb-4">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-500 fill-rose-500" /> Top 10 Highest-Rated Episodes
              </h3>
              <p className="text-[10px] text-muted-foreground">Ranked by user review scores in the database.</p>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topEpisodes}
                  layout="vertical"
                  margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" domain={[0, 10]} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} stroke="var(--border)" />
                  <YAxis
                    dataKey="title"
                    type="category"
                    tick={{ fill: 'var(--foreground)', fontSize: 10, fontWeight: 'bold' }}
                    stroke="var(--border)"
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    labelClassName="font-bold text-[11px]"
                    itemStyle={{ fontSize: 11 }}
                  />
                  <Bar
                    dataKey="rating"
                    name="Rating"
                    fill="#f59e0b"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 3: Creative Team Performance (Director Avg Rating & Writer Ingestion Share) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Director Performance */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col h-[380px]">
              <div className="mb-4">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-cyan-500" /> Director Performance Index
                </h3>
                <p className="text-[10px] text-muted-foreground">Top 8 directors by episode count, mapped to average rating.</p>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={directorData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 8 }} stroke="var(--border)" />
                    <YAxis domain={[7.0, 9.5]} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} stroke="var(--border)" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                      labelClassName="font-bold text-[11px]"
                      itemStyle={{ fontSize: 11 }}
                    />
                    <Bar
                      dataKey="avgRating"
                      name="Avg Rating"
                      fill="#06b6d4"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Writer Ingestion Share */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col h-[380px]">
              <div className="mb-4">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-500" /> Writer Contribution Share
                </h3>
                <p className="text-[10px] text-muted-foreground">Top 8 writers by count of episodes written.</p>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={writerData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 8 }} stroke="var(--border)" />
                    <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} stroke="var(--border)" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                      labelClassName="font-bold text-[11px]"
                      itemStyle={{ fontSize: 11 }}
                    />
                    <Bar
                      dataKey="episodes"
                      name="Episodes Written"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground flex gap-2.5 items-start">
            <Info className="h-4.5 w-4.5 text-primary flex-shrink-0 mt-0.5" />
            <p>
              Creative performance filters out guest star lists, split-listing writers based on standard delimiters. Averaging computations include only successfully migrated database rows.
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
