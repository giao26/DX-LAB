/**
 * DX-LAB (DX-OS) - Node-RED Settings Configuration
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

module.exports = {
    uiPort: process.env.PORT || 1880,
    mqttReconnectTime: 15000,
    serialReconnectTime: 15000,
    debugMaxLength: 1000,
    flowFile: 'flows.json',
    flowFilePretty: true,
    functionGlobalContext: {
        // Biến môi trường dùng chung trong Function Node
        osType: 'DX-OS'
    },
    exportGlobalContextKeys: false,
    logging: {
        console: {
            level: "info",
            metrics: false,
            audit: false
        }
    },
    editorTheme: {
        page: {
            title: "DX-LAB Workflow Automation"
        },
        header: {
            title: "DX-OS Process Orchestrator"
        }
    }
};
