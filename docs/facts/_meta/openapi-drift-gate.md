# OpenAPI 漂移门的实际接线状态

> 治理记录:`TCRN-TMS-STORY-008`(Epic `TCRN-TMS-EPIC-002`)· 分解裁定 minutes `TCRN-TMS-MIN-001`

## 结论:门已经是必需门,无需提升

分解阶段的一条建议是「把 `tooling:openapi:diff` 由 advisory 提为 CI 必需门」。**读源码后该建议被证伪:它已经是必需门。**

## 证据链

四步都可复核:

1. **触发**:`.github/workflows/tooling-advisory.yml` 的 `on.pull_request.paths` 含 `apps/**`、`packages/**`、`package.json`、`scripts/tooling/**` —— 任何触碰 API 代码的 PR 都会触发。
2. **必需作业**:同文件的 `security-required` 作业设 `env.TCRN_TOOLING_REQUIRE: '1'`,其步骤 `Required security checks` 运行 `pnpm security:check`。
3. **命令链**:`package.json:61` 的 `security:check` 展开后含 `pnpm tooling:openapi:diff`。
4. **退出行为**:`scripts/tooling/run-openapi-diff.mjs` 末尾 `process.exit(requireTool ? worstStatus : 0)`,其中 `requireTool = process.env.TCRN_TOOLING_REQUIRE === '1'`。故在该作业内**漂移即非零退出即 PR 失败**。

工具缺失也是 fail-closed:`oasdiff` 不在 PATH 时 `worstStatus` 置 127,必需模式下同样以 127 退出。

## 真正的问题:一个会导致误读的重复副本

同一个 `tooling-advisory.yml` 里,**advisory 作业**另有一个步骤跑同一条命令,带 `continue-on-error: true`。

任何人读工作流时先看到这一处,就会得出「OpenAPI 漂移不设门」的结论 —— 分解阶段正是这样误判的。两处副本本身无害(必需的那份仍然必需),有害的是它制造的错误印象。

**已做的处置**:给该步骤加注释并改名为 `OpenAPI advisory (non-blocking duplicate; the blocking copy is in security-required)`,明确指向真正阻断的那一份。**不删除**,因为它在 advisory 作业里提供一份不中断整体的可读日志。

## 教训

> 「某个检查是不是门」这个问题,必须靠读**触发条件 + 作业环境 + 命令链 + 退出码**四段来回答,不能靠工作流里某一行的 `continue-on-error` 字面判断。

这与本 Initiative 的另一条教训同源:**门只保护它读过的字节,而读者也只看见他读过的那一行。**

## 未测边界

- 本结论只覆盖**接线**:门确实会因漂移而阻断 PR。
- **未测**该门的检测能力本身(即漂移时它是否真的报漂移)。给它做变异红证属 `TCRN-TMS-GATE-002` 的范围,尚未完成。
- `oasdiff` 是否在 CI runner 上被正确安装,未在真实 CI 运行中验证。
