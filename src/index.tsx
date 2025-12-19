/**
 * @file index.tsx
 * @author NikhilRW
 * @description A React Native component that implements LinkedIn OAuth2 authentication
 * using a WebView. It handles the authorization code flow, token exchange, and user profile retrieval.
 *
 * @requires react-native-webview
 * @requires react-native
 * @requires react
 */

import React, {
  type Dispatch,
  type SetStateAction,
  useRef,
  useState,
  useEffect,
} from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  Text,
  type ModalProps,
  type ViewStyle,
  type StyleProp,
  SafeAreaView,
} from 'react-native';

import WebView, { type WebViewNavigation } from 'react-native-webview';
import { type ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

// --- Types ---

/**
 * Represents the user profile data returned from LinkedIn's /userinfo endpoint.
 * This follows the OpenID Connect standard claims.
 *
 * @interface LinkedInProfile
 */
export interface LinkedInProfile {
  /**
   * The unique identifier for the user (Subject).
   * This is a stable identifier for the user.
   */
  sub: string;

  /**
   * Whether the user's email address has been verified by LinkedIn.
   */
  email_verified?: boolean;

  /**
   * The full name of the user.
   */
  name: string;

  /**
   * The user's locale information.
   */
  locale: {
    /** The country code (e.g., US). */
    country: string;
    /** The language code (e.g., en). */
    language: string;
  };

  /**
   * The user's given name (first name).
   */
  given_name: string;

  /**
   * The user's family name (last name).
   */
  family_name: string;

  /**
   * The user's email address.
   * Only present if the 'email' scope was requested and granted.
   */
  email?: string;

  /**
   * URL to the user's profile picture.
   */
  picture: string;

  /**
   * Allow for additional properties that might be returned by the API.
   */
  [key: string]: any;
}

/**
 * Represents the response from the LinkedIn Access Token endpoint.
 *
 * @interface LinkedInTokenResponse
 */
export interface LinkedInTokenResponse {
  /**
   * The access token used to authorize API requests.
   */
  access_token: string;

  /**
   * The duration in seconds until the access token expires.
   */
  expires_in: number;

  /**
   * The scope of access granted by the token.
   */
  scope: string;

  /**
   * The type of token (usually "Bearer").
   */
  token_type: string;

  /**
   * The ID token (if OpenID Connect scopes were requested).
   */
  id_token?: string;
}

/**
 * Props for the LinkedInModal component.
 *
 * @interface LinkedInModalProps
 */
export interface LinkedInModalProps {
  /**
   * Controls the visibility of the modal.
   */
  isVisible: boolean;

  /**
   * The Client ID obtained from the LinkedIn Developer Portal.
   * Required for authentication.
   */
  clientId?: string;

  /**
   * The Client Secret obtained from the LinkedIn Developer Portal.
   * Required for exchanging the authorization code for an access token.
   * @warning Do not expose this in client-side code if possible; consider using a backend proxy for high security.
   */
  clientSecret?: string;

  /**
   * A space-separated list of permissions to request.
   * Common scopes: 'openid', 'email', 'profile', 'w_member_social'.
   * @default 'openid email profile'
   */
  scope?: string;

  /**
   * The Redirect URI registered in the LinkedIn Developer Portal.
   * This must match exactly what is configured in the portal.
   */
  redirectUri?: string;

  /**
   * Callback function triggered when login is successful.
   * @param {LinkedInProfile} user - The profile data of the authenticated user.
   */
  onSuccess?: (user: LinkedInProfile) => void;

  /**
   * Callback function triggered when an error occurs during authentication.
   * @param {Error} error - The error object containing details about the failure.
   */
  onError?: (error: Error) => void;

  /**
   * Callback function triggered when the modal is closed (e.g., by the user or after success).
   */
  onClose?: () => void;

  /**
   * If true, the component will attempt to log the user out of LinkedIn.
   * @default false
   */
  logout?: boolean;

  /**
   * Callback function triggered when the logout process is complete.
   */
  onLogout?: () => void;

  /**
   * Custom function to render the header of the modal.
   * @param {Object} props - Props passed to the header renderer.
   * @param {function} props.onClose - Function to close the modal.
   * @returns {React.ReactNode} The custom header component.
   */
  renderHeader?: (props: { onClose: () => void }) => React.ReactNode;

  /**
   * Custom function to render the loading indicator.
   * @returns {React.ReactNode} The custom loading component.
   */
  renderLoading?: () => React.ReactNode;

  /**
   * Style object for the SafeAreaView container.
   */
  containerStyle?: StyleProp<ViewStyle>;

  /**
   * Style object for the inner wrapper View.
   */
  wrapperStyle?: StyleProp<ViewStyle>;

  /**
   * Whether to automatically close the modal after a successful login.
   * @default true
   */
  closeOnSuccess?: boolean;

  /**
   * Additional props to pass to the underlying React Native Modal component.
   * @see https://reactnative.dev/docs/modal
   */
  modalProps?: Partial<Omit<ModalProps, 'visible'>>;
}

// --- Constants ---

/**
 * LinkedIn API endpoints used for authentication and data retrieval.
 */
const LINKEDIN_URLS = {
  /** URL for the authorization request. */
  AUTHORIZATION: 'https://www.linkedin.com/oauth/v2/authorization',
  /** URL for exchanging the authorization code for an access token. */
  ACCESS_TOKEN: 'https://www.linkedin.com/oauth/v2/accessToken',
  /** URL for fetching user information. */
  USER_INFO: 'https://api.linkedin.com/v2/userinfo',
  /** URL for logging out the user. */
  LOG_OUT: 'https://www.linkedin.com/m/logout',
};

// --- Helper Functions ---

/**
 * Constructs the LinkedIn authorization URL.
 *
 * @param {string} clientId - The LinkedIn Client ID.
 * @param {string} scope - The requested scopes.
 * @param {string} redirectUri - The redirect URI.
 * @returns {string} The fully constructed authorization URL.
 */
const getAuthorizationUrl = (
  clientId: string,
  scope: string,
  redirectUri: string,
) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scope,
  });

  return `${LINKEDIN_URLS.AUTHORIZATION}?${params.toString()}`;
};

