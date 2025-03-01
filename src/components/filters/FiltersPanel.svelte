<!-- src/components/filters/FiltersPanel.svelte -->
<script lang="ts">
    import { Filter } from 'lucide-svelte';
    import ThemeFilter from './ThemeFilter.svelte';
    import CorrectionFilter from './CorrectionFilter.svelte';
    
    export let selectedTags: Set<string>;
    export let allTags: Map<string, number>;
    export let dynamicTagCounts: Map<string, number>;
    export let correctionFilter: 'all' | 'with' | 'without' = 'all';
    
    // Gestion de l'état des panels d'expansion
    let expandedSections = {
        themes: true,
        correction: true,
        filter1: false,
        filter2: false
    };
    
    function toggleSection(section: string) {
        expandedSections[section] = !expandedSections[section];
        expandedSections = expandedSections; // force reactivity
    }
</script>

<div class="card">
    <div class="card-header d-flex align-items-center gap-2">
        <Filter size={16} />
        <h5 class="mb-0">Filtres</h5>
    </div>
    <div class="card-body p-0">
        <!-- Liste des filtres -->
        <div class="filters-list">
            <!-- Filtre par thème -->
            <div class="filter-section">
                <div class="filter-header" on:click={() => toggleSection('themes')}>
                    <h5 class="filter-title">Thèmes</h5>
                    <span class="filter-toggle">{expandedSections.themes ? '−' : '+'}</span>
                </div>
                {#if expandedSections.themes}
                    <div class="filter-content">
                        <ThemeFilter
                            {selectedTags}
                            {allTags}
                            {dynamicTagCounts}
                            on:toggleTag
                            on:resetTags
                        />
                    </div>
                {/if}
            </div>
            
            <!-- Filtre par correction -->
            <div class="filter-section">
                <div class="filter-header" on:click={() => toggleSection('correction')}>
                    <h5 class="filter-title">Correction</h5>
                    <span class="filter-toggle">{expandedSections.correction ? '−' : '+'}</span>
                </div>
                {#if expandedSections.correction}
                    <div class="filter-content">
                        <CorrectionFilter
                            bind:correctionFilter
                            on:filterChange
                        />
                    </div>
                {/if}
            </div>
            
            <!-- Futur filtre 1 -->
            <div class="filter-section">
                <div class="filter-header" on:click={() => toggleSection('filter1')}>
                    <h5 class="filter-title">Autre filtre 1</h5>
                    <span class="filter-toggle">{expandedSections.filter1 ? '−' : '+'}</span>
                </div>
                {#if expandedSections.filter1}
                    <div class="filter-content">
                        <p class="text-muted p-3">Filtre en développement...</p>
                    </div>
                {/if}
            </div>
            
            <!-- Futur filtre 2 -->
            <div class="filter-section">
                <div class="filter-header" on:click={() => toggleSection('filter2')}>
                    <h5 class="filter-title">Autre filtre 2</h5>
                    <span class="filter-toggle">{expandedSections.filter2 ? '−' : '+'}</span>
                </div>
                {#if expandedSections.filter2}
                    <div class="filter-content">
                        <p class="text-muted p-3">Filtre en développement...</p>
                    </div>
                {/if}
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
    
    .filter-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .filter-header:hover {
        background-color: #f8f9fa;
    }
    
    .filter-title {
        margin: 0;
        font-size: 1rem;
        font-weight: 500;
    }
    
    .filter-toggle {
        font-size: 1.25rem;
        font-weight: bold;
        color: #6c757d;
    }
    
    .filter-content {
        padding: 0;
    }
</style>