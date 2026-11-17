# Deconstructivism App — Process Log

This is a short account of how the app took shape. The earlier configurator and Collision Field history comes from the process logs in the supplied PDF and ZIP; it is summarized here, not independently reconstructed from every earlier session.

## Human Direction

The project’s purpose, content, and design decisions came from the human contributor. They chose the architectural ideas and references, supplied source material and the Collision Field code, and guided how the app should look and work.

As the project evolved, they reviewed previews, clarified behavior and placement, and redirected approaches that did not fit. They asked for a cohesive app rather than an iframe, moved Collision Field to follow Section 05, and requested that the process log be available as a site section. They also authorized the merge and publication.

## AI Implementation

AI helped turn that direction into a working site: building and revising the configurator, integrating the supplied simulation into the existing page, matching its styles and navigation, and making requested changes after review.

For the integration, the simulation and Three.js library are served locally rather than loaded from a CDN. This avoided an extra network dependency. Browser previews were used to check the interface and controls; Git and GitHub CLI were used to merge the approved work and publish it through GitHub Pages.

## Earlier Configurator

The PDF describes an earlier phase focused on deconstructivist ideas such as contradiction, disjunction, and the relationship between interior and exterior. The human supplied readings, drawings, and visual references, and shaped the intended learning experience.

The design changed considerably over time. An early building configurator with rooms, furniture, and case studies gave way to a more focused set of spatial operations: folding, fragmentation, and intersection. The human refined what those controls should affect and how the building should be shown. AI implemented the successive versions, including a Three.js scene and a 2D fallback after rendering problems.

The PDF reports JavaScript syntax checks, but also notes that visual checks were not always possible. It records an unsuccessful attempt to publish an earlier draft because of a DNS/network issue, followed by preparation of a ZIP for manual hosting. Those attempts were separate from the later GitHub Pages deployment.

## Collision Field

The PDF and ZIP describe the Collision Field as a separate simulation developed before it was added to this site. In that work, the human asked to preserve the original while iterating on a copy, and clarified how Fragment, Folding, and Intersect should relate.

The controls and geometry were revised several times. Folding was tied to existing fragments; panel selection and fold behavior were refined; and Intersect shifted through several control schemes before settling on a simpler intensity-based interaction. The supplied logs also record fixes for rendering and script issues. These are summaries of the supplied history, not claims that every earlier version was independently retested.

## Site Integration and Publication

The human first asked to place the supplied Collision Field code beneath the matrix. After reviewing an iframe approach, they asked for a native integration that felt like part of the existing app. They later clarified that it should follow Section 05 and asked for an in-app preview.

AI integrated the simulation and its local runtime into the page, adapted the styles and navigation, and checked the interactive controls in a browser preview. At the human’s request, the changes were merged into `main` and published with GitHub Pages. The Process Log was later added as a matching sidebar tab and Section 08; that update was also merged and deployed.

## Tools and Checks

- **Supplied PDF and ZIP:** preserved the earlier design and iteration history. Those accounts are identified above as source material, not independently verified transcripts.
- **PowerShell/.NET:** used to inspect and extract the supplied archive locally. Python and Node.js were unavailable in that environment.
- **Local Three.js and browser preview:** kept the simulation’s runtime with the site and allowed the actual interface and controls to be checked.
- **Git and GitHub CLI:** used for the requested merges and Pages deployment.

The site is a static HTML app, so there was no dedicated automated test suite for these changes. Validation relied on browser interaction, deployment status, and checking that the published site and process log loaded. The older PDF’s reported checks and limitations are kept separate from checks performed during the site integration.

## Outcome

The published site includes the Collision Field as a native section after Section 05 and the process log in Section 08. The simulation files are served from the repository, and GitHub Pages hosts the app.