/**
 * Parameters for the handleAuthCallback function.
 */
interface HandleAuthCallbackParams {
  url: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  onSuccess: (profileData: LinkedInProfile) => void;
  onError: (error: Error) => void;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
}

/**
 * Handles the LinkedIn authentication callback.
 * Exchanges the authorization code for an access token and fetches the user profile.
 *
 * @param {HandleAuthCallbackParams} params - The parameters for authentication.
 * @param {string} params.url - The callback URL containing the authorization code.
 * @param {string} params.clientId - The LinkedIn Client ID.
 * @param {string} params.clientSecret - The LinkedIn Client Secret.
 * @param {string} params.redirectUri - The redirect URI used in the initial authorization request.
 * @param {function} params.onSuccess - Callback function called with the profile data on success.
 * @param {function} params.onError - Callback function called with an error object on failure.
 * @param {function} params.setIsLoading - State setter to control the loading indicator.
 * @returns {Promise<void>}
 */
const handleAuthCallback = async ({
  url,
  clientId,
  clientSecret,
  redirectUri,
  onSuccess,
  onError,
  setIsLoading,
}: HandleAuthCallbackParams) => {
  try {
    setIsLoading(true);

    const params = new URL(url).searchParams;
    const authCode = params.get('code');
    const errorDescription = params.get('error_description');

    if (errorDescription) {
      throw new Error(errorDescription);
    }

    if (!authCode) {
      throw new Error('Authentication failed. No authorization code found.');
    }

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: authCode,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch(LINKEDIN_URLS.ACCESS_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      throw new Error(
        errorData.error_description ||
          `Failed to get access token: ${tokenResponse.statusText}`,
      );
    }

    const tokenData: LinkedInTokenResponse = await tokenResponse.json();
    const { access_token } = tokenData;

    if (!access_token) {
      throw new Error('Authentication failed. No access token received.');
    }

    const profileResponse = await fetch(LINKEDIN_URLS.USER_INFO, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!profileResponse.ok) {
      const errorData = await profileResponse.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          `Failed to fetch profile: ${profileResponse.statusText}`,
      );
    }

    const profileData: LinkedInProfile = await profileResponse.json();

    if (!profileData) {
      throw new Error('Failed to parse profile data.');
    }

    onSuccess(profileData);
  } catch (error: any) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';

    if (errorMessage.toLowerCase().includes('network request failed')) {
      onError(
        new Error('Network error. Please check your internet connection.'),
      );
    } else {
      onError(new Error(errorMessage));
    }
  } finally {
    setIsLoading(false);
  }
};

