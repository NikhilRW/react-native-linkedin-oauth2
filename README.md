# react-native-linkedin-oauth2

[![npm version](https://badge.fury.io/js/react-native-linkedin-oauth2.svg)](https://badge.fury.io/js/react-native-linkedin-oauth2)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A simple, lightweight, and fully customizable React Native package for integrating LinkedIn OAuth2 authentication into your mobile apps. Built with TypeScript and designed for ease of use.

⚠️⚠️⚠️⚠️ Warning THIS PACKAGE IS NOT TESTED IN IOS DEVICES
If Any one find bugs while using it in ios device please open issue in this  [GitHub Repository](https://github.com/NikhilRW/react-native-linkedin-oauth2) ⚠️⚠️⚠️⚠️

## 📦 Installation

```bash
npm install react-native-linkedin-oauth2
```

or

```bash
yarn add react-native-linkedin-oauth2
```

### Dependencies

This package requires the following peer dependencies:

```bash
npm install react-native-webview react-native-safe-area-context
```

or

```bash
yarn add react-native-webview react-native-safe-area-context
```

For iOS, run:

```bash
cd ios && pod install
```

## 🔧 LinkedIn Developer Console Setup

Before using this package, you need to set up an OAuth2 application in the LinkedIn Developer Console:

1. **Create a LinkedIn App**
   - Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
   - Click "Create app"
   - Fill in the required information

2. **Configure OAuth Settings**
   - Navigate to the "Auth" tab in your app settings
   - Add your redirect URI (e.g., `https://yourapp.com/auth/linkedin/callback`)
   - Note: The redirect URI must match exactly what you use in the component

3. **Get Your Credentials**
   - Copy your **Client ID** from the app settings
   - Copy your **Client Secret** (keep this secure!)

4. **Request Scopes**
   - In the "Auth" tab, request the scopes you need
   - Common scopes: `openid`, `profile`, `email`
   - Additional scopes may require LinkedIn approval

## 🚀 Quick Start

Here's a simple example to get you started:

```tsx
import React, { useState } from 'react';
import { View, Button, Text } from 'react-native';
import { LinkedInModal, LinkedInProfile } from 'react-native-linkedin-oauth2';

const App = () => {
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState<LinkedInProfile | null>(null);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {user ? (
        <View>
          <Text>Welcome, {user.name}!</Text>
          <Text>Email: {user.email}</Text>
        </View>
      ) : (
        <Button
          title="Sign in with LinkedIn"
          onPress={() => setShowModal(true)}
        />
      )}

      <LinkedInModal
        isVisible={showModal}
        clientId="YOUR_CLIENT_ID"
        clientSecret="YOUR_CLIENT_SECRET"
        redirectUri="https://yourapp.com/auth/linkedin/callback"
        onSuccess={profile => {
          console.log('Login successful:', profile);
          setUser(profile);
          setShowModal(false);
        }}
        onError={error => {
          console.error('Login error:', error);
          setShowModal(false);
        }}
        onClose={() => setShowModal(false)}
      />
    </View>
  );
};

export default App;
```

## 📚 API Reference

### LinkedInModal Props

| Prop             | Type                                            | Required | Default                      | Description                                               |
| ---------------- | ----------------------------------------------- | -------- | ---------------------------- | --------------------------------------------------------- |
| `isVisible`      | `boolean`                                       | ✅       | -                            | Controls the visibility of the modal                      |
| `clientId`       | `string`                                        | ✅       | -                            | Your LinkedIn Client ID                                   |
| `clientSecret`   | `string`                                        | ✅       | -                            | Your LinkedIn Client Secret                               |
| `redirectUri`    | `string`                                        | ✅       | -                            | The redirect URI registered in LinkedIn Developer Console |
| `scope`          | `string`                                        | ❌       | `'openid email profile'`     | Space-separated list of OAuth scopes                      |
| `onSuccess`      | `(user: LinkedInProfile) => void`               | ❌       | `() => {}`                   | Callback invoked when authentication succeeds             |
| `onError`        | `(error: Error) => void`                        | ❌       | `() => {}`                   | Callback invoked when an error occurs                     |
| `onClose`        | `() => void`                                    | ❌       | `() => {}`                   | Callback invoked when the modal is closed                 |
| `onLogout`       | `() => void`                                    | ❌       | `() => {}`                   | Callback invoked when logout completes                    |
| `logout`         | `boolean`                                       | ❌       | `false`                      | If true, shows LinkedIn logout page instead of login      |
| `closeOnSuccess` | `boolean`                                       | ❌       | `true`                       | Automatically close modal after successful login          |
| `renderHeader`   | `(props: { onClose: () => void }) => ReactNode` | ❌       | -                            | Custom header component                                   |
| `renderLoading`  | `() => ReactNode`                               | ❌       | -                            | Custom loading indicator                                  |
| `containerStyle` | `StyleProp<ViewStyle>`                          | ❌       | -                            | Style for the container SafeAreaView                      |
| `wrapperStyle`   | `StyleProp<ViewStyle>`                          | ❌       | -                            | Style for the wrapper View                                |
| `modalProps`     | `Partial<Omit<ModalProps, 'visible'>>`          | ❌       | `{ animationType: 'slide' }` | Additional props for React Native Modal                   |

### LinkedInProfile Type

The `LinkedInProfile` interface represents the user data returned after successful authentication:

```typescript
interface LinkedInProfile {
  sub: string; // Unique user identifier
  name: string; // Full name
  given_name: string; // First name
  family_name: string; // Last name
  picture: string; // Profile picture URL
  email?: string; // Email (if 'email' scope requested)
  email_verified?: boolean; // Email verification status
  locale: {
    country: string; // Country code (e.g., 'US')
    language: string; // Language code (e.g., 'en')
  };
  [key: string]: any; // Additional fields
}
```

### LinkedInTokenResponse Type

The `LinkedInTokenResponse` interface represents the OAuth token response:

```typescript
interface LinkedInTokenResponse {
  access_token: string; // Access token for API requests
  expires_in: number; // Token expiration time in seconds
  scope: string; // Granted scopes
  token_type: string; // Token type (usually 'Bearer')
  id_token?: string; // ID token (if OpenID scope requested)
}
```

## 🎨 Advanced Usage

### Custom Scopes

Request additional permissions by specifying custom scopes:

```tsx
<LinkedInModal
  isVisible={showModal}
  clientId="YOUR_CLIENT_ID"
  clientSecret="YOUR_CLIENT_SECRET"
  redirectUri="YOUR_REDIRECT_URI"
  scope="openid profile email w_member_social" // Request posting permissions
  onSuccess={profile => console.log(profile)}
  onError={error => console.error(error)}
  onClose={() => setShowModal(false)}
/>
```

### Custom Header

Provide your own header component:

```tsx
const CustomHeader = ({ onClose }: { onClose: () => void }) => (
  <View
    style={{
      height: 60,
      backgroundColor: '#0077B5',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <TouchableOpacity
      onPress={onClose}
      style={{ position: 'absolute', right: 20 }}
    >
      <Text style={{ color: 'white', fontSize: 16 }}>✕</Text>
    </TouchableOpacity>
    <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
      Sign in with LinkedIn
    </Text>
  </View>
);

<LinkedInModal
  isVisible={showModal}
  clientId="YOUR_CLIENT_ID"
  clientSecret="YOUR_CLIENT_SECRET"
  redirectUri="YOUR_REDIRECT_URI"
  renderHeader={props => <CustomHeader {...props} />}
  onSuccess={profile => console.log(profile)}
  onError={error => console.error(error)}
  onClose={() => setShowModal(false)}
/>;
```

### Custom Loading Indicator

Customize the loading experience:

```tsx
const CustomLoading = () => (
  <View
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 119, 181, 0.1)',
    }}
  >
    <ActivityIndicator size="large" color="#0077B5" />
    <Text style={{ marginTop: 10, color: '#0077B5' }}>
      Connecting to LinkedIn...
    </Text>
  </View>
);

<LinkedInModal
  isVisible={showModal}
  clientId="YOUR_CLIENT_ID"
  clientSecret="YOUR_CLIENT_SECRET"
  redirectUri="YOUR_REDIRECT_URI"
  renderLoading={() => <CustomLoading />}
  onSuccess={profile => console.log(profile)}
  onError={error => console.error(error)}
  onClose={() => setShowModal(false)}
/>;
```

### Logout Functionality

Log out users from LinkedIn:

```tsx
const [showLogoutModal, setShowLogoutModal] = useState(false);

<LinkedInModal
  isVisible={showLogoutModal}
  logout={true}
  onLogout={() => {
    console.log('User logged out');
    setShowLogoutModal(false);
  }}
  onClose={() => setShowLogoutModal(false)}
/>;
```

### Custom Styling

Customize the modal appearance:

```tsx
<LinkedInModal
  isVisible={showModal}
  clientId="YOUR_CLIENT_ID"
  clientSecret="YOUR_CLIENT_SECRET"
  redirectUri="YOUR_REDIRECT_URI"
  containerStyle={{ backgroundColor: '#f5f5f5' }}
  wrapperStyle={{ borderRadius: 10, overflow: 'hidden' }}
  modalProps={{
    animationType: 'fade',
    transparent: true,
  }}
  onSuccess={profile => console.log(profile)}
  onError={error => console.error(error)}
  onClose={() => setShowModal(false)}
/>
```

### Keep Modal Open After Success

Sometimes you may want to manually control when to close the modal:

```tsx
<LinkedInModal
  isVisible={showModal}
  clientId="YOUR_CLIENT_ID"
  clientSecret="YOUR_CLIENT_SECRET"
  redirectUri="YOUR_REDIRECT_URI"
  closeOnSuccess={false} // Don't auto-close
  onSuccess={profile => {
    console.log('Login successful:', profile);
    // Do something with the profile...
    // Then manually close when ready
    setTimeout(() => setShowModal(false), 2000);
  }}
  onError={error => console.error(error)}
  onClose={() => setShowModal(false)}
/>
```

## 🔍 Complete Example

Here's a full-featured example with all the props and callbacks included:

```tsx
import React, { useState } from 'react';
import {
  View,
  Button,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinkedInModal, LinkedInProfile } from 'react-native-linkedin-oauth2';

const LINKEDIN_CONFIG = {
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  redirectUri: 'https://yourapp.com/auth/linkedin/callback',
};

const App = () => {
  const [showModal, setShowModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [user, setUser] = useState<LinkedInProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = () => {
    setError(null);
    setShowModal(true);
  };

  const handleSuccess = (profile: LinkedInProfile) => {
    console.log('Authentication successful:', profile);
    setUser(profile);
    setError(null);
  };

  const handleError = (err: Error) => {
    console.error('Authentication error:', err);
    setError(err.message);
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const CustomHeader = ({ onClose }: { onClose: () => void }) => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Sign in with LinkedIn</Text>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  const CustomLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0077B5" />
      <Text style={styles.loadingText}>Authenticating...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {user ? (
        <View style={styles.profileContainer}>
          <Image source={{ uri: user.picture }} style={styles.profileImage} />
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Text style={styles.userId}>ID: {user.sub}</Text>
          <Button title="Logout" onPress={handleLogout} color="#dc3545" />
        </View>
      ) : (
        <View style={styles.loginContainer}>
          <Text style={styles.title}>LinkedIn OAuth2 Example</Text>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <Button
            title="Sign in with LinkedIn"
            onPress={handleLogin}
            color="#0077B5"
          />
        </View>
      )}

      {/* Login Modal */}
      <LinkedInModal
        isVisible={showModal}
        clientId={LINKEDIN_CONFIG.clientId}
        clientSecret={LINKEDIN_CONFIG.clientSecret}
        redirectUri={LINKEDIN_CONFIG.redirectUri}
        scope="openid profile email"
        onSuccess={handleSuccess}
        onError={handleError}
        onClose={() => setShowModal(false)}
        renderHeader={props => <CustomHeader {...props} />}
        renderLoading={() => <CustomLoading />}
        closeOnSuccess={true}
      />

      {/* Logout Modal */}
      <LinkedInModal
        isVisible={showLogoutModal}
        logout={true}
        onLogout={() => {
          console.log('Logout successful');
          setUser(null);
          setShowLogoutModal(false);
        }}
        onClose={() => setShowLogoutModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loginContainer: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  profileContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  userId: {
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  header: {
    height: 60,
    backgroundColor: '#0077B5',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    padding: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 119, 181, 0.1)',
  },
  loadingText: {
    marginTop: 10,
    color: '#0077B5',
    fontSize: 16,
  },
});

export default App;
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Missing required props" Warning

**Problem:** You're seeing a warning about missing `clientId`, `clientSecret`, or `redirectUri`.

**Solution:** Ensure all three required props are provided:

```tsx
<LinkedInModal
  isVisible={true}
  clientId="YOUR_CLIENT_ID" // ✅ Required
  clientSecret="YOUR_CLIENT_SECRET" // ✅ Required
  redirectUri="YOUR_REDIRECT_URI" // ✅ Required
  // ...other props
/>
```

#### 2. "Failed to get access token" Error

**Problem:** The token exchange fails.

**Possible causes:**

- Incorrect `clientSecret`
- Redirect URI mismatch between code and LinkedIn Developer Console
- Expired or invalid authorization code

**Solution:**

- Verify your credentials in the LinkedIn Developer Console
- Ensure the `redirectUri` prop matches exactly what's registered in your app settings
- Check that your app is not in a restricted mode in the developer console

#### 3. Network Request Failed

**Problem:** Unable to connect to LinkedIn servers.

**Solution:**

- Check your internet connection
- Ensure your app has network permissions (especially on Android)
- Verify that LinkedIn's OAuth endpoints are accessible from your network

#### 4. Email is Undefined

**Problem:** The `user.email` field is `undefined` after successful login.

**Solution:**

- Make sure you've requested the `email` scope:
  ```tsx
  <LinkedInModal scope="openid profile email" />
  ```
- Verify that the `email` scope is approved in your LinkedIn app settings

#### 5. WebView Not Loading

**Problem:** The WebView appears blank or doesn't load.

**Solution:**

- Ensure `react-native-webview` is properly installed
- For iOS, run `cd ios && pod install`
- Check that you've linked the library correctly (this should be automatic with auto-linking)

#### 6. Modal Styling Issues

**Problem:** The modal doesn't look right or doesn't fit the screen.

**Solution:**

- Ensure `react-native-safe-area-context` is installed and configured
- Wrap your root app component with `SafeAreaProvider`:

  ```tsx
  import { SafeAreaProvider } from 'react-native-safe-area-context';

  const App = () => (
    <SafeAreaProvider>{/* Your app content */}</SafeAreaProvider>
  );
  ```

## 🔒 Security Considerations

> [!CAUTION]
> **Client Secret Exposure:** The `clientSecret` is included in your React Native app bundle, which means it can be extracted by determined users. For maximum security, consider implementing a backend proxy that handles the token exchange instead of doing it directly in the mobile app.

### Recommended Secure Implementation

Instead of passing the `clientSecret` directly:

1. Create a backend endpoint that accepts the authorization code
2. Have your backend exchange the code for a token using the `clientSecret`
3. Return the profile data (or your own JWT) to the mobile app

This way, the `clientSecret` stays secure on your server.

## 📄 TypeScript Support

This package is written in TypeScript and includes full type definitions. No need for `@types/` packages!

**Exported Types:**

- `LinkedInProfile` - User profile data structure
- `LinkedInTokenResponse` - OAuth token response structure
- `LinkedInModalProps` - Component props interface

```typescript
import {
  LinkedInModal,
  LinkedInProfile,
  LinkedInTokenResponse,
  LinkedInModalProps,
} from 'react-native-linkedin-oauth2';

const handleSuccess = (profile: LinkedInProfile) => {
  // TypeScript knows the structure of profile
  console.log(profile.name, profile.email);
};
```

## 📱 Supported Platforms

- ✅ iOS
- ✅ Android
- ❌ Web (requires different OAuth flow)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Nikhil Wankhede**

- GitHub: [@NikhilRW](https://github.com/NikhilRW)

## 🙏 Acknowledgments

- Built with [react-native-webview](https://github.com/react-native-webview/react-native-webview)
- Uses [react-native-safe-area-context](https://github.com/th3rdwave/react-native-safe-area-context)

## 📦 Related Packages

- [react-native-webview](https://www.npmjs.com/package/react-native-webview) - WebView component for React Native
- [react-native-safe-area-context](https://www.npmjs.com/package/react-native-safe-area-context) - Safe area context for React Native

## 🔗 Links

- [NPM Package](https://www.npmjs.com/package/react-native-linkedin-oauth2)
- [GitHub Repository](https://github.com/NikhilRW/react-native-linkedin-oauth2)
- [LinkedIn Developers Portal](https://www.linkedin.com/developers/)
- [LinkedIn OAuth 2.0 Documentation](https://docs.microsoft.com/en-us/linkedin/shared/authentication/authentication)

---

**Made with ❤️ by Nikhil Wankhede**
