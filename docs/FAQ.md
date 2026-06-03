# Frequently Asked Questions (FAQ)

---

## ❓ What is Forge AI?
Forge AI is an interactive developer tool that enables conversational software development for Salesforce. You describe what you want to build in plain English, and the AI plans, writes, and deploys Apex classes, triggers, and Flow structures to your sandboxes.

---

## ❓ Is my Salesforce token secure?
Yes. Your Salesforce tokens are:
1. **Decrypted locally** only on your machine using your own Salesforce CLI.
2. **Encrypted with AES-256-GCM** using the secret `ENCRYPTION_KEY` from your local `.env.local` file before being saved to the database.
3. Accessible only by your own Next.js backend server.

---

## ❓ Does Forge AI access my production data?
No. Forge AI requests and operates on **Salesforce Metadata only**. It reads metadata schemas, Apex classes, triggers, and Flow structures to contextualize the AI. It does not read, export, or modify any business record data (e.g. Accounts, Contacts, Leads).

---

## ❓ What metadata types are supported?
Forge AI supports AI-assisted generation, analysis, and deployment for:
- Custom Objects & Fields
- Apex Classes & Triggers
- Salesforce Flows
- Profiles & Permission Sets
- Page Layouts & Lightning Web Components (LWC)

---

## ❓ Can I deploy to Production orgs?
Yes, but we strongly recommend deploying changes to **Sandbox or Developer Edition orgs** first. This allows you to verify generated code, run test cases, and ensure no business disruption before moving metadata to production.
