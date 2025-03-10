import { useAppContext } from "../app-context";
import { formatTimestamp } from "../main";
import * as React from "react";
import YouTube, { YouTubeEvent, YouTubeProps } from "react-youtube";
import { CSSTransition } from "react-transition-group";

export const getVideoId = (url: string) => {
	const urlParams = new URLSearchParams(new URL(url).search);
	return urlParams.get("v");
};

export const MediaFrame: React.FC<{
	mediaLink: string;
	ytRef: React.RefObject<YouTube>;
	initSeconds: number;
	autoplay?: boolean;
	disableWidthLimit?: boolean;
}> = ({ mediaLink, ytRef, initSeconds, autoplay, disableWidthLimit }) => {
	const videoId = getVideoId(mediaLink);
	if (!videoId) return null;
	const opts: YouTubeProps["opts"] = {
		playerVars: {
			// this needs to be not undefined to work
			start: initSeconds,
			autoplay: autoplay ? 1 : 0,
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

	React.useEffect(() => {
		if (context?.showTimestamp) {
			updateTimestamp();
		}
	}, [context?.showTimestamp]);

	const seekBackRef = React.useRef(null);
	const seekForwardRef = React.useRef(null);
	const playRef = React.useRef(null);
	const pauseRef = React.useRef(null);
	const speedRef = React.useRef(null);

	return (
		<div className="media-top-container">
			<div className={`media-container${disableWidthLimit ? " no-width-limit": ""}`}>
				{/* @ts-ignore TS2607 */}
				<YouTube
					ref={ytRef}
					className="youtube-iframe"
					iframeClassName={`youtube-iframe`}
					videoId={videoId}
					opts={opts}
					onStateChange={onStateChange}
					onReady={async (event: YouTubeEvent) => {
						const duration = await event.target.getDuration();
						setMaxTime(duration);
					}}
				/>
				<CSSTransition
					nodeRef={playRef}
					in={context?.showPlay}
					timeout={15000}
					classNames="playpause-icon"
					mountOnEnter={true}
					unmountOnExit={true}
				>
					<div className="playpause-container">
						<div ref={playRef} className="play-icon">
							<svg
								viewBox="0 0 50 50"
								height="45"
								width="45"
								xmlns="http://www.w3.org/2000/svg"
							>
								<polygon
									fill="white"
									points="15,10 40,25 15,40"
								></polygon>
							</svg>
						</div>
					</div>
				</CSSTransition>
				<CSSTransition
					nodeRef={pauseRef}
					in={context?.showPause}
					timeout={15000}
					classNames="playpause-icon"
					mountOnEnter={true}
					unmountOnExit={true}
				>
					<div className="playpause-container">
						<div ref={pauseRef} className="pause-icon">
							<svg
								viewBox="0 0 50 50"
								height="50"
								width="50"
								xmlns="http://www.w3.org/2000/svg"
							>
								<rect
									fill="white"
									height="30"
									width="7"
									y="10"
									x="14"
								></rect>
								<rect
									fill="white"
									height="30"
									width="7"
									y="10"
									x="29"
								></rect>
							</svg>
						</div>
					</div>
				</CSSTransition>
				<CSSTransition
					nodeRef={seekBackRef}
					in={context?.showSeekBackwards}
					timeout={500}
					classNames="seek-icon"
					mountOnEnter={true}
					unmountOnExit={true}
				>
					<div ref={seekBackRef} className="seek-backwards">
						<div className="round">
							<div id="cta">
								<span className="mn-arrow bounceAlphaBack primera back "></span>
								<span className="mn-arrow bounceAlphaBack segunda back "></span>
								<div className="text">
									{context?.settings?.seekSeconds}s
								</div>
							</div>
						</div>
					</div>
				</CSSTransition>
				<CSSTransition
					nodeRef={seekForwardRef}
					in={context?.showSeekForward}
					timeout={500}
					classNames="seek-icon"
					mountOnEnter={true}
					unmountOnExit={true}
				>
					<div ref={seekForwardRef} className="seek-forwards">
						<div className="round">
							<div id="cta">
								<span className="mn-arrow bounceAlpha segunda next "></span>
								<span className="mn-arrow bounceAlpha primera next "></span>
								<div className="text">
									{context?.settings?.seekSeconds}s
								</div>
							</div>
						</div>
					</div>
				</CSSTransition>
				<CSSTransition
					nodeRef={speedRef}
					in={context?.showSpeed}
					timeout={1000}
					// This class is used for the transition classes (e.g speed-icon-enter)
					classNames="speed-icon"
					mountOnEnter={true}
					unmountOnExit={true}
				>
					<div ref={speedRef} className="speed-icon">
						{context?.currentSpeed}x
					</div>
				</CSSTransition>
				<div
					className={`progress-bar-container ${
						hideProgressBar ||
						!context?.settings?.displayProgressBar
							? "hidden"
							: ""
					}`}
				>
					<div
						className={`timestamp ${
							!(
								context?.settings?.displayTimestamp ||
								context?.showTimestamp
							)
								? "hidden"
								: ""
						}`}
					>
						<div className="timestamp-inner">
							{formatTimestamp(currentTimestamp)}
						</div>
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
