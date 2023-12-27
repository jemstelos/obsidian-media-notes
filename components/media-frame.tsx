import { useAppContext } from "app-context";
import { formatTimestamp } from "main";
import * as React from "react";
import YouTube, { YouTubeEvent, YouTubeProps } from "react-youtube";

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
			// this needs to be not undefined to work
			start: initSeconds,
		},
	};
	// const intervalRef = React.useRef<number | undefined>(undefined);

	// const currentTime = ytRef.current?.getCurrentTime();
	const [maxTime, setMaxTime] = React.useState<number>(0);
	const [currentTimestamp, setCurrentTimestamp] = React.useState<number>(0);

	// Calculate the width of the progress bar as a percentage
	const progressBarWidth = (currentTimestamp / maxTime) * 100;

	// create a ref to store the setInterval function
	const intervalRef = React.useRef<number | null>(null);

	const [hideProgressBar, setHideProgressBar] = React.useState(true);

	const updateTimestamp = () => {
		ytRef.current
			?.getInternalPlayer()
			?.getCurrentTime()
			.then((time) => {
				setCurrentTimestamp(time);
			});
	};

	const onStateChange: YouTubeProps["onStateChange"] = (
		event: YouTubeEvent<number>
	) => {
		// keep the current timestamp state up to date
		const handleAsyncCode = async () => {
			const state = event.data;
			// if it was paused and now playing, set the current timestamp and making a polling setTimeout to check the player's current time and set the current timestamp every 1s
			if (state === 1) {
				updateTimestamp();
				const interval = window.setInterval(() => {
					updateTimestamp();
				}, 1000);
				intervalRef.current = interval;
				setHideProgressBar(false);
			}
			// if it was playing and is now paused, remove the polling interval and set
			if ((state === 2 || state === 0) && intervalRef.current) {
				window.clearInterval(intervalRef.current);
				setHideProgressBar(true);
			}
		};
		void handleAsyncCode();
	};

	React.useEffect(() => {
		return () => {
			if (intervalRef.current) {
				window.clearInterval(intervalRef.current);
			}
		};
	}, []);

	const context = useAppContext();

	return (
		<div className="media-top-container">
			<div className="media-container">
				<YouTube
					ref={ytRef}
					className="youtube-iframe"
					iframeClassName={`youtube-iframe`}
					videoId={videoId}
					opts={opts}
					onStateChange={onStateChange}
					onReady={(event) => {
						const duration = event.target.getDuration();
						setMaxTime(duration);
					}}
				/>
				<div
					className={`progress-bar-container ${
						hideProgressBar || !context?.settings.displayProgressBar
							? "hidden"
							: ""
					}`}
				>
					<div
						className={`timestamp ${
							!context?.settings?.displayTimestamp ? "hidden" : ""
						}`}
					>
						{formatTimestamp(currentTimestamp)}
					</div>
					<div
						className={`progress-bar`}
						style={{
							width: `${progressBarWidth}%`,
							backgroundColor:
								context?.settings?.progressBarColor,
						}}
					></div>
				</div>
			</div>
		</div>
	);
};
