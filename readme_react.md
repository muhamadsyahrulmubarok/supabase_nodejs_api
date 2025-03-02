# React Native Integration Guide for Express Supabase Auth API

This guide explains how to integrate your React Native application with the Express Supabase Auth API, covering authentication, profile management, and password changes.

## Table of Contents

- [Setup](#setup)
- [API Integration](#api-integration)
  - [Authentication](#authentication)
  - [User Profile](#user-profile)
  - [Password Management](#password-management)
- [Complete Example](#complete-example)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Setup

### 1. Add Required Dependencies

Install the necessary packages:

```bash
npm install axios @react-native-async-storage/async-storage
# or using yarn
yarn add axios @react-native-async-storage/async-storage
```

### 2. Create API Service

Create an API service file to handle all requests to your Express Supabase Auth API:

```javascript
// src/services/api.js
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Base URL of your Express Supabase Auth API
const API_URL = "http://your-api-url:3000/api";

// Token storage key
const TOKEN_KEY = "auth_token";
const USER_KEY = "user_data";

// Create axios instance
const apiClient = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

// Add a request interceptor to include the auth token
apiClient.interceptors.request.use(
	async (config) => {
		const token = await AsyncStorage.getItem(TOKEN_KEY);
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// API service functions
const apiService = {
	// Store authentication data
	storeAuthData: async (token, userData) => {
		try {
			await AsyncStorage.setItem(TOKEN_KEY, token);
			await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
		} catch (error) {
			console.error("Error storing auth data:", error);
		}
	},

	// Clear authentication data
	clearAuthData: async () => {
		try {
			await AsyncStorage.removeItem(TOKEN_KEY);
			await AsyncStorage.removeItem(USER_KEY);
		} catch (error) {
			console.error("Error clearing auth data:", error);
		}
	},

	// Get current user data
	getCurrentUser: async () => {
		try {
			const userData = await AsyncStorage.getItem(USER_KEY);
			return userData ? JSON.parse(userData) : null;
		} catch (error) {
			console.error("Error getting current user:", error);
			return null;
		}
	},

	// Check if user is authenticated
	isAuthenticated: async () => {
		try {
			const token = await AsyncStorage.getItem(TOKEN_KEY);
			return !!token;
		} catch (error) {
			console.error("Error checking authentication:", error);
			return false;
		}
	},
};

export default apiService;
export { apiClient, API_URL };
```

## API Integration

### Authentication

Create an authentication service:

```javascript
// src/services/auth.js
import { apiClient, apiService } from "./api";

const authService = {
	// Register a new user
	register: async (userData) => {
		try {
			const response = await apiClient.post("/auth/register", userData);
			return response.data;
		} catch (error) {
			console.error(
				"Registration error:",
				error.response?.data || error.message
			);
			throw error;
		}
	},

	// Login with email and password
	login: async (email, password) => {
		try {
			const response = await apiClient.post("/auth/login", { email, password });
			const { session, user } = response.data;

			// Store token and user data
			if (session && session.access_token) {
				await apiService.storeAuthData(session.access_token, user);
			}

			return response.data;
		} catch (error) {
			console.error("Login error:", error.response?.data || error.message);
			throw error;
		}
	},

	// Logout
	logout: async () => {
		try {
			await apiClient.post("/auth/logout");
			await apiService.clearAuthData();
			return { success: true };
		} catch (error) {
			console.error("Logout error:", error.response?.data || error.message);
			// Clear local data even if server request fails
			await apiService.clearAuthData();
			throw error;
		}
	},
};

export default authService;
```

### User Profile

Create a profile service:

```javascript
// src/services/profile.js
import { apiClient } from "./api";

const profileService = {
	// Update user profile
	updateProfile: async (profileData) => {
		try {
			const response = await apiClient.put("/user/profile", profileData);
			return response.data;
		} catch (error) {
			console.error(
				"Update profile error:",
				error.response?.data || error.message
			);
			throw error;
		}
	},

	// Change user password
	changePassword: async (newPassword) => {
		try {
			const response = await apiClient.put("/user/password", {
				password: newPassword,
			});
			return response.data;
		} catch (error) {
			console.error(
				"Change password error:",
				error.response?.data || error.message
			);
			throw error;
		}
	},
};

export default profileService;
```

## Complete Example

Here's a complete example of implementing the authentication flow in a React Native application:

### AuthContext.js

```javascript
// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from "react";
import authService from "../services/auth";
import apiService from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	// Check if user is already logged in
	useEffect(() => {
		const loadUser = async () => {
			try {
				const isAuth = await apiService.isAuthenticated();
				if (isAuth) {
					const userData = await apiService.getCurrentUser();
					setUser(userData);
				}
			} catch (error) {
				console.error("Error loading user:", error);
			} finally {
				setLoading(false);
			}
		};

		loadUser();
	}, []);

	// Register function
	const register = async (userData) => {
		setLoading(true);
		try {
			const response = await authService.register(userData);
			setLoading(false);
			return response;
		} catch (error) {
			setLoading(false);
			throw error;
		}
	};

	// Login function
	const login = async (email, password) => {
		setLoading(true);
		try {
			const response = await authService.login(email, password);
			setUser(response.user);
			setLoading(false);
			return response;
		} catch (error) {
			setLoading(false);
			throw error;
		}
	};

	// Logout function
	const logout = async () => {
		setLoading(true);
		try {
			await authService.logout();
			setUser(null);
		} catch (error) {
			console.error("Logout error:", error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				loading,
				login,
				logout,
				register,
				isAuthenticated: !!user,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
```

### Example Screens

#### Login Screen

```javascript
// src/screens/LoginScreen.js
import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext";

const LoginScreen = ({ navigation }) => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const { login, loading } = useAuth();

	const handleLogin = async () => {
		if (!email || !password) {
			Alert.alert("Error", "Please enter both email and password");
			return;
		}

		try {
			await login(email, password);
			// Navigation is typically handled by a navigation container listening to the auth state
		} catch (error) {
			Alert.alert(
				"Login Failed",
				error.response?.data?.error || "An error occurred during login"
			);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Login</Text>

			<TextInput
				style={styles.input}
				placeholder="Email"
				value={email}
				onChangeText={setEmail}
				autoCapitalize="none"
				keyboardType="email-address"
			/>

			<TextInput
				style={styles.input}
				placeholder="Password"
				value={password}
				onChangeText={setPassword}
				secureTextEntry
			/>

			<TouchableOpacity
				style={styles.button}
				onPress={handleLogin}
				disabled={loading}
			>
				<Text style={styles.buttonText}>
					{loading ? "Logging in..." : "Login"}
				</Text>
			</TouchableOpacity>

			<TouchableOpacity onPress={() => navigation.navigate("Register")}>
				<Text style={styles.link}>Don't have an account? Register</Text>
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 20,
		textAlign: "center",
	},
	input: {
		height: 50,
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 5,
		marginBottom: 15,
		paddingHorizontal: 10,
	},
	button: {
		backgroundColor: "#2196F3",
		height: 50,
		borderRadius: 5,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 15,
	},
	buttonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "bold",
	},
	link: {
		color: "#2196F3",
		textAlign: "center",
	},
});

export default LoginScreen;
```

#### Register Screen

```javascript
// src/screens/RegisterScreen.js
import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Alert,
	ScrollView,
} from "react-native";
import { useAuth } from "../context/AuthContext";

const RegisterScreen = ({ navigation }) => {
	const [formData, setFormData] = useState({
		email: "",
		password: "",
		username: "",
		full_name: "",
		phone: "",
	});

	const { register, loading } = useAuth();

	const handleChange = (field, value) => {
		setFormData({
			...formData,
			[field]: value,
		});
	};

	const handleRegister = async () => {
		if (!formData.email || !formData.password) {
			Alert.alert("Error", "Email and password are required");
			return;
		}

		try {
			await register(formData);
			Alert.alert(
				"Registration Successful",
				"You can now login with your credentials",
				[{ text: "OK", onPress: () => navigation.navigate("Login") }]
			);
		} catch (error) {
			Alert.alert(
				"Registration Failed",
				error.response?.data?.error || "An error occurred during registration"
			);
		}
	};

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text style={styles.title}>Register</Text>

			<TextInput
				style={styles.input}
				placeholder="Email *"
				value={formData.email}
				onChangeText={(value) => handleChange("email", value)}
				autoCapitalize="none"
				keyboardType="email-address"
			/>

			<TextInput
				style={styles.input}
				placeholder="Password *"
				value={formData.password}
				onChangeText={(value) => handleChange("password", value)}
				secureTextEntry
			/>

			<TextInput
				style={styles.input}
				placeholder="Username"
				value={formData.username}
				onChangeText={(value) => handleChange("username", value)}
			/>

			<TextInput
				style={styles.input}
				placeholder="Full Name"
				value={formData.full_name}
				onChangeText={(value) => handleChange("full_name", value)}
			/>

			<TextInput
				style={styles.input}
				placeholder="Phone"
				value={formData.phone}
				onChangeText={(value) => handleChange("phone", value)}
				keyboardType="phone-pad"
			/>

			<TouchableOpacity
				style={styles.button}
				onPress={handleRegister}
				disabled={loading}
			>
				<Text style={styles.buttonText}>
					{loading ? "Registering..." : "Register"}
				</Text>
			</TouchableOpacity>

			<TouchableOpacity onPress={() => navigation.navigate("Login")}>
				<Text style={styles.link}>Already have an account? Login</Text>
			</TouchableOpacity>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
		justifyContent: "center",
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 20,
		textAlign: "center",
	},
	input: {
		height: 50,
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 5,
		marginBottom: 15,
		paddingHorizontal: 10,
	},
	button: {
		backgroundColor: "#2196F3",
		height: 50,
		borderRadius: 5,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 15,
	},
	buttonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "bold",
	},
	link: {
		color: "#2196F3",
		textAlign: "center",
	},
});

export default RegisterScreen;
```

#### Profile Screen

```javascript
// src/screens/ProfileScreen.js
import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Alert,
	ScrollView,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import profileService from "../services/profile";

const ProfileScreen = () => {
	const { user, logout } = useAuth();
	const [loading, setLoading] = useState(false);
	const [profileData, setProfileData] = useState({
		username: user?.user_metadata?.username || "",
		full_name: user?.user_metadata?.full_name || "",
		phone: user?.user_metadata?.phone || "",
		avatar_url: user?.user_metadata?.avatar_url || "",
	});

	const handleChange = (field, value) => {
		setProfileData({
			...profileData,
			[field]: value,
		});
	};

	const handleUpdateProfile = async () => {
		setLoading(true);
		try {
			const response = await profileService.updateProfile(profileData);
			Alert.alert("Success", "Profile updated successfully");
		} catch (error) {
			Alert.alert(
				"Update Failed",
				error.response?.data?.error || "Failed to update profile"
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text style={styles.title}>My Profile</Text>

			<TextInput
				style={styles.input}
				placeholder="Username"
				value={profileData.username}
				onChangeText={(value) => handleChange("username", value)}
			/>

			<TextInput
				style={styles.input}
				placeholder="Full Name"
				value={profileData.full_name}
				onChangeText={(value) => handleChange("full_name", value)}
			/>

			<TextInput
				style={styles.input}
				placeholder="Phone"
				value={profileData.phone}
				onChangeText={(value) => handleChange("phone", value)}
				keyboardType="phone-pad"
			/>

			<TextInput
				style={styles.input}
				placeholder="Avatar URL"
				value={profileData.avatar_url}
				onChangeText={(value) => handleChange("avatar_url", value)}
			/>

			<TouchableOpacity
				style={styles.button}
				onPress={handleUpdateProfile}
				disabled={loading}
			>
				<Text style={styles.buttonText}>
					{loading ? "Updating..." : "Update Profile"}
				</Text>
			</TouchableOpacity>

			<TouchableOpacity
				style={[styles.button, styles.logoutButton]}
				onPress={logout}
			>
				<Text style={styles.buttonText}>Logout</Text>
			</TouchableOpacity>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 20,
		textAlign: "center",
	},
	input: {
		height: 50,
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 5,
		marginBottom: 15,
		paddingHorizontal: 10,
	},
	button: {
		backgroundColor: "#2196F3",
		height: 50,
		borderRadius: 5,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 15,
	},
	logoutButton: {
		backgroundColor: "#f44336",
	},
	buttonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "bold",
	},
});

export default ProfileScreen;
```

#### Change Password Screen

```javascript
// src/screens/ChangePasswordScreen.js
import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Alert,
} from "react-native";
import profileService from "../services/profile";

const ChangePasswordScreen = ({ navigation }) => {
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const handleChangePassword = async () => {
		if (!password) {
			Alert.alert("Error", "Password is required");
			return;
		}

		if (password !== confirmPassword) {
			Alert.alert("Error", "Passwords do not match");
			return;
		}

		setLoading(true);
		try {
			await profileService.changePassword(password);
			Alert.alert("Success", "Password changed successfully", [
				{ text: "OK", onPress: () => navigation.goBack() },
			]);
		} catch (error) {
			Alert.alert(
				"Error",
				error.response?.data?.error || "Failed to change password"
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Change Password</Text>

			<TextInput
				style={styles.input}
				placeholder="New Password"
				value={password}
				onChangeText={setPassword}
				secureTextEntry
			/>

			<TextInput
				style={styles.input}
				placeholder="Confirm New Password"
				value={confirmPassword}
				onChangeText={setConfirmPassword}
				secureTextEntry
			/>

			<TouchableOpacity
				style={styles.button}
				onPress={handleChangePassword}
				disabled={loading}
			>
				<Text style={styles.buttonText}>
					{loading ? "Changing Password..." : "Change Password"}
				</Text>
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 20,
		textAlign: "center",
	},
	input: {
		height: 50,
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 5,
		marginBottom: 15,
		paddingHorizontal: 10,
	},
	button: {
		backgroundColor: "#2196F3",
		height: 50,
		borderRadius: 5,
		justifyContent: "center",
		alignItems: "center",
	},
	buttonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "bold",
	},
});

export default ChangePasswordScreen;
```

### App.js with Navigation

```javascript
// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider, useAuth } from "./src/context/AuthContext";

// Import screens
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import ChangePasswordScreen from "./src/screens/ChangePasswordScreen";

const Stack = createNativeStackNavigator();

// Navigation based on authentication state
const AppNavigator = () => {
	const { isAuthenticated, loading } = useAuth();

	if (loading) {
		return null; // Or a loading screen
	}

	return (
		<NavigationContainer>
			<Stack.Navigator>
				{isAuthenticated ? (
					// Authenticated routes
					<>
						<Stack.Screen name="Profile" component={ProfileScreen} />
						<Stack.Screen
							name="ChangePassword"
							component={ChangePasswordScreen}
						/>
					</>
				) : (
					// Authentication routes
					<>
						<Stack.Screen
							name="Login"
							component={LoginScreen}
							options={{ headerShown: false }}
						/>
						<Stack.Screen name="Register" component={RegisterScreen} />
					</>
				)}
			</Stack.Navigator>
		</NavigationContainer>
	);
};

const App = () => {
	return (
		<AuthProvider>
			<AppNavigator />
		</AuthProvider>
	);
};

export default App;
```

## Best Practices

1. **Token Management**

   - Store tokens securely using AsyncStorage
   - Implement token refresh mechanisms for longer sessions
   - Clear tokens on logout

2. **Error Handling**

   - Provide meaningful error messages to users
   - Implement proper error boundaries
   - Add retry logic for network failures

3. **Security**

   - Validate input on client-side before submission
   - Implement password strength requirements
   - Use HTTPS for all API communication

4. **User Experience**

   - Show loading indicators during API operations
   - Implement form validation
   - Provide clear feedback on successful operations

5. **Code Organization**
   - Separate API calls into service files
   - Use context for shared state
   - Keep screens focused on presentation

## Troubleshooting

### Common Issues

1. **Authentication Issues**

   - **Problem**: Token not being sent with requests
   - **Solution**: Check your interceptor configuration and ensure AsyncStorage is working correctly

2. **Network Errors**

   - **Problem**: API requests failing
   - **Solution**: Verify API URL, check network connectivity, and ensure your backend server is running

3. **CORS Issues**

   - **Problem**: API rejecting requests due to CORS
   - **Solution**: Ensure your API has proper CORS headers configured

4. **State Management**
   - **Problem**: User state not updating after login/logout
   - **Solution**: Verify your context is properly updating state and all components are wrapped with the provider
