import { useContext, useEffect, useState, createContext } from "react";
import * as React from "react";
import { MyPluginSettings } from "./main";
import { EventEmitter } from "events";

// Define the type for the context
interface ContextType {
	settings: MyPluginSettings | null;
}

// Create the context with initial value as null
export const AppContext = createContext<ContextType | null>(null);

// Create an event emitter
export const settingsEventEmitter = new EventEmitter();

export const AppProvider: React.FC<{
	children: React.ReactNode;
	value: ContextType;
}> = ({ children, value }) => {
	const [settings, setSettings] = useState<MyPluginSettings | null>(
		value.settings
	);

	const updateSettings = (newSettings: MyPluginSettings) => {
		setSettings(newSettings);
	};

	useEffect(() => {
		// Listen for the 'settingsUpdated' event
		settingsEventEmitter.on(
			"settingsUpdated",
			(newSettings: MyPluginSettings) => updateSettings(newSettings)
		);

		// Clean up the listener when the component unmounts
		return () => {
			settingsEventEmitter.off("settingsUpdated", updateSettings);
		};
	}, []);

	return (
		<AppContext.Provider value={{ settings }}>
			{children}
		</AppContext.Provider>
	);
};

// use app hook to get app context in react component's
export const useAppContext = (): ContextType | null => {
	return useContext(AppContext);
};
