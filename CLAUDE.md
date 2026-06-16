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

## 调试移动端显示

无需真机，用桌面客户端内置的移动端模拟最快：

1. 打开开发者控制台（`Ctrl/Cmd + Shift + I`），在 Console 执行：
   ```js
   this.app.emulateMobile(true)   // 开启移动端模拟
   this.app.emulateMobile(false)  // 关闭
   this.app.isMobile              // 查看当前是否移动态
   ```
2. 开启后整个 UI 切到移动端布局（body 加上 `.is-mobile` class），针对 `.is-mobile` / `.is-phone` / `.is-tablet` 的 CSS 立即生效，可据此验证移动端样式与 `Platform.isMobile` 分支逻辑。
3. 模拟器无法 100% 还原真机（字体、安全区、触摸、键盘弹出等），必要时再走真机远程调试：Android 用 Chrome `chrome://inspect`，iOS 用 Mac Safari 的 Web Inspector。
