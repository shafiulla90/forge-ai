# Forge AI - The Conversational Salesforce Builder

Forge AI enables conversational software development for Salesforce. Describe features, triggers, fields, or integrations in plain English, and watch the AI plan, generate, and deploy validated metadata directly to your Salesforce sandboxes.

---

## 🚀 Quick Start (Installer)

Run the automated installer for your operating system to set up packages, environment configuration, database tables, and validation checks:

### Windows (Double-Click)
Double-click `install.bat` in the project root.

### macOS & Linux
Run:
```bash
chmod +x install.sh start.sh
./install.sh
```

---

## 🏃 Starting the Application

Once the installation completes, start the server and load the web dashboard:
- **Windows**: Double-click `start.bat`
- **macOS / Linux**: `./start.sh`

This launches the Next.js server and automatically opens `http://localhost:3000` in your default browser.

---

## 🐳 Running with Docker

You can run Forge AI in containerized environments. Ensure your `.env.local` is configured first, then build and run the services:

```bash
docker-compose up --build
```

The app will run on port `3000`.

---

## 📚 Documentation & Guides

For deep-dives into configuration, integrations, and deployment, review our documentation files:

- 📋 **[Installation Guide](docs/INSTALLATION.md)**: Details on package requirements, environment keys, and running the setup wizard.
- 🏁 **[Quickstart Guide](docs/QUICKSTART.md)**: Walkthrough of your first 5 minutes using conversational building and sandbox deployments.
- 🔌 **[Salesforce CLI (SFDX) Setup](docs/SFDX-SETUP.md)**: Explains the Zero-Key local connection scans and local token decryption.
- 💾 **[Supabase Database Configuration](docs/SUPABASE-SETUP.md)**: Setup, schema migration structure, and Postgres connection.
- 🔍 **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)**: Solutions for common database connection and credential issues.
- ❓ **[Frequently Asked Questions (FAQ)](docs/FAQ.md)**: Functional and security questions.
