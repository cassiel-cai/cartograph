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
} satisfies typeof en;

const catalogs = { en, zh } as const;

export type Messages = typeof en;

export function messagesFor(locale: Locale): Messages {
  return catalogs[locale];
}
