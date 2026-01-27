
# Campaign Descriptions for External Review

## Overview

Add campaign descriptions that guide external reviewers about what each campaign is about, how to review versions, and how to provide feedback. The description field already exists in the database but is not currently saved during edits or displayed on external review pages.

## Current Gap Analysis

| Area | Current State | Required Change |
|------|--------------|-----------------|
| Database | `description` field exists in `utm_campaigns` | No change needed |
| Update Hook | Does NOT save description | Add `description` parameter |
| Internal Dialog | Shows description but save doesn't persist it | Fix save to include description |
| External Review | No description displayed | Add description section |
| External Cards | No description shown | Add truncated description |

---

## Implementation

### Part 1: Fix Description Saving (Internal Campaign Log)

**File: `src/hooks/useUtmCampaigns.ts`**

Update the `useUpdateUtmCampaign` mutation to accept and save the description field:

```typescript
// Line 92: Update function signature
mutationFn: async ({ id, name, landing_page, description }: { 
  id: string; 
  name?: string; 
  landing_page?: string | null;
  description?: string | null;  // ADD THIS
}) => {
  const { data, error } = await supabase
    .from("utm_campaigns")
    .update({ name, landing_page, description })  // ADD description
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
},
```

**File: `src/components/campaigns/UtmCampaignDetailDialog.tsx`**

Update `handleSave` to include description:

```typescript
// Line 82-94: Update handleSave
const handleSave = async () => {
  try {
    await updateMutation.mutateAsync({
      id: campaignId,
      name,
      landing_page: landingPage || null,
      description: description || null,  // ADD THIS
    });
    setIsEditing(false);
    toast.success("Campaign updated");
  } catch {
    toast.error("Failed to update campaign");
  }
};
```

---

### Part 2: Display Description on External Review Pages

**File: `src/components/campaigns/ExternalCampaignDetailPanel.tsx`**

Add description to the Campaign interface and display it prominently:

```typescript
// Update Campaign interface (Line 30-36)
interface Campaign {
  id: string;
  name: string;
  lp_type?: string;
  campaign_type?: string;
  landing_page?: string;
  description?: string | null;  // ADD THIS
}

// Add description section after header (Line 126-145)
// Inside the component, after the header div and before version gallery:

{/* Campaign Description / Review Guide */}
{campaign.description && (
  <div className="px-lg pt-md">
    <div className="p-md rounded-lg bg-info-soft border border-info/20">
      <div className="flex items-start gap-sm">
        <div className="p-1.5 rounded-full bg-info/20">
          <Info className="h-4 w-4 text-info-text" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-body-sm font-medium text-foreground mb-1">
            About This Campaign
          </h4>
          <p className="text-body-sm text-muted-foreground whitespace-pre-wrap">
            {campaign.description}
          </p>
        </div>
      </div>
    </div>
  </div>
)}
```

---

### Part 3: Update External Grid/Card Components

**File: `src/components/campaigns/ExternalCampaignGrid.tsx`**

Update Campaign interface to include description:

```typescript
interface Campaign {
  id: string;
  name: string;
  lp_type?: string;
  campaign_type?: string;
  landing_page?: string;
  description?: string | null;  // ADD THIS
}
```

**File: `src/components/campaigns/ExternalCampaignCard.tsx`**

Add description to interface and show truncated preview:

```typescript
// Update interface (Line 28-35)
interface ExternalCampaignCardProps {
  campaign: {
    id: string;
    name: string;
    lp_type?: string;
    campaign_type?: string;
    landing_page?: string;
    description?: string | null;  // ADD THIS
  };
  // ... rest of props
}

// Add description preview below card meta (Line 110-120)
// After the existing meta section in the card:

{campaign.description && (
  <p className="text-metadata text-muted-foreground line-clamp-2 mt-1">
    {campaign.description}
  </p>
)}
```

---

### Part 4: Add Reviewer Guidance Section

**File: `src/pages/CampaignReview.tsx`**

Add a guidance callout below the header for first-time reviewers:

```typescript
// After the identification bar section (around line 486), add:

{/* Reviewer Guidance */}
<Card className="bg-muted/30 border-border/50">
  <CardContent className="py-md px-lg">
    <div className="flex items-start gap-md">
      <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
        <Eye className="h-5 w-5 text-primary" />
      </div>
      <div className="space-y-sm">
        <h3 className="text-body font-semibold text-foreground">How to Review</h3>
        <ul className="text-body-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Click any campaign card below to view its creative versions</li>
          <li>Each version shows the visual asset and version notes</li>
          <li>Leave feedback on specific versions using the comment box</li>
          <li>Your feedback helps improve our campaigns for {accessData?.entity}</li>
        </ul>
      </div>
    </div>
  </CardContent>
</Card>
```

---

## Visual Design

The description will appear as an info callout with a blue/info theme:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ ○ Gold Campaign                                                       [X]   │
│   Campaign • 3 versions • 5 comments                           [View LP]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ℹ️  About This Campaign                                              │   │
│  │                                                                      │   │
│  │ This campaign promotes gold trading with competitive spreads.        │   │
│  │ Please review each version and provide feedback on:                  │   │
│  │ - Visual appeal and brand consistency                                │   │
│  │ - Call-to-action clarity                                             │   │
│  │ - Mobile readability                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌───────┐                                                                  │
│  │  v1   │   Version Gallery...                                            │
│  └───────┘                                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useUtmCampaigns.ts` | Add `description` to update mutation |
| `src/components/campaigns/UtmCampaignDetailDialog.tsx` | Include description in save |
| `src/components/campaigns/ExternalCampaignDetailPanel.tsx` | Display description callout |
| `src/components/campaigns/ExternalCampaignGrid.tsx` | Update interface |
| `src/components/campaigns/ExternalCampaignCard.tsx` | Add description preview |
| `src/pages/CampaignReview.tsx` | Add reviewer guidance section |

---

## Technical Notes

- The `description` field already exists in the database schema (`utm_campaigns.description: text`)
- No database migration required
- The internal dialog already has the description state and input field - it just wasn't being saved
- External components need their Campaign interfaces updated to include the optional `description` field
- Use `whitespace-pre-wrap` CSS to preserve line breaks in descriptions

---

## Testing Checklist

1. Internal Campaign Log:
   - [ ] Edit a campaign and add/modify description
   - [ ] Save and verify description persists after reopening
   
2. External Review Page:
   - [ ] Campaign with description shows the info callout
   - [ ] Campaign without description shows no empty box
   - [ ] Description text preserves line breaks
   
3. External Campaign Cards:
   - [ ] Cards show truncated description (2 lines max)
   - [ ] Cards without description show normally
   
4. Reviewer Guidance:
   - [ ] "How to Review" guidance section appears for all reviewers
   - [ ] Instructions are clear and entity-specific
