# Express Supabase Auth API

A Node.js Express API with Supabase integration that provides authentication, profile management, and password change functionality.

## Features

- 🔐 **Authentication**

  - Login with email and password
  - User registration with profile data
  - Secure logout

- 👤 **Profile Management**

  - Update user profile information
  - Store profile data in Supabase

- 🔑 **Password Management**
  - Change user password securely

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account (free tier works fine)

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/muhamadsyahrulmubarok/supabase_nodejs_api.git
cd supabase_nodejs_api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a Supabase account at [https://supabase.com](https://supabase.com)
2. Create a new project
3. Navigate to Project Settings > API to get your project URL and API key
4. Create the profiles table using the SQL in the Database section

### 4. Configure environment variables

Create a `.env` file in the root directory with the following content:

```
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key
```

Replace `your_supabase_url` and `your_supabase_service_key` with your actual Supabase project URL and API key.

### 5. Set up the profiles table in Supabase

Run the following SQL in the Supabase SQL Editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create policy that allows users to insert their own profile
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### 6. Run the application

Development mode with auto-restart on file changes:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## API Endpoints

### Authentication

#### Register a new user

```
POST /api/auth/register
```

Request body:

```json
{
	"email": "user@example.com",
	"password": "securepassword",
	"username": "username",
	"full_name": "John Doe",
	"phone": "+1234567890"
}
```

#### Login

```
POST /api/auth/login
```

Request body:

```json
{
	"email": "user@example.com",
	"password": "securepassword"
}
```

#### Logout

```
POST /api/auth/logout
```

Headers:

```
Authorization: Bearer your_jwt_token
```

### User Profile

#### Update profile

```
PUT /api/user/profile
```

Headers:

```
Authorization: Bearer your_jwt_token
```

Request body:

```json
{
	"username": "newusername",
	"full_name": "New Name",
	"avatar_url": "https://example.com/avatar.jpg",
	"phone": "+9876543210"
}
```

### Password Management

#### Change password

```
PUT /api/user/password
```

Headers:

```
Authorization: Bearer your_jwt_token
```

Request body:

```json
{
	"password": "newsecurepassword"
}
```

## Security

- JWT tokens are used for authentication
- Passwords are securely hashed by Supabase Auth
- Row Level Security (RLS) in Supabase ensures users can only access their own data

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400` - Bad Request (missing or invalid parameters)
- `401` - Unauthorized (invalid credentials)
- `403` - Forbidden (invalid token)
- `500` - Server Error

## Development

### Project Structure

```
express-supabase-auth-api/
├── app.js             # Main application file
├── package.json       # Project dependencies
├── .env               # Environment variables (not in git)
└── README.md          # Project documentation
```

### Recommended Tools

- Postman or Insomnia for API testing
- VS Code with ESLint and Prettier for code quality

### Implementation for React Native

Please refer to the [readme_react.md](readme_react.md) file for the React Native implementation.

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
