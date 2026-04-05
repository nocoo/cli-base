<p align="center">
  <img src="logo.png" width="128" height="128"/>
</p>

<h1 align="center">cli-base</h1>

<p align="center">
  <strong>Shared CLI infrastructure for TypeScript projects</strong><br>
  Configure · Authenticate · Update · Log
</p>

<p align="center">
  <img src="https://img.shields.io/badge/runtime-Bun-f9f1e1?logo=bun" alt="Bun">
  <img src="https://img.shields.io/badge/lang-TypeScript-3178c6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/npm/v/@nocoo/cli-base" alt="npm version">
  <img src="https://img.shields.io/badge/coverage-95%2B-brightgreen" alt="Coverage">
  <img src="https://img.shields.io/github/license/nocoo/cli-base" alt="License">
</p>

---

## 这是什么

cli-base 是一个 CLI 工具的基础设施库，为多个 CLI 项目提供统一的底层能力。避免在 pika、pew、otter 等项目中重复实现配置管理、OAuth 登录、自动更新等通用逻辑。

```
┌─────────────────────────────────────────────────┐
│                   Your CLI                       │
├─────────────────────────────────────────────────┤
│  cli-base                                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │ Config  │ │  Login  │ │ Update  │ │  Log   │ │
│  └─────────┘ └─────────┘ └─────────┘ └────────┘ │
├─────────────────────────────────────────────────┤
│  citty · consola · picocolors · yocto-spinner   │
└─────────────────────────────────────────────────┘
```

## 功能

- **ConfigManager** — 泛型配置文件管理，支持 dev/prod 环境分离，sync/async API，0600 权限保护
- **Login Flow** — 浏览器 OAuth 登录流程，本地 loopback 回调服务器，XSS 防护
- **Update Helpers** — 自动检测 bun/pnpm/yarn/npm，查询 npm registry 最新版本
- **Version Utils** — 从 package.json 读取版本，语义化版本比较
- **Browser** — 跨平台打开浏览器（macOS/Windows/Linux）
- **Log** — consola 封装，formatDuration/formatSize/formatDate 格式化工具

## 安装

```bash
bun add @nocoo/cli-base
# or
npm install @nocoo/cli-base
```

## 使用示例

### 配置管理

```typescript
import { ConfigManager } from "@nocoo/cli-base";

interface MyConfig {
  token?: string;
  deviceId?: string;
}

const config = new ConfigManager<MyConfig>("~/.config/my-cli", isDev);
config.write({ token: "xxx" });
const token = config.get("token");
```

### 登录流程

```typescript
import { performLogin, openBrowser } from "@nocoo/cli-base";

const result = await performLogin({
  openBrowser,
  onSaveToken: (token) => config.write({ token }),
  apiUrl: "https://my-saas.com",
  timeoutMs: 120_000,
});
```

### 更新检测

```typescript
import { detectPackageManager, getLatestVersion, getUpdateCommand } from "@nocoo/cli-base";

const pm = detectPackageManager("@nocoo/my-cli");
const latest = await getLatestVersion("@nocoo/my-cli");
if (pm && latest) {
  console.log(getUpdateCommand(pm, "@nocoo/my-cli"));
}
```

## 项目结构

```
cli-base/
├── src/
│   ├── index.ts          # 导出所有模块
│   ├── config.ts         # ConfigManager 泛型类
│   ├── login.ts          # OAuth 登录流程
│   ├── update.ts         # 更新检测工具
│   ├── version.ts        # 版本读取与比较
│   ├── browser.ts        # 跨平台浏览器打开
│   └── log.ts            # consola 封装
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 技术栈

| 层 | 技术 |
|---|------|
| CLI 框架 | [citty](https://github.com/unjs/citty) |
| 日志 | [consola](https://github.com/unjs/consola) |
| 颜色 | [picocolors](https://github.com/alexeyraspopov/picocolors) |
| 进度 | [yocto-spinner](https://github.com/sindresorhus/yocto-spinner) |
| 测试 | [Vitest](https://vitest.dev) |

## 开发

**环境要求：** Bun 1.0+, Node.js 18+

```bash
git clone https://github.com/nocoo/cli-base.git
cd cli-base
bun install
```

| 命令 | 说明 |
|------|------|
| `bun test` | 运行测试 |
| `bun run test:coverage` | 运行测试并输出覆盖率 |
| `bun run lint` | 类型检查 + Biome lint |
| `bun run build` | 编译 TypeScript |

## 测试

| 层 | 内容 | 触发时机 |
|---|------|---------|
| L1 | 单元测试 (95%+ 覆盖率) | pre-commit |
| G1 | tsc + Biome | pre-commit |
| G2 | gitleaks 密钥扫描 | pre-push |

```bash
bun run test:coverage
```

## License

[MIT](LICENSE) © 2026
