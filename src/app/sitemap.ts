import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const routes = [
    "/",
    "/lessons",
    "/flashcards",
    "/practice",
    "/study-plan",
    "/sat-algebra-practice-questions",
    "/sat-geometry-practice-questions",
    "/sat-linear-equations-practice",
    "/sat-quadratics-practice",
    "/digital-sat-math-practice-test",
    "/hard-sat-math-questions",
    "/support",
    "/privacy",
    "/terms",
    "/login",
    "/signup",
  ];

  return routes.map((route) => ({
    url: absoluteUrl(route),
    lastModified,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.7,
  }));
}

