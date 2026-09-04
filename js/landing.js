// Landing Page JavaScript - Spanish with Yill (Lentes)

function initLanding() {
    // Ensure all cards are visible immediately
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.classList.add('visible');
    });

    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.onclick = () => {
            navLinks.classList.toggle('active');
        };

        // Close mobile menu when a link is clicked
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.onclick = () => {
                navLinks.classList.remove('active');
            };
        });
    }
}

// Support both early execution and standard load events
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanding);
} else {
    initLanding();
}
window.addEventListener('load', initLanding);
