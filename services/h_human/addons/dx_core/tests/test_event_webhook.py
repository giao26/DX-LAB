# -*- coding: utf-8 -*-
"""Executable unit test suite for DxEventWebhookController without requiring full Odoo runtime."""
import json
from pathlib import Path
import sys
import types
import unittest
from contextlib import contextmanager


ADDON = Path(__file__).parents[1]

class FakeEnv(dict):
    def __init__(self, *args):
        super().__init__(*args)
        self.savepoints = 0
        self.cr = self

    @contextmanager
    def savepoint(self):
        self.savepoints += 1
        yield

# Set up fake Odoo environment
class FakeRecordSet:
    def __init__(self, records):
        self._records = list(records)

    def __iter__(self):
        return iter(self._records)

    def __bool__(self):
        return len(self._records) > 0

    def __len__(self):
        return len(self._records)

    def __getitem__(self, item):
        return self._records[item]


class FakeInboxModel:
    def __init__(self):
        self.records = []
        self.raise_on_create = None

    def sudo(self):
        return self

    def search(self, domain, limit=None):
        results = []
        for r in self.records:
            match = True
            for clause in domain:
                field, op, val = clause
                r_val = r.get(field)
                if op == '=' and r_val != val:
                    match = False
                    break
                elif op == '>' and (r_val is None or r_val <= val):
                    match = False
                    break
                elif op == '>=' and (r_val is None or r_val < val):
                    match = False
                    break
            if match:
                results.append(r)
        if limit is not None:
            results = results[:limit]
        return FakeRecordSet(results)

    def create(self, vals):
        if self.raise_on_create:
            raise self.raise_on_create
        record = dict(vals)
        self.records.append(record)
        return record


class FakePartner:
    def __init__(self, id, name):
        self.id = id
        self.name = name
        self.messages = []

    def message_post(self, body, subject='', message_type='notification', subtype_xmlid='mail.mt_note'):
        self.messages.append({
            'body': body,
            'subject': subject,
            'message_type': message_type,
            'subtype_xmlid': subtype_xmlid,
        })
        return True


class FakeUsersModel:
    def __init__(self):
        self.partner = FakePartner(id=10, name='Staff Warranty')
        self.users = [types.SimpleNamespace(
            id=1,
            name='Staff Warranty',
            oauth_uid='11111111-1111-4111-8111-111111111111',
            partner_id=self.partner,
        )]

    def sudo(self):
        return self

    def search(self, domain, limit=None):
        results = []
        for u in self.users:
            match = True
            for clause in domain:
                field, op, val = clause
                u_val = getattr(u, field, None) if not isinstance(u, dict) else u.get(field)
                if op == '=' and u_val != val:
                    match = False
                    break
            if match:
                results.append(u)
        if limit is not None:
            results = results[:limit]
        return FakeRecordSet(results)


class FakeRequest:
    def __init__(self):
        self.inbox_model = FakeInboxModel()
        self.users_model = FakeUsersModel()
        self.httprequest = types.SimpleNamespace(
            headers={},
            data=b'',
        )
        self.env = {
            'dx.event.inbox': self.inbox_model,
            'res.users': self.users_model,
        }

    @staticmethod
    def make_response(body, status=200, headers=None):
        return {'body': body, 'status': status, 'headers': dict(headers or [])}


fake_request = FakeRequest()
http_module = types.ModuleType('odoo.http')
http_module.Controller = object
http_module.request = fake_request
http_module.route = lambda *_args, **_kwargs: (lambda function: function)

odoo_module = types.ModuleType('odoo')
odoo_module.http = http_module

fields_module = types.ModuleType('odoo.fields')
fields_module.Datetime = types.SimpleNamespace(now=lambda: '2026-09-25 12:00:00')
models_module = types.ModuleType('odoo.models')
models_module.Model = object

odoo_module.fields = fields_module
odoo_module.models = models_module

sys.modules['odoo'] = odoo_module
sys.modules['odoo.http'] = http_module
sys.modules['odoo.fields'] = fields_module
sys.modules['odoo.models'] = models_module

# Now import the controller module
import importlib.util
webhook_spec = importlib.util.spec_from_file_location(
    'dx_core.controllers.event_webhook', ADDON / 'controllers' / 'event_webhook.py')
webhook_module = importlib.util.module_from_spec(webhook_spec)
webhook_spec.loader.exec_module(webhook_module)


