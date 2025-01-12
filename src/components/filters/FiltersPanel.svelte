<!-- src/components/filters/FiltersPanel.svelte -->
<script lang="ts">
    import { Filter } from 'lucide-svelte';
    import ThemeFilter from './ThemeFilter.svelte';
    
    export let selectedTags: Set<string>;
    export let allTags: Map<string, number>;
    export let dynamicTagCounts: Map<string, number>;
</script>

<div class="card">
    <div class="card-header d-flex align-items-center gap-2">
        <Filter size={20} />
        <h4 class="mb-0">Filtres</h4>
    </div>
    <div class="card-body p-0">
        <!-- Liste des filtres -->
        <div class="filters-list">
            <!-- Filtre par thème -->
            <div class="filter-section">
                <ThemeFilter
                    {selectedTags}
                    {allTags}
                    {dynamicTagCounts}
                    on:toggleTag
                    on:resetTags
                />
            </div>
            
            <!-- Futur filtre 1 -->
            <div class="filter-section">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center py-2 px-3">
                        <h5 class="card-title mb-0">Autre filtre 1</h5>
                    </div>
                    <div class="card-body">
                        <p class="text-muted">Filtre en développement...</p>
                    </div>
                </div>
            </div>
            
            <!-- Futur filtre 2 -->
            <div class="filter-section">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center py-2 px-3">
                        <h5 class="card-title mb-0">Autre filtre 2</h5>
                    </div>
                    <div class="card-body">
                        <p class="text-muted">Filtre en développement...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .card-header {
        background-color: #f8f9fa;
        border-bottom: 1px solid rgba(0, 0, 0, 0.125);
    }

    .filters-list {
        display: flex;
        flex-direction: column;
    }

    .filter-section {
        border-bottom: 1px solid #eee;
    }

    .filter-section:last-child {
        border-bottom: none;
    }

    .filter-section :global(.card) {
        border: none;
        border-radius: 0;
    }

    .filter-section :global(.card-header) {
        background-color: transparent;
    }
</style>