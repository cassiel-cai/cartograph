"use client";

import { OrganizationSwitcher } from "@clerk/nextjs";
import { useEffect } from "react";

const appearance = {
  variables: {
    borderRadius: "2px",
  },
};

const POPOVER = ".cl-organizationSwitcherPopoverRootBox";
const TRIGGER = ".cl-organizationSwitcherTrigger";

export function OrgControls() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest(TRIGGER)) {
        revealPopover();
        return;
      }

      const root = target.closest(POPOVER);
      if (!(root instanceof HTMLElement)) {
        return;
      }

      if (!target.closest("button, a")) {
        return;
      }

      // The click has already started the switch. Clerk leaves the menu
      // open until that request finishes, so hide it on the next frame.
      requestAnimationFrame(() => {
        root.style.setProperty("visibility", "hidden");
        root.style.setProperty("pointer-events", "none");
        if (
          document.activeElement instanceof HTMLElement &&
          root.contains(document.activeElement)
        ) {
          document.activeElement.blur();
        }
      });
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <OrganizationSwitcher
      hidePersonal
      afterSelectOrganizationUrl="/"
      afterCreateOrganizationUrl="/"
      afterLeaveOrganizationUrl="/"
      appearance={appearance}
    />
  );
}

function revealPopover() {
  const root = document.querySelector(POPOVER);
  if (!(root instanceof HTMLElement)) {
    return;
  }

  root.style.removeProperty("visibility");
  root.style.removeProperty("pointer-events");
}
