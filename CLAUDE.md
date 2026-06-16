# CLAUDE.md

本文件为 Claude Code 在本仓库工作时的项目级指引。

## 改代码后必须跑 lint

**每次修改代码后，必须执行 `npm run lint`，确保 0 error。**

原因：`dev` 与 `build` 脚本行为不同——

- `npm run build`（`vite build`）**不跑 lint**，即使有 lint error 也能构建成功。
- `npm run dev`（`npm run lint && vite build --watch`）**先跑 eslint，lint 失败就中断**，根本进不到 vite。

所以「build 能过」不代表「dev 能跑」。只有保证 `npm run lint` 无 error，`npm run dev` 才能正常启动。

### 操作要求

1. 改完代码先跑 `npx eslint . --ext .ts --fix` 自动修复 prettier 等格式问题。
2. 再跑 `npm run lint` 确认 **0 error**（warning 不阻塞，可保留）。
3. 常见需手动处理的 error：
   - 未使用的变量/函数 → 删除，或对未使用参数加 `_` 前缀（lint 白名单为 `/^_/`）。
