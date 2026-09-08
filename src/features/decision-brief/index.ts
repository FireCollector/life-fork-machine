import { z } from "zod";

const Text = z.string().trim().min(1).max(240);
export const DecisionBriefSchema = z.object({
  version: z.literal(1), id: z.string().min(1), originalQuestion: z.string().trim().min(4).max(800), normalizedQuestion: Text,
  options: z.array(Text).min(2).max(4), deadline: Text.optional(), people: z.array(Text).max(6),
  constraints: z.array(z.object({ category: z.enum(["cash", "time", "relationship", "location", "career", "other"]), text: Text }).strict()).max(12),
  irreversibleCosts: z.array(Text).max(6), unknowns: z.array(Text).min(1).max(6), assumptions: z.array(Text).min(1).max(6), clarificationQuestions: z.array(Text).max(3),
  safety: z.object({ status: z.enum(["ready", "needs-clarification", "stop"]), message: Text }).strict(), confirmed: z.boolean()
}).strict();
export type DecisionBrief = z.infer<typeof DecisionBriefSchema>;
const HIGH_RISK = /自杀|自伤|伤害自己|急诊|诊断|处方|诉讼|犯罪|报案|荐股|投资建议|借贷/;
function briefId(value: string) { let hash = 2166136261; for (const c of value) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619); return `brief-${(hash >>> 0).toString(36)}`; }
function options(question: string) { const found = question.match(/(.{2,36}?)(?:还是|或|vs\.?|VS\.?)(.{2,36}?)(?:[？?。！，,]|$)/i); return found ? [found[1].replace(/^(我要不要|我该不该|现在应该|是否)/, "").trim(), found[2].trim()] : ["暂时维持现状", "推进这项改变"]; }
export function createDecisionBrief(input: string): DecisionBrief {
  const question = input.trim().replace(/\s+/g, " "); if (question.length < 4) throw new Error("请先写下一个具体一点的问题");
  if (HIGH_RISK.test(question)) return DecisionBriefSchema.parse({ version: 1, id: briefId(question), originalQuestion: question, normalizedQuestion: question, options: ["先暂停普通推演", "寻求合适的专业或紧急支持"], people: [], constraints: [], irreversibleCosts: [], unknowns: ["是否存在需要立即处理的安全或专业风险"], assumptions: ["普通决策推演能处理这个问题"], clarificationQuestions: [], confirmed: false, safety: { status: "stop", message: "这个议题不适合进入普通人生推演。请优先联系当地紧急服务、专业人士或你信任的人获得现实支持。" } });
  const people = [...new Set(question.match(/领导|老板|父母|家人|伴侣|对象|孩子|同事|朋友|导师/g) ?? [])];
  const constraints = [/(钱|收入|工资|房贷|现金流|预算)/.test(question) ? { category: "cash" as const, text: "现金流和投入上限" } : null, /(时间|今年|个月|周|截止|尽快)/.test(question) ? { category: "time" as const, text: "可投入时间与决定期限" } : null, /(城市|回老家|搬家|异地)/.test(question) ? { category: "location" as const, text: "地点变化与生活成本" } : null].filter((item): item is { category: "cash" | "time" | "location"; text: string } => item !== null);
  const clarify = constraints.length || people.length ? [] : ["你最晚什么时候必须做决定？", "两条路各自最不能承受的代价是什么？"];
  return DecisionBriefSchema.parse({ version: 1, id: briefId(question), originalQuestion: question, normalizedQuestion: question, options: options(question), people, constraints, irreversibleCosts: ["做出不可逆承诺前需要确认的时间、资金或关系成本"], unknowns: ["哪条路更符合当前约束，仍需要什么现实信息来验证"], assumptions: ["眼前最有吸引力的选项会带来预期结果", "另一条路的机会成本可以承受"], clarificationQuestions: clarify, confirmed: false, safety: { status: clarify.length ? "needs-clarification" : "ready", message: clarify.length ? "先补两条关键事实，再继续找证据。" : "这是可编辑的决策简报，不是推荐结论。确认后才会进入后续证据环节。" } });
}
export function confirmDecisionBrief(brief: DecisionBrief) { return DecisionBriefSchema.parse({ ...brief, confirmed: brief.safety.status !== "stop" }); }
