# -*- coding: utf-8 -*-
# ==============================================================================
# DX-LAB (DX-OS) - Employee Model Extension
# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0
# ==============================================================================

from odoo import models, fields, api

class DxEmployee(models.Model):
    """
    Khung mở rộng mô hình Nhân viên (Employee) phục vụ hệ điều hành doanh nghiệp số.
    Tích hợp vai trò số hóa và liên kết cơ sở tri thức cá nhân.
    """
    _inherit = 'hr.employee'

    dx_digital_role = fields.Char(
        string='Vai trò số hóa (Digital Role)',
        help='Vai trò phân định trong quy trình tự động hóa của hệ điều hành DX-OS'
    )
    dx_api_access_enabled = fields.Boolean(
        string='Kích hoạt quyền truy cập API',
        default=False
    )
    dx_knowledge_tier = fields.Selection([
        ('basic', 'Cơ bản (Basic)'),
        ('intermediate', 'Trung cấp (Intermediate)'),
        ('admin', 'Quản trị (Administrator)')
    ], string='Cấp độ tri thức', default='basic')
