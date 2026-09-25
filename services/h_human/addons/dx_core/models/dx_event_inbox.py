# -*- coding: utf-8 -*-
# ==============================================================================
# DX-LAB (DX-OS) - Event Inbox Model
# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0
# ==============================================================================

from odoo import models, fields


class DxEventInbox(models.Model):
    """
    Hộp thư sự kiện bền vững (Transactional Event Inbox) cho Odoo.
    Đảm bảo tính idempotent và khử trùng tuyệt đối theo event_id (AD-3, AD-21).
    """
    _name = 'dx.event.inbox'
    _description = 'DX-LAB Event Inbox'
    _order = 'occurred_at desc, id desc'

    event_id = fields.Char(string='Event ID', required=True, index=True)
    event_type = fields.Char(string='Event Type', required=True, index=True)
    aggregate_id = fields.Char(string='Aggregate ID', index=True)
    aggregate_version = fields.Integer(string='Aggregate Version', default=1)
    occurred_at = fields.Datetime(string='Occurred At')
    payload = fields.Text(string='Payload (JSON)')
    status = fields.Selection([
        ('received', 'Đã tiếp nhận (Received)'),
        ('processed', 'Đã xử lý (Processed)'),
        ('ignored', 'Bỏ qua (Ignored)'),
        ('failed', 'Lỗi (Failed)'),
    ], default='received', required=True)
    assigned_sub = fields.Char(string='Assigned Sub', index=True)
    ticket_code = fields.Char(string='Mã Ticket', index=True)
    notification_body = fields.Text(string='Nội dung thông báo')
    processed_at = fields.Datetime(string='Processed At')
    error_message = fields.Text(string='Lỗi xử lý')

    _sql_constraints = [
        ('uniq_event_id', 'unique(event_id)', 'Mỗi event_id chỉ được ghi nhận một lần trong inbox.'),
    ]
