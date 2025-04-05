<!-- src/routes/+layout.svelte -->
<script>
	import Header from './Header.svelte';
	import 'katex/dist/katex.min.css';
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
   
