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
} satisfies typeof en;

const catalogs = { en, zh } as const;

export type Messages = typeof en;

export function messagesFor(locale: Locale): Messages {
  return catalogs[locale];
}
