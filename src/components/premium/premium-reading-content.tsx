"use client";

import { motion, useReducedMotion } from "framer-motion";
import { mysticEase, mysticTheme } from "@/components/mystic-path/mystic-theme";
import { cinematicEase, easternTheme } from "./premium-eastern-theme";

const sageFont = "var(--font-playfair), 'Noto Serif KR', Georgia, 'Times New Roman', serif";

function parsePremiumSections(text: string) {
  const lines = text.trim().split("\n");
  const sections: { id: string; title: string; body: string }[] = [];
  let current: { title: string; lines: string[] } | null = null;

  for (const line of lines) {
    const headerMatch = line.match(/^#{1,4}\s+(.+)/);
    if (headerMatch) {
      if (current && current.lines.join("").trim()) {
        sections.push({
          id: current.title.toLowerCase().replace(/\s+/g, "-"),
          title: current.title,
          body: current.lines.join("\n").trim(),
        });
      }
      current = { title: headerMatch[1].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }

  if (current && current.lines.join("").trim()) {
    sections.push({
      id: current.title.toLowerCase().replace(/\s+/g, "-"),
      title: current.title,
      body: current.lines.join("\n").trim(),
    });
  }

  if (sections.length === 0) {
    return [{ id: "premium", title: "The Sage's Perspective", body: text.trim() }];
  }

  return sections;
}

type PremiumReadingContentProps = {
  text: string;
  variant?: "default" | "sage";
  /** Sage 패널 스크롤/등장 후에만 섹션 stagger 재생 */
  animateIn?: boolean;
};

function SageSectionBlock({
  section,
  visible,
  index,
}: {
  section: { id: string; title: string; body: string };
  visible: boolean;
  index: number;
}) {
  return (
    <div
      className="rounded-xl px-4 py-4 transition-[opacity,transform] duration-500 ease-out sm:px-5 sm:py-5"
      style={{
        fontFamily: sageFont,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transitionDelay: visible ? `${120 + index * 60}ms` : "0ms",
        background: "rgba(212, 175, 55, 0.04)",
        border: "1px solid rgba(212, 175, 55, 0.2)",
        boxShadow: "inset 0 1px 0 rgba(255, 240, 210, 0.06)",
      }}
    >
      <h4
        className="mb-3 text-[10px] font-medium uppercase tracking-[0.36em]"
        style={{ color: mysticTheme.gold }}
      >
        {section.title}
      </h4>
      <p
        className="whitespace-pre-line text-[15px] leading-[1.85] sm:text-base"
        style={{ color: "rgba(235, 228, 210, 0.82)" }}
      >
        {section.body}
      </p>
    </div>
  );
}

export function PremiumReadingContent({
  text,
  variant = "default",
  animateIn = true,
}: PremiumReadingContentProps) {
  const sections = parsePremiumSections(text);
  const isSage = variant === "sage";
  const reduceMotion = useReducedMotion();
  const show = animateIn || reduceMotion === true;
  const ease = isSage ? mysticEase : cinematicEase;
  const gold = isSage ? mysticTheme.gold : easternTheme.gold;
  const goldDim = isSage ? mysticTheme.goldDim : easternTheme.goldDim;
  const bodyColor = isSage ? "rgba(235, 228, 210, 0.82)" : easternTheme.offWhiteMuted;

  if (isSage) {
    return (
      <div
        className="space-y-3 p-4 sm:p-6"
        style={{ fontFamily: sageFont, contain: "layout style" }}
      >
        {sections.map((section, i) => (
          <SageSectionBlock
            key={section.id}
            section={section}
            visible={show}
            index={i}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 sm:p-6">
      {sections.map((section, i) => (
        <motion.div
          key={section.id}
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease, delay: i * 0.1 }}
          className="rounded-xl px-4 py-4 sm:px-5 sm:py-5"
          style={{
            background: "oklch(0.09 0.02 48 / 0.6)",
            border: `1px solid ${goldDim}`,
            boxShadow: `inset 0 1px 0 ${easternTheme.pearl}`,
          }}
        >
          <h4
            className="mb-3 text-[10px] font-medium uppercase tracking-[0.36em]"
            style={{ color: gold }}
          >
            {section.title}
          </h4>
          <p
            className="whitespace-pre-line font-serif text-sm leading-[1.85]"
            style={{ color: bodyColor }}
          >
            {section.body}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
