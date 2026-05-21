import { BaseService } from "./BaseService";
import { AutocompleteSuggestion } from "../interfaces";

export class FormatService extends BaseService {
	getFormattedAutocompleteSuggestion(
		autocompleteSuggestion: AutocompleteSuggestion,
		isSecondary: boolean = false,
	): string {
		const {
			street_line,
			secondary = "",
			locality,
			administrativeArea,
			postalCode,
		} = autocompleteSuggestion;
		const useEllipsis = isSecondary && secondary.length > 0;
		const streetText = useEllipsis ? "…" : street_line;
		const secondaryText = secondary.length ? ` ${secondary}` : "";
		const areaPostal = [administrativeArea, postalCode].filter(Boolean).join(" ");
		const localityAreaPostal = [locality, areaPostal].filter(Boolean).join(", ");
		const streetSegment = `${streetText}${secondaryText}`;

		return localityAreaPostal ? `${streetSegment}, ${localityAreaPostal}` : streetSegment;
	}

	createHighlightedTextElements(
		text: string,
		searchString: string,
	): Array<{ text: string; isMatch?: boolean }> {
		if (!searchString || !searchString.trim()) {
			return [{ text }];
		}

		const searchLower = searchString.toLowerCase().trim();
		const textLower = text.toLowerCase();
		const matchIndex = textLower.indexOf(searchLower);

		if (matchIndex === -1) {
			return [{ text }];
		}

		const result: Array<{ text: string; isMatch?: boolean }> = [];

		if (matchIndex > 0) {
			result.push({ text: text.slice(0, matchIndex) });
		}

		result.push({ text: text.slice(matchIndex, matchIndex + searchString.length), isMatch: true });

		if (matchIndex + searchString.length < text.length) {
			result.push({ text: text.slice(matchIndex + searchString.length) });
		}

		return result;
	}
}
