"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import type { SalesContact } from "@/config/site";

function formatMobileNumber(phone: string) {
  return phone.replace(/^(\d{3})(\d{4})(\d{4})$/, "$1 $2 $3");
}

type CopyState = "idle" | "success" | "error";

function fallbackCopyText(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Copy command failed");
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      fallbackCopyText(value);
      return;
    }
  }
  fallbackCopyText(value);
}

export function SalesContactAction({ contact }: { contact: SalesContact }) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  async function handleCopy() {
    try {
      await copyText(contact.phone);
      setCopyState("success");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <section className="sales-contact" aria-labelledby="sales-contact-title">
      <h2 id="sales-contact-title">{contact.displayName}</h2>
      <div className="contact-number-row">
        <span className="contact-number">{formatMobileNumber(contact.phone)}</span>
        {contact.wechatSameAsPhone ? <span className="contact-badge">微信同号</span> : null}
      </div>
      <button type="button" className="primary-button copy-contact-button" onClick={handleCopy}>
        {copyState === "success" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copyState === "success" ? "已复制" : "复制号码"}
      </button>
      {copyState !== "idle" ? (
        <p className="contact-feedback" data-state={copyState} role="status">
          {copyState === "success"
            ? "号码已复制，可打开微信添加"
            : "复制失败，请长按号码复制"}
        </p>
      ) : null}
    </section>
  );
}
