"use client";

import { LocaleControl } from "@/components/locale-control";
import { useLocale } from "@/components/locale-provider";
import { ThemeControl } from "@/components/theme-control";
import { messagesFor } from "@/lib/messages";
import { UserButton } from "@clerk/nextjs";

const appearance = {
  variables: {
    borderRadius: "2px",
  },
  elements: {
    userButtonAvatarBox: {
      width: "24px",
      height: "24px",
    },
  },
};

export function HeaderActions({
  organization,
}: {
  organization: { id: string; slug: string | null };
}) {
  const copy = messagesFor(useLocale());

  return (
    <div className="ml-auto flex items-center gap-2">
      <LocaleControl />
      <ThemeControl />
      <UserButton appearance={appearance}>
        <UserButton.UserProfilePage
          label={copy.organization}
          url="organization"
          labelIcon={<OrganizationIcon />}
        >
          <dl className="flex flex-col gap-4 text-[13px]">
            <div>
              <dt className="text-[11px] opacity-60">{copy.organization}</dt>
              <dd className="mt-1 font-mono text-[12px] break-all">
                {organization.slug ?? organization.id}
              </dd>
            </div>
            {organization.slug ? (
              <div>
                <dt className="text-[11px] opacity-60">{copy.organizationId}</dt>
                <dd className="mt-1 font-mono text-[12px] break-all">
                  {organization.id}
                </dd>
              </div>
            ) : null}
          </dl>
        </UserButton.UserProfilePage>
      </UserButton>
    </div>
  );
}

function OrganizationIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect
        x="2.5"
        y="2.5"
        width="11"
        height="11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}
