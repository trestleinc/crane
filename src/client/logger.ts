import { getLogger as getLogTapeLogger, type Logger } from "@logtape/logtape";

export function getLogger(category: string[]): Logger {
	return getLogTapeLogger(["crane", ...category]);
}
