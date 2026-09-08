# AGENTS.md

## 项目背景

本项目是面向餐饮企业客户的移动端保险报价器。用户通过五步表单选择公众责任险、食品安全责任险和雇主责任险方案，录入门店及员工信息后获得预估保费。报价仅用于咨询早期预估，不替代正式核保、承保或出单。

当前阶段以快速验证 MVP 为目标：先交付可独立运行的静态前端，后续再接入客户留资、员工配置、数据库和管理后台。

## 资料入口

- 界面设计：`docs/design.pen`，仅通过 Pencil MCP 读取；未经用户明确要求不得修改。
- 业务规则：`docs/餐饮保险报价器-保费规则梳理.md`。
- 结构化规则：`docs/餐饮保险报价器-MVP规则.json`。
- 技术方案：`docs/01-餐饮保险报价器-技术选型.md`。

业务规则与结构化规则是报价计算依据。发现设计、文档和 JSON 不一致时，不得自行猜测，应明确记录差异并请用户确认。

## 开发规则

1. 使用 Next.js App Router、TypeScript 和 Tailwind CSS，保持移动端优先。
2. MVP 必须支持静态导出，构建产物应能部署到不同静态托管商，不得绑定 Vercel、Netlify 等平台专属运行时或服务。
3. 报价计算必须实现为与 UI 解耦的纯 TypeScript 模块；规则数据须版本化，不得散落或硬编码在组件中。
4. 表单使用 React Hook Form 与 Zod；输入需要明确标签、错误提示和适合移动端的键盘类型。
5. 不得信任客户端提交的报价结果。未来保存报价时，服务端必须按输入和规则版本重新计算。
6. 员工差异通过配置和员工标识实现，所有员工共用页面组件，不复制页面代码。
7. MVP 不引入 Redux、微服务、独立后台项目或不必要的服务端依赖。
8. 保持托管商可移植性：不使用托管商专属函数、存储、分析服务或图片优化能力。
9. 优先测试报价边界、不符合承保条件、人工报价条件、金额汇总和五步流程；涉及规则变更时必须补充或更新测试。
10. 保留现有用户文件和无关改动；未经明确要求，不修改 Pencil 设计、业务规则或结构化规则。
11. 默认在 `codex/develop` 开发分支进行操作；`main` 为生产分支，只有在用户明确同意后才允许将开发分支合并至 `main` 或直接向 `main` 推送提交。

## 文档约定

- 新增正式项目文档使用两位数字编号，例如 `01-主题.md`、`02-主题.md`。
- 既有未编号文件暂不重命名，避免破坏引用。
- 文档使用 Markdown；规则配置使用 JSON，并在报价记录中保留 `rule_version`。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
