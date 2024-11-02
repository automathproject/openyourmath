<script>
	import { page } from '$app/stores';
	import logo from '$lib/images/logo-coopmaths-carré-final.png';
	import github from '$lib/images/github.svg';
</script>

<header class="navbar navbar-expand-lg fixed-top bg-white bg-opacity-90">
	<div class="container">
		<div class="navbar-brand p-0">
			<a href="https://coopmaths.fr/alea/" class="d-block">
				<img src={logo} alt="MathAlea" class="logo-img" />
			</a>
		</div>

		<nav class="navbar-nav mx-auto">
			<ul class="d-flex list-unstyled mb-0">
				<li class="nav-item position-relative">
					<a
						href="/"
						class="nav-link px-3 {$page.url.pathname === '/' ? 'active' : ''}"
						aria-current={$page.url.pathname === '/' ? 'page' : undefined}
					>
						Accueil
					</a>
					{#if $page.url.pathname === '/'}
						<div class="active-indicator" />
					{/if}
				</li>
				<li class="nav-item position-relative">
					<a
						href="/search"
						class="nav-link px-3 {$page.url.pathname === '/search' ? 'active' : ''}"
						aria-current={$page.url.pathname === '/search' ? 'page' : undefined}
					>
						Recherche
					</a>
					{#if $page.url.pathname === '/search'}
						<div class="active-indicator" />
					{/if}
				</li>
				<li class="nav-item position-relative">
					<a
						href="/exercice"
						class="nav-link px-3 {$page.url.pathname === '/exercice' ? 'active' : ''}"
						aria-current={$page.url.pathname === '/exercice' ? 'page' : undefined}
					>
						Exercices
					</a>
					{#if $page.url.pathname === '/exercice'}
						<div class="active-indicator" />
					{/if}
				</li>
				<li class="nav-item position-relative">
					<a
						href="/exercice/liste"
						class="nav-link px-3 {$page.url.pathname === '/exercice/liste' ? 'active' : ''}"
						aria-current={$page.url.pathname === '/exercice/liste' ? 'page' : undefined}
					>
						Liste
					</a>
					{#if $page.url.pathname === '/exercice/liste'}
						<div class="active-indicator" />
					{/if}
				</li>
			</ul>
		</nav>

		<div class="navbar-brand p-0">
			<a
				href="https://github.com/automathproject/openyourmath/tree/main/"
				class="d-block"
				target="_blank"
				rel="noopener noreferrer"
			>
				<img src={github} alt="GitHub" class="github-img" />
			</a>
		</div>
	</div>
</header>

<style>
	header {
		backdrop-filter: blur(8px);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.logo-img {
		width: 2rem;
		height: 2rem;
		transition: transform 0.2s ease;
	}

	.logo-img:hover {
		transform: scale(1.1);
	}

	.github-img {
		width: 2rem;
		height: 2rem;
		opacity: 0.7;
		transition: opacity 0.2s ease;
	}

	.github-img:hover {
		opacity: 1;
	}

	.nav-link {
		font-size: 0.875rem;
		font-weight: 500;
		color: #4a5568;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		transition: color 0.2s ease;
	}

	.nav-link:hover {
		color: #2b6cb0;
	}

	.nav-link.active {
		color: #2b6cb0;
	}

	.active-indicator {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 2px;
		background-color: #2b6cb0;
	}

	/* Ajoutez un peu d'espace pour le contenu sous le header fixe */
	:global(body) {
		padding-top: 4rem;
	}

	@media (max-width: 992px) {
		.navbar-nav {
			margin: 0 !important;
		}

		.nav-link {
			padding: 0.5rem 1rem;
		}
	}
</style>