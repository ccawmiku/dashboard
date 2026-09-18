# 数据与 API 契约

以 `packages/contracts/src/index.ts` 的运行时 schema 为最终机器可检查定义。本文解释语义；修改二者必须同时进行。

## 身份与版本

- 数据点：`dp_000001`，稳定且不因改名变化，删除后不复用。
- 连接器类型：`ntp`；实例：`ntp-primary`。
- 组件类型：`digital-clock`；实例：`clock-main`。
- 看板：`home`。
- API 路径版本：`/api/v1`；快照 `schemaVersion: 1`。
- 组件定义 `version: 1`；Git 标签版本与协议版本不是同一个概念。
- 时间：Unix 毫秒整数或允许亚毫秒的 number（采样算法），展示时按毫秒处理。持续时间统一毫秒。

## 数据点定义

`id`、`name`、`kind`、`unit`、`sourceId` 构成定义。首版仅实现 `kind: clock` 和 `unit: unix-ms`。未来 number/string/boolean 必须新增带判别字段的 schema，而不是接受任意 JSON。

时钟与普通测量值的区别：时钟值允许随单调时间外推，温度等普通值在新采样前保持不变。不得对所有数值套用时钟逻辑。

## 时钟快照

- `value`：当前估算 Unix 毫秒，未获得有效样本时为 null。
- `quality`：good / stale / error / unavailable。
- `sampledAt`：最后成功 NTP 样本的校准时间；从未成功则 null。
- `ageMs`：距最后成功样本的单调经过时间；从未成功则 null。
- `lastAttemptAt`：最近采集尝试的服务器系统时间，仅供诊断。
- `source`：最后成功的服务器；失败尝试不能冒充成功来源。
- `offsetMs`：最后一次 NTP 与当时系统时间的偏差。
- `roundTripMs`：最后一次网络往返延迟。
- `lastError`：脱敏错误代码，恢复成功清空。

状态规则：从未尝试或正在首次采集为 unavailable；首次采集失败且无可用值为 error；曾成功但最近失败或超过最大新鲜度为 stale；最近成功且未过期为 good。失败后保留旧基准外推，但不能显示 good。

## 组件契约

manifest 包含 `type`、`version`、`name`、`size`、`inputs`。size 只有一个值，不存在 supportedSizes。

实例包含 `id`、`type`、`version`、`bindings`、`options` 和 `position`。时钟 bindings 为 `{time: 'dp_000001'}`；options 为标题与 IANA 时区；position 的 row/column 从 0 开始，宽高从 manifest 读取。

绑定时必须检查：数据点存在、kind 匹配、实例版本受支持、时区有效。失败显示配置错误，不能让整个页面崩溃。首版只提供预置只读看板，不提供配置写 API。

## HTTP API

| 路径                 | 返回                               | 说明                                   |
| -------------------- | ---------------------------------- | -------------------------------------- |
| GET /healthz         | `{status:'ok'}`                    | 进程与 HTTP 存活，不依赖公网 NTP       |
| GET /readyz          | `{status:'ready'}`                 | 初始化完成；时间源故障不使整个应用退出 |
| GET /api/v1/snapshot | 版本、看板、组件定义、数据点及观测 | `Cache-Control: no-store`              |
| GET /api/v1/events   | text/event-stream                  | ready / invalidate，注释心跳           |

快照包含 `schemaVersion`、`board`、`widgets`、`points`；points 数组元素为 `{definition, observation}`。API 未知路径返回 JSON 404，不回退成 index.html。

错误使用 `{error: {code, message}}`，不包含堆栈、密钥或外部响应全文。API 首版只读。未来写接口必须先完成身份认证、输入校验、CSRF/来源策略和配置版本冲突处理。

## SSE 与一致性

连接后立即发送 ready，状态变化发送 invalidate，15 秒发送注释心跳。客户端收到通知后 GET 最新快照。不存在逐条事件的持久化重放语义，Last-Event-ID 不代表有补发保证。重新连接和页面恢复可见时获取完整快照。

读取并发需合并：同一客户端避免多个旧响应覆盖新状态。通知和 30 秒周期校准不得无界叠加。HTTP 超时后标记连接异常，保留最后有效视图。SSE 断开时仍可通过周期 HTTP 恢复数据。

## 兼容规则

只增加可选字段且旧客户端可以忽略，通常为兼容变更。修改 ID、单位、字段语义、必需字段或删除值属于潜在破坏性变更，需新协议版本或明确迁移。组件换尺寸应新增组件类型，不悄悄改变旧 manifest。

数据库有独立 schema 版本，按顺序迁移；新增默认配置使用 insert-if-absent，不覆盖用户已有配置。即使当前没有编辑器，也应保留该约束。
