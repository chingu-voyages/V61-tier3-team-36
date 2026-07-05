As per industry standards, the **Developer Workflow MVP** should not start as “AI writes code directly.” It should start as a **controlled engineering workflow system** that improves planning, traceability, review quality, and delivery readiness.

**Recommended MVP Positioning**
Build it as:

**Developer Delivery Console: requirement-to-PR workflow for engineering teams.**

It should help developers move from requirement → repo understanding → implementation plan → code/test suggestions → review checklist → PR pack.

**Industry-Standard MVP Workflow**

1. **Project / Repo Setup**
   - Create project/workspace.
   - Connect GitHub/GitLab repo or upload repo zip.
   - Detect framework, package manager, test framework, build commands, folder structure.
   - Store repo analysis version/history.

2. **Requirement Intake**
   - Paste or upload requirement, bug report, ticket, PRD, API spec.
   - Extract:
     - business objective
     - acceptance criteria
     - non-functional requirements
     - assumptions
     - open questions
     - affected modules

3. **Impact Analysis**
   - App analyzes repo and suggests:
     - impacted files/folders
     - frontend/backend/API/database impact
     - dependency impact
     - migration impact
     - security risk
     - testing scope

4. **Engineering Task Breakdown**
   - Generate tasks in a structure developers expect:
     - backend changes
     - frontend changes
     - DB changes
     - API contract changes
     - tests
     - docs
     - rollout/rollback
   - User can approve/edit tasks before code suggestions.

5. **Implementation Plan**
   - For selected task, generate:
     - step-by-step plan
     - files likely to change
     - design choices
     - risks
     - validation steps
     - rollback notes

6. **Code Suggestion / Patch Preview**
   - MVP should generate **suggested diffs/snippets**, not automatically push.
   - User reviews:
     - file path
     - change summary
     - generated code
     - test impact
     - risk score

7. **Test Generation**
   - Generate:
     - unit tests
     - integration tests
     - API tests
     - UI tests
     - regression checklist
   - Every bug-fix task should include a test case.

8. **PR Readiness**
   - Generate:
     - branch name
     - commit message
     - PR title
     - PR description
     - checklist
     - test evidence
     - release notes
     - rollback plan

9. **Delivery Metrics**
   - Track delivery health using DORA-style metrics:
     - change lead time
     - deployment frequency
     - change fail rate
     - failed deployment recovery time
     - deployment rework rate  
   DORA recommends these as outcome-focused delivery performance metrics, not vanity activity metrics.

10. **Security / Compliance Guardrails**
   - Add secure development checklist using OWASP ASVS ideas:
     - access control
     - input validation
     - secrets handling
     - logging
     - API security
     - dependency risk
   OWASP ASVS is useful because it gives developers concrete security verification requirements.

**MVP Screens**

1. **Projects**
   - project list
   - repo connection status
   - last analysis
   - active tasks

2. **Repo Intelligence**
   - framework detected
   - architecture summary
   - key folders
   - routes/APIs
   - DB/migrations
   - test commands
   - build commands

3. **Requirements**
   - upload/paste requirement
   - parsed requirement
   - acceptance criteria
   - open questions

4. **Impact Analysis**
   - affected modules
   - risk areas
   - dependency impact
   - security impact

5. **Task Planner**
   - generated dev tasks
   - priority
   - risk
   - owner/status

6. **Implementation Plan**
   - selected task
   - steps
   - affected files
   - code suggestions
   - test suggestions

7. **PR Pack**
   - branch name
   - commit message
   - PR description
   - checklist
   - release notes

**Backend Tables**

Minimum:

- `projects`
- `repositories`
- `repo_analysis`
- `requirements`
- `requirement_acceptance_criteria`
- `engineering_tasks`
- `implementation_plans`
- `code_suggestions`
- `test_suggestions`
- `pr_packs`
- `audit_logs`
- `ai_requests`

Later:

- `git_branches`
- `pull_requests`
- `ci_runs`
- `deployments`
- `delivery_metrics`
- `security_findings`

**What To Avoid In MVP**

Do not start with:
- full browser IDE
- automatic commit/push
- autonomous multi-file code modification
- deployment automation
- Jira/GitHub two-way sync
- complex multi-agent workflow
- large enterprise permission model

Those should come after the workflow is trusted.

**Best MVP Standard**

The MVP should produce **reviewable engineering artifacts**, not uncontrolled changes.

That means:
- explain before code
- show impact before implementation
- generate tests with changes
- generate PR-ready output
- keep audit logs
- keep human approval before repo mutation

Sources used:
- DORA delivery metrics: https://dora.dev/guides/dora-metrics/
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- Twelve-Factor App principles: https://12factor.net/
