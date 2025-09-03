import { SmartyAddressConfig, NormalizedSmartyAddressConfig } from "../interfaces";
import { SELECTOR_ALIASES, API_FILTER_ALIASES } from "../constants/configAliases";

export function normalizeConfig(config: SmartyAddressConfig): NormalizedSmartyAddressConfig {
	const normalized: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(config)) {
		if (value === undefined) continue;

		const canonicalKey = SELECTOR_ALIASES[key] ?? API_FILTER_ALIASES[key] ?? key;
		normalized[canonicalKey] ??= value;
	}

	return normalized as unknown as NormalizedSmartyAddressConfig;
}
