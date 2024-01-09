import { useContext, useEffect, useState, createContext } from "react";
import * as React from "react";
import { MyPluginSettings } from "./main";
import { EventEmitter } from "events";

// Define the type for the context
interface ContextType {
	settings: MyPluginSettings | null;
	showTimestamp: boolean;
}

// Create the context with initial value as null
export const AppContext = createContext<ContextType | null>(null);

export const AppProvider: React.FC<{
	children: React.ReactNode;
	settingsParam: MyPluginSettings | null;
	eventEmitter: EventEmitter;
}> = ({ children, settingsParam, eventEmitter }) => {
	const [settings, setSettings] = useState<MyPluginSettings | null>(
		settingsParam
	);

	const updateSettings = (newSettings: MyPluginSettings) => {
		setSettings(newSettings);
	};

	const [showTimestamp, setShowTimestamp] = useState<boolean>(false);

	useEffect(() => {
		// Listen for the 'settingsUpdated' event
		eventEmitter.on("settingsUpdated", (newSettings: MyPluginSettings) =>
			updateSettings(newSettings)
		);

		let debounceTimer: number;
		const handleShowTimestamp = () => {
			// Clear the previous timer if there is one
			clearTimeout(debounceTimer);
			setShowTimestamp(true);
			// Set a new timer to hide the timestamp
			debounceTimer = window.setTimeout(() => {
				setShowTimestamp(false);
			}, 2000);
		};

		eventEmitter.on("showTimestamp", handleShowTimestamp);

		// Clean up the listener when the component unmounts
		return () => {
			eventEmitter.off("settingsUpdated", updateSettings);
			clearTimeout(debounceTimer);
		};
	}, []);

	return (
		<AppContext.Provider value={{ settings, showTimestamp }}>
			{children}
		</AppContext.Provider>
	);
};

// use app hook to get app context in react component's
export const useAppContext = (): ContextType | null => {
	return useContext(AppContext);
};
