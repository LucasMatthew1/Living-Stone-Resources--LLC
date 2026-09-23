/* ============================================================================
 * Preview scrollbar — match the Webura chat's "sleek pill" scrollbar so the
 * preview reads as part of the same surface. Injected unconditionally into every
 * preview (this file loads in the preview head); scoped to the iframe document,
 * so it never touches the published build. No !important, so a generated app that
 * deliberately styles its own scrollbar still wins.
 * ==========================================================================*/
(() => {
  if (
    typeof document === "undefined" ||
    document.getElementById("webura-scrollbar-style")
  )
    return;
  const style = document.createElement("style");
  style.id = "webura-scrollbar-style";
  style.textContent = [
    "html{scrollbar-width:thin;scrollbar-color:rgba(148,163,184,.4) transparent}",
    "::-webkit-scrollbar,::-webkit-scrollbar-corner{background:transparent;width:12px;height:12px}",
    "::-webkit-scrollbar-thumb{background:content-box currentColor;border:3px solid transparent;border-radius:9999px;color:rgba(148,163,184,.35);min-height:40px;min-width:40px}",
    ":hover::-webkit-scrollbar-thumb{color:rgba(148,163,184,.5)}",
    "::-webkit-scrollbar-thumb:active{color:rgba(148,163,184,.7)}",
    "::-webkit-scrollbar-button{width:0;height:0}",
  ].join("\n");
  (document.head || document.documentElement).appendChild(style);
})();

/* ============================================================================
 * Shared edit-mode controller (window.__weburaEdit)
 * ----------------------------------------------------------------------------
 * Freezes the running preview app while ANY in-preview editing tool is active,
 * so hovering / clicking / dragging isn't fought by CSS animations, auto-cycling
 * carousels/testimonials, hover effects, or link/keyboard/form navigation.
 * Reference-counted: every tool calls acquire() in its activate() and release()
 * in its deactivate(); suppression installs on the 0->1 transition and is fully
 * restored on 1->0. Works unchanged under both the current 3-independent-tools
 * model and a future single edit-mode toggle.
 * ==========================================================================*/
(() => {
  if (window.__weburaEdit) return; // guard against double-injection

  let refs = 0;
  let styleNode = null;
  let originalSetInterval = null;
  const expandedCollapsibles = []; // { el, kind } we opened, restored on exit
  let attemptedExpand = new WeakSet(); // triggers already clicked (avoid re-toggle)
  let syntheticClickDepth = 0; // >0 while dispatchSyntheticClick runs
  let contentObserver = null; // watches for collapsibles/carousels mounted later

  const BLOCKED_EVENTS = [
    "dblclick",
    "auxclick",
    "submit",
    "keydown",
    "keypress",
    "keyup",
  ];

  const isEditable = (el) =>
    !!el &&
    (el.isContentEditable === true ||
      el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.tagName === "SELECT");

  // Swallow stray app interactions the per-tool click handlers don't cover
  // (keyboard link activation, middle-click open-in-tab, form submit, dblclick).
  // Carve-outs: never block Escape (tools exit on it), never block while typing
  // into an editable element, and let modifier combos (shortcuts) through.
  // mousemove/pointermove are deliberately untouched so hover detection works.
  function blockEvent(e) {
    if (e.type === "keydown" || e.type === "keypress" || e.type === "keyup") {
      if (e.key === "Escape") return;
      if (isEditable(e.target)) return;
      if (e.metaKey || e.ctrlKey) return;
    }
    if (typeof e.preventDefault === "function") e.preventDefault();
    if (typeof e.stopImmediatePropagation === "function")
      e.stopImmediatePropagation();
  }

  // A click WE dispatch to toggle a collapsible open. Marked so the edit-mode
  // tools' capture-phase click swallowers let it reach the trigger (they early-
  // return on `e.__weburaSynthetic`) instead of preventing the toggle.
  function dispatchSyntheticClick(el) {
    // Prefer HTMLElement.click() so React root-delegated onClick handlers run
    // (hand-built MouseEvents were unreliable for FAQ accordion toggles). A
    // depth flag (not an event property) gates click swallowers — capture
    // listeners registered earlier than a one-shot tagger would otherwise
    // swallow the gesture before `__weburaSynthetic` could be set.
    syntheticClickDepth += 1;
    try {
      if (typeof el.click === "function") el.click();
      else {
        const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
        try {
          ev.__weburaSynthetic = true;
        } catch {
          /* ignore */
        }
        el.dispatchEvent(ev);
      }
    } catch {
      /* ignore — best effort */
    } finally {
      syntheticClickDepth -= 1;
    }
  }

  // Open native <details> so unmounted disclosure content is reachable for
  // editing. Accordion / disclosure triggers (`aria-expanded`) are NOT
  // auto-clicked: edit-mode click-through already lets the user open them, and
  // auto-clicking every closed trigger races `type="single"` accordions (leaves
  // the LAST item open) and re-fires after React remounts (WeakSet misses the
  // new nodes) — which made "click top → last opens first" happen.
  function expandCollapsed(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll("details:not([open])").forEach((d) => {
      if (attemptedExpand.has(d)) return;
      attemptedExpand.add(d);
      d.open = true;
      expandedCollapsibles.push({ el: d, kind: "details" });
    });
  }

  function restoreCollapsed() {
    for (const item of expandedCollapsibles.splice(0)) {
      try {
        if (!item.el || !item.el.isConnected) continue;
        if (item.kind === "details") item.el.open = false;
      } catch {
        /* best-effort restore */
      }
    }
  }

  // Stop JS-driven carousel autoplay (which the CSS freeze can't reach) so slides
  // hold still while editing. Swiper hangs its instance off the `.swiper` element.
  function pauseCarousels(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll(".swiper").forEach((el) => {
      const sw = el.swiper;
      if (sw && sw.autoplay && typeof sw.autoplay.stop === "function") {
        try {
          sw.autoplay.stop();
        } catch {
          /* ignore */
        }
      }
    });
  }

  function install() {
    // 1) Freeze CSS-driven motion (animations, transitions, smooth scroll).
    styleNode = document.createElement("style");
    styleNode.setAttribute("data-webura-suppress", "");
    styleNode.textContent =
      "*,*::before,*::after{animation-play-state:paused!important;" +
      "transition:none!important;scroll-behavior:auto!important}";
    (document.head || document.documentElement).appendChild(styleNode);

    // 2) Block stray app interactions (belt-and-suspenders over each tool's own
    //    capture-phase click swallow).
    for (const type of BLOCKED_EVENTS)
      window.addEventListener(type, blockEvent, true);

    // 3) Best-effort JS auto-cycle freeze — OFF by default. Patching setInterval
    //    is aggressive and only catches intervals started AFTER activation;
    //    setTimeout / requestAnimationFrame are deliberately NOT patched (React's
    //    scheduler and layout libraries depend on them). Enable per-app via
    //    `window.__weburaEdit.freezeJsMotion = true` before activating a tool.
    if (api.freezeJsMotion && !originalSetInterval) {
      originalSetInterval = window.setInterval;
      window.setInterval = function () {
        return 0;
      };
    }

    // 4) Make hidden authored content reachable + hold carousels still, then keep
    //    doing so for anything React mounts afterwards (lazily-rendered lists,
    //    freshly-opened panels). Debounced so a burst of mutations runs once.
    attemptedExpand = new WeakSet(); // fresh session — re-attempt every collapsible
    expandCollapsed(document);
    pauseCarousels(document);
    let pending = false;
    contentObserver = new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        if (refs === 0) return;
        expandCollapsed(document);
        pauseCarousels(document);
      });
    });
    try {
      contentObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    } catch {
      /* no body yet — the initial pass already ran */
    }
  }

  function restore() {
    if (styleNode && styleNode.parentNode)
      styleNode.parentNode.removeChild(styleNode);
    styleNode = null;
    for (const type of BLOCKED_EVENTS)
      window.removeEventListener(type, blockEvent, true);
    if (originalSetInterval) {
      window.setInterval = originalSetInterval;
      originalSetInterval = null;
    }
    if (contentObserver) {
      contentObserver.disconnect();
      contentObserver = null;
    }
    restoreCollapsed();
  }

  const api = {
    freezeJsMotion: false,
    acquire() {
      refs += 1;
      if (refs === 1) install();
    },
    release() {
      if (refs === 0) return;
      refs -= 1;
      if (refs === 0) restore();
    },
    get active() {
      return refs > 0;
    },
    /** True while auto-expand / restore is programmatically clicking a trigger. */
    isSyntheticClick() {
      return syntheticClickDepth > 0;
    },
  };

  window.__weburaEdit = api;
})();

