# Topptic UI - Visual Design & Layout Specification

## 🎨 Complete Layout Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TOPPTIC - Ultra-Fast App Dev Engine       │
├──────────────┬──────────────────────────────────────┬────────────┤
│              │                                      │            │
│   SIDEBAR    │          MONACO EDITOR              │  AI PANEL  │
│   (16rem)    │         (Flexible Center)           │  (24rem)   │
│              │                                      │            │
│  ┌─────────┐ │  ┌────────────────────────────────┐ │ ┌────────┐ │
│  │ LOGO    │ │  │ TAB BAR                        │ │ │ AI     │ │
│  │ Topptic │ │  │ App.tsx │ utils.ts │ +        │ │ │ ASST   │ │
│  │ v0.1.0  │ │  └────────────────────────────────┘ │ └────────┘ │
│  └─────────┘ │                                      │            │
│              │  ┌────────────────────────────────┐ │ ┌────────┐ │
│  Navigation  │  │                                │ │ │ Msg 1  │ │
│  ◆ Projects  │  │   CODE EDITOR AREA             │ │ ├────────┤ │
│  ◆ Build     │  │                                │ │ │ Msg 2  │ │
│  ◆ AI Road   │  │   import React from 'react';   │ │ │ (AI)   │ │
│  ◆ Settings  │  │                                │ │ ├────────┤ │
│              │  │   export const App = () => {   │ │ │ Input  │ │
│  Projects    │  │     return (...)               │ │ │ [ Send]│ │
│  ─────────── │  │   }                            │ │ └────────┘ │
│  📁 E-com    │  │                                │ │ Powered by │
│  📁 AI Asst  │  │                                │ │ Llama.cpp  │
│  📁 Game     │  │                                │ │            │
│  + New       │  │                                │ │ Offline ✓  │
│              │  │                                │ │            │
│  Status      │  │                                │ │            │
│  🟢 Ready    │  └────────────────────────────────┘ │            │
│  Offline     │                                      │            │
└──────────────┴──────────────────────────────────────┴────────────┘
```

---

## 📱 Component Layout Details

### LEFT SIDEBAR (16rem width)

#### Header Section
```
┌─────────────────────┐
│ ┌─────────────────┐ │
│ │ T   Topptic     │ │  Logo + Branding
│ └─────────────────┘ │  - Gradient background (Blue → Cyan)
│ v0.1.0              │  - Bold typography
└─────────────────────┘
```

#### Navigation Section
```
┌─────────────────────┐
│ ◆ Projects      [3] │  Active state: Blue background
│ ◆ Build             │  Hover: Slate 800
│ ◆ AI Roadmap        │  Icon + label + optional badge
│ ◆ Settings          │
└─────────────────────┘
```

#### Projects List Section
```
┌─────────────────────┐
│ ▼ Projects          │  Expandable/collapsible
│  📁 E-commerce App  │
│     TypeScript      │  Folder icon + name + lang
│  📁 AI Assistant    │
│     Python          │
│  📁 Mobile Game     │
│     Rust            │
│  ┌──────────────┐   │
│  │ + New Project│   │  Button to add project
│  └──────────────┘   │
└─────────────────────┘
```

#### Status Footer
```
┌─────────────────────┐
│ 🟢 AI Engine: Ready │  Green dot indicates online
│ Offline mode        │  Status text below
└─────────────────────┘
```

**Color Scheme:**
- Background: `bg-slate-900/40` with backdrop blur
- Border: `border-slate-700/30`
- Text: `text-slate-400` (inactive), `text-slate-300` (hover)
- Active: `bg-blue-500/20` border `border-blue-500/50` text `text-blue-300`

---

### CENTER EDITOR (Flexible)

#### Tab Bar
```
┌────────────────────────────────────────────────────────┐
│ 📄 App.tsx 🔵 │ 📄 utils.ts 🔵 │ [+ New Tab Area]    │
└────────────────────────────────────────────────────────┘
```
- Active tab: White/blue background
- Inactive tab: Gray background
- 🔵 Blue dot: Indicates unsaved changes
- Close button (×) on hover

#### Monaco Editor Area
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  1  import React from 'react';                         │
│  2  import { useState } from 'react';                  │
│  3                                                     │
│  4  export const App = () => {                         │
│  5    const [count, setCount] = useState(0);           │
│  6                                                     │
│  7    return (                                         │
│  8      <div className="app">                          │
│  9        <h1>Count: {count}</h1>                      │
│ 10        <button onClick={() => setCount(c => c+1)}> │
│ 11          Increment                                  │
│ 12        </button>                                    │
│ 13      </div>                                         │
│ 14    );                                               │
│ 15  };                                                 │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Features:**
- Line numbers
- Syntax highlighting (TypeScript/JavaScript colors)
- Code folding
- No minimap (minimal UI)
- Font: JetBrains Mono, 14px
- Padding: 16px top/bottom

---

### RIGHT AI CHAT PANEL (24rem width)

#### Header
```
┌────────────────────┐
│ AI Assistant       │  Title
│ Powered by Llama   │  Subtitle
└────────────────────┘
```

#### Messages Area
```
┌────────────────────────────────────┐
│ [Welcome message from AI]           │  Left-aligned, gray bg
│ Rounded box, scrollable area        │
│                                     │
│ [User message: "How do I debug?"]   │  Right-aligned, blue bg
│                                     │
│ [AI response about debugging]       │  Left-aligned, gray bg
│                                     │
│ ⏳ (typing indicator)               │  3 bouncing dots
└────────────────────────────────────┘
```

#### Input Section
```
┌────────────────────────────────────┐
│ [Input field] [Send →]             │
│                                     │
│ All processing happens offline     │  Help text
│ on your machine                     │
└────────────────────────────────────┘
```

**Styling:**
- User messages: `bg-blue-500/30` border `border-blue-500/50`
- Assistant messages: `bg-slate-800/50` border `border-slate-700/50`
- Messages have rounded corners and padding
- Input field uses `.input-base` class

---

## 🎨 Color Token Reference

### Semantic Colors
```css
--background: #0f0f0f        /* Main background */
--foreground: #f5f5f5        /* Main text */
--primary: #3b82f6           /* Primary actions (Blue) */
--primary-dark: #1e40af      /* Darker blue */
--accent: #06b6d4            /* Accent color (Cyan) */
```

### Slate Palette (Dark Theme)
```
slate-950: #0f0f0f  (Darkest - used for background)
slate-900: #0f172a  (Dark - sidebar background)
slate-800: #1e293b  (Medium-dark - hover states)
slate-700: #334155  (Medium - borders)
slate-600: #475569  (Medium-light)
slate-500: #64748b  (Light - secondary text)
slate-400: #94a3b8  (Lighter - hover text)
slate-300: #cbd5e1  (Light)
slate-50:  #f8fafc  (Lightest - main text)
```

### Status Colors
```
green-500:  #22c55e  (Online, success - glow effect)
yellow-500: #eab308  (Idle, warning)
red-500:    #ef4444  (Offline, error)
```

---

## ✨ Interactive States

### Button States
```
NORMAL:   bg-blue-500 text-white
HOVER:    shadow-lg shadow-blue-500/50 -translate-y-0.5
ACTIVE:   scale-95
DISABLED: opacity-50 cursor-not-allowed
```

### Navigation Item States
```
INACTIVE: text-slate-400
HOVER:    bg-slate-800/50 text-slate-300
ACTIVE:   bg-blue-500/20 border-blue-500/50 text-blue-300
```

### Input States
```
DEFAULT:  bg-slate-800/50 border-slate-700
FOCUS:    border-blue-500 ring-1 ring-blue-500/50
ERROR:    border-red-500 ring-red-500/50
```

---

## 🎬 Animations

### Slide In (0.3s ease-out)
- Sidebar: Slides from left
- Chat Panel: Slides from right

### Glow Pulse (3s ease-in-out infinite)
- Status indicators (green dot)
- Badge animations

### Bounce (1s infinite)
- Typing indicator dots in chat

### Hover Lift (0.2s)
- Cards and buttons
- Translate Y -2px
- Add shadow

---

## 📐 Spacing & Layout Grid

### Sidebar
- Total width: 16rem (256px)
- Header padding: px-6 py-4
- Section padding: px-4 py-3
- Item height: py-3 (12px)
- Footer padding: px-4 py-3

### Editor
- Tab bar height: py-2 (8px)
- Content padding: Automatic (Monaco handles)

### Chat Panel
- Total width: 24rem (384px)
- Header padding: px-4 py-3
- Messages padding: px-4 py-4
- Input padding: p-4
- Spacing between sections: space-y-3

---

## 🔤 Typography

### Headings
- Size: 1.125rem (18px)
- Weight: bold (700)
- Line height: 1.75rem
- Color: slate-50 (white)

### Body Text
- Size: 1rem (16px)
- Weight: normal (400)
- Line height: 1.5rem
- Color: slate-400 (gray)

### Small Text
- Size: 0.875rem (14px)
- Weight: normal (400)
- Color: slate-500 (lighter gray)

### Code/Monospace
- Font: JetBrains Mono or Fira Code
- Size: 0.875rem (14px)
- Line height: 1.5
- Color: Syntax highlighting

---

## 📊 Responsive Behavior

### Current: Desktop Optimized
- Fixed sidebar width: 16rem
- Fixed chat panel width: 24rem
- Center editor takes remaining space

### Future: Mobile Support (if needed)
- Sidebar: Drawer/modal on mobile
- Chat: Bottom sheet or overlay
- Editor: Full width

---

## 🎯 UI State Scenarios

### Scenario 1: Fresh Start
- Sidebar: Projects navigation visible
- Editor: Welcome/template code displayed
- Chat: Welcome message from AI
- All panels visible

### Scenario 2: Coding Session
- Sidebar: Active project highlighted
- Editor: User's code visible, dirty indicator
- Chat: Multiple messages showing context
- Chat panel may be minimized

### Scenario 3: AI Assistance
- Editor: Code selected or cursor visible
- Chat: AI suggests improvements
- Both visible side-by-side

---

## 📝 Component Hierarchy

```
RootLayout
├── Sidebar
│   ├── Header (Logo)
│   ├── NavItem (x4)
│   ├── ProjectsList
│   │   └── NavItem (Project items)
│   └── StatusFooter
├── Main Content
│   ├── EditorPanel
│   │   ├── TabBar
│   │   │   └── Tab (x n)
│   │   └── MonacoEditor
│   └── ChatPanel
│       ├── Header
│       ├── Messages
│       │   └── Message (x n)
│       └── Input Section
│           ├── Input
│           └── Button (Send)
└── FloatingButton (Toggle Chat)
```

---

This visual specification matches the code provided in `TOPPTIC_UI_COMPLETE.md`. All measurements, colors, and interactions are precisely defined for pixel-perfect implementation!
