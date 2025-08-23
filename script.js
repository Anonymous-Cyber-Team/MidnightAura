document.addEventListener("DOMContentLoaded", () => {
  // --- General Settings & Loader ---
  // WARNING: For development or personal use only. Exposing tokens client-side is a security risk in production.
  const BOT_TOKEN = "7852603789:AAHNGDaHnpkvnzeKGM34mGge6RknW_rLcH4";
  const CHAT_ID = "7927571676";

  const loaderWrapper = document.querySelector(".loader-wrapper");
  if (loaderWrapper) {
    loaderWrapper.style.opacity = "0";
    setTimeout(() => {
      loaderWrapper.style.display = "none";
    }, 500);
  }

  // --- Homepage Logic ---
  if (document.body.classList.contains("home-page")) {
    const operatingHours = { start: 19, end: 3 }; // 7 PM to 3 AM
    const packageCards = document.querySelectorAll(".glow-card");
    let activeTimers = {};

    function checkOperatingHours() {
      const now = new Date();
      const currentHour = now.getHours();
      // If end hour is past midnight (e.g., 3 AM), the logic is:
      // Is the current hour after the start OR before the end?
      if (operatingHours.start > operatingHours.end) {
        return (
          currentHour >= operatingHours.start ||
          currentHour < operatingHours.end
        );
      } else {
        return (
          currentHour >= operatingHours.start &&
          currentHour < operatingHours.end
        );
      }
    }

    function updateToOfflineState() {
      const now = new Date();
      let nextOpening = new Date();
      nextOpening.setHours(operatingHours.start, 0, 0, 0);

      // If it's already past opening time today, set for tomorrow
      if (now.getHours() >= operatingHours.start) {
        nextOpening.setDate(nextOpening.getDate() + 1);
      }

      if (activeTimers["offline"]) return;

      activeTimers["offline"] = setInterval(() => {
        const timeRemaining = nextOpening - new Date();
        if (timeRemaining <= 0) {
          clearInterval(activeTimers["offline"]);
          window.location.reload();
          return;
        }
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor(
          (timeRemaining % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

        const countdownText = `সার্ভিস শুরু হবে: ${hours
          .toString()
          .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")} পর`;

        packageCards.forEach((card) => {
          card.querySelector(".status-bar").innerHTML = countdownText;
          const button = card.querySelector(".card-button");
          button.innerHTML = `অগ্রিম বুক করুন`;
          button.classList.remove("countdown-active");
          button.href = `booking.html?package=${card.dataset.name}`;
        });
      }, 1000);
    }

    function updateAllCardsOnline() {
      packageCards.forEach((card) => {
        const packageId = card.id;
        const durationMinutes = parseInt(card.dataset.duration, 10);
        if (activeTimers[packageId]) clearInterval(activeTimers[packageId]);
        const status = getPackageStatus(packageId);
        renderCardUI(card, status, durationMinutes, packageId);
      });
    }

    function getPackageStatus(packageId) {
      const now = Date.now();
      const DURATION_BEFORE_RESET_MINS = 5; // How often to potentially change the viewer count
      let status = JSON.parse(localStorage.getItem(packageId)) || {};

      // If booked, check if the booking has expired
      if (status.state === "booked") {
        const bookingDurationMins = parseInt(
          document.getElementById(packageId).dataset.duration,
          10
        );
        const timeSinceBooking = (now - status.bookedAt) / (1000 * 60);
        if (timeSinceBooking > bookingDurationMins) {
          status = {}; // Booking expired, reset status
          localStorage.removeItem(packageId);
        } else {
          return status; // Still booked
        }
      }

      const timeSinceUpdate = status.lastUpdate
        ? (now - status.lastUpdate) / (1000 * 60)
        : Infinity;

      // Update viewer count periodically or if status is empty
      if (timeSinceUpdate > DURATION_BEFORE_RESET_MINS || !status.state) {
        const viewers = Math.floor(Math.random() * (15 - 3 + 1)) + 3; // Random viewers between 3 and 15
        // Small chance of getting "booked"
        const isBooked = Math.random() < 0.1; // 10% chance

        status = isBooked
          ? {
              state: "booked",
              bookedAt: now,
              viewers: Math.floor(Math.random() * (25 - 15 + 1)) + 15,
            } // Higher viewers if booked
          : { state: "viewing", viewers: viewers };

        status.lastUpdate = now;
        localStorage.setItem(packageId, JSON.stringify(status));
      }
      return status;
    }

    function renderCardUI(card, status, duration, packageId) {
      const statusBar = card.querySelector(".status-bar");
      const button = card.querySelector(".card-button");

      if (status.state === "booked") {
        statusBar.innerHTML = `এই স্লটটি বুকড <i class="fas fa-eye"></i> ${status.viewers}`;
        statusBar.classList.add("booked");
        button.classList.add("countdown-active");
        button.href = "javascript:void(0)";

        const endTime = status.bookedAt + duration * 60 * 1000;
        activeTimers[packageId] = setInterval(() => {
          const remaining = endTime - Date.now();
          if (remaining <= 0) {
            clearInterval(activeTimers[packageId]);
            localStorage.removeItem(packageId); // Clear status on expiry
            updateAllCardsOnline();
            return;
          }
          const minutes = Math.floor((remaining / (1000 * 60)) % 60);
          const seconds = Math.floor((remaining / 1000) % 60);
          button.innerHTML = `পরবর্তী স্লট: ${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }, 1000);
      } else {
        statusBar.innerHTML = `${status.viewers} জন এই মুহূর্তে দেখছেন`;
        statusBar.classList.remove("booked");
        button.classList.remove("countdown-active");
        button.innerHTML = `বুক করুন`;
        button.href = `booking.html?package=${card.dataset.name}`;
      }
    }

    // Main execution logic
    if (checkOperatingHours()) {
      updateAllCardsOnline();
      setInterval(updateAllCardsOnline, 30000); // Refresh status every 30 seconds
    } else {
      updateToOfflineState();
    }
  }

  // --- Booking Page Logic ---
  if (document.body.classList.contains("booking-page")) {
    const bookingForm = document.getElementById("bookingForm");
    const packageSelect = document.getElementById("package");
    const addonsCheckboxes = document.querySelectorAll('input[name="addon"]');
    const totalPriceEl = document.getElementById("totalPrice");
    const timeInput = document.getElementById("time");
    const formMessage = document.getElementById("formMessage");

    const calculateTotal = () => {
      let total = 0;
      const selectedPackage =
        packageSelect.options[packageSelect.selectedIndex];
      if (selectedPackage && selectedPackage.dataset.price) {
        total += parseInt(selectedPackage.dataset.price, 10);
      }
      addonsCheckboxes.forEach((cb) => {
        if (cb.checked) total += parseInt(cb.value, 10);
      });
      totalPriceEl.textContent = `৳ ${Math.max(0, total)}`;
    };

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("package")) {
      packageSelect.value = urlParams.get("package");
    }

    // Attach event listeners
    packageSelect.addEventListener("change", calculateTotal);
    addonsCheckboxes.forEach((cb) =>
      cb.addEventListener("change", calculateTotal)
    );

    // Calculate total on page load to reflect pre-selected package price
    calculateTotal();

    bookingForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const timeVal = timeInput.value;
      const hour = parseInt(timeVal.split(":")[0], 10);

      // Check against operating hours
      if (!((hour >= 19 && hour <= 23) || (hour >= 0 && hour < 3))) {
        formMessage.textContent =
          "❌ দুঃখিত, আমাদের কার্যক্রম সন্ধ্যা ৭টা থেকে রাত ৩টার মধ্যে। অনুগ্রহ করে এই সময়ের মধ্যে একটি স্লট নির্বাচন করুন।";
        formMessage.className = "error";
        formMessage.style.display = "block";
        return;
      }

      const submitBtn = document.getElementById("submitBtn");
      submitBtn.disabled = true;
      submitBtn.innerHTML = "পাঠানো হচ্ছে...";
      formMessage.style.display = "none";

      const selectedPackageOption =
        packageSelect.options[packageSelect.selectedIndex];
      const formData = {
        name: document.getElementById("name").value,
        phone: document.getElementById("phone").value,
        email: document.getElementById("email").value,
        pkg: selectedPackageOption.text,
        time: timeInput.value,
        transactionId: document.getElementById("transactionId").value,
        finalPrice: totalPriceEl.textContent,
        addons:
          Array.from(addonsCheckboxes)
            .filter((cb) => cb.checked)
            .map((cb) => cb.dataset.text)
            .join(", ") || "কোনোটি নয়",
      };

      const message = `
📩 *নতুন বুকিং রিসিভ হয়েছে:*
👤 *নাম:* ${formData.name}
📱 *ফোন:* ${formData.phone}
📧 *ইমেইল:* ${formData.email}
💳 *Transaction ID:* ${formData.transactionId}
🎁 *প্যাকেজ:* ${formData.pkg}
✨ *অ্যাড-অন:* ${formData.addons}
💰 *মোট বিল:* ${formData.finalPrice}
🕐 *পছন্দের সময়:* ${formData.time}`;

      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          parse_mode: "Markdown",
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) {
            formMessage.textContent =
              "✅ আপনার বুকিং গ্রহণ করা হয়েছে! আমরা খুব শীঘ্রই যোগাযোগ করব।";
            formMessage.className = "success";
            bookingForm.reset();
            calculateTotal(); // Reset total to 0
          } else {
            throw new Error(data.description || "Telegram API Error");
          }
        })
        .catch((err) => {
          console.error(err);
          formMessage.textContent =
            "❌ দুঃখিত, কিছু ভুল হয়েছে। দয়া করে আবার চেষ্টা করুন।";
          formMessage.className = "error";
        })
        .finally(() => {
          submitBtn.disabled = false;
          submitBtn.innerHTML = "✅ বুকিং কনফার্ম করুন";
          formMessage.style.display = "block";
        });
    });
  }
});

// --- Popup Global Functions ---
function showSpecialOffer() {
  const popup = document.getElementById("special-offer-popup");
  if (popup) popup.style.display = "flex";
}

function closeSpecialOffer() {
  const popup = document.getElementById("special-offer-popup");
  if (popup) popup.style.display = "none";
}

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeSpecialOffer();
  }
});
