# -*- coding: utf-8 -*-
"""On-demand Odoo ticket UI; ticket projections and PII are never stored in Odoo."""
from html import escape
import os
from uuid import uuid4

from odoo import http
from odoo.http import request

from ..services import PTicketClient, PTicketClientError


def _text(value):
    return escape(str(value)) if value is not None else '—'


class DxTicketWorkspaceController(http.Controller):
    def _client(self):
        subject_token = getattr(request.env.user, 'oauth_access_token', None)
        if not subject_token:
            raise PTicketClientError('Phiên đăng nhập chưa có token ủy quyền hợp lệ.', 401, True)
        return PTicketClient(
            os.environ.get('P_API_BASE_URL', 'http://p-process:3000'),
            os.environ.get('OIDC_TOKEN_URL', 'http://keycloak:8080/realms/dxlab/protocol/openid-connect/token'),
            os.environ.get('P_CLIENT_ID', 'odoo'),
            os.environ.get('P_CLIENT_SECRET', ''),
            subject_token,
        )

    def _page(self, title, body, status=200):
        document = '''<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title><style>
body{{font:16px system-ui,sans-serif;max-width:72rem;margin:auto;padding:1rem;line-height:1.5}}
table{{border-collapse:collapse;width:100%}}th,td{{padding:.65rem;border-bottom:1px solid #bbb;text-align:left;vertical-align:top}}
a.button{{display:inline-block;padding:.55rem .8rem;border:2px solid #1769aa;border-radius:.25rem;margin:.25rem;color:#064f85}}
a:focus,button:focus,textarea:focus{{outline:3px solid #ffbf47;outline-offset:2px}}.status{{font-weight:700}}dl{{display:grid;grid-template-columns:minmax(9rem,14rem) 1fr;gap:.5rem}}
*{{box-sizing:border-box}}body,dd,p,li{{overflow-wrap:anywhere}}dd{{min-width:0}}textarea{{display:block;width:100%;max-width:100%;min-height:8rem}}button{{font:inherit;padding:.6rem;margin-top:.5rem}}form{{max-width:100%}}
@media(max-width:32rem){{table,tbody,tr,td{{display:block}}thead{{position:absolute;left:-9999px}}td{{overflow-wrap:anywhere}}dl{{display:block}}}}
</style></head><body><nav><a href="/web">Odoo</a> · <a href="/dx/tickets/workspace">Ticket theo phạm vi</a></nav>{body}</body></html>'''.format(
            title=escape(title), body=body,
        )
        return request.make_response(document, status=status, headers=[
            ('Content-Type', 'text/html; charset=utf-8'), ('Cache-Control', 'no-store'),
            ('X-Content-Type-Options', 'nosniff'),
        ])

    def _error(self, error):
        status = error.status_code if isinstance(error, PTicketClientError) else 502
        action = ''
        if isinstance(error, PTicketClientError) and error.reauth:
            action = '<p><a class="button" href="/web/login">Đăng nhập lại</a></p>'
        return self._page(
            'Không thể tải ticket',
            '<h1>Không thể tải ticket</h1><p>%s</p>%s' % (_text(error), action),
            status,
        )

    @http.route('/dx/tickets/workspace', type='http', auth='user', methods=['GET'])
    def list_tickets(self, **_kwargs):
        try:
            page_number = max(1, int(request.httprequest.args.get('page', '1')))
        except ValueError:
            page_number = 1
        limit = 50
        offset = (page_number - 1) * limit
        try:
            page = self._client().get_ticket_page(limit, offset)
        except PTicketClientError as error:
            return self._error(error)
        rows = ''.join(
            '<tr><td><a href="/dx/tickets/workspace/{id}">{code}</a></td><td>{kind}</td>'
            '<td class="status">{status}</td><td>{summary}</td><td>Hạn: {due} · {sla}</td></tr>'.format(
                id=_text(item['id']), code=_text(item['code']), kind=_text(item['provisionalType']),
                status=_text(item['status']), summary=_text(item['summary']),
                due=_text(item.get('slaDueAt')), sla='Quá hạn' if item.get('slaOverdue') else 'Trong hạn',
            ) for item in page['items']
        ) or '<tr><td colspan="5">Không có ticket trong phạm vi hiện tại.</td></tr>'
        navigation = []
        if page_number > 1:
            navigation.append('<a class="button" href="?page=%d">Trang trước</a>' % (page_number - 1))
        if offset + len(page['items']) < page['total']:
            navigation.append('<a class="button" href="?page=%d">Trang sau</a>' % (page_number + 1))
        body = '<h1>Ticket theo phạm vi trách nhiệm</h1><p>%d ticket</p><table><thead><tr><th>Mã</th><th>Loại</th><th>Trạng thái</th><th>Tóm tắt</th><th>SLA</th></tr></thead><tbody>%s</tbody></table><p>%s</p>' % (
            page['total'], rows, ''.join(navigation),
        )
        return self._page('Ticket theo phạm vi', body)

    @http.route('/dx/tickets/workspace/<string:ticket_uuid>', type='http', auth='user', methods=['GET'])
    def ticket_detail(self, ticket_uuid, **_kwargs):
        try:
            detail = self._client().get_detail(ticket_uuid)
        except PTicketClientError as error:
            return self._error(error)
        return self._render_detail(ticket_uuid, detail)

    def _render_detail(self, ticket_uuid, detail, error=None, submitted=None, status=200):
        submitted = submitted or {}
        customer = detail.get('customer') if isinstance(detail.get('customer'), dict) else None
        attachment = detail.get('attachment') if isinstance(detail.get('attachment'), dict) else None
        contact = '' if not customer else '<h2>Liên hệ khách hàng</h2><dl><dt>Họ tên</dt><dd>%s</dd><dt>Điện thoại</dt><dd>%s</dd><dt>Email</dt><dd>%s</dd></dl>' % (
            _text(customer.get('name')), _text(customer.get('phone')), _text(customer.get('email')),
        )
        download = '' if not attachment else '<p><a class="button" href="/dx/tickets/workspace/%s/attachment">Tải %s</a></p>' % (
            _text(ticket_uuid), _text(attachment.get('displayName')),
        )
        body = '<h1>%s</h1><p class="status">Trạng thái: %s</p><dl><dt>Loại</dt><dd>%s</dd><dt>Nhóm</dt><dd>%s</dd><dt>Tóm tắt</dt><dd>%s</dd><dt>Mô tả</dt><dd>%s</dd></dl>%s%s' % (
            _text(detail.get('code')), _text(detail.get('status')), _text(detail.get('provisionalType')),
            _text(detail.get('groupId')), _text(detail.get('summary')), _text(detail.get('description')), contact, download,
        )
        body += '<h2>SLA</h2><p>Hạn: %s · %s · Đã dùng %s phút làm việc / 120 phút</p>' % (
            _text(detail.get('slaDueAt')), 'Quá hạn' if detail.get('slaOverdue') else 'Trong hạn', _text(detail.get('slaElapsedMinutes')))
        if error:
            body += '<div role="alert" tabindex="-1" id="processing-error"><h2>Không thể lưu</h2><p>%s</p><p>Nội dung đã giữ bên dưới. Kiểm tra bước và tải lại phiên bản trước khi thử lại.</p></div>' % _text(error)
            body += '<label for="unsaved-content">Nội dung chưa lưu</label><textarea id="unsaved-content" readonly>%s</textarea><label for="unsaved-result">Kết quả chưa lưu</label><textarea id="unsaved-result" readonly>%s</textarea>' % (_text(submitted.get('content', '')), _text(submitted.get('result', '')))
        workflow = detail.get('workflow') or {}
        steps = detail.get('steps') or []
        body += '<h2>Quy trình</h2><ol>'
        for step in workflow.get('steps', []):
            record = next((s for s in steps if s.get('id') == step.get('id')), {})
            body += '<li><strong>%s</strong> — %s<p>Bắt đầu: %s · Kết thúc: %s · %s phút làm việc</p><p>%s</p></li>' % (
                _text(step.get('label')), 'Hoàn tất' if record.get('endedAt') else 'Đang thực hiện' if record else 'Chưa bắt đầu',
                _text(record.get('startedAt')), _text(record.get('endedAt')), _text(record.get('businessMinutes')), _text(record.get('content')))
        body += '</ol>'
        actions = detail.get('allowedActions', [])
        if error and submitted.get('action') in ('start', 'start-step', 'complete-step', 'close'):
            # The write may have committed even when its response was lost. Replay exactly.
            actions = [submitted['action']]
        for action in actions:
            key = submitted.get('idempotencyKey') or str(uuid4())
            # Preserve the original command version on errors, so retries cannot overwrite newer work.
            version = submitted.get('version', detail.get('version'))
            step_id = submitted.get('stepId', '') if error else steps[-1]['id'] if action == 'complete-step' and steps else str(len(steps) + 1)
            body += '<form method="post" action="/dx/tickets/workspace/%s/process"><input type="hidden" name="csrf_token" value="%s"><input type="hidden" name="version" value="%s"><input type="hidden" name="idempotencyKey" value="%s"><input type="hidden" name="action" value="%s"><input type="hidden" name="stepId" value="%s">' % (
                _text(ticket_uuid), _text(request.csrf_token()), _text(version), _text(key), _text(action), _text(step_id))
            if action == 'complete-step':
                body += '<label for="step-content">%s</label><textarea id="step-content" name="content" required maxlength="10000">%s</textarea>' % (
                    _text(next((s.get('requiredContent') for s in steps if s.get('id') == step_id), 'Nội dung bước')), _text(submitted.get('content', '')))
            elif error and submitted.get('content') is not None:
                body += '<input type="hidden" name="content" value="%s">' % _text(submitted['content'])
            if action != 'close' and error and submitted.get('result') is not None:
                body += '<input type="hidden" name="result" value="%s">' % _text(submitted['result'])
            if action == 'close':
                body += '<label for="result">Kết quả tổng kết</label><textarea id="result" name="result" required maxlength="10000">%s</textarea><p>Đóng sẽ kết thúc xử lý và giải phóng chỗ để nhận ticket chờ. Ticket không thể mở lại.</p><label><input type="checkbox" name="confirmClose" value="yes" required> Tôi xác nhận đóng ticket này</label>' % _text(submitted.get('result', ''))
            labels = {'start': 'Bắt đầu xử lý', 'start-step': 'Bắt đầu bước tiếp theo', 'complete-step': 'Hoàn tất bước', 'close': 'Xác nhận đóng ticket'}
            body += '<button type="submit">%s</button></form>' % labels[action]
        if detail.get('result'):
            body += '<h2>Kết quả tổng kết</h2><p>%s</p>' % _text(detail['result'])
        if error:
            body += '<script>document.getElementById("processing-error").focus()</script>'
        return self._page('Chi tiết ticket', body, status)

    @http.route('/dx/tickets/workspace/<string:ticket_uuid>/process', type='http', auth='user', methods=['POST'], csrf=True)
    def process_ticket(self, ticket_uuid, **kwargs):
        try:
            client = self._client()
            version = int(kwargs.get('version', ''))
            action = kwargs.get('action')
            if action == 'close' and kwargs.get('confirmClose') != 'yes':
                raise PTicketClientError('Hãy xác nhận đóng ticket.', 422)
            body = {'version': version, 'action': action}
            for key in ('stepId', 'content', 'result'):
                if kwargs.get(key) and (key != 'stepId' or action in ('start-step', 'complete-step')):
                    body[key] = kwargs[key]
            client.process_ticket(ticket_uuid, body, kwargs.get('idempotencyKey', ''))
            return request.redirect('/dx/tickets/workspace/' + ticket_uuid, code=303)
        except (PTicketClientError, ValueError) as error:
            try:
                client = self._client()
                detail = client.get_detail(ticket_uuid)
            except PTicketClientError:
                return self._page('Không thể lưu', '<h1>Không thể lưu</h1><p>%s</p><label>Nội dung chưa lưu</label><textarea readonly>%s</textarea><label>Kết quả chưa lưu</label><textarea readonly>%s</textarea>' % (_text(error), _text(kwargs.get('content', '')), _text(kwargs.get('result', ''))), 503)
            return self._render_detail(ticket_uuid, detail, error, kwargs, getattr(error, 'status_code', 422))

    @http.route('/dx/tickets/workspace/<string:ticket_uuid>/attachment', type='http', auth='user', methods=['GET'])
    def download_attachment(self, ticket_uuid, **_kwargs):
        try:
            client = self._client()
            detail = client.get_detail(ticket_uuid)
            attachment = detail.get('attachment') if isinstance(detail.get('attachment'), dict) else None
            if not attachment or not isinstance(attachment.get('id'), str):
                raise PTicketClientError('Ticket không có tệp đính kèm được phép tải.', 404)
            content, content_type = client.download(attachment['id'])
        except PTicketClientError as error:
            return self._error(error)
        filename = attachment.get('displayName') if isinstance(attachment.get('displayName'), str) else 'attachment'
        return request.make_response(content, headers=[
            ('Content-Type', content_type), ('Content-Disposition', http.content_disposition(filename)),
            ('Cache-Control', 'no-store'), ('X-Content-Type-Options', 'nosniff'),
        ])