// --- Components ---

/**
 * Default header component for the modal.
 * Displays a close button.
 *
 * @param {Object} props - Component props.
 * @param {function} props.onClose - Function to close the modal.
 */
const DefaultHeader = ({ onClose }: { onClose: () => void }) => (
  <View style={styles.defaultHeader}>
    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
      <Text style={styles.closeButtonText}>Close</Text>
    </TouchableOpacity>
  </View>
);

/**
 * Default loading component.
 * Displays an ActivityIndicator centered on the screen.
 */
const DefaultLoading = () => (
  <View style={styles.loadingOverlay}>
    <ActivityIndicator size="large" color="#0077B5" />
  </View>
);

/**
 * LinkedInModal Component.
 *
 * A modal component that loads a WebView to handle LinkedIn OAuth2 authentication.
 *
 * @component
 * @example
 * ```tsx
 * <LinkedInModal
 *   isVisible={showLinkedInModal}
 *   clientId="YOUR_CLIENT_ID"
 *   clientSecret="YOUR_CLIENT_SECRET"
 *   redirectUri="YOUR_REDIRECT_URI"
 *   onSuccess={(user) => console.log(user)}
 *   onError={(error) => console.error(error)}
 *   onClose={() => setShowLinkedInModal(false)}
 * />
 * ```
 */
