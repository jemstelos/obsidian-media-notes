// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeObsidianFriendly } = require("../bookmarklet");

describe("Bookmarklet - makeObsidianFriendly", () => {
	test('should prepend "Video. " to the title and replace invalid characters with "."', () => {
		const title = "Example: A|Title/With\\Invalid^Characters#";
		const expected = "Video. Example. A.Title.With.Invalid.Characters.";
		expect(makeObsidianFriendly(title)).toBe(expected);
	});

	test("should handle titles without invalid characters", () => {
		const title = "Valid Title";
		const expected = "Video. Valid Title";
		expect(makeObsidianFriendly(title)).toBe(expected);
	});
});
