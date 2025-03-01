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
</script>

<div class="card">
    <div class="card-header d-flex justify-content-between align-items-center py-2 px-3">
    </div>
    <div class="card-body">
        <div class="d-flex flex-column gap-2">
            <div class="form-check">
                <input 
                    class="form-check-input" 
                    type="radio" 
                    name="correctionFilter" 
                    id="filterAll" 
                    checked={correctionFilter === 'all'} 
                    on:change={() => handleFilterChange('all')}
                />
                <label class="form-check-label" for="filterAll">
                    Tous les exercices
                </label>
            </div>
            
            <div class="form-check">
                <input 
                    class="form-check-input" 
                    type="radio" 
                    name="correctionFilter" 
                    id="filterWithCorrection" 
                    checked={correctionFilter === 'with'} 
                    on:change={() => handleFilterChange('with')}
                />
                <label class="form-check-label" for="filterWithCorrection">
                    Avec solution
                </label>
            </div>
            
            <div class="form-check">
                <input 
                    class="form-check-input" 
                    type="radio" 
                    name="correctionFilter" 
                    id="filterWithoutCorrection" 
                    checked={correctionFilter === 'without'} 
                    on:change={() => handleFilterChange('without')}
                />
                <label class="form-check-label" for="filterWithoutCorrection">
                    Sans solution
                </label>
            </div>
        </div>
    </div>
</div>