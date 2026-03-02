# GeoSentinel

AI-powered geofencing and blockchain-secured tourist safety monitoring app.

## Full Stack Setup (Frontend + Backend)

### 1. Backend

```bash
cd backend
npm install
npm run init-db   # Initialize SQLite database (creates geosentinel.db)
npm run dev       # Start API on http://localhost:3001
```

### 2. Frontend

In a new terminal:

```bash
cd ..   # back to project root
npm install
npm run dev       # Start frontend on http://localhost:8080
```

### 3. Run Both

- Open http://localhost:8080 for the app
- **User flow**: Get Started → User Login → enter phone/email → OTP (check backend console for OTP) → Profile Setup → Dashboard
- **Admin flow**: Get Started → Admin Login → enter phone (e.g. 9876543210) → OTP (check backend console) → Admin Dashboard

### Environment

Create `.env` in the project root to override API URL:
```
VITE_API_URL=http://localhost:3001
```

---

# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
