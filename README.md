# 赛鸽血统环号登记站

运行：

```bash
npm start
```

访问`http://localhost:3024`。支持档案、血统查询、转让、归巢成绩记录和遗传病检测审核。

测试：

```bash
npm test
```

## 遗传病检测审核

- 每羽鸽按检测项目记录**结论**（阴性 / 携带 / 患病）、**样本编号**和**报告日**；同一项目只认最新有效报告（按报告日，再按报告编号）。
- **两只同项目携带者不得配组；患病鸽与任何鸽都不得配组。**新配对先过审核，不通过直接拒绝。
- 新报告或结论改错后，全部配对立即重算：违规配对自动**冻结**（原关系与冻结原因保留），结论恢复清白的自动解冻；后代风险提示同步重算。
- 结论改错会作废旧报告并生成新报告，旧报告仍在检测历史中可查。
- 页面（点卡片上"血统 / 检测 / 配组"）可看到每羽鸽的**适用种鸽**、**阻断原因**和**检测历史**。

代码分层：

- `src/rules.js` —— 判定：有效报告取舍、配组阻断、后代风险、配对重算（纯函数）
- `src/store.js` —— 档案：JSON 读写、报告/配对落库、冻结留痕
- `src/page.js` —— 页面：展示与交互
- `server.js` —— HTTP 路由装配

## 接口

- `GET /api/pigeons` 鸽只列表（含各项目当前有效结论）
- `GET /api/pigeons/:ring/screening` 当前有效结论 + 全部检测历史 + 本鸽发病风险
- `POST /api/pigeons/:ring/reports` 录入报告 `{ item, conclusion, sampleNo, reportDate }`
- `POST /api/reports/:id/correct` 结论改错 `{ conclusion, sampleNo, reportDate, reason }`
- `GET /api/pigeons/:ring/breeding` 适用种鸽与阻断原因
- `GET /api/pairings` / `POST /api/pairings` 配对列表（含后代风险提示）/ 建立配对 `{ maleRing, femaleRing }`

初始档案里录了一桩历史教训作演示：CHN-2022-188 与 CHN-2023-512 同为「遗传性神经震颤」携带者，曾配组（现已冻结留痕），幼鸽 CHN-2026-001 发病。不需要可清空 `data/pigeons.json` 中的 `testReports` 与 `pairings`。
