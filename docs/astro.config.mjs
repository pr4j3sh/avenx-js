// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	site: 'https://docs.avenx-js.com',
	base: '/',
	redirects: {
		'/': '/getting-started/intro',
	},
	integrations: [
		starlight({
			title: 'Avenx-JS',
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/avenx-js/avenx-js' }
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'getting-started/intro' },
						{ label: 'Installation', slug: 'getting-started/install' },
						{ label: 'Quick Start Tutorial', slug: 'getting-started/quickstart' },
						{ label: 'Project Structure', slug: 'getting-started/structure' },
						{ label: 'Configuration', slug: 'getting-started/configuration' },
					],
				},
				{
					label: 'Core Concepts',
					items: [
						{ label: 'Component Structure', slug: 'core-concepts/components' },
						{ label: 'Reactive State', slug: 'core-concepts/reactivity' },
						{ label: 'Computed Properties', slug: 'core-concepts/computed' },
						{ label: 'Actions & Event Handling', slug: 'core-concepts/events' },
						{ label: 'Templates & Slots', slug: 'core-concepts/templates' },
						{ label: 'Scoped & Global CSS', slug: 'core-concepts/styling' },
						{ label: 'Shared State & Bridges', slug: 'core-concepts/bridges' },
						{ label: 'Pages & Routing', slug: 'core-concepts/routing' },
					],
				},
				{
					label: 'CLI Reference',
					items: [
						{ label: 'CLI Commands', slug: 'cli-reference/commands' },
					],
				},
				{
					label: 'API Reference',
					items: [
						{ label: 'AvenxApp API', slug: 'api-reference/app' },
						{ label: 'AvenxComponent API', slug: 'api-reference/component' },
						{ label: 'AvenxPage API', slug: 'api-reference/page' },
						{ label: 'AvenxRouter & Guard API', slug: 'api-reference/router-guard' },
						{ label: 'Utility Functions', slug: 'api-reference/utils' },
					],
				},
				{
					label: 'Troubleshooting',
					items: [
						{ label: 'Error Codes', slug: 'troubleshooting/errors' },
					],
				},
				{
					label: 'Best Practices',
					items: [
						{ label: 'Best Practices', slug: 'best-practices/guide' },
					],
				},
			],
		}),
	],
});
