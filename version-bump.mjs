import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

let readme = readFileSync("README.md", "utf8");
readme = readme.replace(/plugin-.+-blue/, `plugin-${targetVersion}-blue`);
writeFileSync("README.md", readme);
// `![Plugin Version](https://img.shields.io/badge/plugin-${targetVersion}-blue)`

// read minAppVersion from manifest.json and bump version to target version
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// update versions.json with target version and minAppVersion from manifest.json
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
