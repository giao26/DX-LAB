# -*- coding: utf-8 -*-
import importlib.util
import io
import json
from pathlib import Path
import unittest
from urllib import parse
import xml.etree.ElementTree as ET


MODULE_PATH = Path(__file__).parents[1] / 'services' / 'p_ticket_client.py'
SPEC = importlib.util.spec_from_file_location('p_ticket_client', MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
PTicketClient = MODULE.PTicketClient


class FakeResponse(io.BytesIO):
    def __init__(self, value, content_type='application/json'):
        payload = value if isinstance(value, bytes) else json.dumps(value).encode()
        super().__init__(payload)
        self.headers = {'Content-Type': content_type}

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        self.close()


class SequenceOpener:
    def __init__(self, responses):
        self.responses = list(responses)
        self.requests = []

    def __call__(self, req, timeout):
        self.requests.append((req, timeout))
        return FakeResponse(*self.responses.pop(0))


def client(opener):
    return PTicketClient('http://p', 'http://idp/token', 'odoo', 'secret', 'subject', opener)


class PTicketClientTests(unittest.TestCase):
    def test_paginates_all_items_and_exchanges_fresh_read_token_for_each_page(self):
        first = {'id': '1', 'code': 'T-1', 'provisionalType': 'Tư vấn', 'status': 'WAITING', 'summary': 'Một'}
        second = {'id': '2', 'code': 'T-2', 'provisionalType': 'Tư vấn', 'status': 'WAITING', 'summary': 'Hai'}
        opener = SequenceOpener([
            ({'access_token': 'read-1'},), ({'items': [first], 'total': 2},),
            ({'access_token': 'read-2'},), ({'items': [second], 'total': 2},),
        ])
        self.assertEqual(client(opener).get_all_tickets(), [first, second])
        token_requests = [item[0] for item in opener.requests if item[0].full_url == 'http://idp/token']
        self.assertEqual(len(token_requests), 2)
        for req in token_requests:
            payload = parse.parse_qs(req.data.decode())
            self.assertEqual(payload['scope'], ['tickets:read'])
            self.assertEqual(payload['subject_token'], ['subject'])
        self.assertIn('limit=100&offset=1', opener.requests[-1][0].full_url)

    def test_detail_payload_is_returned_instead_of_discarded(self):
        detail = {'id': 'ticket-1', 'description': 'Chi tiết', 'customer': {'name': 'A'}}
        opener = SequenceOpener([({'access_token': 'read'},), (detail,)])
        self.assertEqual(client(opener).get_detail('ticket-1'), detail)

    def test_download_uses_only_download_scope_and_returns_real_bytes(self):
        opener = SequenceOpener([
            ({'access_token': 'download'},),
            (b'%PDF-real', 'application/pdf'),
        ])
        content, content_type = client(opener).download('attachment-1')
        self.assertEqual(content, b'%PDF-real')
        self.assertEqual(content_type, 'application/pdf')
        payload = parse.parse_qs(opener.requests[0][0].data.decode())
        self.assertEqual(payload['scope'], ['tickets:download'])

    def test_rejects_non_object_item_in_page(self):
        opener = SequenceOpener([({'access_token': 'read'},), ({'items': ['broken'], 'total': 1},)])
        with self.assertRaises(MODULE.PTicketClientError):
            client(opener).get_ticket_page()

    def test_download_read_failure_is_a_structured_client_error(self):
        class BrokenResponse(FakeResponse):
            def read(self, *_args):
                raise OSError('socket closed')

        responses = iter([FakeResponse({'access_token': 'download'}), BrokenResponse(b'')])
        with self.assertRaises(MODULE.PTicketClientError):
            client(lambda _req, timeout: next(responses)).download('attachment-1')

    def test_odoo_workspace_is_on_demand_and_does_not_define_a_persistent_projection(self):
        addon = Path(__file__).parents[1]
        controller = (addon / 'controllers' / 'ticket_workspace.py').read_text(encoding='utf-8')
        models_init = (addon / 'models' / '__init__.py').read_text(encoding='utf-8')
        self.assertNotIn('dx_ticket_workspace', models_init)
        self.assertNotIn('TransientModel', controller)
        self.assertIn('get_ticket_page', controller)
        self.assertIn('get_detail(ticket_uuid)', controller)
        self.assertIn("client.download(attachment['id'])", controller)

    def test_odoo_login_provider_and_url_menu_are_provisioned(self):
        addon = Path(__file__).parents[1]
        provider = ET.parse(addon / 'data' / 'oauth_provider.xml').getroot()
        self.assertEqual(provider.find(".//field[@name='client_id']").text, 'odoo-login')
        action = ET.parse(addon / 'views' / 'dx_ticket_workspace_views.xml').getroot()
        self.assertEqual(action.find(".//field[@name='url']").text, '/dx/tickets/workspace')


if __name__ == '__main__':
    unittest.main()
