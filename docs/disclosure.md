# Role: Technology Transfer Product Developer, Researcher & System Design Expert

You are acting as a **senior product developer, technology-transfer researcher, AI/LLM architect, cybersecurity engineer, and system-design expert** working on an existing university technology-transfer platform.

Your task is to **research, analyze, design, and propose how an Intellectual Property (IP) Disclosure and Protection workflow should be integrated into the existing product**, while also designing an AI/LLM-powered system that can assist with project authenticity, IP-risk screening, prior-art checking, and technology-transfer triage.

## IMPORTANT: Research and understand before modifying anything

Do **NOT immediately modify the codebase**.

First inspect and understand the existing application architecture, including:

* Frontend framework and structure
* Backend/API architecture
* Authentication system
* User roles
* Database schema
* Supabase/PostgreSQL configuration
* RLS policies
* Project/idea submission workflow
* Researcher profiles
* Admin dashboard
* Existing AI/reviewer functionality
* Existing RAG implementation
* Existing document/file storage
* Existing notification system
* Existing project verification workflow
* Existing funding/collaboration workflow
* Existing APIs and third-party integrations

Trace the current researcher journey from:

**Registration → Profile → Project/Idea Creation → Submission → AI Review → Admin Review → Publication → Collaboration/Funding**

Understand where IP disclosure should naturally be introduced without unnecessarily disrupting the current product.

---

# PRIMARY OBJECTIVE

Design an integrated **IP Disclosure + AI Verification + Technology Transfer Review System**.

The system should allow a researcher to:

1. Create a research project, invention, technology, or idea.
2. Describe the technology at a high level.
3. Indicate whether the submission may contain intellectual property.
4. Declare whether the work has previously been publicly disclosed.
5. Declare ownership/funding/institutional involvement.
6. Identify potentially confidential information.
7. Submit the project for AI-assisted screening.
8. Receive an understandable IP-risk assessment.
9. Automatically identify projects that require institutional IP/TTO review.
10. Prevent potentially sensitive information from automatically becoming public.
11. Allow the institutional IP/TTO office to review the disclosure.
12. Allow the TTO/IP officer to approve, restrict, return, or recommend protection.
13. Publish only the information cleared for public technology-transfer activities.
14. Allow interested partners to request controlled access to additional information.

---

# IMPORTANT PRODUCT PRINCIPLE

The AI must NOT be presented as a lawyer or final IP authority.

The system should follow:

**AI = screening, extraction, classification, evidence gathering and triage**

**Human IP/TTO Officer = institutional review and final decision**

The AI must never definitively claim:

* "This invention is patentable."
* "This researcher owns the IP."
* "A patent will be granted."
* "This project is legally protected."
* "This disclosure is legally safe."

Instead it should produce recommendations such as:

* Potential patent-related subject matter detected.
* Potential confidential information detected.
* Public disclosure risk appears high.
* Ownership review recommended.
* Institutional IP review required.
* Further assessment recommended before publication.

---

# PART 1 — RESEARCH THE CURRENT PRODUCT

Inspect the repository thoroughly.

Create a document called:

`IP_DISCLOSURE_CURRENT_SYSTEM_ANALYSIS.md`

Document:

### A. Current architecture

* Frontend
* Backend
* Database
* Authentication
* Storage
* AI services
* RAG
* External APIs
* Deployment architecture

### B. Existing project workflow

Map exactly how a researcher currently creates and submits a project.

### C. Existing AI verification

Identify:

* Current models
* Current prompts
* Current APIs
* Existing embeddings
* RAG implementation
* Existing verification logic
* Existing scoring
* Existing failure handling

### D. Existing database

Identify relevant tables, relationships, RLS policies and permissions.

### E. Existing security architecture

Identify:

* Authentication
* Authorization
* RLS
* API protection
* Storage permissions
* Secrets management
* Logging
* Audit trails

Do not assume anything. Inspect the actual code.

---

# PART 2 — RESEARCH IP DISCLOSURE WORKFLOW

Research how modern university technology-transfer offices typically handle:

* Invention disclosures
* Confidential information
* Patent review
* Prior-art review
* Ownership
* Sponsored research
* Public disclosure
* Technology transfer
* Industry collaboration
* NDA/data-room workflows

Research relevant standards, institutional practices and authoritative sources.

Do not rely only on generic blogs.

Prioritize:

* University technology-transfer offices
* WIPO
* USPTO
* EPO
* Government guidance
* Established IP organizations
* Peer-reviewed literature
* Official institutional policies
* Appropriate patent databases

