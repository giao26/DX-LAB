# -*- coding: utf-8 -*-
"""On-demand Odoo ticket UI; ticket projections and PII are never stored in Odoo."""
from html import escape
import os

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
a:focus{{outline:3px solid #ffbf47;outline-offset:2px}}.status{{font-weight:700}}dl{{display:grid;grid-template-columns:minmax(9rem,14rem) 1fr;gap:.5rem}}
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
            '<td class="status">{status}</td><td>{summary}</td></tr>'.format(
                id=_text(item['id']), code=_text(item['code']), kind=_text(item['provisionalType']),
                status=_text(item['status']), summary=_text(item['summary']),
            ) for item in page['items']
        ) or '<tr><td colspan="4">Không có ticket trong phạm vi hiện tại.</td></tr>'
        navigation = []
        if page_number > 1:
            navigation.append('<a class="button" href="?page=%d">Trang trước</a>' % (page_number - 1))
        if offset + len(page['items']) < page['total']:
            navigation.append('<a class="button" href="?page=%d">Trang sau</a>' % (page_number + 1))
        body = '<h1>Ticket theo phạm vi trách nhiệm</h1><p>%d ticket</p><table><thead><tr><th>Mã</th><th>Loại</th><th>Trạng thái</th><th>Tóm tắt</th></tr></thead><tbody>%s</tbody></table><p>%s</p>' % (
            page['total'], rows, ''.join(navigation),
        )
        return self._page('Ticket theo phạm vi', body)

    @http.route('/dx/tickets/workspace/<string:ticket_uuid>', type='http', auth='user', methods=['GET'])
    def ticket_detail(self, ticket_uuid, **_kwargs):
        try:
            detail = self._client().get_detail(ticket_uuid)
        except PTicketClientError as error:
            return self._error(error)
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
        return self._page('Chi tiết ticket', body)

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
