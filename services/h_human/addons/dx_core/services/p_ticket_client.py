# -*- coding: utf-8 -*-
"""HTTP client for P ticket reads. It never caches delegated tokens or PII."""
import json
from urllib import parse, request


class PTicketClientError(Exception):
    pass


class PTicketClient:
    def __init__(self, api_base, token_url, client_id, client_secret, subject_token, opener=None):
        self.api_base = api_base.rstrip('/')
        self.token_url = token_url
        self.client_id = client_id
        self.client_secret = client_secret
        self.subject_token = subject_token
        self._open = opener or request.urlopen

    def _exchange_token(self, scopes):
        payload = parse.urlencode({
            'grant_type': 'urn:ietf:params:oauth:grant-type:token-exchange',
            'subject_token': self.subject_token,
            'subject_token_type': 'urn:ietf:params:oauth:token-type:access_token',
            'requested_token_type': 'urn:ietf:params:oauth:token-type:access_token',
            'audience': 'p-process',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'scope': ' '.join(scopes),
        }).encode()
        try:
            with self._open(request.Request(self.token_url, data=payload), timeout=5) as response:
                token = json.load(response).get('access_token')
        except (KeyError, OSError, ValueError, TypeError) as error:
            raise PTicketClientError('Không thể tạo phiên ủy quyền tới dịch vụ ticket.') from error
        if not isinstance(token, str) or not token:
            raise PTicketClientError('Phản hồi token exchange không hợp lệ.')
        return token

    def _request(self, path, scopes, accept='application/json'):
        token = self._exchange_token(scopes)
        req = request.Request(
            self.api_base + path,
            headers={'Authorization': 'Bearer ' + token, 'Accept': accept},
        )
        try:
            return self._open(req, timeout=10)
        except OSError as error:
            raise PTicketClientError('Không thể tải ticket trong phạm vi trách nhiệm.') from error

    def get_json(self, path):
        try:
            with self._request(path, ('tickets:read',)) as response:
                value = json.load(response)
        except (ValueError, TypeError) as error:
            raise PTicketClientError('Dịch vụ ticket trả JSON không hợp lệ.') from error
        if not isinstance(value, dict):
            raise PTicketClientError('Dịch vụ ticket trả JSON không hợp lệ.')
        return value

    def get_all_tickets(self):
        items = []
        offset = 0
        while True:
            page = self.get_ticket_page(100, offset)
            page_items = page['items']
            total = page['total']
            items.extend(page_items)
            if len(items) >= total:
                return items
            if not page_items:
                raise PTicketClientError('Phản trang ticket không tiến triển.')
            offset += len(page_items)

    def get_ticket_page(self, limit=50, offset=0):
        page = self.get_json('/api/v1/tickets?' + parse.urlencode({'limit': limit, 'offset': offset}))
        page_items = page.get('items')
        total = page.get('total')
        if not isinstance(page_items, list) or not isinstance(total, int) or total < 0:
            raise PTicketClientError('Phân trang ticket không hợp lệ.')
        required = ('id', 'code', 'provisionalType', 'status', 'summary')
        for item in page_items:
            if not isinstance(item, dict) or any(not isinstance(item.get(key), str) for key in required):
                raise PTicketClientError('Mục ticket trong phân trang không hợp lệ.')
        return {'items': page_items, 'total': total, 'limit': limit, 'offset': offset}

    def get_detail(self, ticket_uuid):
        return self.get_json('/api/v1/tickets/' + parse.quote(ticket_uuid, safe=''))

    def download(self, attachment_uuid):
        try:
            with self._request(
                '/api/v1/attachments/' + parse.quote(attachment_uuid, safe='') + '/download',
                ('tickets:download',),
                'application/octet-stream',
            ) as response:
                return response.read(), response.headers.get('Content-Type', 'application/octet-stream')
        except OSError as error:
            raise PTicketClientError('Không thể đọc nội dung tệp từ dịch vụ ticket.') from error
