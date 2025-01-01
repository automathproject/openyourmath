<!-- src/components/buttons/ListViewButton.svelte -->
<script lang="ts">
    export let href: string;
    export let size: "sm" | "md" | "lg" = "md";
</script>

<a {href} class="btn-visualize {size}" aria-label="Visualiser la liste personnalisée" title="Visualiser la liste personnalisée">
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        class="list-icon"
        width={size === "sm" ? "24" : size === "md" ? "28" : "32"}
        height={size === "sm" ? "24" : size === "md" ? "28" : "32"}
    >
        <!-- Fond du calepin avec coin corné -->
        <path 
            d="M4 2h14c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2z" 
            fill="#f8f9fa"
            stroke="currentColor"
            stroke-width="1.5"
        />
        
        <!-- Effet de coin plié -->
        <path 
            d="M16 2v4h4" 
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
        />
        <path 
            d="M16 2l4 4" 
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
        />
        
        <!-- Lignes du calepin -->
        <line x1="6" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="6" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="6" y1="16" x2="12" y2="16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        
        <!-- Reliure du calepin -->
        <rect x="2" y="2" width="1" height="20" fill="currentColor"/>
    </svg>
</a>

<style>
    .btn-visualize {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background-color: transparent;
        color: #212529;
        border-radius: 0.5rem;
        transition: all 0.2s ease;
        aspect-ratio: 1;
    }

    .sm {
        padding: 0.5rem;
        width: 2.5rem;
    }

    .md {
        padding: 0.625rem;
        width: 3rem;
    }

    .lg {
        padding: 0.75rem;
        width: 3.5rem;
    }

    .btn-visualize:hover {
        background-color: rgba(0, 0, 0, 0.05);
        transform: translateY(-1px);
    }

    .btn-visualize:active {
        transform: translateY(0);
    }

    .list-icon {
        flex-shrink: 0;
    }
</style>