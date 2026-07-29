# typing_goals_cli

A CLI tool to manage typing goals and track progress using MonkeyType. 🐵 ⌨️

## Why?

Consistent, structured practice is what improves typing speed. To structure practice, there are presets in MonkeyType which allow for settings to be applied to change what you're working on. If you're working on accuracy, apply your accuracy preset that fails a test when you make a mistake and you're off and running. Working on consistency? Apply your consistency preset that fails a test when your consistency falls under your minimum and so on and so forth...

What's cool about presets is that you can save all the settings you want to them, including a tag. Tags are really helpful in displaying your metrics given a specific scenario you were practicing when the tag was applied. In short, having a tag named the same as the preset it belongs to allows for analyzing different practice sessions.

Part of improving on a skill is being able to track progress. You may not see dramatic improvements in your typing in the short term but as you begin to practice over time, you begin to strengthen your muscle memory. The thought of typing an `a` becomes learned action.

This tool was built so it becomes easy improve your typing through deliberate practice sessions. Setting a daily goal to do X tests or spend X time on a specific type of test provides structure and accountability.

## Quick Start (Docker Compose)

The fastest way to get running — no Node.js/nvm and no manual Postgres setup required, just [Docker](https://www.docker.com/products/docker-desktop/).

1. Clone the repository and change into the project directory
2. Run:
```shell
docker compose run --build --rm app
```
This builds the CLI, starts a Postgres database, applies all database migrations, and then starts the CLI itself — all with one command.

3. When prompted for the database url, enter:
```shell
postgres://postgres:postgres@db:5432/postgres
```
(`db` is the name Docker Compose gives the Postgres container on its internal network — not `localhost`.)

4. Follow the remaining prompts to connect your [MonkeyType](https://monkeytype.com/) account.

Your database url and MonkeyType login are saved for next time, so future runs of `docker compose run --rm app` will skip straight to the CLI.

If you'd rather not use Docker Compose, see the manual setup below.

## Pre-Setup

ℹ️ This section (and "Setup" below) describes running the CLI directly on your machine. Skip both if you used the Docker Compose Quick Start above.

### NodeJS
This tool requires the following to be setup prior to running the project:
- Node.js (install [nvm](https://github.com/nvm-sh/nvm) to manage node versions and see what version this project requires by viewing the `.nvmrc`)

### Docker
This tool uses docker to create the database.

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
docker run -d --name typing_goals_cli --env POSTGRES_PASSWORD=postgres --publish 5433:5432 postgres
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

### MonkeyType
This tool requires a [MonkeyType](https://monkeytype.com/) account.

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

ℹ️ When starting the CLI the first time, you'll be prompted for the database url created in the pre-setup process as well as your email/password to your MonkeyType account.

## Features

1. Inline autocompletion with ghost text: when typing a command in the CLI, the first matching option will appear inline as ghost text with the additional matching suggestions displayed below.
2. Command history: arrow up and down through previous commands entered in the CLI.
3. Remember me: keeps you logged in by using your refresh token to get a new access token when your access token expires.
4. Create goals associated with presets: keep track of meeting a goal based on completing tests with tags associated with a preset.

## Coming Soon

1. Add `doctor` command which will verify all configuration related steps including the Node version, DB connection, and MonkeyType account. This will serve as an easy way to troubleshoot whether the CLI is working as expected.
2. Add `stats` command which will summarize the number of days you've met your goals, lowest/highest wpm, # of tests, # of failed tests, and other metrics that would assist in understanding whether you're meeting your targets and when to raise the bar on your goals.