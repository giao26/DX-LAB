# ==============================================================================
# DX-LAB (DX-OS) - Node-RED Custom Containerfile
# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0
# ==============================================================================

FROM nodered/node-red:3.1-debian

USER root

WORKDIR /data

COPY package.json /data/
RUN npm install --no-audit --no-update-notifier --only=production

USER node-red

WORKDIR /usr/src/node-red

EXPOSE 1880
