# Obsidian Confluence Unofficial

![Build Status](https://github.com/nchursin/obsidian-confluence-unofficial/actions/workflows/test.yml/badge.svg)
![Plugin Version](https://img.shields.io/badge/plugin-0.2.1-blue)
![Required Obsidian Version](https://img.shields.io/badge/requires-0.15.0+-purple)
[![libera manifesto](https://img.shields.io/badge/libera-manifesto-lightgrey.svg)](https://liberamanifesto.com)


> WARNING! This plugin is in a very early stage of development. Feel free to use it, but it's your funeral, pal. :)

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

### Plans
1. Upload images automatically
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
