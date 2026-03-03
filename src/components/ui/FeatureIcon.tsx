"use client";

import {
  Flag,
  Map,
  Layers,
  BookOpen,
  TrendingUp,
  Mountain,
  Home,
  Settings,
  Menu,
  X,
  Check,
  Lightbulb,
  Flame,
  CheckCircle,
  Sparkles,
  Calculator,
  PenLine,
  type LucideIcon,
} from "lucide-react";

export type FeatureIconName =
  | "practice"      // Practice Tests
  | "study-plan"    // Study Plans
  | "flashcards"   // Flashcards
  | "lessons"      // Micro-Lessons
  | "progress"     // Progress
  | "dashboard"    // Base camp / Home
  | "settings"
  | "menu"
  | "close"
  | "check"
  | "incorrect"
  | "lightbulb"
  | "flame"
  | "goal-achieved"
  | "sparkles"
  | "math"         // section: math
  | "reading"      // section: reading
  | "writing"     // section: writing
  | "mountain";   // generic mountain / altitude

const iconMap: Record<FeatureIconName, LucideIcon> = {
  practice: Flag,
  "study-plan": Map,
  flashcards: Layers,
  lessons: BookOpen,
  progress: TrendingUp,
  dashboard: Home,
  settings: Settings,
  menu: Menu,
  close: X,
  check: Check,
  incorrect: X,
  lightbulb: Lightbulb,
  flame: Flame,
  "goal-achieved": CheckCircle,
  sparkles: Sparkles,
  math: Calculator,
  reading: BookOpen,
  writing: PenLine,
  mountain: Mountain,
};

interface FeatureIconProps {
  name: FeatureIconName;
  className?: string;
  size?: number;
}

export default function FeatureIcon({ name, className = "", size = 20 }: FeatureIconProps) {
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon className={className} size={size} strokeWidth={2} aria-hidden />;
}

export { iconMap };
export function getFeatureIcon(name: FeatureIconName): LucideIcon {
  return iconMap[name];
}
