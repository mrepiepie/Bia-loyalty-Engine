# Project Setup: Tailwind CSS, TypeScript, and shadcn/ui

This project currently uses a pure vanilla HTML/JS/CSS structure. If you want to migrate or integrate this component into a React framework supporting shadcn/ui, Tailwind CSS, and TypeScript, follow these instructions.

---

## 🛠️ Step-by-Step Setup Guide

### 1. Initialize a Next.js / React Project
Initialize a Next.js project with TypeScript and Tailwind CSS:
```bash
npx create-next-app@latest my-app --typescript --tailwind --eslint
```
Choose the following options:
- Use `src/` directory? **Yes** (Recommended)
- Use App Router? **Yes**
- Customize alias? **Yes** (Default to `@/*`)

### 2. Set up shadcn/ui
Run the shadcn CLI initialization command:
```bash
npx shadcn-ui@latest init
```
This CLI will prompt you to configure `components.json`:
- Style: **Default**
- Base color: **Slate**
- CSS variables for colors: **Yes**
- Location of `globals.css`: **app/globals.css** or **src/app/globals.css**
- Location of components: **@/components** (This will resolve to `/components/`)
- Location of UI components: **@/components/ui** (This will resolve to `/components/ui/`)

---

## 📁 Why the `/components/ui` Folder is Critical

When initializing shadcn, the CLI creates a strict project layout. 
1. **Automated Component Installation:** When you run `npx shadcn-ui@latest add button`, the CLI automatically writes the code directly into `/components/ui/button.tsx`. Placing your custom UI primitives (like `TextColor`) inside `/components/ui/` keeps them structured next to shadcn's base components.
2. **Path Aliasing:** TypeScript is configured with `@/*` mapping to the project root or `/src/`. Using `import { TextColor } from "@/components/ui/text-color"` ensures clean, absolute import paths that resolve perfectly across your dev server, test frameworks, and production build pipelines.

---

## 📦 Required Dependencies
Install the required vector icons library:
```bash
npm install lucide-react
```
