document.addEventListener('DOMContentLoaded', () => {
  // --- General Settings & Loader ---
  const BOT_TOKEN = "7852603789:AAHNGDaHnpkvnzeKGM34mGge6RknW_rLcH4";
  const CHAT_ID = "7927571676";

  const loaderWrapper = document.querySelector('.loader-wrapper');
  if (loaderWrapper) {
    loaderWrapper.style.opacity = '0';
    setTimeout(() => { loaderWrapper.style.display = 'none'; }, 500);
  }

  // --- Homepage Logic: The Brain of the Website ---
  if (document.body.classList.contains('home-page')) {
    const operatingHours = { start: 19, end: 2 }; // 7 PM to 2 AM
    const packageCards = document.querySelectorAll('.glow-card');
    let activeTimers = {};

    function checkOperatingHours() {
      const now = new Date();
      const currentHour = now.getHours();
      return currentHour >= operatingHours.start || currentHour < operatingHours.end;
    }

    function updateToOfflineState() {
      const now = new Date();
      let nextOpening = new Date();
      nextOpening.setHours(operatingHours.start, 0, 0, 0);

      if (now.getHours() >= operatingHours.start) {
        nextOpening.setDate(nextOpening.getDate() + 1);
      }

      if (activeTimers['offline']) return; // Timer already running

      activeTimers['offline'] = setInterval(() => {
        const timeRemaining = nextOpening - new Date();
        if (timeRemaining <= 0) {
          clearInterval(activeTimers['offline']);
          window.location.reload();
          return;
        }
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

        const countdownText = `কার্যক্রম শুরু হবে: ${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')} পর`;

        packageCards.forEach(card => {
            card.querySelector('.status-bar').innerHTML = countdownText;
            const button = card.querySelector('.card-button');
            button.innerHTML = `অগ্রিম বুক করুন`;
            button.classList.remove('countdown-active');
            button.href = `booking.html?package=${card.dataset.name}`;
        });
      }, 1000);
    }

    function updateAllCardsOnline() {
      packageCards.forEach(card => {
        const packageId = card.id;
        const durationMinutes = parseInt(card.dataset.duration, 10);
        if(activeTimers[packageId]) clearInterval(activeTimers[packageId]);
        const status = getPackageStatus(packageId, durationMinutes);
        renderCardUI(card, status, durationMinutes, packageId);
      });
    }

    function getPackageStatus(packageId, duration) {
      const now = Date.now();
      let status = JSON.parse(localStorage.getItem(packageId)) || {};
      const timeSinceUpdate = status.lastUpdate ? (now - status.lastUpdate) / (1000 * 60) : Infinity;

      if (status.state === 'booked') {
        const timeSinceBooking = (now - status.bookedAt) / (1000 * 60);
        if (timeSinceBooking > duration) {
          status = {}; // Reset
        } else {
          return status; // Still booked
        }
      }

      if (timeSinceUpdate > duration || !status.lastUpdate) {
        const viewers = Math.floor(Math.random() * 10) + 1;
        status = (viewers === 10)
          ? { state: 'booked', bookedAt: now }
          : { state: 'viewing', viewers: viewers };
        status.lastUpdate = now;
        localStorage.setItem(packageId, JSON.stringify(status));
      }
      return status;
    }

    function renderCardUI(card, status, duration, packageId) {
      const statusBar = card.querySelector('.status-bar');
      const button = card.querySelector('.card-button');

      if (status.state === 'booked') {
        statusBar.innerHTML = `এই স্লটটি বুকড <i class="fas fa-eye"></i> 10`;
        statusBar.classList.add('booked');
        button.classList.add('countdown-active');
        button.href = "javascript:void(0)";

        const endTime = status.bookedAt + (duration * 60 * 1000);
        activeTimers[packageId] = setInterval(() => {
          const remaining = endTime - Date.now();
          if (remaining <= 0) {
            clearInterval(activeTimers[packageId]);
            updateAllCardsOnline();
            return;
          }
          const minutes = Math.floor((remaining / (1000 * 60)) % 60);
          const seconds = Math.floor((remaining / 1000) % 60);
          button.innerHTML = `পরবর্তী স্লট: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
      } else {
        statusBar.innerHTML = `${status.viewers} জন এই মুহূর্তে দেখছেন`;
        statusBar.classList.remove('booked');
        button.classList.remove('countdown-active');
        button.innerHTML = `বুক করুন`;
        button.href = `booking.html?package=${card.dataset.name}`;
      }
    }

    // Main execution logic
    if (checkOperatingHours()) {
      updateAllCardsOnline();
    } else {
      updateToOfflineState();
    }
  }

  // --- Booking Page Logic ---
  if (document.body.classList.contains('booking-page')) {
    const bookingForm = document.getElementById('bookingForm');
    const packageSelect = document.getElementById('package');
    const addonsCheckboxes = document.querySelectorAll('input[name="addon"]');
    const totalPriceEl = document.getElementById('totalPrice');
    const timeInput = document.getElementById('time');
    const formMessage = document.getElementById('formMessage');

    const calculateTotal = () => {
        let total = 0;
        const selectedPackage = packageSelect.options[packageSelect.selectedIndex];
        total += parseInt(selectedPackage.dataset.price || 0, 10);
        addonsCheckboxes.forEach(cb => { if (cb.checked) total += parseInt(cb.value, 10); });
        totalPriceEl.textContent = `৳ ${Math.max(0, total)}`;
    };

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('package')) packageSelect.value = urlParams.get('package');

    packageSelect.addEventListener('change', calculateTotal);
    addonsCheckboxes.forEach(cb => cb.addEventListener('change', calculateTotal));
    calculateTotal();

    bookingForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const timeVal = timeInput.value;
      const hour = parseInt(timeVal.split(':')[0], 10);
      if (hour < 19 && hour >= 2) {
        formMessage.textContent = '❌ দুঃখিত, আমাদের কার্যক্রম সন্ধ্যা ৭টা থেকে রাত ২টার মধ্যে। অনুগ্রহ করে এই সময়ের মধ্যে একটি স্লট নির্বাচন করুন।';
        formMessage.className = 'error';
        return;
      }

      const submitBtn = document.getElementById('submitBtn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'পাঠানো হচ্ছে...';
      formMessage.style.display = 'none';

      const formData = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        pkg: packageSelect.value,
        time: timeInput.value,
        transactionId: document.getElementById('transactionId').value,
        finalPrice: totalPriceEl.textContent,
        addons: Array.from(addonsCheckboxes).filter(cb => cb.checked).map(cb => cb.dataset.text).join(', ') || 'কোনোটি নয়'
      };

      const message = `
📩 *নতুন বুকিং রিসিভ হয়েছে:*
👤 *নাম:* ${formData.name}
📱 *ফোন:* ${formData.phone}
💳 *Transaction ID:* ${formData.transactionId}
🎁 *প্যাকেজ:* ${formData.pkg}
✨ *অ্যাড-অন:* ${formData.addons}
💰 *মোট বিল:* ${formData.finalPrice}
🕐 *পছন্দের সময়:* ${formData.time}`;

      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: 'Markdown' })
      })
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          formMessage.textContent = "✅ আপনার বুকিং গ্রহণ করা হয়েছে! আমরা খুব শীঘ্রই যোগাযোগ করব।";
          formMessage.className = 'success';
          bookingForm.reset();
          calculateTotal();
        } else { throw new Error('Telegram API Error'); }
      })
      .catch(err => {
        formMessage.textContent = "❌ দুঃখিত, কিছু ভুল হয়েছে। দয়া করে আবার চেষ্টা করুন।";
        formMessage.className = 'error';
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '✅ বুকিং কনফার্ম করুন';
        formMessage.style.display = 'block';
      });
    });
  }
});