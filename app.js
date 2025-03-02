// app.js
const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const cors = require("cors");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];

	if (!token) {
		return res.status(401).json({ error: "Missing authentication token" });
	}

	try {
		const {
			data: { user },
			error,
		} = await supabase.auth.getUser(token);

		if (error) {
			return res.status(403).json({ error: "Invalid or expired token" });
		}

		req.user = user;
		next();
	} catch (error) {
		return res.status(500).json({ error: "Authentication error" });
	}
};

// 1. Login with username and password
app.post("/api/auth/login", async (req, res) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ error: "Email and password are required" });
	}

	try {
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			return res.status(401).json({ error: error.message });
		}

		return res.status(200).json({
			message: "Login successful",
			user: data.user,
			session: data.session,
		});
	} catch (error) {
		return res.status(500).json({ error: "Server error during login" });
	}
});

// Enhanced registration endpoint
app.post("/api/auth/register", async (req, res) => {
	const { email, password, username, full_name, phone } = req.body;

	// Validate required fields
	if (!email || !password) {
		return res.status(400).json({ error: "Email and password are required" });
	}

	try {
		// First create the user in Supabase Auth
		const { data: authData, error: authError } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					username,
					full_name,
					phone,
					created_at: new Date().toISOString(),
				},
			},
		});

		if (authError) {
			return res.status(400).json({ error: authError.message });
		}

		// If you have a separate profiles table, you can create an entry here
		if (authData.user) {
			const { data: profileData, error: profileError } = await supabase
				.from("profiles")
				.insert([
					{
						id: authData.user.id,
						username,
						full_name,
						email,
						phone,
						created_at: new Date().toISOString(),
					},
				]);

			if (profileError) {
				console.error("Error creating profile record:", profileError);
				// We don't need to fail the request if this happens, as the auth is successful
			}
		}

		return res.status(201).json({
			message: "Registration successful",
			user: authData.user,
		});
	} catch (error) {
		console.error("Server error during registration:", error);
		return res.status(500).json({ error: "Server error during registration" });
	}
});

// 2. Change Profile
app.put("/api/user/profile", authenticateToken, async (req, res) => {
	const { username, full_name, avatar_url, phone } = req.body;
	const userId = req.user.id;

	try {
		// Update user metadata in Auth
		const { data, error } = await supabase.auth.updateUser({
			data: {
				username,
				full_name,
				avatar_url,
				phone,
				updated_at: new Date().toISOString(),
			},
		});

		if (error) {
			return res.status(400).json({ error: error.message });
		}

		// Update profile in profiles table if you have one
		const { data: profileData, error: profileError } = await supabase
			.from("profiles")
			.update({
				username,
				full_name,
				avatar_url,
				phone,
				updated_at: new Date().toISOString(),
			})
			.eq("id", userId);

		if (profileError) {
			console.error("Error updating profile record:", profileError);
		}

		return res.status(200).json({
			message: "Profile updated successfully",
			user: data.user,
		});
	} catch (error) {
		return res
			.status(500)
			.json({ error: "Server error during profile update" });
	}
});

// 3. Change Password
app.put("/api/user/password", authenticateToken, async (req, res) => {
	const { password } = req.body;

	if (!password) {
		return res.status(400).json({ error: "New password is required" });
	}

	try {
		const { data, error } = await supabase.auth.updateUser({
			password,
		});

		if (error) {
			return res.status(400).json({ error: error.message });
		}

		return res.status(200).json({ message: "Password updated successfully" });
	} catch (error) {
		return res
			.status(500)
			.json({ error: "Server error during password update" });
	}
});

// Logout endpoint
app.post("/api/auth/logout", authenticateToken, async (req, res) => {
	try {
		const { error } = await supabase.auth.signOut();

		if (error) {
			return res.status(400).json({ error: error.message });
		}

		return res.status(200).json({ message: "Logout successful" });
	} catch (error) {
		return res.status(500).json({ error: "Server error during logout" });
	}
});

// Start the server
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

module.exports = app;
