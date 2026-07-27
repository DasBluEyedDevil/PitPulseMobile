import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptsDirectory, "..");
const contractPath = path.join(
  scriptsDirectory,
  "mobile-coverage-contract.json",
);
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));

const reportOnly = process.argv.includes("--report-only");
const positionalArguments = process.argv
  .slice(2)
  .filter((argument) => argument !== "--report-only");
const lcovPath = positionalArguments[0]
  ? path.resolve(process.cwd(), positionalArguments[0])
  : path.join(repositoryRoot, "mobile", "coverage", "lcov.info");
const mobileRoot = path.join(repositoryRoot, "mobile");
const libraryRoot = path.join(mobileRoot, "lib");

function normalizePath(value) {
  return value.replaceAll("\\", "/").replace(/^mobile\//, "");
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

function isGenerated(sourcePath) {
  return (
    contract.generatedFiles.includes(sourcePath) ||
    contract.generatedSuffixes.some((suffix) => sourcePath.endsWith(suffix))
  );
}

function parseLcov(contents) {
  const records = new Map();
  let current;

  for (const line of contents.split(/\r?\n/)) {
    if (line.startsWith("SF:")) {
      current = {
        sourcePath: normalizePath(line.slice(3)),
        linesFound: 0,
        linesHit: 0,
      };
    } else if (current && line.startsWith("LF:")) {
      current.linesFound = Number.parseInt(line.slice(3), 10);
    } else if (current && line.startsWith("LH:")) {
      current.linesHit = Number.parseInt(line.slice(3), 10);
    } else if (line === "end_of_record" && current) {
      if (records.has(current.sourcePath)) {
        throw new Error(`Duplicate LCOV record for ${current.sourcePath}`);
      }
      records.set(current.sourcePath, current);
      current = undefined;
    }
  }

  return records;
}

function calculate(records) {
  const linesFound = records.reduce(
    (total, record) => total + record.linesFound,
    0,
  );
  const linesHit = records.reduce(
    (total, record) => total + record.linesHit,
    0,
  );
  const percent = linesFound === 0 ? 0 : (linesHit / linesFound) * 100;
  return { linesFound, linesHit, percent };
}

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

function groupMatches(sourcePath, group) {
  return (
    group.files.includes(sourcePath) ||
    group.prefixes.some((prefix) => sourcePath.startsWith(prefix))
  );
}

const failures = [];

if (!fs.existsSync(lcovPath)) {
  failures.push(
    `Fresh LCOV input is missing at ${path.relative(repositoryRoot, lcovPath)}. Run "flutter test --coverage" first.`,
  );
}

if (contract.schemaVersion !== 1) {
  failures.push(
    `Unsupported mobile coverage contract schema: ${contract.schemaVersion}`,
  );
}

let coverageRecords = new Map();
if (fs.existsSync(lcovPath)) {
  coverageRecords = parseLcov(fs.readFileSync(lcovPath, "utf8"));
}

const sourcePaths = walk(libraryRoot)
  .filter((sourcePath) => sourcePath.endsWith(".dart"))
  .map((sourcePath) => normalizePath(path.relative(mobileRoot, sourcePath)))
  .filter((sourcePath) => !isGenerated(sourcePath))
  .sort();
const sourcePathSet = new Set(sourcePaths);

for (const sourcePath of coverageRecords.keys()) {
  if (!sourcePath.startsWith("lib/")) {
    failures.push(`LCOV record is outside mobile/lib: ${sourcePath}`);
  }
}

const missingSourcePaths = sourcePaths.filter(
  (sourcePath) => !coverageRecords.has(sourcePath),
);
if (missingSourcePaths.length > 0) {
  failures.push(
    `${missingSourcePaths.length} hand-written mobile source files are absent from LCOV: ${missingSourcePaths.join(", ")}`,
  );
}

const globalRecords = [...coverageRecords.values()].filter(
  (record) =>
    sourcePathSet.has(record.sourcePath) && !isGenerated(record.sourcePath),
);
const globalCoverage = calculate(globalRecords);
console.log(
  `Mobile global line coverage: ${globalCoverage.linesHit}/${globalCoverage.linesFound} (${formatPercent(globalCoverage.percent)}), target ${contract.globalMinimumLinePercent.toFixed(2)}%`,
);
if (globalCoverage.percent < contract.globalMinimumLinePercent) {
  failures.push(
    `Mobile global line coverage is ${formatPercent(globalCoverage.percent)}; requires ${contract.globalMinimumLinePercent.toFixed(2)}%.`,
  );
}

for (const group of contract.criticalGroups) {
  const mappedSourcePaths = sourcePaths.filter((sourcePath) =>
    groupMatches(sourcePath, group),
  );
  if (mappedSourcePaths.length === 0) {
    failures.push(
      `Critical coverage group "${group.id}" does not map to any hand-written source.`,
    );
    continue;
  }

  const groupRecords = mappedSourcePaths
    .map((sourcePath) => coverageRecords.get(sourcePath))
    .filter(Boolean);
  const groupCoverage = calculate(groupRecords);
  console.log(
    `Mobile ${group.id} line coverage: ${groupCoverage.linesHit}/${groupCoverage.linesFound} (${formatPercent(groupCoverage.percent)}), target ${contract.criticalMinimumLinePercent.toFixed(2)}% across ${mappedSourcePaths.length} files`,
  );

  const missingGroupPaths = mappedSourcePaths.filter(
    (sourcePath) => !coverageRecords.has(sourcePath),
  );
  if (missingGroupPaths.length > 0) {
    failures.push(
      `Critical coverage group "${group.id}" has source absent from LCOV: ${missingGroupPaths.join(", ")}`,
    );
  }
  if (groupCoverage.percent < contract.criticalMinimumLinePercent) {
    failures.push(
      `Mobile ${group.id} line coverage is ${formatPercent(groupCoverage.percent)}; requires ${contract.criticalMinimumLinePercent.toFixed(2)}%.`,
    );
  }
}

if (failures.length > 0) {
  const heading = reportOnly
    ? "Mobile coverage report (non-blocking mode)"
    : "Mobile coverage gate failed";
  console.error(`\n${heading}:`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  if (!reportOnly) {
    process.exitCode = 1;
  }
} else {
  console.log("Mobile coverage gate passed.");
}
