import { useContext, useEffect, useState, createContext } from "react";
import * as React from "react";
import { MediaNotesPluginSettings } from "./main";
import { EventEmitter } from "events";

// Define the type for the context
interface ContextType {
	settings: MediaNotesPluginSettings | null;
	showTimestamp: boolean;
	showSeekForward: boolean;
	showSeekBackwards: boolean;
	showPlay: boolean;
	showPause: boolean;
	showSpeed: boolean;
	currentSpeed?: number;
}

// Create the context with initial value as null
export const AppContext = createContext<ContextType | null>(null);

export const AppProvider: React.FC<{
	children: React.ReactNode;
	settingsParam: MediaNotesPluginSettings | null;
	eventEmitter: EventEmitter;
}> = ({ children, settingsParam, eventEmitter }) => {
	const [settings, setSettings] = useState<MediaNotesPluginSettings | null>(
		settingsParam
	);

	const updateSettings = (newSettings: MediaNotesPluginSettings) => {
		setSettings(newSettings);
	};

	const [showTimestamp, setShowTimestamp] = useState<boolean>(false);
	const [showSeekForward, setShowSeekForward] = useState<boolean>(false);
	const [showSeekBackwards, setShowSeekBackwards] = useState<boolean>(false);
	const [showPlay, setShowPlay] = useState<boolean>(false);
	const [showPause, setShowPause] = useState<boolean>(false);
	const [showSpeed, setShowSpeed] = useState<boolean>(false);
	const [currentSpeed, setCurrentSpeed] = useState<number | undefined>(1);

	useEffect(() => {
		// Listen for the 'settingsUpdated' event
		eventEmitter.on(
			"settingsUpdated",
			(newSettings: MediaNotesPluginSettings) =>
				updateSettings(newSettings)
		);

		let timestampDebounceTimer: number;
		let playPauseDebounceTimer: number;
		let speedDebounceTimer: number;

		const handleShowTimestamp = ({
			type,
			speed,
		}: {
			type: string;
			speed?: number;
		}) => {
			// Clear the previous timer if there is one
			clearTimeout(timestampDebounceTimer);
			clearTimeout(playPauseDebounceTimer);
			clearTimeout(speedDebounceTimer);

			setShowSeekForward(false);
			// set them all to false again so that we can then set things to true again and get the animation
			setShowTimestamp(false);
			setShowSeekBackwards(false);
			setShowPause(false);
			setShowPause(false);
			setShowSpeed(false);

			// slight setTimeout to get the state set on the next tick
			setTimeout(() => {
				setShowTimestamp(true);
				if (type === "seekForward") {
					setShowSeekForward(true);
				}
				if (type === "seekBackwards") {
					setShowSeekBackwards(true);
				}
				if (type === "play") {
					setShowPlay(true);
				}
				if (type === "pause") {
					setShowPause(true);
				}
				if (type === "setSpeed") {
					setCurrentSpeed(speed);
					setShowSpeed(true);
				}
				// Set a new timer to hide the timestamp
				timestampDebounceTimer = window.setTimeout(() => {
					setShowTimestamp(false);
					setShowSeekForward(false);
					setShowSeekBackwards(false);
				}, 1500);
				playPauseDebounceTimer = window.setTimeout(() => {
					setShowPlay(false);
					setShowPause(false);
				}, 500);
				speedDebounceTimer = window.setTimeout(() => {
					console.log("setting speed to false");
					setShowSpeed(false);
				}, 500);
			}, 20);
		};

		eventEmitter.on("handleAction", handleShowTimestamp);

		// Clean up the listener when the component unmounts
		return () => {
			eventEmitter.off("settingsUpdated", updateSettings);
			clearTimeout(timestampDebounceTimer);
		};
	}, []);

	return (
		<AppContext.Provider
			value={{
				settings,
				showTimestamp,
				showSeekBackwards,
				showSeekForward,
				showPause,
				showPlay,
				showSpeed,
				currentSpeed,
			}}
		>
			{children}
		</AppContext.Provider>
	);
};

// use app hook to get app context in react component's
export const useAppContext = (): ContextType | null => {
	return useContext(AppContext);
};
