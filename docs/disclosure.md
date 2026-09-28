# Research Disclosure Pipeline

## Overview

The Research Disclosure Pipeline moves a university research project from initial submission through AI-assisted screening, institutional review, and controlled publication.

The pipeline protects potentially confidential research while giving approved partners access to information that has been cleared for technology-transfer activity.

The platform supports three outcomes:

- The project continues through normal administrative processing.
- The project is referred to the TTO/IP Office for institutional review.
- The project is returned, restricted, or held until missing information and risks are resolved.

Publication and IP decisions are always made by authorized human reviewers.

## Participants

### Researcher

The researcher creates the project and provides:

- A high-level technology description.
- Contributors and inventors.
- Funding, sponsors, and institutional involvement.
- Previous publications or public disclosures.
- Potentially confidential information.
- Supporting files, links, and evidence.
- Consent to institutional review and technology-transfer processing.

### Administrator

The administrator performs the first institutional screening. The administrator reviews completeness, authenticity signals, evidence, ownership indicators, and publication risks. The administrator can accept the submission for continued processing, return it for clarification, or refer it to the TTO/IP Office.

### TTO/IP Officer

The TTO/IP Officer performs specialist institutional review. The officer reviews inventorship, ownership, funding obligations, confidentiality, public disclosure, protection options, and technology-transfer readiness.

### Publication Decision Maker

An authorized decision maker determines which cleared information may become public. The decision includes a written reason and is recorded in the audit history.

### Interested Partner

An approved partner can view the public project projection and may request controlled access to additional information. Private technical material is not exposed automatically.

## Lifecycle

```text
Project Draft
    ↓
Disclosure Questions
    ↓
Evidence Collection
    ↓
AI Screening
    ↓
Administrative Review
    ├── Return for Clarification
    ├── Continue Processing
    └── Refer to TTO/IP Office
             ↓
       TTO/IP Review
             ↓
       Publication Decision
             ↓
       Cleared Public Projection
             ↓
       Controlled Partner Access
```

## Pipeline Stages

### 1. Project Creation

The researcher creates a project with a title, description, research area, owner, contributors, and supporting information. A project remains private while it is incomplete.

### 2. Disclosure Questions

The researcher records whether the project may contain intellectual property, whether it has been publicly disclosed, who contributed to it, how it was funded, and whether agreements or sponsors may affect ownership or publication.

All required disclosure answers must be completed before submission.

### 3. Evidence Collection

The researcher may provide technical briefs, supporting documents, citations, links, contributor information, and requested files. Private files remain protected and are available only to authorized reviewers.

Uploaded files must pass the platform’s validation and storage controls before they can be used in review.

### 4. AI Screening

The AI processes the minimum necessary information to produce advisory findings. It can:

- Extract project facts, contributors, dates, funding, and citations.
- Identify possible IP, confidentiality, ownership, and public-disclosure risks.
- Compare claims with submitted evidence.
- Identify missing or contradictory information.
- Find similar permitted sources and explain the similarity.
- Recommend administrative review, TTO/IP review, or further evidence collection.

The AI does not determine patentability, ownership, infringement, legal safety, authenticity, or publication approval.

Failed, uncertain, unsupported, or malformed AI results are recorded as requiring human review.

#### Information Sources for AI Screening

The AI may use only the sources attached to the disclosure review and sources explicitly permitted by the platform:

- Researcher-written project title, summary, description, research area, status, and intended use.
- Completed disclosure questions and declarations.
- Contributor, inventor, institution, department, sponsor, grant, and funding fields.
- Researcher-provided publication, presentation, demonstration, collaboration, and public-disclosure dates.
- Uploaded technical briefs, research papers, supporting documents, and requested evidence files.
- Researcher-provided citations, URLs, and reference links.
- Platform project metadata, submission history, workflow status, and audit events.
- Human reviewer findings and questions already recorded for the disclosure.
- Permitted external publications, patent records, repositories, or institutional sources used for similarity and prior-art triage.

Each finding must identify the source used. External information must not be treated as evidence unless the source is available, permitted, and linked to the finding. The AI must distinguish researcher statements, uploaded evidence, platform metadata, reviewer findings, and external references.

