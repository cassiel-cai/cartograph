"use client";

import { OrganizationSwitcher } from "@clerk/nextjs";

const appearance = {
  variables: {
    borderRadius: "2px",
  },
};

export function OrgControls() {
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
