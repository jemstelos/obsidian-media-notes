/* global window, document */

function createMediaNote() {
	var url = window.location.href;
	if (url.includes("youtube.com")) {
		var videoId = new URLSearchParams(window.location.search).get("v");
		if (videoId) {
			var videoElement = document.querySelector("video");
			var status = videoElement.paused ? "paused" : "playing";
			if (status === "playing") {
				videoElement.pause();
			}
			var timestamp = videoElement.currentTime;

			var urlObj = new URL(url);
			if (timestamp) {
				// add t parameter to the url, and replace if exists
				urlObj.searchParams.set("t", Math.floor(timestamp));
			}

			var title = makeObsidianFriendly(document.title);
			title = title.replace(" - YouTube", "");
			var encodedTitle = encodeURIComponent(title) + ".md";
			var content = encodeURIComponent(
				"---\nmedia_link: " + urlObj + "\n---\n#Video"
			);
			window.open(
				"obsidian://new?name=" + encodedTitle + "&content=" + content
			);
		}
	}
}

const makeObsidianFriendly = (title) => {
	var replacedTitle = "Video. " + title.replace(/[:/\\^|#\?\*"<>]/g, ".");
	return replacedTitle;
};

// --- exports ---
// don't change the above line, needed to strip exports from this file

module.exports = { makeObsidianFriendly, createMediaNote };
