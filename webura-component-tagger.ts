import { parse } from "@babel/parser";
import MagicString from "magic-string";
import fs from "node:fs";
import path from "node:path";
import { walk } from "estree-walker";
import type { Plugin } from "vite";

// Vendored Webura component tagger (kept local instead of an npm package).
// Adds data-webura-id / data-webura-name attributes to JSX elements so the
// Webura editor can map a clicked element back to its source location. Unlike a
// published plugin, this has no `apply` restriction — it runs in both dev
// (serve) and the static production builds used for web previews.

const VALID_EXTENSIONS = new Set([".jsx", ".tsx"]);

// Known HTML + SVG host element names. Used to decide whether a *lowercase* JSX
// element is a real DOM node (safe to tag with data-webura-* attributes) versus a
// custom intrinsic from a non-DOM renderer like react-three-fiber (`<mesh>`,
// `<group>`, `<boxGeometry>`, `<ambientLight>`, …). Setting a `data-webura-*` prop
// on those throws inside R3F ("Cannot set data-webura-name. Ensure it is an object
// …"), so they must NOT be tagged. `line` is intentionally omitted: it is both an
// SVG element and an R3F element, and tagging the R3F one breaks — losing the tag
// on a bare SVG <line> is harmless.
const HOST_DOM_TAGS = new Set<string>([
  // HTML
  "a",
  "abbr",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "bdi",
  "bdo",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "menu",
  "meta",
  "meter",
  "nav",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "param",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "script",
  "section",
  "select",
  "slot",
  "small",
  "source",
  "span",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
  // SVG
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "polyline",
  "polygon",
  "rect",
  "text",
  "tspan",
  "defs",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "pattern",
  "image",
  "use",
  "symbol",
  "marker",
  "filter",
  "foreignObject",
  "textPath",
  "switch",
  "desc",
  "metadata",
  "feGaussianBlur",
  "feOffset",
  "feBlend",
  "feColorMatrix",
  "feMerge",
  "feMergeNode",
]);

// Memoized "does this app use react-three-fiber?" keyed by the resolved
// package.json path. R3F is injected only on 3D-intent prompts (and otherwise
// only present when the model added it), so the dependency is a precise signal
// that the app has a WebGL element tree somewhere.
const r3fAppCache = new Map<string, boolean>();

/**
 * Walk up from a source file to its nearest package.json and report whether the
 * app depends on `@react-three/fiber`. Used to decide, app-wide, that capitalized
 * components must not be tagged (see `shouldTagElement`). Bare `three` is NOT a
 * trigger — imperative three.js has no JSX intrinsics to break.
 */
