// src/lib/response-formatter.ts
export interface FormattedContent {
  type: "paragraph" | "list" | "heading" | "warning" | "code";
  content: string | string[];
  level?: number; // For headings
}

export function formatMedicalResponse(response: string): FormattedContent[] {
  const formatted: FormattedContent[] = [];

  // Clean up the response first
  let cleanedResponse = response
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, "\n\n") // Clean up multiple newlines
    .trim();

  // Split by double newlines to get paragraphs
  const sections = cleanedResponse.split(/\n\n+/);

  for (let section of sections) {
    section = section.trim();
    if (!section) continue;

    // Check for medical warnings/disclaimers
    if (isWarningSection(section)) {
      formatted.push({
        type: "warning",
        content: cleanWarningText(section)
      });
      continue;
    }

    // Check for headings (lines that end with : or are short and capitalized)
    if (isHeading(section)) {
      formatted.push({
        type: "heading",
        content: section.replace(/:\s*$/, ""),
        level: getHeadingLevel(section)
      });
      continue;
    }

    // Check for numbered lists
    if (isNumberedList(section)) {
      formatted.push({
        type: "list",
        content: formatNumberedList(section)
      });
      continue;
    }

    // Check for bullet lists
    if (isBulletList(section)) {
      formatted.push({
        type: "list",
        content: formatBulletList(section)
      });
      continue;
    }

    // Check for inline lists (1. item 2. item format)
    if (hasInlineList(section)) {
      const formatted_section = formatInlineList(section);
      formatted.push(...formatted_section);
      continue;
    }

    // Regular paragraph
    formatted.push({
      type: "paragraph",
      content: section
    });
  }

  return formatted;
}

function isWarningSection(text: string): boolean {
  const warningKeywords = [
    "seek immediate medical",
    "call emergency",
    "emergency services",
    "serious symptoms",
    "severe symptoms",
    "medical emergency"
  ];
  const lowerText = text.toLowerCase();
  return warningKeywords.some((keyword) => lowerText.includes(keyword));
}

function cleanWarningText(text: string): string {
  return text.replace(/^[⚠️🚨]*\s*/, "").replace(/[⚠️🚨]*\s*$/, "");
}

function isHeading(text: string): boolean {
  // Check if it's a short line (< 50 chars) ending with colon or all caps
  if (text.length < 50 && (text.endsWith(":") || text === text.toUpperCase())) {
    return true;
  }

  // Check for common medical headings
  const headingPatterns = [
    /^(symptoms?|causes?|treatment|diagnosis|when to see|recommendations?|next steps?):/i,
    /^(what (is|are|to do)|how to|why)/i
  ];

  return headingPatterns.some((pattern) => pattern.test(text));
}

function getHeadingLevel(text: string): number {
  if (text.length < 20) return 1;
  if (text.length < 40) return 2;
  return 3;
}

function isNumberedList(text: string): boolean {
  // Check if text starts with number and has multiple numbered items
  const lines = text.split("\n").filter((line) => line.trim());
  let numberedCount = 0;

  for (const line of lines) {
    if (/^\s*\d+[\.\)]\s/.test(line)) {
      numberedCount++;
    }
  }

  return numberedCount >= 2;
}

function isBulletList(text: string): boolean {
  const lines = text.split("\n").filter((line) => line.trim());
  let bulletCount = 0;

  for (const line of lines) {
    if (/^\s*[•\-\*]\s/.test(line)) {
      bulletCount++;
    }
  }

  return bulletCount >= 2;
}

function hasInlineList(text: string): boolean {
  // Check for pattern like "1. item 2. item 3. item"
  const inlinePattern = /\d+\.\s+[^.]+?\s+\d+\.\s/;
  return inlinePattern.test(text);
}

function formatNumberedList(text: string): string[] {
  const lines = text.split("\n");
  const listItems: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\d+[\.\)]\s/.test(trimmed)) {
      // Remove the number and formatting
      const content = trimmed.replace(/^\d+[\.\)]\s*/, "");
      listItems.push(content);
    } else if (trimmed && listItems.length > 0) {
      // Continuation of previous item
      listItems[listItems.length - 1] += " " + trimmed;
    }
  }

  return listItems;
}

function formatBulletList(text: string): string[] {
  const lines = text.split("\n");
  const listItems: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[•\-\*]\s/.test(trimmed)) {
      const content = trimmed.replace(/^[•\-\*]\s*/, "");
      listItems.push(content);
    } else if (trimmed && listItems.length > 0) {
      listItems[listItems.length - 1] += " " + trimmed;
    }
  }

  return listItems;
}

function formatInlineList(text: string): FormattedContent[] {
  const parts: FormattedContent[] = [];

  // Split by numbered items
  const segments = text.split(/(?=\d+\.\s)/);

  let nonListText = "";
  const listItems: string[] = [];

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    if (/^\d+\.\s/.test(trimmed)) {
      // This is a list item
      const content = trimmed.replace(/^\d+\.\s*/, "");
      listItems.push(content);
    } else {
      // This is regular text
      nonListText += " " + trimmed;
    }
  }

  // Add any non-list text first
  if (nonListText.trim()) {
    parts.push({
      type: "paragraph",
      content: nonListText.trim()
    });
  }

  // Add the list
  if (listItems.length > 0) {
    parts.push({
      type: "list",
      content: listItems
    });
  }

  return parts;
}
