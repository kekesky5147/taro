"use client";

import { motion } from "framer-motion";
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

export function PremiumReadingContent({
  text,
  variant = "default",
  animateIn = true,
}: PremiumReadingContentProps) {
  const sections = parsePremiumSections(text);
  const isSage = variant === "sage";
  const ease = isSage ? mysticEase : cinematicEase;
  const gold = isSage ? mysticTheme.gold : easternTheme.gold;
  const goldDim = isSage ? mysticTheme.goldDim : easternTheme.goldDim;
  const bodyColor = isSage ? "rgba(235, 228, 210, 0.82)" : easternTheme.offWhiteMuted;

  return (
    <div
      className="space-y-3 p-4 sm:p-6"
      style={isSage ? { fontFamily: sageFont } : undefined}
    >
      {sections.map((section, i) => (
        <motion.div
          key={section.id}
          initial={isSage && !animateIn ? { opacity: 0, y: 20 } : false}
          animate={
            !isSage || animateIn
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 20 }
          }
          transition={{
            duration: 0.55,
            ease,
            delay: isSage && animateIn ? 0.45 + i * 0.1 : i * 0.1,
          }}
          className="rounded-xl px-4 py-4 sm:px-5 sm:py-5"
          style={{
            background: isSage
              ? "rgba(212, 175, 55, 0.04)"
              : "oklch(0.09 0.02 48 / 0.6)",
            border: `1px solid ${isSage ? "rgba(212, 175, 55, 0.2)" : goldDim}`,
            boxShadow: isSage
              ? "inset 0 1px 0 rgba(255, 240, 210, 0.06)"
              : `inset 0 1px 0 ${easternTheme.pearl}`,
          }}
        >
          <h4
            className="mb-3 text-[10px] font-medium uppercase tracking-[0.36em]"
            style={{ color: gold, fontFamily: isSage ? sageFont : undefined }}
          >
            {section.title}
          </h4>
          <p
            className={`whitespace-pre-line leading-[1.85] ${isSage ? "text-[15px] sm:text-base" : "font-serif text-sm"}`}
            style={{
              color: bodyColor,
              fontFamily: isSage ? sageFont : undefined,
            }}
          >
            {section.body}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