export const LinkedInModal: React.FC<LinkedInModalProps> = ({
  isVisible,
  clientId = '',
  clientSecret = '',
  scope = 'openid email profile',
  redirectUri = '',
  onSuccess = () => {},
  onError = () => {},
  onClose = () => {},
  onLogout = () => {},
  logout = false,
  renderHeader,
  renderLoading,
  containerStyle,
  wrapperStyle,
  closeOnSuccess = true,
  modalProps = {
    animationType: 'slide',
  },
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [authUrl, setAuthUrl] = useState('');

  useEffect(() => {
    if (isVisible && !logout && clientId && redirectUri) {
      setAuthUrl(getAuthorizationUrl(clientId, scope, redirectUri));
    }
  }, [isVisible, logout, clientId, scope, redirectUri]);

  const handleNavigationStateChange = (event: ShouldStartLoadRequest) => {
    const { url } = event;

    if (logout) {
      return true;
    }

    // Check if this is our redirect URL containing the authorization code
    if (url.startsWith(redirectUri) && url.includes('code=')) {
      handleAuthCallback({
        url,
        clientId,
        clientSecret,
        redirectUri,
        onSuccess: data => {
          onSuccess(data);
          if (closeOnSuccess) {
            onClose();
          }
        },
        onError,
        setIsLoading,
      });
      return false;
    }

    // Check for OAuth errors
    if (url.includes('error=')) {
      const error =
        new URL(url).searchParams.get('error_description') || 'Unknown error';
      onError(new Error(error));
      onClose();
      return false;
    }

    return true;
  };

  const handleLogoutNavigation = (event: WebViewNavigation) => {
    if (
      event.url.includes('/home') ||
      event.url.includes('/session_redirect') ||
      event.url.includes('login')
    ) {
      onLogout();
      onClose();
    }
  };

  if (!clientId || !redirectUri || !clientSecret) {
    if (!logout && isVisible) {
      console.warn(
        'LinkedInModal: Missing required props (clientId, clientSecret, or redirectUri)',
      );
      return (
        <View>
          <Text style={styles.errorText}>
            Missing required props (clientId, clientSecret, or redirectUri)
          </Text>
        </View>
      );
    }
  }

  return (
    <Modal
      visible={isVisible}
      animationType={modalProps.animationType || 'slide'}
      onRequestClose={onClose}
      transparent={false}
      {...modalProps}
    >
      <SafeAreaView style={[styles.container, containerStyle]}>
        <View style={[styles.wrapper, wrapperStyle]}>
          {renderHeader ? (
            renderHeader({ onClose })
          ) : (
            <DefaultHeader onClose={onClose} />
          )}
          <View style={styles.webViewContainer}>
            {logout ? (
              <WebView
                source={{ uri: LINKEDIN_URLS.LOG_OUT }}
                style={styles.webView}
                javaScriptEnabled
                domStorageEnabled
                sharedCookiesEnabled
                thirdPartyCookiesEnabled
                onNavigationStateChange={handleLogoutNavigation}
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
              />
            ) : (
              <WebView
                ref={webViewRef}
                source={{ uri: authUrl }}
                onShouldStartLoadWithRequest={handleNavigationStateChange}
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
                onError={err => onError(new Error(err.nativeEvent.description))}
                style={styles.webView}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState={true}
                renderLoading={() => <View />} // Handled by our custom overlay
              />
            )}

            {isLoading &&
              (renderLoading ? renderLoading() : <DefaultLoading />)}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  wrapper: {
    flex: 1,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1000,
  },
  defaultHeader: {
    height: 54,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default LinkedInModal;

// // --- Types ---
// export interface LinkedInProfile {
//   sub: string;
//   email_verified?: boolean;
//   name: string;
//   locale: {
//     country: string;
//     language: string;
//   };
//   given_name: string;
//   family_name: string;
//   email?: string;
//   picture: string;
//   [key: string]: any;
// }

// export interface LinkedInTokenResponse {
//   access_token: string;
//   expires_in: number;
//   scope: string;
//   token_type: string;
//   id_token?: string;
// }

// export interface LinkedInModalProps {
//   isVisible: boolean;
//   clientId?: string;
//   clientSecret?: string;
//   scope?: string;
//   redirectUri?: string;
//   onSuccess?: (user: LinkedInProfile) => void;
//   onError?: (error: Error) => void;
//   onClose?: () => void;
//   logout?: boolean;
//   onLogout?: () => void;
//   renderHeader?: (props: { onClose: () => void }) => React.ReactNode;
//   renderLoading?: () => React.ReactNode;
//   containerStyle?: StyleProp<ViewStyle>;
//   wrapperStyle?: StyleProp<ViewStyle>;
//   closeOnSuccess?: boolean;
//   modalProps?: Partial<Omit<ModalProps, 'visible'>>;
// }

// // --- Constants ---

// const LINKEDIN_URLS = {
//   AUTHORIZATION: 'https://www.linkedin.com/oauth/v2/authorization',
//   ACCESS_TOKEN: 'https://www.linkedin.com/oauth/v2/accessToken',
//   USER_INFO: 'https://api.linkedin.com/v2/userinfo',
//   LOG_OUT: 'https://www.linkedin.com/m/logout',
// };

// // --- Helper Functions ---

// const getAuthorizationUrl = (
//   clientId: string,
//   scope: string,
//   redirectUri: string,
// ) => {
//   const params = new URLSearchParams({
//     response_type: 'code',
//     client_id: clientId,
//     redirect_uri: redirectUri,
//     scope: scope,
//   });

//   return `${LINKEDIN_URLS.AUTHORIZATION}?${params.toString()}`;
// };

// interface HandleAuthCallbackParams {
//   url: string;
//   clientId: string;
//   clientSecret: string;
//   redirectUri: string;
//   onSuccess: (profileData: LinkedInProfile) => void;
//   onError: (error: Error) => void;
//   setIsLoading: Dispatch<SetStateAction<boolean>>;
// }

// /**
//  * Handles the LinkedIn authentication callback.
//  * Exchanges the authorization code for an access token and fetches the user profile.
//  *
//  * @param {HandleAuthCallbackParams} params - The parameters for authentication.
//  * @param {string} params.url - The callback URL containing the authorization code.
//  * @param {string} params.clientId - The LinkedIn Client ID.
//  * @param {string} params.clientSecret - The LinkedIn Client Secret.
//  * @param {string} params.redirectUri - The redirect URI used in the initial authorization request.
//  * @param {function} params.onSuccess - Callback function called with the profile data on success.
//  * @param {function} params.onError - Callback function called with an error object on failure.
//  * @param {function} params.setIsLoading - State setter to control the loading indicator.
//  */
// const handleAuthCallback = async ({
//   url,
//   clientId,
//   clientSecret,
//   redirectUri,
//   onSuccess,
//   onError,
//   setIsLoading,
// }: HandleAuthCallbackParams) => {
//   try {
//     setIsLoading(true);

//     const params = new URL(url).searchParams;
//     const authCode = params.get('code');
//     const errorDescription = params.get('error_description');

//     if (errorDescription) {
//       throw new Error(errorDescription);
//     }

//     if (!authCode) {
//       throw new Error('Authentication failed. No authorization code found.');
//     }

//     const tokenParams = new URLSearchParams({
//       grant_type: 'authorization_code',
//       code: authCode,
//       client_id: clientId,
//       client_secret: clientSecret,
//       redirect_uri: redirectUri,
//     });

//     const tokenResponse = await fetch(LINKEDIN_URLS.ACCESS_TOKEN, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/x-www-form-urlencoded',
//       },
//       body: tokenParams.toString(),
//     });

//     if (!tokenResponse.ok) {
//       const errorData = await tokenResponse.json().catch(() => ({}));
//       throw new Error(
//         errorData.error_description ||
//         `Failed to get access token: ${tokenResponse.statusText}`,
//       );
//     }

//     const tokenData: LinkedInTokenResponse = await tokenResponse.json();
//     const { access_token } = tokenData;

//     if (!access_token) {
//       throw new Error('Authentication failed. No access token received.');
//     }

//     const profileResponse = await fetch(LINKEDIN_URLS.USER_INFO, {
//       method: 'GET',
//       headers: {
//         Authorization: `Bearer ${access_token}`,
//       },
//     });

//     if (!profileResponse.ok) {
//       const errorData = await profileResponse.json().catch(() => ({}));
//       throw new Error(
//         errorData.message ||
//         `Failed to fetch profile: ${profileResponse.statusText}`,
//       );
//     }

//     const profileData: LinkedInProfile = await profileResponse.json();

//     if (!profileData) {
//       throw new Error('Failed to parse profile data.');
//     }

//     onSuccess(profileData);
//   } catch (error: any) {
//     const errorMessage =
//       error instanceof Error ? error.message : 'An unknown error occurred';

//     if (errorMessage.toLowerCase().includes('network request failed')) {
//       onError(
//         new Error('Network error. Please check your internet connection.'),
//       );
//     } else {
//       onError(new Error(errorMessage));
//     }
//   } finally {
//     setIsLoading(false);
//   }
// };

// // --- Components ---
// const DefaultHeader = ({ onClose }: { onClose: () => void }) => (
//   <View style={styles.defaultHeader}>
//     <TouchableOpacity onPress={onClose} style={styles.closeButton}>
//       <Text style={styles.closeButtonText}>x</Text>
//     </TouchableOpacity>
//   </View>
// );

// const DefaultLoading = () => (
//   <View style={styles.loadingOverlay}>
//     <ActivityIndicator size="large" color="#0077B5" />
//   </View>
// );

// export const LinkedInModal: React.FC<LinkedInModalProps> = ({
//   isVisible,
//   clientId = '',
//   clientSecret = '',
//   scope = 'openid email profile',
//   redirectUri = '',
//   onSuccess = () => { },
//   onError = () => { },
//   onClose = () => { },
//   onLogout = () => { },
//   logout = false,
//   renderHeader,
//   renderLoading,
//   containerStyle,
//   wrapperStyle,
//   closeOnSuccess = true,
//   modalProps = {
//     animationType: 'slide',
//   },
// }) => {
//   const webViewRef = useRef<WebView>(null);
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const [authUrl, setAuthUrl] = useState('');

//   useEffect(() => {
//     if (isVisible && !logout && clientId && redirectUri) {
//       setAuthUrl(getAuthorizationUrl(clientId, scope, redirectUri));
//     }
//   }, [isVisible, logout, clientId, scope, redirectUri]);

//   const handleNavigationStateChange = (event: ShouldStartLoadRequest) => {
//     const { url } = event;

//     if (logout) {
//       return true;
//     }

//     // Check if this is our redirect URL containing the authorization code
//     if (url.startsWith(redirectUri) && url.includes('code=')) {
//       handleAuthCallback({
//         url,
//         clientId,
//         clientSecret,
//         redirectUri,
//         onSuccess: data => {
//           onSuccess(data);
//           if (closeOnSuccess) {
//             onClose();
//           }
//         },
//         onError,
//         setIsLoading,
//       });
//       return false;
//     }

//     // Check for OAuth errors
//     if (url.includes('error=')) {
//       const error =
//         new URL(url).searchParams.get('error_description') || 'Unknown error';
//       onError(new Error(error));
//       onClose();
//       return false;
//     }

//     return true;
//   };

//   const handleLogoutNavigation = (event: WebViewNavigation) => {
//     if (
//       event.url.includes('/home') ||
//       event.url.includes('/session_redirect') ||
//       event.url.includes('login')
//     ) {
//       onLogout();
//       onClose();
//     }
//   };

//   if (!clientId || !redirectUri || !clientSecret) {
//     if (!logout && isVisible) {
//       console.warn(
//         'LinkedInModal: Missing required props (clientId, clientSecret, or redirectUri)',
//       );
//       return (
//         <View>
//           <Text style={styles.errorText}>
//             Missing required props (clientId, clientSecret, or redirectUri)
//           </Text>
//         </View>
//       );
//     }
//   }

//   return (
//     <Modal
//       visible={isVisible}
//       animationType={modalProps.animationType || 'slide'}
//       onRequestClose={onClose}
//       transparent={false}
//       {...modalProps}
//     >
//       <SafeAreaView style={[styles.container, containerStyle]}>
//         <View style={[styles.wrapper, wrapperStyle]}>
//           {renderHeader ? (
//             renderHeader({ onClose })
//           ) : (
//             <DefaultHeader onClose={onClose} />
//           )}
//           <View style={styles.webViewContainer}>
//             {logout ? (
//               <WebView
//                 source={{ uri: LINKEDIN_URLS.LOG_OUT }}
//                 style={styles.webView}
//                 javaScriptEnabled
//                 domStorageEnabled
//                 sharedCookiesEnabled
//                 thirdPartyCookiesEnabled
//                 onNavigationStateChange={handleLogoutNavigation}
//                 onLoadStart={() => setIsLoading(true)}
//                 onLoadEnd={() => setIsLoading(false)}
//               />
//             ) : (
//               <WebView
//                 ref={webViewRef}
//                 source={{ uri: authUrl }}
//                 onShouldStartLoadWithRequest={handleNavigationStateChange}
//                 onLoadStart={() => setIsLoading(true)}
//                 onLoadEnd={() => setIsLoading(false)}
//                 onError={err => onError(new Error(err.nativeEvent.description))}
//                 style={styles.webView}
//                 javaScriptEnabled
//                 domStorageEnabled
//                 startInLoadingState={true}
//                 renderLoading={() => <View />} // Handled by our custom overlay
//               />
//             )}

//             {isLoading &&
//               (renderLoading ? renderLoading() : <DefaultLoading />)}
//           </View>
//         </View>
//       </SafeAreaView>
//     </Modal>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },
//   wrapper: {
//     flex: 1,
//   },
//   webViewContainer: {
//     flex: 1,
//     position: 'relative',
//   },
//   webView: {
//     flex: 1,
//   },
//   loadingOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'rgba(255, 255, 255, 0.8)',
//     zIndex: 1000,
//   },
//   defaultHeader: {
//     height: 54,
//     flexDirection: 'row',
//     justifyContent: 'flex-end',
//     alignItems: 'center',
//     paddingHorizontal: 10,
//     borderBottomWidth: 1,
//     borderBottomColor: '#e0e0e0',
//     backgroundColor: '#f8f8f8',
//   },
//   closeButton: {
//     padding: 10,
//   },
//   closeButtonText: {
//     fontSize: 24,
//     color: '#333',
//     fontWeight: 'bold',
//   },
//   errorText: {
//     color: 'red',
//     fontSize: 16,
//     fontWeight: 'bold',
//     textAlign: 'center',
//   },
// });

// export default LinkedInModal;
