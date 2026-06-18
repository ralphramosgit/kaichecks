import type { Metadata } from "next";

import { ExploreShell } from "@/components/explore/ExploreShell";

export const metadata: Metadata = {
  title: "Data Explorer | Kaichecks",
  description:
    "Explore the cleaned datasets, master training data, and ML model findings behind the Kaichecks beach water safety simulator.",
};

export default function ExplorePage() {
  return <ExploreShell />;
}
