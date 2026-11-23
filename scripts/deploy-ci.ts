/**
 * Workers Builds deploy command (`bun run deploy:ci`).
 *
 * Runs `wrangler deploy` with the commit as the version tag and the commit
 * subject as the version message, so the dashboard and the CMS Infrastructure
 * page show what each deployment shipped. Falls back to a plain deploy when
 * git details are unavailable.
 */

function git(...args: string[]): string {
	try {
		const result = Bun.spawnSync(["git", ...args], { stdout: "pipe", stderr: "ignore" });
		return result.exitCode === 0 ? result.stdout.toString().trim() : "";
	} catch {
		return "";
	}
}

const sha = process.env.WORKERS_CI_COMMIT_SHA || git("rev-parse", "HEAD");
const subject = git("log", "-1", "--pretty=%s");

const args = ["wrangler", "deploy", ...process.argv.slice(2)];
// Tags are short; 12 hex characters stay unique for this repository.
if (/^[0-9a-f]{7,40}$/iu.test(sha)) args.push("--tag", sha.slice(0, 12));
if (subject) args.push("--message", subject.slice(0, 100));

const child = Bun.spawn(["bunx", ...args], { stdout: "inherit", stderr: "inherit" });
process.exit(await child.exited);
