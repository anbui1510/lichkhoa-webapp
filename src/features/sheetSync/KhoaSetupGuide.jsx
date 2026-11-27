import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  KHOA_SETUP_ADMIN_STEPS,
  KHOA_SETUP_AVOID,
  KHOA_SETUP_IT_NOTE,
  KHOA_SETUP_PREREQ,
  KHOA_SETUP_STAFF_STEPS,
  khoaSetupExample,
} from './khoaSetupContent';

function StepList({ steps, ordered = true }) {
  const List = ordered ? 'ol' : 'ul';
  return (
    <List className={`khoa-setup-steps ${ordered ? 'is-ordered' : 'is-bullets'}`}>
      {steps.map((step, index) => {
        if (typeof step === 'string') {
          return <li key={step}>{step}</li>;
        }
        return (
          <li key={step.id}>
            <strong>
              {ordered ? `${index + 1}. ` : ''}
              {step.title}
            </strong>
            <p className="form-hint" style={{ marginTop: '0.35rem' }}>
              {step.detail}
            </p>
          </li>
        );
      })}
    </List>
  );
}

/**
 * Hướng dẫn triển khai khoa mới (F-304) — admin khoa & nhân viên.
 * @param {{ variant?: 'card' | 'compact', exampleLabel?: string, defaultOpenIt?: boolean }} props
 */
export function KhoaSetupGuide({
  variant = 'card',
  exampleLabel = 'Khoa Tiêu hóa',
}) {
  const example = khoaSetupExample(exampleLabel);
  const isCompact = variant === 'compact';

  const body = (
    <>
      <Alert className="khoa-setup-alert">
        <AlertTitle>{KHOA_SETUP_PREREQ.title}</AlertTitle>
        <AlertDescription>
          <ul className="khoa-setup-prereq">
            {KHOA_SETUP_PREREQ.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>

      <div className="khoa-setup-example">
        <p className="form-hint" style={{ marginBottom: '0.25rem' }}>
          <strong>Ví dụ:</strong> {example.label}
        </p>
        <ul className="form-hint khoa-setup-example-meta">
          <li>
            Tên file gợi ý: <code>{example.sheetFileName}</code>
          </li>
          <li>
            Cột <code>deptId</code> trên NhanSu (tuỳ chọn): <code>{example.deptIdHint}</code>
          </li>
          <li>Cùng URL web với các khoa khác — chỉ khác file Sheet đã lưu ở bước 4.</li>
        </ul>
      </div>

      <h4 className="khoa-setup-heading">Admin khoa (~5–10 phút)</h4>
      <StepList steps={KHOA_SETUP_ADMIN_STEPS} />

      <h4 className="khoa-setup-heading">Nhân viên</h4>
      <StepList steps={KHOA_SETUP_STAFF_STEPS} ordered={false} />

      <details className="khoa-setup-details">
        <summary>Tránh lỗi thường gặp</summary>
        <ul className="form-hint khoa-setup-avoid">
          {KHOA_SETUP_AVOID.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>

      {!isCompact && (
        <details className="khoa-setup-details">
          <summary>Dành cho IT (một lần / bệnh viện)</summary>
          <p className="form-hint">{KHOA_SETUP_IT_NOTE}</p>
        </details>
      )}
    </>
  );

  if (isCompact) {
    return <div className="khoa-setup-guide khoa-setup-guide--compact">{body}</div>;
  }

  return (
    <section className="account-card khoa-setup-guide" aria-labelledby="khoa-setup-title">
      <div className="khoa-setup-guide-header">
        <h3 id="khoa-setup-title">Triển khai khoa mới trên Google Sheet</h3>
        <p className="form-hint">
          Làm lần lượt từng bước khi mở thêm một khoa (vd. Tim mạch, Tiêu hóa, Nội…). Không cần sửa
          code hay Cloudflare theo khoa nếu IT đã cấu hình bridge.
        </p>
      </div>
      {body}
      <div className="khoa-setup-guide-footer">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const el = document.getElementById('settings-sheet-url');
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el?.focus();
          }}
        >
          Đến ô lưu link Sheet
        </Button>
      </div>
    </section>
  );
}