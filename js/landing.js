// Landing Page JavaScript - Spanish with Lentes

document.addEventListener('DOMContentLoaded', () => {
    // Scroll Reveal Animation
    const cards = document.querySelectorAll('.card');

    const revealCards = () => {
        const triggerBottom = window.innerHeight * 0.85;

        cards.forEach(card => {
            const cardTop = card.getBoundingClientRect().top;
            if (cardTop < triggerBottom) {
                card.classList.add('visible');
            }
        });
    };

    window.addEventListener('scroll', revealCards);
    revealCards();

    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });

        // Close mobile menu when a link is clicked
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });
    }
});