Clearly distinguish:

**Legal requirements**

from

**recommended product practices**

and

**our proposed product design**.

---

# PART 3 — DESIGN THE IP DISCLOSURE WORKFLOW

Design the workflow to fit naturally into the existing project submission process.

Recommended conceptual flow:

Researcher
↓
Create Project
↓
Technology Description
↓
IP Disclosure Questions
↓
Sensitive Information Classification
↓
AI IP Screening
↓
AI Authenticity / Prior-Art Screening
↓
Risk Assessment
↓
Human TTO Review if required
↓
Decision
↓
Public / Restricted / Confidential
↓
Technology Transfer Marketplace
↓
Partner Access Request
↓
Controlled Data Room

Determine whether this exact workflow is appropriate after analyzing the existing product.

---

# PART 4 — DESIGN THE RESEARCHER EXPERIENCE

Design the UI/UX for the IP section.

The researcher should be asked questions such as:

### IP status

* Does this project contain a potentially new invention or technology?
* Has the technology been publicly disclosed?
* Has a patent/application already been filed?
* Has a publication, conference presentation, thesis, poster, website or social-media post disclosed the invention?
* Was institutional funding/resources used?
* Was industry/sponsored funding involved?
* Does another organization/person own or contribute IP?
* Does the submission contain confidential information?
* Is there an NDA or confidentiality obligation?
* Is ownership known?

Include:

**Yes / No / Not sure**

Do not force researchers to make legal conclusions.

---

# PART 5 — PUBLIC VS CONFIDENTIAL INFORMATION

Design a three-level information model:

### LEVEL 1 — PUBLIC

Safe/high-level technology-transfer description.

Examples:

* Problem
* High-level solution
* Applications
* TRL
* Benefits
* Market opportunity
* Collaboration requirements

### LEVEL 2 — RESTRICTED

Information available only to approved collaborators/TTO.

### LEVEL 3 — CONFIDENTIAL

Potentially sensitive information such as:

* Detailed invention description
* Exact formulation
* Experimental parameters
* Source code
* Proprietary algorithms
* Unpublished results
* Technical drawings
* Sensitive datasets
* Patent strategy

Determine how these levels should map to the existing database and storage architecture.

---

# PART 6 — AI IP SCREENING MODEL

Research and recommend the most appropriate open-weight model for this task.

Consider models such as:

* Qwen
* Llama
* Mistral
* Other suitable open-weight models

Evaluate:

* License
* Reasoning ability
* Context length
* Fine-tuning capability
* Unsloth compatibility
* VRAM requirements
* Inference cost
* Self-hosting
* Privacy
* Structured JSON output
* Performance on classification/extraction tasks

The current preferred direction is:

**Qwen3 8B/14B + Unsloth + LoRA/QLoRA + vLLM**

but do not blindly accept this assumption. Research and validate it.

Produce:

`AI_MODEL_SELECTION.md`

with the recommendation and alternatives.

---

# PART 7 — WHAT THE MODEL SHOULD DO

Design separate AI tasks rather than one vague "IP AI".

Potential components:

### 1. IP Risk Classifier

Output:

* LOW
* MEDIUM
* HIGH

### 2. Potential IP Type Classifier

Possible categories:

* Patent
* Trade secret
* Copyright
* Trademark
* Industrial design
* Software
* Database/data rights
* Plant variety
* Other
* Unknown

### 3. Confidential Information Detector

Identify potentially sensitive sections.

### 4. Public Disclosure Risk Detector

Identify whether the researcher may have disclosed the invention publicly.

### 5. Ownership Review Detector

Identify situations requiring TTO review.

### 6. Authenticity / Consistency Checker

Check whether project claims are internally consistent and supported by available evidence.

### 7. Prior-Art / Similarity Search

Identify relevant:

* Patents
* Publications
* Research papers
* Existing technologies

### 8. Public Technology Teaser Generator

Generate a high-level public description that avoids unnecessary disclosure.

---

# PART 8 — AUTHENTICITY CHECKING

Research how the LLM should assist with determining whether project information appears credible.

Do NOT treat an LLM alone as proof of authenticity.

Design an evidence-based verification pipeline.

Potential workflow:

Project submission
↓
Claim extraction
↓
Entity extraction
↓
Citation/reference extraction
↓
Research literature search
↓
Patent search
↓
Institutional evidence
↓
Cross-source comparison
↓
Conflict detection
↓
Evidence score
↓
Human reviewer

The system should distinguish:

**Verified**

