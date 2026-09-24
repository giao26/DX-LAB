'use client';

import { FormEvent, useRef, useState } from 'react';

type Field = 'customerName' | 'customerPhone' | 'customerEmail' | 'provisionalType' | 'description';
type Errors = Partial<Record<Field | 'body', string[]>>;
type Ticket = { code: string; status: 'WAITING'; receivedAt: string };

const initial = { customerName: '', customerPhone: '', customerEmail: '', provisionalType: '', description: '' };

function validate(values: typeof initial): Errors {
  const errors: Errors = {};
  const name = values.customerName.trim().replace(/\s+/g, ' ');
  let phone = values.customerPhone.trim().replace(/[\s.-]/g, '');
  if (phone.startsWith('+84')) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith('84')) phone = `0${phone.slice(2)}`;
  const email = values.customerEmail.trim();
  if (name.length < 2 || name.length > 120) errors.customerName = ['Họ và tên phải có từ 2 đến 120 ký tự.'];
  if (!/^0\d{9,10}$/.test(phone)) errors.customerPhone = ['Số điện thoại Việt Nam không đúng định dạng.'];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) errors.customerEmail = ['Email không đúng định dạng.'];
  if (!['Khiếu nại', 'Tư vấn', 'Bảo hành'].includes(values.provisionalType)) errors.provisionalType = ['Hãy chọn loại yêu cầu.'];
  if (values.description.trim().length < 10 || values.description.trim().length > 4000) errors.description = ['Nội dung chi tiết phải có từ 10 đến 4.000 ký tự.'];
  return errors;
}

