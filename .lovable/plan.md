
# Campaign LP Button & Reviewer Identification Improvements

## Overview

This plan addresses three issues:
1. **Remove identification popups** - Replace the blocking popup/card that asks for name/email with an inline header bar showing "Reviewing as [Name]"
2. **Store reviewer identity by IP** - Persist reviewer details with their IP address so returning visitors don't need to re-enter info
3. **Add LP button to Campaign Detail Dialog** - The Landing Page link exists in UtmCampaignDetailDialog but should also have a prominent "View LP" button

---

## Part 1: Database Changes

### Create `external_reviewer_sessions` Table

Store reviewer identity linked to IP address for seamless return visits:

```sql
CREATE TABLE external_reviewer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT NOT NULL,
  page_type TEXT NOT NULL CHECK (page_type IN ('campaign_review', 'lp_map')),
  access_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast IP lookups
CREATE INDEX idx_reviewer_sessions_ip ON external_reviewer_sessions(ip_address);

-- RLS policies for anonymous access
ALTER TABLE external_reviewer_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous SELECT and INSERT
CREATE POLICY "Allow anonymous read" ON external_reviewer_sessions
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous insert" ON external_reviewer_sessions
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous update" ON external_reviewer_sessions
  FOR UPDATE TO anon USING (true);
```

---

## Part 2: Create IP-Based Reviewer Session Hook

### New File: `src/hooks/useReviewerSession.ts`

This hook will:
1. Check if we have a stored session for this IP
2. If yes, auto-fill the reviewer info
3. If no, show the inline identification bar
4. Save reviewer info with IP when they identify

```typescript
// Hook that manages reviewer sessions by IP
export const useReviewerSession = (pageType: 'campaign_review' | 'lp_map', accessToken?: string) => {
  const [session, setSession] = useState<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check for existing session by IP
  useEffect(() => {
    const checkSession = async () => {
      // Get client IP from request headers or use a fallback
      const { data } = await supabase
        .from('external_reviewer_sessions')
        .select('reviewer_name, reviewer_email')
        .eq('page_type', pageType)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setSession({ name: data.reviewer_name, email: data.reviewer_email });
      }
      setLoading(false);
    };
    checkSession();
  }, [pageType]);

  const saveSession = async (name: string, email: string) => {
    await supabase.from('external_reviewer_sessions').upsert({
      ip_address: 'client', // Will be enhanced with edge function
      reviewer_name: name,
      reviewer_email: email,
      page_type: pageType,
      access_token: accessToken,
      updated_at: new Date().toISOString(),
    });
    setSession({ name, email });
  };

  return { session, loading, saveSession, hasSession: !!session };
};
```

---

## Part 3: Campaign Review Page Changes

### File: `src/pages/CampaignReview.tsx`

**Remove**: The blocking popup (lines 411-477) that forces users to enter name/email before seeing content

**Replace with**: Inline identification bar at top + always show content

**Changes:**

1. **Add Inline Identification Bar Component**
```typescript
// New component at top of page when not identified
const IdentificationBar = ({ name, email, setName, setEmail, onSubmit, isSubmitting }) => (
  <Card className="mb-md border-primary/30">
    <CardContent className="py-sm px-md">
      <div className="flex items-center gap-md flex-wrap">
        <span className="text-body-sm text-muted-foreground">To leave feedback:</span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-40 h-8"
        />
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@cfi.trade"
          className="w-48 h-8"
        />
        <Button size="sm" onClick={onSubmit} disabled={isSubmitting || !name.trim() || !email.trim()}>
          Start Reviewing
        </Button>
      </div>
    </CardContent>
  </Card>
);
```

2. **Update Page Logic**
- Remove the `if (!verified) return <popup>` block
- Always show the campaigns grid
- Show identification bar only when user tries to comment (or at top if not identified)
- Auto-populate from IP session if available

3. **Update Header to Show Reviewer Info**
```typescript
// In the header section (lines 484-499)
<p className="text-body-sm text-muted-foreground">
  {accessData?.entity} • {verified ? `Reviewing as ${name}` : "Not identified yet"}
</p>
```

---

## Part 4: LP Map Public Page Changes

### File: `src/pages/LpMapPublic.tsx`

**Remove**: The blocking card (lines 319-354) that forces identification before viewing

