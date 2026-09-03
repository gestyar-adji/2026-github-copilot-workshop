import { describe, test, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const matchMediaMock = vi.fn(() => ({ matches: false }));
window.matchMedia = matchMediaMock;

function createMockRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div>Dashboard</div>' } },
      { path: '/requisitions', component: { template: '<div>Requisitions</div>' } },
    ],
  });
}

async function mountApp() {
  const router = createMockRouter();
  await router.push('/');
  await router.isReady();
  return mount(App, { global: { plugins: [router] } });
}

describe('App theme toggle', () => {
  beforeEach(() => {
    localStorageMock.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  test('sets theme to light by default when no preference is stored', async () => {
    matchMediaMock.mockReturnValue({ matches: false });
    await mountApp();
    await nextTick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  test('applies stored dark theme on mount', async () => {
    localStorageMock.setItem('theme', 'dark');
    await mountApp();
    await nextTick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('toggles theme when button is clicked', async () => {
    matchMediaMock.mockReturnValue({ matches: false });
    const wrapper = await mountApp();
    await nextTick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    await wrapper.find('.theme-toggle').trigger('click');
    await nextTick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');

    await wrapper.find('.theme-toggle').trigger('click');
    await nextTick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
  });

  test('respects system dark mode preference when no stored theme', async () => {
    matchMediaMock.mockReturnValue({ matches: true });
    await mountApp();
    await nextTick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
