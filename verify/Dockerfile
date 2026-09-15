# 验收镜像：Python（pytest + httpx）+ Node（Vitest）+ Playwright Chromium。
# 构建期把前端依赖装好到 /opt/web-pkg；运行时 entrypoint 同步到具名卷，
# 再把只读挂载的 web 源码复制到可写目录并链上依赖，运行 Vitest 与 Playwright。
#
# 注意：Playwright 官方 noble 镜像已预装 Chromium 与全部系统库。
FROM mcr.microsoft.com/playwright:v1.63.0-noble

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /workspace

# Python 侧依赖（pytest / httpx / fastapi / pydantic，供 api 测试直接 import）
COPY api/requirements.txt /tmp/api-requirements.txt
RUN pip install --no-cache-dir -r /tmp/api-requirements.txt

# Node 侧依赖（仓库提交了 package-lock.json，用 npm ci 保证可复现）
RUN mkdir -p /opt/web-pkg
COPY web/package.json web/package-lock.json /opt/web-pkg/
RUN cd /opt/web-pkg && npm ci
