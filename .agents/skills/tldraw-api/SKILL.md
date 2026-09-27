---
name: tldraw-api
description: Create, inspect, edit, persist, and verify tldraw canvases through the tldraw Desktop local Canvas API. Use when the task targets tldraw, a .tldraw document, or automation of the installed tldraw app. Do not select for a generic diagram, flowchart, or screenshot request without a tldraw target.
---

# tldraw API

<!-- Source: https://github.com/hoangnb24/skills/tree/9a579fc36d5314de489bfb1c128fe5fb8d7e6146/plugins/khuym/skills/tldraw-api ; adapted for contextual Harness use. -->

This is an optional task capability, not a repository workflow stage. Read-only
inspection requests do not authorize canvas edits. Resolve all script and
reference paths relative to this skill directory, not the consumer repo root.
Run the wrapper with `bash /absolute/path/to/this/skill/scripts/tldraw_api.sh`
when it lacks executable permissions; the examples below use skill-relative paths.

Operate the installed tldraw Desktop app through its authenticated localhost API. Prefer this skill over UI automation when the app is running and the task can be expressed as editor records or document scripts.

## Start safely

1. Require tldraw Desktop to be running with at least one document open.
2. Run `scripts/tldraw_api.sh docs` to discover document IDs and file paths.
3. Read the target with `shapes` before mutating it. Preserve shapes unrelated to the request.
4. Use stable semantic IDs such as `shape:payments-api`, not random IDs, when reruns may occur.
5. Never print or persist the bearer token. The wrapper reads it dynamically from tldraw's `server.json`.
6. Never edit an open `.tldraw` archive directly. Mutate it through `/exec` or its script workspace, then save through tldraw.

The wrapper requires Bash, `curl`, `jq`, and `python3`. Automatic state discovery
supports macOS and Linux. On other platforms, or when tldraw stores `server.json`
elsewhere, supply the verified location through `TLDRAW_STATE_FILE`. Do not guess
it or install/start tldraw just because this skill is present. Its local API must
be reachable from the shell running the wrapper.

The imported `open-file` helper accepts POSIX absolute paths only. A native
Windows drive-letter path is unsupported, and converting it to a shell path
does not prove the desktop app can open it. For that case, use an already
supported host file-opening tool or report the limitation. Do not claim native
Windows create/save-as support from an installed skill alone.

## Choose the operation

- Inspect or make a static diagram change: use `/api/search` and per-document `/exec` through the wrapper.
- Add behavior that must survive reopening: use `/script-workspace`; read the existing script before editing it.
- Create a named file: create an untitled document, draw into it, serialize it, create the path safely, reopen it, and save it through tldraw.
- Need an unfamiliar editor method: query `api.members` through `/api/search` instead of guessing.

Read [references/api.md](references/api.md) when raw request syntax, shape examples, durable scripts, or the new-file bridge is needed.

## Edit an existing canvas

1. Identify the document:

   ```bash
   scripts/tldraw_api.sh docs
   ```

2. Inspect shapes and, when connections matter, bindings:

   ```bash
   scripts/tldraw_api.sh shapes 'tldr:file:...'
   scripts/tldraw_api.sh bindings 'tldr:file:...'
   ```

3. Put the mutation in a temporary `.js` file and execute it:

   ```bash
   scripts/tldraw_api.sh exec 'tldr:file:...' /absolute/path/draw.js
   ```

4. Save the target document:

   ```bash
   scripts/tldraw_api.sh save 'tldr:file:...'
   ```

5. Verify once with `shapes`, `bindings`, `lint`, and—when layout is visual—`screenshot`.

Cause and effect: `/exec` changes the live editor store and marks a file-backed document dirty. `save` writes that store into the `.tldraw` archive. A clean linter and real binding records prove structural correctness; a screenshot proves placement and readability.

## Create a new named file

The public Canvas API operates on open documents but does not expose a documented create/save-as endpoint. Use the wrapper's capability-discovered desktop bridge; never hardcode a hashed renderer filename or export key.

1. Pick any open document ID as the bridge host, then create a blank untitled document:

   ```bash
   scripts/tldraw_api.sh new-file 'tldr:file:existing-doc-id'
   scripts/tldraw_api.sh docs
   ```

2. Identify the new untitled document by recency and confirm it has zero shapes.
3. Draw into that new document with `exec`.
4. Serialize it to a temporary path:

   ```bash
   scripts/tldraw_api.sh serialize 'tldr:untitled:...' > /absolute/temp/diagram.json
   ```

5. Validate that the serialization contains `tldrawFileFormatVersion`, `schema`, `records`, and one expected semantic shape ID.
6. Create the requested `.tldraw` path with the available safe file-editing tool. Do not use shell redirection to overwrite an existing user file.
7. Open the path through the bridge and find its new file-backed document ID:

   ```bash
   scripts/tldraw_api.sh open-file 'tldr:untitled:...' /absolute/path/diagram.tldraw
   scripts/tldraw_api.sh docs
   ```

8. Call `save` on the file-backed document. This lets tldraw normalize the legacy JSON into its current archive format.
9. Confirm `unsavedChanges` is false, the file exists, and the reopened document has the expected shapes.

Do not overwrite a requested path without explicit authorization. When the path already exists, edit the existing document or choose a new name.

## Draw structurally correct diagrams

- Import SDK helpers inside `/exec` with dynamic import: `await import('tldraw')`.
- Put user-visible text in `richText: toRichText('...')`.
- Use `helpers.createArrowBetweenShapes(sourceId, targetId, props)` for semantic connectors.
- Treat proximity as insufficient. An arrow without start and end bindings will not follow moved nodes.
- Use separate text shapes for edge labels when arrow labels collide with nodes or other connectors.
- Lay out the major path first, then supporting systems, then annotations and cost notes.
- Keep approximately 160–240 canvas units between major nodes unless the content demands more.
- Return small JSON results from `/exec`; verify complex records through `api.getShapes()`.

## Add durable behavior

The shipped wrapper does not implement `script-workspace` or `script-status`.
Use the following app capability only when an existing authenticated host tool
supports those endpoints. Otherwise report that persistent behavior is outside
this wrapper's supported operations; do not invent token-handling code to bridge
the gap. Static canvas editing remains available through the documented commands.

Use `POST /api/doc/:id/script-workspace` when clicks, keyboard actions, timers, custom tools, or run-on-open behavior must persist. Read `mainJsPath` first. If `isDefaultScript` is false, extend rather than replace the user's script. Edit only paths reported as editable, then poll `/script-status` until `state` is `applied` or an error is reported.

Static `/exec` code is intentionally ephemeral. Shapes it creates persist after save, but listeners and runtime patches disappear when the document closes.

## Completion checks

Before reporting success:

1. Confirm the intended document path and `unsavedChanges: false`.
2. Count expected shape types.
3. Confirm two bindings per semantic arrow.
4. Run `scripts/tldraw_api.sh lint DOC_ID`; resolve all unexpected lints.
5. Capture a canvas screenshot and inspect it when visual arrangement matters.
6. Report the output path, shape/arrow counts, binding count, and lint result.
