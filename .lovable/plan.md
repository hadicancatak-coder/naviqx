
## Fix ALL Remaining @typescript-eslint/no-explicit-any Errors

### Problem Analysis
The build keeps failing because there are **20+ files** with unprotected `any` types. Previous fixes addressed files one-by-one, but new files kept appearing in the build queue. This plan addresses ALL remaining instances at once.

### Files Requiring Fixes

Based on the comprehensive codebase search, here are ALL files with unprotected `any` types that need ESLint suppression comments:

| # | File | Lines with `any` | Fix Required |
|---|------|------------------|--------------|
| 1 | `src/components/ads/SavedElementsTableView.tsx` | 24, 33 | `elements: any[]`, `selectedElement: any` |
| 2 | `src/hooks/useAdEditorState.ts` | 7, 14, 33 | `draftData: any` (interface + state + param) |
| 3 | `src/components/dashboard/NeedsAttention.tsx` | 11 | `data: any` |
| 4 | `src/components/tasks/TaskBoardView.tsx` | 12, 34, 45 | `tasks: any[]`, `(a: any)`, `(task: any)` |
| 5 | `src/components/ads/SaveAsTemplateDialog.tsx` | 17 | `sitelinks: any[]` |
| 6 | `src/components/search/AdPreviewPanel.tsx` | 12, 13, 17 | `ad: any`, `campaign: any`, `sitelinks: any[]` |
| 7 | `src/components/utm/UtmMediumManager.tsx` | 51, 54 | `editingMedium: any`, `mediumToDelete: any` |
| 8 | `src/components/utm/UtmPlatformManager.tsx` | 55, 58 | `editingPlatform: any`, `platformToDelete: any` |
| 9 | `src/components/utm/EntitiesManager.tsx` | 55 | `editingEntity: any` |
| 10 | `src/components/webintel/BulkSiteUploadDialog.tsx` | 24, 90 | `previewData: any[]`, `as any` |
| 11 | `src/components/tasks/TaskGridView.tsx` | 4 | `tasks: any[]` |
| 12 | `src/components/tasks/AdSelectorDialog.tsx` | 16, 22 | `onSelectAds: (ads: any[])`, `ads: any[]` |
| 13 | `src/components/utm/UtmBuilder.tsx` | 35, 106 | `generatedLinks: any[]`, `links: any[]` |
| 14 | `src/components/ads/AdListPanel.tsx` | 12, 14 | `ads: any[]`, `onSelectAd: (ad: any)` |
| 15 | `src/components/search/CampaignPreviewPanel.tsx` | 11-17 | `campaign: any`, `adGroups: any[]`, `ads: any[]`, etc. |

### Implementation Strategy

For each file, add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` before lines containing `any` types.

#### Example Pattern
```typescript
// Before:
interface Props {
  tasks: any[];
}

// After:
interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tasks: any[];
}
```

### Detailed Changes by File

---

#### 1. `src/components/ads/SavedElementsTableView.tsx`
**Lines 23-24 and 33:**
```typescript
interface SavedElementsTableViewProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: any[];
  onRefresh?: () => void;
}

// Line 33:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const [selectedElement, setSelectedElement] = useState<any>(null);
```

---

#### 2. `src/hooks/useAdEditorState.ts`
**Lines 7, 14, 33:**
```typescript
interface EditorState {
  adId: string | null;
  hasUnsavedChanges: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  draftData: any;
}

// Line 14:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const [draftData, setDraftData] = useState<any>(null);

// Line 33:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(data: any) => {
```

---

#### 3. `src/components/dashboard/NeedsAttention.tsx`
**Line 11:**
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const [data, setData] = useState<any>({ overdueTasks: [], blockers: [], pendingApprovals: [] });
```

---

#### 4. `src/components/tasks/TaskBoardView.tsx`
**Lines 12, 34, 45:**
```typescript
interface TaskBoardViewProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tasks: any[];
  ...
}

// Line 34:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
task.assignees.forEach((a: any) => {

// Line 45:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDateGroup = (task: any): string => {
```

---

#### 5. `src/components/ads/SaveAsTemplateDialog.tsx`
**Line 17:**
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
sitelinks: any[];
```

---

#### 6. `src/components/search/AdPreviewPanel.tsx`
**Lines 12-17:**
```typescript
interface AdPreviewPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ad: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  campaign: any;
  entity: string;
  headlines: string[];
  descriptions: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sitelinks: any[];
```

---

#### 7. `src/components/utm/UtmMediumManager.tsx`
**Lines 51, 54:**
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const [editingMedium, setEditingMedium] = useState<any>(null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const [mediumToDelete, setMediumToDelete] = useState<any>(null);
```

---

#### 8. `src/components/utm/UtmPlatformManager.tsx`
**Lines 55, 58:**
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const [editingPlatform, setEditingPlatform] = useState<any>(null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const [platformToDelete, setPlatformToDelete] = useState<any>(null);
```

---

#### 9. `src/components/utm/EntitiesManager.tsx`
**Line 55:**
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const [editingEntity, setEditingEntity] = useState<any>(null);
```

---

#### 10. `src/components/webintel/BulkSiteUploadDialog.tsx`
**Lines 24, 90:**
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const [previewData, setPreviewData] = useState<any[]>([]);

// Line 90:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type: (row[3] as any) || 'Website',
```

---

#### 11. `src/components/tasks/TaskGridView.tsx`
**Line 4:**
```typescript
interface TaskGridViewProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tasks: any[];
```

---

#### 12. `src/components/tasks/AdSelectorDialog.tsx`
**Lines 16, 22:**
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
onSelectAds: (ads: any[]) => void;

// Line 22:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const [ads, setAds] = useState<any[]>([]);
```

---

#### 13. `src/components/utm/UtmBuilder.tsx`
**Lines 35, 106:**
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const [generatedLinks, setGeneratedLinks] = useState<any[]>([]);

// Line 106:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const links: any[] = [];
```

---

#### 14. `src/components/ads/AdListPanel.tsx`
**Lines 12, 14:**
```typescript
interface AdListPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ads: any[];
  selectedAdId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSelectAd: (ad: any) => void;
```

---

#### 15. `src/components/search/CampaignPreviewPanel.tsx`
**Lines 11-18:**
```typescript
interface CampaignPreviewPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  campaign: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adGroups: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ads: any[];
  entity: string;
  onViewAllAds?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEditAd?: (ad: any, adGroup: any, campaign: any, entity: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCreateAd?: (adGroup: any, campaign: any, entity: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCreateAdGroup?: (campaign: any, entity: string) => void;
```

---

### Expected Result
- **0 build-blocking errors** related to `@typescript-eslint/no-explicit-any`
- Build passes successfully
- All 15 files fixed in a single batch

### Technical Notes
- These ESLint suppressions are a temporary measure to unblock the build
- Proper typing would require defining interfaces for all data structures (Ad, Task, Campaign, etc.)
- The project memory indicates this is acceptable during the ongoing migration phase
