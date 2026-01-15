import { stripHtml } from "./stripHtml";

/**
 * Consistent content parsing for Caption Library
 * Handles both legacy (string) and new (JSON object) formats
 */
export function getContentForLanguage(content: unknown, lang: "en" | "ar"): string {
  if (!content) return "";

  // Handle string content (legacy format or JSON string)
  if (typeof content === "string") {
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed === "object" && parsed !== null) {
        return String(parsed[lang] || (lang === "en" ? parsed.text || "" : ""));
      }
    } catch {
      // Not JSON - plain string, treat as EN content
      return lang === "en" ? content : "";
    }
  }

  // Handle object content
  if (typeof content === "object" && content !== null) {
    const obj = content as Record<string, unknown>;
    if (obj[lang]) return String(obj[lang]);
    if (lang === "en" && obj.text) return String(obj.text);
  }

  return "";
}

/**
 * Get content stripped of HTML tags for display
 */
export function getContentForDisplay(content: unknown, lang: "en" | "ar"): string {
  const raw = getContentForLanguage(content, lang);
  return stripHtml(raw);
}

/**
 * Get content for copying (strips HTML)
 */
export function getContentForCopy(content: unknown, lang: "en" | "ar"): string {
  const raw = getContentForLanguage(content, lang);
  return stripHtml(raw);
}

/**
 * Parse stored content into {en, ar} object for editing
 * Wraps plain text in <p> tags for RichTextEditor compatibility
 */
export function parseContentForEditing(content: unknown): { en: string; ar: string } {
  if (!content) return { en: "", ar: "" };
  
  const wrapInParagraph = (text: string): string => {
    if (!text) return "";
    // If already has HTML tags, return as-is
    if (text.includes("<") && text.includes(">")) return text;
    // Wrap plain text in paragraph tag for TipTap
    return `<p>${text}</p>`;
  };

  // Handle string content
  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed === "object" && parsed !== null) {
        return {
          en: wrapInParagraph(String(parsed.en || parsed.text || "")),
          ar: wrapInParagraph(String(parsed.ar || "")),
        };
      }
    } catch {
      // Plain string - treat as EN content
      return { en: wrapInParagraph(content), ar: "" };
    }
  }

  // Handle object content
  if (typeof content === "object" && content !== null) {
    const obj = content as Record<string, unknown>;
    return {
      en: wrapInParagraph(String(obj.en || obj.text || "")),
      ar: wrapInParagraph(String(obj.ar || "")),
    };
  }

  return { en: "", ar: "" };
}

/**
 * Serialize content for database storage
 * Includes 'text' field for backward compatibility with selectors
 */
export function serializeContent(content: { en: string; ar: string }): { en: string; ar: string; text: string } {
  const enText = content.en || "";
  const arText = content.ar || "";
  
  // Strip HTML from text field for compatibility with simple selectors
  const plainEn = enText.replace(/<[^>]*>/g, '').trim();
  const plainAr = arText.replace(/<[^>]*>/g, '').trim();
  
  return {
    en: enText,
    ar: arText,
    text: plainEn || plainAr, // Fallback to AR if EN is empty
  };
}
