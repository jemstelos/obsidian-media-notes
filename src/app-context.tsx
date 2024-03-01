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

	useEffect(() => {
		// Listen for the 'settingsUpdated' event
		eventEmitter.on(
			"settingsUpdated",
			(newSettings: MediaNotesPluginSettings) =>
				updateSettings(newSettings)
		);

		let timestampDebounceTimer: number;
		let playPauseDebounceTimer: number;
		const handleShowTimestamp = ({ type }: { type: string }) => {
			// Clear the previous timer if there is one
			clearTimeout(timestampDebounceTimer);
			clearTimeout(playPauseDebounceTimer);

			setShowSeekForward(false);
			// set them all to false again so that we can then set things to true again and get the animation
			setShowTimestamp(false);
			setShowSeekBackwards(false);
			setShowPause(false);
			setShowPause(false);

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
				// Set a new timer to hide the timestamp
				timestampDebounceTimer = window.setTimeout(() => {
					console.log("debounced setting to false");
					setShowTimestamp(false);
					setShowSeekForward(false);
					setShowSeekBackwards(false);
				}, 1500);
				playPauseDebounceTimer = window.setTimeout(() => {
					setShowPlay(false);
					setShowPause(false);
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
