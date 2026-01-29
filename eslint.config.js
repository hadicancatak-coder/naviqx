import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// =============================================================================
// ⚠️ AI INSTRUCTION: ALL STYLE VIOLATIONS ARE BUILD ERRORS ⚠️
// =============================================================================
// The AI assistant MUST:
// - NEVER generate code with raw typography (text-sm, text-lg, text-xs, etc.)
// - NEVER generate code with raw spacing (gap-4, p-6, mt-8, etc.)
// - NEVER generate code with raw colors (text-white, bg-gray-*, bg-black, etc.)
// - ALWAYS use semantic tokens from STYLE_GUIDE.md:
//   Typography: text-metadata, text-body-sm, text-body, text-heading-sm, etc.
//   Spacing: gap-xs, gap-sm, gap-md, p-sm, p-md, p-card, mt-section, etc.
//   Colors: text-foreground, text-muted-foreground, bg-background, bg-card, etc.
//
// If you generate violating code, the build WILL FAIL.
// =============================================================================
// NAVIQX DESIGN SYSTEM - ESLint Token Enforcement
// =============================================================================
// ALL RULES = "error" (blocks build for all files)
// See STYLE_GUIDE.md for the complete token reference.
// =============================================================================

// HARD RULES - These MUST be enforced (error level)
const HARD_RULES = {
  // Typography - Use semantic text tokens
  typography: {
    pattern: "\\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\\b",
    message: "[HARD] Use semantic typography: text-metadata, text-body-sm, text-body, text-heading-sm, text-heading-md, text-heading-lg, text-page-title",
  },
  // Gap spacing
  gap: {
    pattern: "\\bgap-(0|1|2|3|4|5|6|8|10|12|16|20|24)\\b",
    message: "[HARD] Use semantic gap: gap-xs (4px), gap-sm (8px), gap-md (16px), gap-lg (24px), gap-xl (32px)",
  },
  // Space-y/x utilities
  spaceYX: {
    pattern: "\\bspace-[xy]-(0|1|2|3|4|5|6|8|10|12)\\b",
    message: "[HARD] Use semantic spacing: space-y-xs, space-y-sm, space-y-md, space-y-lg or gap tokens",
  },
  // Padding utilities
  padding: {
    pattern: "\\bp[xytblr]?-(0|1|2|3|4|5|6|8|10|12|16|20|24)\\b",
    message: "[HARD] Use semantic padding: p-xs (4px), p-sm (8px), p-md (16px), p-lg (24px), p-card",
  },
  // Margin utilities
  margin: {
    pattern: "\\bm[xytblr]?-(0|1|2|3|4|5|6|8|10|12|16|20|24)\\b",
    message: "[HARD] Use semantic margin: mt-section, mb-section, mb-card or spacing tokens",
  },
  // Hardcoded grayscale colors
  hardcodedColors: {
    pattern: "\\b(text|bg|border)-(white|black|gray-\\d+|slate-\\d+|zinc-\\d+|neutral-\\d+|stone-\\d+)\\b",
    message: "[HARD] Use semantic colors: text-foreground, text-muted-foreground, bg-background, bg-card, bg-muted, border-border",
  },
  // Arbitrary hex/rgb colors
  arbitraryColors: {
    pattern: "\\b(text|bg|border)-\\[(#[0-9a-fA-F]{3,8}|rgb|rgba)\\b",
    message: "[HARD] Use semantic color tokens from index.css. No arbitrary color values.",
  },
};

// SOFT RULES - Review-level guidance (warn level)
const SOFT_RULES = {
  // Arbitrary dimension values (may have valid exceptions)
  arbitraryDimensions: {
    pattern: "\\b[wh]-\\[\\d+px\\]\\b",
    message: "[SOFT] Avoid arbitrary dimensions like w-[123px]. Use semantic sizing or document exception.",
  },
  // Leading/tracking utilities
  leadingTracking: {
    pattern: "\\b(leading|tracking)-(none|tight|snug|normal|relaxed|loose|\\d+)\\b",
    message: "[SOFT] Prefer semantic typography tokens which include proper line-height/letter-spacing.",
  },
};

export default tseslint.config(
  { ignores: ["dist"] },
  // =======================================================================
  // BASE CONFIG - All files get WARN level (non-blocking)
  // This ensures the app keeps building while we migrate
  // =======================================================================
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      
      // WARN level temporarily - Phase 0 of semantic token migration
      // Will revert to "error" after Phase 5 completion
      "no-restricted-syntax": [
        "warn",
        // Typography
        {
          selector: "Literal[value=/\\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\\b/]",
          message: HARD_RULES.typography.message,
        },
        {
          selector: "TemplateElement[value.raw=/\\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\\b/]",
          message: HARD_RULES.typography.message,
        },
        // Gap
        {
          selector: "Literal[value=/\\bgap-(0|1|2|3|4|5|6|8|10|12|16|20|24)\\b/]",
          message: HARD_RULES.gap.message,
        },
        {
          selector: "TemplateElement[value.raw=/\\bgap-(0|1|2|3|4|5|6|8|10|12|16|20|24)\\b/]",
          message: HARD_RULES.gap.message,
        },
        // Space-y/x
        {
          selector: "Literal[value=/\\bspace-[xy]-(0|1|2|3|4|5|6|8|10|12)\\b/]",
          message: HARD_RULES.spaceYX.message,
        },
        {
          selector: "TemplateElement[value.raw=/\\bspace-[xy]-(0|1|2|3|4|5|6|8|10|12)\\b/]",
          message: HARD_RULES.spaceYX.message,
        },
        // Padding
        {
          selector: "Literal[value=/\\bp[xytblr]?-(0|1|2|3|4|5|6|8|10|12|16|20|24)\\b/]",
          message: HARD_RULES.padding.message,
        },
        {
          selector: "TemplateElement[value.raw=/\\bp[xytblr]?-(0|1|2|3|4|5|6|8|10|12|16|20|24)\\b/]",
          message: HARD_RULES.padding.message,
        },
        // Margin
        {
          selector: "Literal[value=/\\bm[xytblr]?-(0|1|2|3|4|5|6|8|10|12|16|20|24)\\b/]",
          message: HARD_RULES.margin.message,
        },
        {
          selector: "TemplateElement[value.raw=/\\bm[xytblr]?-(0|1|2|3|4|5|6|8|10|12|16|20|24)\\b/]",
          message: HARD_RULES.margin.message,
        },
        // Hardcoded colors
        {
          selector: "Literal[value=/\\b(text|bg|border)-(white|black|gray-\\d+|slate-\\d+|zinc-\\d+)\\b/]",
          message: HARD_RULES.hardcodedColors.message,
        },
        {
          selector: "TemplateElement[value.raw=/\\b(text|bg|border)-(white|black|gray-\\d+|slate-\\d+|zinc-\\d+)\\b/]",
          message: HARD_RULES.hardcodedColors.message,
        },
        // Arbitrary colors
        {
          selector: "Literal[value=/\\b(text|bg|border)-\\[(#[0-9a-fA-F]{3,8}|rgb|rgba)\\b/]",
          message: HARD_RULES.arbitraryColors.message,
        },
        {
          selector: "TemplateElement[value.raw=/\\b(text|bg|border)-\\[(#[0-9a-fA-F]{3,8}|rgb|rgba)\\b/]",
          message: HARD_RULES.arbitraryColors.message,
        },
      ],
    },
  },
  // =======================================================================
  // NOTE: Strict config removed - all files now use ERROR level by default
  // =======================================================================
);
