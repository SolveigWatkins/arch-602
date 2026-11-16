# Deconstructivism App — Process Log

This log combines the earlier configurator history in the user-supplied PDF, the Collision Field iteration history in the user-supplied ZIP, and the later site integration documented in this session. It distinguishes human direction from AI implementation, identifies the source of historical claims, and preserves meaningful revisions and reversals instead of presenting every explored version as a feature of the final app. It is not a claim that AI made the project's creative or curatorial decisions.

## Contributions and decision-making

The human contributor set the project's learning goal and made the consequential product decisions: which architectural sources and interactions mattered, how the simulation should behave, how it should fit into the site, and where it should appear. The human supplied source texts, drawings, visual references, and the later Collision Field code; repeatedly refined controls and geometry after reviewing results; corrected implementation choices that did not match the desired experience; asked for a review preview; and authorized merging and publishing.

Copilot acted as an implementation assistant. It developed and revised the configurator and simulation in response to human direction, inspected the existing site and supplied code, integrated the simulation, adapted the presentation, made the requested placement changes, and performed the deployment steps after they were requested. The implementation details below should not be read as evidence that the human authored those code changes.

## Earlier configurator phase

The supplied PDF describes this phase as preceding the Collision Field version. These are summaries of the PDF's account, not independently verified reconstructions of the earlier sessions.

- **Human direction recorded in the PDF:** establish the learning goal around contradiction, disjunction, dichotomy, and the collision of exterior and interior; ground the app in supplied writings by Càndito and Meloni, Derrida, Hendrix, Tschumi, and Venturi; translate Derrida material into English; and credit textual and visual sources. The human also supplied architectural drawings and visual precedents, including Eisenman and Tschumi projects.
- **Human direction recorded in the PDF:** develop an editable configurator with interior and exterior views, building spaces, furniture, case studies, and attraction fields; refine the interface around a fixed grid, cutaway views, recognizable symbols, and responsive controls; then request changes to the building types and available interaction tools.
- **AI implementation recorded in the PDF:** create and revise the configurator, explanatory text, citations, image credits, and case-study controls; replace an SVG-rendered scene with a Three.js axonometric building scene; and add a 2D fallback after reported blank-rendering problems.
- **Major design revisions recorded in the PDF:** a building configurator with case studies was later reshaped around building types, then around user-placed attractors and folding/intersection/fragmentation behaviors. The user subsequently requested an axonometric-focused interface and removal of room/furniture placement tools. Folding was explored through several distinct approaches—hinged panels, automatic origami-like pieces, continuous creased surfaces, mosaics, and large hinged panels—and the record includes a rollback from one wall-surface approach. These are successive experiments, not features that should be assumed to coexist in the final app.
- **Further revisions recorded in the PDF:** operation semantics changed repeatedly as the user clarified what should move, what should remain intact, how fragmentation should be subdivided, and how folds and intersections should affect exterior and interior systems. The record includes removal of attractor placement in favor of whole-building operations, changes to Fragment and fold controls, and a later side-by-side controls/simulation layout.
- **AI tool and attribution notes recorded in the PDF:** a standalone Three.js runtime was chosen after a module/blob-loading version reportedly appeared blank when opened locally; the stated reason was to avoid external module loading and keep an offline, single-file configurator. The PDF refers to both Three.js r157 and r187 in different attribution notes. It does not reconcile those version references, which may concern different snapshots; no exact version is inferred here for that earlier configurator.
- **Verification limits recorded in the PDF:** multiple revisions were checked with JavaScript syntax checks, but browser visual verification was often unavailable. In one entry local-file navigation was blocked by the browser policy. The PDF explicitly distinguishes those checks from a successful visual render.
- **Publishing/tool history recorded in the PDF:** an earlier hosted-copy/Sites draft could not be published because of a reported DNS/network failure; a Netlify Drop ZIP was then prepared for manual publishing. These attempts precede the later, successful GitHub Pages deployment recorded below and are not the same publication.
- **Credential note recorded in the PDF:** it says the human requested an OpenAI API-key setup and approved a local connection flow. No credential value is reproduced here, and the supplied history does not establish that an API key is part of the deployed static website.

