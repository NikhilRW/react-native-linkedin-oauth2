import React from 'react';

jest.mock('react-native', () => {
  const React = require('react');

  const View = (props: any) =>
    React.createElement('View', props, props.children);
  const Text = (props: any) =>
    React.createElement('Text', props, props.children);
  const Modal = (props: any) =>
    React.createElement('Modal', props, props.children);
  const TouchableOpacity = (props: any) =>
    React.createElement('TouchableOpacity', props, props.children);
  const ActivityIndicator = (props: any) =>
    React.createElement('ActivityIndicator', props, props.children);
  const SafeAreaView = (props: any) =>
    React.createElement('SafeAreaView', props, props.children);

  return {
    StyleSheet: {
      create: (styles: any) => styles,
      absoluteFillObject: {},
      flatten: (style: any) => style,
    },
    View,
    Text,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
    Platform: {
      OS: 'ios',
      select: (objs: any) => objs.ios,
    },
    Dimensions: {
      get: () => ({ width: 375, height: 812 }),
    },
    __esModule: true,
  };
});

jest.mock('react-native-webview', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) =>
      React.createElement('View', { ...props, testID: 'mock-webview' }),
  };
});

jest.mock('react-native-webview/lib/WebViewTypes', () => ({}));
