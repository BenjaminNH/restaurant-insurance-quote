"use client";

import { Check, Copy, IdentificationCard, X } from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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
  const [isCardOpen, setIsCardOpen] = useState(false);
  const viewCardButtonRef = useRef<HTMLButtonElement>(null);
  const closeCardButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function closeCard() {
    setIsCardOpen(false);
    requestAnimationFrame(() => viewCardButtonRef.current?.focus());
  }

  useEffect(() => {
    if (!isCardOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();
    closeCardButtonRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [isCardOpen]);

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
          <p className="contact-hint">扫码添加微信，或查看完整名片</p>
        </div>
        <Image
          className="contact-qr-code"
          src={contact.qrCodePath}
          alt={`${contact.name}的微信二维码`}
          width={104}
          height={104}
        />
      </div>
      <div className="contact-actions">
        <button type="button" className="primary-button copy-contact-button" onClick={handleCopy}>
          {copyState === "success" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copyState === "success" ? "已复制" : "复制号码"}
        </button>
        <button
          ref={viewCardButtonRef}
          type="button"
          className="secondary-button view-contact-card-button"
          onClick={() => setIsCardOpen(true)}
        >
          <IdentificationCard aria-hidden="true" />
          查看名片
        </button>
      </div>
      {copyState !== "idle" ? (
        <p className="contact-feedback" data-state={copyState} role="status">
          {copyState === "success"
            ? "号码已复制，可打开微信添加"
            : "复制失败，请长按号码复制"}
        </p>
      ) : null}
      {isCardOpen ? (
        <dialog
          ref={dialogRef}
          className="contact-card-dialog"
          aria-labelledby="contact-card-dialog-title"
          onCancel={(event) => {
            event.preventDefault();
            closeCard();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeCard();
          }}
          onKeyDown={(event) => {
            if (event.key === "Tab") {
              event.preventDefault();
              closeCardButtonRef.current?.focus();
            }
          }}
        >
          <div className="contact-card-dialog-header">
            <h2 id="contact-card-dialog-title">业务人员名片</h2>
            <button
              ref={closeCardButtonRef}
              type="button"
              className="contact-card-close-button"
              aria-label="关闭名片"
              onClick={closeCard}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="contact-card-person">
            <strong>{contact.name}</strong>
            <div>
              <span>{formatMobileNumber(contact.phone)}</span>
              {contact.wechatSameAsPhone ? <span className="contact-badge">微信同号</span> : null}
            </div>
          </div>
          <div className="contact-full-card-frame">
            <Image
              className="contact-full-card"
              src={contact.fullWechatCardPath}
              alt={`${contact.name}的微信名片`}
              width={654}
              height={972}
            />
          </div>
        </dialog>
      ) : null}
    </section>
  );
}
