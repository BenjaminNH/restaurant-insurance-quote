import { ArrowLeft, ArrowRight, ShieldCheck } from "@phosphor-icons/react";
import type { ReactNode } from "react";

export function ProgressHeader({
  title,
  description,
  current,
  total,
  section,
}: {
  title: string;
  description?: string;
  current: number;
  total: number;
  section: string;
}) {
  const percent = Math.round((current / total) * 100);
  return (
    <header className="quote-header">
      <div className="header-row">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><ShieldCheck weight="fill" /></span>
          <span className="brand-name">餐饮安心保</span>
        </div>
        <span className="step-count">第 {current}/{total} 步</span>
      </div>
      <h1>{title}</h1>
      {description ? <p className="lead">{description}</p> : null}
      <div className="progress-label">
        <strong>{section}</strong>
        <span>{percent}%</span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="报价进度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="progress-value" style={{ width: `${percent}%` }} />
      </div>
    </header>
  );
}

export function SectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`section-card ${className}`}>{children}</section>;
}

export function FieldError({ children }: { children?: ReactNode }) {
  return children ? <p className="field-error">{children}</p> : null;
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
