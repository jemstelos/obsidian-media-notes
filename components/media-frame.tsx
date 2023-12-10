import * as React from "react";
import YouTube from "react-youtube";

export const MediaFrame: React.FC<{
	mediaLink: string;
	ytRef: React.Ref<YouTube>;
}> = ({ mediaLink, ytRef }) => {
	const getVideoId = (url: string) => {
		const urlParams = new URLSearchParams(new URL(url).search);
		return urlParams.get("v");
	};

	const videoId = getVideoId(mediaLink);
	console.log("videoId", videoId);

	return (
		<div className="youtube-container">
			<YouTube
				ref={ytRef}
				className="youtube-iframe w-full"
				iframeClassName={`w-full rounded-xl youtube-iframe`}
				videoId={videoId}
				// onStateChange={onStateChange}
				onReady={(event) => {
					console.log("ready youtube");
					// console.log(ytRef.current);
				}}
			/>
		</div>
	);
};
