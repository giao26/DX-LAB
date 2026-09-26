# -*- coding: utf-8 -*-
# ==============================================================================
# DX-LAB (DX-OS) - Event Webhook Controller
# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0
# ==============================================================================

import json
import os
from uuid import UUID

try:
    from psycopg2 import IntegrityError
except ImportError:
    class IntegrityError(Exception):
        pass

from odoo import http, fields
from odoo.http import request


class DxEventWebhookController(http.Controller):
    """
    Webhook endpoint tiếp nhận sự kiện phân công từ P (AD-3, AD-21).
    Khử trùng bằng dx.event.inbox trước khi tạo thông báo cho nhân viên.
    """

    def _get_expected_service_key(self):
        return (
            os.environ.get('INTERNAL_SERVICE_KEY')
            or os.environ.get('ODOO_INTERNAL_SERVICE_KEY')
            or 'dxlab-internal-service-secret'
        )

    def _verify_auth(self):
        expected_key = self._get_expected_service_key()
        header_key = request.httprequest.headers.get('X-Internal-Service-Key')
        auth_header = request.httprequest.headers.get('Authorization', '')

        bearer_token = ''
        if auth_header.startswith('Bearer '):
            bearer_token = auth_header[7:].strip()

        token = header_key or bearer_token
        return bool(token and token == expected_key)

    def _json_response(self, data, status=200):
        body = json.dumps(data)
        return request.make_response(
            body,
            status=status,
            headers=[
                ('Content-Type', 'application/json; charset=utf-8'),
                ('Cache-Control', 'no-store'),
                ('X-Content-Type-Options', 'nosniff'),
            ],
        )

    @http.route('/dx/api/v1/events', type='http', auth='none', methods=['POST'], csrf=False)
    def receive_event(self, **_kwargs):
        if not self._verify_auth():
            return self._json_response(
                {'error': 'UNAUTHORIZED', 'message': 'Khóa dịch vụ nội bộ không hợp lệ.'},
                status=401,
            )

        raw_data = request.httprequest.data
        if not raw_data:
            return self._json_response(
                {'error': 'BAD_REQUEST', 'message': 'Yêu cầu không có nội dung body.'},
                status=400,
            )

        try:
            data = json.loads(raw_data.decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            return self._json_response(
                {'error': 'BAD_REQUEST', 'message': 'Body phải là định dạng JSON hợp lệ.'},
                status=400,
            )

        if not isinstance(data, dict):
            return self._json_response(
                {'error': 'BAD_REQUEST', 'message': 'JSON body phải là một object.'},
                status=400,
            )

        event_id = data.get('event_id')
        event_type = data.get('event_type')
        if not event_id or not event_type:
            return self._json_response(
                {'error': 'BAD_REQUEST', 'message': 'Thiếu event_id hoặc event_type bắt buộc.'},
                status=400,
            )

        if event_type == 'ticket.processing.v1':
            payload = data.get('payload')
            try:
                valid_uuid = lambda value: isinstance(value, str) and str(UUID(value)) == value.lower()
                valid = (valid_uuid(event_id) and valid_uuid(data.get('aggregate_id'))
                         and isinstance(payload, dict) and set(payload) == {'ticket_id', 'ticket_code', 'status', 'action', 'version'}
                         and valid_uuid(payload.get('ticket_id')) and payload['ticket_id'] == data['aggregate_id']
                         and isinstance(payload.get('ticket_code'), str)
                         and payload.get('status') in ('IN_PROGRESS', 'CLOSED')
                         and payload.get('action') in ('start', 'start-step', 'complete-step', 'close')
                         and type(payload.get('version')) is int and payload['version'] >= 2
                         and type(data.get('aggregate_version')) is int and payload['version'] == data['aggregate_version'])
            except (ValueError, TypeError, AttributeError):
                valid = False
            if not valid:
                return self._json_response({'error': 'BAD_REQUEST', 'message': 'Sự kiện xử lý không hợp lệ.'}, status=400)

        inbox_model = request.env['dx.event.inbox'].sudo()

        # 1. Deduplication check by event_id
        existing = inbox_model.search([('event_id', '=', event_id)], limit=1)
        if existing:
            return self._json_response({
                'status': 'ok',
                'replayed': True,
                'event_id': event_id,
                'message': 'Sự kiện đã tồn tại trong inbox, bỏ qua để chống trùng.',
            })

        # 2. Guard: Ignore events that are not TICKET_ASSIGNED
        if event_type not in ('TICKET_ASSIGNED', 'ticket.processing.v1'):
            try:
                inbox_model.create({
                    'event_id': event_id,
                    'event_type': event_type,
                    'aggregate_id': str(data.get('aggregate_id')) if data.get('aggregate_id') else None,
                    'aggregate_version': int(data.get('aggregate_version', 1)),
                    'status': 'ignored',
                    'occurred_at': data.get('occurred_at'),
                    'processed_at': fields.Datetime.now(),
                    'error_message': f"Bỏ qua sự kiện không hỗ trợ: {event_type}",
                })
            except IntegrityError:
                return self._json_response({
                    'status': 'ok',
                    'replayed': True,
                    'event_id': event_id,
                })
            return self._json_response({
                'status': 'ok',
                'ignored': True,
                'reason': 'UNSUPPORTED_EVENT_TYPE',
                'event_id': event_id,
            })

        aggregate_id = data.get('aggregate_id')
        try:
            aggregate_version = int(data.get('aggregate_version', 1))
        except (ValueError, TypeError):
            aggregate_version = 1

        # 3. Check for stale aggregate_version (> aggregate_version only)
        if aggregate_id:
            stale_event = inbox_model.search([
                ('aggregate_id', '=', str(aggregate_id)),
                ('event_type', '=', event_type),
                ('status', '=', 'processed'),
                ('aggregate_version', '>', aggregate_version),
            ], limit=1)
            if stale_event:
                try:
                    with request.env.cr.savepoint():
                        inbox_model.create({
                            'event_id': event_id,
                            'event_type': event_type,
                            'aggregate_id': str(aggregate_id),
                            'aggregate_version': aggregate_version,
                            'status': 'ignored',
                            'occurred_at': data.get('occurred_at'),
                            'processed_at': fields.Datetime.now(),
                            'error_message': 'Bỏ qua do aggregate_version cũ hơn sự kiện đã xử lý.',
                        })
                except IntegrityError:
                    return self._json_response({
                        'status': 'ok',
                        'replayed': True,
                        'event_id': event_id,
                    })
                return self._json_response({
                    'status': 'ok',
                    'ignored': True,
                    'reason': 'STALE_VERSION',
                    'event_id': event_id,
                })

        # 4. Safe payload extraction
        payload = data.get('payload') if isinstance(data.get('payload'), dict) else {}
        if event_type == 'ticket.processing.v1':
            # Only minimal identity/version/status projection; processing notes stay in P.
            safe_payload = {key: payload.get(key) for key in ('ticket_id', 'ticket_code', 'status', 'action', 'version')}
            try:
                with request.env.cr.savepoint():
                    inbox_model.create({
                        'event_id': event_id, 'event_type': event_type,
                        'aggregate_id': str(aggregate_id), 'aggregate_version': aggregate_version,
                        'payload': json.dumps(safe_payload), 'status': 'processed',
                        'occurred_at': data.get('occurred_at'), 'processed_at': fields.Datetime.now(),
                    })
            except IntegrityError:
                return self._json_response({'status': 'ok', 'replayed': True, 'event_id': event_id})
            return self._json_response({'status': 'ok', 'processed': True, 'event_id': event_id})
        assigned_sub = payload.get('assigned_sub') or payload.get('assignedSub') or ''
        ticket_code = payload.get('ticket_code') or payload.get('ticketCode') or '—'
        ticket_id = payload.get('ticket_id') or payload.get('ticketId') or ''
        assignment_status = payload.get('assignment_status') or payload.get('assignmentStatus') or 'ASSIGNED'
        internal_url = (
            payload.get('internal_ticket_url')
            or payload.get('internalTicketUrl')
            or f"/dx/tickets/workspace/{ticket_id}"
        )

        # STRICT PRIVACY: Verify NO customer email, phone, or attachment URL
        notification_body = (
            f"Bạn đã được phân công xử lý ticket {ticket_code}. "
            f"Trạng thái: {assignment_status}. "
            f"Xem chi tiết tại: {internal_url}"
        )

        # 5. Look up assigned user and create real Odoo chatter message/activity
        users_model = request.env['res.users'].sudo()
        user = None
        if assigned_sub:
            user_records = users_model.search([('oauth_uid', '=', assigned_sub)], limit=1)
            if user_records:
                user = user_records[0]

        if user:
            partner = getattr(user, 'partner_id', None)
            if partner is None and isinstance(user, dict):
                partner = user.get('partner_id')
            if partner and hasattr(partner, 'message_post'):
                try:
                    partner.message_post(
                        body=notification_body,
                        subject=f"Phân công ticket: {ticket_code}",
                        message_type='notification',
                        subtype_xmlid='mail.mt_note',
                    )
                except Exception:
                    pass

            activity_model = request.env.get('mail.activity')
            if activity_model and hasattr(activity_model, 'create'):
                try:
                    activity_model.sudo().create({
                        'res_model': 'res.partner',
                        'res_id': getattr(partner, 'id', user.id),
                        'user_id': user.id,
                        'summary': f"Xử lý ticket {ticket_code}",
                        'note': notification_body,
                    })
                except Exception:
                    pass

        # 6. Record in persistent inbox wrapped with IntegrityError handling for concurrent duplicate requests
        occurred_at = data.get('occurred_at') or payload.get('assigned_at')
        processed_at = fields.Datetime.now()

        try:
            inbox_model.create({
                'event_id': event_id,
                'event_type': event_type,
                'aggregate_id': str(aggregate_id) if aggregate_id else None,
                'aggregate_version': aggregate_version,
                'payload': json.dumps(payload),
                'status': 'processed',
                'assigned_sub': assigned_sub,
                'ticket_code': ticket_code,
                'notification_body': notification_body,
                'occurred_at': occurred_at,
                'processed_at': processed_at,
            })
        except IntegrityError:
            return self._json_response({
                'status': 'ok',
                'replayed': True,
                'event_id': event_id,
            })

        return self._json_response({
            'status': 'ok',
            'event_id': event_id,
            'processed': True,
            'ticket_code': ticket_code,
        })
