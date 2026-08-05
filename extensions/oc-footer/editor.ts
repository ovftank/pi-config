import {
	CustomEditor,
	type ExtensionContext,
	type KeybindingsManager,
	type Theme,
} from "@earendil-works/pi-coding-agent";
import {
	stripTerminalSequences,
	type EditorTheme,
	type TUI,
	truncateToWidth,
	visibleWidth,
} from "@earendil-works/pi-tui";
import { PI_ICON, SHELL_ICON, THINKING_ICON } from "./constants.ts";
import { renderSafely, sanitizeStatusText } from "./render-utils.ts";
import type { BashModeRef } from "./types.ts";

const ANSI_ESCAPE_CODE = String.fromCodePoint(27);
const ANSI_BACKGROUND_RESET = `${ANSI_ESCAPE_CODE}[49m`;
const ANSI_BACKGROUND_RESET_RE = new RegExp(String.raw`${ANSI_ESCAPE_CODE}\[(?:0|49)m`, "g");
const PANEL_BORDER_WIDTH = 1;
const AUTOCOMPLETE_SCROLL_INFO = /^\(\d+\/\d+\)$/;

type PanelLineOptions = {
	line: string;
	panelWidth: number;
	panelBackground: string;
	border: string;
};

const isBashCommand = (text: string): boolean => text.trimStart().startsWith("!");

const isHorizontalBorder = (line: string): boolean => {
	const plain = stripTerminalSequences(line);
	return plain.length > 0 && /^─+$/.test(plain);
};

const buildModelMetadata = (ctx: ExtensionContext, theme: Theme): string => {
	const modelInfo = ctx.model;
	const provider = sanitizeStatusText(modelInfo?.provider ?? "");
	const modelId = sanitizeStatusText(modelInfo?.id ?? "no model") || "no model";
	const model = provider ? `${provider}/${modelId}` : modelId;
	const thinking = modelInfo?.reasoning
		? sanitizeStatusText(ctx.thinkingLevel ?? "off") || "off"
		: undefined;
	const parts = [
		theme.fg("accent", `${PI_ICON}  Pi`),
		theme.fg("dim", "·"),
		theme.fg("text", model),
		thinking ? `${theme.fg("accent", THINKING_ICON)}  ${theme.fg("accent", thinking)}` : "",
	].filter((part) => part.length > 0);
	return parts.join(" ");
};

class OpenCodeEditor extends CustomEditor {
	private readonly ctx: ExtensionContext;
	private readonly bashMode: BashModeRef;

	constructor(
		tui: TUI,
		editorTheme: EditorTheme,
		keybindings: KeybindingsManager,
		ctx: ExtensionContext,
		bashMode: BashModeRef,
	) {
		const commandTheme: EditorTheme = {
			...editorTheme,
			selectList: {
				...editorTheme.selectList,
				selectedText: (text: string) =>
					ctx.ui.theme.bg("selectedBg", ctx.ui.theme.bold(editorTheme.selectList.selectedText(text))),
			},
		};
		super(tui, commandTheme, keybindings);
		this.ctx = ctx;
		this.bashMode = bashMode;
	}

	override readonly handleInput = (data: string): void => {
		super.handleInput(data);
		const active = isBashCommand(this.getText());
		if (active === this.bashMode.active) return;
		this.bashMode.active = active;
		this.tui.requestRender();
	};

	override readonly render = (width: number): string[] => {
		return renderSafely(
			() => this.renderContent(width),
			() => (width <= 0 ? [""] : super.render(width)),
		);
	};

	private readonly renderContent = (width: number): string[] => {
		const theme = this.ctx.ui.theme;
		this.bashMode.active = isBashCommand(this.getText());
		if (width <= 0) return [""];
		if (width === PANEL_BORDER_WIDTH) return [this.renderBorder(theme)];

		const panelWidth = width - PANEL_BORDER_WIDTH;
		const lines = this.renderEditorLines(panelWidth);
		const panelBackground = theme.getBgAnsi("userMessageBg");
		const border = this.renderBorder(theme);

		return lines.map((line) =>
			this.renderPanelLine({
				line,
				panelWidth,
				panelBackground,
				border,
			}),
		);
	};

	private readonly renderEditorLines = (panelWidth: number): string[] => {
		const lines = super.render(panelWidth);
		if (this.isShowingAutocomplete()) return this.addAutocompleteSpacing(lines);
		if (lines.length < 2) return lines;

		const bottomBorder = lines.pop();
		if (bottomBorder === undefined) return lines;

		lines.push(" ".repeat(panelWidth), this.renderMetadata(panelWidth), bottomBorder);
		return lines;
	};

	private readonly addAutocompleteSpacing = (lines: string[]): string[] => {
		const spaced: string[] = [];
		let addedScrollGap = false;

		for (const line of lines) {
			const plain = stripTerminalSequences(line).trim();
			if (!addedScrollGap && AUTOCOMPLETE_SCROLL_INFO.test(plain)) {
				spaced.push("");
				addedScrollGap = true;
			}
			spaced.push(line);
		}

		spaced.push("");
		return spaced;
	};

	private readonly renderPanelLine = ({
		line,
		panelWidth,
		panelBackground,
		border,
	}: PanelLineOptions): string => {
		const content = isHorizontalBorder(line) ? "" : truncateToWidth(line, panelWidth, "");
		const padding = " ".repeat(Math.max(0, panelWidth - visibleWidth(content)));
		const paddedContent = `${content}${padding}`;
		const panelText = paddedContent.replace(
			ANSI_BACKGROUND_RESET_RE,
			(reset) => `${reset}${panelBackground}`,
		);
		return `${border}${panelBackground}${panelText}${ANSI_BACKGROUND_RESET}`;
	};

	private readonly renderBorder = (theme: Theme): string => {
		return this.bashMode.active ? theme.fg("bashMode", "┃") : theme.fg("borderAccent", "┃");
	};

	private readonly renderMetadata = (width: number): string => {
		const theme = this.ctx.ui.theme;
		const text = this.bashMode.active
			? `${theme.fg("accent", SHELL_ICON)}${theme.fg("bashMode", " Shell")}`
			: buildModelMetadata(this.ctx, theme);
		const paddingX = Math.min(this.getPaddingX(), Math.floor(width / 2));
		const contentWidth = Math.max(0, width - paddingX * 2);
		const content = truncateToWidth(text, contentWidth, "");
		return `${" ".repeat(paddingX)}${content}${" ".repeat(
			Math.max(0, contentWidth - visibleWidth(content)),
		)}${" ".repeat(paddingX)}`;
	};
}

export { OpenCodeEditor };
