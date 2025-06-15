import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const targetVersion = process.env.npm_package_version;

// read minAppVersion from manifest.json and bump version to target version
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// update versions.json with target version and minAppVersion from manifest.json
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));

let readme = readFileSync("README.md", "utf8");
readme = readme.replace(/plugin-.+-blue/, `plugin-${targetVersion}-blue`);
writeFileSync("README.md", readme);
// `![Plugin Version](https://img.shields.io/badge/plugin-${targetVersion}-blue)`

// commit changes and add tag
execSync(`git add -u`);
execSync(`git commit -m 'v${targetVersion}'`);
execSync(`git tag 'v${targetVersion}'`);
