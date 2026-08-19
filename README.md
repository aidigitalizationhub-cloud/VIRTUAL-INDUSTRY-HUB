# 🏫 UG Virtual Industry Hub

Welcome to the **University of Ghana (UG) Virtual Industry Hub**, a state-of-the-art full-stack platform designed to connect academic researchers, student innovators, industry partners, investors, and administrative managers to foster collaborative research and commercialization.

This platform bridges the gap between scientific discovery at the **Legon Campus** and real-world market adoption across **Diagnostics**, **Vaccines**, and **Pharmaceuticals**.

---

## 🎨 Visual Preview & Design System

The application is built using a custom design system styled to reflect the academic authority of the University of Ghana paired with high-contrast, professional technological interfaces:
- **UG Navy** (`#1a1a4b`): Branding, headers, and dashboard accents conveying academic credibility and structural stability.
- **UG Teal** (`#0891b2`): Dynamic actions, hover states, metrics, and highlights designed to emphasize innovation.
- **Micro-interactions**: Powered by `motion` for smooth card entries, modal transitions, and responsive gestures.

---

## 🚀 Key Functional Modules

1. **🔬 Research Disclosure Pipeline (Researchers)**
   - Draft, structure, and submit detailed academic innovations.
   - Dynamic stage tracking based on the standardized **Technology Readiness Level (TRL 1-9)**.
   - Upload technical publications and supplemental scientific diagrams securely.

2. **🤖 AI-Powered Intelligence Assistant & Scout (Gemini)**
   - **Legon Research Assistant**: An AI chat interface designed to answer contextual questions (Diagnostics, vaccines, pharma) with rich, academic history-aware reasoning.
   - **AI News Scout**: Automatically queries and cross-references global biomedical news feeds (such as Noguchi, WACCBIP, WHO) with current internal research projects to formulate smart suggestions. Includes custom-generated realistic graphic illustrations for each discovery feed.

3. **📊 Dynamic Role Portal Dashboards**
   - **Researcher Dashboard**: Tracks subbed disclosures, requested edits, AI-driven collaborative suggestions, and recent board interactions.
   - **Student Dashboard**: Connects students to active lab projects, internship matching boards, and research career directions.
   - **Partner/Investor Dashboard**: Filterable pipelines showcasing market-ready developments, licensing catalogs, and direct Expression of Interest (EOI) submissions.
   - **Admin/Director Dashboard**: High-level system metrics, user roles control, disclosure review panels, and logs tracking.

4. **🛰️ Semantic Similarity Analysis & Partner Matching**
   - Multi-modal profiling matching the researcher’s technical resume and questionnaire answers to global market funding strategies.
   - Built-in graceful fallbacks utilizing local keyword density parsing to ensure compatibility indexes calculate perfectly in restricted-key environments.

---

## 🛠️ Technological Stack

- **Frontend Core**: React 19 + TypeScript (strict mode)
- **Styling**: Tailwind CSS + custom theme configurations
- **Animations**: `motion`
- **Backend Architecture**: Node.js + Express (fast-loading bundler proxy using CJS server output)
- **Database / Auth**: Supabase (PostgreSQL engine + Row Level Security policies)
- **AI Integration**: `@google/genai` (Gemini model optimization suites) & `groq-sdk`

---

## 📋 Environment Configuration

Please establish a `.env` file at the root or specify these parameters within your hosting environment:

```env
# Supabase Backend Configuration
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# AI Orchestration Keys
GEMINI_API_KEY=your-gemini-api-key
VITE_GROQ_API_KEY=your-groq-api-key
```

---

## ⚙️ How to Get Started

### 1. Database Setup
Ensure that the PostgreSQL tables are configured cleanly inside your Supabase SQL Editor. Locate and run the setup commands listed in `/supabase_setup.sql`. This script optimizes:
- Profile generation tables (`profiles`)
- Research indexes (`projects`)
- Expression of interest triggers (`eois`)
- Global Scout discovery cache (`news`)

### 2. Installations
Install the required packages:
```bash
npm install
```

### 3. Running Locally
Run the server side compiler:
```bash
npm run dev
```
The server will boot up and bind to host `0.0.0.0` at port `3000`.

### 4. Compiling Production Builds
Build and package the production files:
```bash
npm run build
```
This script compiles the static React build, then wraps the backend `server.ts` into a self-contained bundle with high compatibility.

---

## 🛡️ RLS & Security Policy Safeguards

The database is built on top of high-integrity **Row-Level Security (RLS)** statements to restrict read/write authorization:
- **Public Select**: Anyone can browse approved, public projects or synchronized global intelligence news.
- **Self Profiles**: Users are permitted to edit or update their own user profiles.
- **Admin Elevation**: System Admins are granted full query scopes (`public.projects`, `public.profiles`) to control role elevations and disclosure approval states safely.

---

*Designed and engineered in alignment with the University of Ghana Office of Research, Innovation, and Development (ORID) directives.*

# VIRTUAL-INDUSTRY-HUB
