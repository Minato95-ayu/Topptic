# Topptic UI Component Gallery & Quick Reference

## 🎨 Component Showcase

### 1. SIDEBAR

```tsx
<Sidebar />
```

**Features:**
- Logo with gradient (Blue → Cyan)
- 4 nav items with active states
- Projects list (expandable)
- Language badges (TypeScript, Python, Rust)
- AI status indicator with glow
- Offline mode indicator

**Dimensions:** 16rem width × full height  
**Theme:** Glass morphism with slate-900/40 background  

---

### 2. NAVIGATION ITEM

#### Inactive State
```
□ Projects
```

#### Active State
```
■ Projects [3]
```
(Blue background, active icon, optional badge)

**Props:**
- `icon`: ReactNode (SVG icon)
- `label`: string (Item text)
- `isActive`: boolean (Highlight state)
- `badge`: string (Optional count badge)
- `onClick`: callback

---

### 3. PROJECTS LIST

```
▼ Projects
  📁 E-commerce App     TypeScript
  📁 AI Assistant       Python
  📁 Mobile Game        Rust
  [+ New Project]
```

**Features:**
- Expandable/collapsible
- Folder icons
- Language tags
- Add new project button

---

### 4. EDITOR PANEL

```
┌─────────────────────────────────────┐
│ 📄 App.tsx 🔵 │ 📄 utils.ts 🔵 │ + │
├─────────────────────────────────────┤
│                                     │
│  1  import React from 'react';      │
│  2  import { useState } from ...    │
│  3                                  │
│  4  export const App = () => {      │
│  5    return (...)                  │
│  6  }                               │
│                                     │
└─────────────────────────────────────┘
```

**Features:**
- Tab bar with multiple open files
- Blue dot for unsaved changes
- Close button on hover
- Line numbers
- Syntax highlighting
- Code completion ready

---

### 5. MONACO EDITOR (Detail View)

```
Language: TypeScript
Font: JetBrains Mono, 14px
Theme: Dark (Custom)
Features:
  ✓ Syntax highlighting
  ✓ Code folding
  ✓ Line numbers
  ✓ Minimap: disabled (minimal UI)
  ✓ Word wrap: off
  ✓ Padding: 16px
  ✗ Minimap (hidden for clean look)
```

**Integrated Features (ready to add):**
- Code completion (via Rust backend)
- Error underlining (via AI)
- Quick fixes (via AI suggestions)
- Go to definition (via file system)
- Format on save (via Rust backend)

---

### 6. AI CHAT PANEL

```
┌──────────────────────┐
│ AI Assistant         │  Header
│ Powered by Llama.cpp │
├──────────────────────┤
│                      │
│ Hello! I'm your      │  AI Message
│ Topptic Assistant.   │  (left, gray bg)
│                      │
│              How do  │  User Message
│              I debug?│  (right, blue bg)
│                      │
│ Here's how to debug: │  AI Message
│ 1. Use console.log() │  (left, gray bg)
│ 2. Breakpoints       │
│                      │
│ ⏳ (typing...)        │  Typing indicator
│                      │
├──────────────────────┤
│ [Ask me anything...] │  Input field
│ [Send →]             │  Send button
│                      │
│ All processing is    │  Help text
│ offline              │
└──────────────────────┘
```

**Dimensions:** 24rem width × full height  
**Features:**
- Slide-in animation (right side)
- Message history scrollable
- User/assistant differentiation
- Typing indicator animation
- Input with send button
- Offline status badge

---

### 7. BUTTONS

#### Primary Button
```
[Action →]  (Blue gradient, white text, glow shadow)
HOVER: Lifted, brighter shadow
ACTIVE: Scaled down (95%)
DISABLED: Faded (opacity-50)
```

#### Secondary Button
```
[Alternate]  (Slate bg, border, gray text)
HOVER: Lighter background
ACTIVE: Scaled down
```

#### Ghost Button
```
[Subtle]  (Transparent, gray text)
HOVER: Slight background
ACTIVE: Scaled down
```

---

### 8. BADGES

#### Success
```
✓ Active  (Green background/text, green border)
```

#### Warning
```
⚠ Pending  (Yellow background/text, yellow border)
```

#### Error
```
✗ Error  (Red background/text, red border)
```

#### Info
```
ℹ 3 Projects  (Blue background/text, blue border)
```

---

### 9. TABS

#### Active Tab
```
[📄 App.tsx 🔵] ×
```
(Blue/white background, close button visible)

#### Inactive Tab
```
 📄 utils.ts 🔵 
```
(Gray background, dimmer)

**State:**
- 🔵 = Blue dot (file has unsaved changes)
- × = Close button (appears on hover)

---

### 10. FILE EXPLORER (Ready to Implement)

```
📁 src/
  ├─ 📁 components/
  │  ├─ 📄 App.tsx
  │  └─ 📄 Button.tsx
  ├─ 📁 lib/
  │  ├─ 📄 utils.ts
  │  └─ 📄 types.ts
  ├─ 📄 index.tsx
  └─ 📄 styles.css
📄 package.json
📄 tsconfig.json
```

**Features (to implement):**
- Expandable/collapsible folders
- File icons (type-based)
- Right-click context menu
- Drag & drop support
- Create/rename/delete

---

## 🎯 Component Variants & States

### Navigation Item States

```
┌────────────────┐
│ Projects       │  INACTIVE (hover: lighter bg)
└────────────────┘

┌────────────────┐
│ ◆ Projects [3] │  ACTIVE (blue bg, highlighted)
└────────────────┘

┌────────────────┐
│ Build          │  WITH NOTIFICATION (badge)
│         [●]    │
└────────────────┘
```

