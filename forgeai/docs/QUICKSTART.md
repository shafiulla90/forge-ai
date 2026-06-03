# Quickstart Guide

Get up and running with Forge AI in less than 5 minutes.

---

## 🏁 Step 1: Launch Forge AI

Run the startup script in your project root:
- **Windows**: Double-click `start.bat`
- **macOS / Linux**: `./start.sh`

Your browser will automatically open to `http://localhost:3000`.

---

## 🎨 Step 2: Experience Onboarding

1. You will be greeted by the **Welcome Splash Screen**.
2. Click **Get Started** to start the guided onboarding walkthrough.
3. Swipe through the steps to learn about:
   - Conversational AI building.
   - Sandbox deployments.
   - Jira board integration.
   - Org health tracking.

---

## 🔑 Step 3: Zero-Key SFDX Connection

After onboarding, you will land on the **Salesforce Connection Picker** (`/setup`):
1. Forge AI automatically detects all Salesforce orgs stored locally by your **Salesforce CLI (SFDX)**.
2. Review the list of detected orgs (showing aliases, usernames, and Sandbox vs Production).
3. Click **Connect** next to the org you want to work on.
4. Forge AI will securely extract the credentials locally, encrypt them, register them in the database, and automatically redirect you to the **Org Dashboard**.

*No Salesforce Connected App setup, consumer keys, or manual logins needed!*

---

## 💬 Step 4: Build a Feature with AI

Once connected to your dashboard:
1. Select the **AI Chat** module from the navigation sidebar.
2. Describe the feature you want to build in plain English, for example:
   > "Create a trigger on Contact that validates that the email field is not empty before saving, and write a test class with 100% coverage."
3. Forge AI will generate a detailed **Implementation Plan** and the code.
4. Review the generated Apex trigger and test class directly in the UI.

---

## 🚀 Step 5: Deploy & Verify

1. Click **Deploy Metadata** on the generated plan.
2. Monitor the deployment progress block-by-block.
3. The deployment page will compile files, push them to your Salesforce Sandbox, and execute the test classes automatically.
4. If validation succeeds, your changes are live! You can verify them directly in your Salesforce Sandbox org.
