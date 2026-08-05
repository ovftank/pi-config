import type {
	ExtensionContext,
	ReadonlyFooterDataProvider,
	Theme,
} from "@earendil-works/pi-coding-agent";
import type { Component } from "@earendil-works/pi-tui";
import {
	BRANCH_ICON,
	CONTEXT_ERROR_THRESHOLD,
	CONTEXT_WARNING_THRESHOLD,
	PATH_ICON,
	SHELL_ICON,
} from "./constants.ts";
import {
	contextIconForPercent,
	fitRow,
	formatTokens,
	renderSafely,
	sanitizeStatusText,
	shortenHome,
} from "./render-utils.ts";
import type { BashModeRef, OCFooterOptions } from "./types.ts";

type ContextColor = "muted" | "error" | "warning" | "accent";
type FooterRenderOptions = Omit<OCFooterOptions, "tui"> & { width: number };
type LocationOptions = Pick<OCFooterOptions, "ctx" | "theme" | "footerData">;
type ContextLabelOptions = Pick<OCFooterOptions, "ctx" | "theme">;

const toFiniteNonNegative = (value: number | null | undefined): number | undefined => {
	if (value === null || value === undefined || !Number.isFinite(value)) return undefined;
	return Math.max(0, value);
};

const getContextColor = (percent: number | undefined): ContextColor => {
	if (percent === undefined) return "muted";
	if (percent > CONTEXT_ERROR_THRESHOLD) return "error";
	if (percent > CONTEXT_WARNING_THRESHOLD) return "warning";
	return "accent";
};

const buildLocation = ({ ctx, theme, footerData }: LocationOptions): string => {
	const projectPath = sanitizeStatusText(shortenHome(ctx.cwd));
	const branch = sanitizeStatusText(footerData.getGitBranch() ?? "");
	const sessionName = sanitizeStatusText(ctx.sessionManager.getSessionName() ?? "");
	const labels: string[] = [];

	if (projectPath) labels.push(`${theme.fg("accent", PATH_ICON)} ${theme.fg("dim", projectPath)}`);
	if (branch) labels.push(`${theme.fg("accent", BRANCH_ICON)} ${theme.fg("dim", branch)}`);
	if (sessionName) labels.push(theme.fg("dim", `• ${sessionName}`));

	return labels.join(" ");
};

const buildContextLabel = ({ ctx, theme }: ContextLabelOptions): string => {
	const contextUsage = ctx.getContextUsage();
	const modelInfo = ctx.model;
	const contextWindow =
		toFiniteNonNegative(contextUsage?.contextWindow ?? modelInfo?.contextWindow) ?? 0;
	const contextTokens = toFiniteNonNegative(contextUsage?.tokens);
	const contextPercent = toFiniteNonNegative(contextUsage?.percent);
	const contextWindowLabel = contextWindow > 0 ? formatTokens(contextWindow) : "unknown";
	const baseText =
		contextTokens === undefined
			? "Context unknown"
			: `Context ${formatTokens(contextTokens)} / ${contextWindowLabel}`;
	const percentText = contextPercent === undefined ? "" : ` (${contextPercent.toFixed(0)}% used)`;
	const contextText = baseText + percentText;
	const contextColor = getContextColor(contextPercent);
	const contextIcon = theme.fg("accent", contextIconForPercent(contextPercent));

	return `${contextIcon} ${theme.fg(contextColor, contextText)}`;
};

const buildModeLabel = (theme: Theme, bashMode: BashModeRef): string => {
	if (!bashMode.active) return "";
	return `${theme.fg("accent", SHELL_ICON)}${theme.fg("bashMode", " Shell")}`;
};

const renderFooter = ({
	ctx,
	theme,
	footerData,
	bashMode,
	width,
}: FooterRenderOptions): string[] => {
	const footerLeft = [
		buildModeLabel(theme, bashMode),
		buildLocation({ ctx, theme, footerData }),
	]
		.filter((text) => text.length > 0)
		.join(" ");
	const footerRight = buildContextLabel({ ctx, theme });

	return ["", fitRow(footerLeft, footerRight, width)];
};

class OCFooter implements Component {
	private readonly ctx: ExtensionContext;
	private readonly theme: Theme;
	private readonly footerData: ReadonlyFooterDataProvider;
	private readonly bashMode: BashModeRef;
	private readonly unsubscribeBranchChange: () => void;

	constructor({ ctx, tui, theme, footerData, bashMode }: OCFooterOptions) {
		this.ctx = ctx;
		this.theme = theme;
		this.footerData = footerData;
		this.bashMode = bashMode;
		this.unsubscribeBranchChange = footerData.onBranchChange(() => tui.requestRender());
	}

	readonly render = (width: number): string[] => {
		return renderSafely(
			() => renderFooter({
				ctx: this.ctx,
				theme: this.theme,
				footerData: this.footerData,
				bashMode: this.bashMode,
				width,
			}),
			() => [],
		);
	};

	readonly invalidate = (): void => {};

	readonly dispose = (): void => {
		this.unsubscribeBranchChange();
	};
}

export { OCFooter };
