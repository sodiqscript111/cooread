<script>
    import { onMount } from 'svelte';

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

    function scrollToFeatures() {
        document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
    }
</script>

<div class="page-wrapper">
    <header class="hero-section">
        <div class="hero-content">
            <div class="left-col">
                <div class="content-inner">
                    <h2 class="brand-text">Coreeder</h2>
                    <h1 class="headline">Understanding, built into the web.</h1>
                    
                    <div class="waitlist-container">
                        {#if waitlistStatus === 'idle' || waitlistStatus === 'error'}
                            <form class="waitlist-form" onsubmit={handleWaitlist}>
                                <input type="email" bind:value={waitlistEmail} placeholder="Enter your email" required />
                                <button type="submit" class="btn btn-primary" disabled={!waitlistEmail}>Join waitlist</button>
                            </form>
                        {:else if waitlistStatus === 'loading'}
                            <div class="waitlist-state">
                                <span class="waitlist-msg">Joining...</span>
                            </div>
                        {:else if waitlistStatus === 'success'}
                            <div class="waitlist-state success">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                <span class="waitlist-msg">You're on the list! We'll be in touch.</span>
                            </div>
                        {/if}
                        {#if waitlistError}
                            <p class="waitlist-error">{waitlistError}</p>
                        {/if}
                    </div>

                    <button class="scroll-link" onclick={scrollToFeatures}>
                        Explore features
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                    </button>
                </div>
            </div>
            <div class="right-col">
                <img src="/images/landing-hero.jpg" alt="Background" class="bg-image" />
                <div class="screenshot-wrapper">
                    <img src="/images/landing-hero.png" alt="App Screenshot" class="screenshot-image" />
                </div>
            </div>
        </div>
    </header>

    <section id="features" class="features-section">
        <div class="container">
            <div class="features-header">
                <h2 class="section-title">Everything you need to master your reading</h2>
                <p class="section-subtitle">CoReeder transforms how you consume and organize information across the web.</p>
            </div>
            
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    </div>
                    <h3>Explanation of Selected Text</h3>
                    <p>Highlight complex text to get instant, context-aware explanations as you read, without leaving the page.</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    </div>
                    <h3>Automatic Article Saver</h3>
                    <p>Never lose a good read again. CoReeder automatically saves the articles and blogs you browse for later consumption.</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                    </div>
                    <h3>Smart Categorizer</h3>
                    <p>Your library is effortlessly organized using AI to automatically categorize every saved piece into its right place.</p>
                </div>
            </div>
        </div>
    </section>
    
    <footer class="footer">
        <div class="container">
            <p>&copy; 2026 Coreeder. All rights reserved.</p>
        </div>
    </footer>
</div>

<style>
    .page-wrapper {
        background: var(--color-bg);
        min-height: 100vh;
        overflow-x: hidden;
        display: flex;
        flex-direction: column;
    }

    /* --- Hero Section --- */
    .hero-section {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        position: relative;
    }

    .hero-content {
        flex: 1;
        display: grid;
        grid-template-columns: 1fr 1fr;
        width: 100%;
    }

    .left-col {
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 60px 80px;
        z-index: 10;
    }

    .content-inner {
        max-width: 540px;
        width: 100%;
        margin: 0 auto;
    }

    .brand-text {
        font-family: 'Instrument Sans', sans-serif;
        font-size: 16px;
        color: var(--color-heading);
        margin-bottom: 24px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .headline {
        font-family: var(--font-serif);
        font-size: clamp(40px, 5vw, 76px);
        font-weight: 400;
        color: var(--color-heading);
        line-height: 1.05;
        letter-spacing: -0.01em;
        margin-bottom: 40px;
        text-wrap: balance;
    }

    /* --- Waitlist Component --- */
    .waitlist-container {
        margin-bottom: 32px;
        background: var(--color-surface);
        padding: 24px;
        border-radius: 16px;
        border: 1px solid rgba(0,0,0,0.04);
        box-shadow: 0 4px 24px rgba(0,0,0,0.03);
    }

    .waitlist-form {
        display: flex;
        gap: 12px;
        width: 100%;
    }

    .waitlist-form input {
        flex: 1;
        height: 48px;
        padding: 0 20px;
        border-radius: 10px;
        border: 1px solid rgba(0,0,0,0.1);
        background: var(--color-bg);
        color: var(--color-text);
        font-family: 'Instrument Sans', sans-serif;
        font-size: 16px;
        outline: none;
        transition: all 0.2s ease;
    }

    .waitlist-form input:focus {
        border-color: var(--color-heading);
        box-shadow: 0 0 0 3px rgba(23, 19, 15, 0.1);
    }

    .btn {
        height: 48px;
        padding: 0 28px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 500;
        font-family: 'Instrument Sans', sans-serif;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
    }

    .btn-primary {
        background: var(--color-heading);
        color: var(--color-bg);
        border: none;
    }

    .btn-primary:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .btn-primary:active:not(:disabled) {
        transform: translateY(1px);
    }

    .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .waitlist-state {
        display: flex;
        align-items: center;
        gap: 12px;
        height: 48px;
        font-family: 'Instrument Sans', sans-serif;
        font-size: 16px;
        font-weight: 500;
        color: var(--color-heading);
    }

    .waitlist-state.success {
        color: #2e7d32;
    }

    .waitlist-error {
        margin-top: 12px;
        font-size: 14px;
        color: #d32f2f;
        font-family: 'Instrument Sans', sans-serif;
    }

    .scroll-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--color-muted);
        font-family: 'Instrument Sans', sans-serif;
        font-size: 15px;
        font-weight: 500;
        padding: 8px 0;
        transition: color 0.2s ease;
    }

    .scroll-link:hover {
        color: var(--color-heading);
    }

    /* --- Hero Right Column --- */
    .right-col {
        position: relative;
        height: 100%;
        display: flex;
        align-items: center;
        background: #e8e2d7;
        overflow: hidden;
    }

    .bg-image {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0.8;
    }

    .screenshot-wrapper {
        position: absolute;
        left: 20%;
        width: 120%;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 32px 80px rgba(0,0,0,0.2);
        border: 1px solid rgba(255,255,255,0.2);
    }

    .screenshot-image {
        display: block;
        width: 100%;
        height: auto;
    }

    /* --- Features Section --- */
    .features-section {
        padding: 120px 0;
        background: var(--color-surface);
        border-top: 1px solid rgba(0,0,0,0.03);
    }

    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 40px;
    }

    .features-header {
        text-align: center;
        max-width: 640px;
        margin: 0 auto 80px;
    }

    .section-title {
        font-size: clamp(32px, 4vw, 48px);
        margin-bottom: 24px;
    }

    .section-subtitle {
        font-family: 'Instrument Sans', sans-serif;
        font-size: 18px;
        color: var(--color-muted);
        line-height: 1.6;
    }

    .features-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 40px;
    }

    .feature-card {
        padding: 40px;
        border-radius: 20px;
        background: var(--color-bg);
        border: 1px solid rgba(0,0,0,0.04);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .feature-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 32px rgba(0,0,0,0.05);
    }

    .feature-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: rgba(23, 19, 15, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 24px;
        color: var(--color-heading);
    }

    .feature-card h3 {
        font-family: 'Instrument Sans', sans-serif;
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 12px;
    }

    .feature-card p {
        font-family: 'Instrument Sans', sans-serif;
        font-size: 15px;
        color: var(--color-muted);
        line-height: 1.6;
    }

    /* --- Footer --- */
    .footer {
        padding: 40px 0;
        text-align: center;
        font-family: 'Instrument Sans', sans-serif;
        font-size: 14px;
        color: var(--color-muted);
        border-top: 1px solid rgba(0,0,0,0.05);
    }

    /* --- Mobile Responsiveness --- */
    @media (max-width: 1024px) {
        .features-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 900px) {
        .hero-content {
            grid-template-columns: 1fr;
            grid-template-rows: auto 40vh;
        }

        .left-col {
            padding: 60px 32px 40px;
            align-items: center;
            text-align: center;
        }

        .content-inner {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .waitlist-form {
            flex-direction: column;
            align-items: stretch;
        }

        .waitlist-form input {
            width: 100%;
            text-align: center;
        }

        .screenshot-wrapper {
            left: 5%;
            width: 90%;
            top: 50%;
            transform: translateY(-50%);
        }

        .features-grid {
            grid-template-columns: 1fr;
            gap: 24px;
        }

        .feature-card {
            padding: 32px;
            text-align: left;
        }

        .features-section {
            padding: 80px 0;
        }
    }

    @media (max-width: 480px) {
        .left-col {
            padding: 40px 24px;
        }

        .waitlist-container {
            width: 100%;
            padding: 20px;
        }

        .container {
            padding: 0 24px;
        }
    }
</style>
