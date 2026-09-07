"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import type { SalesContact } from "@/config/site";

function formatMobileNumber(phone: string) {
  return phone.replace(/^(\d{3})(\d{4})(\d{4})$/, "$1 $2 $3");
}

export function SalesContactAction({ contact }: { contact: SalesContact }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(contact.phone);
    setCopied(true);
  }

  return (
    <section className="sales-contact" aria-labelledby="sales-contact-title">
      <h2 id="sales-contact-title">{contact.displayName}</h2>
      <div className="contact-number-row">
        <span className="contact-number">{formatMobileNumber(contact.phone)}</span>
        {contact.wechatSameAsPhone ? <span className="contact-badge">微信同号</span> : null}
      </div>
      <button type="button" className="primary-button copy-contact-button" onClick={handleCopy}>
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? "已复制" : "复制号码"}
      </button>
      {copied ? <p className="contact-feedback" role="status">号码已复制，可打开微信添加</p> : null}
    </section>
  );
}
