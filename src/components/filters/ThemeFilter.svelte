<!-- src/components/filters/ThemeFilter.svelte -->
<!-- src/components/ThemeFilter.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { ChevronDown, ChevronUp } from 'lucide-svelte';
    
    export let selectedTags: Set<string> = new Set();
    export let allTags: Map<string, number>;
    export let dynamicTagCounts: Map<string, number>;
    
    const dispatch = createEventDispatcher();
    let isExpanded = false;

    function toggleTag(tag: string) {
        dispatch('toggleTag', { tag });
    }

    function resetTags() {
        dispatch('resetTags');
    }

    $: availableFiltersCount = Array.from(allTags).reduce((count, [tag, _]) => {
        const availableCount = dynamicTagCounts.get(tag) ?? 0;
        return !selectedTags.has(tag) && availableCount > 0 ? count + 1 : count;
    }, 0);
</script>

<div class="card">
    <div 
        class="card-header d-flex justify-content-between align-items-center py-2 px-3 cursor-pointer"
        on:click={() => isExpanded = !isExpanded}
    >
        <div class="d-flex align-items-center gap-2">
            <h5 class="card-title mb-0">Filtre par thèmes</h5>
            <span class="filter-count">({availableFiltersCount})</span>
        </div>
        <button 
            class="btn btn-link p-0 collapse-btn"
            aria-label={isExpanded ? 'Réduire' : 'Développer'}
        >
            {#if isExpanded}
                <ChevronUp size={20} />
            {:else}
                <ChevronDown size={20} />
            {/if}
        </button>
    </div>
    
    {#if isExpanded}
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
                {#if selectedTags.size > 0}
                    <button 
                        class="btn btn-outline-danger btn-sm" 
                        on:click={resetTags}
                    >
                        Réinitialiser
                    </button>
                {/if}
            </div>
            
            {#if selectedTags.size > 0}
                <div class="selected-tags mb-3">
                    <div class="small text-muted mb-2">Filtres actifs :</div>
                    <div class="tags">
                        {#each Array.from(selectedTags) as tag}
                            <span class="tag selected">
                                {tag}
                                <span class="tag-count selected">
                                    {dynamicTagCounts.get(tag)}
                                </span>
                                <button 
                                    class="remove-tag"
                                    on:click={() => toggleTag(tag)}
                                >
                                    ×
                                </button>
                            </span>
                        {/each}
                    </div>
                </div>
            {/if}

            <div class="available-tags">
                {#if selectedTags.size > 0}
                    <div class="small text-muted mb-2">Filtres additionnels disponibles :</div>
                {/if}
                <div class="tags">
                    {#each Array.from(allTags) as [tag, totalCount]}
                        {@const availableCount = dynamicTagCounts.get(tag) ?? 0}
                        {#if !selectedTags.has(tag) && availableCount > 0}
                            <span 
                                class="tag"
                                on:click={() => toggleTag(tag)}
                            >
                                {tag}
                                <span class="tag-count">
                                    {availableCount}
                                </span>
                            </span>
                        {/if}
                    {/each}
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .card-header {
        background-color: #f8f9fa;
        border-bottom: 1px solid rgba(0, 0, 0, 0.125);
    }

    .cursor-pointer {
        cursor: pointer;
    }

    .filter-count {
        font-size: 0.9rem;
        color: #6c757d;
        font-weight: normal;
    }

    .collapse-btn {
        color: #6c757d;
        text-decoration: none;
    }

    .collapse-btn:hover {
        color: #343a40;
    }

    .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 0.5rem;
    }

    .tag {
        background-color: #e0e0e0;
        color: #333;
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 14px;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        cursor: pointer;
        transition: all 0.2s ease;
        user-select: none;
    }

    .tag:hover {
        background-color: #d0d0d0;
    }

    .tag.selected {
        background-color: #333;
        color: #fff;
    }

    .tag-count {
        background-color: rgba(0, 0, 0, 0.1);
        border-radius: 10px;
        padding: 2px 6px;
        margin-left: 6px;
        font-size: 12px;
        min-width: 24px;
        text-align: center;
    }

    .tag-count.selected {
        background-color: rgba(255, 255, 255, 0.2);
    }

    .remove-tag {
        background: none;
        border: none;
        color: inherit;
        margin-left: 4px;
        padding: 0 4px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s ease;
    }

    .remove-tag:hover {
        opacity: 1;
    }

    .selected-tags {
        padding-bottom: 1rem;
        border-bottom: 1px solid #eee;
    }

    .available-tags {
        padding-top: 0.5rem;
    }
</style>