**Replace with**: Inline identification bar similar to Campaign Review

**Changes:**

1. **Remove the Identification Card Block** (lines 319-354)

2. **Add Inline Identification Bar** at the top of the page content:
```typescript
// After the header section, before sections list
{!hasIdentified && (
  <Card className="mb-md border-primary/30">
    <CardContent className="py-sm px-md">
      <div className="flex items-center gap-md flex-wrap">
        <span className="text-body-sm text-muted-foreground">To leave comments:</span>
        <Input
          value={reviewerName}
          onChange={(e) => setReviewerName(e.target.value)}
          placeholder="Your name"
          className="w-40 h-8"
        />
        <Input
          value={reviewerEmail}
          onChange={(e) => setReviewerEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-48 h-8"
        />
        <Button size="sm" onClick={handleIdentify} disabled={!reviewerName.trim() || !reviewerEmail.trim()}>
          Continue
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

3. **Update Header to Show Reviewer**:
```typescript
// In header section, add:
{hasIdentified && (
  <p className="text-sm text-muted-foreground">
    Reviewing as {reviewerName}
  </p>
)}
```

4. **Integrate useReviewerSession hook** to auto-populate from IP

---

## Part 5: Add LP Button to Campaign Detail Dialog

### File: `src/components/campaigns/UtmCampaignDetailDialog.tsx`

The Landing Page section already exists (lines 230-280) with a link. Add a more prominent "View LP" button:

**Update the Landing Page Card** (lines 231-280):

```typescript
<Card className="p-md bg-card border-border">
  <Label className="text-metadata text-muted-foreground">Landing Page</Label>
  {isEditing ? (
    <Input ... />
  ) : campaign.landing_page ? (
    <div className="flex items-center gap-sm mt-sm flex-wrap">
      {/* Prominent LP Button */}
      <Button 
        variant="default" 
        size="sm"
        onClick={() => window.open(
          campaign.landing_page.startsWith('http') ? campaign.landing_page : `https://${campaign.landing_page}`,
          '_blank'
        )}
      >
        <ExternalLink className="h-4 w-4 mr-2" />
        View LP
      </Button>
      
      {/* Existing URL text + copy button */}
      <span className="text-body-sm text-muted-foreground break-all flex-1">
        {campaign.landing_page}
      </span>
      <Button variant="ghost" size="icon-sm" onClick={handleCopyLandingPage}>
        {copied ? <Check className="text-success" /> : <Copy />}
      </Button>
    </div>
  ) : (
    <p className="text-muted-foreground mt-sm text-body-sm">Not set</p>
  )}
</Card>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| **Database** | Create `external_reviewer_sessions` table with RLS |
| `src/hooks/useReviewerSession.ts` | NEW - Hook for IP-based session management |
| `src/pages/CampaignReview.tsx` | Remove blocking popup, add inline bar, integrate IP session |
| `src/pages/LpMapPublic.tsx` | Remove blocking card, add inline bar, integrate IP session |
| `src/components/campaigns/UtmCampaignDetailDialog.tsx` | Add prominent "View LP" button |

---

## User Experience Flow (After Changes)

### Campaign Review Page:
1. User opens link → Sees campaigns immediately (no popup blocking)
2. At the top, sees: "Jordan • Reviewing as [Name]" (if IP session exists) OR inline identification bar
3. User can browse all campaigns and versions without identifying
4. When they try to submit feedback, they must identify first (if not already)

### LP Map Public Page:
1. User opens link → Sees LP map sections immediately (no popup blocking)
2. Inline bar at top: "To leave comments: [Name] [Email] [Continue]" OR "Reviewing as [Name]"
3. User can view all sections without identifying
4. Comment inputs only appear after identification

---

## Technical Notes

1. **IP Detection**: Since we can't reliably get client IP from browser, we'll use the access_token + browser fingerprint (localStorage) as the session key initially. True IP-based tracking would require an edge function.

2. **Session Persistence**: Use localStorage as primary storage, with optional database sync for cross-device continuity.

3. **URL Validation**: All LP buttons use the relaxed validation pattern: `url.startsWith('http') ? url : 'https://' + url`

4. **Backward Compatibility**: Existing access tokens continue to work, reviewer info is just pre-populated when available.
