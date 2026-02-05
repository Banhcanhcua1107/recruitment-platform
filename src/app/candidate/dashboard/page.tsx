"use client";
import React from "react";
import { useCandidateDashboard } from "@/hooks/useCandidateDashboard";
import WelcomeHeader from "./components/WelcomeHeader";
import StatsGrid from "./components/StatsGrid";
import RecentApplications from "./components/RecentApplications";
import RecommendedJobs from "./components/RecommendedJobs";
import ProfileStrength from "./components/ProfileStrength";
import CVList from "./components/CVList";
import UpgradeBanner from "./components/UpgradeBanner";

export default function CandidateDashboard() {
  const { user, stats, recentApplications, recommendedJobs, cvs, isLoading, error } = useCandidateDashboard();

  if (error) {
     return <div className="p-10 text-center text-red-500 font-bold">Error loading dashboard: {error}</div>;
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10 space-y-12">
      
      {/* 1. HEADER */}
      <WelcomeHeader user={user} notificationCount={2} />

      {/* 2. STATS CARDS */}
      <StatsGrid stats={stats} loading={isLoading} />

      {/* 3. MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-12">
          <RecentApplications applications={recentApplications} loading={isLoading} />
          <RecommendedJobs jobs={recommendedJobs} loading={isLoading} />
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-4 space-y-8">
          <ProfileStrength profile={user} loading={isLoading} />
          <CVList cvs={cvs} loading={isLoading} />
          <UpgradeBanner />
        </div>

      </div>
    </div>
  );
}