import type { Locale } from "@/lib/locale";

const en = {
  language: "Language",
  theme: "Theme",
  themeSystem: "System",
  themeLight: "Light",
  themeDark: "Dark",
  organization: "Organization",
  organizationId: "Organization id",
  emptyAnalyses: "This team has not run an analysis.",
  repository: "Repository",
  state: "State",
  commit: "Commit",
  started: "Started",
  finished: "Finished",
  loading: "Loading...",
  analysisCount(count: number) {
    return count === 1 ? "1 analysis" : `${count} analyses`;
  },
  stateLabel(state: string) {
    const labels: Record<string, string> = {
      parsing: "parsing",
      queued: "queued",
      complete: "complete",
      failed: "failed",
    };
    return labels[state] ?? state;
  },
  minutesAgo(count: number) {
    return `${count}m ago`;
  },
  hoursAgo(count: number) {
    return `${count}h ago`;
  },
  daysAgo(count: number) {
    return `${count}d ago`;
  },
  filesLabel(count: number) {
    return count === 1 ? "1 file" : `${count} files`;
  },
  categoriesSummary(count: number) {
    return `Categories • ${count === 1 ? "1 file" : `${count} files`}`;
  },
  moreCount(count: number) {
    return `${count} more`;
  },
  structure: "Structure",
  explanation: "Explanation",
  explanationEmpty: "Nothing has been explained yet.",
  frameworkDetected(name: string) {
    return name === "none" ? "Framework none detected" : `Framework ${name}`;
  },
  files: "Files",
  imports: "Imports",
  routes: "Routes",
  skippedCount(count: number) {
    return `${count} skipped`;
  },
  unresolvedCount(count: number) {
    return `${count} unresolved`;
  },
  noAdapter: "no adapter",
  mostDepended: "Most depended on",
  byImporting: "by files importing it",
  importedByNothing: "Imported by nothing",
  whereReadingStarts: "where reading starts",
  moreNotListed(count: number) {
    return `${count} more not listed`;
  },
  unidentifiedTitle: "Unidentified by convention",
  unidentifiedNone:
    "No framework adapter applied, so no file was matched to a role.",
  file: "file",
  folderLabel: "Folder",
  kind: "Kind",
  length: "Length",
  linesCount(count: number) {
    return count === 1 ? "1 line" : `${count} lines`;
  },
  filesCount(count: number) {
    return count === 1 ? "1 file" : `${count} files`;
  },
  dependsOn: "Depends on",
  dependedOn: "Depended on by",
  importedBy: "Imported by",
  typeOnly: "type",
  inside: "Inside",
  blastRadius: "Blast radius",
  blastRadiusAbout: "what imports this, directly or through others",
  dependencyChain: "Dependency chain",
  dependencyChainAbout: "what this imports, directly or through others",
  stepAway(step: number, count: number) {
    return step === 1 ? `1 step away · ${count}` : `${step} steps away · ${count}`;
  },
  furtherNotListed(count: number) {
    return `${count} more further than 2 steps, not listed.`;
  },
  insights: "Insights",
  insightUnimportedTitle: "Nothing imports it",
  insightUnimported:
    "Nothing in this repository imports this file. Pages, routes, layouts, middleware and config are left out.",
  insightUnusualTitle: "Imported more than usual",
  insightUnusual: "More files import this than is usual in this repository.",
  insightCycleTitle: "Cycles",
  insightCycle: "These files import each other in a cycle.",
  insightLongTitle: "Length",
  insightLong: "This file is longer than the files around it.",
  matchedOf(matched: number, total: number) {
    return `${matched}/${total}`;
  },
  matchedTitle(matched: number, total: number) {
    return `${matched} of ${total}`;
  },
};

const zh = {
  language: "语言",
  theme: "主题",
  themeSystem: "系统",
  themeLight: "浅色",
  themeDark: "深色",
  organization: "组织",
  organizationId: "组织 ID",
  emptyAnalyses: "这个团队还没有跑过分析。",
  repository: "仓库",
  state: "状态",
  commit: "提交",
  started: "开始",
  finished: "结束",
  loading: "加载中...",
  analysisCount(count: number) {
    return `${count} 次分析`;
  },
  stateLabel(state: string) {
    const labels: Record<string, string> = {
      parsing: "解析中",
      queued: "排队",
      complete: "完成",
      failed: "失败",
    };
    return labels[state] ?? state;
  },
  minutesAgo(count: number) {
    return `${count}分钟前`;
  },
  hoursAgo(count: number) {
    return `${count}小时前`;
  },
  daysAgo(count: number) {
    return `${count}天前`;
  },
  filesLabel(count: number) {
    return `${count} 个文件`;
  },
  categoriesSummary(count: number) {
    return `分类 • ${count} 个文件`;
  },
  moreCount(count: number) {
    return `还有 ${count}`;
  },
  structure: "结构",
  explanation: "说明",
  explanationEmpty: "还没有说明。",
  frameworkDetected(name: string) {
    return name === "none" ? "框架 未检测到" : `框架 ${name}`;
  },
  files: "文件",
  imports: "导入",
  routes: "路由",
  skippedCount(count: number) {
    return `${count} 个跳过`;
  },
  unresolvedCount(count: number) {
    return `${count} 个未解析`;
  },
  noAdapter: "无适配器",
  mostDepended: "被依赖最多",
  byImporting: "按导入它的文件",
  importedByNothing: "没有文件导入",
  whereReadingStarts: "从这里开始读",
  moreNotListed(count: number) {
    return `还有 ${count} 个未列出`;
  },
  unidentifiedTitle: "约定未能识别",
  unidentifiedNone: "没有应用框架适配器，所以没有文件被对应到角色。",
  file: "文件",
  folderLabel: "目录",
  kind: "类型",
  length: "长度",
  linesCount(count: number) {
    return `${count} 行`;
  },
  filesCount(count: number) {
    return `${count} 个文件`;
  },
  dependsOn: "依赖",
  dependedOn: "被依赖",
  importedBy: "导入者",
  typeOnly: "类型",
  inside: "里面",
  blastRadius: "爆炸半径",
  blastRadiusAbout: "直接或间接导入它的文件",
  dependencyChain: "依赖链",
  dependencyChainAbout: "它直接或间接导入的文件",
  stepAway(step: number, count: number) {
    return `${step} 步 · ${count}`;
  },
  furtherNotListed(count: number) {
    return `还有 ${count} 个超过两步，不列出。`;
  },
  insights: "观察",
  insightUnimportedTitle: "没有文件导入",
  insightUnimported:
    "这个仓库里没有文件导入它。页面、路由、布局、中间件和配置不列在这里。",
  insightUnusualTitle: "被导入得比平常多",
  insightUnusual: "导入它的文件比这个仓库里的平常情况多。",
  insightCycleTitle: "环",
  insightCycle: "这些文件互相导入，形成一个环。",
  insightLongTitle: "长度",
  insightLong: "这个文件比它周围的文件长。",
  matchedOf(matched: number, total: number) {
    return `${matched}/${total}`;
  },
  matchedTitle(matched: number, total: number) {
    return `${total} 个里的 ${matched} 个`;
  },
} satisfies typeof en;

const catalogs = { en, zh } as const;

export type Messages = typeof en;

export function messagesFor(locale: Locale): Messages {
  return catalogs[locale];
}
