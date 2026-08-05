import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { createMentionAutocompleteProvider } from "./autocomplete.ts";
import { OpenCodeEditor } from "./editor.ts";
import { OCFooter } from "./footer.ts";
import { isStaleContextError } from "./render-utils.ts";
import type { SessionState } from "./types.ts";

type CleanupAction = () => void;

const createSessionState = (ctx: ExtensionContext): SessionState => ({
	ctx,
	bashMode: { active: false },
});

const cleanupSessionUi = (session: SessionState): void => {
	const clearEditor = (): void => session.ctx.ui.setEditorComponent(undefined);
	const clearFooter = (): void => session.ctx.ui.setFooter(undefined);
	const cleanupActions: CleanupAction[] = [clearEditor, clearFooter];
	let cleanupError: unknown;
	let hasCleanupError = false;

	for (const cleanup of cleanupActions) {
		try {
			cleanup();
		} catch (error) {
			if (isStaleContextError(error) || hasCleanupError) continue;
			cleanupError = error;
			hasCleanupError = true;
		}
	}

	if (hasCleanupError) throw cleanupError;
};

const OCFooterExtension = (pi: ExtensionAPI): void => {
	let currentSession: SessionState | undefined;

	const requestRender = (): void => currentSession?.tui?.requestRender();

	const installSessionUi = (session: SessionState): void => {
		const { ctx } = session;

		ctx.ui.addAutocompleteProvider((current) => createMentionAutocompleteProvider(current));
		ctx.ui.setFooter((tui, theme, footerData) => {
			if (currentSession === session) session.tui = tui;
			return new OCFooter({
				ctx,
				tui,
				theme,
				footerData,
				bashMode: session.bashMode,
			});
		});
		ctx.ui.setEditorComponent(
			(tui, editorTheme, keybindings) =>
				new OpenCodeEditor(tui, editorTheme, keybindings, ctx, session.bashMode),
		);
	};

	pi.on("session_start", (_event, ctx) => {
		if (!ctx.hasUI || ctx.mode !== "tui") {
			currentSession = undefined;
			return;
		}

		const session = createSessionState(ctx);
		currentSession = session;
		installSessionUi(session);
	});

	pi.on("session_shutdown", () => {
		const session = currentSession;
		currentSession = undefined;
		if (session) cleanupSessionUi(session);
	});

	pi.on("model_select", requestRender);
	pi.on("thinking_level_select", requestRender);
	pi.on("session_info_changed", requestRender);
	pi.on("agent_end", requestRender);
	pi.on("session_compact", requestRender);
};

export default OCFooterExtension;
