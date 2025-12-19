import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { LinkedInModal, type LinkedInModalProps } from '../index';
import { View, TouchableOpacity, Text } from 'react-native';

// Mock global fetch
const globalFetch = globalThis.fetch;

describe('LinkedInModal', () => {
  const defaultProps: LinkedInModalProps = {
    isVisible: true,
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'https://test.com/callback',
    onSuccess: jest.fn(),
    onError: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = globalFetch;
    jest.useRealTimers();
  });

  it('renders correctly with required props', async () => {
    let tree;
    await waitFor(() => {
      tree = render(<LinkedInModal {...defaultProps} />).toJSON();
    });
    expect(tree).toBeDefined();
  });

  it('renders error message when required props are missing', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const props = { ...defaultProps, clientId: '' };
    let component: any;
    await waitFor(() => {
      component = render(<LinkedInModal {...props} />);
    });

    const root = component!.UNSAFE_root;
    // We look for the Text component containing the error message
    const textNodes = root.findAllByType(Text);
    const errorText = (textNodes as any[]).find(
      node =>
        node.props.children ===
        'Missing required props (clientId, clientSecret, or redirectUri)',
    );

    expect(errorText).toBeDefined();
    consoleSpy.mockRestore();
  });

  it('renders WebView when visible and props are valid', async () => {
    let component: any;
    await waitFor(() => {
      component = render(<LinkedInModal {...defaultProps} />);
    });
    const root = component!.UNSAFE_root;
    const webview = root.findByProps({ testID: 'mock-webview' });

    expect(webview).toBeDefined();
    expect(webview.props.source.uri).toContain(
      'https://www.linkedin.com/oauth/v2/authorization',
    );
    expect(webview.props.source.uri).toContain('client_id=test-client-id');
    expect(webview.props.source.uri).toContain(
      'redirect_uri=https%3A%2F%2Ftest.com%2Fcallback',
    );
  });

  it('calls onClose when close button is pressed', async () => {
    const onClose = jest.fn();
    let component: any;
    await waitFor(() => {
      component = render(<LinkedInModal {...defaultProps} onClose={onClose} />);
    });
    const root = component!.UNSAFE_root;

    // Find the close button (TouchableOpacity)
    const touchables = root.findAllByType(TouchableOpacity);
    // Assuming the first one is the close button in DefaultHeader
    const closeButton = touchables[0];

    expect(closeButton).toBeDefined();
    await waitFor(() => {
      closeButton.props.onPress();
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('handles successful authentication flow', async () => {
    const onSuccess = jest.fn();
    const onClose = jest.fn();
    let component: any;
    await waitFor(() => {
      component = render(
        <LinkedInModal
          {...defaultProps}
          onSuccess={onSuccess}
          onClose={onClose}
        />,
      );
    });

    const root = component!.UNSAFE_root;
    const webview = root.findByProps({ testID: 'mock-webview' });

    // Mock fetch responses
    const mockTokenResponse = {
      access_token: 'test-access-token',
      expires_in: 3600,
      scope: 'email',
      token_type: 'Bearer',
    };

    const mockProfileResponse = {
      sub: '12345',
      name: 'Test User',
      given_name: 'Test',
      family_name: 'User',
      picture: 'https://example.com/pic.jpg',
      locale: { country: 'US', language: 'en' },
      email: 'test@example.com',
    };

    (globalThis.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfileResponse,
      });

    // Simulate navigation to redirect URI with code
    const onShouldStartLoadWithRequest =
      webview.props.onShouldStartLoadWithRequest;
    let shouldLoad;
    await act(async () => {
      shouldLoad = onShouldStartLoadWithRequest({
        url: 'https://test.com/callback?code=test-auth-code',
      });
    });

    expect(shouldLoad).toBe(false);

    // Wait for async operations
    await act(async () => {
      jest.runAllTimers();
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://www.linkedin.com/oauth/v2/accessToken',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('code=test-auth-code'),
      }),
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      'https://api.linkedin.com/v2/userinfo',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-access-token' },
      }),
    );

    expect(onSuccess).toHaveBeenCalledWith(mockProfileResponse);
    expect(onClose).toHaveBeenCalled();
  });

  it('handles authentication error from URL', async () => {
    const onError = jest.fn();
    const onClose = jest.fn();
    let component: any;
    await waitFor(() => {
      component = render(
        <LinkedInModal {...defaultProps} onError={onError} onClose={onClose} />,
      );
    });

    const root = component!.UNSAFE_root;
    const webview = root.findByProps({ testID: 'mock-webview' });
    const onShouldStartLoadWithRequest =
      webview.props.onShouldStartLoadWithRequest;

    let shouldLoad;
    await waitFor(() => {
      shouldLoad = onShouldStartLoadWithRequest({
        url: 'https://test.com/callback?error=access_denied&error_description=User+denied',
      });
    });

    expect(shouldLoad).toBe(false);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onClose).toHaveBeenCalled();
  });

  it('handles logout', async () => {
    const onLogout = jest.fn();
    const onClose = jest.fn();
    let component: any;
    await waitFor(() => {
      component = render(
        <LinkedInModal
          {...defaultProps}
          logout={true}
          onLogout={onLogout}
          onClose={onClose}
        />,
      );
    });

    const root = component!.UNSAFE_root;
    const webview = root.findByProps({ testID: 'mock-webview' });

    expect(webview.props.source.uri).toBe('https://www.linkedin.com/m/logout');

    // Simulate navigation change indicating logout completion
    const onNavigationStateChange = webview.props.onNavigationStateChange;
    await waitFor(() => {
      onNavigationStateChange({ url: 'https://www.linkedin.com/m/login' });
    });

    expect(onLogout).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
