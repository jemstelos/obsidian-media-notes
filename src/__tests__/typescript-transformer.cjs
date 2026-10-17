// eslint-disable-next-line @typescript-eslint/no-var-requires
const { transformSync } = require("esbuild");

module.exports = {
	process(source, filename) {
		return transformSync(source, {
			loader: filename.endsWith(".tsx") ? "tsx" : "ts",
			format: "cjs",
			target: "es2018",
			sourcefile: filename,
			sourcemap: "inline",
		});
	},
};
