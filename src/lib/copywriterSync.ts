import { supabase } from "@/integrations/supabase/client";
import { CopywriterCopy } from "@/hooks/useCopywriterCopies";
import type { UnsafeAny } from '@/types/unsafe';

interface SyncToPlannerParams {
  copy: CopywriterCopy;
  languages?: ("en" | "ar" | "az" | "es")[];
}

export async function syncCopyToPlanners({ copy, languages }: SyncToPlannerParams) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");

  const languagesToSync = languages || ["en", "ar", "az", "es"];
  const elements = [];

  for (const lang of languagesToSync) {
    const contentKey = `content_${lang}` as keyof CopywriterCopy;
    const content = copy[contentKey];

    if (!content || typeof content !== "string") continue;

    for (const platform of copy.platform) {
      elements.push({
        element_type: copy.element_type,
        content: { text: content },
        entity: copy.entity,
        language: lang.toUpperCase(),
        tags: [...copy.entity, copy.element_type, ...(copy.campaigns || [])],
        google_status: "pending",
        platform,
        created_by: userData.user.id,
      });
    }
  }

  if (elements.length === 0) {
    throw new Error("No content to sync");
  }

  const { error } = await supabase.from("ad_elements").insert(elements);

  if (error) throw error;

  // Mark as synced
  await supabase
    .from("copywriter_copies")
    .update({ is_synced_to_planner: true })
    .eq("id", copy.id);
}

interface SyncElementToCopywriterParams {
  elementType: string;
  content: string;
  language: string;
  platform: string;
  entity: string[];
  campaigns?: string[];
}

export async function syncElementToCopywriter({
  elementType,
  content,
  language,
  platform,
  entity,
  campaigns = [],
}: SyncElementToCopywriterParams) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");

  const langKey = `content_${language.toLowerCase()}`;
  
  // Check if similar copy exists (same element_type, entity, and has this platform)
  const { data: existingCopies } = await supabase
    .from("copywriter_copies")
    .select("*")
    .eq("element_type", elementType)
    .overlaps("entity", entity)
    .contains("platform", [platform]);

  // If exists and has the same content in this language, don't create duplicate
  if (existingCopies && existingCopies.length > 0) {
  const matchingCopy = existingCopies.find((copy) => {
      const copyContent = (copy as UnsafeAny)[langKey];
      return copyContent === content;
    });

    if (matchingCopy) {
      return; // Already exists, skip
    }
  }

  // Create new copy with this language content
  const newCopy: UnsafeAny = {
    element_type: elementType,
    platform: [platform],
    entity,
    campaigns,
    tags: [...entity, elementType],
    created_by: userData.user.id,
    is_synced_to_planner: true,
  };

  newCopy[langKey] = content;

  const { error } = await supabase.from("copywriter_copies").insert(newCopy);

  if (error) throw error;
}
