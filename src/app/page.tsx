"use client";

import AppLayout from "@/components/AppLayout";
import LandingPage from "@/components/pages/LandingPage";
import ExplorePage from "@/components/pages/ExplorePage";
import ConnectionFinderPage from "@/components/pages/ConnectionFinderPage";
import SavedPage from "@/components/pages/SavedPage";
import { useIntersticeStore } from "@/store/useIntersticeStore";

export default function Home() {
  const activePage = useIntersticeStore((state) => state.activePage);

  return (
    <AppLayout>
      {activePage === 'landing' && <LandingPage />}
      {activePage === 'explore' && <ExplorePage />}
      {activePage === 'connection-finder' && <ConnectionFinderPage />}
      {activePage === 'saved' && <SavedPage />}
    </AppLayout>
  );
}
