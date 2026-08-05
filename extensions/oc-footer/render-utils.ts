import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import {
	CONTEXT_ICONS,
	MAX_CONTEXT_PERCENT,
	MAX_STATUS_TEXT_LENGTH,
	STALE_CONTEXT_ERROR_TEXT,
} from "./constants.ts";

const sanitizeStatusText = (text: string): string => {
	const normalized = text
		.replace(/[\u0000-\u001f\u007f\u0085\u2028\u2029]/g, " ")
		.replace(/ +/g, " ")
		.trim();
	return normalized.length > MAX_STATUS_TEXT_LENGTH
		? `${normalized.slice(0, MAX_STATUS_TEXT_LENGTH - 1)}…`
		: normalized;
};

const isStaleContextError = (error: unknown): boolean => {
	return error instanceof Error && error.message.includes(STALE_CONTEXT_ERROR_TEXT);
};

const renderSafely = <T,>(render: () => T, staleFallback: () => T): T => {
	try {
		return render();
	} catch (error) {
		if (isStaleContextError(error)) return staleFallback();
		throw error;
	}
};

const MAX_HORIZONTAL_PADDING = 2;
const MIN_COLUMN_GAP = 2;
const TOKENS_PER_KILO = 1_000;
const TOKENS_PER_TEN_KILO = 10_000;
const TOKENS_PER_MILLION = 1_000_000;
const TOKENS_PER_TEN_MILLION = 10_000_000;

const formatTokens = (count: number): string => {
	const safeCount = Number.isFinite(count) ? Math.max(0, count) : 0;
	if (safeCount < TOKENS_PER_KILO) return safeCount.toString();
	if (safeCount < TOKENS_PER_TEN_KILO) return `${(safeCount / TOKENS_PER_KILO).toFixed(1)}k`;
	if (safeCount < TOKENS_PER_MILLION) return `${Math.round(safeCount / TOKENS_PER_KILO)}k`;
	if (safeCount < TOKENS_PER_TEN_MILLION) return `${(safeCount / TOKENS_PER_MILLION).toFixed(1)}M`;
	return `${Math.round(safeCount / TOKENS_PER_MILLION)}M`;
};

const contextIconForPercent = (percent: number | undefined): string => {
	if (percent === undefined) return CONTEXT_ICONS[0];
	const boundedPercent = Math.max(0, Math.min(MAX_CONTEXT_PERCENT, percent));
	const index = Math.min(
		CONTEXT_ICONS.length - 1,
		Math.floor((boundedPercent / MAX_CONTEXT_PERCENT) * CONTEXT_ICONS.length),
	);
	return CONTEXT_ICONS[index] ?? CONTEXT_ICONS[0];
};

const shortenHome = (path: string): string => {
	const home = process.env.HOME || process.env.USERPROFILE;
	if (!home) return path;

	const lowerPath = path.toLowerCase();
	const lowerHome = home.toLowerCase();
	if (lowerPath === lowerHome) return "~";
	if (lowerPath.startsWith(`${lowerHome}\\`) || lowerPath.startsWith(`${lowerHome}/`)) {
		return `~${path.slice(home.length)}`;
	}
	return path;
};

const fitRow = (left: string, right: string, width: number): string => {
	if (width <= 0) return "";

	const horizontalPadding = Math.min(MAX_HORIZONTAL_PADDING, Math.floor(width / 2));
	const contentWidth = Math.max(0, width - horizontalPadding * 2);
	const minimumGap = visibleWidth(left) > 0 && visibleWidth(right) > 0 ? MIN_COLUMN_GAP : 0;
	let leftText = left;
	let rightText = right;
	const available = () => visibleWidth(leftText) + minimumGap + visibleWidth(rightText);

	while (available() > contentWidth && visibleWidth(leftText) > 0) {
		leftText = truncateToWidth(leftText, Math.max(0, visibleWidth(leftText) - 1), "");
	}
	while (available() > contentWidth && visibleWidth(rightText) > 0) {
		rightText = truncateToWidth(rightText, Math.max(0, visibleWidth(rightText) - 1), "");
	}

	const gap = Math.max(0, contentWidth - visibleWidth(leftText) - visibleWidth(rightText));
	return `${" ".repeat(horizontalPadding)}${leftText}${" ".repeat(gap)}${rightText}${" ".repeat(horizontalPadding)}`;
};

export {
	contextIconForPercent,
	fitRow,
	formatTokens,
	isStaleContextError,
	renderSafely,
	sanitizeStatusText,
	shortenHome,
};
