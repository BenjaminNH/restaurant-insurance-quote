"use client";

import { Check, Copy } from "@phosphor-icons/react";
import Image from "next/image";
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
      <h2 id="sales-contact-title">业务人员联系方式</h2>
      <div className="contact-summary">
        <div className="contact-details">
          <div className="contact-name-row">
            <span className="contact-name">{contact.name}</span>
            {contact.wechatSameAsPhone ? <span className="contact-badge">微信同号</span> : null}
          </div>
          <span className="contact-number">{formatMobileNumber(contact.phone)}</span>
          <p className="contact-hint">长按二维码识别添加微信</p>
          <button type="button" className="primary-button copy-contact-button" onClick={handleCopy}>
            {copyState === "success" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            <span aria-live="polite">
              {copyState === "success"
                ? "已复制"
                : copyState === "error"
                  ? "复制失败"
                  : "复制号码"}
            </span>
          </button>
        </div>
        <Image
          className="contact-qr-code"
          src={contact.qrCodePath}
          alt={`${contact.name}的微信二维码`}
          width={104}
          height={104}
        />
      </div>
    </section>
  );
}