class EventWebhookControllerTests(unittest.TestCase):
    def setUp(self):
        self.controller = webhook_module.DxEventWebhookController()
        fake_request.inbox_model = FakeInboxModel()
        fake_request.users_model = FakeUsersModel()
        fake_request.env = FakeEnv({
            'dx.event.inbox': fake_request.inbox_model,
            'res.users': fake_request.users_model,
        })
        fake_request.httprequest = types.SimpleNamespace(
            headers={'X-Internal-Service-Key': 'dxlab-internal-service-secret'},
            data=b'',
        )

    def test_unauthorized_when_key_is_missing_or_invalid(self):
        fake_request.httprequest.headers = {}
        res = self.controller.receive_event()
        self.assertEqual(res['status'], 401)

        body = json.loads(res['body'])
        self.assertEqual(body['error'], 'UNAUTHORIZED')
        fake_request.httprequest.headers = {'X-Internal-Service-Key': 'wrong-key'}
        self.assertEqual(self.controller.receive_event()['status'], 401)

    def processing_event(self):
        ticket = '11111111-1111-4111-8111-111111111111'
        return {'event_id': '22222222-2222-4222-8222-222222222222', 'event_type': 'ticket.processing.v1',
                'aggregate_id': ticket, 'aggregate_version': 3, 'payload': {'ticket_id': ticket,
                'ticket_code': 'TCK-1', 'status': 'IN_PROGRESS', 'action': 'start', 'version': 3}}

    def test_processing_first_does_not_suppress_assignment(self):
        event = self.processing_event()
        fake_request.httprequest.data = json.dumps(event).encode()
        self.assertEqual(self.controller.receive_event()['status'], 200)
        event.update(event_id='assignment-older', event_type='TICKET_ASSIGNED', aggregate_version=2)
        event['payload']['assigned_sub'] = '11111111-1111-4111-8111-111111111111'
        fake_request.httprequest.data = json.dumps(event).encode()
        self.assertTrue(json.loads(self.controller.receive_event()['body'])['processed'])
        self.assertEqual(len(fake_request.users_model.partner.messages), 1)

    def test_processing_malformed_rejected_before_inbox(self):
        import copy
        mutations = [lambda e: e['payload'].pop('action'), lambda e: e['payload'].update(action=[]),
                     lambda e: e['payload'].update(status=None), lambda e: e['payload'].update(version=True),
                     lambda e: e.update(aggregate_version=4), lambda e: e['payload'].update(ticket_id='bad'),
                     lambda e: e.update(event_id='bad'), lambda e: e['payload'].update(ticket_code=42),
                     lambda e: e['payload'].update(extra='unexpected')]
        for mutate in mutations:
            event = copy.deepcopy(self.processing_event())
            mutate(event)
            fake_request.httprequest.data = json.dumps(event).encode()
            self.assertEqual(self.controller.receive_event()['status'], 400)
        self.assertEqual(fake_request.inbox_model.records, [])

    def test_processing_duplicate_uses_savepoint_and_replays(self):
        fake_request.httprequest.data = json.dumps(self.processing_event()).encode()
        fake_request.inbox_model.raise_on_create = webhook_module.IntegrityError('duplicate')
        self.assertTrue(json.loads(self.controller.receive_event()['body'])['replayed'])
        self.assertEqual(fake_request.env.savepoints, 1)
        fake_request.inbox_model.raise_on_create = None
        self.assertEqual(self.controller.receive_event()['status'], 200)
        self.assertTrue(json.loads(self.controller.receive_event()['body'])['replayed'])
    def test_bad_request_on_empty_or_invalid_json(self):
        fake_request.httprequest.data = b''
        res = self.controller.receive_event()
        self.assertEqual(res['status'], 400)

        fake_request.httprequest.data = b'invalid json'
        res = self.controller.receive_event()
        self.assertEqual(res['status'], 400)

        fake_request.httprequest.data = json.dumps({'payload': {}}).encode('utf-8')
        res = self.controller.receive_event()
        self.assertEqual(res['status'], 400)
        self.assertIn('Thiếu event_id', json.loads(res['body'])['message'])

    def test_successful_ticket_assigned_event_processing_and_notification(self):
        event_payload = {
            'event_id': 'evt-1001',
            'event_type': 'TICKET_ASSIGNED',
            'aggregate_id': 'ticket-uuid-1',
            'aggregate_version': 1,
            'occurred_at': '2026-09-25T12:00:00Z',
            'payload': {
                'ticket_id': 'ticket-uuid-1',
                'ticket_code': 'TCK-2026-000001',
                'assigned_sub': '11111111-1111-4111-8111-111111111111',
                'group_id': 'warranty',
                'assignment_status': 'ASSIGNED',
                'internal_ticket_url': '/dx/tickets/workspace/ticket-uuid-1',
            }
        }
        fake_request.httprequest.data = json.dumps(event_payload).encode('utf-8')

        res = self.controller.receive_event()
        self.assertEqual(res['status'], 200)
        body = json.loads(res['body'])
        self.assertEqual(body['status'], 'ok')
        self.assertTrue(body['processed'])
        self.assertEqual(body['ticket_code'], 'TCK-2026-000001')

        # Check inbox persistence
        self.assertEqual(len(fake_request.inbox_model.records), 1)
        record = fake_request.inbox_model.records[0]
        self.assertEqual(record['event_id'], 'evt-1001')
        self.assertEqual(record['status'], 'processed')
        self.assertEqual(record['ticket_code'], 'TCK-2026-000001')
        self.assertEqual(record['assigned_sub'], '11111111-1111-4111-8111-111111111111')
        self.assertIsNotNone(record.get('occurred_at'))
        self.assertIsNotNone(record.get('processed_at'))

        # Verify real notification message posted on partner
        partner = fake_request.users_model.partner
        self.assertEqual(len(partner.messages), 1)
        posted_msg = partner.messages[0]
        self.assertIn('TCK-2026-000001', posted_msg['body'])
        self.assertIn('/dx/tickets/workspace/ticket-uuid-1', posted_msg['body'])

        # Privacy verification: Notification must NOT contain customer phone, email, or attachment URL
        notification = record['notification_body']
        self.assertIn('TCK-2026-000001', notification)
        self.assertIn('/dx/tickets/workspace/ticket-uuid-1', notification)
        self.assertNotIn('@', notification)
        self.assertNotIn('.pdf', notification)
        self.assertNotIn('.png', notification)

    def test_non_assignment_event_is_safely_ignored_without_notification(self):
        non_assign_payload = {
            'event_id': 'evt-other-1',
            'event_type': 'TICKET_STATUS_CHANGED',
            'aggregate_id': 'ticket-uuid-1',
            'aggregate_version': 1,
            'payload': {'ticket_id': 'ticket-uuid-1'},
        }
        fake_request.httprequest.data = json.dumps(non_assign_payload).encode('utf-8')

        res = self.controller.receive_event()
        self.assertEqual(res['status'], 200)
        body = json.loads(res['body'])
        self.assertTrue(body['ignored'])
        self.assertEqual(body['reason'], 'UNSUPPORTED_EVENT_TYPE')

        # Inbox has 1 ignored record
        self.assertEqual(len(fake_request.inbox_model.records), 1)
        self.assertEqual(fake_request.inbox_model.records[0]['status'], 'ignored')

        # NO notification posted on partner
        partner = fake_request.users_model.partner
        self.assertEqual(len(partner.messages), 0)

    def test_deduplication_replay_returns_200_without_duplicate(self):
        event_payload = {
            'event_id': 'evt-duplicate-1',
            'event_type': 'TICKET_ASSIGNED',
            'aggregate_id': 'ticket-uuid-2',
            'aggregate_version': 1,
            'payload': {
                'ticket_id': 'ticket-uuid-2',
                'ticket_code': 'TCK-2026-000002',
                'assigned_sub': '11111111-1111-4111-8111-111111111111',
            }
        }
        fake_request.httprequest.data = json.dumps(event_payload).encode('utf-8')

        # First request
        res1 = self.controller.receive_event()
        self.assertEqual(res1['status'], 200)
        self.assertEqual(len(fake_request.inbox_model.records), 1)

        # Second request with same event_id
        res2 = self.controller.receive_event()
        self.assertEqual(res2['status'], 200)
        body2 = json.loads(res2['body'])
        self.assertTrue(body2['replayed'])
        # Records count must remain 1
        self.assertEqual(len(fake_request.inbox_model.records), 1)

    def test_stale_aggregate_version_is_ignored(self):
        # Pre-populate with processed version 2
        fake_request.inbox_model.records.append({
            'event_id': 'evt-v2',
            'event_type': 'TICKET_ASSIGNED',
            'aggregate_id': 'ticket-uuid-3',
            'aggregate_version': 2,
            'status': 'processed',
        })

        # Send stale version 1
        stale_payload = {
            'event_id': 'evt-v1-stale',
            'event_type': 'TICKET_ASSIGNED',
            'aggregate_id': 'ticket-uuid-3',
            'aggregate_version': 1,
            'payload': {
                'ticket_id': 'ticket-uuid-3',
                'ticket_code': 'TCK-2026-000003',
            }
        }
        fake_request.httprequest.data = json.dumps(stale_payload).encode('utf-8')

        res = self.controller.receive_event()
        self.assertEqual(res['status'], 200)
        body = json.loads(res['body'])
        self.assertTrue(body['ignored'])
        self.assertEqual(body['reason'], 'STALE_VERSION')

    def test_integrity_error_on_concurrent_duplicate_returns_200_replayed(self):
        IntegrityError = webhook_module.IntegrityError
        fake_request.inbox_model.raise_on_create = IntegrityError('duplicate key value violates unique constraint')

        payload = {
            'event_id': 'evt-concurrent-dup',
            'event_type': 'TICKET_ASSIGNED',
            'aggregate_id': 'ticket-uuid-4',
            'aggregate_version': 1,
            'payload': {
                'ticket_id': 'ticket-uuid-4',
                'ticket_code': 'TCK-2026-000004',
            }
        }
        fake_request.httprequest.data = json.dumps(payload).encode('utf-8')

        res = self.controller.receive_event()
        self.assertEqual(res['status'], 200)
        body = json.loads(res['body'])
        self.assertTrue(body['replayed'])


if __name__ == '__main__':
    unittest.main()