## Collision Field iteration before site integration

The supplied ZIP included a `process-log.md` describing work on the standalone Collision Field app on November 12–13, 2026. The following is a summary of that prior record; its individual entries were not independently verified against the earlier working sessions.

- **Human direction recorded in the supplied log:** preserve the baseline while iterating on a copy; establish the relationship between Fragment, Folding, and Intersect; make facade panels selectable; ensure folds use existing fragments; make geometry visible and controls usable; refine how Intersect moves the building; and tune the relationship between exterior and interior.
- **AI implementation recorded in the supplied log:** evolve the controls and panel-selection model in response to that direction; repair reported rendering and script failures; provide a 2D fallback for rendering failures; stabilize fragment identity and folds; and implement the requested movement and connection behavior.
- **Important product decisions recorded there:** Folding depends on fragmentation; the user clarified how facade panels and cuts should be represented; and the Intersect behavior was revised several times in response to direction, ultimately using a single intensity control and movement along each surface's X or Z normal. The log also records that stickiness controls were later removed while fixed bridging behavior remained.

This supplied history is useful context, but the archive does not provide complete source-control history or the original conversation transcripts. The summary therefore attributes those earlier decisions to the user/assistant record as supplied, not to independent review of every earlier change.

The PDF also records the Collision Field's initial creation on November 11 as a separate, non-destructive simulation focused on exterior/interior collision, with Folding, Intersect, Fragmentation, and plan/isometric views. In that earlier iteration, the interface and behavior evolved from point-based controls through whole-building operations to more targeted panel editing. The ZIP log describes the later state that was supplied for integration.

- **November 11–13, as recorded across the PDF and ZIP:** the Collision Field was developed separately from the earlier configurator. The user asked that the baseline be preserved while a copy was changed, and requested previews of that copy. The controls then evolved through contextual operation panels, a fixed museum starting model, and a selectable facade/panel workflow. The user repeatedly clarified that Fragment creates adjoining pieces without gaps and that Folding should operate on existing fragments rather than inventing unrelated geometry.
- **Folding/Fragment decisions in the supplied logs:** several alternative designs and controls were tried and then simplified. The recorded later direction uses one or two selected fragments folded around a stationary shared edge; operation intensity sets the fold angle, and settings are retained per fragment. The log describes per-panel fragment layouts and fold selections persisting as the user edits another panel. Duplicate entries describing the same change have been consolidated here.
- **Intersect decisions in the supplied logs:** Intersect progressed from multi-axis translation/rotation controls, to selected-panel clusters, and then back to a global operation. The recorded later behavior uses one intensity control and moves each surface along its X or Z normal, with exterior/interior surfaces responding at different rates. Earlier approaches are retained as history, not claims about the final implementation.
- **Rendering and verification in the supplied logs:** blank or non-running canvases prompted repairs to scene setup, script syntax, viewport sizing, bundled Three.js, and 2D fallback behavior. The PDF/ZIP records syntax checks for many changes and notes that some revisions lacked browser visual verification. For the later integration in this session, the browser rendered the live 3D canvas and its controls were exercised.

## Site integration and publishing timeline

### November 13, 2026 — integrate the supplied simulation

- **Human:** supplied `collision-field-local-code.zip` and requested integrating the code into the existing app. The initial placement request was beneath the matrix.
- **AI:** inspected the existing page and archive. An initial iframe-based approach was implemented, but it did not satisfy the desired integration.
- **Human:** explicitly rejected an iframe and asked for one cohesive app, allowing the simulation's appearance to be adapted to the site.
- **AI:** replaced the iframe with native page markup and styles, retaining the supplied Three.js renderer and simulation behavior as local assets. Keeping the library local avoided a runtime CDN dependency and the native integration shared the app's typography, colors, layout, and controls.
- **AI:** found that the supplied simulation code attached a listener to `stickiness` controls that were not present in the supplied markup. Added the missing connection slider and synchronized its display on reset so the existing behavior remained operable.
- **Human:** requested an in-app preview for review.
- **AI:** opened the browser preview and exercised the renderer, plan/isometric switch, Intersect and Folding panels, Fragment base-panel selection, intensity/connection controls, and reset behavior.
- **Human:** clarified that the simulation belongs after Section 05, not under the matrix.
- **AI:** moved it into its own Section 06 after Primary Literature, added a sidebar link and scroll-spy entry, and adjusted the responsive layout.

