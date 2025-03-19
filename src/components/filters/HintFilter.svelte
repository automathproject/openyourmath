<!-- src/components/filters/HintFilter.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    
    // Options de filtre
    type HintFilter = 'all' | 'with' | 'without';
    
    // État du filtre
    export let hintFilter: HintFilter = 'all';
    
    const dispatch = createEventDispatcher();
    
    function handleFilterChange(value: HintFilter) {
      hintFilter = value;
      dispatch('filterChange', { value });
    }
    
    // Pour déterminer si le switch est activé
    $: withHint = hintFilter === 'with';
    $: withoutHint = hintFilter === 'without';
  </script>
  
  <div class="card">
    <div class="card-header d-flex justify-content-between align-items-center py-2 px-3">
    </div>
    <div class="card-body">
      <div class="d-flex flex-column gap-3">
        <!-- Switch pour "Avec indication" -->
        <div class="form-check form-switch">
          <input 
            class="form-check-input" 
            type="checkbox" 
            role="switch" 
            id="switchWithHint" 
            checked={withHint}
            on:change={() => handleFilterChange(withHint ? 'all' : 'with')}
          />
          <label class="form-check-label" for="switchWithHint">
            Avec indication
          </label>
        </div>
        
        <!-- Switch pour "Sans indication" -->
        <div class="form-check form-switch">
          <input 
            class="form-check-input" 
            type="checkbox" 
            role="switch" 
            id="switchWithoutHint" 
            checked={withoutHint}
            on:change={() => handleFilterChange(withoutHint ? 'all' : 'without')}
          />
          <label class="form-check-label" for="switchWithoutHint">
            Sans indication
          </label>
        </div>
      </div>
    </div>
  </div>