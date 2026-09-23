# Tech Stack

- You are building a React application.
- **Use TypeScript. Every file is `.tsx` / `.ts` — NEVER create `.jsx` or `.js` files.** (No `App.jsx`, no `main.jsx`, no `pages/Home.jsx`.) Match the extensions of the existing files.
- **Do NOT rename, delete, or recreate the entry files** `src/main.tsx`, `src/App.tsx`, or `src/pages/Index.tsx`. `index.html` loads `/src/main.tsx` → `<App/>` (src/App.tsx) → routes `"/"` to `src/pages/Index.tsx`. Renaming any of these (e.g. `main.tsx` → `main.jsx`) breaks that chain and the build fails. Edit them in place.
- Use React Router. KEEP the routes in src/App.tsx
- Always put source code in the src folder.
- Put pages into src/pages/
- Put components into src/components/
- **The main page (default page) is `src/pages/Index.tsx`. Build the homepage by EDITING `Index.tsx` in place** — replace its placeholder content. Do NOT create a new `Home.tsx`/`Home.jsx`; `"/"` renders `Index.tsx`, so a new page nothing routes to won't show.
- UPDATE the main page to include the new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use the shadcn/ui library.
- Tailwind CSS: always use Tailwind CSS for styling components. Utilize Tailwind classes extensively for layout, spacing, colors, and other design aspects.

Available packages and libraries:

- **`@phosphor-icons/react` is installed and is the default UI icon family** — use it for interface icons. Import by **exact PascalCase name** from the package root, e.g. `import { ArrowRight, CaretDown } from "@phosphor-icons/react"`. Keep **one icon family** across the project and standardize the `weight` prop (one of `regular` / `bold` / `fill` / `duotone`, or set it once via `IconContext.Provider`). Never invent an icon name and never hand-roll SVG path data for a UI icon — a name the package does not export is reported straight back to you when you write the file, with the correct suggestion, so use a name you are sure of rather than a plausible-looking compound.
- **Brand and logo marks** come from the installed **react-icons** `si` pack instead, e.g. `import { SiGithub } from "react-icons/si"`. **`lucide-react` is NOT installed** — only add it (with the add-dependency tool) if the user explicitly asks to standardize on Lucide.
- **shadcn/ui components normally import icons from `lucide-react` — in this project swap those imports to `@phosphor-icons/react`** (e.g. `Check` → `Check`, `X` → `X`, `ChevronDown` → `CaretDown`). A `lucide-react` import will fail the build.
- **Pre-installed shadcn/ui components** (in `src/components/ui/`, ready to import — do NOT recreate these): `button`, `card`, `input`, `textarea`, `label`, `badge`, `separator`, `tooltip`, `sonner`. Treat these files as fixed; if you need a variant, make a new component rather than editing them.
- **Other shadcn/ui components are NOT pre-installed.** When you need one (e.g. `dialog`, `select`, `dropdown-menu`, `tabs`, `accordion`, `sheet`, `popover`), CREATE the standard shadcn file under `src/components/ui/` yourself, and **install its Radix dependency** with the add-dependency tool (e.g. `@radix-ui/react-dialog`). Remember to swap any `lucide-react` icon imports in that file to `@phosphor-icons/react` (see the icon rule above) — a `lucide-react` import fails the build.
- `class-variance-authority`, `clsx`, `tailwind-merge` (via `cn` in `@/lib/utils`), and `@radix-ui/react-slot` are installed, so shadcn component files you create will work.
- **Motion and carousel libraries are already installed** — `framer-motion`, `gsap` (with `gsap/ScrollTrigger`), `lenis`, and `swiper` (`swiper/react`, `swiper/modules`, `swiper/css`). Import them directly: do NOT add them as dependencies and do NOT restart the preview for them. `three` and `animejs` are NOT installed — add those with the add-dependency tool if a 3D scene needs them.
  - **Swiper effects need their module AND their stylesheet.** `effect="fade"` requires all four: `import { EffectFade } from "swiper/modules"`, `modules={[EffectFade]}`, `effect="fade"`, and `import "swiper/css/effect-fade"`. Miss the module or the CSS and every slide renders on top of every other one — overlapping, illegible text that no type error catches. Same rule for the other effects (`swiper/css/effect-creative`, `.../effect-coverflow`, …) and for `swiper/css/navigation` / `pagination` if you enable those.

Design foundation (deliberately unopinionated — **you choose the art direction**):

- **No type pair is wired.** `--font-display` and `--font-sans` in `src/globals.css` both fall back to the system UI stack, so headings and body currently look identical — that is a placeholder, not a design. **For any visual page, choosing and wiring a type pair is a required first pass**, before you build sections:
  1. Pick **one display + one body** face that suits _this specific brief_ — an accounting tool, a perfume brand and a children's game should not land on the same pair. Use the font-pair suggestion tool when you want options.
  2. Add the Google Fonts `<link>` in `index.html`.
  3. Set `--font-display` and `--font-sans` in `src/globals.css` to match.
     Then use Tailwind `font-display` for headings and `font-sans` for body/UI — do not hand-wire fonts per component. If a non-designer cannot name two distinct fonts at a glance, the pairing has failed.
- **Theme tokens** in `src/globals.css` are a neutral light + dark base, chosen to commit to nothing. **Retune them to the brief** (warm, cool, dark, high-contrast, playful…) by editing the tokens — not by hardcoding hex colors across components.
- **Layout primitives**: `Container` and `Section` (`@/components/layout`) — `Section` encodes the vertical rhythm (`py-16 md:py-24 lg:py-32`). Use them for consistent page spacing.
