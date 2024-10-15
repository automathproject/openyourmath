<script lang="ts">
	import 'katex/dist/katex.min.css';
	import Exercice from './Exercice.svelte';
	import image_welcome from '$lib/images/logo.png';

	// Define the structure of the ExerciceData


	let exerciseUuid: string = '';
	let exerciseData: null;
	let errorMessage: string = 'Aucun exercice sélectionné';

	// Function to load the JSON data for the exercise
	async function loadExerciseData() {
		if (exerciseUuid) {
			try {
				// Fetch the JSON file from the static folder
				const response = await fetch(`../content/json/${exerciseUuid}.json`);
				if (response.ok) {
					exerciseData = await response.json();
					errorMessage = '';
				} else {
					errorMessage = `Error loading exercise: ${response.statusText}`;
				}
			} catch (error) {
				exerciseData = null;
				errorMessage = `L'exercice ${exerciseUuid} n'a pas pu être chargé`;
			}
		} else {
			exerciseData = null;
			errorMessage = 'Aucun exercice sélectionné';
		}
	}
</script>

<section>
	<h1> <span class="welcome"><img src={image_welcome} alt="Welcome" /></span> </h1>


	<!-- Input to accept the exercise UUID -->
	<input
		type="text"
		bind:value={exerciseUuid}
		placeholder="Enter exercise UUID"
		on:keydown={(event) => {
			if (event.key === 'Enter') {
				loadExerciseData();
			}
		}}
	/>
	<button on:click={loadExerciseData}>Afficher l'exercice</button>
	{#if errorMessage}
		<p class="error">{errorMessage}</p>
	{/if}

	{#if exerciseData}
		<!-- Pass the exerciseData as ExerciceData to the Exercice component -->
		<Exercice ExerciceData={exerciseData} /> <!-- Ensure prop is named "ExerciceData" -->
	{/if}
</section>


<style>
	.error {
		color: red;
	}
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 0.6;
	}

	h1 {
		width: 100%;
	}

	.welcome {
		display: block;
		position: relative;
		width: 100%;
		height: 0;
		padding: 0 0 calc(100% * 495 / 2048) 0;
	}

	.welcome img {
		position: absolute;
		width: 50%;
		height: 50%;
		top: 0;
		display: block;
	}
</style>
