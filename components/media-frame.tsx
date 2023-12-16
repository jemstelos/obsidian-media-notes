import * as React from "react";
import YouTube, { YouTubeProps } from "react-youtube";

const getVideoId = (url: string) => {
	const urlParams = new URLSearchParams(new URL(url).search);
	return urlParams.get("v");
};

export const MediaFrame: React.FC<{
	mediaLink: string;
	ytRef: React.RefObject<YouTube>;
	initSeconds: number;
}> = ({ mediaLink, ytRef, initSeconds }) => {
	const videoId = getVideoId(mediaLink);
	if (!videoId) return null;

	const opts: YouTubeProps["opts"] = {
		playerVars: {
			start: initSeconds ?? undefined,
		},
	};
	// const intervalRef = React.useRef<number | undefined>(undefined);

	return (
		<div className="media-container">
			<YouTube
				ref={ytRef}
				className="youtube-iframe"
				iframeClassName={`youtube-iframe`}
				videoId={videoId}
				opts={opts}
				onReady={(event) => {
					console.log("ready youtube");
				}}
			/>
		</div>
	);
};
