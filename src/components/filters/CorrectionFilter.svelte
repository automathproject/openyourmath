<!-- src/components/filters/CorrectionFilter.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    
    // Options de filtre
    type CorrectionFilter = 'all' | 'with' | 'without';
    
    // État du filtre
    export let correctionFilter: CorrectionFilter = 'all';
    
    const dispatch = createEventDispatcher();
    
    function handleFilterChange(value: CorrectionFilter) {
      correctionFilter = value;
      dispatch('filterChange', { value });
    }
    
    // Pour déterminer si le switch est activé
    $: withCorrection = correctionFilter === 'with';
    $: withoutCorrection = correctionFilter === 'without';
  </script>
  
  <div class="card">
    <div class="card-header d-flex justify-content-between align-items-center py-2 px-3">
    </div>
    <div class="card-body">
      <div class="d-flex flex-column gap-3">
        <!-- Switch pour "Avec solution" -->
        <div class="form-check form-switch">
          <input 
            class="form-check-input" 
            type="checkbox" 
            role="switch" 
            id="switchWithCorrection" 
            checked={withCorrection}
            on:change={() => handleFilterChange(withCorrection ? 'all' : 'with')}
          />
          <label class="form-check-label" for="switchWithCorrection">
            Avec solution
          </label>
        </div>

      </div>
    </div>
  </div>