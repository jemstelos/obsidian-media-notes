// test this by pasting into browser console
(function createMediaNote() {
	var url = window.location.href;
	if (url.includes("youtube.com")) {
		var videoId = new URLSearchParams(window.location.search).get("v");
		if (videoId) {
			var videoElement = document.querySelector("video");
			var status = videoElement.paused ? "paused" : "playing";
			if (status === "playing") {
				videoElement.pause();
			}
			// TODO: add support for passing the currentTime into the link, and starting from there
			var timestamp = videoElement.currentTime;

			var urlObj = new URL(url);
			if (timestamp) {
				// add t parameter to the url, and replace if exists
				urlObj.searchParams.set("t", Math.floor(timestamp));
			}

			var title = "Video. " + document.title.replace(/[:\/\\]/g, ".");
			var encodedTitle = encodeURIComponent(title);
			var content = encodeURIComponent(
				"---\nmedia_link: " + urlObj + "\n---\n#Video"
			);
			window.open(
				"obsidian://new?name=" + encodedTitle + "&content=" + content
			);
		}
	}
})();