**Partially supported**

**Unverified**

**Contradicted**

**Insufficient evidence**

Do not use a single "AI says authentic" score without evidence.

---

# PART 9 — RAG ARCHITECTURE

Determine what information belongs in:

### Fine-tuned model

Use fine-tuning primarily for:

* Classification
* Extraction
* Structured output
* Triage behavior
* Consistent reasoning format

### RAG

Use RAG for changing knowledge such as:

* Institutional IP policies
* Technology-transfer policies
* Disclosure procedures
* Patent guidance
* Relevant literature
* Patent documents
* Approved external sources
* Institutional rules

Explain how these should work together.

---

# PART 10 — DATA PRIVACY AND SECURITY

Treat confidential research information as highly sensitive.

Design:

### Data minimization

Only send the information required for each AI task.

### Encryption

* Encryption in transit
* Encryption at rest
* Secure secrets

### Access control

Researcher
→ own projects

TTO officer
→ authorized institution

Admin
→ platform administration, not necessarily unrestricted confidential IP access

External collaborator
→ explicitly approved information only

### Storage

Confidential documents must use private storage.

Avoid public URLs.

Use controlled/signed access where appropriate.

### Audit logs

Track:

* Who accessed a disclosure
* Who viewed documents
* Who downloaded documents
* Who shared documents
* Who ran AI analysis
* Who changed permissions
* Who approved publication
* Who changed IP status

### AI privacy

Investigate:

* Whether hosted models retain prompts
* Whether provider data is used for training
* Data residency
* Contractual controls
* Institutional requirements
* Self-hosting

Recommend self-hosting for highly confidential production workflows where appropriate.

---

# PART 11 — INSTITUTIONAL IP OFFICE

> Design note: this section describes a possible future institution-scoped permission model. The current implementation uses a shared institutional TTO/IP queue, with role and workflow-status authorization rather than department, institution, or named-reviewer assignment filters. See `ip_disclosure_workflow.md` and `audit_implementation.md` for the implemented behavior.

Design a dedicated:

**IP / Technology Transfer Office Portal**

The institution should have its own accounts and roles.

Suggested roles:

* IP Officer
* Senior IP Officer
* TTO Director
* Patent/Legal Reviewer

Do not make every IP officer a platform super-admin.

Design institution-scoped permissions.

Example:

Institution A TTO
→ can review Institution A disclosures

Institution B TTO
→ cannot access Institution A confidential disclosures

---

# PART 12 — IP REVIEW STATUS

Design a state machine.

Potential states:

`DRAFT`

`SUBMITTED`

`AI_SCREENING`

`IP_REVIEW_REQUIRED`

`TTO_REVIEW`

`INFORMATION_REQUESTED`

`PROTECTION_RECOMMENDED`

`PROTECTION_IN_PROCESS`

`PUBLICATION_APPROVED`

`RESTRICTED`

`CONFIDENTIAL`

`CLOSED`

Determine the correct states and transitions after examining the existing project.

---

# PART 13 — DATABASE DESIGN

Design the required schema changes.

Potential entities:

* institutions
* institution_members
* ip_disclosures
* ip_screenings
* ip_findings
* ip_reviews
* ip_decisions
* ip_documents
* ip_access_requests
* data_room_files
* audit_logs
* prior_art_results
* evidence_sources

For every proposed table specify:

* Purpose
* Important columns
* Relationships
* Ownership
* RLS requirements
* Sensitive fields

Do not implement schema changes until the architecture is reviewed.

---

# PART 14 — API DESIGN

Design the API layer.

Potential endpoints:

`POST /api/ip/disclosures`

`GET /api/ip/disclosures/:id`

`POST /api/ip/screen`

`GET /api/ip/reviews`

`POST /api/ip/reviews/:id/decision`

`POST /api/ip/access-requests`

`GET /api/ip/audit`

`POST /api/ai/ip-triage`

`POST /api/ai/authenticity-check`

`POST /api/ai/prior-art-search`

Do not blindly use these endpoints; adapt them to the existing backend conventions.

---

# PART 15 — MODEL TRAINING PLAN

Design a training dataset for Unsloth.

The dataset should contain realistic labelled examples.

Each example should contain:

### Input

Research/project description.

### Labels

* IP risk
* IP type
* Confidentiality risk
* Disclosure risk
* Ownership review
* TTO review requirement
* Recommended action

### Explanation

Why the example received that classification.

Include examples across:

* Biotechnology
* Pharmaceuticals
* Vaccines
* Chemistry
* Medicine
* Engineering
* AI
* Software
* Agriculture
* Materials
* Energy
* Environmental science

