# 专色墨首张样张 CIEDE2000 放行比对

包装印刷机更换专色油墨后，调色员必须在继续印刷前比对**标准色**与**首张样张**。
本项目用浏览器（React + TypeScript）录入两组 CIE L\*a\*b\*，由 FastAPI **逐项实现**
CIEDE2000 并返回可复算结果与字段错误，避免手算表因角度换算和中间舍入不同而给出相反结论。

## 判定规则（不可协商）

| 项 | 规则 |
| --- | --- |
| 输入范围 | L\* ∈ [0, 100]，a\*、b\* ∈ [-128, 127]，**端点均包含** |
| 非法输入 | 缺失、非有限（NaN / ±Infinity）、越界 → **整次拒绝**，前端清除旧结论 |
| 公式 | CIEDE2000，参数因子 kL = kC = kH = 1，逐步实现，不用库/查表/固定响应/占位 |
| 舍入 | **只在最终**把 ΔE00 与超出量四舍五入到两位小数（逢五进一） |
| 判定 | **未舍入** ΔE00 ≤ 2.00 → 放行；> 2.00 → 超差，并显示超出量 |

界面同时呈现：两位小数 **ΔE00**、未舍入值与阈值 2.00 的 **阈值关系（≤ / >）**、
明确的 **✅ 放行 / ⛔ 超差** 结论，以及（超差时的）**超出量**。

## 目录结构

```
api/                 FastAPI 服务
  app/ciede2000.py   逐项实现的 CIEDE2000（仅用标准库 math）
  app/judge.py       最终舍入与 ≤ 2.00 判定
  app/main.py        端点 /api/delta-e、/health 与逐字段错误（422）
  tests/             pytest（Sharma 2005 公开 34 对参考色对 + 3 个极端对）
web/                 React + TypeScript（Vite）
  src/               录入、即时校验、结果面板
  e2e/               Playwright 真实联调（浏览器 → nginx → FastAPI）
verify/              一次性验收服务（pytest + Vitest + Playwright）
docker-compose.yml   web / api / verify 三个服务
```

## 快速开始（Docker Compose）

```bash
# 默认宿主端口：web 8080，api 8001
docker compose up -d --build
# 打开 http://localhost:8080

# 用环境变量覆盖宿主端口
WEB_PORT=9090 API_PORT=9001 docker compose up -d --build
```

- 浏览器访问 web（nginx 托管静态资源并把 `/api`、`/health` 反代到 api）。
- 直接调用 api：

```bash
curl -s http://localhost:8001/health
curl -s -X POST http://localhost:8001/api/delta-e \
  -H 'Content-Type: application/json' \
  -d '{"standard":{"L":50,"a":2.6772,"b":-79.7751},
       "sample":{"L":50,"a":0,"b":-82.7485}}'
# → ΔE00 未舍入 2.0424596…，显示 2.04，> 2.00，超差，超出量 0.04
```

非法请求整次拒绝并返回字段错误（HTTP 422）：

```bash
curl -i -X POST http://localhost:8001/api/delta-e \
  -H 'Content-Type: application/json' \
  -d '{"standard":{"L":50,"a":0},"sample":{"L":50,"a":0,"b":200}}'
```

## 一次性验收

```bash
# 启动 api、web 后，运行一次性验收服务（结束自动退出，不长期驻留）
docker compose run --rm verify
```

验收依次执行：

1. **pytest**：37 对公开 CIEDE2000 参考色对（Sharma, Wu, Dalal 2005 论文表 1 的全部 34 对，
   加同一公开测试文件附带的 3 个极端对），每对误差 **≤ 0.0001**；外加端点校验与判定测试。
2. **Vitest**：前端输入校验（缺失/非有限/越界/端点）与旧结论清除。
3. **Playwright**：真实浏览器经 nginx 访问 FastAPI，覆盖放行、超差、端点值、
   422 字段错误、NaN 拒绝、旧结论清除与恢复。

## 本地开发（不用 Docker）

```bash
# API（Python 3.11）
cd api
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
python -m pytest

# Web（Node 20）
cd web
npm install
npm test                     # Vitest
API_PORT=8001 npm run dev    # Vite 把 /api 代理到本机 8001
npx playwright install chromium
WEB_BASE_URL=http://localhost:5173 npx playwright test
```

## 参考数据出处

- Sharma, G., Wu, W., Dalal, E. N. (2005),
  “The CIEDE2000 Color-Difference Formula: Implementation Notes, Supplementary Test
  Data, and Mathematical Observations”, *Color Research & Application*, 30(1), 21–30.
  论文公开的 34 对补充测试色对保存于 `api/tests/data/ciede2000_reference.csv`
  （含同一公开测试文件附带的相同色/黑/白 3 个极端对，共 37 行）。
