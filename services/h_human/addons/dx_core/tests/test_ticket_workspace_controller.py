# -*- coding: utf-8 -*-
"""Executable controller harness that does not require an Odoo installation."""
import importlib.util
from pathlib import Path
import sys
import types
import unittest


ADDON = Path(__file__).parents[1]
SERVICE_PATH = ADDON / 'services' / 'p_ticket_client.py'
service_spec = importlib.util.spec_from_file_location('p_ticket_client_harness', SERVICE_PATH)
service_module = importlib.util.module_from_spec(service_spec)
service_spec.loader.exec_module(service_module)


class FakeRequest:
    def __init__(self):
        self.httprequest = types.SimpleNamespace(args={})
        self.env = types.SimpleNamespace(user=types.SimpleNamespace(oauth_access_token='subject-token'))

    @staticmethod
    def make_response(body, status=200, headers=None):
        return {'body': body, 'status': status, 'headers': dict(headers or [])}

    @staticmethod
    def csrf_token():
        return 'csrf-test'

    @staticmethod
    def redirect(location, code=303):
        return {'status': code, 'location': location}


fake_request = FakeRequest()
http_module = types.ModuleType('odoo.http')
http_module.Controller = object
http_module.request = fake_request
http_module.content_disposition = lambda filename: 'attachment; filename="%s"' % filename
http_module.route = lambda *_args, **_kwargs: (lambda function: function)
odoo_module = types.ModuleType('odoo')
odoo_module.http = http_module

dx_core = types.ModuleType('dx_core')
dx_core.__path__ = [str(ADDON)]
controllers_package = types.ModuleType('dx_core.controllers')
controllers_package.__path__ = [str(ADDON / 'controllers')]
services_package = types.ModuleType('dx_core.services')
services_package.PTicketClient = service_module.PTicketClient
services_package.PTicketClientError = service_module.PTicketClientError

for name, module in {
        'odoo': odoo_module,
        'odoo.http': http_module,
        'dx_core': dx_core,
        'dx_core.controllers': controllers_package,
        'dx_core.services': services_package,
}.items():
    sys.modules[name] = module

controller_spec = importlib.util.spec_from_file_location(
    'dx_core.controllers.ticket_workspace', ADDON / 'controllers' / 'ticket_workspace.py')
controller_module = importlib.util.module_from_spec(controller_spec)
controller_spec.loader.exec_module(controller_module)


class FakeClient:
    def __init__(self):
        self.calls = []

    def get_ticket_page(self, limit, offset):
        self.calls.append(('list', limit, offset))
        return {'items': [{
            'id': 'ticket-1', 'code': 'TCK-1', 'provisionalType': 'Tư vấn',
            'status': 'WAITING', 'slaDueAt': None, 'summary': 'Yêu cầu Tư vấn',
        }], 'total': 1}

    def get_detail(self, ticket_uuid):
        self.calls.append(('detail', ticket_uuid))
        return {
            'id': ticket_uuid, 'code': 'TCK-1', 'provisionalType': 'Tư vấn', 'status': 'WAITING',
            'slaDueAt': None, 'summary': 'Yêu cầu Tư vấn', 'description': 'Chi tiết',
            'groupId': 'consulting', 'assignedToMe': True,
            'attachment': {'id': 'attachment-1', 'displayName': 'bang-chung.pdf', 'sizeBytes': 4,
                           'detectedMime': 'application/pdf', 'createdAt': '2026-09-25T00:00:00Z'},
        }

    def download(self, attachment_uuid):
        self.calls.append(('download', attachment_uuid))
        return b'%PDF', 'application/pdf'


