# -*- coding: utf-8 -*-
# ==============================================================================
# DX-LAB (DX-OS) - Odoo Core Addon Manifest
# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0
# ==============================================================================

{
    'name': 'DX-LAB Core System',
    'version': '0.1.0',
    'category': 'Human Resources / Operating System',
    'summary': 'Module mở rộng quản trị nhân sự, vai trò và tích hợp cho hệ điều hành số DX-OS',
    'author': 'DX-LAB Development Team',
    'website': 'https://github.com/dx-lab/dx-os',
    'license': 'AGPL-3',
    'depends': [
        'base',
        'hr',
    ],
    'data': [
        'security/ir.model.access.csv',
    ],
    'installable': True,
    'application': True,
    'auto_install': False,
}
