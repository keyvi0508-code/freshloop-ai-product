import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseEntryLanguage, loginInterfaceLanguage, setInterfaceLanguage } from '../src/services/interfaceLanguage.js';

test('entry language survives persistence, first login and profile setup', () => {
  const state = { auth: { noticeAccepted: false }, profile: {}, notificationSettings: {} };
  chooseEntryLanguage(state, 'en');
  assert.equal(state.auth.noticeAccepted, false);
  const restored = JSON.parse(JSON.stringify(state));
  const language = loginInterfaceLanguage(restored, null);
  restored.profile = { name: '', allergies: [], dislikes: [], tasteNotes: '' };
  setInterfaceLanguage(restored, language);
  assert.equal(restored.profile.interfaceLanguage, 'en');
  assert.equal(restored.notificationSettings.interfaceLanguage, 'en');
  assert.equal(restored.profile.name, '');
  setInterfaceLanguage(restored, 'zh-CN');
  assert.equal(restored.profile.interfaceLanguage, 'zh-CN');
  assert.equal(restored.notificationSettings.interfaceLanguage, 'zh-CN');
});

test('explicit notice choice takes priority; otherwise saved account language is restored', () => {
  const state = { auth: {}, profile: { interfaceLanguage: 'zh-CN' }, notificationSettings: {} };
  assert.equal(loginInterfaceLanguage(state, { notification_settings: { interfaceLanguage: 'en' } }), 'en');
  chooseEntryLanguage(state, 'en');
  assert.equal(loginInterfaceLanguage(state, { notification_settings: { interfaceLanguage: 'zh-CN' } }), 'en');
  assert.equal(loginInterfaceLanguage({ auth: {}, profile: {} }, null), 'zh-CN');
});
