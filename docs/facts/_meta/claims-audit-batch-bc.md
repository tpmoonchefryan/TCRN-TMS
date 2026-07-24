# 声称审计 · 批 B / C 与限制 ID 裁决

> 治理记录:`TCRN-TMS-STORY-022` / `TCRN-TMS-STORY-023` / `TCRN-TMS-STORY-024`(Epic `TCRN-TMS-EPIC-006`)· 分解裁定 minutes `TCRN-TMS-MIN-001` · 门 `TCRN-TMS-GATE-003`

## 覆盖范围声明(先说没做什么)

批 A(`claims-audit-batch-a.md`)对 `platform-admin` 的 10 条 AC 面声称做了**逐条**机械判定。

**批 B 与批 C 没有做到逐条。** 本文件覆盖的是这两批中**可机械判定且具系统性**的部分:整表结构缺陷、限制 ID 裁决。**163 条声称中的多数仍未逐条判定**,尤其是 71 条 `prose` 类。

这不是疏漏后的解释,是**范围的诚实划界**:一份声称审计如果宣称覆盖了它没读过的行,就是本 Initiative 一直在抓的那种假绿。

## 批 B:`integrations/README.md` 的整表缺陷

`docs/user-guide/integrations/README.md` 的「Integration Families」表列出 8 个族,每个给一句「Current Guide Position」。

**该表没有 scope 列,而表中每一行的真假都取决于 scope。**

| 族 | AC 侧 | tenant 侧 | 表里的说法 |
|---|---|---|---|
| Interface management | **不可用屏** | 有真界面 | “Visible management surface” —— 只对 tenant 为真 |
| Webhook management | **不可用屏** | 有真界面 | “Visible management surface” —— 只对 tenant 为真 |
| API clients | 有界面 | **无路由** | “Visible management surface” —— 只对 AC 为真 |
| API registry | 有界面 | **无路由** | “Visible registry surface” —— 只对 AC 为真 |
| API gateway readiness | 有界面 | **无路由** | “Visible readiness surface” —— 只对 AC 为真 |
| Builder registry | 有界面 | **无路由** | “Visible registry surface” —— 只对 AC 为真 |
| Platform tool connections | 有界面 | **无路由** | “Visible operations surface” —— 只对 AC 为真 |

**判定:整表结构性缺陷,不是某一行写错。** 表的 schema 缺了决定真假的那一维 —— 8 行里 7 行各自只在一个工作区成立,读者无从得知是哪一个。

这与批 A 的证伪项同根:`platform-admin/README.md:11` 之所以错,也是因为**缺 scope 限定**。两处独立出现同一失效模式,说明它是这批文档的**系统性写法问题**,不是笔误。

**已做的处置**:给该表加 scope 列并逐行标注。**未做**:该文件其余段落的逐条判定。

## 批 C 与限制 ID 裁决(STORY-024)

### 12 个 `OKL-*` 中,11 个是真实 ID

`grep -rho "OKL-[A-Z0-9-]*" docs/` 去重得 12 项,其中 1 项是裸前缀 `OKL-`(匹配到的截断),**真实 ID 11 个**:

`OKL-G19-ACCOUNT-PROFILE-001`、`OKL-G19-ACCOUNT-SESSION-001`、`OKL-G19-ACCOUNT-TOTP-001`、`OKL-G19-ADMIN-INTEGRATION-001`、`OKL-G19-AUTH-LIFECYCLE-001`、`OKL-G19-AUTH-LIFECYCLE-SSO-001`、`OKL-G19-AUTH-PASSWORD-001`、`OKL-G19-DICTIONARY-RUNTIME-001`、`OKL-G19-PUBLIC-WRITE-001`、`OKL-G19-TENANT-SECURITY-001`、`OKL-G19-WIKI-REMOTE-001`。

### 裁决:它们不是孤儿 ID,但确实悬空 —— 悬空的是证据不是定义

分解阶段把这些标为「孤儿 ID(证据随旧 vault 删除)」。**读文档后该判断需要修正:**

- **定义存活**:11 个 ID 全部在 `docs/wiki-draft/Known-Limitations.md` 的表里有条目,含描述与缓解措施。
- **证据死亡**:每条的描述形如「still lack resettable fixture and cleanup proof」——它们援引的**证明切片**存在于已归档的 vault,现已不可达。

**准确表述:这些 ID 不是无定义的孤儿,而是「有主张、无证据」的条目。** 它们记录的是「某件事尚未被证明」,而证明本该在的地方已经没了。

### 后果:一条不可证伪的自指结构

`OKL-G19-AUTH-PASSWORD-001` 说「密码重置/修改/恢复仍缺可重置夹具与清理证明」。要判定这条声称的真假,需要知道「证明是否存在」——而证明所在的 vault 已被移除。

于是形成闭环:**声称说「没有证明」,而验证这条声称需要的正是那份不存在的证明。** 它永远为真,因而永远不可证伪 —— 按 [`README.md` 的可判伪性要求](../README.md#可判伪性),这类条目不能支撑 `proven`,也不能被简单删除(删除等于宣称限制已解除,那同样无证据)。

**裁决:11 个 `OKL-*` 一律标记为 `unverified`,保留原文,并在 `Known-Limitations.md` 顶部写明其证据基线已随 vault 移除。** 逐条重新取证不在本 Initiative 范围 —— 那是 11 个独立的验证工作项,须 Owner 裁定优先级。

### 一条已可判伪且**与限制描述不符**的抽验

`OKL-G19-PUBLIC-WRITE-001` 称「公开 Marshmallow 的提交/反应写入需要一次性公开夹具与清理证明」,缓解措施是「不要发布公开提交/反应流程」。

实测:公开 Marshmallow 的 `POST` 端点**存在且标记为 public**,共 8 条,含 `POST /public/marshmallow/{path}/submit`、`.../mark-read`、`.../reply-auth`。

**这不构成对该限制的证伪** —— 限制说的是「缺证明」,不是「功能不存在」。但它说明:**该限制描述的是文档发布策略,不是系统能力。** 读者若据此以为公开写入不可用,会读错。

**这是 `proof-status` 类声称的典型危害**(清册中 15 条):它们混在产品事实里,读起来像在描述系统能做什么,实际在描述**旧证明流程走到哪一步了**。

## 判定汇总

| 项 | 结果 |
|---|---|
| 批 B 整表缺陷 | **1 处结构性缺陷**(8 行中 7 行 scope 依赖,表无 scope 列) |
| `OKL-*` 真实 ID | 11 个 |
| 裁决 | 一律 `unverified`,保留原文,顶部标注证据基线已移除 |
| 抽验发现 | 1 条(`PUBLIC-WRITE-001` 描述的是发布策略而非系统能力,易被读错) |
| **未逐条判定的声称** | **163 条中的多数,尤其 71 条 `prose` 类** |

## 未测边界

- 批 B / C 的**逐条**判定未完成,见上「覆盖范围声明」。
- 11 个 `OKL-*` 的**当前实际状态**(限制是否仍成立)未逐条重新取证。
- `troubleshooting`、`getting-started`、`reference` 三章的声称未做机械判定。
