import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Miniflare } from "miniflare";

const migrations = ["0001_initial.sql", "0002_profile_links.sql", "0003_project_categories.sql"];

export async function createTestD1() {
	const miniflare = new Miniflare({
		workers: [
			{
				config: {
					name: "portfolio-content-test",
					type: "worker",
					compatibilityDate: "2026-08-25",
					manifest: {
						mainModule: "index.js",
						modules: {
							"index.js": {
								type: "esm",
								contents: "export default { fetch() { return new Response('ok'); } };",
							},
						},
					},
					env: { DB: { type: "d1", name: "portfolio-content-test" } },
				},
			},
		],
	});
	const db = await miniflare.getD1Database("DB");

	for (const migration of migrations) {
		const sql = await readFile(resolve(process.cwd(), "migrations", migration), "utf8");
		for (const statement of sql
			.split(";")
			.map((value) => value.trim())
			.filter(Boolean)) {
			await db.prepare(statement).run();
		}
	}

	return {
		db: db as unknown as D1Database,
		dispose: () => miniflare.dispose(),
	};
}

export type TestD1 = Awaited<ReturnType<typeof createTestD1>>;
