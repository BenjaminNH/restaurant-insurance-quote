"use client";

import { X } from "@phosphor-icons/react";
import Image from "next/image";
import { type RefObject, useEffect, useRef } from "react";
import type { SalesContact } from "@/config/site";

function formatMobileNumber(phone: string) {
  return phone.replace(/^(\d{3})(\d{4})(\d{4})$/, "$1 $2 $3");
}

type SalesContactCardDialogProps = {
  contact: SalesContact;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
};

/**
 * 保留的完整微信名片弹层。当前结果页不渲染该组件，后续需要时可重新接入入口。
 */
export function SalesContactCardDialog({
  contact,
  onClose,
  returnFocusRef,
}: SalesContactCardDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function closeCard() {
    onClose();
    requestAnimationFrame(() => returnFocusRef?.current?.focus());
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();
    closeButtonRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
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
          closeButtonRef.current?.focus();
        }
      }}
    >
      <div className="contact-card-dialog-header">
        <h2 id="contact-card-dialog-title">业务人员名片</h2>
        <button
          ref={closeButtonRef}
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
  );
}