function appUsesR3F(fileId: string): boolean {
  let dir = path.dirname(fileId);
  for (let i = 0; i < 12; i++) {
    const pkgPath = path.join(dir, "package.json");
    const cached = r3fAppCache.get(pkgPath);
    if (cached !== undefined) return cached;
    let uses = false;
    let found = false;
    try {
      if (fs.existsSync(pkgPath)) {
        found = true;
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        uses =
          !!pkg?.dependencies?.["@react-three/fiber"] ||
          !!pkg?.devDependencies?.["@react-three/fiber"];
      }
    } catch {
      uses = false;
      found = true; // a malformed package.json here is still "the root"; stop.
    }
    if (found) {
      r3fAppCache.set(pkgPath, uses);
      return uses;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return false;
}

/**
 * True when this JSX element should receive data-webura-* attributes.
 *
 * react-three-fiber renders JSX into three.js objects (NOT the DOM). Setting a
 * data-webura-* prop on a three object throws inside R3F ("Cannot convert
 * undefined to object" / "Cannot set data-webura-name"), which floods the console
 * and trips the preview error overlay even though the page itself renders. We
 * already skip lowercase R3F intrinsics (`<mesh>`, `<group>`) via HOST_DOM_TAGS,
 * but a scene also uses CAPITALIZED R3F / drei components (`<Canvas>`,
 * `<OrbitControls>`) and — the case static per-file analysis can't see — user
 * components that spread props onto a mesh (`function Cloud(p){return <mesh {...p}/>}`)
 * invoked from an intermediate file that imports nothing from R3F. So context:
 *   - `inCanvas` — inside a `<Canvas>` subtree → tag nothing.
 *   - `sceneFragmentFile` — a split-out scene file (imports R3F/three, no local
 *     `<Canvas>`) → don't tag capitalized components.
 *   - `appUsesR3F` — the WHOLE app depends on react-three-fiber → never tag ANY
 *     capitalized component (it may render into the R3F tree directly or via a
 *     prop-spreading child). Click-select still works: it resolves against tagged
 *     DOM host elements, which are unaffected.
 * Otherwise the original rule stands: components + HTML/SVG host tags are tagged.
 */
function shouldTagElement(
  tagName: string,
  ctx: { inCanvas: boolean; sceneFragmentFile: boolean; appUsesR3F: boolean },
): boolean {
  // Everything inside a WebGL canvas is a three object / drei component.
  if (ctx.inCanvas) return false;
  const first = tagName[0];
  const isComponent =
    !!first && first === first.toUpperCase() && first !== first.toLowerCase();
  if (isComponent) {
    return !ctx.sceneFragmentFile && !ctx.appUsesR3F;
  }
  return HOST_DOM_TAGS.has(tagName) || tagName.includes("-");
}

/**
 * Resolve a JSX opening-element name to a taggable name. Handles plain
 * identifiers (`div`, `Button`) AND member-expression tags such as
 * framer-motion's `motion.h1` / `motion.div` (and compound components like
 * `Accordion.Item`), which render real DOM and were previously skipped — leaving
 * whole animated hero sections untaggable. Returns the LEAF name (for the
 * host/component decision — `motion.h1` → `h1`), the full dotted display name,
 * and the source end offset to inject after.
 */
function readJsxTagName(
  nameNode: any,
): { check: string; display: string; end: number | null } | null {
  if (nameNode?.type === "JSXIdentifier") {
    return {
      check: nameNode.name,
      display: nameNode.name,
      end: nameNode.end ?? null,
    };
  }
  if (nameNode?.type === "JSXMemberExpression") {
    const parts: string[] = [];
    const collect = (n: any) => {
      if (n?.type === "JSXMemberExpression") {
        collect(n.object);
        if (n.property?.name) parts.push(n.property.name);
      } else if (n?.type === "JSXIdentifier") {
        parts.push(n.name);
      }
    };
    collect(nameNode);
    const leaf = parts[parts.length - 1];
    if (!leaf) return null;
    return { check: leaf, display: parts.join("."), end: nameNode.end ?? null };
  }
  return null;
}

/** Returns a Vite / esbuild plug-in. */
export default function weburaComponentTagger(): Plugin {
  return {
    name: "vite-plugin-webura-tagger",
    enforce: "pre",

    async transform(code: string, id: string) {
      try {
        // Ignore non-jsx files and files inside node_modules
        if (
          !VALID_EXTENSIONS.has(path.extname(id)) ||
          id.includes("node_modules")
        )
          return null;

        const ast = parse(code, {
          sourceType: "module",
          plugins: ["jsx", "typescript"],
        });

        const ms = new MagicString(code);
        const fileRelative = path.relative(process.cwd(), id);

        // A file that imports react-three-fiber / drei but has no local `<Canvas>`
        // is a split-out scene fragment — its capitalized elements are R3F / scene
        // components mounted inside a Canvas elsewhere, so tagging them would break
        // R3F. (Bare `three` is NOT a trigger: imperative three.js renders into a
        // `<div ref>`, so those files tag normally.)
        const importsR3F = /from\s*['"]@react-three\/(?:fiber|drei)['"]/.test(
          code,
        );
        const hasLocalCanvas = /<Canvas[\s/>]/.test(code);
        const sceneFragmentFile = importsR3F && !hasLocalCanvas;

        // App-wide signal: if the app depends on react-three-fiber, a capitalized
        // component anywhere may end up in the R3F tree (directly or via a
        // prop-spreading child in another file), so none are tagged.
        const appIsR3F = appUsesR3F(id);

        // Depth of the current `<Canvas>` subtree — everything inside is a WebGL
        // object, never a DOM node.
        let canvasDepth = 0;

        walk(ast as any, {
          enter(node: any) {
            try {
              // Track entry into a `<Canvas>` element so its whole subtree is
              // skipped (marked on the node so `leave` can decrement exactly).
              if (node.type === "JSXElement") {
                if (
                  node.openingElement?.name?.type === "JSXIdentifier" &&
                  node.openingElement.name.name === "Canvas"
                ) {
                  canvasDepth++;
                  node.__weburaInCanvas = true;
                }
                return;
              }

              if (node.type !== "JSXOpeningElement") return;

              // ── 1. Extract the tag / component name (handles member-expression
              // tags like framer-motion's `motion.h1`, not just identifiers). ──
              const parsedName = readJsxTagName(node.name);
              if (!parsedName) return;
              const tagName = parsedName.check;
              if (!tagName) return;

              // ── 1b. Skip R3F/three elements (see shouldTagElement) so we
              // never set data-webura-* on a three object (which throws). ─────
              if (
                !shouldTagElement(tagName, {
                  inCanvas: canvasDepth > 0,
                  sceneFragmentFile,
                  appUsesR3F: appIsR3F,
                })
              )
                return;

              // ── 2. Skip if it already has data-webura-id ─────────────────
              const alreadyTagged = node.attributes?.some(
                (attr: any) =>
                  attr.type === "JSXAttribute" &&
                  attr.name?.name === "data-webura-id",
              );
              if (alreadyTagged) return;

              // ── 3. Build the id "relative/file.jsx:line:column" ──────────
              const loc = node.loc?.start;
              if (!loc) return;
              const weburaId = `${fileRelative}:${loc.line}:${loc.column}`;

              // ── 4. Inject the attributes just after the tag name ─────────
              if (parsedName.end != null) {
                ms.appendLeft(
                  parsedName.end,
                  ` data-webura-id="${weburaId}" data-webura-name="${parsedName.display}"`,
                );
              }
            } catch (error) {
              console.warn(
                `[webura-tagger] Warning: Failed to process JSX node in ${id}:`,
                error,
              );
            }
          },
          leave(node: any) {
            if (node.type === "JSXElement" && node.__weburaInCanvas) {
              canvasDepth--;
            }
          },
        });

        // If nothing changed bail out.
        if (ms.toString() === code) return null;

        return {
          code: ms.toString(),
          map: ms.generateMap({ hires: true }),
        };
      } catch (error) {
        console.warn(
          `[webura-tagger] Warning: Failed to transform ${id}:`,
          error,
        );
        return null;
      }
    },
  };
}
