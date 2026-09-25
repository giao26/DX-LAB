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


if __name__ == '__main__':
    unittest.main()
