<!-- src/components/filters/CorrectionFilter.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  // Options de filtre
  type CorrectionFilter = 'all' | 'with' | 'without';
  
  // État du filtre
  export let correctionFilter: CorrectionFilter = 'all';
  
  const dispatch = createEventDispatcher();
  
  // Pour déterminer si le switch est activé
  $: withCorrection = correctionFilter === 'with';
  $: withoutCorrection = correctionFilter === 'without';
  
  function handleFilterChange(value: CorrectionFilter) {
    // Si on clique sur un switch déjà actif, on revient à 'all'
    if (correctionFilter === value) {
      correctionFilter = 'all';
    } else {
      correctionFilter = value;
    }
    
    dispatch('filterChange');
  }
</script>

<div class="d-flex flex-column gap-2 p-3">
  <div class="form-check form-switch">
    <input 
      class="form-check-input" 
      type="checkbox" 
      role="switch" 
      id="switchWithCorrection" 
      checked={withCorrection}
      on:change={() => handleFilterChange('with')}
    />
    <label class="form-check-label" for="switchWithCorrection">
      Avec solution
    </label>
  </div>
  
</div>