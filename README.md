# yj-lead-admin

Vue 3 + Vite 实现的邮箱获客后台，用来配合 `yj-lead-api` 使用。

## 功能

- 租户注册与登录
- 登录后保存 JWT，并在后续请求里自动携带 `Authorization: Bearer <token>`
- 展示租户角色、邮箱和租户上下文
- 根据登录返回的角色控制后台页面展示：`TENANT_OWNER` / `TENANT_ADMIN` 可访问全部页面，`TENANT_USER` 只展示仪表盘、客户资产和租户设置
- 客户资产表：名称、邮箱、国家、城市、状态、来源、坐标
- 客户资产页内提供 `OSM 导入`、`资产 Mapping` 和用户提示入口，不在一级菜单单独展示导入或 Mapping
- AWS SES 邮箱推送通道配置
- OSM JSON / GeoJSON 文件导入，导入后先进入资产来源表
- 后端接口失败时展示错误和空状态，不把演示客户数据伪装成真实接口结果

## 本地运行

安装依赖：

```bash
npm install
```

启动：

```bash
npm run dev
```

默认前端地址：

```text
http://127.0.0.1:18082
```

默认 Vite 代理会把 `/api` 转发到：

```text
http://127.0.0.1:18081
```

如果后端部署在其他地址，可以设置：

```bash
VITE_API_BASE_URL=http://your-api-host npm run dev
```

构建：

```bash
npm run build
```

## 后端接口依赖

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/customers?page=0&size=20`
- `GET /api/channels?page=0&size=20`
- `POST /api/channels/email/aws-ses`
- `POST /api/imports/osm-json`
- `POST /api/imports/osm-geojson`
