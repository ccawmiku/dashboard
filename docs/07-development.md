# 开发与 AI 协作

## 开始工作前

阅读根目录 AGENTS.md、产品范围、系统架构及待修改模块文档。核实当前代码已经实现的范围，不能把路线图中的功能当成可用接口。所有新增功能需更新相应契约、文档和有意义的测试。

## 目录

```text
apps/server/src/      Fastify、数据核心、SQLite、配置、应用启动
apps/web/src/         网页外壳、数据客户端、预览入口
packages/contracts/  运行时校验与共享类型
packages/connector-sdk/  连接器生命周期接口
packages/widget-sdk/     网页组件输入类型
packages/ui/         公共卡片外壳和主题
connectors/ntp/      NTP 协议适配与采集生命周期
widgets/digital-clock/  固定 1×1 数字时钟
tests/              单元、接口、UDP 和浏览器测试
scripts/            检查、构建、容器烟雾辅助工具
docs/               项目规范和验证记录
```

目录使用 pnpm workspace 组织，共享包在本仓库构建，不要求单独发布 npm。根目录统一锁文件和检查入口。前后端共用 TypeScript 严格模式，公开 JSON 通过 Zod schema 验证。

## 开发命令

`pnpm dev` 同时启动网页和后端；`pnpm check` 执行格式、lint、类型、单元/接口测试及构建；`pnpm test:e2e` 运行浏览器测试，第一次需安装 Chromium：`pnpm exec playwright install chromium`。

`pnpm build` 构建网页和后端，`pnpm start` 运行生产文件。`pnpm audit --prod` 检查运行依赖已知问题；结果需记录，不只看命令是否被执行。

## 给 AI 的连接器任务模板

```text
阅读 AGENTS.md 与 docs/02、03、04。
新增 <来源> 连接器，输入配置 <字段>，产生 <数据点及单位>。
只改连接器、注册入口、必要 schema 与测试；不要修改现有组件外观。
使用本地模拟响应覆盖成功、超时、非法数据、恢复、停止。
说明真实设备验证结果，未验证时明确说明。
更新对应接入文档，运行检查。
```

## 给 AI 的组件任务模板

```text
阅读 AGENTS.md 与 docs/02、03、05。
新增 <type>，固定 <宽×高>，绑定 <数据 kind>，配置 <字段>。
只通过 widget-sdk 读取数据，不直接请求外部来源。
创建 good/stale/error/unavailable 预览，遵循公共主题。
验证桌面和手机显示、错误隔离、可访问性，更新组件文档。
不得改变已有组件的尺寸和语义。
```

## 变更完成标准

功能与契约一致；没有新增跨模块内部引用；异常状态有明确显示；文档与代码一致；类型、lint、格式、相关测试和构建通过；无秘密提交；锁文件已更新；测试记录区分模拟和真实来源。

## 依赖选择

优先 Node/Web 标准能力及维护良好的库。首版采用 React/Vite/Fastify/Zod/SQLite 驱动/hapi SNTP。基础卡片是语义 HTML 与 CSS，无需自制交互控件。复杂编辑器到对应里程碑再选成熟控件库。

选择 NTP 库时评估了 ntp-time-sync 与 @hapi/sntp。后者是范围小的 BSD 许可协议库，适合项目自己控制调度和状态；避免将另一个库的后台轮询与本项目调度重叠。依赖许可不等于项目自动获得同一许可证；首版仓库不添加项目 LICENSE。

依赖维护注意：@hapi/sntp 4.0.0 的间接依赖 @hapi/teamwork 4.0.0 已标记弃用；首版保留原兼容组合并通过 UDP 测试与安全审计验证，不擅自跨主版本替换。后续连接器维护时需继续评估替代库。构建链 esbuild 固定为 0.28.2，以避开开发服务器已知问题；该覆盖已纳入完整构建验证。

## Git 与发布

所有开发直接 main。第一个完整验证的提交标记 v1.0.0；每次提交都配一个唯一的 annotated semver tag。兼容功能 MINOR，修复和文档 PATCH，破坏变更 MAJOR 并先确认。推送提交与标签，GitHub Actions 验证并构建容器。没有自动 GitHub Release，没有 latest 镜像别名。

Docker 构建与容器测试仅在 GitHub Actions 执行，本地只运行原生工具；禁止为此启动或依赖本地 Docker daemon。