### Input Field States

```
[Type here...]     INACTIVE (slate-800/50 bg)

[Typing...]        FOCUSED (blue border, ring)

[Error input]      ERROR (red border, ring)
```

### Message Bubble States

```
Left-aligned bubble (AI):
┌─────────────────┐
│ AI's message    │  Gray bg, slate-800/50
│ here            │  Left-aligned
└─────────────────┘

Right-aligned bubble (User):
                ┌──────────────┐
                │ User message │  Blue bg
                │ here         │  Right-aligned
                └──────────────┘
```

---

## 🎨 Color Reference Card

### Backgrounds
- `bg-slate-950` - Main dark background
- `bg-slate-900/40` - Semi-transparent (glass)
- `bg-slate-800/50` - Input/card backgrounds
- `bg-blue-500/20` - Active highlights
- `bg-blue-500/30` - User messages

### Text
- `text-slate-50` - Main text (white)
- `text-slate-300` - Hover text
- `text-slate-400` - Secondary text
- `text-slate-500` - Tertiary text
- `text-blue-300` - Active/highlight

### Borders
- `border-slate-700/30` - Main borders (glass)
- `border-slate-700/50` - Stronger borders
- `border-blue-500/50` - Active borders

### Accents
- `from-blue-600 to-blue-500` - Gradient buttons
- `shadow-blue-500/50` - Glow effects
- `ring-blue-500/50` - Focus rings

---

## 📐 Spacing Reference

### Padding
- `px-2 py-1` - Compact (small buttons)
- `px-3 py-2` - Normal (nav items)
- `px-4 py-3` - Generous (sections)
- `p-4` - Block padding (containers)

### Margins
- `gap-1` - Compact spacing
- `gap-2` - Normal spacing
- `gap-3` - Generous spacing
- `space-y-2` - Vertical stacking

### Heights
- Header: `h-14` (56px)
- Sidebar: `w-64` (256px)
- Chat Panel: `w-96` (384px)
- Full content: Remaining space

---

## 🎬 Animation Reference

### Slide In Left (Sidebar)
```
Duration: 0.3s
Easing: ease-out
From: translateX(-100%)
To: translateX(0)
```

### Slide In Right (Chat Panel)
```
Duration: 0.3s
Easing: ease-out
From: translateX(100%)
To: translateX(0)
```

### Glow Pulse (Status Indicators)
```
Duration: 3s (infinite)
Easing: ease-in-out
0%: opacity 50%
50%: opacity 100%
100%: opacity 50%
```

### Hover Lift (Cards/Buttons)
```
Duration: 0.2s
Transform: translateY(-2px)
Shadow: shadow-lg shadow-blue-500/20
```

### Bounce (Typing Indicator)
```
Duration: 1s (infinite)
3 dots in sequence
Each dot: bounce up and down
```

---

## 🏗️ Component Tree

```
Root
├── Sidebar
│   ├── Header
│   ├── Navigation
│   │   ├── NavItem (Projects) [ACTIVE]
│   │   ├── NavItem (Build)
│   │   ├── NavItem (AI Roadmap)
│   │   └── NavItem (Settings)
│   ├── ProjectsList
│   │   ├── Expand/Collapse Button
│   │   ├── ProjectItem (E-commerce)
│   │   ├── ProjectItem (AI Assistant)
│   │   ├── ProjectItem (Mobile Game)
│   │   └── Button (New Project)
│   └── StatusFooter
├── EditorPanel
│   ├── TabBar
│   │   ├── Tab (App.tsx) [ACTIVE]
│   │   └── Tab (utils.ts)
│   └── MonacoEditor
└── ChatPanel
    ├── Header
    ├── MessageList
    │   ├── Message (AI Welcome)
    │   ├── Message (User Question)
    │   ├── Message (AI Response)
    │   └── TypingIndicator
    └── InputSection
        ├── Input Field
        └── Send Button
```

---

## 📱 Responsive Notes

**Current**: Desktop-optimized (1024px+)

**Responsive Breakpoints (Future)**:
- `sm`: 640px - Sidebar drawer
- `md`: 768px - Chat bottom sheet
- `lg`: 1024px - Current (desktop)
- `xl`: 1280px - Widescreen

---

## 🎓 Usage Examples

### Using Button Component
```tsx
<Button variant="primary" onClick={() => {}}>
  Create Project
</Button>

<Button variant="secondary" size="sm">
  Cancel
</Button>

<Button variant="ghost" disabled>
  Disabled
</Button>
```

### Using Badge
```tsx
<Badge variant="success">Online</Badge>
<Badge variant="warning">Building</Badge>
<Badge variant="error">Failed</Badge>
```

### Using NavItem
```tsx
<NavItem
  icon={<Icons.FileText />}
  label="Projects"
  isActive={activeNav === 'projects'}
  onClick={() => setActiveNav('projects')}
  badge="3"
/>
```

---

## 🚀 Performance Notes

- **Lightweight Icons**: Inline SVG (no external library)
- **CSS-only Animations**: No JavaScript animations
- **Monaco Editor**: Lazy loaded with dynamic import
- **No Layout Shifts**: Fixed dimensions for sidebar/chat
- **Minimal Dependencies**: Only @monaco-editor/react required

---

This component gallery can be used as a reference while building, and serves as a style guide for consistency throughout Topptic!

**Print this for your desk as a development reference! 🎨**