### November 13, 2026 local time — merge and deploy

- **Human:** asked for the change to be merged into `main` and published to Pages.
- **AI:** checked the target branch and repository Pages settings, committed the site and simulation assets, pushed the feature branch, and opened a pull request. After confirming the pull request was mergeable, merged it into `main` (GitHub recorded the merge at 2026-11-14 00:39 UTC, which was November 13 in the local -06:00 time zone).
- **AI / GitHub Pages:** verified that the repository's Pages source was configured for `main` at the root and waited for the Pages build-and-deploy workflow to complete successfully.

## Tool choices and rationale

| Tool or resource | Why it fit this work | Use and limits |
| --- | --- | --- |
| User-supplied PDFs, drawings, references, and app archives | These were the source material and implementation artifacts for the architectural content and simulation; consulting the supplied material kept the work grounded in the requested project. | The earlier content/design history in this log is attributed to the PDF and ZIP process logs. The Collision Field code and bundled library were extracted locally for integration. |
| Local PowerShell/.NET ZIP APIs | The user provided the source directly; local extraction kept that code in the project workflow without sending it to a third party. Python and Node.js were unavailable in the environment. | Read the supplied HTML, simulation script, bundled Three.js library, and prior process log; extracted only the simulation assets needed for integration. |
| Repository file inspection and search | The existing section structure, matrix, stylesheet, navigation, and scripts had to be understood before making a targeted integration. | Used to locate the matrix and Section 05, identify the existing styles and navigation behavior, and compare the simulation's expected control IDs with the markup. |
| `apply_patch` | Appropriate for controlled edits to the site's HTML, README, and integration-specific simulation code. | Added native markup and styles, moved the section when asked, added navigation, and corrected the connection slider reset display. |
| In-app Browser preview | Best suited to a visual, interactive static site: it could load the actual page and exercise controls rather than merely inspect markup. | Verified the integrated canvas and controls in the local preview; after deployment, opened the published site and confirmed it loaded with the new section and local scripts. |
| Git and GitHub CLI (`gh`) | The user explicitly requested a merge into `main` and a Pages publish; source control and the repository's deployment workflow are the direct tools for that task. | Checked the branch and Pages source, pushed the change, opened and merged the pull request, and watched the Pages workflow. |

No separate coding or review agents were used for the site integration. The repository is a static HTML app and no dedicated automated test suite was identified during the work, so integration validation used the browser preview, direct interaction checks, `git diff --check`, and the actual GitHub Pages deployment. The older PDF reports syntax checks and visual-validation limitations separately; those historical checks are not represented as tests run during the site integration.

## Record limitations and corrections

- The first implementation used an iframe. The human rejected that choice; it was replaced with native page integration before merging.
- The initial placement was below the matrix. The human clarified the intended order, and the published version places Collision Field after Section 05.
- The local environment did not have Python or Node.js available for archive processing or command-line JavaScript tests. PowerShell/.NET was used to read the archive; the simulation was validated in the browser instead.
- The first version of this log relied on the ZIP's process log and noted that a cross-session history query had failed because of unsupported SQL syntax. The newly supplied PDF adds earlier project history; the source records still do not provide complete original transcripts or independent verification of every historical change.
- The work integrated the supplied simulation and bundled Three.js runtime; it did not independently verify the simulation's original authorship or provenance. The bundled Three.js file includes its MIT license notice.
- The PDF and ZIP both contain repeated entries. This consolidated log combines duplicate descriptions into milestones while retaining materially different design choices, reversals, and reported verification outcomes. It is a readable summary rather than a verbatim transcription of either source.

## Outcome

The deployed site presents Collision Field as a native, responsive Section 06 after Primary Literature. Its simulation assets are served locally from `assets/collision-field/`. The GitHub Pages build-and-deploy workflow completed successfully after the merge.
