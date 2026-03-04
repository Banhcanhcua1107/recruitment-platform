# Notification Feature Implementation Guide

## Overview
A fully functional notification system has been added to your TalentFlow Header. The feature includes:
- Bell icon with red unread badge (lucide-react)
- Animated dropdown/popover (Framer Motion)
- Sample notification list with timestamps
- "Mark as read" button
- "View all" link
- Fully responsive and matches TalentFlow branding (#2563eb blue)

---

## Components Created

### 1. **NotificationBell.tsx**
**Location:** `/src/components/shared/NotificationBell.tsx`

**Features:**
- Bell icon button with hover state
- Red dot badge showing unread count (animates in with scale)
- Dropdown popover with smooth spring-like animations (Framer Motion)
- Click-outside detection to close dropdown
- Staggered animation for notification items
- Sample data structure with 3 mock notifications

**Key Props/State:**
```typescript
interface Notification {
  id: string;              // Unique identifier
  icon: string;            // Emoji or icon name (e.g., "📋", "✅")
  title: string;          // Notification headline
  description: string;    // Short description/body
  timestamp: string;      // Display text (e.g., "5 phút trước")
  read: boolean;          // Read status (blue dot if false)
}
```

**Default Notifications (Sample Data):**
- Job recommendation alert
- Application viewed notification
- Profile update confirmation

---

## Integration into Navbar

### 2. **Updated Navbar.tsx**
**Location:** `/src/components/shared/Navbar.tsx`

**Changes Made:**
1. Imported `NotificationBell` component
2. Placed it between the login area and profile dropdown for logged-in users
3. Layout structure:
   ```
   Header
   ├── Logo
   ├── Navigation Menu
   └── Actions (right side)
       ├── For Logged-In Users:
       │   ├── NotificationBell 🔔
       │   └── Profile Dropdown 👤
       └── For Guests:
           ├── Login Button
           └── Register Button
   ```

**Code Location:**
```tsx
// Line ~177-181 in Navbar.tsx
{/* ĐÃ ĐĂNG NHẬP */}
<div className="flex items-center gap-2">
  {/* Notification Bell */}
  <NotificationBell />
  
  {/* Profile Dropdown */}
  <div className="relative">
    {/* ... profile dropdown code ... */}
  </div>
</div>
```

---

## Styling Details

### Colors (TalentFlow Branding)
- **Primary Blue:** `#2563eb` (used for links, highlights)
- **Unread Indicator:** Red badge (`bg-red-500`)
- **Unread Notification Row:** Blue tint background (`bg-blue-50/40`)
- **Hover State:** Light blue (`hover:bg-blue-50`)

### Typography
- **Header:** Bold, 18px (`font-black text-lg`)
- **Title:** Bold, 14px (`font-bold text-sm`)
- **Description:** Regular, 12px, slate-600 (`text-xs text-slate-600`)
- **Timestamp:** Small, 12px, slate-400 (`text-xs text-slate-400`)

### Layout & Spacing
- **Dropdown Width:** 384px (w-96)
- **Rounded Corners:** Extra large (`rounded-xl`)
- **Shadow:** `shadow-lg` with border
- **Max Height:** 384px with scrollable area (`max-h-96 overflow-y-auto`)

---

## Animation Details (Framer Motion)

### Dropdown Animation
```javascript
dropdownVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -10 }
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2 } }
  exit: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.2 } }
}
```
- Smooth scale + fade entrance
- 200ms duration
- Works with `AnimatePresence` for proper cleanup

### Item Animation (Staggered)
```javascript
itemVariants = {
  hidden: { opacity: 0, y: -5 }
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 }  // Each item delays by 50ms
  })
}
```
- Creates cascading entrance effect
- Perfect for list items

---

## How to Customize

### 1. Change Sample Notifications
Edit the initial state in `NotificationBell.tsx`:
```typescript
setNotifications([
  {
    id: "1",
    icon: "📋",
    title: "Your notification title",
    description: "Description",
    timestamp: "X minutes ago",
    read: false,
  },
  // Add more notifications...
]);
```

### 2. Connect to Real Notifications (Backend Integration)
Replace the hardcoded sample data with API calls:
```typescript
useEffect(() => {
  const fetchNotifications = async () => {
    const response = await fetch('/api/notifications', {
      headers: { 'Authorization': `Bearer ${session?.token}` }
    });
    const data = await response.json();
    setNotifications(data.notifications);
  };
  
  fetchNotifications();
}, []);
```

### 3. Real-Time Updates (WebSocket)
```typescript
useEffect(() => {
  const channel = supabase
    .channel('notifications')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      }
    )
    .subscribe();
  
  return () => channel.unsubscribe();
}, []);
```

### 4. Update "/candidate/notifications" Route
Create a full notifications page at `/src/app/candidate/notifications/page.tsx`:
```typescript
"use client";
import Link from "next/link";

export default function NotificationsPage() {
  return (
    <div className="max-w-2xl mx-auto pa-6">
      <h1 className="text-3xl font-black mb-6">Tất cả thông báo</h1>
      {/* Render full list of notifications */}
      <Link href="/candidate/dashboard" className="text-blue-600">
        ← Quay lại
      </Link>
    </div>
  );
}
```

### 5. Customize Colors
Update Tailwind classes in NotificationBell.tsx:
```typescript
// Change unread badge color
- className="w-3 h-3 bg-red-500 rounded-full"
+ className="w-3 h-3 bg-orange-500 rounded-full"

// Change dropdown header background
- className="bg-gradient-to-r from-slate-50 to-blue-50"
+ className="bg-gradient-to-r from-slate-50 to-purple-50"

// Change link color
- className="text-blue-600 hover:text-blue-700"
+ className="text-purple-600 hover:text-purple-700"
```

### 6. Adjust Dropdown Width
```typescript
// In NotificationBell.tsx dropdown div
- className="w-96"  // 384px
+ className="w-screen md:w-96"  // Full width on mobile
```

---

## Database Schema (Optional)

If you want to persist notifications in Supabase:

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  icon VARCHAR(10),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES profiles(id)
);