Do not train production models directly on confidential researcher submissions without an approved institutional governance process.

---

# PART 16 — EVALUATION

Design an evaluation framework.

Measure:

* Precision
* Recall
* F1
* False negatives
* False positives
* Structured-output accuracy
* Evidence retrieval quality
* Disclosure-risk detection
* Human/TTO agreement
* Calibration
* Hallucination rate

For this use case, pay particular attention to:

**False negatives**

because missing potentially sensitive IP may be more harmful than over-flagging a project for human review.

Create a test set that is separate from training data.

---

# PART 17 — CURRENT SYSTEM INTEGRATION PLAN

After completing the research and architecture analysis, map each proposed component to the actual existing codebase.

Create:

`IP_INTEGRATION_PLAN.md`

Include:

| Existing Component | Current Implementation | Required Change          |
| ------------------ | ---------------------- | ------------------------ |
| Authentication     | ...                    | Add TTO role             |
| Project submission | ...                    | Add IP stage             |
| AI reviewer        | ...                    | Add IP triage            |
| Supabase           | ...                    | Add IP tables/RLS        |
| Storage            | ...                    | Private IP storage       |
| Admin              | ...                    | Add TTO dashboard        |
| Notifications      | ...                    | Add IP notifications     |
| RAG                | ...                    | Add IP knowledge sources |

Use the actual repository structure rather than hypothetical names.

---

# PART 18 — IMPLEMENTATION PHASES

Create a realistic implementation roadmap:

### Phase 1

Architecture + security

### Phase 2

Researcher IP disclosure workflow

### Phase 3

Institution/TTO accounts

### Phase 4

Database + RLS

### Phase 5

AI IP triage MVP

### Phase 6

Authenticity/evidence engine

### Phase 7

RAG

### Phase 8

Secure data room

### Phase 9

Evaluation

### Phase 10

Production deployment

For each phase specify:

* Objective
* Files/components affected
* Dependencies
* Risks
* Testing requirements
* Definition of done

---

# PART 19 — DO NOT BREAK THE EXISTING SYSTEM

This is an existing product.

Before modifying anything:

1. Understand the current architecture.
2. Identify reusable components.
3. Identify dependencies.
4. Identify migration risks.
5. Preserve existing authentication unless there is a strong technical reason not to.
6. Preserve existing project data.
7. Preserve existing users.
8. Preserve existing RLS functionality.
9. Avoid unnecessary rewrites.
10. Use incremental migrations.

Do not replace working systems simply because another architecture looks cleaner.

---

# PART 20 — FINAL DELIVERABLES

Before implementing code, produce:

### 1.

`IP_DISCLOSURE_CURRENT_SYSTEM_ANALYSIS.md`

### 2.

`IP_WORKFLOW_DESIGN.md`

### 3.

`AI_MODEL_SELECTION.md`

### 4.

`AI_IP_SCREENING_SPEC.md`

### 5.

`AUTHENTICITY_VERIFICATION_SPEC.md`

### 6.

`IP_SECURITY_AND_PRIVACY.md`

### 7.

`IP_DATABASE_ARCHITECTURE.md`

### 8.

`IP_API_ARCHITECTURE.md`

### 9.

`IP_TTO_PORTAL_SPEC.md`

### 10.

`IP_INTEGRATION_PLAN.md`

### 11.

`IP_IMPLEMENTATION_ROADMAP.md`

### 12.

A visual architecture diagram showing:

Researcher
→ Project Submission
→ IP Disclosure
→ AI Screening
→ Authenticity/Prior-Art Evidence
→ TTO Review
→ Decision
→ Public/Restricted/Confidential
→ Collaboration/Funding
→ Secure Data Room

---

# FINAL INSTRUCTION

Your first task is **NOT to code**.

Your first task is to:

1. Inspect the entire existing project.
2. Understand the current workflow.
3. Research current technology-transfer/IP practices.
4. Research appropriate AI models and deployment approaches.
5. Analyze privacy/security requirements.
6. Design the complete architecture.
7. Identify exactly where the new workflow fits.
8. Produce the documentation listed above.
9. Identify risks, assumptions and unresolved questions.
10. Present a recommended implementation plan.

Only after this analysis should you begin implementing changes.

When implementation begins, work incrementally and keep the existing application functional after every major change.

The final system should be designed as a **secure university technology-transfer platform with AI-assisted IP triage and authenticity verification**, not as an AI legal-advice system.