export function TicketForm() {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const key = useRef<string>(crypto.randomUUID());
  const errorSummary = useRef<HTMLDivElement>(null);
  const successSummary = useRef<HTMLDivElement>(null);

  function update(field: Field, value: string) {
    setTicket(null);
    setValues((current) => ({ ...current, [field]: value }));
  }

  function chooseAttachment(file: File | null) {
    if (!file) return;
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/png', 'image/jpeg'];
    if (file.size > 10 * 1024 * 1024 || !allowed.includes(file.type)) {
      setAttachment(null);
      setAttachmentError('Chỉ nhận PDF, DOCX, XLSX, PNG hoặc JPG/JPEG, tối đa 10 MB.');
      return;
    }
    setAttachment(file);
    setAttachmentError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setErrors({});
    const clientErrors = validate(values);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      requestAnimationFrame(() => errorSummary.current?.focus());
      return;
    }
    setPending(true);
    try {
      const requestPayload = attachment ? new FormData() : JSON.stringify(values);
      if (attachment) {
        Object.entries(values).forEach(([name, value]) => (requestPayload as FormData).append(name, value));
        (requestPayload as FormData).append('attachment', attachment);
      }
      const response = await fetch('/bff/tickets', {
        method: 'POST',
        headers: attachment ? { 'Idempotency-Key': key.current } : { 'Content-Type': 'application/json', 'Idempotency-Key': key.current },
        body: requestPayload,
      });
      const responseBody = await response.json();
      if (!response.ok) {
        setErrors(responseBody.errors ?? { body: [responseBody.detail ?? 'Không thể gửi yêu cầu. Vui lòng thử lại.'] });
        requestAnimationFrame(() => errorSummary.current?.focus());
        return;
      }
      setTicket(responseBody);
      setValues(initial);
      key.current = crypto.randomUUID();
      requestAnimationFrame(() => successSummary.current?.focus());
    } catch {
      setErrors({ body: ['Mất kết nối. Dữ liệu vẫn được giữ để bạn thử lại.'] });
      requestAnimationFrame(() => errorSummary.current?.focus());
    } finally {
      setPending(false);
    }
  }

  const fields: Array<{ id: Field; label: string; type?: string; autoComplete?: string }> = [
    { id: 'customerName', label: 'Họ và tên', autoComplete: 'name' },
    { id: 'customerPhone', label: 'Số điện thoại', type: 'tel', autoComplete: 'tel' },
    { id: 'customerEmail', label: 'Email', type: 'email', autoComplete: 'email' },
  ];

  return (
    <section className="card" aria-label="Biểu mẫu tạo yêu cầu">
      {Object.keys(errors).length > 0 && <div ref={errorSummary} tabIndex={-1} className="summary error" role="alert">
        <h2>Hãy kiểm tra lại thông tin</h2>
        <ul>{Object.entries(errors).map(([field, messages]) => <li key={field}>
          {field === 'body' ? messages?.[0] : <a href={`#${field}`}>{messages?.[0]}</a>}
        </li>)}</ul>
      </div>}
      {ticket && <div ref={successSummary} tabIndex={-1} className="summary success" role="status">
        <h2>Đã tiếp nhận yêu cầu</h2>
        <p>Mã ticket: <strong>{ticket.code}</strong></p>
        <p>Trạng thái: Chờ xử lý</p>
      </div>}
      <form onSubmit={submit} noValidate>
        {fields.map(({ id, label, type = 'text', autoComplete }) => <div className="field" key={id}>
          <label htmlFor={id}>{label} <span aria-hidden="true">*</span></label>
          <input id={id} name={id} type={type} autoComplete={autoComplete} required disabled={pending} value={values[id]}
            aria-invalid={Boolean(errors[id])} aria-describedby={errors[id] ? `${id}-error` : undefined}
            onChange={(event) => update(id, event.target.value)} />
          {errors[id] && <p className="field-error" id={`${id}-error`}>{errors[id]?.[0]}</p>}
        </div>)}
        <div className="field">
          <label htmlFor="provisionalType">Bạn cần hỗ trợ vấn đề gì? <span aria-hidden="true">*</span></label>
          <select id="provisionalType" name="provisionalType" required disabled={pending} value={values.provisionalType}
            aria-invalid={Boolean(errors.provisionalType)} aria-describedby={errors.provisionalType ? 'provisionalType-error' : undefined}
            onChange={(event) => update('provisionalType', event.target.value)}>
            <option value="">Chọn loại yêu cầu</option><option>Khiếu nại</option><option>Tư vấn</option><option>Bảo hành</option>
          </select>
          {errors.provisionalType && <p className="field-error" id="provisionalType-error">{errors.provisionalType[0]}</p>}
        </div>
        <div className="field">
          <label htmlFor="attachment">Tệp đính kèm (sắp hỗ trợ)</label>
          <input id="attachment" name="attachment" type="file" accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg" disabled={pending}
            aria-describedby="attachment-help attachment-error" onChange={(event) => chooseAttachment(event.target.files?.[0] ?? null)} />
          <p className="help" id="attachment-help">PDF, DOCX, XLSX, PNG hoặc JPG/JPEG; tối đa 10 MB.</p>
          {attachment && <p role="status">Đã chọn: {attachment.name} ({Math.ceil(attachment.size / 1024)} KB). <button type="button" onClick={() => setAttachment(null)}>Bỏ tệp</button></p>}
          {attachmentError && <p className="field-error" id="attachment-error" role="alert">{attachmentError}</p>}
        </div>
        <div className="field">
          <label htmlFor="description">Nội dung chi tiết <span aria-hidden="true">*</span></label>
          <textarea id="description" name="description" required disabled={pending} minLength={10} maxLength={4000} rows={6}
            value={values.description} aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'description-error' : 'description-help'}
            onChange={(event) => update('description', event.target.value)} />
          <p className="help" id="description-help">Từ 10 đến 4.000 ký tự.</p>
          {errors.description && <p className="field-error" id="description-error">{errors.description[0]}</p>}
        </div>
        <button type="submit" disabled={pending}>{pending ? 'Đang gửi…' : 'Gửi yêu cầu'}</button>
      </form>
    </section>
  );
}
