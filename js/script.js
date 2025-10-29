// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

// --- Random space facts ---
const FACTS = [
	'Space is not completely empty — it contains tiny particles, electromagnetic fields, and radiation.',
	'A day on Venus is longer than a year on Venus — it rotates very slowly.',
	'There are more stars in the observable universe than grains of sand on all the Earth\'s beaches.',
	'Neutron stars are so dense that a teaspoonful would weigh about 10 million tons on Earth.',
	'The footprints on the Moon will likely remain for millions of years because there is no wind to erase them.',
	'Saturn could float in water — it\'s mostly made of gas and less dense than water.',
	'Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.',
	'Jupiter\'s Great Red Spot is a massive storm larger than Earth that has been raging for centuries.'
];

function showRandomFact() {
	const el = document.getElementById('factText');
	if (!el) return;
	const idx = Math.floor(Math.random() * FACTS.length);
	el.textContent = FACTS[idx];
}

// Show a random fact immediately on load
showRandomFact();

// --- Gallery fetching and rendering ---
// Button in the filters area (there's a single button there)
const fetchButton = document.querySelector('.filters button');
const gallery = document.getElementById('gallery');

// The JSON data source provided in the exercise
const DATA_URL = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json';

// Helper: parse a YYYY-MM-DD date string into a Date object (UTC)
function parseISODate(dateStr) {
	// Creating with the date-only string treats it as UTC in modern browsers
	return new Date(dateStr + 'T00:00:00Z');
}

// Render an array of items into the #gallery element
function renderGallery(items) {
	// Clear existing content
	gallery.innerHTML = '';

	if (!items || items.length === 0) {
		// Show the placeholder message if there are no items
		const placeholder = document.createElement('div');
		placeholder.className = 'placeholder';
		placeholder.innerHTML = `
			<div class="placeholder-icon">🔭</div>
			<p>No images found for that date range. Try a different range.</p>
		`;
		gallery.appendChild(placeholder);
		return;
	}

		// Create a card for each item
		items.forEach(item => {
			const card = document.createElement('figure');
			card.className = 'gallery-item';

			// store relevant data on the card for the modal
			card.dataset.title = item.title || '';
			card.dataset.date = item.date || '';
			card.dataset.explanation = item.explanation || '';
			card.dataset.mediaType = item.media_type || 'image';
			// Prefer hdurl for images when available
			card.dataset.url = item.hdurl || item.url || '';
			card.dataset.videoUrl = item.url || '';

			// Show the image or a video thumbnail
			const img = document.createElement('img');
			img.alt = item.title || 'Space media';
			img.loading = 'lazy';

			if (item.media_type === 'video') {
				// Use provided thumbnail if available, otherwise try to derive from YouTube URLs
				let thumb = item.thumbnail_url || '';
				if (!thumb && item.url) {
					// Attempt to extract YouTube ID and use YouTube thumbnail
					const ytMatch = item.url.match(/(?:v=|\/|be\/)([A-Za-z0-9_-]{11})/);
					if (ytMatch && ytMatch[1]) {
						thumb = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
					}
				}
				img.src = thumb || item.url || '';
				// Add a small video badge so users know this is a video
				const badge = document.createElement('span');
				badge.className = 'video-badge';
				badge.textContent = 'VIDEO';
				card.appendChild(badge);
			} else {
				// regular image
				img.src = item.url || '';
			}

			card.appendChild(img);

			// Caption with title and date
			const caption = document.createElement('figcaption');
			const title = document.createElement('h3');
			title.textContent = item.title || 'Untitled';
			const date = document.createElement('time');
			date.textContent = item.date || '';
			date.dateTime = item.date || '';

			caption.appendChild(title);
			caption.appendChild(date);
			card.appendChild(caption);

			// Open modal when card is clicked
			card.addEventListener('click', () => openModal(card.dataset));

			gallery.appendChild(card);
		});
}

