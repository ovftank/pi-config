import type {
	ExtensionContext,
	ReadonlyFooterDataProvider,
	Theme,
} from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";

type BashModeRef = {
	active: boolean;
};

type SessionState = {
	ctx: ExtensionContext;
	bashMode: BashModeRef;
	tui?: TUI;
};

type OCFooterOptions = {
	ctx: ExtensionContext;
	tui: TUI;
	theme: Theme;
	footerData: ReadonlyFooterDataProvider;
	bashMode: BashModeRef;
};

export type { BashModeRef, OCFooterOptions, SessionState };
