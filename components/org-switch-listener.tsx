"use client";

import { beginOrgSwitch } from "@/lib/org-switch";
import { useEffect } from "react";

type BeforeSetActive = (intent?: string) => void | Promise<void>;
type AfterSetActive = () => void | Promise<void>;

declare global {
  interface Window {
    __internal_onBeforeSetActive?: BeforeSetActive;
    __internal_onAfterSetActive?: AfterSetActive;
  }
}

export function OrgSwitchListener() {
  useEffect(() => {
    const before = window.__internal_onBeforeSetActive;
    const after = window.__internal_onAfterSetActive;

    window.__internal_onBeforeSetActive = async (intent) => {
      beginOrgSwitch();
      if (before) {
        await before(intent);
      }
    };

    window.__internal_onAfterSetActive = async () => {
      if (after) {
        await after();
      }
    };

    return () => {
      window.__internal_onBeforeSetActive = before;
      window.__internal_onAfterSetActive = after;
    };
  }, []);

  return null;
}
