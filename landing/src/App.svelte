<script>
    import { onMount } from 'svelte';
    let featuresOpen = $state(false);

    let waitlistEmail = $state('');
    let waitlistStatus = $state('idle'); // 'idle' | 'loading' | 'success' | 'error'
    let waitlistError = $state('');

    async function handleWaitlist(e) {
        e.preventDefault();
        if (!waitlistEmail) return;

        waitlistStatus = 'loading';
        waitlistError = '';
        
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const res = await fetch(`${apiUrl}/api/waitlist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: waitlistEmail })
            });
            const data = await res.json();
            
            if (data.success) {
                waitlistStatus = 'success';
            } else {
                waitlistStatus = 'error';
                waitlistError = data.error || data.message || 'Failed to join.';
            }
        } catch (err) {
            waitlistStatus = 'error';
            waitlistError = 'Network error. Make sure the backend is running.';
        }
    }
</script>

<svelte:head>
    <title>CoReeder</title>
</svelte:head>

<div class="landing-page">
    <div class="left-col">
        <div class="content">
            <h2 class="brand-text">Coreeder</h2>
            <h1 class="headline">Understanding, built into the web.</h1>
            <div class="actions">
                <button onclick={() => featuresOpen = true} class="btn btn-secondary">Check features</button>
                
                {#if waitlistStatus === 'idle' || waitlistStatus === 'error'}
                    <form class="waitlist-form" onsubmit={handleWaitlist}>
                        <input type="email" bind:value={waitlistEmail} placeholder="Enter your email" required />
                        <button type="submit" class="btn btn-primary" disabled={!waitlistEmail}>Join waitlist</button>
                    </form>
                {:else if waitlistStatus === 'loading'}
                    <span class="waitlist-msg">Joining...</span>
                {:else if waitlistStatus === 'success'}
                    <span class="waitlist-msg success">You're on the list!</span>
                {/if}
            </div>
            {#if waitlistError}
                <p class="waitlist-error">{waitlistError}</p>
            {/if}
        </div>
    </div>
    <div class="right-col">
        <img src="/images/landing-hero.jpg" alt="Background" class="bg-image" />
        <img src="/images/landing-hero.png" alt="App Screenshot" class="screenshot-image" />
    </div>

    {#if featuresOpen}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="features-backdrop" onclick={() => featuresOpen = false}></div>
    {/if}

    <div class="t-panel-slide features-panel" data-open={featuresOpen}>
        <div class="panel-header">
            <h2 class="panel-title">Features</h2>
            <button class="close-btn" onclick={() => featuresOpen = false} aria-label="Close">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        <ul class="features-list">
            <li>
                <strong>Explanation of Selected Text</strong>
                <p>Highlight complex text to get instant, context-aware explanations as you read.</p>
            </li>
            <li>
                <strong>Automatic Article Saver</strong>
                <p>Never lose a good read again. CoReeder automatically saves the articles and blogs you browse.</p>
            </li>
            <li>
                <strong>Smart Categorizer</strong>
                <p>Your library is effortlessly organized using AI to categorize every saved piece into its right place.</p>
            </li>
        </ul>
    </div>
</div>

<style>
    :root {
        --panel-open-dur: 400ms;
        --panel-close-dur: 350ms;
        --panel-translate-y: 60px;
        --panel-blur: 4px;
        --panel-ease: cubic-bezier(0.22, 1, 0.36, 1);
    }

    .landing-page {
        display: grid;
        grid-template-columns: 1fr 1fr;
        min-height: 100vh;
        background: var(--color-bg);
        overflow-x: hidden;
    }

    .left-col {
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 40px 60px 80px;
        z-index: 10;
    }

    .content {
        max-width: 600px;
    }

    .brand-text {
        font-family: 'Instrument Sans', sans-serif;
        font-size: 18px;
        color: var(--color-heading);
        margin-bottom: 24px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .headline {
        font-family: var(--font-serif);
        font-size: clamp(48px, 6vw, 84px);
        font-weight: 400;
        color: var(--color-heading);
        line-height: 1.05;
        letter-spacing: -0.01em;
        margin-bottom: 48px;
        text-wrap: balance;
    }

    .actions {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
    }

    .waitlist-form {
        display: flex;
        gap: 8px;
    }

    .waitlist-form input {
        height: 36px;
        padding: 0 16px;
        border-radius: 6px;
        border: 1px solid var(--color-hairline);
        background: var(--color-surface);
        color: var(--color-text);
        font-family: 'Instrument Sans', sans-serif;
        font-size: 14px;
        outline: none;
        width: 100%;
        max-width: 220px;
        transition: border-color 0.2s;
    }

    .waitlist-form input:focus {
        border-color: var(--color-heading);
    }

    .waitlist-msg {
        font-family: 'Instrument Sans', sans-serif;
        font-size: 14px;
        color: var(--color-heading);
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        height: 36px;
        padding: 0 16px;
    }

    .waitlist-msg.success {
        color: #2e7d32;
    }

    .waitlist-error {
        margin-top: 12px;
        font-size: 13px;
        color: #d32f2f;
        font-family: 'Instrument Sans', sans-serif;
    }

    .btn {
        /* Layout */
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        white-space: nowrap;
        flex-shrink: 0;

        /* Shape & Text */
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        font-family: var(--font-serif);

        /* Size Variants: default */
        height: 36px;
        padding: 8px 16px;

        /* Interaction */
        cursor: pointer;
        transition: all 0.2s var(--transition-ease);
        outline: none;
        text-decoration: none;
        box-shadow: var(--shadow-button);
    }

    .btn:disabled {
        pointer-events: none;
        opacity: 0.5;
    }

    .btn:focus-visible {
        box-shadow: 0 0 0 3px rgba(23, 19, 15, 0.2);
    }

    .btn:active {
        transform: scale(0.96);
    }

    /* Icon Handling */
    .btn svg {
        pointer-events: none;
        flex-shrink: 0;
        width: 16px;
        height: 16px;
    }

    .btn-primary {
        background: var(--color-heading);
        color: var(--color-bg);
    }

    .btn-primary:hover {
        opacity: 0.9;
    }

    .btn-secondary {
        background: var(--color-surface);
        color: var(--color-text);
        border: 1px solid var(--color-hairline);
    }

    .btn-secondary:hover {
        background: var(--color-hairline);
    }

    .right-col {
        position: relative;
        height: 100vh;
        display: flex;
        align-items: center;
    }

    .bg-image {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: 0;
    }

    .screenshot-image {
        position: absolute;
        z-index: 1;
        width: 130%; /* 130% of the 50% column = 65% of total screen width */
        left: 35%; /* Pushes the image right so exactly half (65%) is visible and the rest overflows */
        top: 50%;
        transform: translateY(-50%);
        height: auto;
        border-radius: 12px;
        border: 1px solid rgba(0, 0, 0, 0.06);
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.15);
    }

    /* Panel Transitions (from Transitions.dev) */
    .t-panel-slide {
        transform: translateY(var(--panel-translate-y));
        opacity: 0;
        filter: blur(var(--panel-blur));
        pointer-events: none;
        transition:
            transform var(--panel-close-dur) var(--panel-ease),
            opacity   var(--panel-close-dur) var(--panel-ease),
            filter    var(--panel-close-dur) var(--panel-ease);
        will-change: transform, opacity, filter;
    }

    .t-panel-slide[data-open="true"] {
        transform: translateY(0);
        opacity: 1;
        filter: blur(0);
        pointer-events: auto;
        transition:
            transform var(--panel-open-dur) var(--panel-ease),
            opacity   var(--panel-open-dur) var(--panel-ease),
            filter    var(--panel-open-dur) var(--panel-ease);
    }

    @media (prefers-reduced-motion: reduce) {
        .t-panel-slide { transition: none !important; }
    }

    /* Features Panel Specific Styling */
    .features-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.2);
        z-index: 99;
        animation: fadeIn var(--panel-open-dur) var(--panel-ease) forwards;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    .features-panel {
        position: fixed;
        bottom: 40px;
        left: 40px;
        width: 400px;
        max-width: calc(100vw - 80px);
        background: var(--color-surface);
        border-radius: 16px;
        padding: 32px;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.12);
        border: 1px solid rgba(0, 0, 0, 0.05);
        z-index: 100;
        color: var(--color-text);
    }

    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
    }

    .panel-title {
        font-family: var(--font-serif);
        font-style: italic;
        font-size: 28px;
        color: var(--color-heading);
    }

    .close-btn {
        background: none;
        border: none;
        padding: 8px;
        cursor: pointer;
        color: var(--color-muted);
        transition: color 0.2s;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .close-btn:hover {
        color: var(--color-heading);
        background: rgba(0, 0, 0, 0.04);
    }

    .features-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .features-list li {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .features-list strong {
        font-family: 'Instrument Sans', sans-serif;
        font-size: 16px;
        color: var(--color-heading);
    }

    .features-list p {
        font-size: 14px;
        color: var(--color-muted);
        line-height: 1.5;
        margin: 0;
    }

    @media (max-width: 900px) {
        .landing-page {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
        }

        .left-col {
            padding: 40px 32px 60px;
            justify-content: center;
        }

        .actions {
            flex-direction: column;
            align-items: flex-start;
        }

        .waitlist-form {
            width: 100%;
            flex-direction: column;
        }

        .waitlist-form input {
            max-width: 100%;
        }

        .right-col {
            height: 50vh;
            overflow: hidden;
        }

        .screenshot-image {
            width: 130%;
            left: 35%;
        }

        .features-panel {
            bottom: 20px;
            left: 20px;
            max-width: calc(100vw - 40px);
            padding: 24px;
        }
    }
</style>
