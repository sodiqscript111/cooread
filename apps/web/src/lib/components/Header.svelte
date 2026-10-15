<script>
    /** @type {{ email?: string, theme?: string, onThemeChange?: (theme: string) => void, onSignOut?: () => void }} */
    let { email = '', theme = 'light', onThemeChange, onSignOut } = $props();

    /** @param {string} nextTheme */
    function setTheme(nextTheme) {
        onThemeChange?.(nextTheme);
    }
</script>

<header class="header">
    <div class="brand">
        <div class="logo-row">
            <img src="/images/logo.png" alt="Logo" class="logo-img" />
            <h1 class="logo">CoReeder</h1>
        </div>
    </div>

    <div class="header-right">
        <div class="theme-toggle" aria-label="Theme">
            <button class:active={theme === 'light'} onclick={() => setTheme('light')}>Light</button>
            <button class:active={theme === 'dark'} onclick={() => setTheme('dark')}>Dark</button>
        </div>
        {#if email}
            <div class="account">
                <span class="user-email">{email}</span>
                <div class="avatar" aria-hidden="true">
                    {email[0]?.toUpperCase()}
                </div>
                {#if onSignOut}
                    <button class="signout-btn" onclick={onSignOut}>Sign out</button>
                {/if}
            </div>
        {/if}
    </div>
</header>

<style>
    .header {
        min-height: 76px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        padding: 20px 40px;
        border-bottom: 1px solid var(--color-hairline);
        background: color-mix(in srgb, var(--color-bg) 92%, transparent);
    }

    .brand {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
    }

    .logo-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .logo-img {
        width: 20px;
        height: 20px;
        object-fit: contain;
    }

    .logo {
        font-family: var(--font-serif);
        font-weight: 400;
        font-style: italic;
        font-size: 32px;
        color: var(--color-heading);
        line-height: 1;
        letter-spacing: -0.01em;
    }

    .header-right {
        display: flex;
        align-items: center;
        gap: 16px;
        min-width: 0;
    }

    .theme-toggle {
        min-height: 40px;
        display: inline-flex;
        align-items: center;
        padding: 4px;
        border-radius: 999px;
        background: var(--color-surface);
        box-shadow: var(--shadow-button);
    }

    .theme-toggle button {
        min-height: 32px;
        padding: 0 12px;
        border-radius: 999px;
        color: var(--color-muted);
        font-size: 13px;
        transition-property: transform, background, color;
        transition-duration: 150ms;
        transition-timing-function: var(--transition-ease);
    }

    .theme-toggle button.active {
        color: var(--color-bg);
        background: var(--color-heading);
    }

    .theme-toggle button:active {
        transform: scale(0.96);
    }

    .account {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
    }

    .user-email {
        max-width: min(38vw, 320px);
        color: var(--color-text);
        font-size: 14px;
        font-weight: 400;
        line-height: 1.3;
        overflow-wrap: anywhere;
    }

    .avatar {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: var(--color-heading);
        color: var(--color-bg);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 700;
        flex: 0 0 auto;
        box-shadow: var(--shadow-button);
    }

    .signout-btn {
        min-height: 32px;
        padding: 0 12px;
        border-radius: 999px;
        color: var(--color-muted);
        font-size: 13px;
        transition-property: transform, color, background;
        transition-duration: 150ms;
        transition-timing-function: var(--transition-ease);
    }

    .signout-btn:hover {
        color: var(--color-heading);
        background: var(--color-hairline);
    }

    .signout-btn:active {
        transform: scale(0.96);
    }

    @media (max-width: 780px) {
        .header {
            align-items: flex-start;
            flex-direction: column;
            padding: 18px;
        }

        .header-right {
            width: 100%;
            justify-content: space-between;
        }

        .user-email {
            max-width: 46vw;
        }
    }

    @media (max-width: 520px) {
        .header-right {
            align-items: flex-start;
            flex-direction: column;
        }

        .user-email {
            max-width: 100%;
        }
    }
</style>
