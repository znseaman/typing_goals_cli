# typing_goals_cli

A CLI tool to manage typing goals and track progress using MonkeyType. 🐵 ⌨️

## Why?

Consistent, structured practice is what improves typing speed. To structure practice, there are presets in MonkeyType which allow for settings to be applied to change what you're working on. If you're working on accuracy, apply your accuracy preset that fails a test when you make a mistake and you're off and running. Working on consistency? Apply your consistency preset that fails a test when your consistency falls under your minimum and so on and so forth...

What's cool about presets is that you can save all the settings you want to them, including a tag. Tags are really helpful in displaying your metrics given a specific scenario you were practicing when the tag was applied. In short, having a tag named the same as the preset it belongs to allows for analyzing different practice sessions.

Part of improving on a skill is being able to track progress. You may not see dramatic improvements in your typing in the short term but as you begin to practice over time, you begin to strengthen your muscle memory. The thought of typing an `a` becomes learned action.

This tool was built so it becomes easy improve your typing through deliberate practice sessions. Setting a daily goal to do X tests focused on accuracy provides structure and accountability.

## Pre-Setup

This tool requires the following to be setup prior to running the project:
- Node.js (install [nvm](https://github.com/nvm-sh/nvm) to manage node versions and see what version this project requires by viewing the `.nvmrc`)

## Setup

1. Clone repository
2. Change into the project directory
3. Download the required project dependencies and build the project by running:
```shell
npm run initialize
```
4. Start the CLI:
```shell
npm start
```

Once you see a welcome message, you're all set!

## Features

1. Tab autocompletion: when typing a command in the CLI, allow for the user to press tab to complete the command. For example, typing "go" + Tab will autocomplete to "goals". If no matches are found, the list of commands will be displayed below.
2. Command history: arrow up and down through previous commands entered in the CLI.

## Coming Soon

[X] `login` command with MonkeyType (and `logout` 😅 )
[X] Add 'Remember Me' feature to refresh tokens when they expire
[X] `results` command to list all tests completed today on MonkeyType
[X] `goals` command to create, read, update, and delete daily goals
[] `clear` command to wipe the text from the CLI