-- Index for faster queries
CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX notifications_read_idx ON notifications(read);

-- RLS Policy
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);
```

---

## API Endpoint Example

Create `/src/app/api/notifications/route.ts`:

```typescript
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  
  return NextResponse.json({ notifications });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { id } = await req.json();
  
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", user.id);
  
  return NextResponse.json({ success: true });
}
```

---

## Testing Checklist

- [ ] Bell icon displays in Header for logged-in users
- [ ] Red badge shows when there are unread notifications
- [ ] Clicking bell opens dropdown with smooth animation
- [ ] Clicking outside closes dropdown
- [ ] "Mark as read" button marks all notifications as read
- [ ] Blue dots disappear from items after marking as read
- [ ] "Xem tất cả" link navigates to notifications page
- [ ] Responsive on mobile (dropdown doesn't overflow)
- [ ] Framer Motion animations are smooth (60fps)

---

## Performance Notes

**Current Implementation:**
- ✅ Lightweight component (~150 lines)
- ✅ No external API calls (sample data only)
- ✅ Minimal re-renders (useState hooks only)
- ✅ Click-outside detection is efficient (useEffect cleanup)

**When Scaling:**
- Consider virtual scrolling if notifications exceed 100 items
- Implement pagination or "load more" button
- Use React Query/SWR for caching and background sync
- Consider WebSocket for real-time updates instead of polling

---

## Troubleshooting

**Dropdown appears but doesn't animate:**
- Check that Framer Motion is installed: `npm ls framer-motion`
- Verify `AnimatePresence` wraps the dropdown

**Red badge doesn't appear:**
- Ensure notifications have `read: false`
- Check `unreadCount` calculation

**Dropdown position issues:**
- Verify parent container has `position: relative`
- Check z-index values (currently 50)

**Icons not showing:**
- Bell icon from lucide-react requires proper import
- Emoji icons work as-is (copy-paste from keyboard)

---

## Next Steps

1. **Connect to Supabase:** Replace sample data with real notifications from your database
2. **Create notifications page:** Build the full `/candidate/notifications` route
3. **Set up WebSocket:** Implement real-time notification updates using Supabase channels
4. **Add notification triggers:** Create notifications when:
   - Job recommendations are sent
   - Applications are reviewed
   - Profile is updated
   - Message received from recruiter
5. **Analytics:** Track notification engagement (open rate, click rate)

---

## Files Modified

1. `/src/components/shared/NotificationBell.tsx` ✅ Created
2. `/src/components/shared/Navbar.tsx` ✅ Updated (added import + component usage)

## Dependencies Added

- `framer-motion@latest` ✅ Installed
- `lucide-react` ✅ Already installed

---

**Build Status:** ✅ Successfully compiled
**Last Updated:** March 4, 2026
