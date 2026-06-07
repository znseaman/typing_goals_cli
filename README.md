# typing_goals_cli

A CLI tool to manage typing goals and track progress using MonkeyType. 🐵 ⌨️

## Why?

Consistent, structured practice is what improves typing speed. To structure practice, there are presets in MonkeyType which allow for settings to be applied to change what you're working on. If you're working on accuracy, apply your accuracy preset that fails a test when you make a mistake and you're off and running. Working on consistency? Apply your consistency preset that fails a test when your consistency falls under your minimum and so on and so forth...

What's cool about presets is that you can save all the settings you want to them, including a tag. Tags are really helpful in displaying your metrics given a specific scenario you were practicing when the tag was applied. In short, having a tag named the same as the preset it belongs to allows for analyzing different practice sessions.

Part of improving on a skill is being able to track progress. You may not see dramatic improvements in your typing in the short term but as you begin to practice over time, you begin to strengthen your muscle memory. The thought of typing an `a` becomes learned action.

This tool was built so it becomes easy improve your typing through deliberate practice sessions. Setting a daily goal to do X tests focused on accuracy provides structure and accountability.

## Pre-Setup

### NodeJS
This tool requires the following to be setup prior to running the project:
- Node.js (install [nvm](https://github.com/nvm-sh/nvm) to manage node versions and see what version this project requires by viewing the `.nvmrc`)

### Docker
This tool uses docker to fetch the DB

### PostgreSQL
This tool requires setting up a Postgres DB which can be found at [PostgreSQL Local Setup](https://orm.drizzle.team/docs/guides/postgresql-local-setup). My instructions match what are done there but add more context if you're unfamiliar with Docker.

1. Pull down `postgres:18`:
```shell
docker pull postgres:18
```

2. Verify `postgres:18` exists in the list:
```shell
docker images
```

3. Run the container in detached mode with a name, environment variables, and publishing container's port(s) to the host using the postgres image:
```shell
docker run -d --name typing_goals_cli --env POSTGRES_PASSWORD=postgres --publish 5432:5432 postgres
```

4. Verify the container created is running by checking that the IMAGE is `postgres` and the CREATED is `X seconds go`:
```shell
docker ps
```

5. Check the details about the database running in that container such as what's the user that owns the database:
```shell
docker logs <container_id>
```

6. Get the database url
The URL format is:
```shell
postgres://<user>:<password>@<host>:<port>/<database>
```
Given the actual values from this process, the url will be:
```shell
postgres://postgres:postgres@localhost:5432/postgres
```
ℹ️ Keep a copy of this database url as it will be prompted from the CLI


Test the database has been setup in Docker by connecting to it and running a few commands:
```shell
docker exec -it <container_id> psql -U postgres
```

This should show a prompt for a SQL command and enter in the following:
```shell
SELECT version();
```

To exit the output screen, press `q`

To exit the container, type `quit`

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
[X] `clear` command to wipe the text from the CLI
