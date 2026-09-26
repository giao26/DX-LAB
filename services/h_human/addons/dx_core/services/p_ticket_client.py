# -*- coding: utf-8 -*-
"""HTTP client đọc ticket từ P; không cache token ủy quyền hoặc PII."""
import json
from urllib import error as urlerror, parse, request


class PTicketClientError(Exception):
    def __init__(self, message, status_code=502, reauth=False):
        super().__init__(message)
        self.status_code = status_code
        self.reauth = reauth


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
        except urlerror.HTTPError as error:
            if error.code in (400, 401, 403):
                raise PTicketClientError('Phiên đăng nhập đã hết hạn.', 401, True) from error
            raise PTicketClientError('Dịch vụ xác thực tạm thời không khả dụng.', 503) from error
        except (AttributeError, KeyError, OSError, ValueError, TypeError) as error:
            raise PTicketClientError('Không thể tạo phiên ủy quyền tới dịch vụ ticket.', 503) from error
        if not isinstance(token, str) or not token:
            raise PTicketClientError('Phản hồi token exchange không hợp lệ.', 503)
        return token

    def _request(self, path, scopes, accept='application/json', body=None, idempotency_key=None):
        token = self._exchange_token(scopes)
        req = request.Request(self.api_base + path, headers={
            'Authorization': 'Bearer ' + token,
            'Accept': accept,
        }, data=json.dumps(body).encode() if body is not None else None)
        if body is not None:
            req.add_header('Content-Type', 'application/json')
            req.add_header('Idempotency-Key', idempotency_key)
        try:
            return self._open(req, timeout=10)
        except urlerror.HTTPError as error:
            if error.code in (401, 403):
                raise PTicketClientError('Phiên đăng nhập đã hết hạn hoặc quyền đã bị thu hồi.', 401, True) from error
            if error.code == 404:
                raise PTicketClientError('Ticket không tồn tại hoặc bạn không có quyền truy cập.', 404) from error
            if error.code == 400:
                raise PTicketClientError('Yêu cầu không hợp lệ.', 400) from error
            if error.code in (409, 422):
                try:
                    problem = json.load(error)
                    detail = problem.get('detail') if isinstance(problem, dict) else None
                except (ValueError, OSError):
                    detail = None
                raise PTicketClientError(detail or 'Hãy tải lại ticket và kiểm tra nội dung trước khi thử lại.', error.code) from error
            raise PTicketClientError('Dịch vụ ticket tạm thời không khả dụng.', 503) from error
        except OSError as error:
            raise PTicketClientError('Không thể tải ticket trong phạm vi trách nhiệm.', 503) from error

    def get_json(self, path):
        try:
            with self._request(path, ('tickets:read',)) as response:
                value = json.load(response)
        except PTicketClientError:
            raise
        except (OSError, ValueError, TypeError) as error:
            raise PTicketClientError('Dịch vụ ticket trả JSON không hợp lệ.', 502) from error
        if not isinstance(value, dict):
            raise PTicketClientError('Dịch vụ ticket trả JSON không hợp lệ.', 502)
        return value

    def process_ticket(self, ticket_uuid, body, idempotency_key):
        try:
            with self._request('/api/v1/tickets/' + parse.quote(ticket_uuid, safe='') + '/process',
                               ('tickets:write',), body=body, idempotency_key=idempotency_key) as response:
                value = json.load(response)
            if not isinstance(value, dict):
                raise ValueError('invalid response')
            return value
        except PTicketClientError:
            raise
        except (OSError, ValueError, TypeError) as error:
            raise PTicketClientError('Không thể đọc kết quả xử lý. Hãy thử lại với cùng lệnh.', 502) from error

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
                raise PTicketClientError('Phân trang ticket không tiến triển.', 502)
            offset += len(page_items)

    def get_ticket_page(self, limit=50, offset=0):
        page = self.get_json('/api/v1/tickets?' + parse.urlencode({'limit': limit, 'offset': offset}))
        page_items = page.get('items')
        total = page.get('total')
        if not isinstance(page_items, list) or not isinstance(total, int) or isinstance(total, bool) or total < 0:
            raise PTicketClientError('Phân trang ticket không hợp lệ.', 502)
        required = ('id', 'code', 'provisionalType', 'status', 'summary')
        for item in page_items:
            if not isinstance(item, dict) or any(not isinstance(item.get(key), str) for key in required):
                raise PTicketClientError('Mục ticket trong phân trang không hợp lệ.', 502)
            if item['status'] not in ('WAITING', 'IN_PROGRESS', 'CLOSED'):
                raise PTicketClientError('Mục ticket trong phân trang không hợp lệ.', 502)
            if 'slaDueAt' not in item or (item.get('slaDueAt') is not None and not isinstance(item.get('slaDueAt'), str)):
                raise PTicketClientError('Mục ticket trong phân trang không hợp lệ.', 502)
        return {'items': page_items, 'total': total, 'limit': limit, 'offset': offset}

    def get_detail(self, ticket_uuid):
        detail = self.get_json('/api/v1/tickets/' + parse.quote(ticket_uuid, safe=''))
        required_strings = ('id', 'code', 'provisionalType', 'status', 'summary', 'description', 'groupId')
        if any(not isinstance(detail.get(key), str) for key in required_strings):
            raise PTicketClientError('Chi tiết ticket không hợp lệ.', 502)
        if detail['status'] not in ('WAITING', 'IN_PROGRESS', 'CLOSED') or not isinstance(detail.get('assignedToMe'), bool):
            raise PTicketClientError('Chi tiết ticket không hợp lệ.', 502)
        if 'slaDueAt' not in detail or (detail.get('slaDueAt') is not None and not isinstance(detail.get('slaDueAt'), str)):
            raise PTicketClientError('Chi tiết ticket không hợp lệ.', 502)
        customer = detail.get('customer')
        if customer is not None and (not isinstance(customer, dict) or any(
                not isinstance(customer.get(key), str) for key in ('name', 'phone', 'email'))):
            raise PTicketClientError('Chi tiết ticket không hợp lệ.', 502)
        attachment = detail.get('attachment')
        if attachment is not None and (not isinstance(attachment, dict)
                or any(not isinstance(attachment.get(key), str) for key in ('id', 'displayName', 'detectedMime', 'createdAt'))
                or not isinstance(attachment.get('sizeBytes'), int) or isinstance(attachment.get('sizeBytes'), bool)):
            raise PTicketClientError('Chi tiết ticket không hợp lệ.', 502)
        return detail

    def download(self, attachment_uuid):
        try:
            with self._request(
                '/api/v1/attachments/' + parse.quote(attachment_uuid, safe='') + '/download',
                ('tickets:download',),
                'application/octet-stream',
            ) as response:
                return response.read(), response.headers.get('Content-Type', 'application/octet-stream')
        except PTicketClientError:
            raise
        except OSError as error:
            raise PTicketClientError('Không thể đọc nội dung tệp từ dịch vụ ticket.', 503) from error
