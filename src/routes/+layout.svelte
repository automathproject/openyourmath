<script>
	import Header from './Header.svelte';
	import '../app.css';
   </script>
   
   <div class="app">
	 <Header />
	 <main class="main-content">
	   <slot />
	 </main>
	 <footer>
	   <p>openyourmath.org - 2024 - Licence GNU AGPL v3</p>
	 </footer>
   </div>
   
   <style>
	 :global(:root) {
	   --header-height: 3.5rem;
	   --header-height-mobile: 3rem;
	 }
   
	 .app {
	   display: flex;
	   flex-direction: column;
	   min-height: 100vh;
	 }
   
	 .main-content {
	   flex: 1;
	   display: flex;
	   flex-direction: column;
	   padding: 1rem;
	   width: 100%;
	   max-width: 64rem;
	   margin: 0 auto;
	   box-sizing: border-box;
	   margin-top: var(--header-height); /* Ajoute une marge égale à la hauteur du header */
	 }
   
	 footer {
	   display: flex;
	   flex-direction: column;
	   justify-content: center;
	   align-items: center;
	   padding: 12px;
	 }
   
	 @media (max-width: 992px) {
	   .main-content {
		 margin-top: var(--header-height-mobile); /* Ajuste la marge pour mobile */
	   }
	 }
   
	 @media (min-width: 480px) {
	   footer {
		 padding: 12px 0;
	   }
	 }
   </style>