/**
 * webura_logs.js – Console interception script
 * Intercepts all console methods and forwards them to the parent window.
 * Safe to inject twice (proxy HTML + Vite plugin): guarded by __weburaPreviewLogsInstalled.
 */

(function () {
  if (window["__weburaPreviewLogsInstalled"] === true) return;
  window["__weburaPreviewLogsInstalled"] = true;

  const NUL = String.fromCharCode(0);
  const ESC = String.fromCharCode(27);
  const ansiRe = new RegExp(
    `${ESC.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\[[\\d;?]*[\\d-]*[a-zA-Z]`,
    "g",
  );

  function stripUnsafeControls(s) {
    return String(s).split(NUL).join("").replace(ansiRe, "");
  }

  function postRuntimeToParent(level, stringParts) {
    window.parent.postMessage(
      {
        type: "console-log",
        level: level,
        args: stringParts,
        timestamp: new Date().toISOString(),
      },
      "*",
    );
  }

  /**
   * Capture phase runs before Vite / React bubble listeners that may hide the
   * default uncaught path; bubble-only listeners in webura-shim can miss these.
   */
  window.addEventListener(
    "error",
    function (event) {
      // Capture-phase "error" also fires for FAILED RESOURCE LOADS (img, script,
      // link, video, audio, source, iframe). Those events carry no message/error,
      // so they used to surface as a useless "[UNCAUGHT] Unknown error". Detect the
      // failing element and report WHAT failed (e.g. a bad image path / dead URL),
      // and do NOT tag it [UNCAUGHT] — a 404 asset does not crash the app, so it
      // must not trip the preview error cover.
      const el = event.target;
      if (el && el !== window && el.tagName) {
        const tag = String(el.tagName).toLowerCase();
        const url = el.src || el.href || el.currentSrc || el.data || "";
        postRuntimeToParent("error", [
          "[ASSET]",
          stripUnsafeControls(
            "Failed to load <" +
              tag +
              ">" +
              (url ? ' "' + url + '"' : "") +
              " — the file or URL does not exist or is blocked. Check the path " +
              "(assets added via chat live under /.webura/media/...) or the remote URL.",
          ),
        ]);
        return;
      }

      const thrown = event.error;
      let text;
      if (thrown instanceof Error) {
        text = thrown.stack || thrown.message;
      } else if (thrown != null && typeof thrown !== "object") {
        text = String(thrown);
      } else {
        const loc =
          event.filename != null
            ? " at " +
              event.filename +
              ":" +
              (event.lineno ?? "?") +
              ":" +
              (event.colno ?? "?")
            : "";
        // A genuinely message-less JS error is almost always a cross-origin
        // "Script error." the browser redacted — say so instead of "Unknown error".
        const msg =
          event.message ||
          "Script error (a script threw, but the browser hid the details because it is cross-origin; add crossorigin to the <script> or check the failing module/import)";
        text = msg + loc;
      }
      postRuntimeToParent("error", ["[UNCAUGHT]", stripUnsafeControls(text)]);
    },
    true,
  );

  window.addEventListener(
    "unhandledrejection",
    function (event) {
      const reason = event.reason;
      const text =
        reason instanceof Error
          ? reason.stack || reason.message
          : reason != null && typeof reason === "object" && "message" in reason
            ? String(reason.message)
            : String(reason);
      postRuntimeToParent("error", [
        "[UNHANDLED REJECTION]",
        stripUnsafeControls(text),
      ]);
    },
    true,
  );

  if (typeof window.reportError === "function") {
    const origReportError = window.reportError;
    window.reportError = function (err) {
      try {
        const msg =
          err instanceof Error ? err.stack || err.message : String(err);
        postRuntimeToParent("error", [
          "[reportError]",
          stripUnsafeControls(msg),
        ]);
      } catch {
        /* ignore */
      }
      return origReportError.call(window, err);
    };
  }

  // ---------------------------------------------------------------------------
  // Navigation bridge (preview top-nav: route dropdown, back/forward, current
  // route display). The parent (PreviewIframe.tsx) already speaks this protocol:
  //   parent -> iframe : { type: "navigate", payload: { url } }   (go to URL)
  //   iframe -> parent : { type: "pushState" | "replaceState", payload: { newUrl } }
  // Without this bridge those messages had no listener, so route clicks and
  // back/forward were no-ops and the displayed route never tracked the iframe.
  // ---------------------------------------------------------------------------
  (function installNavigationBridge() {
    function postNav(type) {
      try {
        window.parent.postMessage(
          { type: type, payload: { newUrl: window.location.href } },
          "*",
        );
      } catch {
        /* ignore */
      }
    }

    // Report SPA navigations the app performs itself (React Router etc.) so the
    // parent's history + current-route display stay accurate.
    try {
      const origPushState = history.pushState;
      history.pushState = function () {
        const ret = origPushState.apply(this, arguments);
        postNav("pushState");
        return ret;
      };
      const origReplaceState = history.replaceState;
      history.replaceState = function () {
        const ret = origReplaceState.apply(this, arguments);
        postNav("replaceState");
        return ret;
      };
    } catch {
      /* ignore */
    }

    // popstate / hashchange change the URL without push/replaceState; mirror the
    // resulting location so the displayed route never goes stale.
    window.addEventListener("popstate", () => postNav("replaceState"));
    window.addEventListener("hashchange", () => postNav("replaceState"));

    // Tell the parent where we actually are on load (e.g. a route restored after
    // an HMR remount), so the toolbar shows the real current route.
    function reportInitialUrl() {
      postNav("replaceState");
    }
    if (document.readyState === "complete") {
      reportInitialUrl();
    } else {
      window.addEventListener("load", reportInitialUrl);
    }

    // Perform navigations requested by the parent (route dropdown + back/forward
    // both send a resolved absolute URL). location.replace is robust across every
    // router (the app re-renders the matching route) and the parent owns the
    // back/forward history stack, so a per-step replace is correct here.
    window.addEventListener("message", function (event) {
      const data = event && event.data;
      if (!data || data.type !== "navigate") return;
      const url = data.payload && data.payload.url;
      if (!url || typeof url !== "string") return;
      try {
        // Only navigate when the target actually differs from the current URL,
        // to avoid a needless reload when re-selecting the current route.
        if (new URL(url, window.location.href).href !== window.location.href) {
          window.location.replace(url);
        }
      } catch {
        /* ignore malformed URL */
      }
    });
  })();

  // Store original console methods
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalInfo = console.info;
  const originalDebug = console.debug;

  // Helper function to safely stringify arguments
  function stringifyArgs(args) {
    return args.map((arg) => {
      if (arg === null) return "null";
      if (arg === undefined) return "undefined";
      if (typeof arg === "object") {
        try {
          return stripUnsafeControls(JSON.stringify(arg, null, 2));
        } catch {
          return "[Object: unable to stringify]";
        }
      }
      return stripUnsafeControls(String(arg));
    });
  }

  // Intercept console.log
  console.log = function (...args) {
    window.parent.postMessage(
      {
        type: "console-log",
        level: "log",
        args: stringifyArgs(args),
        timestamp: new Date().toISOString(),
      },
      "*",
    );
    originalLog.apply(console, args);
  };

  // Intercept console.warn
  console.warn = function (...args) {
    window.parent.postMessage(
      {
        type: "console-log",
        level: "warn",
        args: stringifyArgs(args),
        timestamp: new Date().toISOString(),
      },
      "*",
    );
    originalWarn.apply(console, args);
  };

  // Intercept console.error
  console.error = function (...args) {
    window.parent.postMessage(
      {
        type: "console-log",
        level: "error",
        args: stringifyArgs(args),
        timestamp: new Date().toISOString(),
      },
      "*",
    );
    originalError.apply(console, args);
  };

  // Intercept console.info
  console.info = function (...args) {
    window.parent.postMessage(
      {
        type: "console-log",
        level: "info",
        args: stringifyArgs(args),
        timestamp: new Date().toISOString(),
      },
      "*",
    );
    originalInfo.apply(console, args);
  };

  // Intercept console.debug
  console.debug = function (...args) {
    window.parent.postMessage(
      {
        type: "console-log",
        level: "debug",
        args: stringifyArgs(args),
        timestamp: new Date().toISOString(),
      },
      "*",
    );
    originalDebug.apply(console, args);
  };
})();
