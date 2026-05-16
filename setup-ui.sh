#!/bin/bash

# Topptic UI Setup Script
# This creates all necessary directories and component files

PROJECT_DIR="${1:-.}"

# Create directory structure
mkdir -p "$PROJECT_DIR/app/components"
mkdir -p "$PROJECT_DIR/app/components/editor"
mkdir -p "$PROJECT_DIR/app/components/sidebar"
mkdir -p "$PROJECT_DIR/app/components/ai"
mkdir -p "$PROJECT_DIR/app/components/common"
mkdir -p "$PROJECT_DIR/app/lib"
mkdir -p "$PROJECT_DIR/app/styles"
mkdir -p "$PROJECT_DIR/app/hooks"

echo "✅ Directory structure created successfully"
echo ""
echo "Next, create the following component files:"
echo "1. app/layout.tsx"
echo "2. app/page.tsx"
echo "3. app/providers.tsx"
echo "4. app/globals.css"
echo "5. app/tailwind.config.ts"
echo ""
echo "Components to create:"
echo "- app/components/Sidebar.tsx"
echo "- app/components/sidebar/NavItem.tsx"
echo "- app/components/sidebar/ProjectsList.tsx"
echo "- app/components/editor/EditorPanel.tsx"
echo "- app/components/editor/FileExplorer.tsx"
echo "- app/components/editor/TabBar.tsx"
echo "- app/components/ai/ChatPanel.tsx"
echo "- app/components/ai/SuggesterPanel.tsx"
echo "- app/components/common/Button.tsx"
echo "- app/components/common/Icon.tsx"
echo "- app/hooks/useEditor.ts"
echo "- app/hooks/useAI.ts"
