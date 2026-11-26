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
  analyse: "Analyse",
  analysing: "Starting",
  repositoryPlaceholder: "github.com/owner/repo",
  stale: "stale",
  progressChannel: "The progress channel did not open.",
  repository: "Repository",
  state: "State",
  commit: "Commit",
  started: "Started",
  finished: "Finished",
  loading: "Loading...",
  analysisCount(count: number) {
    return count === 1 ? "1 analysis" : `${count} analyses`;
  },
  stepLabel(step: string) {
    const labels: Record<string, string> = {
      fetch: "Fetch archive",
      select: "Select files",
      parse: "Parse imports",
      store: "Store map",
    };
    return labels[step] ?? step;
  },
  running: "running",
  live: "live",
  connecting: "connecting",
  stateLabel(state: string) {
    const labels: Record<string, string> = {
      parsing: "parsing",
      queued: "queued",
      complete: "complete",
      failed: "failed",
      stale: "stale",
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
  viewMap: "Map",
  rerun: "Re-run",
  rerunning: "Starting",
  rerunHint: "Re-run it to map it with the current one.",
  outdatedParser:
    "This analysis was stored by an older version of the parser, which didn't read file roles or routes.",
  unreadableMap: "The stored map could not be read, so it is not drawn.",
  routesMethod: "Method",
  routesPattern: "Pattern",
  routesFile: "File",
  route: "route",
  routesDeclared: "Declared in",
  routesNone: "No route could be read exactly from the code, so none is listed.",
  routesNoAdapter: "No framework adapter applied, so no routes are listed.",
  skippedCount(count: number) {
    return `${count} skipped`;
  },
  unresolvedCount(count: number) {
    return `${count} unresolved`;
  },
  coverageLine(percent: number) {
    return `Partial map: ${percent}% covered`;
  },
  coverageFiles(parsed: number, found: number) {
    return `${parsed} of ${found} source files parsed`;
  },
  coverageNotCode(count: number) {
    return `${count} non-code files not parsed`;
  },
  coverageImports(resolved: number, total: number) {
    return `${resolved} of ${total} internal imports resolved`;
  },
  coverageCollapse: "Collapse",
  coverageExpand: "Details",
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
  analyse: "分析",
  analysing: "开始",
  repositoryPlaceholder: "github.com/owner/repo",
  stale: "已停滞",
  progressChannel: "进度通道没有打开。",
  repository: "仓库",
  state: "状态",
  commit: "提交",
  started: "开始",
  finished: "结束",
  loading: "加载中...",
  analysisCount(count: number) {
    return `${count} 次分析`;
  },
  stepLabel(step: string) {
    const labels: Record<string, string> = {
      fetch: "获取归档",
      select: "选择文件",
      parse: "解析导入",
      store: "存储地图",
    };
    return labels[step] ?? step;
  },
  running: "进行中",
  live: "实时",
  connecting: "连接中",
  stateLabel(state: string) {
    const labels: Record<string, string> = {
      parsing: "解析中",
      queued: "排队",
      complete: "完成",
      failed: "失败",
      stale: "已停滞",
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
  viewMap: "地图",
  rerun: "重新运行",
  rerunning: "正在启动",
  rerunHint: "重新运行即可用当前版本生成地图。",
  outdatedParser: "这个分析由旧版解析器保存，它不读取文件角色和路由。",
  unreadableMap: "已保存的地图无法读取，所以没有绘制。",
  routesMethod: "方法",
  routesPattern: "路径",
  routesFile: "文件",
  route: "路由",
  routesDeclared: "声明于",
  routesNone: "没有路由能从代码中准确读出，所以不列出。",
  routesNoAdapter: "没有应用框架适配器，所以不列出路由。",
  skippedCount(count: number) {
    return `${count} 个跳过`;
  },
  unresolvedCount(count: number) {
    return `${count} 个未解析`;
  },
  coverageLine(percent: number) {
    return `地图不完整：覆盖 ${percent}%`;
  },
  coverageFiles(parsed: number, found: number) {
    return `已解析 ${parsed} / ${found} 个源码文件`;
  },
  coverageNotCode(count: number) {
    return `${count} 个非代码文件未解析`;
  },
  coverageImports(resolved: number, total: number) {
    return `已解析 ${resolved} / ${total} 个内部导入`;
  },
  coverageCollapse: "收起",
  coverageExpand: "详情",
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
