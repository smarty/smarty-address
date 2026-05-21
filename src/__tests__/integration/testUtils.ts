export const flushAsync = async () => {
	for (let i = 0; i < 5; i++) {
		await jest.runAllTimersAsync();
		await Promise.resolve();
	}
};