(() => {
  const OVERLAY_CLASS = "__webura_overlay__";
  let overlays = [];
  let hoverOverlay = null;
  let hoverLabel = null;
  let currentHoveredElement = null;
  let highlightedElement = null;
  let componentCoordinates = null; // Store the last selected component's coordinates
  let isProMode = false; // Track if pro mode is enabled
  //detect if the user is using Mac
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  // The possible states are:
  // { type: 'inactive' }
  // { type: 'inspecting', element: ?HTMLElement }
  // { type: 'selected', element: HTMLElement }
  let state = { type: "inactive" };

  /* ---------- helpers --------------------------------------------------- */
  const css = (el, obj) => Object.assign(el.style, obj);

  function makeOverlay() {
    const overlay = document.createElement("div");
    overlay.className = OVERLAY_CLASS;
    css(overlay, {
      position: "absolute",
      border: "1px solid rgba(59,130,246,.9)",
      background: "rgba(59,130,246,.05)",
      pointerEvents: "none",
      zIndex: "2147483647", // max
      borderRadius: "4px",
      // Sleek hairline + soft blue glow (no hard 1px ring, which read thicker).
      boxShadow: "0 0 6px 0 rgba(59,130,246,.35)",
    });

    const label = document.createElement("div");
    css(label, {
      position: "absolute",
      left: "0",
      top: "100%",
      transform: "translateY(4px)",
      background: "#3b82f6",
      color: "#fff",
      fontFamily: "monospace",
      fontSize: "12px",
      lineHeight: "1.2",
      padding: "3px 5px",
      whiteSpace: "nowrap",
      borderRadius: "4px",
      boxShadow: "0 1px 4px rgba(0, 0, 0, 0.1)",
    });
    overlay.appendChild(label);
    document.body.appendChild(overlay);

    return { overlay, label };
  }

  function updateOverlay(el, isSelected = false, isHighlighted = false) {
    // If no element, hide hover overlay
    if (!el) {
      if (hoverOverlay) hoverOverlay.style.display = "none";
      return;
    }

    if (isSelected) {
      if (overlays.some((item) => item.el === el)) {
        return;
      }

      const { overlay, label } = makeOverlay();
      overlays.push({ overlay, label, el });

      const rect = el.getBoundingClientRect();
      const borderColor = isHighlighted ? "#2563eb" : "rgba(59,130,246,.9)";
      const glow = isHighlighted
        ? "0 0 8px 0 rgba(37,99,235,.45)"
        : "0 0 6px 0 rgba(59,130,246,.35)";

      css(overlay, {
        top: `${rect.top + window.scrollY}px`,
        left: `${rect.left + window.scrollX}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        display: "block",
        border: `1px solid ${borderColor}`,
        background: "rgba(59,130,246,.05)",
        boxShadow: glow,
      });

      css(label, { display: "none" });

      return;
    }

    // Otherwise, this is a hover overlay: reuse the hover overlay node
    if (!hoverOverlay || !hoverLabel) {
      const o = makeOverlay();
      hoverOverlay = o.overlay;
      hoverLabel = o.label;
    }

    const rect = el.getBoundingClientRect();
    css(hoverOverlay, {
      top: `${rect.top + window.scrollY}px`,
      left: `${rect.left + window.scrollX}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      display: "block",
      // Sleek blue hairline + soft glow (was a heavy 2px purple outline).
      border: "1px solid rgba(59,130,246,.9)",
      background: "rgba(59,130,246,.05)",
      boxShadow: "0 0 6px 0 rgba(59,130,246,.3)",
    });
    css(hoverLabel, { background: "#3b82f6" });
    while (hoverLabel.firstChild) hoverLabel.removeChild(hoverLabel.firstChild);
    const name = el.dataset.weburaName || "<unknown>";
    const file = (el.dataset.weburaId || "").split(":")[0];
    const nameEl = document.createElement("div");
    nameEl.textContent = name;
    hoverLabel.appendChild(nameEl);
    if (file) {
      const fileEl = document.createElement("span");
      css(fileEl, { fontSize: "10px", opacity: ".8" });
      fileEl.textContent = file.replace(/\\/g, "/");
      hoverLabel.appendChild(fileEl);
    }

    // Update positions after showing hover label in case it caused layout shift
    requestAnimationFrame(updateAllOverlayPositions);
  }

  function updateAllOverlayPositions() {
    // Update all selected overlays
    overlays.forEach(({ overlay, el }) => {
      const rect = el.getBoundingClientRect();
      css(overlay, {
        top: `${rect.top + window.scrollY}px`,
        left: `${rect.left + window.scrollX}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });
    });

    // Update hover overlay if visible
    if (
      hoverOverlay &&
      hoverOverlay.style.display !== "none" &&
      state.element
    ) {
      const rect = state.element.getBoundingClientRect();
      css(hoverOverlay, {
        top: `${rect.top + window.scrollY}px`,
        left: `${rect.left + window.scrollX}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });
    }

    // Send updated coordinates for highlighted or selected component to parent
    if (highlightedElement) {
      // Multi-selector mode: send coordinates for the highlighted component
      const highlightedItem = overlays.find(
        ({ el }) => el === highlightedElement,
      );

      if (highlightedItem) {
        const rect = highlightedItem.el.getBoundingClientRect();
        window.parent.postMessage(
          {
            type: "webura-component-coordinates-updated",
            coordinates: {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            },
          },
          "*",
        );
      }
    }
  }

  function clearOverlays() {
    overlays.forEach(({ overlay }) => overlay.remove());
    overlays = [];

    if (hoverOverlay) {
      hoverOverlay.remove();
      hoverOverlay = null;
      hoverLabel = null;
    }

    currentHoveredElement = null;
    highlightedElement = null;
  }

  function removeOverlayById(componentId) {
    // Remove all overlays with the same componentId
    const indicesToRemove = [];
    overlays.forEach((item, index) => {
      if (item.el.dataset.weburaId === componentId) {
        indicesToRemove.push(index);
      }
    });

    // Remove in reverse order to maintain correct indices
    for (let i = indicesToRemove.length - 1; i >= 0; i--) {
      const { overlay } = overlays[indicesToRemove[i]];
      overlay.remove();
      overlays.splice(indicesToRemove[i], 1);
    }

    if (
      highlightedElement &&
      highlightedElement.dataset.weburaId === componentId
    ) {
      highlightedElement = null;
    }
  }

  /**
   * Detects if an element is a non-interactive overlay (e.g. a gradient div
   * with absolute positioning covering its parent). When such an element is
   * the click target it blocks selection of the meaningful content underneath.
   * Returns the parent webura-tagged element if the current one is an overlay,
   * or the element itself otherwise.
   */
  function skipOverlayElement(el) {
    if (!el || !el.parentElement) return el;

    // Never skip content-bearing elements
    const tag = el.tagName.toLowerCase();
    if (
      tag === "img" ||
      tag === "video" ||
      tag === "canvas" ||
      tag === "svg" ||
      tag === "iframe"
    ) {
      return el;
    }

    const style = getComputedStyle(el);

    // Only consider absolutely/fixed positioned elements
    if (style.position !== "absolute" && style.position !== "fixed") return el;

    // Don't skip scrollable containers (e.g. message lists with overflow-y-auto)
    if (style.overflowY === "auto" || style.overflowY === "scroll") return el;

    // Must cover a large portion of its parent (inset-0 pattern)
    const parentRect = el.parentElement.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    if (parentRect.width === 0 || parentRect.height === 0) return el;

    const widthRatio = elRect.width / parentRect.width;
    const heightRatio = elRect.height / parentRect.height;

    // 98% accounts for sub-pixel rounding from borders/box-sizing while
    // being tight enough to only match true inset-0 overlays.
    if (widthRatio < 0.98 || heightRatio < 0.98) return el;

    // This looks like an overlay — walk up to the parent with a webura-id
    let parent = el.parentElement;
    while (parent && !parent.dataset.weburaId) parent = parent.parentElement;

    return parent || el;
  }

  // Helper function to check if mouse is over the toolbar
  function isMouseOverToolbar(mouseX, mouseY) {
    if (!componentCoordinates) return false;

    // Toolbar is positioned at bottom of component: top = coordinates.top + coordinates.height + 4px
    const toolbarTop =
      componentCoordinates.top + componentCoordinates.height + 4;
    const toolbarLeft = componentCoordinates.left;
    const toolbarHeight = 60;
    // Add some padding to the width since we don't know exact width
    const toolbarWidth = componentCoordinates.width || 400;

    return (
      mouseY >= toolbarTop &&
      mouseY <= toolbarTop + toolbarHeight &&
      mouseX >= toolbarLeft &&
      mouseX <= toolbarLeft + toolbarWidth
    );
  }

  // Helper function to check if the highlighted component is inside another selected component
  function isHighlightedComponentChildOfSelected() {
    if (!highlightedElement) return null;

    const highlightedItem = overlays.find(
      ({ el }) => el === highlightedElement,
    );
    if (!highlightedItem) return null;

    // Check if any other selected component contains the highlighted element
    for (const item of overlays) {
      if (item.el === highlightedItem.el) continue; // Skip the highlighted component itself
      if (item.el.contains(highlightedItem.el)) {
        return item; // Return the parent component
      }
    }
    return null;
  }

  // Helper function to show/hide and populate label for a selected overlay
  function updateSelectedOverlayLabel(item, show) {
    const { label, el } = item;

    if (!show) {
      css(label, { display: "none" });
      // Update positions after hiding label in case it caused layout shift
      requestAnimationFrame(updateAllOverlayPositions);
      return;
    }

    // Clear and populate label
    css(label, { display: "block", background: "#3b82f6" });
    while (label.firstChild) label.removeChild(label.firstChild);

    // Add "Edit with AI" line
    const editLine = document.createElement("div");
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "12");
    svg.setAttribute("height", "12");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("fill", "none");
    Object.assign(svg.style, {
      display: "inline-block",
      verticalAlign: "-2px",
      marginRight: "4px",
    });
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute(
      "d",
      "M8 0L9.48528 6.51472L16 8L9.48528 9.48528L8 16L6.51472 9.48528L0 8L6.51472 6.51472L8 0Z",
    );
    path.setAttribute("fill", "white");
    svg.appendChild(path);
    editLine.appendChild(svg);
    editLine.appendChild(document.createTextNode("Edit with AI"));
    label.appendChild(editLine);

    // Add component name and file
    const name = el.dataset.weburaName || "<unknown>";
    const file = (el.dataset.weburaId || "").split(":")[0];
    const nameEl = document.createElement("div");
    nameEl.textContent = name;
    label.appendChild(nameEl);
    if (file) {
      const fileEl = document.createElement("span");
      css(fileEl, { fontSize: "10px", opacity: ".8" });
      fileEl.textContent = file.replace(/\\/g, "/");
      label.appendChild(fileEl);
    }

    // Update positions after showing label in case it caused layout shift
    requestAnimationFrame(updateAllOverlayPositions);
  }

  /* ---------- event handlers -------------------------------------------- */
  function onMouseMove(e) {
    // Check if mouse is over toolbar - if so, hide the label and treat as if mouse left component
    if (isMouseOverToolbar(e.clientX, e.clientY)) {
      if (currentHoveredElement) {
        const previousItem = overlays.find(
          (item) => item.el === currentHoveredElement,
        );
        if (previousItem) {
          updateSelectedOverlayLabel(previousItem, false);
        }
        currentHoveredElement = null;
      }
      return;
    }

    let el = e.target;
    while (el && !el.dataset.weburaId) el = el.parentElement;
    if (el) el = skipOverlayElement(el);

    const hoveredItem = overlays.find((item) => item.el === el);

    // Check if the highlighted component is a child of another selected component
    const parentOfHighlighted = isHighlightedComponentChildOfSelected();

    // If hovering over the highlighted component and it has a parent, hide the parent's label
    if (
      hoveredItem &&
      hoveredItem.el === highlightedElement &&
      parentOfHighlighted
    ) {
      // Hide the parent component's label
      updateSelectedOverlayLabel(parentOfHighlighted, false);
      // Also clear currentHoveredElement if it's the parent
      if (currentHoveredElement === parentOfHighlighted.el) {
        currentHoveredElement = null;
      }
      return;
    }

    if (currentHoveredElement && currentHoveredElement !== el) {
      const previousItem = overlays.find(
        (item) => item.el === currentHoveredElement,
      );
      if (previousItem) {
        updateSelectedOverlayLabel(previousItem, false);
      }
    }

    currentHoveredElement = el;

    // If hovering over a selected component, show its label only if it's not highlighted
    if (hoveredItem && hoveredItem.el !== highlightedElement) {
      updateSelectedOverlayLabel(hoveredItem, true);
      if (hoverOverlay) hoverOverlay.style.display = "none";
    }

    // Handle inspecting state (component selector is active)
    if (state.type === "inspecting") {
      if (state.element === el) return;
      state.element = el;

      if (!hoveredItem && el) {
        updateOverlay(el, false);
      } else if (!el) {
        if (hoverOverlay) hoverOverlay.style.display = "none";
      }
    }
  }

  function onMouseLeave(e) {
    if (!e.relatedTarget) {
      if (hoverOverlay) {
        hoverOverlay.style.display = "none";
        requestAnimationFrame(updateAllOverlayPositions);
      }
      currentHoveredElement = null;
      if (state.type === "inspecting") {
        state.element = null;
      }
    }
  }

  function onClick(e) {
    if (state.type !== "inspecting") return;
    // While the selector is active we listen in the capture phase and intercept
    // EVERY click — including clicks on buttons/links/inputs and on untagged
    // areas — so the app's own onClick handlers / navigation NEVER fire.
    // stopImmediatePropagation ensures frameworks (e.g. React's delegated root
    // listener) never receive the click. Normal interaction resumes the moment
    // the user turns the selector off.
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") {
      e.stopImmediatePropagation();
    }
    // Nothing tagged under the cursor → swallow the click and do nothing else.
    if (!state.element) return;

    const clickedComponentId = state.element.dataset.weburaId;
    const selectedItem = overlays.find((item) => item.el === state.element);

    // If clicking on the currently highlighted component, deselect it
    if (selectedItem && (highlightedElement === state.element || !isProMode)) {
      if (state.element.contentEditable === "true") {
        return;
      }

      removeOverlayById(clickedComponentId);
      requestAnimationFrame(updateAllOverlayPositions);
      highlightedElement = null;

      // Only post message once for all elements with the same ID
      window.parent.postMessage(
        {
          type: "webura-component-deselected",
          componentId: clickedComponentId,
        },
        "*",
      );
      return;
    }

    // Update only the previously highlighted component
    if (highlightedElement && highlightedElement !== state.element) {
      const previousItem = overlays.find(
        (item) => item.el === highlightedElement,
      );
      if (previousItem) {
        css(previousItem.overlay, {
          border: `1px solid rgba(59,130,246,.9)`,
          background: "rgba(59,130,246,.05)",
          boxShadow: "0 0 6px 0 rgba(59,130,246,.35)",
        });
      }
    }

    highlightedElement = state.element;

    if (selectedItem && isProMode) {
      css(selectedItem.overlay, {
        border: `1px solid #2563eb`,
        background: "rgba(59,130,246,.05)",
        boxShadow: "0 0 8px 0 rgba(37,99,235,.45)",
      });
    }

    if (!selectedItem) {
      updateOverlay(state.element, true, isProMode);
      requestAnimationFrame(updateAllOverlayPositions);
    }

    // Assign a unique runtime ID to this element if it doesn't have one
    if (!state.element.dataset.weburaRuntimeId) {
      state.element.dataset.weburaRuntimeId = `webura-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    const rect = state.element.getBoundingClientRect();
    window.parent.postMessage(
      {
        type: "webura-component-selected",
        component: {
          id: clickedComponentId,
          name: state.element.dataset.weburaName,
          runtimeId: state.element.dataset.weburaRuntimeId,
        },
        coordinates: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
      },
      "*",
    );
  }

  function onKeyDown(e) {
    // Esc turns the selector OFF — works regardless of focus (checked before the
    // input guard below), and tells the parent so its toolbar state stays in sync.
    if (e.key === "Escape" && state.type === "inspecting") {
      e.preventDefault();
      deactivate();
      window.parent.postMessage(
        { type: "webura-component-selector-escaped" },
        "*",
      );
      return;
    }

    // Ignore keystrokes if the user is typing in an input field, textarea, or editable element
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.isContentEditable
    ) {
      return;
    }

    // Forward shortcuts to parent window
    const key = e.key.toLowerCase();
    const hasShift = e.shiftKey;
    const hasCtrlOrMeta = isMac ? e.metaKey : e.ctrlKey;
    if (key === "c" && hasShift && hasCtrlOrMeta) {
      e.preventDefault();
      window.parent.postMessage(
        {
          type: "webura-select-component-shortcut",
        },
        "*",
      );
    }
  }

  /* ---------- activation / deactivation --------------------------------- */
  // While the selector is active, force the plain arrow cursor everywhere so
  // links/buttons/etc. don't flash their pointer/hover cursors — you're
  // selecting, not interacting. Injected as a global !important rule and removed
  // on deactivate.
  let selectorCursorStyle = null;
  function installSelectorCursor() {
    if (selectorCursorStyle) return;
    selectorCursorStyle = document.createElement("style");
    selectorCursorStyle.setAttribute("data-webura-cursor", "selector");
    selectorCursorStyle.textContent =
      "*, *::before, *::after { cursor: default !important; }";
    (document.head || document.documentElement).appendChild(
      selectorCursorStyle,
    );
  }
  function removeSelectorCursor() {
    if (selectorCursorStyle) {
      selectorCursorStyle.remove();
      selectorCursorStyle = null;
    }
  }

  function activate() {
    if (state.type === "inactive") {
      window.addEventListener("click", onClick, true);
      if (window.__weburaEdit) window.__weburaEdit.acquire();
    }
    installSelectorCursor();
    state = { type: "inspecting", element: null };
  }

  function deactivate() {
    if (state.type === "inactive") return;

    window.removeEventListener("click", onClick, true);
    if (window.__weburaEdit) window.__weburaEdit.release();
    removeSelectorCursor();
    // Don't clear overlays on deactivate - keep selected components visible
    // Hide only the hover overlay and all labels
    if (hoverOverlay) {
      hoverOverlay.style.display = "none";
    }

    // Hide all labels when deactivating
    overlays.forEach((item) => updateSelectedOverlayLabel(item, false));
    currentHoveredElement = null;

    state = { type: "inactive" };
  }

  /* ---------- message bridge -------------------------------------------- */
  window.addEventListener("message", (e) => {
    if (e.source !== window.parent) return;
    if (e.data.type === "webura-pro-mode") {
      isProMode = e.data.enabled;
    }
    if (e.data.type === "activate-webura-component-selector") activate();
    if (e.data.type === "deactivate-webura-component-selector") deactivate();
    if (e.data.type === "activate-webura-visual-editing") {
      activate();
    }
    if (e.data.type === "deactivate-webura-visual-editing") {
      deactivate();
      clearOverlays();
    }
    if (e.data.type === "clear-webura-component-overlays") clearOverlays();
    if (e.data.type === "update-webura-overlay-positions") {
      updateAllOverlayPositions();
    }
    if (e.data.type === "update-component-coordinates") {
      // Store component coordinates for toolbar hover detection
      componentCoordinates = e.data.coordinates;
    }
    if (
      e.data.type === "remove-webura-component-overlay" ||
      e.data.type === "deselect-webura-component"
    ) {
      if (e.data.componentId) {
        removeOverlayById(e.data.componentId);
      }
    }
    if (e.data.type === "restore-webura-component-overlays") {
      const componentIds = e.data.componentIds;
      if (Array.isArray(componentIds)) {
        clearOverlays();
        for (const id of componentIds) {
          const el = document.querySelector(
            `[data-webura-id="${CSS.escape(id)}"]`,
          );
          if (el) {
            updateOverlay(el, true);
          }
        }
        requestAnimationFrame(updateAllOverlayPositions);
      }
    }
  });

  // Always listen for keyboard shortcuts
  window.addEventListener("keydown", onKeyDown, true);

  // Always listen for mouse move to show/hide labels on selected overlays
  window.addEventListener("mousemove", onMouseMove, true);

  document.addEventListener("mouseleave", onMouseLeave, true);

  // Update overlay positions on window resize and scroll
  window.addEventListener("resize", updateAllOverlayPositions);
  window.addEventListener("scroll", updateAllOverlayPositions, true);

  function initializeComponentSelector() {
    if (!document.body) {
      console.error(
        "Webura component selector initialization failed: document.body not found.",
      );
      return;
    }

    // Usually the tagged elements are added right away, but in some cases (e.g.
    // supabase auth loading), it can take a while and thus we use a timeout/observer
    // to wait for tagged elements to appear.
    //
    // see: https://github.com/webura/webura/issues/2231
    const INIT_TIMEOUT_MS = 60_000; // Wait up to 60 seconds for tagged elements
    let observer = null;
    let timeoutId = null;

    function checkForTaggedElements() {
      if (document.body.querySelector("[data-webura-id]")) {
        // Clean up observer and timeout
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        window.parent.postMessage(
          {
            type: "webura-component-selector-initialized",
          },
          "*",
        );
        console.debug("Webura component selector initialized");
        return true;
      }
      return false;
    }

    // First, try immediately
    setTimeout(() => {
      if (checkForTaggedElements()) {
        return;
      }

      // If not found, set up MutationObserver to watch for tagged elements
      console.debug(
        "Webura component selector waiting for tagged elements to appear...",
      );

      observer = new MutationObserver((mutations) => {
        // Filter mutations to only process relevant changes
        const hasRelevantMutation = mutations.some((mutation) => {
          // Attribute mutation on data-webura-id (already filtered by attributeFilter)
          if (mutation.type === "attributes") {
            return true;
          }
          // Check if any added nodes have data-webura-id
          if (mutation.type === "childList") {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (
                  node.hasAttribute("data-webura-id") ||
                  node.querySelector("[data-webura-id]")
                ) {
                  return true;
                }
              }
            }
          }
          return false;
        });

        if (hasRelevantMutation) {
          checkForTaggedElements();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-webura-id"],
      });

      // Set a timeout to give up after INIT_TIMEOUT_MS
      timeoutId = setTimeout(() => {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        // Only warn if we never found tagged elements
        if (!document.body.querySelector("[data-webura-id]")) {
          console.warn(
            "Webura component selector not initialized because no DOM elements were tagged",
          );
        }
      }, INIT_TIMEOUT_MS);
    }, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeComponentSelector);
  } else {
    initializeComponentSelector();
  }

  // Expose a "select this element" core for the unified edit-mode toolbar: draws
  // the selection overlay and posts webura-component-selected (→ parent AI edit
  // toolbar) without needing the selector tool's own global click listener.
  function selectElement(el) {
    if (!el || !el.dataset || !el.dataset.weburaId) return;
    const componentId = el.dataset.weburaId;
    highlightedElement = el;
    if (!overlays.find((item) => item.el === el)) {
      updateOverlay(el, true, isProMode);
      requestAnimationFrame(updateAllOverlayPositions);
    }
    if (!el.dataset.weburaRuntimeId) {
      el.dataset.weburaRuntimeId = `webura-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    }
    const rect = el.getBoundingClientRect();
    window.parent.postMessage(
      {
        type: "webura-component-selected",
        component: {
          id: componentId,
          name: el.dataset.weburaName,
          runtimeId: el.dataset.weburaRuntimeId,
        },
        coordinates: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
      },
      "*",
    );
  }

  window.__weburaTools = window.__weburaTools || {};
  window.__weburaTools.selector = { select: selectElement };
})();

/* =====================================================================
 * Webura live TEXT-EDIT tool ("T" tool) — a SEPARATE mode from the
 * component selector above. Activated by the toolbar's "T" button
 * (parent posts `activate-webura-text-edit`). Click any static-text
 * element in the preview to retype it in place (Wix-style); the edit is
 * packaged parent-side into a pending visual change and written to the
 * source file on "Save changes".
 *
 * Text-only by design. An element is editable when it has visible text and
 * its element children are only inline text-formatting tags (span, b, a, …),
 * which mirrors the server's `isReplaceableTextElement` gate so every edit
 * actually applies to source. Clicking a styled word (e.g. a colored <span>)
 * edits just that word; clicking the surrounding text edits the whole element.
 *
 * Lives in the same injected file as the selector so it is present
 * wherever click-to-select is — no separate injection wiring.
 * ===================================================================== */
