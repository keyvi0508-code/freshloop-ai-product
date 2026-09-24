const isLanguage = (value) => value === 'en' || value === 'zh-CN';

export function setInterfaceLanguage(state, value) {
  const language = value === 'en' ? 'en' : 'zh-CN';
  state.profile.interfaceLanguage = language;
  state.notificationSettings.interfaceLanguage = language;
  return language;
}

export function chooseEntryLanguage(state, value) {
  state.auth.entryLanguage = setInterfaceLanguage(state, value);
}

export function loginInterfaceLanguage(state, remote) {
  // A language explicitly chosen on this visit takes priority over an older
  // cloud preference. Without that choice, restore the account's saved setting.
  return [state.auth?.entryLanguage, remote?.notification_settings?.interfaceLanguage,
    state.profile?.interfaceLanguage, 'zh-CN'].find(isLanguage);
}
