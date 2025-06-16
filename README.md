# Obsidian Confluence Unofficial

![Build Status](https://github.com/nchursin/obsidian-confluence-unofficial/actions/workflows/test.yml/badge.svg)
![Plugin Version](https://img.shields.io/badge/plugin-0.4.0-blue)
![Required Obsidian Version](https://img.shields.io/badge/requires-0.15.0+-purple)
[![libera manifesto](https://img.shields.io/badge/libera-manifesto-lightgrey.svg)](https://liberamanifesto.com)
[![codecov](https://codecov.io/gh/nchursin/obsidian-confluence-unofficial/branch/main/graph/badge.svg)](https://codecov.io/gh/nchursin/obsidian-confluence-unofficial)


> WARNING! This plugin is in a very early stage of development. Feel free to use it, but it's your funeral, pal. :)

> HELP WANTED! I don't have opportunity to test this plugin on cloud Confluence. AFAIU there are different APIs. I plan to support as many versions of the API as possible, so let me know if you want to test the plugin on different versions of Confluence

This is a plugin to publish pages from Obsidian to Confluence. It's Unofficial, in case you haven't noticed.

## Motivation
You might be asking "Why, God, why they keep making these plugins?!". The reasons behind this one are:

1. None of the existing plugins supported personal access token auth out of the box
1. They didn't work for our Confluence self-hosted instance
1. Our Confluence instance didn't work with HTML5 img tags

## Features
1. Basic or personal token auth
1. Create and update pages in Confluence
1. HTML-based upload. Which means if you use plugins, that modify your Obsidian view (like PlantUMML), this will be uploaded to Confluence
1. Upload images automatically. The plugin looks through the page attachments to find new ones in obsidian using filenames. Then it uploads the missing ones and replaces links in the code.

### Plans
1. Download and edit pages
1. Support "Automatic table of contents" plugin or any other way to generate ToC automatically

## Installation
This plugin isn't yet published to Obsidian plugin repository. The easiest way to install it is via [BRAT](https://github.com/TfTHacker/obsidian42-brat).

## How to use it
### In settings:
1. Setup Confluence URL
1. Setup Auth method
1. Setup default space
1. Setup default parent

### In file
1. Make changes
1. Run command `OCU: Publish File`
1. Once published, the MD file will get properties, that link it to the Confluence page. Every new publish will update the page
