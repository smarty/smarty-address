/**
 * Jest setup file for global test configuration
 */

/**
 * Mock HTMLCanvasElement.getContext for jsdom
 * jsdom doesn't implement canvas, so we provide a minimal mock
 * that allows ColorService to parse CSS colors correctly.
 * Only applies when running in jsdom environment.
 */
if (typeof HTMLCanvasElement !== "undefined") {
	HTMLCanvasElement.prototype.getContext = function (contextId: string) {
		if (contextId === "2d") {
			return {
				fillStyle: "",
				fillRect: jest.fn(),
				getImageData: jest.fn().mockReturnValue({
					data: [0, 0, 0, 255], // Default black color
				}),
			} as unknown as CanvasRenderingContext2D;
		}
		return null;
	};
}