#### External Evidence Sources

The evidence collector currently prepares bounded search results from these sources:

| Source | Use in the pipeline |
| --- | --- |
| Researcher-provided links | Start with the researcher’s own publications, patents, reports, and references. |
| OpenAlex | Find related scholarly works, authors, institutions, and publication records. |
| Crossref | Find and verify scholarly publication metadata and DOI records. |
| University news records | Compare the disclosure with known institutional announcements and public disclosures. |
| Google Patents | Locate publicly indexed patent records and similar patent concepts. |
| WIPO PATENTSCOPE | Search international patent publications and related patent records. |
| WIPO IP portal | Provide an institutional IP search starting point for authorized reviewers. |

These sources provide evidence leads, not legal conclusions. Search-portal results must be opened and reviewed before they support a finding. The AI report must cite the source identifier and URL for every external claim. If a source is unavailable, the report must state that evidence retrieval was unavailable.

### 5. Administrative Review

The administrator reviews the researcher’s answers, project information, evidence, and AI findings. The administrator may:

- Accept the submission for the next stage.
- Request edits or additional documents.
- Record an administrative finding.
- Return the project for clarification.
- Refer the project to the TTO/IP Office.

An administrator cannot use an AI result as a substitute for an institutional decision.

### 6. TTO/IP Review

The TTO/IP Officer reviews projects involving possible IP, confidentiality, ownership, sponsor obligations, public disclosure, or protection decisions.

The review may include:

- Inventorship and contributor confirmation.
- Institutional ownership and funding obligations.
- Confidentiality and public-disclosure risk.
- Prior-art and related-source evidence.
- Protection and technology-transfer considerations.
- Findings that may be shared with the researcher.

The TTO/IP Officer may approve the next stage, request more information, restrict sharing, record findings, or recommend that the project remain private.

### 7. Publication Decision

Only cleared content may be published. The publication decision specifies the approved public summary and excludes private disclosure answers, confidential technical details, and restricted files.

The decision maker records a written reason. Publication cannot be triggered by an AI result alone.

### 8. Partner Access

Partners can discover cleared public project information. They may submit a request for additional access when a project supports controlled information sharing.

Access requests are reviewed by an authorized human. Approval does not expose information outside the approved scope and duration.

## AI Findings

AI findings are advisory records associated with a disclosure review. Each finding should identify:

- Finding type.
- Severity.
- Human-readable explanation.
- Supporting evidence.
- Confidence.
- Missing information or limitations.
- Recommended next action.

The platform records the model version, prompt version, run status, evidence references, and result hash where available.

## Review States

Common workflow states include:

- `Draft`
- `Submitted`
- `Pending Review`
- `Documents Requested`
- `Under Re-Review`
- `TTO Review`
- `Approved`
- `Published`
- `Rejected`
- `On Hold`

`Approved` means the relevant human review stage has been completed. It does not automatically mean that the project is patentable or legally protected.

`Published` means that a human-approved public projection is available. It does not make private disclosure material public.

## Privacy and Security

- Projects are private by default.
- Public pages read only cleared public projections.
- Private disclosure answers and files are available only to authorized reviewers.
- Signed file access is scoped and time-limited.
- AI receives only the minimum information needed for its assigned task.
- AI outputs are validated before persistence.
- Review actions, findings, access decisions, and publication decisions are auditable.
- Unauthorized users cannot access disclosure, TTO, private-file, or administrative records.
- Failed storage validation prevents a file from entering review or AI processing.

## Human Decision Boundary

The platform separates AI assistance from institutional authority:

```text
AI: extraction, classification, comparison, evidence organization, and triage
Human reviewer: interpretation, institutional action, access, and publication
TTO/IP officer: specialist IP and technology-transfer review
```

The system must never present the AI as the final authority on patentability, ownership, legal protection, confidentiality, authenticity, or publication.

## Audit History

The disclosure timeline records important lifecycle events, including:

- Submission and route changes.
- AI screening runs and outcomes.
- Documents requested or received.
- Administrative and TTO findings.
- Sharing of findings with the researcher.
- Access requests and decisions.
- Publication decisions and written reasons.

The audit history supports accountability without exposing private content to unauthorized users.
