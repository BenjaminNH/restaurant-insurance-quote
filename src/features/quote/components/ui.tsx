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
      <div className="brand-mark" aria-hidden="true" />
      <div className="brand-name">餐饮安心保</div>
      <h1>{title}</h1>
      {description ? <p className="lead">{description}</p> : null}
      <div className="progress-label">
        <strong>第 {current} 步 / 共 {total} 步 · {section}</strong>
        <span>{percent}%</span>
      </div>
      <div className="progress-track" aria-label={`进度 ${percent}%`}>
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
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  summary?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="bottom-wrap">
      <div className="bottom-bar">
        {onBack ? <button type="button" className="back-button" onClick={onBack}>上一步</button> : null}
        {summary ? <div className="bottom-summary">{summary}</div> : null}
        <button type="button" className="primary-button" onClick={onNext} disabled={disabled}>
          {nextLabel}<span aria-hidden="true">→</span>
        </button>
      </div>
      <div className="bottom-disclaimer">预估保费仅供参考，最终以保险公司正式核保与保单为准</div>
    </div>
  );
}

export function formatCurrency(value: number | null | undefined) {
  return value === null || value === undefined
    ? "—"
    : `¥${Math.round(value).toLocaleString("zh-CN")}`;
}
