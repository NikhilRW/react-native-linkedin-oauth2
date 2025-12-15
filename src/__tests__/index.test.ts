import { loginLinkedIn } from '../index.js';
import { test, expect, vi } from 'vitest';

test('Test loginLinkedIn function', () => {
  expect(loginLinkedIn).toBeDefined();

  const logSpy = vi.spyOn(console, 'log');

  loginLinkedIn();

  expect(logSpy).toHaveBeenCalledWith(
    'Logging In In Your App Using Linkedin !!! ',
  );

  logSpy.mockRestore();
});
