# Installation Guide

Forge AI is designed for zero-configuration, automated setup. You can run it locally or inside Docker.

---

## 📋 Prerequisites

Ensure your machine has the following tools installed before starting:
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **Salesforce CLI** (Optional: required for local Zero-Key org authentication)

---

## ⚡ 1. Local Automated Installation

The easiest way to set up Forge AI is using the provided OS installers in the root of the project.

### Windows (Double-Click)
1. Double-click `install.bat`.
2. The installer will automatically run `npm install` to load all packages.
3. The interactive configuration wizard will launch. Follow the prompts.
4. The wizard will run database migrations on your Supabase instance.
5. Setup will run validation checks to ensure everything connects properly.

### macOS & Linux (Terminal)
1. Open your terminal in the project directory.
2. Grant execution permissions:
   ```bash
   chmod +x install.sh start.sh
   ```
3. Run the installer:
   ```bash
   ./install.sh
   ```
4. Follow the configuration prompts in the interactive terminal.

---

## ⚙️ 2. Configuration Options

During the interactive wizard (`scripts/setup.js`), you will be asked for:

1. **Anthropic API Key (`ANTHROPIC_API_KEY`)**: Used by the AI Conversation module to generate code, triggers, and deployment plans.
2. **Supabase URL (`NEXT_PUBLIC_SUPABASE_URL`)** & **Anon Key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)**: Connection details to communicate with your Supabase database.
3. **Supabase Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`)**: Required to authenticate backend database connections.
4. **Postgres Database URL (`DATABASE_URL`)**: Connection string to run schema migrations and setup your tables automatically.

*Note: The wizard automatically generates a random 32-byte hexadecimal `ENCRYPTION_KEY` if it does not exist in your environment. This key encrypts your Salesforce tokens locally before database storage.*

---

## 🚀 3. Starting the Application

Once installation completes, you can start the application at any time using:

### Windows
Double-click `start.bat` (or run it via command prompt).

### macOS & Linux
Run:
```bash
./start.sh
```

This script will:
- Verify `.env.local` exists and passes validation.
- Start the Next.js development server.
- Automatically launch `http://localhost:3000` in your default browser.
