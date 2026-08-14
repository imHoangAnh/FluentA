import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const frontendRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceRoot = path.join(frontendRoot, 'src')
const sourceExtensions = ['.ts', '.tsx']

const knownDebt = {
  orphanModules: new Set(),
  rootLibModules: new Set(),
  wildcardFeatureExports: new Set(),
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(absolutePath)
    return sourceExtensions.includes(path.extname(entry.name)) ? [path.normalize(absolutePath)] : []
  })
}

function relativePath(file) {
  return path.relative(sourceRoot, file).replaceAll('\\', '/')
}

function isProductionFile(file) {
  const relative = relativePath(file)
  return !relative.startsWith('test/') && !/\.(?:test|spec)\.[^.]+$/.test(relative)
}

const allFiles = walk(sourceRoot)
const canonicalFiles = new Map(allFiles.map((file) => [file.toLowerCase(), file]))
const productionFiles = allFiles.filter(isProductionFile)
const productionSet = new Set(productionFiles)

function resolveSourceImport(importer, specifier) {
  let basePath
  if (specifier.startsWith('@/')) {
    basePath = path.join(sourceRoot, specifier.slice(2))
  } else if (specifier.startsWith('.')) {
    basePath = path.resolve(path.dirname(importer), specifier)
  } else {
    return null
  }

  const candidates = [
    basePath,
    ...sourceExtensions.map((extension) => `${basePath}${extension}`),
    ...sourceExtensions.map((extension) => path.join(basePath, `index${extension}`)),
  ]

  for (const candidate of candidates) {
    const resolved = canonicalFiles.get(path.normalize(candidate).toLowerCase())
    if (resolved) return resolved
  }

  return null
}

function sourceKind(file) {
  return file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
}

const importsByFile = new Map(productionFiles.map((file) => [file, []]))
const wildcardFeatureExports = new Set()

for (const file of productionFiles) {
  const sourceFile = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    sourceKind(file),
  )

  function visit(node) {
    let specifier = null

    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier
      && ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifier = node.moduleSpecifier.text
    } else if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments[0]
      && ts.isStringLiteral(node.arguments[0])
    ) {
      specifier = node.arguments[0].text
    }

    if (specifier) {
      const target = resolveSourceImport(file, specifier)
      if (target && productionSet.has(target)) {
        importsByFile.get(file).push({ specifier, target })
      }
    }

    if (
      relativePath(file).match(/^features\/[^/]+\/index\.ts$/)
      && ts.isExportDeclaration(node)
      && node.moduleSpecifier
      && !node.exportClause
    ) {
      wildcardFeatureExports.add(relativePath(file))
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
}

function featureName(file) {
  const match = relativePath(file).match(/^features\/([^/]+)\//)
  return match?.[1] ?? null
}

const boundaryViolations = []

for (const [importer, imports] of importsByFile) {
  const importerPath = relativePath(importer)
  const importerFeature = featureName(importer)

  for (const { specifier, target } of imports) {
    const targetPath = relativePath(target)
    const targetFeature = featureName(target)

    if (specifier.match(/^@\/features\/[^/]+\/.+/)) {
      boundaryViolations.push(`${importerPath}: deep feature import ${specifier}`)
    }

    if (importerPath.startsWith('shared/') && /^(?:app|features)\//.test(targetPath)) {
      boundaryViolations.push(`${importerPath}: shared imports ${targetPath}`)
    }

    if (importerFeature && targetPath.startsWith('app/')) {
      boundaryViolations.push(`${importerPath}: feature imports ${targetPath}`)
    }

    if (
      importerFeature
      && targetFeature
      && importerFeature !== targetFeature
      && specifier.startsWith('.')
    ) {
      boundaryViolations.push(`${importerPath}: relative cross-feature import ${targetPath}`)
    }
  }
}

const reachable = new Set()

function visitReachable(file) {
  if (reachable.has(file)) return
  reachable.add(file)
  for (const { target } of importsByFile.get(file) ?? []) visitReachable(target)
}

const entrypoint = canonicalFiles.get(path.join(sourceRoot, 'main.tsx').toLowerCase())
if (!entrypoint) throw new Error('Frontend entrypoint src/main.tsx was not found.')
visitReachable(entrypoint)

const orphanModules = new Set(
  productionFiles.filter((file) => !reachable.has(file)).map(relativePath),
)
const rootLibModules = new Set(
  productionFiles.map(relativePath).filter((file) => file.startsWith('lib/')),
)

let nextIndex = 0
const indices = new Map()
const lowLinks = new Map()
const stack = []
const onStack = new Set()
const cycles = []

function findStronglyConnectedComponents(file) {
  indices.set(file, nextIndex)
  lowLinks.set(file, nextIndex)
  nextIndex += 1
  stack.push(file)
  onStack.add(file)

  for (const { target } of importsByFile.get(file) ?? []) {
    if (!indices.has(target)) {
      findStronglyConnectedComponents(target)
      lowLinks.set(file, Math.min(lowLinks.get(file), lowLinks.get(target)))
    } else if (onStack.has(target)) {
      lowLinks.set(file, Math.min(lowLinks.get(file), indices.get(target)))
    }
  }

  if (lowLinks.get(file) !== indices.get(file)) return

  const component = []
  let current
  do {
    current = stack.pop()
    onStack.delete(current)
    component.push(current)
  } while (current !== file)

  if (component.length > 1) {
    cycles.push(component.map(relativePath).sort())
  }
}

for (const file of productionFiles) {
  if (!indices.has(file)) findStronglyConnectedComponents(file)
}

const failures = []

function compareKnownDebt(label, actual, expected) {
  const unexpected = [...actual].filter((item) => !expected.has(item)).sort()
  const resolvedWithoutBaselineUpdate = [...expected].filter((item) => !actual.has(item)).sort()

  if (unexpected.length) {
    failures.push(`${label} added:\n  ${unexpected.join('\n  ')}`)
  }
  if (resolvedWithoutBaselineUpdate.length) {
    failures.push(`${label} baseline is stale; remove resolved entries:\n  ${resolvedWithoutBaselineUpdate.join('\n  ')}`)
  }
}

compareKnownDebt('Orphan module debt', orphanModules, knownDebt.orphanModules)
compareKnownDebt('Root src/lib debt', rootLibModules, knownDebt.rootLibModules)
compareKnownDebt(
  'Wildcard feature export debt',
  wildcardFeatureExports,
  knownDebt.wildcardFeatureExports,
)

if (boundaryViolations.length) {
  failures.push(`Boundary violations:\n  ${boundaryViolations.sort().join('\n  ')}`)
}

if (cycles.length) {
  failures.push(`Import cycles:\n  ${cycles.map((cycle) => cycle.join(' -> ')).join('\n  ')}`)
}

console.log(`Production modules: ${productionFiles.length}`)
console.log(`Reachable from src/main.tsx: ${reachable.size}`)
console.log(`Known orphan debt: ${orphanModules.size}`)
console.log(`Known root src/lib debt: ${rootLibModules.size}`)
console.log(`Known wildcard feature exports: ${wildcardFeatureExports.size}`)
console.log(`Import cycles: ${cycles.length}`)

if (failures.length) {
  console.error('\nArchitecture check failed.\n')
  console.error(failures.join('\n\n'))
  process.exitCode = 1
} else {
  console.log('Architecture check passed.')
}
