import { registerPlugin } from '@capacitor/core';

/**
 * Bridge to the app's own NativeThemePlugin (android/.../NativeThemePlugin.java).
 */
export interface NativeThemePlugin {
  setStatusBar(options: { color: string; lightIcons: boolean }): Promise<void>;
  openNotificationSettings(): Promise<void>;
}

export const NativeTheme = registerPlugin<NativeThemePlugin>('NativeTheme');
