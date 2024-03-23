#!/usr/bin/env bun

// Generate with npm run bookmarklet

import { readFileSync } from "fs";

const generateBookmarklet = () => {
	try {
		const code = readFileSync("./src/bookmarklet.js", "utf8");
		const strippedCode = code.split("// --- exports ---")[0];
		const encodedCode = encodeURIComponent(strippedCode);
		const bookmarklet = `javascript:(function(){${encodedCode}\ncreateMediaNote()}())`;
		console.log(bookmarklet);
	} catch (error) {
		console.error("Error generating bookmarklet:", error);
	}
};

generateBookmarklet();
