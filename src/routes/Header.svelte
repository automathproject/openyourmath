<!-- src/routes/Header.svelte -->
<script>
	import { page } from '$app/stores';
	import { customList } from '$lib/stores/customList'; // <-- 1. Importer le store
	import logo from '$lib/images/logo-coopmaths-carré-final.png';
	import github from '$lib/images/github.svg';

    // 2. Calculer l'URL dynamiquement
    $: maListeUrl = $customList.length > 0
        ? `/exercice/liste?list=${$customList.map(ex => ex.uuid).join(',')}`
        : '/exercice/liste'; // Lien de base si la liste est vide
</script>

<header class="navbar navbar-expand-lg fixed-top bg-white bg-opacity-90">
	<div class="container">
		<div class="navbar-brand p-0">
			<a href="https://coopmaths.fr/alea/" class="d-block">
				<img src={logo} alt="MathAlea" class="logo-img" />
			</a>
		</div>

		<button
			class="navbar-toggler"
			type="button"
			data-bs-toggle="collapse"
			data-bs-target="#navbarNav"
			aria-controls="navbarNav"
			aria-expanded="false"
			aria-label="Toggle navigation"
		>
			<span class="navbar-toggler-icon"></span>
		</button>

		<nav class="collapse navbar-collapse" id="navbarNav">
			<ul class="navbar-nav mx-auto">
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
						class="nav-link px-3 {$page.url.pathname.startsWith('/exercice') && !$page.url.pathname.startsWith('/exercice/liste') ? 'active' : ''}"
						aria-current={$page.url.pathname.startsWith('/exercice') && !$page.url.pathname.startsWith('/exercice/liste') ? 'page' : undefined}
					>
						Exercices
					</a>
                    <!-- Modification de la condition active -->
					{#if $page.url.pathname.startsWith('/exercice') && !$page.url.pathname.startsWith('/exercice/liste')}
						<div class="active-indicator" />
					{/if}
				</li>
				<li class="nav-item position-relative">
					<a
						href={maListeUrl}  
						class="nav-link px-3 {$page.url.pathname === '/exercice/liste' ? 'active' : ''}"
						aria-current={$page.url.pathname === '/exercice/liste' ? 'page' : undefined}
					>
						Ma Liste {#if $customList.length > 0}({$customList.length}){/if} <!-- Optionnel: afficher le nombre -->
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
	/* Utilisation des mêmes variables CSS que dans le layout principal */
	:global(:root) {
		--header-height: 3.5rem;
		--header-height-mobile: 3rem;
	}

	header {
		height: var(--header-height);
		min-height: var(--header-height);
		backdrop-filter: blur(8px);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		z-index: 1000;
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
		font-weight: 600; /* Rendre un peu plus visible l'état actif */
	}

	.active-indicator {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 2px;
		background-color: #2b6cb0;
	}

	@media (max-width: 992px) {
		header {
			height: var(--header-height-mobile);
			min-height: var(--header-height-mobile);
		}

		.navbar-collapse {
			position: absolute;
			top: var(--header-height-mobile);
			left: 0;
			right: 0;
			background: white;
			padding: 0.5rem;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		}

		.nav-item {
			margin: 0.25rem 0;
		}

		.active-indicator {
			height: 100%;
			width: 3px;
			left: 0;
			top: 0;
		}

		.nav-link {
			padding: 0.5rem 1rem;
		}
	}
</style>