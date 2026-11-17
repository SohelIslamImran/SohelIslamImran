# Portfolio copy deck

Use seed content for personal facts, project details, dates, and metrics. Keep metric dates visible. These keys provide UI copy, not replacement facts.

## Global

- nav: Home / Work / Story / Résumé / Links
- command.placeholder: Find a page, project, or action…
- command.groups: Pages / Projects / Profiles / Appearance / Actions
- command.empty: No matches yet. Try a shorter search.
- actions: Copy email / Open email / Switch theme / Use light theme / Use dark theme / Follow system theme / Change accent / Close / Open menu / View source
- email.success: Email copied. Talk soon.
- footer.title: Let's talk about what comes next.
- footer.clock: Local time in Dhaka
- footer.credit: Built with TanStack Start. Served by Cloudflare Workers.
- footer.links: Source / Field notes / Links / RSS
- notFound.eyebrow: 404 — Route not found
- notFound.title: This trail ends here.
- notFound.body: I couldn't find that page. Head home or explore my work.
- notFound.actions: Return home / Explore work
- error.eyebrow: Trace paused
- error.title: The page needs another try.
- error.body: Something stopped this page from loading. Try again, or head home.
- error.actions: Try again / Return home

## Home

| Section key | Eyebrow | Title | Description |
| --- | --- | --- | --- |
| glance | 00 — At a glance | Where things stand. | What I'm working on, what I've shipped, and the tools I give away. |
| work | 01 — Work | Work I've shipped. | Products I've worked on for years, and open-source tools other developers install. |
| career | 02 — Path | From mobile apps to the whole stack. | Each role brought me closer to another part of the product. |
| approach | 03 — How I work | Follow the change through. | Each card is a stage a change has to clear before it ships. Ship a change to watch the checks run, then roll it back. |
| background | 04 — Background | I learned by building. | My path started with a phone and a question about making websites. |
| contact | 05 — Contact | What are you building? | Tell me about it and where it's stuck. |

- tiles.now.label: Now
- tiles.now.title: Lead Full Stack Engineer at Kuno
- tiles.now.body: I work across the product, services, data, and releases.
- tiles.location.label: Local time
- tiles.location.title: Dhaka, Bangladesh
- tiles.location.meta: UTC+6
- tiles.openSource.label: Open source
- tiles.openSource.title: App updates, one API.
- tiles.openSource.body: My open-source Expo module for in-app update prompts on Android and iOS.
- tiles.openSource.command: `npx expo install expo-in-app-updates`
- tiles.openSource.action: Copy install command
- tiles.openSource.success: Install command copied.
- tiles.quote.label: From a client
- tiles.tools.label: Tools I work with

## Stack Trace

| Layer | Sentence | Tools |
| --- | --- | --- |
| Interface | I build the screens people use and connect each one to the API behind it. | React, React Native, Expo, TanStack Router |
| API | I build services that turn a user action into a clear, checked response. | TypeScript, Bun, Elysia |
| Data | I shape the data behind a feature and keep its rules close to the code. | PostgreSQL, Drizzle, Redis |
| Access | I work on sign-in and permissions so each person sees only the data they should. | Better Auth, OIDC, SSO |
| Infrastructure | I help define where services run and what each deployment is allowed to touch. | AWS, Terraform, Docker |
| Release | I run automated checks before each release and help make sure a bad one can be rolled back. | GitHub Actions, Playwright, Bun Test, EAS |

## Engineering principles

- endToEnd.title: One change, every layer.
- endToEnd.body: A feature isn't done until its server rule, data change, and tests ship with the screen.
- boundaries.title: Put rules where they count.
- boundaries.body: I check access and privacy in the services and data layer, as well as the screen.
- native.title: Work with the platform.
- native.body: I start with shared code and write Kotlin or Swift only where Android and iOS differ, as they do for in-app updates.
- delivery.title: Make releases easy to check.
- delivery.body: If a change can't be checked automatically and rolled back, it isn't ready to ship.

## Work

- page.eyebrow: Work
- page.title: Shipped, maintained, and still experimenting.
- page.intro: Open any project to see what it does and the part I played.
- groups.all: All work — Products, tools, and experiments in one place.
- groups.product: Products — Products that shipped to real users.
- groups.openSource: Open source — Tools you can inspect, use, and build on.
- groups.experiment: Experiments — Small projects where I try an idea.
- empty.title: No projects in this view yet.
- empty.body: Try another group to see more of my work.
- empty.action: Show all work
- card.actions: View project / Visit site / View source / Open package
- detail.sections: Overview / What I did / By the numbers / Built with / Links
- detail.facts: My role / Period / Status
- detail.navigation: Previous project / Next project / All work

## Story

- sections: The beginning / Learning / First product work / A wider role / How I work now
- progress.label: Follow my story
- takeaway.label: What stayed with me
- source.label: Read the original Bengali career feature
- end.title: The next chapter starts with a conversation.
- end.body: If my way of working fits what you are building, I'd like to hear about it.
- end.action: Email me

## Résumé

- sections: Summary / Experience / Selected projects / Skills / Courses / Contact
- actions: Print / save PDF / View work / Email me
- meta.location: Dhaka, Bangladesh · UTC+6
- meta.updated: Updated {updatedAt}
- meta.print: A version you can print or save as a PDF.

## Links

- page.eyebrow: Links
- page.title: Find me around the web.
- page.intro: My work, profiles, and a direct way to get in touch.
- featured.heading: Good places to start
- filters.all: All — Every public link in one place.
- filters.work: Work — Code, packages, and professional work.
- filters.social: Social — My public profiles and updates.
- filters.contact: Contact — Get in touch with me directly.
- filters.story: Story — Read about my path and notes.
- empty.title: No links in this view yet.
- empty.body: Try another filter to keep exploring.
- empty.action: Show all links
- email.success: Email copied. Talk soon.

## Field notes

- page.eyebrow: Field notes
- empty.title: The first note is still ahead.
- empty.body: I haven't published any field notes yet. For now, you can explore what I've built or read how I got here.
- empty.action: Explore my work
- empty.secondaryAction: Read my story