(() => {
  const BLUE = "#3b82f6";
  // Inline text-formatting tags allowed as children of an editable element.
  // Mirrors `INLINE_TEXT_TAGS` in the server transform.
  const INLINE_TAGS = new Set([
    "span",
    "a",
    "b",
    "i",
    "em",
    "strong",
    "mark",
    "small",
    "sub",
    "sup",
    "u",
    "code",
    "s",
    "abbr",
    "time",
    "label",
    "q",
    "cite",
    "del",
    "ins",
    "kbd",
    "samp",
    "var",
    "bdi",
    "bdo",
    "wbr",
    "br",
  ]);
  let active = false;
  let hoverBox = null;
  let hoverEl = null;
  let cursorEl = null;
  let editingEl = null;
  let editingId = null;
  let editingName = null;
  let editingIndex = -1;
  let originalText = "";
  let originalHtml = "";
  // The last selection inside the editing element, saved as the caret/selection
  // moves. Restored before a formatting command runs, because focusing the
  // parent's formatting toolbar (e.g. the native color picker) collapses the
  // iframe selection — so `foreColor`/bold/… would otherwise apply to nothing.
  let savedRange = null;

  const setStyle = (el, obj) => Object.assign(el.style, obj);

  // A carousel loop-clone slide (Swiper/react-slick duplicate the first/last
  // slides for infinite looping). Clones share the real slide's data-webura-id
  // but AREN'T distinct data-array items, so they must be excluded from the
  // instance count or the index lands on the wrong array element.
  function isCarouselClone(el) {
    let n = el;
    while (n && n !== document.body && n.nodeType === 1) {
      if (n.classList) {
        if (n.classList.contains("swiper-slide-duplicate")) return true;
        if (n.classList.contains("slick-cloned")) return true;
      }
      n = n.parentElement;
    }
    return false;
  }

  // A carousel's own logical slide index, when it exposes one. Swiper stamps
  // `data-swiper-slide-index` on every slide (clones included, with the correct
  // logical value) — the most reliable source. A generic `data-index` is trusted
  // only on a real (non-clone) slide. Null when there's no carousel index.
  function slideLogicalIndex(el) {
    let n = el;
    while (n && n !== document.body && n.nodeType === 1) {
      const v = n.dataset && n.dataset.swiperSlideIndex;
      if (v != null && /^\d+$/.test(v)) return parseInt(v, 10);
      n = n.parentElement;
    }
    n = el;
    while (n && n !== document.body && n.nodeType === 1) {
      const v = n.dataset && n.dataset.index;
      if (v != null && /^\d+$/.test(v))
        return isCarouselClone(n) ? null : parseInt(v, 10);
      n = n.parentElement;
    }
    return null;
  }

  // The real (non-clone) elements sharing `id`, in document order — the list a
  // dynamic index counts against, so clicked-instance → array-element stays 1:1.
  function realInstances(id) {
    if (!id) return [];
    const out = [];
    const all = document.querySelectorAll(
      `[data-webura-id="${CSS.escape(id)}"]`,
    );
    for (const node of all) if (!isCarouselClone(node)) out.push(node);
    return out;
  }

  // Position of `el` among the real instances sharing its `data-webura-id`. Same
  // -id elements come from ONE source node — a `.map()` renders many — so this
  // index maps a clicked instance to its data-array element. Prefers a carousel's
  // own logical index (robust to loop-clones and reordering); else counts real
  // instances. Returns 0 for a normal one-off element.
  function dynamicIndexOf(el) {
    const id = el && el.dataset && el.dataset.weburaId;
    if (!id) return 0;
    const explicit = slideLogicalIndex(el);
    if (explicit != null && explicit >= 0) return explicit;
    const idx = realInstances(id).indexOf(el);
    return idx < 0 ? 0 : idx;
  }

  /** Nearest ancestor (incl. self) that is an editable, webura-tagged element. */
  function editableTextTarget(node) {
    let el = node;
    while (el && el !== document.body) {
      if (el.nodeType === 1 && el.dataset && el.dataset.weburaId) {
        if (isEditableTextEl(el)) return el;
        // A tagged element with non-inline markup (a component, image, block,
        // etc.) can't be text-edited as a whole; stop climbing so we don't
        // accidentally flatten a big container.
        return null;
      }
      el = el.parentElement;
    }
    return null;
  }

  /**
   * The SMALLEST editable text element under the cursor, z-order aware. Iterating
   * elementsFromPoint (deepest/topmost paints first) resolves absolute overlays to
   * the real text beneath them and prefers an inner styled <span> over its whole
   * <h1> — fixing the "clicked but nothing happened / edited the wrong element"
   * cases the plain e.target walk hit.
   */
  function editableTextTargetAtPoint(x, y) {
    const els = document.elementsFromPoint(x, y);
    // 1) The nearest tagged ancestor that is wholly text-editable (common path).
    for (const el of els) {
      if (!el || el.nodeType !== 1) continue;
      if (el.hasAttribute && el.hasAttribute("data-webura-shield")) continue;
      if (el.closest && el.closest("[data-webura-toolbar]")) continue;
      const t = editableTextTarget(el);
      if (t) return t;
    }
    // 2) Recovery: the cursor sits inside a tagged container that isn't wholly
    // text-editable (e.g. an image card — a heading/paragraph next to an <img>).
    // Drill into EVERY tagged container under the cursor and pick the smallest
    // tagged, editable, text-bearing element whose box actually holds the point.
    let best = null;
    let bestArea = Infinity;
    for (const el of els) {
      if (!el || el.nodeType !== 1) continue;
      if (el.hasAttribute && el.hasAttribute("data-webura-shield")) continue;
      if (el.closest && el.closest("[data-webura-toolbar]")) continue;
      const container = el.closest && el.closest("[data-webura-id]");
      if (!container) continue;
      const tagged = container.querySelectorAll("[data-webura-id]");
      for (const d of tagged) {
        if (!isEditableTextEl(d)) continue;
        const r = d.getBoundingClientRect();
        if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
        const area = r.width * r.height;
        if (area < bestArea) {
          bestArea = area;
          best = d;
        }
      }
    }
    return best;
  }

  /**
   * True when the element has visible text and every element child is an inline
   * text-formatting tag (so replacing its text won't destroy media/components).
   */
  // A child element that renders no text of its own — a decorative icon
  // (`<svg>`, an `<img>`, or an empty glyph span). Tolerated as a sibling of the
  // text so accordion/tab triggers like "Question ⌄" (text + chevron) are still
  // editable; whether the edit persists is decided by the server probe (dynamic
  // → data-edit rewrites the array and keeps the icon; static → refused w/ hint).
  function isDecorativeIconEl(el) {
    const tag = el.tagName ? el.tagName.toLowerCase() : "";
    if (tag === "svg" || tag === "img") return true;
    return !(el.textContent && el.textContent.trim());
  }

  // Animated count-ups (GSAP tweens `innerText`, value bound to a mapped array
  // via `data-value`) look like plain text but text-editing can't work on them —
  // they're handled by numeric / "Edit list" editing. Route them away from the
  // text (T) affordance.
  function isAnimatedNumeralEl(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.classList && el.classList.contains("stat-numeral")) return true;
    if (el.hasAttribute && el.hasAttribute("data-value")) return true;
    return false;
  }

  function isEditableTextEl(el) {
    if (!el.childNodes.length) return false;
    // Exclude animated numerals and wrappers whose visible text IS the numeral.
    if (isAnimatedNumeralEl(el)) return false;
    if (el.querySelector && el.querySelector(".stat-numeral,[data-value]")) {
      let ownText = "";
      for (const c of el.childNodes) {
        if (c.nodeType === 3) ownText += c.textContent || "";
      }
      if (!ownText.trim()) return false; // text comes entirely from the numeral
    }
    let hasText = false;
    for (const child of el.childNodes) {
      if (child.nodeType === 1) {
        const tag = child.tagName ? child.tagName.toLowerCase() : "";
        if (INLINE_TAGS.has(tag)) {
          if (child.textContent && child.textContent.trim()) hasText = true;
        } else if (!isDecorativeIconEl(child)) {
          return false;
        }
      } else if (child.nodeType === 3 && child.textContent.trim()) {
        hasText = true;
      }
    }
    return hasText;
  }

  function ensureHoverBox() {
    if (hoverBox) return hoverBox;
    hoverBox = document.createElement("div");
    setStyle(hoverBox, {
      position: "absolute",
      pointerEvents: "none",
      zIndex: "2147483646",
      borderRadius: "3px",
      // Sleek hairline + a soft glow (no hard 1px ring underneath, which read
      // as a thicker double border).
      border: `1px solid rgba(59,130,246,.9)`,
      boxShadow: "0 0 6px 0 rgba(59,130,246,.35)",
      display: "none",
    });
    const tag = document.createElement("div");
    tag.className = "__webura_text_tag__";
    setStyle(tag, {
      position: "absolute",
      left: "0",
      top: "-18px",
      background: BLUE,
      color: "#fff",
      font: "600 10px/1.4 ui-sans-serif, system-ui, sans-serif",
      padding: "1px 5px",
      borderRadius: "3px",
      whiteSpace: "nowrap",
    });
    tag.textContent = "T  edit text";
    hoverBox.appendChild(tag);
    document.body.appendChild(hoverBox);
    return hoverBox;
  }

  function showHover(el) {
    const box = ensureHoverBox();
    const rect = el.getBoundingClientRect();
    setStyle(box, {
      top: `${rect.top + window.scrollY - 1}px`,
      left: `${rect.left + window.scrollX - 1}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      display: "block",
    });
  }

  function hideHover() {
    if (hoverBox) hoverBox.style.display = "none";
    hoverEl = null;
  }

  function currentText(el) {
    // innerText normalizes whitespace/line breaks the way the user sees them.
    return (el.innerText || el.textContent || "").trim();
  }

  // The element's inner HTML — carries rich formatting (marks/lists/blocks) the
  // formatting toolbar applied, for the source-write pipeline. Trimmed so a
  // plain edit round-trips identically to `currentText`.
  function currentHtml(el) {
    return (el.innerHTML || "").trim();
  }

  // Broadcast the active-format state (bold/italic/…/block tag) so the parent
  // toolbar can highlight the buttons for the current selection.
  function postFormatState() {
    if (!editingEl) return;
    // Runs on keyup/mouseup within the editing element (and at edit start), so
    // it's the natural place to remember the live selection for restoreSelection.
    saveSelection();
    let block = "";
    try {
      block = String(
        document.queryCommandValue("formatBlock") || "",
      ).toLowerCase();
    } catch (_e) {
      /* queryCommandValue is best-effort */
    }
    const q = (cmd) => {
      try {
        return document.queryCommandState(cmd);
      } catch (_e) {
        return false;
      }
    };
    window.parent.postMessage(
      {
        type: "webura-text-format-state",
        componentId: editingId,
        state: {
          bold: q("bold"),
          italic: q("italic"),
          underline: q("underline"),
          strikeThrough: q("strikeThrough"),
          insertUnorderedList: q("insertUnorderedList"),
          insertOrderedList: q("insertOrderedList"),
          justifyLeft: q("justifyLeft"),
          justifyCenter: q("justifyCenter"),
          justifyRight: q("justifyRight"),
          block,
        },
      },
      "*",
    );
  }

  // Save the current selection if it lives inside the editing element, so it can
  // be restored after the parent toolbar steals focus.
  function saveSelection() {
    if (!editingEl) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (editingEl.contains(range.commonAncestorContainer)) {
      savedRange = range.cloneRange();
    }
  }

  // Restore the saved selection into the editing element (before a format cmd).
  function restoreSelection() {
    if (!editingEl || !savedRange) return;
    if (!editingEl.contains(savedRange.commonAncestorContainer)) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }

  // Apply a formatting command to the current selection inside the editing
  // element (driven by the parent toolbar). Uses the browser's rich-editing
  // commands; `styleWithCSS` makes color/alignment persist as inline CSS.
  // Apply the "Open in new tab" choice to every link under `root`: `on` sets
  // target="_blank" + rel (safe new-tab), off clears them. Called after a
  // createLink so the new link matches the toggle.
  function applyNewTabToLinks(root, on) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll("a[href]").forEach((a) => {
      if (on) {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      } else {
        a.removeAttribute("target");
        a.removeAttribute("rel");
      }
    });
  }

  function richFormat(command, value, newTab) {
    if (!editingEl) return;
    editingEl.focus();
    // The parent toolbar (esp. the native color picker) collapses the iframe
    // selection when it takes focus; put it back so the command hits the text.
    restoreSelection();
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch (_e) {
      /* not all engines support styleWithCSS */
    }
    try {
      if (command === "formatBlock") {
        // Normalize to an uppercase tag token (H1..H4, P, BLOCKQUOTE, PRE).
        document.execCommand("formatBlock", false, String(value).toUpperCase());
      } else if (command === "removeFormat") {
        // Clear inline marks AND unwrap lists/links so "clear" fully resets.
        document.execCommand("removeFormat");
        document.execCommand("unlink");
      } else if (command === "createLink") {
        document.execCommand("createLink", false, value == null ? "" : value);
        // Match the "Open in new tab" toggle from the link input.
        applyNewTabToLinks(editingEl, newTab === true);
      } else {
        document.execCommand(command, false, value == null ? undefined : value);
      }
    } catch (_e) {
      /* execCommand is best-effort across browsers */
    }
    // Push the new content up as a normal text update, plus the button states.
    onEditInput();
    postFormatState();
  }

  function beginEdit(el) {
    if (editingEl === el) return;
    finishEdit(); // finalize any element already being edited
    clearCursor(); // the editing element gets its own cursor via the outline style

    editingEl = el;
    editingId = el.dataset.weburaId;
    editingName = el.dataset.weburaName || null;
    // Which instance this is among elements sharing the same `data-webura-id` —
    // for `.map()`-rendered lists it's the array index the parent/server use to
    // rewrite the right data element. -1 (or 0) for a normal one-off element.
    editingIndex = dynamicIndexOf(el);
    originalText = currentText(el);
    originalHtml = currentHtml(el);
    savedRange = null; // fresh element — drop any stale saved selection
    // Remember the PRISTINE content (before any edit) so undo/redo can restore it
    // even after editing finished. Keyed per instance so mapped-list items don't
    // share one snapshot. Only capture the first time we see this instance.
    if (editingId) {
      const key = pristineKey(editingId, editingIndex);
      if (!textOriginals.has(key)) {
        textOriginals.set(key, { text: originalText, html: originalHtml });
      }
    }

    // Ask the parent to classify this text (static / data-editable map binding).
    // Also send tagged-ancestor ids: UI primitives often render `{children}` while
    // the call-site `.map()` binding lives on an ancestor (AccordionTrigger, Card,
    // …). The parent probes candidates innermost-first and routes a data-edit
    // without surfacing a warning when one resolves.
    if (editingId) {
      const candidateIds = [];
      const seen = new Set();
      let n = el;
      while (n && n !== document.body && n.nodeType === 1) {
        const id = n.dataset && n.dataset.weburaId;
        if (id && !seen.has(id)) {
          seen.add(id);
          candidateIds.push(id);
        }
        n = n.parentElement;
      }
      const r = el.getBoundingClientRect();
      window.parent.postMessage(
        {
          type: "webura-text-edit-started",
          componentId: editingId,
          dynamicIndex: editingIndex,
          candidateIds,
          coordinates: {
            top: r.top,
            left: r.left,
            width: r.width,
            height: r.height,
          },
        },
        "*",
      );
    }

    el.contentEditable = "true";
    el.spellcheck = false;
    setStyle(el, {
      outline: `1px solid rgba(59,130,246,.9)`,
      outlineOffset: "2px",
      borderRadius: "3px",
    });
    // !important so it beats the global default-cursor rule installed on activate.
    el.style.setProperty("cursor", "text", "important");
    el.focus();

    // Select all the text so typing replaces it (Wix-like).
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch {
      /* selection is best-effort */
    }

    el.addEventListener("input", onEditInput);
    el.addEventListener("keydown", onEditKeydown, true);
    el.addEventListener("blur", onEditBlur, true);
    // Keep the toolbar's active-format buttons in sync as the caret moves.
    el.addEventListener("keyup", postFormatState);
    el.addEventListener("mouseup", postFormatState);
    hideHover();
    postFormatState();
  }

  function onEditInput() {
    if (!editingEl) return;
    window.parent.postMessage(
      {
        type: "webura-text-updated",
        componentId: editingId,
        name: editingName,
        dynamicIndex: editingIndex,
        text: currentText(editingEl),
        html: currentHtml(editingEl),
      },
      "*",
    );
  }

  function onEditKeydown(e) {
    if (!editingEl) return;
    if (e.key === "Enter" && !e.shiftKey) {
      // Enter commits (single-line copy); Shift+Enter inserts a newline.
      e.preventDefault();
      finishEdit();
    } else if (e.key === "Escape") {
      // Esc discards the in-progress edit AND turns the tool off (matches the
      // component selector's Esc behavior).
      e.preventDefault();
      e.stopPropagation();
      cancelEdit();
      deactivate();
      window.parent.postMessage({ type: "webura-text-edit-escaped" }, "*");
    }
  }

  function onEditBlur() {
    // Defer so a click that moves focus to another editable element finalizes
    // this one cleanly first. Capture the blurred element: if focus has since
    // moved to a NEW element being edited, that click's beginEdit already
    // finalized this one, so don't re-finalize (which would wrongly commit the
    // new element).
    const blurred = editingEl;
    setTimeout(() => {
      // Don't finalize if the blur was caused by the PARENT formatting toolbar
      // (or one of its Base UI menus/popovers) taking focus — the preview
      // document loses focus in that case, so keep the edit session alive. A
      // click back into the app content keeps focus in the iframe and finalizes.
      if (editingEl === blurred && document.hasFocus()) finishEdit();
    }, 0);
  }

  function teardownEditListeners(el) {
    el.removeEventListener("input", onEditInput);
    el.removeEventListener("keydown", onEditKeydown, true);
    el.removeEventListener("blur", onEditBlur, true);
    el.removeEventListener("keyup", postFormatState);
    el.removeEventListener("mouseup", postFormatState);
    el.contentEditable = "false";
    setStyle(el, {
      outline: "",
      outlineOffset: "",
      borderRadius: "",
    });
    el.style.removeProperty("cursor");
  }

  function finishEdit() {
    if (!editingEl) return;
    const el = editingEl;
    const id = editingId;
    const name = editingName;
    const index = editingIndex;
    const before = originalText;
    const beforeHtml = originalHtml;
    editingEl = null;
    editingId = null;
    editingName = null;
    editingIndex = -1;

    teardownEditListeners(el);
    const after = currentText(el);
    const afterHtml = currentHtml(el);
    // Finalize when the plain text OR the formatting (HTML) changed, so a
    // formatting-only edit (e.g. bolding the whole line) still commits.
    if (after !== before || afterHtml !== beforeHtml) {
      window.parent.postMessage(
        {
          type: "webura-text-finalized",
          componentId: id,
          name,
          dynamicIndex: index,
          text: after,
          html: afterHtml,
        },
        "*",
      );
    }
    // ALWAYS signal the session ended (even with no change) so the parent hides
    // the formatting toolbar + colour menu — otherwise they linger after a click
    // away that didn't change anything.
    window.parent.postMessage(
      { type: "webura-text-edit-ended", componentId: id },
      "*",
    );
  }

  function cancelEdit() {
    if (!editingEl) return;
    const el = editingEl;
    const id = editingId;
    editingEl = null;
    editingId = null;
    editingName = null;
    teardownEditListeners(el);
    // Restore what the user started with (including any pre-existing markup).
    el.innerHTML = originalHtml;
    window.parent.postMessage(
      { type: "webura-text-edit-ended", componentId: id },
      "*",
    );
  }

  // While the tool is active, a global rule forces the plain arrow cursor
  // everywhere (so links/buttons don't flash their pointer cursors). The
  // hovered editable element then gets an I-beam via an inline !important that
  // beats that global rule.
  let editorCursorStyle = null;
  function installEditorCursor() {
    if (editorCursorStyle) return;
    editorCursorStyle = document.createElement("style");
    editorCursorStyle.setAttribute("data-webura-cursor", "text-edit");
    editorCursorStyle.textContent =
      "*, *::before, *::after { cursor: default !important; }";
    (document.head || document.documentElement).appendChild(editorCursorStyle);
  }
  function removeEditorCursor() {
    if (editorCursorStyle) {
      editorCursorStyle.remove();
      editorCursorStyle = null;
    }
  }

  function clearCursor() {
    if (cursorEl) {
      cursorEl.style.removeProperty("cursor");
      cursorEl = null;
    }
  }

  function onMove(e) {
    if (!active || editingEl) return;
    const target = editableTextTargetAtPoint(e.clientX, e.clientY);
    if (cursorEl && cursorEl !== target) clearCursor();
    if (target) {
      hoverEl = target;
      showHover(target);
      // I-beam over editable text (beats the global default-cursor rule).
      if (cursorEl !== target) {
        target.style.setProperty("cursor", "text", "important");
        cursorEl = target;
      }
    } else {
      hideHover();
    }
  }

  function onClickCapture(e) {
    if (!active) return;
    if (
      e.__weburaSynthetic ||
      (window.__weburaEdit &&
        typeof window.__weburaEdit.isSyntheticClick === "function" &&
        window.__weburaEdit.isSyntheticClick())
    )
      return; // our own auto-expand click — let it toggle
    // Swallow EVERY click (links, buttons, untagged areas) so the app's own
    // onClick / navigation never fires while the tool is active. Caret
    // placement inside the editable element is driven by mousedown, so
    // preventing the click doesn't interfere with it.
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") {
      e.stopImmediatePropagation();
    }
    // Click inside the element already being edited → just position the caret;
    // don't switch to editing a nested span.
    if (editingEl && editingEl.contains(e.target)) return;
    const target = editableTextTargetAtPoint(e.clientX, e.clientY);
    if (!target) {
      // Clicking a non-editable area finalizes any active edit.
      if (editingEl) finishEdit();
      return;
    }
    beginEdit(target);
  }

  function onKeyCapture(e) {
    if (!active || editingEl) return;
    if (e.key === "Escape") {
      // Esc with nothing being edited turns the tool OFF and syncs the toolbar.
      e.preventDefault();
      deactivate();
      window.parent.postMessage({ type: "webura-text-edit-escaped" }, "*");
    }
  }

  function activate() {
    if (active) return;
    active = true;
    if (window.__weburaEdit) window.__weburaEdit.acquire();
    window.addEventListener("click", onClickCapture, true);
    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("keydown", onKeyCapture, true);
    installEditorCursor();
  }

  function deactivate() {
    if (!active) return;
    finishEdit();
    active = false;
    if (window.__weburaEdit) window.__weburaEdit.release();
    window.removeEventListener("click", onClickCapture, true);
    window.removeEventListener("mousemove", onMove, true);
    window.removeEventListener("keydown", onKeyCapture, true);
    hideHover();
    clearCursor();
    removeEditorCursor();
  }

  // Pristine content per component (captured on first edit), so the parent's
  // undo/redo can set an arbitrary value or restore the original in place.
  const textOriginals = new Map(); // componentId -> { text, html }

  // The `index`-th element sharing `componentId` — for a one-off element that's
  // just the element; for a `.map()` list it's a specific instance.
  function textElement(componentId, index) {
    if (!componentId) return null;
    // Count against real instances (clones excluded) so this inverts the index
    // produced by dynamicIndexOf — a carousel's Nth logical slide, not its Nth
    // DOM node (which could be a prepended loop-clone).
    const list = realInstances(componentId);
    const i = !index || index < 0 ? 0 : index;
    return (
      list[i] ||
      list[0] ||
      document.querySelector(`[data-webura-id="${CSS.escape(componentId)}"]`)
    );
  }

  // Pristine content is keyed per INSTANCE so undo of one mapped item doesn't
  // restore another's text (index 0 / one-off elements keep the plain id).
  const pristineKey = (componentId, index) =>
    index && index > 0 ? `${componentId}#${index}` : componentId;

  /** Undo/redo: set a component instance's content to an explicit value. When
   *  `html` is provided the rich markup is restored; otherwise plain text. */
  function setTextContent(componentId, text, html, index) {
    const el = textElement(componentId, index);
    if (!el) return;
    const key = pristineKey(componentId, index);
    if (!textOriginals.has(key)) {
      textOriginals.set(key, { text: currentText(el), html: currentHtml(el) });
    }
    if (html != null) el.innerHTML = html;
    else el.textContent = text == null ? "" : String(text);
  }

  /** Undo: restore an instance's pristine (pre-edit) content. Non-consuming so a
   *  later redo→undo can restore it again. */
  function revertTextContent(componentId, index) {
    const el = textElement(componentId, index);
    const orig = textOriginals.get(pristineKey(componentId, index));
    if (el && orig) {
      if (orig.html != null) el.innerHTML = orig.html;
      else el.textContent = orig.text;
    }
  }

  // Restore EVERY edited instance to its pristine content (discard-on-exit). The
  // key is `pristineKey` — `componentId` or `componentId#index` — so split the
  // trailing numeric index back out to re-target the right instance.
  function revertAllText() {
    for (const key of Array.from(textOriginals.keys())) {
      let componentId = key;
      let index = 0;
      const hash = key.lastIndexOf("#");
      if (hash > 0 && /^\d+$/.test(key.slice(hash + 1))) {
        componentId = key.slice(0, hash);
        index = parseInt(key.slice(hash + 1), 10);
      }
      revertTextContent(componentId, index);
    }
    textOriginals.clear();
  }

  function respondTextContent(componentId) {
    let text = null;
    let html = null;
    let isEditing = false;
    if (editingEl && editingId === componentId) {
      text = currentText(editingEl);
      html = currentHtml(editingEl);
      isEditing = true;
    } else if (componentId) {
      const el = textElement(componentId);
      if (el) {
        text = currentText(el);
        html = currentHtml(el);
      }
    }
    window.parent.postMessage(
      {
        type: "webura-text-content-response",
        componentId,
        text,
        html,
        isEditing,
      },
      "*",
    );
  }

  window.addEventListener("message", (e) => {
    if (e.source !== window.parent) return;
    const data = e.data || {};
    if (data.type === "activate-webura-text-edit") activate();
    else if (data.type === "deactivate-webura-text-edit") deactivate();
    else if (data.type === "get-webura-text-content") {
      respondTextContent(data.data && data.data.componentId);
    } else if (data.type === "set-webura-text-content") {
      setTextContent(data.componentId, data.text, data.html, data.index);
    } else if (data.type === "revert-webura-text-content") {
      revertTextContent(data.componentId, data.index);
    } else if (data.type === "webura-text-format") {
      // Rich-text toolbar command (bold/italic/list/align/color/…).
      richFormat(data.command, data.value, data.newTab);
    } else if (data.type === "webura-text-query-format") {
      postFormatState();
    }
  });

  // Keep the hover box aligned with layout changes while the tool is on.
  const realign = () => {
    if (active && !editingEl && hoverEl) showHover(hoverEl);
  };
  window.addEventListener("resize", realign);
  window.addEventListener("scroll", realign, true);

  // Expose the text engine's core ops so the unified edit-mode toolbar can drive
  // inline editing without turning on this tool's own global listeners.
  window.__weburaTools = window.__weburaTools || {};
  window.__weburaTools.text = {
    begin: beginEdit,
    targetAt: editableTextTargetAtPoint,
    isEditing: () => !!editingEl,
    finish: finishEdit,
    /** The element currently being inline-edited (for outside-click detection). */
    editingElement: () => editingEl,
    /** Clone-aware index of a `.map()` instance among its siblings (structural
     *  delete of a dynamic item needs it to target the right array element). */
    indexOf: dynamicIndexOf,
    /** How many REAL (non-clone) instances share this id — >1 means dynamic. */
    instanceCount: (id) => realInstances(id).length,
    /** The Nth real instance of `id` (inverts indexOf for redo/re-locate). */
    elementAt: (id, index) => textElement(id, index),
    /** Restore all edited text to pristine (discard on exit / Esc). */
    revertAll: revertAllText,
  };
})();

/* =====================================================================
 * Webura live IMAGE-REPLACE tool — a SEPARATE mode (its own toolbar
 * icon). Activated by the parent (`activate-webura-image-edit`). Click
 * any <img> in the preview to pick a replacement; the parent opens the
 * picker, live-previews the new src here (`modify-webura-image-src`),
 * and writes it to source on "Save changes" (into public/images/).
 *
 * Lives in the same injected file as the selector + text tool so it is
 * present wherever click-to-select is — no separate injection wiring.
 * ===================================================================== */
(() => {
  const BLUE = "#3b82f6";
  let active = false;
  let hoverBox = null;
  let hoverEl = null;
  let cursorStyle = null;

  const setStyle = (el, obj) => Object.assign(el.style, obj);

  let cursorEl = null; // element given an inline "copy" cursor on hover (bg targets)

  /** First url(...) in an element's computed background-image, or null. */
  function bgUrl(el) {
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === "none") return null;
    const m = /url\((['"]?)(.*?)\1\)/.exec(bg);
    return m ? m[2] : null;
  }

  /**
   * Whether a background image can actually be rewritten in the JSX source — i.e.
   * the URL lives in an inline `style` or a Tailwind `bg-[url(...)]` class, not in
   * an external stylesheet class (which the source doesn't carry). We only offer
   * to edit backgrounds we can persist, so the preview never changes then reverts.
   */
  function bgIsFixable(el) {
    const style = el.getAttribute("style") || "";
    if (/background(-image)?\s*:\s*[^;]*url\(/i.test(style)) return true;
    const cls = el.getAttribute("class") || "";
    return /bg-\[url\(/.test(cls);
  }

  /**
   * The TOPMOST editable image target under the cursor, z-order aware
   * (overlays/our own toolbar are skipped). Handles three kinds:
   *   - "img":        a plain <img> (src rewritten)
   *   - "picture":    an <img> inside a <picture> (src + sibling <source> rewritten)
   *   - "background": an element with CSS background-image: url(...) (hero/cards)
   * Returns { el, kind, currentSrc } or null.
   */
  function imageTargetAtPoint(x, y) {
    const els = document.elementsFromPoint(x, y);
    for (const el of els) {
      if (!el || el.nodeType !== 1) continue;
      if (el.closest && el.closest("[data-webura-toolbar]")) continue;
      if (el.tagName === "IMG") {
        const inPicture = el.closest && el.closest("picture");
        return {
          el,
          kind: inPicture ? "picture" : "img",
          currentSrc: el.getAttribute("src") || el.currentSrc || "",
        };
      }
      const url = bgUrl(el);
      if (url && bgIsFixable(el))
        return { el, kind: "background", currentSrc: url };
    }
    return null;
  }

  /**
   * The componentId to map back to source. A background lives ON its element, so
   * that element must itself be tagged; an <img> may climb to a tagged ancestor.
   */
  function imageComponentId(target) {
    if (target.kind === "background") {
      return target.el.dataset && target.el.dataset.weburaId
        ? target.el.dataset.weburaId
        : null;
    }
    if (target.kind === "picture") {
      // Anchor to the <picture> (or its tagged ancestor) so BOTH the <img> and
      // its sibling <source>s live in the matched node's subtree — the source
      // rewrite (setImgSrc + clearPictureSources) descends from that node.
      const pic =
        (target.el.closest && target.el.closest("picture")) || target.el;
      const tagged = pic.closest && pic.closest("[data-webura-id]");
      return tagged && tagged.dataset ? tagged.dataset.weburaId : null;
    }
    return imgComponentId(target.el);
  }

  /** Inline "copy" cursor for a background target (imgs get it from the stylesheet). */
  function setHoverCursor(el, kind) {
    if (kind !== "background") {
      clearHoverCursor();
      return;
    }
    if (cursorEl && cursorEl !== el) clearHoverCursor();
    el.style.setProperty("cursor", "copy", "important");
    cursorEl = el;
  }
  function clearHoverCursor() {
    if (cursorEl) {
      cursorEl.style.removeProperty("cursor");
      cursorEl = null;
    }
  }

  /** The componentId for an <img>: its own data-webura-id, else its nearest tagged ancestor. */
  function imgComponentId(img) {
    if (img.dataset && img.dataset.weburaId) return img.dataset.weburaId;
    const tagged = img.closest && img.closest("[data-webura-id]");
    return tagged && tagged.dataset ? tagged.dataset.weburaId : null;
  }

  /** The element itself if it's an <img>, else its first descendant <img>. */
  function elementImg(el) {
    if (el.tagName === "IMG") return el;
    return el.querySelector ? el.querySelector("img") : null;
  }

  function ensureHoverBox() {
    if (hoverBox) return hoverBox;
    hoverBox = document.createElement("div");
    setStyle(hoverBox, {
      position: "absolute",
      pointerEvents: "none",
      zIndex: "2147483646",
      borderRadius: "3px",
      border: `1px solid rgba(59,130,246,.9)`,
      boxShadow: "0 0 6px 0 rgba(59,130,246,.35)",
      display: "none",
    });
    const tag = document.createElement("div");
    setStyle(tag, {
      position: "absolute",
      left: "0",
      top: "-18px",
      background: BLUE,
      color: "#fff",
      font: "600 10px/1.4 ui-sans-serif, system-ui, sans-serif",
      padding: "1px 5px",
      borderRadius: "3px",
      whiteSpace: "nowrap",
    });
    tag.textContent = "Replace image";
    hoverBox.appendChild(tag);
    document.body.appendChild(hoverBox);
    return hoverBox;
  }

  function showHover(el) {
    const box = ensureHoverBox();
    const rect = el.getBoundingClientRect();
    setStyle(box, {
      top: `${rect.top + window.scrollY - 1}px`,
      left: `${rect.left + window.scrollX - 1}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      display: "block",
    });
  }

  function hideHover() {
    if (hoverBox) hoverBox.style.display = "none";
    hoverEl = null;
    clearHoverCursor();
  }

  function installCursor() {
    if (cursorStyle) return;
    cursorStyle = document.createElement("style");
    cursorStyle.setAttribute("data-webura-cursor", "image-edit");
    // Plain arrow everywhere (no link/button pointer leaks); a copy cursor over
    // replaceable images to signal "click to replace".
    cursorStyle.textContent =
      "*, *::before, *::after { cursor: default !important; } " +
      "img { cursor: copy !important; }";
    (document.head || document.documentElement).appendChild(cursorStyle);
  }
  function removeCursor() {
    if (cursorStyle) {
      cursorStyle.remove();
      cursorStyle = null;
    }
  }

  function onMove(e) {
    if (!active) return;
    const target = imageTargetAtPoint(e.clientX, e.clientY);
    if (target) {
      hoverEl = target.el;
      showHover(target.el); // the target's own rect, not a section
      setHoverCursor(target.el, target.kind);
    } else {
      hideHover();
    }
  }

  function onClickCapture(e) {
    if (!active) return;
    if (
      e.__weburaSynthetic ||
      (window.__weburaEdit &&
        typeof window.__weburaEdit.isSyntheticClick === "function" &&
        window.__weburaEdit.isSyntheticClick())
    )
      return; // our own auto-expand click — let it toggle
    // Swallow every click so app navigation / handlers never fire.
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") {
      e.stopImmediatePropagation();
    }
    const target = imageTargetAtPoint(e.clientX, e.clientY);
    if (target) postImageSelected(target);
  }

  // Inline-CSS keys the Design panel owns. handleModifyImageStyle clears every
  // one not present in an incoming map, so removing a control reverts its effect.
  const MANAGED_STYLE_KEYS = [
    "objectFit",
    "objectPosition",
    "transformOrigin",
    "opacity",
    "transform",
    "filter",
    "clipPath",
    "borderRadius",
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderBottomRightRadius",
    "borderBottomLeftRadius",
  ];
  // Session record of each image's overlay layer (componentId -> overlay|null),
  // so re-opening the panel reflects the pending (un-saved) overlay.
  const imageOverlayState = new Map();
  // Live overlay-preview elements (componentId -> { el, img }) — a fixed div over
  // the image's rect that approximates the saved overlay <div> before rebuild.
  const overlayPreviews = new Map();

  function rgbToHex(rgb) {
    const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(rgb || "");
    if (!m) return "#000000";
    const h = (n) => Number(n).toString(16).padStart(2, "0");
    return `#${h(m[1])}${h(m[2])}${h(m[3])}`;
  }

  /** Read a previously-saved overlay <div> (in source) or the pending state. */
  function readOverlayFor(componentId, img) {
    if (imageOverlayState.has(componentId))
      return imageOverlayState.get(componentId);
    const frame = img.closest && img.closest("[data-webura-frame]");
    const ov = frame ? frame.querySelector("[data-webura-overlay]") : null;
    if (!ov) return null;
    const cs = getComputedStyle(ov);
    return {
      enabled: true,
      color:
        ov.getAttribute("data-webura-overlay-color") ||
        rgbToHex(cs.backgroundColor),
      opacity: Math.round(parseFloat(cs.opacity || "1") * 100),
      blendMode:
        ov.getAttribute("data-webura-overlay-blend") ||
        cs.mixBlendMode ||
        "normal",
    };
  }

  /** Read the current Content + Design values off an <img> for the editor panel. */
  function readImageStyle(img, componentId) {
    const cs = getComputedStyle(img);
    const st = img.style;
    const css = {};
    // Prefer AUTHORED inline values (round-trippable back into panel controls);
    // fall back to computed only for the display-only props (fit/position/radius/
    // opacity). transform/filter/clip-path are read inline-only — a computed
    // `matrix(...)` can't be reversed into rotate/scale/skew.
    const fit = st.objectFit || cs.objectFit;
    if (fit && fit !== "fill") css.objectFit = fit;
    const posv = st.objectPosition || cs.objectPosition;
    if (posv && posv !== "50% 50%" && posv !== "center")
      css.objectPosition = posv;
    [
      "borderTopLeftRadius",
      "borderTopRightRadius",
      "borderBottomRightRadius",
      "borderBottomLeftRadius",
    ].forEach((k) => {
      const v = st[k] || cs[k];
      if (v && v !== "0px") css[k] = v;
    });
    const op = st.opacity || cs.opacity;
    if (op && op !== "1") css.opacity = op;
    if (st.transform && st.transform !== "none") css.transform = st.transform;
    if (st.filter && st.filter !== "none") css.filter = st.filter;
    if (st.clipPath && st.clipPath !== "none") css.clipPath = st.clipPath;
    const anchor = img.closest && img.closest("a");
    return {
      alt: img.getAttribute("alt") || "",
      href: (anchor && anchor.getAttribute("href")) || "",
      css,
      overlay: readOverlayFor(componentId, img),
    };
  }

  function positionOverlay(el, img) {
    const r = img.getBoundingClientRect();
    el.style.top = `${r.top}px`;
    el.style.left = `${r.left}px`;
    el.style.width = `${r.width}px`;
    el.style.height = `${r.height}px`;
  }

  /** Create / update / remove the live overlay-preview div for an image. */
  function applyOverlayPreview(componentId, img, overlay) {
    imageOverlayState.set(componentId, overlay || null);
    let entry = overlayPreviews.get(componentId);
    if (!overlay || !overlay.enabled) {
      if (entry) {
        entry.el.remove();
        overlayPreviews.delete(componentId);
      }
      return;
    }
    if (!entry) {
      const el = document.createElement("div");
      el.setAttribute("data-webura-overlay-preview", "");
      el.style.position = "fixed";
      el.style.pointerEvents = "none";
      el.style.zIndex = "2147483643";
      document.body.appendChild(el);
      entry = { el, img };
      overlayPreviews.set(componentId, entry);
    }
    entry.img = img;
    const cs = getComputedStyle(img);
    entry.el.style.borderRadius = cs.borderRadius;
    entry.el.style.clipPath = cs.clipPath === "none" ? "" : cs.clipPath;
    entry.el.style.background = overlay.color;
    entry.el.style.opacity = String(
      Math.max(0, Math.min(100, overlay.opacity)) / 100,
    );
    entry.el.style.mixBlendMode = overlay.blendMode || "normal";
    positionOverlay(entry.el, img);
  }

  function clearOverlayPreview(componentId) {
    const entry = overlayPreviews.get(componentId);
    if (entry) {
      entry.el.remove();
      overlayPreviews.delete(componentId);
    }
    imageOverlayState.delete(componentId);
  }

  /** Post a selected image target to the parent (opens the image editor). */
  function postImageSelected(target) {
    const componentId = imageComponentId(target);
    if (!componentId) return; // untagged target with no tagged anchor — can't map to source
    const rect = target.el.getBoundingClientRect();
    const img = target.kind === "background" ? null : elementImg(target.el);
    // Send the RESOLVED absolute URL (not the app-relative `src` attribute) so
    // the parent's panel can actually load the thumbnail. Background urls from
    // getComputedStyle are already absolute.
    const previewSrc =
      (img && (img.currentSrc || img.src)) || target.currentSrc || "";
    window.parent.postMessage(
      {
        type: "webura-image-selected",
        componentId,
        name:
          (target.el.dataset && target.el.dataset.weburaName) ||
          target.el.getAttribute("alt") ||
          (target.kind === "background" ? "background image" : "image"),
        currentSrc: previewSrc,
        targetKind: target.kind,
        // Design controls only apply to a real <img> (not a CSS background).
        current: img ? readImageStyle(img, componentId) : null,
        coordinates: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
      },
      "*",
    );
  }

  function onKeyCapture(e) {
    if (!active) return;
    if (e.key === "Escape") {
      e.preventDefault();
      deactivate();
      window.parent.postMessage({ type: "webura-image-edit-escaped" }, "*");
    }
  }

  // Original image state captured before the FIRST live preview of an element, so
  // a Discard (or refused Save) can restore it without a manual reload.
  const imageOriginals = new Map(); // componentId -> restore()

  /** Snapshot the current image state so it can be restored on discard. */
  function captureImageOriginal(el, kind) {
    if (kind === "background") {
      const bg = el.style.backgroundImage;
      return () => {
        el.style.backgroundImage = bg;
      };
    }
    const img = elementImg(el);
    if (!img) return () => {};
    const src = img.getAttribute("src");
    const alt = img.getAttribute("alt");
    // Full inline-style snapshot (the Design panel live-edits many props; class-
    // based styling reappears once the inline declarations are cleared).
    const cssText = img.style.cssText;
    let sources = null;
    if (kind === "picture") {
      const pic = img.closest && img.closest("picture");
      if (pic)
        sources = Array.from(pic.querySelectorAll("source")).map((s) => ({
          s,
          srcset: s.getAttribute("srcset"),
          src: s.getAttribute("src"),
        }));
    }
    return () => {
      if (src === null) img.removeAttribute("src");
      else img.setAttribute("src", src);
      if (alt === null) img.removeAttribute("alt");
      else img.setAttribute("alt", alt);
      img.style.cssText = cssText;
      if (sources)
        for (const o of sources) {
          if (o.srcset === null) o.s.removeAttribute("srcset");
          else o.s.setAttribute("srcset", o.srcset);
          if (o.src === null) o.s.removeAttribute("src");
          else o.s.setAttribute("src", o.src);
        }
    };
  }

  /** Live-preview alt + Design on the target's <img>: assign the resolved inline-
   *  CSS map (clearing any managed prop absent from it), apply the overlay layer,
   *  and set alt. Save bakes the SAME CSS/overlay into source. */
  function handleModifyImageStyle(data) {
    if (!data || !data.componentId) return;
    const el = document.querySelector(
      `[data-webura-id="${CSS.escape(data.componentId)}"]`,
    );
    const img = el ? elementImg(el) : null;
    if (!img) return;
    if (!imageOriginals.has(data.componentId)) {
      imageOriginals.set(data.componentId, captureImageOriginal(el, "img"));
    }
    if (data.alt !== undefined) img.setAttribute("alt", data.alt || "");
    if (data.css !== undefined) {
      const css = data.css || {};
      for (const k of MANAGED_STYLE_KEYS) img.style[k] = css[k] || "";
    }
    if (data.overlay !== undefined)
      applyOverlayPreview(data.componentId, img, data.overlay);
  }

  /** Restore an element's original image (discard / refused Save). */
  function revertImageSrc(componentId) {
    const restore = imageOriginals.get(componentId);
    if (restore) {
      restore();
      imageOriginals.delete(componentId);
    }
    clearOverlayPreview(componentId);
  }

  /** Live-preview a new image src on the target (img / picture / background). */
  function handleModifyImageSrc(data) {
    if (!data || !data.componentId) return;
    const el = document.querySelector(
      `[data-webura-id="${CSS.escape(data.componentId)}"]`,
    );
    if (!el) return;
    const kind = data.targetKind || "img";
    // Capture the original ONCE (the first preview), so Discard can revert it.
    if (!imageOriginals.has(data.componentId)) {
      imageOriginals.set(data.componentId, captureImageOriginal(el, kind));
    }
    if (kind === "background") {
      el.style.backgroundImage = `url("${data.src}")`;
      return;
    }
    const img = elementImg(el);
    if (!img) return;
    // <picture>: blank the sibling <source>s so the new <img src> wins in preview.
    if (kind === "picture") {
      const pic = img.closest && img.closest("picture");
      if (pic)
        pic.querySelectorAll("source").forEach((s) => {
          s.removeAttribute("srcset");
          s.removeAttribute("src");
        });
    }
    // Cancel stale listeners on rapid swaps.
    if (img._weburaAbort) img._weburaAbort.abort();
    const controller = new AbortController();
    img._weburaAbort = controller;
    img.addEventListener(
      "error",
      () => {
        window.parent.postMessage(
          {
            type: "webura-image-load-error",
            componentId: data.componentId,
            src: data.src,
          },
          "*",
        );
      },
      { once: true, signal: controller.signal },
    );
    img.src = data.src;
  }

  function activate() {
    if (active) return;
    active = true;
    if (window.__weburaEdit) window.__weburaEdit.acquire();
    window.addEventListener("click", onClickCapture, true);
    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("keydown", onKeyCapture, true);
    installCursor();
  }

  function deactivate() {
    if (!active) return;
    active = false;
    if (window.__weburaEdit) window.__weburaEdit.release();
    window.removeEventListener("click", onClickCapture, true);
    window.removeEventListener("mousemove", onMove, true);
    window.removeEventListener("keydown", onKeyCapture, true);
    hideHover();
    removeCursor();
  }

  window.addEventListener("message", (e) => {
    if (e.source !== window.parent) return;
    const data = e.data || {};
    if (data.type === "activate-webura-image-edit") activate();
    else if (data.type === "deactivate-webura-image-edit") deactivate();
    else if (data.type === "modify-webura-image-src") {
      handleModifyImageSrc(data.data);
    } else if (data.type === "modify-webura-image-style") {
      handleModifyImageStyle(data);
    } else if (data.type === "revert-webura-image-src") {
      revertImageSrc(data.componentId);
    }
  });

  const realign = () => {
    if (active && hoverEl) showHover(hoverEl);
    // Keep any live overlay-preview divs pinned over their images.
    overlayPreviews.forEach((entry) => {
      if (entry.img && entry.img.isConnected)
        positionOverlay(entry.el, entry.img);
    });
  };
  window.addEventListener("resize", realign);
  window.addEventListener("scroll", realign, true);

  /** Restore every previewed image (src + overlay) to its original (discard). */
  function revertAllImages() {
    for (const componentId of Array.from(imageOriginals.keys()))
      revertImageSrc(componentId);
  }

  // Expose the image engine's core ops for the unified edit-mode toolbar.
  window.__weburaTools = window.__weburaTools || {};
  window.__weburaTools.image = {
    targetAt: imageTargetAtPoint,
    select: postImageSelected,
    /** Restore all previewed images to pristine (discard on exit / Esc). */
    revertAll: revertAllImages,
  };
})();

/* ============================================================================
 * Unified edit-mode controller (window.__weburaEditMode)
 * ----------------------------------------------------------------------------
 * A single toggle that, while on, mounts a small toolbar on whichever object the
 * pointer is over. Each button drives one of the existing engines (registered on
 * window.__weburaTools) FOR THAT element — Edit with AI (component select),
 * Replace image, Edit text — so the three tools become one WordPress-style
 * per-object launcher. Motion/interaction suppression comes from __weburaEdit.
 * ==========================================================================*/
(() => {
  if (window.__weburaEditMode) return;

  const setStyle = (el, obj) => Object.assign(el.style, obj);
  const tools = () => window.__weburaTools || {};

  let active = false;
  let toolbar = null;
  let overlay = null;
  let shield = null;
  let anchorEl = null;
  let hideTimer = 0;
  // Set while a parent-side surface (e.g. the image-replace picker) owns the
  // interaction, so the per-object hover bar stays out of its way.
  let barSuppressed = false;

  const ICON = {
    ai: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.94 15.5A2 2 0 0 0 8.5 14.06L2.37 12.5a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.56-6.13a.5.5 0 0 1 .96 0L14.06 8.5a2 2 0 0 0 1.44 1.44l6.13 1.56a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.56 6.13a.5.5 0 0 1-.96 0z"/></svg>',
    text: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>',
    image:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/></svg>',
    move: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l-3 3-3-3"/><path d="M19 9l3 3-3 3"/><path d="M2 12h20"/><path d="M12 2v20"/></svg>',
    trash:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
    duplicate:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    link: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    plus: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
    style:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/></svg>',
    gallery:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="14" height="12" rx="1"/><rect x="8" y="5" width="14" height="12" rx="1"/><rect x="5" y="3" width="14" height="12" rx="1"/></svg>',
  };

  const overToolbar = (node) =>
    !!(node && node.closest && node.closest("[data-webura-toolbar]"));
  const clearHide = () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = 0;
    }
  };
  const isEditingText = () => {
    const t = tools();
    return !!(t.text && t.text.isEditing && t.text.isEditing());
  };

  /**
   * True when a tagged element is a full-bleed "atmosphere" layer — absolute /
   * fixed media or gradient that covers most of its parent or the viewport and
   * carries little/no text. Heroes stamp these with data-webura-id; without a
   * demotion they steal hover from the heading/buttons sitting visually on top.
   */
  function isAtmosphereLayer(el) {
    if (!el || el.nodeType !== 1) return false;
    let style;
    try {
      style = getComputedStyle(el);
    } catch {
      return false;
    }
    const pos = style.position;
    if (pos !== "absolute" && pos !== "fixed") return false;
    const r = el.getBoundingClientRect();
    const area = Math.max(0, r.width) * Math.max(0, r.height);
    if (area <= 0) return false;
    const vw = window.innerWidth * window.innerHeight;
    // Covers a large share of the viewport (full-bleed hero media).
    if (vw > 0 && area >= vw * 0.45) return true;
    const parent = el.parentElement;
    if (parent) {
      const pr = parent.getBoundingClientRect();
      const pArea = Math.max(0, pr.width) * Math.max(0, pr.height);
      if (pArea > 0 && area >= pArea * 0.85) {
        const text = (el.innerText || "").replace(/\s+/g, " ").trim();
        // Empty / near-empty layers (img + gradient overlays) — not content.
        if (text.length < 8) return true;
      }
    }
    return false;
  }

  /**
   * The most specific tagged element under the cursor (skips our own chrome +
   * shield). Collects every tagged ancestor of the hit stack, enriches with
   * tagged descendants that still contain the point, demotes full-bleed
   * atmosphere layers, and returns the SMALLEST remaining box — so a hero
   * heading/button wins over the section or its background image layer.
   */
  function taggedAt(x, y) {
    const hits = document.elementsFromPoint(x, y);
    const candidates = new Set();
    for (const el of hits) {
      if (!el || el.nodeType !== 1) continue;
      if (el.hasAttribute && el.hasAttribute("data-webura-shield")) continue;
      if (overToolbar(el)) return null;
      let n = el;
      while (n && n !== document.documentElement) {
        if (n.hasAttribute && n.hasAttribute("data-webura-id"))
          candidates.add(n);
        n = n.parentElement;
      }
    }
    // Enrich: a hit may land on untagged text inside a small tagged control
    // whose nearest tagged ancestor is a large wrapper — also consider tagged
    // descendants of each candidate that contain the point and intersect hits.
    for (const c of Array.from(candidates)) {
      let nested;
      try {
        nested = c.querySelectorAll("[data-webura-id]");
      } catch {
        continue;
      }
      for (const d of nested) {
        const r = d.getBoundingClientRect();
        if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
        for (const h of hits) {
          if (!h || h.nodeType !== 1) continue;
          if (d === h || d.contains(h)) {
            candidates.add(d);
            break;
          }
        }
      }
    }

    let best = null;
    let bestArea = Infinity;
    let atmos = null;
    let atmosArea = Infinity;
    for (const tagged of candidates) {
      const r = tagged.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
      const area = Math.max(0, r.width) * Math.max(0, r.height);
      if (area <= 0) continue;
      if (isAtmosphereLayer(tagged)) {
        if (area < atmosArea) {
          atmosArea = area;
          atmos = tagged;
        }
        continue;
      }
      if (area < bestArea) {
        bestArea = area;
        best = tagged;
      }
    }
    return best || atmos;
  }

  function ensureToolbar() {
    if (toolbar) return toolbar;
    toolbar = document.createElement("div");
    toolbar.setAttribute("data-webura-toolbar", "");
    setStyle(toolbar, {
      position: "absolute",
      zIndex: "2147483647",
      display: "none",
      gap: "2px",
      padding: "3px",
      borderRadius: "8px",
      background: "#0b1220",
      border: "1px solid rgba(255,255,255,.12)",
      boxShadow: "0 6px 20px -4px rgba(0,0,0,.5)",
      pointerEvents: "auto",
    });
    // Keep the bar alive while the pointer is on it; onMove's keepZone logic
    // owns the hide decision (a mouseleave→hide here races with it and can drop
    // the bar mid-click, breaking the two-step delete).
    toolbar.addEventListener("mouseenter", clearHide);
    document.body.appendChild(toolbar);
    return toolbar;
  }

  // Blue highlight box drawn over the hovered element (mirrors the component
  // selector's outline) so it's clear which element the action bar belongs to.
  // Every declaration is `!important` via cssText so no app rule (a `!important`
  // reset, a `div{display:none}`, etc.) can suppress it; `outline` (not `border`)
  // also survives a Tailwind-preflight `border-width:0`.
  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.setAttribute("data-webura-overlay", "");
    document.body.appendChild(overlay);
    return overlay;
  }

  function positionOverlay(el) {
    const r = el.getBoundingClientRect();
    ensureOverlay().style.cssText = [
      "position:absolute !important",
      "z-index:2147483646 !important",
      "display:block !important",
      "pointer-events:none !important",
      "margin:0 !important",
      "outline:2px solid #3b82f6 !important",
      "outline-offset:-1px !important",
      "box-shadow:0 0 0 1px rgba(59,130,246,.45) !important",
      "border-radius:2px !important",
      "background:rgba(59,130,246,.12) !important",
      "box-sizing:border-box !important",
      `top:${r.top + window.scrollY}px !important`,
      `left:${r.left + window.scrollX}px !important`,
      `width:${r.width}px !important`,
      `height:${r.height}px !important`,
    ].join(";");
  }

  function hideOverlay() {
    if (overlay) overlay.style.setProperty("display", "none", "important");
  }

  // Full-viewport transparent shield that OWNS the native hover target while edit
  // mode is on, so the app's own `:hover` styles and cursor changes never fire
  // (the browser hovers the shield, not the page). Detection still works because
  // `elementsFromPoint` returns the whole stack behind it; the toolbar sits above
  // it and still receives clicks. Dropped to pointer-events:none while inline text
  // editing so caret clicks reach the text.
  function installShield() {
    if (shield) return;
    shield = document.createElement("div");
    shield.setAttribute("data-webura-shield", "");
    shield.style.cssText = [
      "position:fixed !important",
      "inset:0 !important",
      "z-index:2147483644 !important",
      "margin:0 !important",
      "background:transparent !important",
      "cursor:default !important",
    ].join(";");
    setShieldPointer(true);
    document.body.appendChild(shield);
  }
  function removeShield() {
    if (shield && shield.parentNode) shield.parentNode.removeChild(shield);
    shield = null;
  }
  function setShieldPointer(on) {
    if (shield)
      shield.style.setProperty(
        "pointer-events",
        on ? "auto" : "none",
        "important",
      );
  }
  function syncShield() {
    // While inline text editing, drop the shield so caret clicks reach the text.
    setShieldPointer(!isEditingText());
  }

  function styleButton(b, rest, variant) {
    setStyle(
      b,
      Object.assign(
        {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "26px",
          height: "26px",
          borderRadius: "6px",
          border: "none",
          background: "transparent",
          color: "#dbe4f0",
          cursor: "pointer",
        },
        rest || {},
      ),
    );
    // A destructive action (Delete) gets a red hover so its affordance reads as
    // distinct from the reversible content/structural buttons beside it.
    const danger = variant === "danger";
    b.addEventListener("mouseenter", () => {
      b.style.background = danger
        ? "rgba(239,68,68,.18)"
        : "rgba(255,255,255,.12)";
      if (danger) b.style.color = "#fca5a5";
    });
    b.addEventListener("mouseleave", () => {
      b.style.background = "transparent";
      if (danger) b.style.color = "#dbe4f0";
    });
  }

  // A hairline separator grouping the bar into content edits | structural ops.
  function makeDivider() {
    const d = document.createElement("div");
    d.setAttribute("data-webura-toolbar-divider", "");
    setStyle(d, {
      width: "1px",
      alignSelf: "stretch",
      margin: "3px 2px",
      background: "rgba(255,255,255,.14)",
    });
    return d;
  }

  function makeButton(iconKey, title, onActivate, variant) {
    const b = document.createElement("button");
    b.type = "button";
    b.title = title;
    b.innerHTML = ICON[iconKey];
    styleButton(b, null, variant);
    // Don't let mousedown steal focus / blur an active edit before click runs.
    b.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onActivate();
    });
    return b;
  }

  // ── Structural (rearranger) helpers ─────────────────────────────────────
  // The `data-webura-id` is `relativePath:line:column`. The rearranger works
  // PAGE-WIDE — a block can move into any container, even in a different source
  // file (the server transplants the JSX across files on save).
  const idOf = (el) => (el && el.getAttribute("data-webura-id")) || "";

  /**
   * True when there's at least one OTHER tagged element to anchor a drop against
   * (so Move is offered), excluding the element itself and its own descendants.
   */
  function hasOtherDroppable(el) {
    const all = document.querySelectorAll("[data-webura-id]");
    for (const c of all) {
      if (c !== el && !el.contains(c)) return true;
    }
    return false;
  }

  /** Find a tagged element by its `data-webura-id` (componentId). */
  function findByComponentId(componentId) {
    const all = document.querySelectorAll("[data-webura-id]");
    for (const c of all) if (idOf(c) === componentId) return c;
    return null;
  }

  /** The <a> to edit for a hovered element: itself if it's an anchor, else its
   *  first descendant <a> (mirrors the server's findAnchor). */
  function linkAnchorFor(el) {
    if (!el) return null;
    if (el.tagName === "A") return el;
    return (el.querySelector && el.querySelector("a")) || null;
  }

  /** Viewport rect of an element, as a plain object for postMessage. */
  function rectOf(el) {
    const r = el.getBoundingClientRect();
    return {
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
      bottom: r.bottom,
      right: r.right,
    };
  }

  // Optimistic DOM ops awaiting Save; used to revert if the save is refused.
  const optimistic = new Map(); // componentId -> { type, el, parent, next }
  let drag = null; // in-progress move: { el, siblings, indicator, target, position }

  function makeIndicator() {
    const ind = document.createElement("div");
    ind.setAttribute("data-webura-toolbar", ""); // ignored by hover/overToolbar
    setStyle(ind, {
      position: "absolute",
      zIndex: "2147483646",
      background: "#3b82f6",
      borderRadius: "2px",
      pointerEvents: "none",
      display: "none",
    });
    document.body.appendChild(ind);
    return ind;
  }

  /** True when two rects sit side-by-side (a row) rather than stacked. */
  function isRow(a, b) {
    const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return overlapY > Math.min(a.height, b.height) / 2;
  }

  /** The innermost OTHER tagged element under the cursor (the drop anchor),
   *  skipping our own chrome, the moved element, and its descendants. */
  function droppableUnder(x, y) {
    const els = document.elementsFromPoint(x, y);
    for (const el of els) {
      if (!el || el.nodeType !== 1) continue;
      if (el.hasAttribute && el.hasAttribute("data-webura-shield")) continue;
      if (overToolbar(el)) continue;
      const tagged = el.closest && el.closest("[data-webura-id]");
      if (tagged && tagged !== drag.el && !drag.el.contains(tagged)) {
        return tagged;
      }
    }
    return null;
  }

  /** Resolve the drop {target, position} for the cursor — page-wide, so the
   *  anchor is whatever tagged element sits under the pointer (any container /
   *  file), with before/after chosen by which half of it the cursor is in. */
  function computeDrop(x, y) {
    const target = droppableUnder(x, y);
    if (!target) return null;
    const r = target.getBoundingClientRect();
    const row = isRow(r, drag.el.getBoundingClientRect());
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const position = row
      ? x < cx
        ? "before"
        : "after"
      : y < cy
        ? "before"
        : "after";
    return { target, position, rect: r, row };
  }

  function drawIndicator(drop) {
    if (!drag || !drag.indicator) return;
    const ind = drag.indicator;
    if (!drop) {
      ind.style.display = "none";
      return;
    }
    const r = drop.rect;
    if (drop.row) {
      const x =
        (drop.position === "before" ? r.left : r.right) + window.scrollX;
      setStyle(ind, {
        display: "block",
        top: `${r.top + window.scrollY}px`,
        left: `${x - 1}px`,
        width: "2px",
        height: `${r.height}px`,
      });
    } else {
      const yy =
        (drop.position === "before" ? r.top : r.bottom) + window.scrollY;
      setStyle(ind, {
        display: "block",
        top: `${yy - 1}px`,
        left: `${r.left + window.scrollX}px`,
        width: `${r.width}px`,
        height: "2px",
      });
    }
  }

  function endDrag(commit) {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (d.cursorStyle && d.cursorStyle.parentNode)
      d.cursorStyle.parentNode.removeChild(d.cursorStyle);
    if (shield) shield.style.setProperty("cursor", "default", "important");
    if (d.el) d.el.style.opacity = d.prevOpacity || "";
    if (d.indicator && d.indicator.parentNode)
      d.indicator.parentNode.removeChild(d.indicator);
    window.removeEventListener("pointermove", onDragMove, true);
    window.removeEventListener("pointerup", onDragUp, true);

    if (commit && d.drop && d.drop.target !== d.el) {
      const movedId = idOf(d.el);
      const targetId = idOf(d.drop.target);
      const parent = d.el.parentElement;
      const next = d.el.nextSibling;
      // Optimistically reorder the real node (keeps its identity/attributes).
      if (d.drop.position === "before") {
        d.drop.target.parentElement.insertBefore(d.el, d.drop.target);
      } else {
        d.drop.target.parentElement.insertBefore(
          d.el,
          d.drop.target.nextSibling,
        );
      }
      // Keep the FIRST snapshot for this element so a revert/discard/undo returns
      // it to its ORIGINAL position — a 2nd/3rd move must NOT overwrite it with an
      // intermediate spot (that left discard/undo stranded one hop from home). An
      // already inserted/duplicated element keeps its own snapshot type so revert
      // still removes it rather than re-parenting it.
      if (!optimistic.has(movedId)) {
        optimistic.set(movedId, { type: "move", el: d.el, parent, next });
      }
      window.parent.postMessage(
        {
          type: "webura-block-moved",
          movedId,
          targetId,
          position: d.drop.position,
          name: d.el.getAttribute("data-webura-name") || "",
        },
        "*",
      );
    }
  }

  function onDragMove(e) {
    if (!drag) return;
    e.preventDefault();
    const drop = computeDrop(e.clientX, e.clientY);
    drag.drop = drop;
    drawIndicator(drop);
  }
  function onDragUp(e) {
    if (!drag) return;
    e.preventDefault();
    endDrag(true);
  }

  function startDrag(el) {
    if (!hasOtherDroppable(el)) return;
    hide();
    // Force the four-arrow move cursor everywhere for the duration of the drag
    // (element-level `cursor` rules would otherwise win over a body cursor).
    const cursorStyle = document.createElement("style");
    cursorStyle.textContent = "*{cursor:move !important}";
    document.head.appendChild(cursorStyle);
    // The shield's own inline `cursor:default !important` would otherwise beat
    // the stylesheet above (inline wins), so force it to move for the drag.
    if (shield) shield.style.setProperty("cursor", "move", "important");
    drag = {
      el,
      indicator: makeIndicator(),
      drop: null,
      prevOpacity: el.style.opacity,
      cursorStyle,
    };
    el.style.opacity = "0.5";
    window.addEventListener("pointermove", onDragMove, true);
    window.addEventListener("pointerup", onDragUp, true);
  }

  function makeMoveButton(el) {
    const b = document.createElement("button");
    b.type = "button";
    b.title = "Drag to move";
    b.innerHTML = ICON.move;
    styleButton(b, { cursor: "move" });
    b.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      startDrag(el);
    });
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    return b;
  }

  /**
   * Trash button — deletes on a single click. No confirm step: the delete is
   * optimistic and non-destructive until Save, and the Save/Discard capsule (plus
   * auto-discard on exiting edit mode) is the safety net.
   */
  function makeDeleteButton(el) {
    return makeButton(
      "trash",
      "Delete block",
      () => {
        const componentId = idOf(el);
        const parent = el.parentElement;
        const next = el.nextSibling;
        const name = el.getAttribute("data-webura-name") || "";
        // A `.map()` renders many instances that SHARE this id. Deleting one is a
        // data-delete (remove the source array element at its index), not a markup
        // delete — detect it (>1 real instance) so the parent can route it and the
        // optimistic entry is keyed per-instance (else two deletes would collide).
        const t = tools().text;
        const count = t && t.instanceCount ? t.instanceCount(componentId) : 1;
        const dynamic = count > 1;
        const index = dynamic && t && t.indexOf ? t.indexOf(el) : 0;
        const key = dynamic
          ? `datadelete:${componentId}:${index}`
          : componentId;
        if (parent) parent.removeChild(el);
        optimistic.set(key, { type: "delete", el, parent, next });
        hide();
        window.parent.postMessage(
          {
            type: "webura-block-deleted",
            componentId,
            name,
            dynamic,
            dynamicIndex: index,
          },
          "*",
        );
      },
      "danger",
    );
  }

  /**
   * Duplicate button — inserts a clone right after the block. Each clone gets a
   * UNIQUE `dup:<id>` (so repeated duplication keys its own optimistic/history
   * entry — the count is right and undo removes exactly one clone) and remembers
   * its SOURCE (`data-webura-dup-source`), the real element to clone on save —
   * so duplicating a clone traces back to a persistable node. A `.map()`/dynamic
   * source is refused on Save (which reverts the clone).
   */
  function makeDuplicateButton(el) {
    return makeButton("duplicate", "Duplicate block", () => {
      const sourceId = el.getAttribute("data-webura-dup-source") || idOf(el);
      const name = el.getAttribute("data-webura-name") || "";
      const tempId = `dup:${crypto.randomUUID()}`;
      const clone = el.cloneNode(true);
      clone.setAttribute("data-webura-id", tempId);
      clone.setAttribute("data-webura-dup-source", sourceId);
      if (el.parentElement)
        el.parentElement.insertBefore(clone, el.nextSibling);
      optimistic.set(tempId, {
        type: "duplicate",
        el: clone,
        parent: el.parentElement,
        next: null,
      });
      hide();
      window.parent.postMessage(
        {
          type: "webura-block-duplicated",
          componentId: tempId,
          sourceId,
          name,
        },
        "*",
      );
    });
  }

  // Original href captured before the first live link preview, so Discard (or a
  // cancelled popover) can restore it without a manual reload.
  const linkOriginals = new Map(); // componentId -> original href (string|null)

  /** Live-preview a link edit: point the element's <a> at the new href, and
   *  honour the "Open in new tab" toggle (target="_blank" + rel, or cleared). */
  function applyLinkHrefPreview(componentId, href, newTab) {
    const el = findByComponentId(componentId);
    const a = linkAnchorFor(el);
    if (!a) return;
    if (!linkOriginals.has(componentId))
      linkOriginals.set(componentId, a.getAttribute("href"));
    a.setAttribute("href", href);
    if (href && newTab) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    } else {
      a.removeAttribute("target");
      a.removeAttribute("rel");
    }
  }

  /** Restore an <a>'s original href (discard / cancelled popover). */
  function revertLinkHref(componentId) {
    const el = findByComponentId(componentId);
    const a = linkAnchorFor(el);
    if (a && linkOriginals.has(componentId)) {
      const orig = linkOriginals.get(componentId);
      if (orig === null) a.removeAttribute("href");
      else a.setAttribute("href", orig);
    }
    linkOriginals.delete(componentId);
  }

  // ── Style edits ("Edit with AI" menu: margin/padding/border/bg/text) ──────
  // Applied live as inline styles on the element; baked to Tailwind classes in
  // source on Save. Snapshot the element's inline cssText so Discard/undo revert.
  const styleOriginals = new Map(); // componentId -> restore()

  function styleTargetEl(componentId, runtimeId) {
    if (runtimeId) {
      const byRt = document.querySelector(
        `[data-webura-runtime-id="${CSS.escape(runtimeId)}"]`,
      );
      if (byRt) return byRt;
    }
    return findByComponentId(componentId);
  }

  /** Map the style menu's grouped values → inline CSS (camelCase) declarations. */
  function cssFromStyleObject(styles) {
    const css = {};
    const set = (k, v) => {
      if (v != null && v !== "") css[k] = v;
    };
    const m = styles.margin,
      p = styles.padding,
      b = styles.border,
      t = styles.text,
      d = styles.dimensions;
    if (m) {
      set("marginLeft", m.left);
      set("marginRight", m.right);
      set("marginTop", m.top);
      set("marginBottom", m.bottom);
    }
    if (p) {
      set("paddingLeft", p.left);
      set("paddingRight", p.right);
      set("paddingTop", p.top);
      set("paddingBottom", p.bottom);
    }
    if (b) {
      set("borderWidth", b.width);
      set("borderRadius", b.radius);
      set("borderColor", b.color);
      if (b.width) set("borderStyle", "solid");
    }
    set("backgroundColor", styles.backgroundColor);
    if (d) {
      set("width", d.width);
      set("height", d.height);
    }
    if (t) {
      set("fontSize", t.fontSize);
      set("fontWeight", t.fontWeight);
      set("color", t.color);
      set("fontFamily", t.fontFamily);
    }
    return css;
  }

  function applyComponentStyles(componentId, runtimeId, styles) {
    const el = styleTargetEl(componentId, runtimeId);
    if (!el) return;
    if (!styleOriginals.has(componentId)) {
      const prev = el.style.cssText;
      styleOriginals.set(componentId, () => {
        el.style.cssText = prev;
      });
    }
    const css = cssFromStyleObject(styles || {});
    for (const k in css) el.style[k] = css[k];
  }

  function revertComponentStyles(componentId) {
    const restore = styleOriginals.get(componentId);
    if (restore) {
      restore();
      styleOriginals.delete(componentId);
    }
  }

  /** Discard-on-exit: restore every link/style preview to its original. */
  function revertAllLinks() {
    for (const componentId of Array.from(linkOriginals.keys()))
      revertLinkHref(componentId);
  }
  function revertAllStyles() {
    for (const componentId of Array.from(styleOriginals.keys()))
      revertComponentStyles(componentId);
  }

  /** Read the element's current box/text styles for the menu's initial values. */
  function readComponentStyles(componentId, runtimeId) {
    const el = styleTargetEl(componentId, runtimeId);
    if (!el) return;
    const cs = getComputedStyle(el);
    window.parent.postMessage(
      {
        type: "webura-component-styles",
        data: {
          margin: {
            left: cs.marginLeft,
            right: cs.marginRight,
            top: cs.marginTop,
            bottom: cs.marginBottom,
          },
          padding: {
            left: cs.paddingLeft,
            right: cs.paddingRight,
            top: cs.paddingTop,
            bottom: cs.paddingBottom,
          },
          border: {
            width: cs.borderTopWidth,
            radius: cs.borderTopLeftRadius,
            color: cs.borderTopColor,
          },
          backgroundColor: cs.backgroundColor,
          text: {
            fontSize: cs.fontSize,
            fontWeight: cs.fontWeight,
            color: cs.color,
            fontFamily: cs.fontFamily,
          },
        },
      },
      "*",
    );
  }

  /** Undo an optimistic move/delete/duplicate when a Save is refused. */
  function revertOptimistic(componentId) {
    const op = optimistic.get(componentId);
    if (!op) return;
    optimistic.delete(componentId);
    // A duplicate or a newly-inserted element is undone by REMOVING the node
    // (not reinserting an original — there is none).
    if (op.type === "duplicate" || op.type === "insert") {
      if (op.el && op.el.parentNode) op.el.parentNode.removeChild(op.el);
      return;
    }
    if (!op.parent) return;
    if (op.next && op.next.parentNode === op.parent) {
      op.parent.insertBefore(op.el, op.next);
    } else {
      op.parent.appendChild(op.el);
    }
    if (op.type === "move") op.el.style.opacity = "";
  }

  /** Undo every pending optimistic move/delete (auto-discard on exiting edit mode). */
  function revertAllOptimistic() {
    for (const id of Array.from(optimistic.keys())) revertOptimistic(id);
  }

  // Redo: re-perform a previously-reverted structural op from the parent's stored
  // payload (mirrors the in-preview button/drag ops, minus the parent notify).
  // Each re-records the `optimistic` snapshot so a later undo can revert again.
  // Resolve the element a delete targets. A synthetic `datadelete:<realId>:<index>`
  // id (a `.map()` instance) is located by its clone-aware index; a plain id is a
  // one-off element found directly.
  function resolveDeletableEl(componentId) {
    if (componentId && componentId.indexOf("datadelete:") === 0) {
      const rest = componentId.slice("datadelete:".length);
      const li = rest.lastIndexOf(":");
      const realId = rest.slice(0, li);
      const index = parseInt(rest.slice(li + 1), 10) || 0;
      const t = tools().text;
      return t && t.elementAt ? t.elementAt(realId, index) : null;
    }
    return findByComponentId(componentId);
  }

  function applyBlockDelete(componentId) {
    const el = resolveDeletableEl(componentId);
    if (!el || !el.parentElement) return;
    const parent = el.parentElement;
    const next = el.nextSibling;
    parent.removeChild(el);
    optimistic.set(componentId, { type: "delete", el, parent, next });
  }
  function applyBlockDuplicate(tempId, sourceId) {
    // Redo: the clone was removed on undo, so re-clone the SOURCE and re-tag it
    // with the same unique id, inserting after the source.
    const source = sourceId ? findByComponentId(sourceId) : null;
    if (!source || !source.parentElement) return;
    const clone = source.cloneNode(true);
    clone.setAttribute("data-webura-id", tempId);
    clone.setAttribute("data-webura-dup-source", sourceId);
    source.parentElement.insertBefore(clone, source.nextSibling);
    optimistic.set(tempId, {
      type: "duplicate",
      el: clone,
      parent: source.parentElement,
      next: null,
    });
  }
  function applyBlockMove(movedId, targetId, position) {
    const el = findByComponentId(movedId);
    const target = findByComponentId(targetId);
    if (!el || !target) return;
    const parent = el.parentElement;
    const next = el.nextSibling;
    if (position === "before" && target.parentElement) {
      target.parentElement.insertBefore(el, target);
    } else if (position === "after" && target.parentElement) {
      target.parentElement.insertBefore(el, target.nextSibling);
    } else if (position === "inside-start") {
      target.insertBefore(el, target.firstChild);
    } else if (position === "inside-end") {
      target.appendChild(el);
    } else {
      return;
    }
    optimistic.set(movedId, { type: "move", el, parent, next });
  }

  // ----- Add Elements: click-to-place insertion -----
  // A palette item is "armed" from the parent (webura-begin-insert); moving over
  // the preview shows a drop indicator, and a click drops an optimistic
  // placeholder + notifies the parent to queue the real source insert.
  let placement = null; // { indicator, drop, payload }

  function droppableForInsert(x, y) {
    const els = document.elementsFromPoint(x, y);
    for (const el of els) {
      if (!el || el.nodeType !== 1) continue;
      if (el.hasAttribute && el.hasAttribute("data-webura-shield")) continue;
      if (el.hasAttribute && el.hasAttribute("data-webura-inserted")) continue;
      if (overToolbar(el)) continue;
      const tagged = el.closest && el.closest("[data-webura-id]");
      if (tagged) return tagged;
    }
    return null;
  }

  function computeInsertDrop(x, y) {
    const target = droppableForInsert(x, y);
    if (!target) return null;
    const r = target.getBoundingClientRect();
    const cy = r.top + r.height / 2;
    // Stacked before/after (adding a block above/below the anchor).
    return { target, position: y < cy ? "before" : "after", rect: r };
  }

  function drawInsertIndicator(drop) {
    const ind = placement && placement.indicator;
    if (!ind) return;
    if (!drop) {
      ind.style.display = "none";
      return;
    }
    const r = drop.rect;
    const yy = (drop.position === "before" ? r.top : r.bottom) + window.scrollY;
    setStyle(ind, {
      display: "block",
      top: `${yy - 1}px`,
      left: `${r.left + window.scrollX}px`,
      width: `${r.width}px`,
      height: "2px",
    });
  }

  function makeInsertPlaceholder(tempId, label) {
    // A deliberately placeholder-looking chip (NOT a fake unstyled component):
    // the real, theme-styled element is rendered by the app only after Save
    // rebuilds the preview, so make the pending state unambiguous.
    const ph = document.createElement("div");
    ph.setAttribute("data-webura-inserted", "");
    ph.setAttribute("data-webura-id", tempId);
    const dot = document.createElement("span");
    setStyle(dot, {
      width: "7px",
      height: "7px",
      borderRadius: "50%",
      background: "#3b82f6",
      flex: "0 0 auto",
      animation: "webura-insert-pulse 1.2s ease-in-out infinite",
    });
    const text = document.createElement("span");
    text.textContent = `${label || "New element"} · applies on Save`;
    ph.appendChild(dot);
    ph.appendChild(text);
    setStyle(ph, {
      display: "inline-flex",
      alignItems: "center",
      gap: "7px",
      padding: "6px 11px",
      margin: "6px 0",
      border: "1px dashed #3b82f6",
      borderRadius: "9999px",
      color: "#3b82f6",
      font: "500 12px system-ui, sans-serif",
      background: "rgba(59,130,246,0.08)",
    });
    // One-time keyframes for the pulse (id-guarded so repeated inserts don't dupe).
    if (!document.getElementById("webura-insert-kf")) {
      const style = document.createElement("style");
      style.id = "webura-insert-kf";
      style.textContent =
        "@keyframes webura-insert-pulse{0%,100%{opacity:.4}50%{opacity:1}}";
      (document.head || document.documentElement).appendChild(style);
    }
    return ph;
  }

  function insertPlaceholderAt(tempId, label, target, position) {
    if (!target || !target.parentElement) return;
    const ph = makeInsertPlaceholder(tempId, label);
    const parent = target.parentElement;
    const ref = position === "before" ? target : target.nextSibling;
    parent.insertBefore(ph, ref);
    optimistic.set(tempId, {
      type: "insert",
      el: ph,
      parent,
      next: ph.nextSibling,
    });
  }

  // Track the pointer during placement (called from the edit-mode `onMove`, so
  // it doesn't fight the mode's own capture listener / shield).
  function insertMove(x, y) {
    if (!placement) return;
    placement.drop = computeInsertDrop(x, y);
    drawInsertIndicator(placement.drop);
  }

  // Commit the placement at the current drop (called from `onClickCapture`).
  function performInsertAtDrop() {
    if (!placement) return;
    const drop = placement.drop;
    const payload = placement.payload;
    if (!drop) {
      cancelInsert();
      return;
    }
    const targetId = idOf(drop.target);
    insertPlaceholderAt(
      payload.tempId,
      payload.label,
      drop.target,
      drop.position,
    );
    window.parent.postMessage(
      {
        type: "webura-block-insert",
        tempId: payload.tempId,
        targetId,
        position: drop.position,
        snippetId: payload.snippetId,
        label: payload.label,
      },
      "*",
    );
    cancelInsert();
  }

  function beginInsert(payload) {
    cancelInsert();
    if (!active || !payload || !payload.tempId) return;
    // Placement is driven by the edit-mode onMove/onClickCapture handlers below
    // (gated on `placement`), so it shares the mode's shield + capture listeners
    // instead of racing a second set that the mode's stopImmediatePropagation
    // would swallow.
    placement = { indicator: makeIndicator(), drop: null, payload };
    if (shield) shield.style.setProperty("cursor", "copy", "important");
  }

  function cancelInsert() {
    if (!placement) return;
    if (placement.indicator && placement.indicator.parentNode) {
      placement.indicator.parentNode.removeChild(placement.indicator);
    }
    placement = null;
    if (shield) shield.style.setProperty("cursor", "default", "important");
  }

  // Redo of an insert: re-drop the placeholder at the anchor.
  function applyBlockInsert(tempId, targetId, position, label) {
    const target = findByComponentId(targetId);
    if (target) insertPlaceholderAt(tempId, label, target, position);
  }

  function positionToolbar(el) {
    const rect = el.getBoundingClientRect();
    // Keep in sync with src/lib/editModeToolbarPosition.ts
    // (`computeEditModeToolbarPosition`). Full-viewport heroes often have
    // rect.top ≈ 0; flipping below the element puts the bar under the fold and
    // scrolling to reach it drops keepZone / retargets. Pin into the visible
    // intersection of the element and the viewport instead.
    const barH = 34;
    const gap = 6;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const visTop = Math.max(rect.top, 0);
    const visBottom = Math.min(rect.bottom, vh);
    const visibleH = visBottom - visTop;
    let topClient;
    if (rect.top >= barH + gap) {
      topClient = rect.top - barH;
    } else if (visibleH >= barH + gap * 2) {
      topClient = visTop + gap;
    } else if (rect.bottom + gap + barH <= vh) {
      topClient = rect.bottom + gap;
    } else {
      topClient = Math.max(gap, Math.min(visTop + gap, vh - barH - gap));
    }
    const barW = (toolbar && toolbar.offsetWidth) || 280;
    const maxLeft = Math.max(gap, vw - barW - gap);
    let leftClient = Math.min(Math.max(rect.left, gap), maxLeft);

    // The parent app renders a persistent "Add Elements" pill at left-3/top-3
    // that paints OVER the iframe (different document — z-index can't help). When
    // our bar pins into the top strip it lands under that pill, so shove it clear:
    // right of the pill when it fits, otherwise below it. Keep in sync with
    // src/lib/editModeToolbarPosition.ts (reservedTopLeft).
    const RES_W = 150;
    const RES_H = 48;
    if (topClient < RES_H && leftClient < RES_W) {
      if (RES_W + gap + barW <= vw - gap) {
        leftClient = RES_W + gap;
      } else {
        topClient = RES_H + gap;
      }
    }

    setStyle(toolbar, {
      top: `${topClient + window.scrollY}px`,
      left: `${leftClient + window.scrollX}px`,
    });
  }

  /**
   * True when the pointer is within the current target's "safe zone" — the union
   * of the element box and the action bar, padded — so travelling up to the bar
   * (across the gap, where the topmost element is the PARENT) doesn't retarget.
   */
  function keepZone(x, y) {
    if (!anchorEl || !toolbar) return false;
    const e = anchorEl.getBoundingClientRect();
    const t = toolbar.getBoundingClientRect();
    const pad = 8;
    return (
      x >= Math.min(e.left, t.left) - pad &&
      x <= Math.max(e.right, t.right) + pad &&
      y >= Math.min(e.top, t.top) - pad &&
      y <= Math.max(e.bottom, t.bottom) + pad
    );
  }

  // ── Gallery / list quick-edit helpers ───────────────────────────────────
  // Covers: Swiper carousels, GSAP/horizontal `.map()` galleries (e.g. "The
  // Work"), list sections with data images (e.g. services hover images), and
  // static before/after image pairs (scroll-wipe heroes).
  let galleryCtx = null; // { kind, root, probeId, items?, images? }

  function isGalleryClone(el) {
    let n = el;
    while (n && n !== document.body && n.nodeType === 1) {
      if (n.classList) {
        if (n.classList.contains("swiper-slide-duplicate")) return true;
        if (n.classList.contains("slick-cloned")) return true;
      }
      n = n.parentElement;
    }
    return false;
  }

  function tagIdOf(el) {
    return (el && el.getAttribute && el.getAttribute("data-webura-id")) || "";
  }

  function realInstancesById(id) {
    if (!id) return [];
    const out = [];
    let all;
    try {
      all = document.querySelectorAll(
        '[data-webura-id="' + CSS.escape(id) + '"]',
      );
    } catch (_) {
      return [];
    }
    for (const node of all) if (!isGalleryClone(node)) out.push(node);
    return out;
  }

  function findSwiperRoot(el) {
    let n = el;
    while (n && n !== document.body && n.nodeType === 1) {
      if (n.classList && n.classList.contains("swiper")) return n;
      n = n.parentElement;
    }
    return null;
  }

  function realSwiperSlides(root) {
    if (!root) return [];
    const out = [];
    const nodes = root.querySelectorAll(".swiper-slide");
    for (const s of nodes) if (!isGalleryClone(s)) out.push(s);
    return out;
  }

  function slideThumbUrl(slide) {
    if (!slide) return "";
    // Prefer the browser-resolved absolute URL (img.currentSrc / img.src) so the
    // parent panel can load the thumb — same rule as webura-image-selected.
    if (slide.tagName === "IMG") {
      const s =
        slide.currentSrc || slide.src || slide.getAttribute("src") || "";
      if (s) return s;
    }
    const img = slide.querySelector && slide.querySelector("img");
    if (img) {
      const s =
        img.currentSrc ||
        img.src ||
        (img.getAttribute && img.getAttribute("src")) ||
        "";
      if (s) return s;
    }
    let n = slide;
    const seen = new Set();
    while (n && n.nodeType === 1 && !seen.has(n)) {
      seen.add(n);
      try {
        const bg = getComputedStyle(n).backgroundImage || "";
        const m = /url\(["']?([^"')]+)["']?\)/.exec(bg);
        if (m && m[1] && m[1] !== "none") return m[1];
      } catch (_) {}
      n = n.firstElementChild;
      if (!n) break;
    }
    return "";
  }

  function slideLabelText(slide, index) {
    if (!slide) return "Slide " + (index + 1);
    const t = (slide.innerText || "").replace(/\s+/g, " ").trim();
    if (t) return t.slice(0, 48);
    return "Slide " + (index + 1);
  }

  function highlightEl(el) {
    if (!el || !el.style) return;
    const prev = el.style.outline;
    const prevOff = el.style.outlineOffset;
    el.style.outline = "2px solid rgba(59,130,246,.85)";
    el.style.outlineOffset = "2px";
    setTimeout(() => {
      el.style.outline = prev;
      el.style.outlineOffset = prevOff;
    }, 700);
  }

  /**
   * A `.map()`-rendered list/gallery: the hovered node (or an ancestor) shares
   * its data-webura-id with ≥2 real instances on the page.
   */
  function findMapGalleryContext(el) {
    // Prefer the outermost repeated node so nested shared children (e.g. the
    // before/after <img>s inside each timeline panel) don't become the probe —
    // analyzing the panel (or list row) discovers the full item fields.
    let best = null;
    let n = el;
    while (n && n !== document.body && n.nodeType === 1) {
      const id = tagIdOf(n);
      if (id) {
        const items = realInstancesById(id);
        if (items.length >= 2) {
          best = {
            kind: "map",
            probeId: id,
            items: items,
            root: items[0].parentElement || items[0],
          };
        }
      }
      n = n.parentElement;
    }
    return best;
  }

  /**
   * Static multi-image set (before/after wipe heroes): a nearby <section>
   * with ≥2 distinct large images that are NOT map instances.
   */
  function findStaticImageSet(el) {
    if (findMapGalleryContext(el) || findSwiperRoot(el)) return null;
    let section = el.closest ? el.closest("section") : null;
    if (!section) {
      section = el;
      while (section && section !== document.body) {
        if (section.tagName === "SECTION") break;
        section = section.parentElement;
      }
    }
    if (!section || section === document.body) return null;
    const imgs = Array.from(section.querySelectorAll("img")).filter((img) => {
      if (isGalleryClone(img)) return false;
      const r = img.getBoundingClientRect();
      return r.width >= 64 && r.height >= 64;
    });
    if (imgs.length < 2) return null;
    const images = [];
    const seenSrc = new Set();
    for (const img of imgs) {
      const src = img.currentSrc || img.src || img.getAttribute("src") || "";
      if (!src || seenSrc.has(src)) continue;
      seenSrc.add(src);
      const tagged =
        (img.hasAttribute("data-webura-id") && img) ||
        (img.closest && img.closest("[data-webura-id]"));
      const id = tagIdOf(tagged) || tagIdOf(img);
      if (!id) continue;
      if (realInstancesById(id).length >= 2) continue;
      images.push({
        el: img,
        componentId: id,
        thumb: src,
        label: img.getAttribute("alt") || "",
      });
    }
    if (images.length < 2) return null;
    return { kind: "static-images", root: section, images: images };
  }

  function galleryProbeIdFromSwiper(root) {
    if (!root) return "";
    const slides = realSwiperSlides(root);
    const counts = new Map();
    for (const slide of slides) {
      const tagged = slide.querySelectorAll
        ? slide.querySelectorAll("[data-webura-id]")
        : [];
      const seen = new Set();
      for (const t of tagged) {
        if (isGalleryClone(t)) continue;
        const id = tagIdOf(t);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        counts.set(id, (counts.get(id) || 0) + 1);
      }
      const sid = tagIdOf(slide);
      if (sid) counts.set(sid, (counts.get(sid) || 0) + 1);
    }
    let best = "";
    let bestCount = 0;
    for (const [id, c] of counts) {
      if (c > bestCount) {
        best = id;
        bestCount = c;
      }
    }
    if (best) return best;
    const any = root.querySelector && root.querySelector("[data-webura-id]");
    return tagIdOf(any);
  }

  function collectSwiperSlides(root) {
    const slides = realSwiperSlides(root);
    return slides.map((slide, index) => {
      const logical =
        slide.dataset && slide.dataset.swiperSlideIndex != null
          ? parseInt(slide.dataset.swiperSlideIndex, 10)
          : index;
      return {
        index: Number.isFinite(logical) ? logical : index,
        thumb: slideThumbUrl(slide),
        label: slideLabelText(slide, index),
      };
    });
  }

  function swiperActiveIndex(root) {
    if (!root) return 0;
    const sw = root.swiper;
    if (sw && typeof sw.realIndex === "number") return sw.realIndex;
    if (sw && typeof sw.activeIndex === "number") return sw.activeIndex;
    const active = root.querySelector(".swiper-slide-active");
    if (active) {
      const v = active.dataset && active.dataset.swiperSlideIndex;
      if (v != null && /^\d+$/.test(v)) return parseInt(v, 10);
    }
    return 0;
  }

  function resolveGalleryContext(el) {
    const swiper = findSwiperRoot(el);
    if (swiper) {
      const probeId = galleryProbeIdFromSwiper(swiper);
      if (!probeId) return null;
      return {
        kind: "swiper",
        root: swiper,
        probeId: probeId,
        items: realSwiperSlides(swiper),
      };
    }
    const mapCtx = findMapGalleryContext(el);
    if (mapCtx) return mapCtx;
    const staticCtx = findStaticImageSet(el);
    if (staticCtx) return staticCtx;
    return null;
  }

  function galleryHasVisualMedia(ctx) {
    if (!ctx) return false;
    if (ctx.kind === "static-images") return true;
    const items = ctx.items || [];
    for (const it of items) {
      if (slideThumbUrl(it)) return true;
      if (it.querySelector && it.querySelector("img")) return true;
    }
    return false;
  }

  function openGalleryEditor(el) {
    const ctx = resolveGalleryContext(el);
    if (!ctx) return;
    galleryCtx = ctx;
    hide();

    if (ctx.kind === "static-images") {
      const slides = ctx.images.map((img, index) => ({
        index: index,
        thumb: img.thumb,
        label:
          img.label ||
          (index === 0
            ? "Before"
            : index === 1
              ? "After"
              : "Image " + (index + 1)),
        componentId: img.componentId,
      }));
      window.parent.postMessage(
        {
          type: "webura-gallery-open",
          kind: "static-images",
          rootId: tagIdOf(ctx.root) || slides[0].componentId,
          probeId: slides[0].componentId,
          activeIndex: 0,
          slides: slides,
        },
        "*",
      );
      return;
    }

    const items = ctx.items || [];
    let activeIndex = 0;
    if (ctx.kind === "swiper") activeIndex = swiperActiveIndex(ctx.root);
    else {
      let idx = items.indexOf(el);
      if (idx < 0)
        idx = items.findIndex((it) => it.contains && it.contains(el));
      if (idx >= 0) activeIndex = idx;
    }

    const slides =
      ctx.kind === "swiper"
        ? collectSwiperSlides(ctx.root)
        : items.map((item, index) => ({
            index: index,
            thumb: slideThumbUrl(item),
            label: slideLabelText(item, index),
          }));

    window.parent.postMessage(
      {
        type: "webura-gallery-open",
        kind: ctx.kind,
        rootId: tagIdOf(ctx.root) || ctx.probeId,
        probeId: ctx.probeId,
        activeIndex: activeIndex,
        slides: slides,
      },
      "*",
    );
  }

  function slideGalleryTo(index) {
    const ctx = galleryCtx;
    if (!ctx) {
      const roots = document.querySelectorAll(".swiper");
      for (const root of roots) {
        const sw = root.swiper;
        if (!sw) continue;
        try {
          if (typeof sw.slideToLoop === "function") sw.slideToLoop(index);
          else if (typeof sw.slideTo === "function") sw.slideTo(index);
        } catch (_) {}
      }
      return;
    }
    if (ctx.kind === "swiper") {
      const sw = ctx.root && ctx.root.swiper;
      if (sw) {
        try {
          if (typeof sw.slideToLoop === "function") sw.slideToLoop(index);
          else if (typeof sw.slideTo === "function") sw.slideTo(index);
        } catch (_) {
          try {
            sw.slideTo(index);
          } catch (_) {}
        }
      }
      const slides = realSwiperSlides(ctx.root);
      if (slides[index]) highlightEl(slides[index]);
      return;
    }
    if (ctx.kind === "map" && ctx.items && ctx.items[index]) {
      const item = ctx.items[index];
      try {
        item.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      } catch (_) {}
      highlightEl(item);
      return;
    }
    if (ctx.kind === "static-images" && ctx.images && ctx.images[index]) {
      const img = ctx.images[index].el;
      try {
        img.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (_) {}
      highlightEl(img);
    }
  }

  function collectGalleryThumbsFromCtx() {
    if (!galleryCtx) return { slides: [], activeIndex: 0 };
    if (galleryCtx.kind === "swiper") {
      return {
        slides: collectSwiperSlides(galleryCtx.root),
        activeIndex: swiperActiveIndex(galleryCtx.root),
      };
    }
    if (galleryCtx.kind === "map" && galleryCtx.items) {
      const items = realInstancesById(galleryCtx.probeId);
      galleryCtx.items = items.length ? items : galleryCtx.items;
      return {
        slides: galleryCtx.items.map((item, index) => ({
          index: index,
          thumb: slideThumbUrl(item),
          label: slideLabelText(item, index),
        })),
        activeIndex: 0,
      };
    }
    if (galleryCtx.kind === "static-images" && galleryCtx.images) {
      return {
        slides: galleryCtx.images.map((img, index) => ({
          index: index,
          thumb: img.thumb,
          label: img.label || "Image " + (index + 1),
          componentId: img.componentId,
        })),
        activeIndex: 0,
      };
    }
    return { slides: [], activeIndex: 0 };
  }

  function previewGalleryField(probeId, index, field, value, previousValue) {
    const items = probeId
      ? realInstancesById(probeId)
      : (galleryCtx && galleryCtx.items) || [];
    const item = items[index];
    if (!item) return;

    const next = value == null ? "" : String(value);
    const prev =
      previousValue == null || previousValue === ""
        ? null
        : String(previousValue);

    // Counter / stats fields: GSAP reads data-value and tweens innerText, so the
    // visible text won't equal `previousValue` mid-animation. Detect the numeral
    // by the DOM markers GSAP uses OR by the committed value being numeric — NOT
    // only by the field key (keys like "years"/"projects"/"price" must work too).
    const numeralNode =
      (item.classList &&
        (item.classList.contains("stat-numeral") ||
          item.hasAttribute("data-value")) &&
        item) ||
      (item.querySelector &&
        item.querySelector(".stat-numeral,[data-value]")) ||
      null;
    const strippedNext = next.replace(/[,\s+%$]/g, "");
    const valueLooksNumeric =
      strippedNext !== "" && !Number.isNaN(Number(strippedNext));
    const keyLooksNumeric =
      field === "value" ||
      /^(value|count|amount|total|qty|quantity|number|num|n|years?|projects?|customers?|clients?|price|rating|percent|stars?)$/i.test(
        field || "",
      );

    if (numeralNode || valueLooksNumeric || keyLooksNumeric) {
      let numeral = numeralNode;
      if (!numeral && prev) {
        const candidates = item.querySelectorAll(
          ".stat-numeral,[data-value],span,div,p,h1,h2,h3,h4,strong,b",
        );
        for (const el of candidates) {
          if ((el.textContent || "").trim() === prev) {
            numeral = el;
            break;
          }
        }
      }
      // Last resort: the single leaf currently showing a number (an animated
      // counter whose visible text no longer equals `prev`).
      if (!numeral) {
        const numericLeaves = [];
        const cands = item.querySelectorAll(
          ".stat-numeral,[data-value],span,div,p,h1,h2,h3,h4,strong,b",
        );
        for (const el of cands) {
          if (
            (!el.children || el.children.length === 0) &&
            /\d/.test(el.textContent || "")
          ) {
            numericLeaves.push(el);
          }
        }
        if (numericLeaves.length === 1) numeral = numericLeaves[0];
      }
      if (numeral) {
        try {
          if (window.gsap && typeof window.gsap.killTweensOf === "function") {
            window.gsap.killTweensOf(numeral);
          }
        } catch (_) {}
        if (numeral.hasAttribute("data-value")) {
          numeral.setAttribute("data-value", next);
        }
        numeral.textContent = next;
        highlightEl(item);
        return;
      }
    }

    // Label / suffix / other text: exact text match within the mapped item.
    if (prev != null) {
      const all = [item, ...Array.from(item.querySelectorAll("*"))];
      for (const el of all) {
        if (el.children && el.children.length > 0) {
          // Prefer leaf-ish nodes: only direct text, no element children with text.
          let onlyText = true;
          for (const c of el.childNodes) {
            if (c.nodeType === 1) {
              onlyText = false;
              break;
            }
          }
          if (!onlyText && el !== item) continue;
        }
        if ((el.textContent || "").trim() === prev) {
          // Replace only this node's text content when it's a leaf.
          if (!el.children || el.children.length === 0) {
            el.textContent = next;
            highlightEl(item);
            return;
          }
        }
      }
      // Fallback: walk text nodes.
      const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if ((node.nodeValue || "").trim() === prev) {
          node.nodeValue = next;
          highlightEl(item);
          return;
        }
      }
    }
  }

  function showToolbarFor(el, x, y) {
    const t = tools();
    const bar = ensureToolbar();
    bar.innerHTML = "";
    if (t.selector && t.selector.select) {
      bar.appendChild(
        makeButton("ai", "Edit with AI", () => {
          // Dock the component on the chat input for an AI edit, then dismiss the
          // hover bar/overlay. Post directly (not the old selector's select(),
          // which drew a SECOND, persistent overlay that never cleared) so nothing
          // lingers when you click away or move to another element.
          hide();
          if (!el.dataset.weburaRuntimeId) {
            el.dataset.weburaRuntimeId = `webura-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 11)}`;
          }
          window.parent.postMessage(
            {
              type: "webura-component-selected",
              component: {
                id: idOf(el),
                name: el.getAttribute("data-webura-name") || "",
                runtimeId: el.dataset.weburaRuntimeId,
              },
              coordinates: rectOf(el),
            },
            "*",
          );
        }),
      );
      // Edit style — opens the style panel (margin/padding/border/bg/text) for
      // THIS element as a sub-menu of the hover bar. Kept separate from Edit with
      // AI so styling never also docks the element on the chat input.
      bar.appendChild(
        makeButton("style", "Edit style", () => {
          hide();
          if (!el.dataset.weburaRuntimeId) {
            el.dataset.weburaRuntimeId = `webura-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 11)}`;
          }
          window.parent.postMessage(
            {
              type: "webura-open-style-menu",
              component: {
                id: idOf(el),
                name: el.getAttribute("data-webura-name") || "",
                runtimeId: el.dataset.weburaRuntimeId,
              },
              coordinates: rectOf(el),
            },
            "*",
          );
        }),
      );
    }
    // Resolve any slider/list (gallery) context up-front. When the hovered node
    // is inside a text-bearing list/slider, that element's own editor already
    // covers every part of it — text included — so we suppress the standalone
    // "Edit text" ("T") button to avoid two overlapping ways to edit the same
    // text. Image-only sets ("static-images") don't edit text, so "T" still
    // shows there (e.g. a heading beside a before/after image hero).
    const galleryHit = resolveGalleryContext(el);
    const galleryCoversText =
      !!galleryHit && galleryHit.kind !== "static-images";
    const textTarget = t.text && t.text.targetAt ? t.text.targetAt(x, y) : null;
    if (textTarget && t.text.begin && !galleryCoversText) {
      bar.appendChild(
        makeButton("text", "Edit text", () => {
          hide();
          setShieldPointer(false); // let caret clicks reach the text being edited
          t.text.begin(textTarget);
        }),
      );
    }
    // Edit link — shown when the element is (or contains) an <a>. Coexists with
    // Edit text (which changes the link's label) — this changes its destination.
    const linkEl = linkAnchorFor(el);
    if (linkEl) {
      bar.appendChild(
        makeButton("link", "Edit link", () => {
          hide(); // the parent href popover takes over; keep the bar out of its way
          window.parent.postMessage(
            {
              type: "webura-link-selected",
              componentId: idOf(el),
              name: el.getAttribute("data-webura-name") || "",
              href: linkEl.getAttribute("href") || "",
              coordinates: rectOf(el),
            },
            "*",
          );
        }),
      );
    }
    const imgTarget =
      t.image && t.image.targetAt ? t.image.targetAt(x, y) : null;
    // Offer "Edit image" for the image under the cursor UNLESS it belongs to an
    // ANCESTOR of the hovered element — i.e. a background on a parent, like a
    // small badge/heading sitting on a hero's background image. Show it when the
    // image is the element itself, lives INSIDE it, OR is a SIBLING in the same
    // container (a decorative/hover overlay <div> next to the real <img>) — that
    // sibling-overlay case is common in cards and used to be wrongly suppressed.
    const imgOwnedByAncestor =
      imgTarget &&
      imgTarget.el !== el &&
      imgTarget.el.contains &&
      imgTarget.el.contains(el);
    if (imgTarget && t.image.select && !imgOwnedByAncestor) {
      bar.appendChild(
        makeButton("image", "Edit image", () => {
          hide(); // the parent picker takes over; keep the bar out of its way
          t.image.select(imgTarget);
        }),
      );
    }
    // Edit slides / list — Swiper, mapped galleries, or static image sets.
    // (galleryHit was resolved above to gate the "Edit text" button.)
    if (galleryHit) {
      const galleryTitle =
        galleryHit.kind === "static-images" || galleryHasVisualMedia(galleryHit)
          ? "Edit slides"
          : "Edit list";
      bar.appendChild(
        makeButton("gallery", galleryTitle, () => {
          openGalleryEditor(el);
        }),
      );
    }
    // Divider — everything above edits the element's CONTENT (AI / text / link /
    // image); everything below is a STRUCTURAL op (add / move / duplicate /
    // delete). The split keeps the (up-to-eight-button) bar scannable.
    if (bar.childNodes.length) bar.appendChild(makeDivider());
    // Add element — opens the palette to insert a new block around THIS section,
    // so every section carries its own add affordance in edit mode.
    bar.appendChild(
      makeButton("plus", "Add element here", () => {
        hide();
        window.parent.postMessage(
          { type: "webura-open-add-elements", componentId: idOf(el) },
          "*",
        );
      }),
    );
    // Structural actions: Move (page-wide) + Duplicate + Delete.
    if (hasOtherDroppable(el)) {
      bar.appendChild(makeMoveButton(el));
    }
    bar.appendChild(makeDuplicateButton(el));
    bar.appendChild(makeDeleteButton(el));
    if (!bar.childNodes.length) {
      hide();
      return;
    }
    anchorEl = el;
    positionToolbar(el);
    positionOverlay(el);
    bar.style.display = "flex";
  }

  function scheduleHide() {
    clearHide();
    hideTimer = setTimeout(hide, 260);
  }
  function hide() {
    clearHide();
    if (toolbar) toolbar.style.display = "none";
    hideOverlay();
    anchorEl = null;
  }

  function onMove(e) {
    if (!active) return;
    if (drag) return; // a block drag owns the pointer; don't re-show the toolbar
    if (placement) {
      // Placing a palette element: show the drop indicator, no hover toolbar.
      hide();
      syncShield();
      insertMove(e.clientX, e.clientY);
      return;
    }
    if (barSuppressed) {
      hide();
      return;
    }
    if (overToolbar(e.target)) {
      clearHide();
      return;
    }
    if (isEditingText()) {
      syncShield(); // let caret clicks through to the text while editing
      hide();
      return;
    }
    syncShield();
    const x = e.clientX;
    const y = e.clientY;
    const el = taggedAt(x, y);
    // Sticky targeting: while inside the current element+bar safe zone, keep the
    // target so moving up to the action bar never makes it jump/flee. Still allow
    // drilling DOWN into a tagged descendant. Also allow switching to a much
    // smaller sibling/cousin under the cursor (hero section focused → button),
    // and always release when the current anchor is an atmosphere layer.
    if (
      anchorEl &&
      toolbar &&
      toolbar.style.display !== "none" &&
      keepZone(x, y)
    ) {
      clearHide();
      if (el && el !== anchorEl) {
        const canDrill = anchorEl.contains(el);
        let canRetargetSmaller = false;
        if (!canDrill) {
          try {
            const a = anchorEl.getBoundingClientRect();
            const b = el.getBoundingClientRect();
            const aArea = Math.max(0, a.width) * Math.max(0, a.height);
            const bArea = Math.max(0, b.width) * Math.max(0, b.height);
            // New target ≤ 35% of current (or current is atmosphere) → retarget.
            canRetargetSmaller =
              isAtmosphereLayer(anchorEl) ||
              (aArea > 0 && bArea > 0 && bArea <= aArea * 0.35);
          } catch {
            canRetargetSmaller = false;
          }
        }
        if (canDrill || canRetargetSmaller) showToolbarFor(el, x, y);
      }
      return;
    }

    if (!el) {
      scheduleHide();
      return;
    }
    clearHide();
    if (el === anchorEl) return;
    showToolbarFor(el, x, y);
  }

  // Interactive control under the cursor whose click should still fire in edit
  // mode so collapsed FAQ / disclosure / tab content can be revealed. Algorithm
  // kept in sync with `src/lib/collapsibleClickThrough.ts` (unit-tested).
  // Links are excluded so edit mode never navigates away.
  const CLICK_THROUGH_CONTROL_SELECTOR =
    'button,summary,details,[role="button"],[role="tab"],[aria-expanded]';

  function isClickThroughControl(el) {
    if (!el || el.nodeType !== 1) return false;
    try {
      if (el.matches && el.matches("a[href]")) return false;
      if (el.matches && el.matches(CLICK_THROUGH_CONTROL_SELECTOR)) return true;
      if (el.hasAttribute && el.hasAttribute("aria-expanded")) return true;
    } catch {
      /* ignore */
    }
    return false;
  }

  function findClickThroughAncestor(start) {
    let node = start;
    while (node && node.nodeType === 1) {
      try {
        if (node.matches && node.matches("a[href]")) return null;
      } catch {
        /* ignore */
      }
      if (isClickThroughControl(node)) return node;
      try {
        if (getComputedStyle(node).cursor === "pointer") return node;
      } catch {
        /* ignore */
      }
      node = node.parentElement;
    }
    return null;
  }

  function collapsibleTriggerAtPoint(x, y) {
    const els = document.elementsFromPoint(x, y);
    for (const el of els) {
      if (!el || el.nodeType !== 1) continue;
      if (el.hasAttribute && el.hasAttribute("data-webura-shield")) continue;
      if (el.closest && el.closest("[data-webura-toolbar]")) continue;
      // Only the topmost non-shield content entry's ancestor chain — don't fall
      // through to a buried control under ordinary text.
      return findClickThroughAncestor(el);
    }
    return null;
  }

  // True while we intentionally re-fire a click onto a collapsible trigger so
  // our own capture-phase swallower lets that gesture reach React / the DOM.
  let allowingClickThrough = false;

  // Re-fire a click on `el`. Uses HTMLElement.click() (not a hand-built
  // MouseEvent) so React 17+ root delegation reliably runs the app's onClick —
  // the previous MouseEvent dispatch was silently ignored for many FAQ
  // buttons. The shield is briefly pierced so elementFromPoint-based libraries
  // also see the real target.
  function fireClickThrough(el) {
    if (!el) return;
    allowingClickThrough = true;
    const shieldWasOn = !!(shield && shield.style.pointerEvents !== "none");
    try {
      if (shieldWasOn) setShieldPointer(false);
      if (typeof el.click === "function") el.click();
    } catch {
      /* best effort */
    } finally {
      allowingClickThrough = false;
      if (shieldWasOn) setShieldPointer(!isEditingText());
    }
  }

  function onClickCapture(e) {
    if (!active) return;
    // Pass-through for our own re-fired collapsible toggles AND for
    // `__weburaEdit` auto-expand clicks (marked `__weburaSynthetic`). Let
    // onClick handlers run; only block defaults that would navigate / submit.
    if (
      allowingClickThrough ||
      e.__weburaSynthetic ||
      (window.__weburaEdit &&
        typeof window.__weburaEdit.isSyntheticClick === "function" &&
        window.__weburaEdit.isSyntheticClick())
    ) {
      try {
        const t = e.target;
        if (
          t &&
          t.closest &&
          t.closest('a[href], button[type="submit"], input[type="submit"]')
        ) {
          if (typeof e.preventDefault === "function") e.preventDefault();
        }
        // Native <details>/<summary> toggle IS the default action — do NOT
        // preventDefault for those, or summaries never open.
      } catch {
        /* ignore */
      }
      return;
    }
    if (overToolbar(e.target)) return; // toolbar buttons handle their own clicks

    // Resolve a collapsible trigger BEFORE swallowing — once we stopPropagation
    // the app never sees this gesture, so we must re-fire onto the control.
    const trigger =
      e.detail <= 1 ? collapsibleTriggerAtPoint(e.clientX, e.clientY) : null;

    // Swallow app clicks (navigation/handlers). NOT mousedown — caret placement
    // and blur-to-finish for inline text editing rely on it.
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function")
      e.stopImmediatePropagation();
    // Placing a palette element: drop it at the indicated location.
    if (placement) {
      performInsertAtDrop();
      return;
    }
    const t = tools();
    const editingEl =
      t.text && t.text.editingElement ? t.text.editingElement() : null;
    if (editingEl) {
      // A click OUTSIDE the edited element finalizes it (which hides the parent
      // formatting toolbar + colour menu); a click inside just moves the caret.
      if (!editingEl.contains(e.target)) t.text.finish();
      return;
    }
    // Single click on an interactive control (accordion / disclosure / <details>
    // / tab / cursor:pointer header) re-fires it so a collapsed FAQ can be opened
    // to edit its content WITHOUT leaving edit mode. Double-click is reserved for
    // start-text-editing below.
    if (trigger) {
      fireClickThrough(trigger);
      return;
    }
    // Double-click ANY text to start editing it directly (no need to reach for
    // the hover toolbar's "T"). `dblclick` itself is swallowed by __weburaEdit, so
    // we detect it via the click's `detail` count on the plain (unblocked) click.
    if (e.detail >= 2 && t.text && t.text.begin && t.text.targetAt) {
      const target = t.text.targetAt(e.clientX, e.clientY);
      if (target) {
        hide();
        setShieldPointer(false); // let caret clicks reach the text being edited
        t.text.begin(target);
        return;
      }
    }
    // A plain preview click with nothing being placed or edited is a "click
    // away": tell the parent to dismiss any open editor surface (the Add Elements
    // palette, the image editor, the link popover). Harmless when none is open.
    window.parent.postMessage({ type: "webura-edit-clicked-away" }, "*");
  }

  function onKey(e) {
    if (!active || e.key !== "Escape") return;
    // Escape peels back one layer at a time: placement → drag → text edit → exit.
    if (placement) {
      cancelInsert();
      window.parent.postMessage({ type: "webura-insert-cancelled" }, "*");
      return;
    }
    if (drag) {
      endDrag(false);
      return;
    }
    if (isEditingText()) {
      tools().text.finish();
      return;
    }
    exit();
    window.parent.postMessage({ type: "webura-edit-mode-escaped" }, "*");
  }

  function reposition() {
    if (active && anchorEl && toolbar && toolbar.style.display !== "none") {
      positionToolbar(anchorEl);
      positionOverlay(anchorEl);
    }
  }

  function enter() {
    if (active) return;
    active = true;
    if (window.__weburaEdit) window.__weburaEdit.acquire();
    installShield(); // suppress the app's native :hover styles + cursor changes
    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("click", onClickCapture, true);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
  }

  function exit() {
    if (!active) return;
    active = false;
    if (drag) endDrag(false);
    cancelInsert();
    // Exiting edit mode (toggle off OR Esc) discards ALL unsaved edits from the
    // live preview — the parent clears the pending-changes list in lockstep. Undo
    // the optimistic structural DOM ops AND every in-place text / image / link /
    // style preview, so nothing lingers until a manual reload.
    revertAllOptimistic();
    revertAllStyles();
    revertAllLinks();
    const t = tools();
    if (t.text && t.text.revertAll) t.text.revertAll();
    if (t.image && t.image.revertAll) t.image.revertAll();
    barSuppressed = false;
    hide();
    removeShield();
    window.removeEventListener("mousemove", onMove, true);
    window.removeEventListener("click", onClickCapture, true);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("scroll", reposition, true);
    window.removeEventListener("resize", reposition);
    if (window.__weburaEdit) window.__weburaEdit.release();
  }

  window.addEventListener("message", (e) => {
    if (e.source !== window.parent) return;
    const data = e.data || {};
    if (data.type === "webura-enter-edit-mode") enter();
    else if (data.type === "webura-exit-edit-mode") exit();
    else if (data.type === "revert-webura-block-move")
      revertOptimistic(data.movedId);
    else if (data.type === "revert-webura-block-delete")
      revertOptimistic(data.componentId);
    else if (data.type === "revert-webura-block-duplicate")
      revertOptimistic(data.componentId);
    else if (data.type === "apply-webura-block-move")
      applyBlockMove(data.movedId, data.targetId, data.position);
    else if (data.type === "apply-webura-block-delete")
      applyBlockDelete(data.componentId);
    else if (data.type === "apply-webura-block-duplicate")
      applyBlockDuplicate(data.componentId, data.sourceId);
    else if (data.type === "modify-webura-link-href")
      applyLinkHrefPreview(data.componentId, data.href, data.newTab);
    else if (data.type === "revert-webura-link-href")
      revertLinkHref(data.componentId);
    else if (data.type === "modify-webura-component-styles")
      applyComponentStyles(
        data.data && data.data.elementId,
        data.data && data.data.runtimeId,
        data.data && data.data.styles,
      );
    else if (data.type === "revert-webura-component-styles")
      revertComponentStyles(data.componentId);
    else if (data.type === "get-webura-component-styles")
      readComponentStyles(
        data.data && data.data.elementId,
        data.data && data.data.runtimeId,
      );
    else if (data.type === "webura-begin-insert") beginInsert(data.payload);
    else if (data.type === "webura-cancel-insert") cancelInsert();
    else if (data.type === "apply-webura-block-insert")
      applyBlockInsert(data.tempId, data.targetId, data.position, data.label);
    else if (data.type === "revert-webura-block-insert")
      revertOptimistic(data.tempId);
    else if (data.type === "webura-edit-hover-suppress") {
      barSuppressed = !!data.value;
      if (barSuppressed) hide();
    } else if (data.type === "webura-gallery-slide-to") {
      slideGalleryTo(Number(data.index) || 0);
    } else if (data.type === "webura-gallery-preview-field") {
      previewGalleryField(
        data.probeId,
        Number(data.index) || 0,
        data.field || "",
        data.value,
        data.previousValue,
      );
    } else if (data.type === "webura-gallery-refresh-thumbs") {
      const payload = collectGalleryThumbsFromCtx();
      window.parent.postMessage(
        {
          type: "webura-gallery-thumbs",
          slides: payload.slides,
          activeIndex: payload.activeIndex,
        },
        "*",
      );
    }
  });

  window.__weburaEditMode = { enter, exit };
})();
