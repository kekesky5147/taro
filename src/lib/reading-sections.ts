/**
 * 표준 무료 리딩(### Past … ### Message) 파싱·검증
 * — 클라이언트(tarot-result)와 서버(cache, ai)에서 공통 사용
 */

export type ReadingSection = {
  id: string
  title: string
  body: string
}

export const STANDARD_READING_SECTIONS = [
  "Past",
  "Present",
  "Future",
  "Message",
] as const;

const MIN_SECTION_BODY_CHARS = 24;
const MIN_PREMIUM_SECTION_BODY_CHARS = 80;
const MIN_EASTERN_TEASER_CHARS = 20;

export function parseReadingSections(reading: string): ReadingSection[] {
  const lines = reading.trim().split("\n");
  const sections: ReadingSection[] = [];
  let current: { title: string; lines: string[] } | null = null;

  for (const line of lines) {
    const headerMatch =
      line.match(/^#{1,4}\s+(.+)/) || line.match(/^\*\*(.+)\*\*\s*$/);

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
    return [{ id: "reading", title: "Your Reading", body: reading.trim() }];
  }

  return sections;
}

export function findSectionBody(
  sections: ReadingSection[],
  title: string,
): string {
  const key = title.toLowerCase();
  const hit = sections.find((s) => s.title.toLowerCase() === key);
  return hit?.body ?? "";
}

export type StandardReadingValidation = {
  valid: boolean;
  missingSections: string[];
  shortSections: string[];
  hasEasternTeaser: boolean;
};

function validateReadingSectionBodies(
  reading: string,
  minBodyChars: number,
): Pick<StandardReadingValidation, "missingSections" | "shortSections"> {
  const sections = parseReadingSections(reading);
  const missingSections: string[] = [];
  const shortSections: string[] = [];

  for (const title of STANDARD_READING_SECTIONS) {
    const body = findSectionBody(sections, title);
    if (!body.trim()) {
      missingSections.push(title);
    } else if (body.trim().length < minBodyChars) {
      shortSections.push(title);
    }
  }

  return { missingSections, shortSections };
}

/** 무료 티어에 필요한 섹션·티저가 모두 채워졌는지 */
export function validateStandardReading(
  reading: string,
  easternTeaser?: string | null,
): StandardReadingValidation {
  const { missingSections, shortSections } = validateReadingSectionBodies(
    reading,
    MIN_SECTION_BODY_CHARS,
  );

  const teaser = easternTeaser?.trim() ?? "";
  const hasEasternTeaser = teaser.length >= MIN_EASTERN_TEASER_CHARS;

  const valid =
    missingSections.length === 0 &&
    shortSections.length === 0 &&
    hasEasternTeaser;

  return {
    valid,
    missingSections,
    shortSections,
    hasEasternTeaser,
  };
}

export function isCompleteStandardReading(
  reading: string,
  easternTeaser?: string | null,
): boolean {
  return validateStandardReading(reading, easternTeaser).valid;
}

/** 프리미엄 Sage 리딩 — Past/Present/Future/Message 4섹션 (티저 불필요) */
export function isCompletePremiumReading(reading: string): boolean {
  const { missingSections, shortSections } = validateReadingSectionBodies(
    reading,
    MIN_PREMIUM_SECTION_BODY_CHARS,
  );
  return missingSections.length === 0 && shortSections.length === 0;
}
