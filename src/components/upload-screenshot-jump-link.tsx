"use client";

import { UploadSimple } from "@phosphor-icons/react";

export function UploadScreenshotJumpLink() {
  return (
    <a
      aria-label="Scroll to upload screenshot form"
      className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-muted transition hover:bg-surface-elevated hover:text-foreground active:translate-y-px"
      href="#upload-screenshot"
      title="Upload screenshot"
    >
      <UploadSimple aria-hidden="true" size={20} />
    </a>
  );
}
