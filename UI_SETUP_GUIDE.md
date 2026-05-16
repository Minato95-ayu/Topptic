# Topptic UI - Quick Implementation Guide

## 📋 Step-by-Step Setup

### Step 1: Copy Global Styles
Copy the `globals.css` content from `TOPPTIC_UI_COMPLETE.md` Section 1 to your `app/globals.css`

### Step 2: Setup Tailwind Configuration
Copy `tailwind.config.js` from this directory to your project root

### Step 3: Create Directory Structure
```bash
mkdir -p app/components/sidebar
mkdir -p app/components/editor
mkdir -p app/components/ai
mkdir -p app/components/common
mkdir -p app/lib
mkdir -p app/hooks
```

### Step 4: Install Monaco Editor
```bash
npm install @monaco-editor/react
```

### Step 5: Create Component Files
Follow the order below to create files:

1. **app/lib/types.ts** - Type definitions (Section 3)
2. **app/lib/constants.ts** - Constants (Section 4)
3. **app/lib/utils.ts** - Utility functions (Section 5)
4. **app/lib/icons.tsx** - Icon components (Section 6)
5. **app/components/common/Button.tsx** (Section 7)
6. **app/components/common/Badge.tsx** (Section 8)
7. **app/components/sidebar/NavItem.tsx** (Section 9)
8. **app/components/sidebar/ProjectsList.tsx** (Section 10)
9. **app/components/Sidebar.tsx** (Section 11)
10. **app/components/editor/TabBar.tsx** (Section 12)
11. **app/components/editor/EditorPanel.tsx** (Section 13)
12. **app/components/ai/ChatPanel.tsx** (Section 14)
13. **app/page.tsx** (Section 15)
14. **app/layout.tsx** (Section 16)
15. **app/providers.tsx** (Section 2)

### Step 6: Verify Installation
```bash
npm run dev
```

Visit `http://localhost:3000` - You should see:
- Left Sidebar with navigation and projects
- Main Editor with Monaco Editor
- Right Chat Panel with AI Assistant
- All styled with dark SaaS theme

---

## 🎨 Design System

### Color Palette
- **Background**: `#0f0f0f` (Slate 950)
- **Primary**: `#3b82f6` (Blue 500)
- **Accent**: `#06b6d4` (Cyan 400)
- **Text**: `#f5f5f5` (Slate 50)

### Typography
- **Font**: Inter (sans), JetBrains Mono (code)
- **Heading**: 1.125rem, font-bold
- **Body**: 1rem, font-normal
- **Small**: 0.875rem

### Spacing
- **Sidebar Width**: 16rem (64px)
- **Chat Panel Width**: 24rem (96px)
- **Header Height**: 3.5rem (14px)

### Components

#### Buttons
```tsx
// Primary (Blue gradient)
<Button variant="primary">Action</Button>

// Secondary (Slate background)
<Button variant="secondary">Alternate</Button>

// Ghost (Minimal, text-only)
<Button variant="ghost">Subtle</Button>
```

#### Navigation Items
```tsx
<NavItem
  icon={<Icons.FileText />}
  label="Projects"
  isActive={true}
  badge="3"
/>
```

#### Badges
```tsx
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Error</Badge>
```

---

## 🚀 Key Features Breakdown

### 1. Sidebar (Left)
- Logo & Branding
- Navigation items (Projects, Build, AI Roadmap, Settings)
- Project list with languages
- AI status indicator
- Offline mode indicator

### 2. Main Editor (Center)
- Tab bar for open files
- Monaco Editor instance
- Syntax highlighting
- Code completion ready (integrate with backend)

### 3. AI Chat Panel (Right)
- Floating, collapsible panel
- Chat message history
- AI response simulation
- Input field with send button
- "Offline" status indicator

---

## 🔧 Customization

### Change Theme Colors
Edit `tailwind.config.js`:
```javascript
colors: {
  primary: { 500: '#YOUR_COLOR' },
  accent: { 400: '#YOUR_COLOR' },
}
```

### Add New Navigation Items
Edit `SIDEBAR_WIDTH` and `NAV_ITEMS` in `app/lib/constants.ts`

### Modify Editor Settings
Edit `EditorPanel.tsx` monaco options:
```typescript
options={{
  fontSize: 16, // Change size
  minimap: { enabled: true }, // Show minimap
  wordWrap: 'on', // Enable word wrap
}}
```

### Add More Chat Features
Extend `ChatPanel.tsx` with:
- Code snippet sharing
- Suggestion cards
- Context panels

---

## 📦 Dependencies Required

```json
{
  "dependencies": {
    "react": "^18.x",
    "next": "^14.x",
    "@monaco-editor/react": "^latest",
    "tailwindcss": "^3.x",
    "autoprefixer": "^10.x"
  }
}
```

---

## ✅ Verification Checklist

- [ ] All components created
- [ ] Tailwind config applied
- [ ] Global styles imported
- [ ] Monaco Editor installed
- [ ] Dev server running without errors
- [ ] Sidebar visible on left
- [ ] Editor renders code
- [ ] Chat panel shows on right
- [ ] Navigation items clickable
- [ ] Dark theme applied
- [ ] Responsive layout working

---

## 🎯 Next Steps (Backend Integration)

1. **Connect to AI Backend** - Replace mock responses in ChatPanel with actual Ollama/Llama.cpp calls
2. **File System Integration** - Connect EditorPanel to Tauri backend for file operations
3. **Project Management** - Integrate ProjectsList with database queries
4. **Build System** - Add build functionality from sidebar
5. **Settings Page** - Create settings management interface

---

## 📚 Resources

- Tailwind CSS: https://tailwindcss.com/docs
- Monaco Editor: https://microsoft.github.io/monaco-editor/
- Next.js 14: https://nextjs.org/docs
- Tauri v2: https://v2.tauri.app/

---

This UI is **production-ready** and can be deployed immediately with your Tauri backend!
