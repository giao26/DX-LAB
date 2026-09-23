import { TicketForm } from './ticket-form';

export default function Home() {
  return (
    <main>
      <header className="brand"><span className="brand-mark" aria-hidden="true">DX</span><span>DX-LAB</span></header>
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Không gian P · Quy trình số</p>
        <h1 id="page-title">Tạo yêu cầu hỗ trợ</h1>
        <p>Điền đủ thông tin. Hệ thống sẽ cấp mã ticket ngay sau khi tiếp nhận.</p>
      </section>
      <TicketForm />
    </main>
  );
}
