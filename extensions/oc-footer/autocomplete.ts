import type {
	AutocompleteItem,
	AutocompleteProvider,
	AutocompleteSuggestions,
} from "@earendil-works/pi-tui";
import {
	MENTION_DEFAULT_FILE_ICON,
	MENTION_FILE_ICONS_BY_EXTENSION,
	MENTION_FILE_ICONS_BY_NAME,
	MENTION_NON_TEXT_EXTENSIONS,
	MENTION_NON_TEXT_FILE_ICON,
} from "./file-icons.ts";

const mentionFileIcon = (item: AutocompleteItem): string | undefined => {
	const isDirectory = item.label.endsWith("/");
	const rawPath = item.value.replace(/^@"?/, "").replace(/"$/, "");
	let pathEnd = rawPath.length;
	while (pathEnd > 0 && (rawPath[pathEnd - 1] === "/" || rawPath[pathEnd - 1] === "\\")) pathEnd -= 1;

	const path = rawPath.slice(0, pathEnd);
	const fileName = (path.split(/[\\/]/).pop() ?? item.label).toLowerCase();
	if (isDirectory) return MENTION_FILE_ICONS_BY_NAME[fileName] ?? MENTION_FILE_ICONS_BY_NAME.folder;

	const namedIcon = MENTION_FILE_ICONS_BY_NAME[fileName];
	if (namedIcon) return namedIcon;
	if (/(?:^|[._-])(test|spec)(?:[._-]|$)/.test(fileName)) return "󰙨";

	const extension = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".") + 1) : fileName;
	const extensionIcon = MENTION_FILE_ICONS_BY_EXTENSION[extension];
	if (extensionIcon) return extensionIcon;
	if (MENTION_NON_TEXT_EXTENSIONS.has(extension)) return MENTION_NON_TEXT_FILE_ICON;
	return MENTION_DEFAULT_FILE_ICON;
};

const decorateMentionSuggestions = (suggestions: AutocompleteSuggestions): AutocompleteSuggestions => {
	return {
		...suggestions,
		items: suggestions.items.map((item) => {
			const icon = mentionFileIcon(item);
			return icon ? { ...item, label: `${icon} ${item.label}` } : item;
		}),
	};
};

const createMentionAutocompleteProvider = (current: AutocompleteProvider): AutocompleteProvider => {
	return {
		triggerCharacters: [...new Set([...(current.triggerCharacters ?? []), "@"])],
		getSuggestions: async (lines, cursorLine, cursorCol, options) => {
			const suggestions = await current.getSuggestions(lines, cursorLine, cursorCol, options);
			if (!suggestions?.prefix.startsWith("@")) return suggestions;
			return decorateMentionSuggestions(suggestions);
		},
		applyCompletion: (lines, cursorLine, cursorCol, item, prefix) => {
			return current.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
		},
		shouldTriggerFileCompletion: (lines, cursorLine, cursorCol) => {
			return current.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ?? true;
		},
	};
};

export { createMentionAutocompleteProvider };