// Fetch the JSON, filter by date range, and render
async function fetchAndShow() {
	try {
		// Show a loading message
		gallery.innerHTML = '<div class="placeholder"><p>Loading images…</p></div>';

		const resp = await fetch(DATA_URL);
		if (!resp.ok) throw new Error('Network response was not ok');
		const data = await resp.json();

		// Read selected dates from inputs
		const start = parseISODate(startInput.value);
		const end = parseISODate(endInput.value);

		// Filter items by date (inclusive). If an item has no date, skip it.
		const matched = data.filter(d => {
			if (!d.date) return false;
			const dt = parseISODate(d.date);
			return dt >= start && dt <= end;
		});

		// Optionally sort by date descending (newest first)
		matched.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

		renderGallery(matched);
	} catch (err) {
		console.error(err);
		gallery.innerHTML = '<div class="placeholder"><p>Unable to load images. Please try again later.</p></div>';
	}
}

// Wire up the button click to fetch and show the gallery
fetchButton.addEventListener('click', fetchAndShow);

// Optional: fetch immediately on load to show the default range
// fetchAndShow();

// --- Modal behavior ---
const modal = document.getElementById('modal');
const modalMedia = modal.querySelector('.modal-media');
const modalTitle = modal.querySelector('.modal-title');
const modalDate = modal.querySelector('.modal-date');
const modalExplanation = modal.querySelector('.modal-explanation');
const modalClose = modal.querySelector('.modal-close');
const modalOverlay = modal.querySelector('.modal-overlay');

function toYouTubeEmbed(url) {
	if (!url) return null;
	// Handles: watch?v=ID, youtu.be/ID, /embed/ID
	let m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
	if (m && m[1]) return `https://www.youtube.com/embed/${m[1]}?rel=0&modestbranding=1`;
	m = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
	if (m && m[1]) return `https://www.youtube.com/embed/${m[1]}?rel=0&modestbranding=1`;
	m = url.match(/embed\/([A-Za-z0-9_-]{11})/);
	if (m && m[1]) return `https://www.youtube.com/embed/${m[1]}?rel=0&modestbranding=1`;
	return null;
}

function openModal(data) {
	if (!modal) return;
	// Clear previous media
	modalMedia.innerHTML = '';

	// Title/date/explanation
	modalTitle.textContent = data.title || '';
	modalDate.textContent = data.date || '';
	modalDate.dateTime = data.date || '';
	modalExplanation.textContent = data.explanation || '';

	if (data.mediaType === 'video') {
		// Try to embed YouTube if possible
		const embed = toYouTubeEmbed(data.videoUrl);
		if (embed) {
			const iframe = document.createElement('iframe');
			iframe.src = embed;
			iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
			iframe.allowFullscreen = true;
			iframe.title = data.title || 'Video';
			modalMedia.appendChild(iframe);
		} else {
			// Fallback: show thumbnail (if available) and a link
			if (data.url) {
				const thumbImg = document.createElement('img');
				thumbImg.src = data.url;
				thumbImg.alt = data.title || 'Video thumbnail';
				modalMedia.appendChild(thumbImg);
			}
			const link = document.createElement('a');
			link.href = data.videoUrl || data.url || '#';
			link.target = '_blank';
			link.rel = 'noopener';
			link.textContent = 'Open video in new tab';
			link.style.display = 'inline-block';
			link.style.marginTop = '12px';
			modalMedia.appendChild(link);
		}
	} else {
		// Image: use a full-size image element (prefer hd or url)
		const img = document.createElement('img');
		img.className = 'modal-image';
		img.src = data.url || '';
		img.alt = data.title || 'Space image';
		modalMedia.appendChild(img);
	}

	modal.classList.add('open');
	modal.setAttribute('aria-hidden', 'false');

	// focus the close button for accessibility
	modalClose.focus();
}

function closeModal() {
	if (!modal) return;
	modal.classList.remove('open');
	modal.setAttribute('aria-hidden', 'true');
	// clear media to stop playback and release memory
	modalMedia.innerHTML = '';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);

// Close on Escape
document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape' && modal.classList.contains('open')) {
		closeModal();
	}
});
