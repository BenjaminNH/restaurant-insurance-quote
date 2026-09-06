import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import type { ReactNode } from "react";

export function ProgressHeader({
  title,
  current,
  total,
  value,
}: {
  title: string;
  current: number;
  total: number;
  value: number;
}) {
  return (
    <header className="quote-header">
      <div className="header-row">
        <h1>{title}</h1>
        <span className="step-count">第 {current} / {total} 步</span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="报价进度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`第 ${current} 步，共 ${total} 步，已完成 ${value}%`}
      >
        <div className="progress-value" style={{ width: `${value}%` }} />
      </div>
    </header>
  );
}

export function SectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`section-card ${className}`}>{children}</section>;
}

export function FieldError({ children, id }: { children?: ReactNode; id?: string }) {
  return children ? <p className="field-error" id={id}>{children}</p> : null;
}

export function BottomBar({
  onBack,
  onNext,
  nextLabel,
  summary,
  disabled = false,
  hidden = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  summary?: ReactNode;
  disabled?: boolean;
  hidden?: boolean;
}) {
  return (
    <div className="bottom-wrap" hidden={hidden}>
      <div className="bottom-bar">
        {onBack ? <button type="button" className="back-button" onClick={onBack}><ArrowLeft aria-hidden="true" />上一步</button> : null}
        {summary ? <div className="bottom-summary">{summary}</div> : null}
        <button type="button" className="primary-button" onClick={onNext} disabled={disabled}>
          {nextLabel}<ArrowRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function formatCurrency(value: number | null | undefined) {
  return value === null || value === undefined
    ? "—"
    : `¥${Math.round(value).toLocaleString("zh-CN")}`;
}
