"use client";

import { useEffect } from "react";

export function PwaRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });

      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installation support is progressive; the app still works in-browser.
    });
  }, []);

  return null;
}
