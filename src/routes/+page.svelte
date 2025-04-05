<!-- src/routes/+page.svelte -->
<script lang="ts">
	import image_welcome from '$lib/images/logo.png';

	// Définition des fonctionnalités
	let activeFeature = 0;
	const features = [
		{
			title: 'Base de données complète',
			description:
				"Accédez à une vaste collection d'exercices de mathématiques de niveau post-bac,  organisés par thèmes.",
			icon: 'bi-database'
		},
		{
			title: 'Mode Vidéoprojecteur',
			description:
				'Affichez les exercices en grand format, parfait pour une utilisation en amphithéâtre ou en classe.',
			icon: 'bi-display'
		},
		{
			title: 'Fiches personnalisées',
			description:
				'Générez des listes personnalisées d_exercices, aussi facilement que vous ajoutez un produit dans un panier.',
			icon: 'bi-file-text'
		},
		{
			title: 'Recherche Avancée',
			description:
				'Trouvez rapidement les exercices pertinents grâce à notre moteur de recherche intelligent.',
			icon: 'bi-search'
		}
	];

	const setActiveFeature = (index: number) => {
		activeFeature = index;
	};
</script>

<main>
	<!-- Hero Section -->
	<section class="py-5 bg-gradient">
		<div class="container text-center py-5">
			<div class="row justify-content-center">
				<div class="col-lg-8">
					<img src={image_welcome} alt="Welcome" class="logo mb-4" width="320" height="320" />
					<!-- <h1 class="display-4 fw-bold mb-3">OpenYourMath</h1> -->
					<p class="lead text-muted mb-4">
						Une base de données d'exercices de mathématiques pour l'enseignement supérieur,
						accessible à tous.
					</p>
					<div class="d-flex justify-content-center gap-3">
						<a href="/search" class="btn btn-primary btn-lg">
							Rechercher les exercices
							<i class="bi bi-chevron-right ms-2"></i>
						</a>
						<a href="/exercice/liste" class="btn btn-outline-primary btn-lg">
							Créer des listes personnalisées
						</a>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Features Section -->
	<section class="py-5">
		<div class="container">
			<div class="row g-4">
				{#each features as feature, index}
					<div class="col-md-6 col-lg-3">
						<div
							class="card h-100 feature-card {activeFeature === index ? 'active-feature' : ''}"
							on:mouseenter={() => setActiveFeature(index)}
							on:focus={() => setActiveFeature(index)}
						>
							<div class="card-body text-center">
								<i class="bi {feature.icon} feature-icon mb-3"></i>
								<h3 class="card-title h5 mb-3">{feature.title}</h3>
								<p class="card-text text-muted">{feature.description}</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Open Source & Stats Section -->
	<section class="py-5 bg-light">
		<div class="container">
			<!-- Open Source Banner -->
			<div class="text-center mb-5">
				<h2 class="h3 mb-4">100% Libre et Open Source</h2>
				<p class="lead text-muted mb-4">
					Tous nos exercices sont librement accessibles et modifiables par la communauté.
					Rejoignez-nous sur GitHub pour contribuer !
				</p>
				<a
					href="https://github.com/automathproject/openyourmath/tree/main/"
					class="btn btn-outline-primary"
					target="_blank"
					rel="noopener noreferrer"
				>
					<i class="bi bi-github me-2"></i>
					Voir le code source
				</a>
			</div>

			<!-- Stats Grid -->
			<div class="row text-center g-4">
				<div class="col-md-3">
					<div class="p-3">
						<div class="display-4 text-primary fw-bold mb-2">8000+</div>
						<div class="text-muted">Exercices libres</div>
					</div>
				</div>
				<div class="col-md-3">
					<div class="p-3">
						<div class="display-4 text-primary fw-bold mb-2">20+</div>
						<div class="text-muted">Thèmes mathématiques</div>
					</div>
				</div>
				<div class="col-md-3">
					<div class="p-3">
						<div class="display-4 text-primary fw-bold mb-2">
							<i class="bi bi-people"></i>
						</div>
						<div class="text-muted">Communauté active</div>
					</div>
				</div>
				<div class="col-md-3">
					<div class="p-3">
						<div class="display-4 text-primary fw-bold mb-2">
							<i class="bi bi-code-slash"></i>
						</div>
						<div class="text-muted">Code source ouvert</div>
					</div>
				</div>
			</div>

			<!-- License Info -->
			<div class="text-center mt-5">
				<p class="text-muted">
					<i class="bi bi-creative-commons me-2"></i>
					Sous licence libre
					<a
						href="https://creativecommons.org/licenses/by-sa/4.0/"
						target="_blank"
						rel="noopener noreferrer"
						class="text-primary"
					>
						Creative Commons BY-SA 4.0
					</a>
				</p>
			</div>
		</div>
	</section>
</main>

<!-- Style block is now empty or removed -->
<style>
	/* No styles here anymore */
</style>