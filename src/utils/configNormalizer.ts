import { SmartyAddressConfig, NormalizedSmartyAddressConfig } from "../interfaces";
import { SELECTOR_ALIASES, API_FILTER_ALIASES } from "../constants/configAliases";

export function normalizeConfig(config: SmartyAddressConfig): NormalizedSmartyAddressConfig {
	const normalized: Record<string, unknown> = {};

	// Fold a source's keys into the canonical root surface. Existing root keys
	// win over the nested `autocomplete` block (root-key aliases, ERD §2 / Q5);
	// `enabled` is a block-local flag, never a root key.
	const fold = (source: Record<string, unknown>) => {
		for (const [key, value] of Object.entries(source)) {
			if (value === undefined) continue;
			if (key === "enabled") continue;
			const canonicalKey = SELECTOR_ALIASES[key] ?? API_FILTER_ALIASES[key] ?? key;
			normalized[canonicalKey] ??= value;
		}
	};

	fold(config as unknown as Record<string, unknown>);
	if (config.autocomplete) fold(config.autocomplete as unknown as Record<string, unknown>);

	if (config.autocomplete !== undefined) normalized.autocomplete = config.autocomplete;
	if (config.verification !== undefined) normalized.verification = config.verification;

	return normalized as unknown as NormalizedSmartyAddressConfig;
}
