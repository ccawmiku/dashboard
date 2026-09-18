# 验证记录

此文件仅记录真实执行结果。首版原生验证环境：Windows、Node.js 24.15.0、pnpm 11.19.0，2026-09-18。Linux 容器结果由对应标签的 GitHub Actions 提供。

| 检查                      | 状态                                                                       |
| ------------------------- | -------------------------------------------------------------------------- |
| 格式、lint、类型          | 通过 pnpm check                                                            |
| 单元与接口测试            | 19 项通过，含本地 UDP 包、超时、协议错误、调度与恢复、SQLite、API、SSE     |
| Playwright 浏览器测试     | 3 项通过，含走时、四种状态、320px、离线与恢复                              |
| 生产构建                  | Vite 与 tsup 通过；原生生产服务器实际启动并通过浏览器检查，无页面异常      |
| 实际 NTP 来源测试         | ntp.aliyun.com 成功，采样 RTT 约 22–47ms；time.cloudflare.com 当前网络超时 |
| 依赖安全审计              | pnpm audit 全依赖 0 已知漏洞；包含开发依赖                                 |
| 提交前秘密扫描            | Gitleaks 8.30.1，暂存区扫描未发现秘密；工具下载校验 SHA256                 |
| GitHub 容器构建和烟雾测试 | 每次标签发布前执行，见下方实时 Actions 链接                                |
| GHCR 公共可见性           | 首次推送镜像后核验，见 GitHub package 页面                                 |

本地不执行 Docker。CI 中的确定性 NTP fixture 用于证明容器 UDP 链路，不等同于证明所有服务器网络都能访问公共 NTP。

## 远程验证入口

v1.0.0 的 GitHub Linux verify 作业（类型、构建、19 项单元/接口、3 项浏览器测试及审计）通过；容器安装 SQLite 原生依赖时因精简镜像缺少编译工具失败。v1.0.1 将 Python / make / g++ 放入专用工具链阶段，生产镜像仅复制运行依赖，不携带编译器。该修复由新的标签流程复核。

- [GitHub Actions](https://github.com/ccawmiku/dashboard/actions/workflows/ci.yml)：检查目标版本的 verify 与 container 两个作业，发布步骤只在版本标签触发。
- [镜像包](https://github.com/ccawmiku/dashboard/pkgs/container/dashboard)：查看版本、摘要和可见性。
- [实际运行截图](assets/demo.png)：来自原生生产服务器和真实 NTP，同步源为 ntp.aliyun.com，非模拟预览。

## 已知限制

@hapi/sntp 的一个间接依赖已弃用，当前审计未发现漏洞，详见开发文档；单源 SNTP 不提供认证授时。未验证安卓、ESP32、ARM 镜像、编辑器、身份系统，也不宣称已实现这些能力。公共 NTP 可达性必须在部署服务器上复核。
