import { USER_AGENT } from "../ApiService";
import type { VerificationError } from "../../interfaces";

// Shared auth/transport for the Street APIs (ERD §1.1). A free function both
// VerificationService branches call rather than a base class — neither
// ApiService nor VerificationService is the other's parent. The embedded key is
// passed in per call from each service's init()-stored key.

export type StreetErrorKind = VerificationError["kind"];

export class StreetApiError extends Error {
	readonly kind: StreetErrorKind;
	readonly status: number | undefined;
	readonly cause: unknown;

	constructor(kind: StreetErrorKind, message: string, status?: number, cause?: unknown) {
		super(message);
		this.name = "StreetApiError";
		this.kind = kind;
		this.status = status;
		this.cause = cause;
	}
}

const errorKindForStatus = (status: number): StreetErrorKind => {
	if (status === 401 || status === 402) return "auth";
	if (status === 429) return "quota";
	return "unknown";
};

export async function fetchStreetJson<T>(
	baseUrl: string,
	params: Record<string, string>,
	fetchFn: typeof fetch = fetch,
): Promise<T> {
	const query = new URLSearchParams({ "user-agent": USER_AGENT, ...params });

	let response: Response;
	try {
		response = await fetchFn(`${baseUrl}?${query}`);
	} catch (cause) {
		throw new StreetApiError(
			"network",
			"Network request to the Smarty Street API failed",
			undefined,
			cause,
		);
	}

	if (!response.ok) {
		throw new StreetApiError(
			errorKindForStatus(response.status),
			`Smarty Street API responded with status ${response.status}`,
			response.status,
		);
	}

	try {
		return (await response.json()) as T;
	} catch (cause) {
		throw new StreetApiError(
			"parse",
			"Could not parse the Smarty Street API response",
			response.status,
			cause,
		);
	}
}