class TicketWorkspaceControllerTests(unittest.TestCase):
    def setUp(self):
        fake_request.httprequest.args = {}
        self.client = FakeClient()
        self.controller = controller_module.DxTicketWorkspaceController()
        self.controller._client = lambda: self.client

    def test_executes_list_detail_and_download_routes_on_demand(self):
        listing = self.controller.list_tickets()
        self.assertEqual(listing['status'], 200)
        self.assertIn('/dx/tickets/workspace/ticket-1', listing['body'])

        detail = self.controller.ticket_detail('ticket-1')
        self.assertEqual(detail['status'], 200)
        self.assertIn('TCK-1', detail['body'])
        self.assertIn('/dx/tickets/workspace/ticket-1/attachment', detail['body'])

        download = self.controller.download_attachment('ticket-1')
        self.assertEqual(download['body'], b'%PDF')
        self.assertEqual(download['headers']['Content-Type'], 'application/pdf')
        self.assertEqual(download['headers']['Cache-Control'], 'no-store')
        self.assertEqual(self.client.calls, [
            ('list', 50, 0), ('detail', 'ticket-1'),
            ('detail', 'ticket-1'), ('download', 'attachment-1'),
        ])

    def test_expired_session_returns_relogin_action(self):
        error = service_module.PTicketClientError('Phiên đăng nhập đã hết hạn.', 401, True)
        self.controller._client = lambda: (_ for _ in ()).throw(error)
        response = self.controller.list_tickets()
        self.assertEqual(response['status'], 401)
        self.assertIn('/web/login', response['body'])
        self.assertEqual(response['headers']['Cache-Control'], 'no-store')

    def test_real_client_construction_and_token_validation(self):
        real_controller = controller_module.DxTicketWorkspaceController()
        fake_request.env.user.oauth_access_token = 'real-token-123'
        client = real_controller._client()
        self.assertEqual(client.subject_token, 'real-token-123')

        fake_request.env.user.oauth_access_token = None
        with self.assertRaises(service_module.PTicketClientError) as raised:
            real_controller._client()
        self.assertEqual(raised.exception.status_code, 401)
        self.assertTrue(raised.exception.reauth)

    def test_missing_attachment_returns_404(self):
        self.client.calls = []
        detail_without_attachment = {
            'id': 'ticket-no-file', 'code': 'TCK-2', 'provisionalType': 'Tư vấn',
            'status': 'WAITING', 'summary': 'Tóm tắt', 'description': 'Mô tả',
            'attachment': None,
        }
        self.client.get_detail = lambda _id: detail_without_attachment
        response = self.controller.download_attachment('ticket-no-file')
        self.assertEqual(response['status'], 404)
        self.assertIn('Không thể tải ticket', response['body'])

    def test_processing_form_csrf_close_confirmation_and_error_draft(self):
        detail = self.client.get_detail('ticket-1')
        detail.update(version=7, status='IN_PROGRESS', allowedActions=['close'], workflow={'steps': []}, steps=[])
        rendered = self.controller._render_detail('ticket-1', detail)
        self.assertIn('csrf-test', rendered['body'])
        self.assertIn('name="confirmClose"', rendered['body'])
        self.assertIn('không thể mở lại', rendered['body'])
        detail['allowedActions'] = []
        failed = self.controller._render_detail('ticket-1', detail, 'Conflict', {'content': '<draft>', 'result': 'summary'})
        self.assertIn('&lt;draft&gt;', failed['body'])
        self.assertIn('summary', failed['body'])

    def test_post_passes_version_key_and_does_not_close_without_confirmation(self):
        calls = []
        self.client.process_ticket = lambda *args: calls.append(args)
        success = self.controller.process_ticket('ticket-1', version='7', action='start', idempotencyKey='key')
        self.assertEqual(success['status'], 303)
        self.assertEqual(calls, [('ticket-1', {'version': 7, 'action': 'start'}, 'key')])
        rejected = self.controller.process_ticket('ticket-1', version='7', action='close', result='draft', idempotencyKey='other')
        self.assertEqual(rejected['status'], 422)
        self.assertEqual(len(calls), 1)
        self.assertIn('draft', rejected['body'])

    def test_lost_response_replays_exact_command_when_detail_advanced_or_closed(self):
        from html.parser import HTMLParser
        class Inputs(HTMLParser):
            def __init__(self):
                super().__init__(); self.values = {}
            def handle_starttag(self, tag, attrs):
                attrs = dict(attrs)
                if tag == 'input' and attrs.get('type') == 'hidden':
                    self.values[attrs['name']] = attrs.get('value', '')
        for action, status in [('complete-step', 'IN_PROGRESS'), ('close', 'CLOSED')]:
            detail = self.client.get_detail('ticket-1')
            detail.update(version=12, status=status, allowedActions=[] if status == 'CLOSED' else ['start-step'],
                          steps=[{'id': '1', 'requiredContent': 'Notes', 'endedAt': '2026-09-25T00:00:00Z'}])
            self.client.get_detail = lambda _id: detail
            self.client.process_ticket = lambda *args: (_ for _ in ()).throw(service_module.PTicketClientError('Lost response', 503))
            submitted = dict(version='7', action=action, stepId='1', content='exact draft', result='exact result', idempotencyKey='same-key', confirmClose='yes')
            response = self.controller.process_ticket('ticket-1', **submitted)
            inputs = Inputs(); inputs.feed(response['body'])
            for key in ('version', 'action', 'stepId', 'idempotencyKey'):
                self.assertEqual(inputs.values[key], submitted[key])
            self.assertIn('exact draft', response['body'])
            self.assertIn('exact result', response['body'])


if __name__ == '__main__':
    unittest.main()
