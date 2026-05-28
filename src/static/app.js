document.addEventListener("DOMContentLoaded", () => {
  const elements = {
    activitiesList: document.getElementById("activities-list"),
    messageDiv: document.getElementById("message"),
    registrationModal: document.getElementById("registration-modal"),
    modalActivityName: document.getElementById("modal-activity-name"),
    signupForm: document.getElementById("signup-form"),
    activityInput: document.getElementById("activity"),
    closeRegistrationModal: document.querySelector(".close-modal"),
    searchInput: document.getElementById("activity-search"),
    searchButton: document.getElementById("search-button"),
    categoryFilters: document.querySelectorAll(".category-filter"),
    dayFilters: document.querySelectorAll(".day-filter"),
    timeFilters: document.querySelectorAll(".time-filter"),
    loginButton: document.getElementById("login-button"),
    userInfo: document.getElementById("user-info"),
    displayName: document.getElementById("display-name"),
    logoutButton: document.getElementById("logout-button"),
    loginModal: document.getElementById("login-modal"),
    loginForm: document.getElementById("login-form"),
    closeLoginModal: document.querySelector(".close-login-modal"),
    loginMessage: document.getElementById("login-message"),
    announcementRegion: document.getElementById("announcement-region"),
    manageAnnouncementsButton: document.getElementById("manage-announcements-button"),
    announcementsModal: document.getElementById("announcements-modal"),
    closeAnnouncementsModal: document.querySelector(".close-announcements-modal"),
    announcementsList: document.getElementById("announcements-list"),
    announcementForm: document.getElementById("announcement-form"),
    announcementId: document.getElementById("announcement-id"),
    announcementMessage: document.getElementById("announcement-message"),
    announcementStartDate: document.getElementById("announcement-start-date"),
    announcementExpirationDate: document.getElementById("announcement-expiration-date"),
    announcementSubmitButton: document.getElementById("announcement-submit-button"),
    announcementFormTitle: document.getElementById("announcement-form-title"),
    announcementCancelEdit: document.getElementById("announcement-cancel-edit"),
    announcementPreviewText: document.getElementById("announcement-preview-text"),
    announcementEmptyState: document.getElementById("announcement-empty-state"),
  };

  const activityTypes = {
    sports: { label: "Sports", color: "#e8f5e9", textColor: "#2e7d32" },
    arts: { label: "Arts", color: "#f3e5f5", textColor: "#7b1fa2" },
    academic: { label: "Academic", color: "#e3f2fd", textColor: "#1565c0" },
    community: { label: "Community", color: "#fff3e0", textColor: "#e65100" },
    technology: { label: "Technology", color: "#e8eaf6", textColor: "#3949ab" },
  };

  const timeRanges = {
    morning: { start: "06:00", end: "08:00" },
    afternoon: { start: "15:00", end: "18:00" },
    weekend: { days: ["Saturday", "Sunday"] },
  };

  const state = {
    allActivities: {},
    currentFilter: "all",
    searchQuery: "",
    currentDay: "",
    currentTimeRange: "",
    currentUser: null,
    managedAnnouncements: [],
  };

  function setModalState(modalElement, isOpen, resetCallback) {
    if (isOpen) {
      modalElement.classList.remove("hidden");
      requestAnimationFrame(() => {
        modalElement.classList.add("show");
      });
      return;
    }

    modalElement.classList.remove("show");
    setTimeout(() => {
      modalElement.classList.add("hidden");
      if (resetCallback) {
        resetCallback();
      }
    }, 300);
  }

  function showMessage(text, type) {
    elements.messageDiv.textContent = text;
    elements.messageDiv.className = `message ${type}`;
    elements.messageDiv.classList.remove("hidden");

    setTimeout(() => {
      elements.messageDiv.classList.add("hidden");
    }, 5000);
  }

  function showLoginMessage(text, type) {
    elements.loginMessage.textContent = text;
    elements.loginMessage.className = `message ${type}`;
    elements.loginMessage.classList.remove("hidden");
  }

  function toLocalDateTimeValue(value) {
    return value ? value.slice(0, 16) : "";
  }

  function formatDateTime(value) {
    if (!value) {
      return "Starts immediately";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(parsed);
  }

  function getAnnouncementStatus(announcement) {
    const now = new Date();
    const startDate = announcement.start_date ? new Date(announcement.start_date) : null;
    const expirationDate = new Date(announcement.expiration_date);

    if (announcement.is_active) {
      return { label: "Active", className: "status-active" };
    }

    if (startDate && startDate > now) {
      return { label: "Scheduled", className: "status-scheduled" };
    }

    if (expirationDate < now) {
      return { label: "Expired", className: "status-expired" };
    }

    return { label: "Draft", className: "status-scheduled" };
  }

  function updateAnnouncementPreview() {
    const message = elements.announcementMessage.value.trim();
    elements.announcementPreviewText.textContent =
      message || "Your message preview will appear here.";
  }

  function resetAnnouncementForm() {
    elements.announcementForm.reset();
    elements.announcementId.value = "";
    elements.announcementFormTitle.textContent = "Create announcement";
    elements.announcementSubmitButton.textContent = "Publish announcement";
    elements.announcementCancelEdit.classList.add("hidden");
    updateAnnouncementPreview();
  }

  function populateAnnouncementForm(announcement) {
    elements.announcementId.value = announcement.id;
    elements.announcementMessage.value = announcement.message;
    elements.announcementStartDate.value = toLocalDateTimeValue(announcement.start_date);
    elements.announcementExpirationDate.value = toLocalDateTimeValue(announcement.expiration_date);
    elements.announcementFormTitle.textContent = "Edit announcement";
    elements.announcementSubmitButton.textContent = "Save changes";
    elements.announcementCancelEdit.classList.remove("hidden");
    updateAnnouncementPreview();
    elements.announcementMessage.focus();
  }

  function initializeFilters() {
    const activeDayFilter = document.querySelector(".day-filter.active");
    if (activeDayFilter) {
      state.currentDay = activeDayFilter.dataset.day;
    }

    const activeTimeFilter = document.querySelector(".time-filter.active");
    if (activeTimeFilter) {
      state.currentTimeRange = activeTimeFilter.dataset.time;
    }
  }

  function updateAuthBodyClass() {
    document.body.classList.toggle("not-authenticated", !state.currentUser);
  }

  async function fetchActiveAnnouncements() {
    try {
      const response = await fetch("/announcements");
      const announcements = await response.json();

      if (!response.ok) {
        throw new Error(announcements.detail || "Failed to load announcements");
      }

      renderAnnouncementRegion(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      elements.announcementRegion.classList.add("hidden");
    }
  }

  function renderAnnouncementRegion(announcements) {
    elements.announcementRegion.innerHTML = "";

    if (!announcements.length) {
      elements.announcementRegion.classList.add("hidden");
      return;
    }

    announcements.forEach((announcement) => {
      const banner = document.createElement("article");
      banner.className = "announcement-banner";
      banner.setAttribute("role", "status");
      banner.setAttribute("aria-live", "polite");
      banner.setAttribute("aria-atomic", "true");

      const badge = document.createElement("span");
      badge.className = "announcement-badge";
      badge.textContent = "Announcement";

      const message = document.createElement("p");
      message.className = "announcement-message";
      message.textContent = announcement.message;

      const meta = document.createElement("div");
      meta.className = "announcement-banner-meta";
      meta.textContent = `Visible until ${formatDateTime(announcement.expiration_date)}`;

      banner.append(badge, message, meta);
      elements.announcementRegion.appendChild(banner);
    });

    elements.announcementRegion.classList.remove("hidden");
  }

  async function fetchManageableAnnouncements() {
    if (!state.currentUser) {
      return;
    }

    try {
      const response = await fetch(
        `/announcements/manage?teacher_username=${encodeURIComponent(state.currentUser.username)}`
      );
      const announcements = await response.json();

      if (!response.ok) {
        throw new Error(announcements.detail || "Failed to load announcements");
      }

      state.managedAnnouncements = announcements;
      renderManagedAnnouncements();
    } catch (error) {
      console.error("Error loading manageable announcements:", error);
      showMessage("Could not load announcements. Please try again.", "error");
    }
  }

  function renderManagedAnnouncements() {
    elements.announcementsList.innerHTML = "";
    const hasAnnouncements = state.managedAnnouncements.length > 0;
    elements.announcementEmptyState.classList.toggle("hidden", hasAnnouncements);

    state.managedAnnouncements.forEach((announcement) => {
      const card = document.createElement("article");
      card.className = "announcement-item";

      const status = getAnnouncementStatus(announcement);
      const topRow = document.createElement("div");
      topRow.className = "announcement-item-topline";

      const statusChip = document.createElement("span");
      statusChip.className = `announcement-status ${status.className}`;
      statusChip.textContent = status.label;

      const updatedAt = document.createElement("span");
      updatedAt.className = "announcement-updated-at";
      updatedAt.textContent = `Updated ${formatDateTime(announcement.updated_at)}`;

      topRow.append(statusChip, updatedAt);

      const message = document.createElement("p");
      message.className = "announcement-item-message";
      message.textContent = announcement.message;

      const dates = document.createElement("div");
      dates.className = "announcement-item-dates";

      const startDate = document.createElement("span");
      startDate.textContent = `Starts: ${formatDateTime(announcement.start_date)}`;

      const endDate = document.createElement("span");
      endDate.textContent = `Ends: ${formatDateTime(announcement.expiration_date)}`;

      dates.append(startDate, endDate);

      const footer = document.createElement("div");
      footer.className = "announcement-item-footer";

      const createdBy = document.createElement("span");
      createdBy.className = "announcement-created-by";
      createdBy.textContent = `Saved by ${announcement.created_by || "staff"}`;

      const actions = document.createElement("div");
      actions.className = "announcement-item-actions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "secondary-button";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => populateAnnouncementForm(announcement));

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "danger-button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => {
        showConfirmationDialog(
          "Delete this announcement? It will disappear from the site immediately.",
          async () => {
            try {
              const response = await fetch(
                `/announcements/${encodeURIComponent(announcement.id)}?teacher_username=${encodeURIComponent(state.currentUser.username)}`,
                { method: "DELETE" }
              );
              const result = await response.json();

              if (!response.ok) {
                showMessage(result.detail || "Could not delete the announcement.", "error");
                return;
              }

              showMessage("Announcement deleted.", "success");
              await Promise.all([fetchActiveAnnouncements(), fetchManageableAnnouncements()]);
              resetAnnouncementForm();
            } catch (error) {
              console.error("Error deleting announcement:", error);
              showMessage("Could not delete the announcement.", "error");
            }
          }
        );
      });

      actions.append(editButton, deleteButton);
      footer.append(createdBy, actions);
      card.append(topRow, message, dates, footer);
      elements.announcementsList.appendChild(card);
    });
  }

  function updateAuthUI() {
    const isAuthenticated = Boolean(state.currentUser);
    elements.loginButton.classList.toggle("hidden", isAuthenticated);
    elements.userInfo.classList.toggle("hidden", !isAuthenticated);
    elements.displayName.textContent = isAuthenticated
      ? state.currentUser.display_name
      : "";

    updateAuthBodyClass();
    fetchActivities();

    if (!isAuthenticated) {
      setModalState(elements.announcementsModal, false, resetAnnouncementForm);
    }
  }

  async function validateUserSession(username) {
    try {
      const response = await fetch(
        `/auth/check-session?username=${encodeURIComponent(username)}`
      );

      if (!response.ok) {
        logout(false);
        return;
      }

      const userData = await response.json();
      state.currentUser = userData;
      localStorage.setItem("currentUser", JSON.stringify(userData));
      updateAuthUI();
    } catch (error) {
      console.error("Error validating session:", error);
    }
  }

  function checkAuthentication() {
    const savedUser = localStorage.getItem("currentUser");
    if (!savedUser) {
      updateAuthBodyClass();
      return;
    }

    try {
      state.currentUser = JSON.parse(savedUser);
      updateAuthUI();
      validateUserSession(state.currentUser.username);
    } catch (error) {
      console.error("Error parsing saved user:", error);
      logout(false);
    }
  }

  async function login(username, password) {
    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );
      const data = await response.json();

      if (!response.ok) {
        showLoginMessage(data.detail || "Invalid username or password", "error");
        return false;
      }

      state.currentUser = data;
      localStorage.setItem("currentUser", JSON.stringify(data));
      updateAuthUI();
      closeLoginModalHandler();
      showMessage(`Welcome, ${state.currentUser.display_name}!`, "success");
      return true;
    } catch (error) {
      console.error("Error during login:", error);
      showLoginMessage("Login failed. Please try again.", "error");
      return false;
    }
  }

  function logout(showToast = true) {
    state.currentUser = null;
    localStorage.removeItem("currentUser");
    updateAuthUI();
    if (showToast) {
      showMessage("You have been logged out.", "info");
    }
  }

  function openLoginModal() {
    elements.loginMessage.classList.add("hidden");
    elements.loginForm.reset();
    setModalState(elements.loginModal, true);
  }

  function closeLoginModalHandler() {
    setModalState(elements.loginModal, false, () => {
      elements.loginForm.reset();
      elements.loginMessage.classList.add("hidden");
    });
  }

  function openAnnouncementsModal() {
    if (!state.currentUser) {
      showMessage("Sign in to manage announcements.", "error");
      return;
    }

    resetAnnouncementForm();
    fetchManageableAnnouncements();
    setModalState(elements.announcementsModal, true);
  }

  function closeAnnouncementsModalHandler() {
    setModalState(elements.announcementsModal, false, resetAnnouncementForm);
  }

  function openRegistrationModal(activityName) {
    elements.modalActivityName.textContent = activityName;
    elements.activityInput.value = activityName;
    setModalState(elements.registrationModal, true);
  }

  function closeRegistrationModalHandler() {
    setModalState(elements.registrationModal, false, () => {
      elements.signupForm.reset();
    });
  }

  function showLoadingSkeletons() {
    elements.activitiesList.innerHTML = "";
    for (let index = 0; index < 9; index += 1) {
      const skeletonCard = document.createElement("div");
      skeletonCard.className = "skeleton-card";
      skeletonCard.innerHTML = `
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-text short"></div>
        <div class="skeleton-progress-group">
          <div class="skeleton-line skeleton-progress-bar"></div>
          <div class="skeleton-line skeleton-text short skeleton-progress-caption"></div>
        </div>
        <div class="skeleton-footer">
          <div class="skeleton-line skeleton-button"></div>
        </div>
      `;
      elements.activitiesList.appendChild(skeletonCard);
    }
  }

  function formatSchedule(details) {
    if (details.schedule_details) {
      const days = details.schedule_details.days.join(", ");
      const formatTime = (time24) => {
        const [hours, minutes] = time24.split(":").map((num) => parseInt(num, 10));
        const period = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
      };

      return `${days}, ${formatTime(details.schedule_details.start_time)} - ${formatTime(details.schedule_details.end_time)}`;
    }

    return details.schedule;
  }

  function getActivityType(activityName, description) {
    const name = activityName.toLowerCase();
    const desc = description.toLowerCase();

    if (
      name.includes("soccer") ||
      name.includes("basketball") ||
      name.includes("sport") ||
      name.includes("fitness") ||
      desc.includes("team") ||
      desc.includes("game") ||
      desc.includes("athletic")
    ) {
      return "sports";
    }

    if (
      name.includes("art") ||
      name.includes("music") ||
      name.includes("theater") ||
      name.includes("drama") ||
      desc.includes("creative") ||
      desc.includes("paint")
    ) {
      return "arts";
    }

    if (
      name.includes("science") ||
      name.includes("math") ||
      name.includes("academic") ||
      name.includes("study") ||
      name.includes("olympiad") ||
      desc.includes("learning") ||
      desc.includes("education") ||
      desc.includes("competition")
    ) {
      return "academic";
    }

    if (
      name.includes("volunteer") ||
      name.includes("community") ||
      desc.includes("service") ||
      desc.includes("volunteer")
    ) {
      return "community";
    }

    if (
      name.includes("computer") ||
      name.includes("coding") ||
      name.includes("tech") ||
      name.includes("robotics") ||
      desc.includes("programming") ||
      desc.includes("technology") ||
      desc.includes("digital") ||
      desc.includes("robot")
    ) {
      return "technology";
    }

    return "academic";
  }

  async function fetchActivities() {
    showLoadingSkeletons();

    try {
      const queryParams = [];
      if (state.currentDay) {
        queryParams.push(`day=${encodeURIComponent(state.currentDay)}`);
      }

      if (state.currentTimeRange && state.currentTimeRange !== "weekend") {
        const range = timeRanges[state.currentTimeRange];
        if (range) {
          queryParams.push(`start_time=${encodeURIComponent(range.start)}`);
          queryParams.push(`end_time=${encodeURIComponent(range.end)}`);
        }
      }

      const queryString = queryParams.length ? `?${queryParams.join("&")}` : "";
      const response = await fetch(`/activities${queryString}`);
      const activities = await response.json();

      state.allActivities = activities;
      displayFilteredActivities();
    } catch (error) {
      elements.activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function displayFilteredActivities() {
    elements.activitiesList.innerHTML = "";
    const filteredActivities = {};

    Object.entries(state.allActivities).forEach(([name, details]) => {
      const activityType = getActivityType(name, details.description);
      if (state.currentFilter !== "all" && activityType !== state.currentFilter) {
        return;
      }

      if (state.currentTimeRange === "weekend" && details.schedule_details) {
        const hasWeekendDay = details.schedule_details.days.some((day) =>
          timeRanges.weekend.days.includes(day)
        );
        if (!hasWeekendDay) {
          return;
        }
      }

      const searchableContent = [
        name.toLowerCase(),
        details.description.toLowerCase(),
        formatSchedule(details).toLowerCase(),
      ].join(" ");

      if (
        state.searchQuery &&
        !searchableContent.includes(state.searchQuery.toLowerCase())
      ) {
        return;
      }

      filteredActivities[name] = details;
    });

    if (!Object.keys(filteredActivities).length) {
      elements.activitiesList.innerHTML = `
        <div class="no-results">
          <h4>No activities found</h4>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      `;
      return;
    }

    Object.entries(filteredActivities).forEach(([name, details]) => {
      renderActivityCard(name, details);
    });
  }

  function renderActivityCard(name, details) {
    const activityCard = document.createElement("div");
    activityCard.className = "activity-card";

    const totalSpots = details.max_participants;
    const takenSpots = details.participants.length;
    const spotsLeft = totalSpots - takenSpots;
    const capacityPercentage = (takenSpots / totalSpots) * 100;
    const isFull = spotsLeft <= 0;

    let capacityStatusClass = "capacity-available";
    if (isFull) {
      capacityStatusClass = "capacity-full";
    } else if (capacityPercentage >= 75) {
      capacityStatusClass = "capacity-near-full";
    }

    const activityType = getActivityType(name, details.description);
    const typeInfo = activityTypes[activityType];
    const formattedSchedule = formatSchedule(details);

    activityCard.innerHTML = `
      <span class="activity-tag" style="background-color: ${typeInfo.color}; color: ${typeInfo.textColor}">
        ${typeInfo.label}
      </span>
      <h4>${name}</h4>
      <p>${details.description}</p>
      <p class="tooltip">
        <strong>Schedule:</strong> ${formattedSchedule}
        <span class="tooltip-text">Regular meetings at this time throughout the semester</span>
      </p>
      <div class="capacity-container ${capacityStatusClass}">
        <div class="capacity-bar-bg">
          <div class="capacity-bar-fill" style="width: ${capacityPercentage}%"></div>
        </div>
        <div class="capacity-text">
          <span>${takenSpots} enrolled</span>
          <span>${spotsLeft} spots left</span>
        </div>
      </div>
      <div class="participants-list">
        <h5>Current Participants:</h5>
        <ul>
          ${details.participants
            .map(
              (email) => `
                <li>
                  ${email}
                  ${
                    state.currentUser
                      ? `
                        <span class="delete-participant tooltip" data-activity="${name}" data-email="${email}">
                          ✖
                          <span class="tooltip-text">Unregister this student</span>
                        </span>
                      `
                      : ""
                  }
                </li>
              `
            )
            .join("")}
        </ul>
      </div>
      <div class="activity-card-actions">
        ${
          state.currentUser
            ? `
              <button class="register-button" data-activity="${name}" ${isFull ? "disabled" : ""}>
                ${isFull ? "Activity Full" : "Register Student"}
              </button>
            `
            : '<div class="auth-notice">Teachers can register students.</div>'
        }
      </div>
    `;

    activityCard.querySelectorAll(".delete-participant").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });

    if (state.currentUser) {
      const registerButton = activityCard.querySelector(".register-button");
      if (!isFull) {
        registerButton.addEventListener("click", () => openRegistrationModal(name));
      }
    }

    elements.activitiesList.appendChild(activityCard);
  }

  function showConfirmationDialog(message, confirmCallback) {
    let confirmDialog = document.getElementById("confirm-dialog");
    if (!confirmDialog) {
      confirmDialog = document.createElement("div");
      confirmDialog.id = "confirm-dialog";
      confirmDialog.className = "modal hidden";
      confirmDialog.innerHTML = `
        <div class="modal-content">
          <h3>Confirm Action</h3>
          <p id="confirm-message"></p>
          <div class="confirmation-actions">
            <button id="cancel-button" class="secondary-button" type="button">Cancel</button>
            <button id="confirm-button" class="danger-button" type="button">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmDialog);
    }

    document.getElementById("confirm-message").textContent = message;
    setModalState(confirmDialog, true);

    const cancelButton = document.getElementById("cancel-button");
    const confirmButton = document.getElementById("confirm-button");
    const newCancelButton = cancelButton.cloneNode(true);
    const newConfirmButton = confirmButton.cloneNode(true);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

    newCancelButton.addEventListener("click", () => setModalState(confirmDialog, false));
    newConfirmButton.addEventListener("click", async () => {
      await confirmCallback();
      setModalState(confirmDialog, false);
    });

    confirmDialog.onclick = (event) => {
      if (event.target === confirmDialog) {
        setModalState(confirmDialog, false);
      }
    };
  }

  async function handleUnregister(event) {
    if (!state.currentUser) {
      showMessage("You must be logged in as a teacher to unregister students.", "error");
      return;
    }

    const activity = event.currentTarget.dataset.activity;
    const email = event.currentTarget.dataset.email;

    showConfirmationDialog(
      `Are you sure you want to unregister ${email} from ${activity}?`,
      async () => {
        try {
          const response = await fetch(
            `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}&teacher_username=${encodeURIComponent(state.currentUser.username)}`,
            { method: "POST" }
          );
          const result = await response.json();

          if (!response.ok) {
            showMessage(result.detail || "An error occurred", "error");
            return;
          }

          showMessage(result.message, "success");
          fetchActivities();
        } catch (error) {
          console.error("Error unregistering:", error);
          showMessage("Failed to unregister. Please try again.", "error");
        }
      }
    );
  }

  async function handleAnnouncementSubmit(event) {
    event.preventDefault();

    if (!state.currentUser) {
      showMessage("Sign in to manage announcements.", "error");
      return;
    }

    const payload = {
      message: elements.announcementMessage.value.trim(),
      start_date: elements.announcementStartDate.value || null,
      expiration_date: elements.announcementExpirationDate.value,
    };

    const isEditing = Boolean(elements.announcementId.value);
    const endpoint = isEditing
      ? `/announcements/${encodeURIComponent(elements.announcementId.value)}?teacher_username=${encodeURIComponent(state.currentUser.username)}`
      : `/announcements?teacher_username=${encodeURIComponent(state.currentUser.username)}`;
    const method = isEditing ? "PUT" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "Could not save the announcement.", "error");
        return;
      }

      showMessage(
        isEditing ? "Announcement updated successfully." : "Announcement published successfully.",
        "success"
      );
      resetAnnouncementForm();
      await Promise.all([fetchActiveAnnouncements(), fetchManageableAnnouncements()]);
    } catch (error) {
      console.error("Error saving announcement:", error);
      showMessage("Could not save the announcement.", "error");
    }
  }

  elements.searchInput.addEventListener("input", (event) => {
    state.searchQuery = event.target.value;
    displayFilteredActivities();
  });

  elements.searchButton.addEventListener("click", (event) => {
    event.preventDefault();
    state.searchQuery = elements.searchInput.value;
    displayFilteredActivities();
  });

  elements.categoryFilters.forEach((button) => {
    button.addEventListener("click", () => {
      elements.categoryFilters.forEach((filterButton) => {
        filterButton.classList.remove("active");
      });
      button.classList.add("active");
      state.currentFilter = button.dataset.category;
      displayFilteredActivities();
    });
  });

  elements.dayFilters.forEach((button) => {
    button.addEventListener("click", () => {
      elements.dayFilters.forEach((filterButton) => {
        filterButton.classList.remove("active");
      });
      button.classList.add("active");
      state.currentDay = button.dataset.day;
      fetchActivities();
    });
  });

  elements.timeFilters.forEach((button) => {
    button.addEventListener("click", () => {
      elements.timeFilters.forEach((filterButton) => {
        filterButton.classList.remove("active");
      });
      button.classList.add("active");
      state.currentTimeRange = button.dataset.time;
      fetchActivities();
    });
  });

  elements.loginButton.addEventListener("click", openLoginModal);
  elements.logoutButton.addEventListener("click", () => logout(true));
  elements.closeLoginModal.addEventListener("click", closeLoginModalHandler);
  elements.closeRegistrationModal.addEventListener("click", closeRegistrationModalHandler);
  elements.manageAnnouncementsButton.addEventListener("click", openAnnouncementsModal);
  elements.closeAnnouncementsModal.addEventListener("click", closeAnnouncementsModalHandler);
  elements.announcementCancelEdit.addEventListener("click", resetAnnouncementForm);
  elements.announcementForm.addEventListener("submit", handleAnnouncementSubmit);
  elements.announcementMessage.addEventListener("input", updateAnnouncementPreview);

  window.addEventListener("click", (event) => {
    if (event.target === elements.loginModal) {
      closeLoginModalHandler();
    }

    if (event.target === elements.registrationModal) {
      closeRegistrationModalHandler();
    }

    if (event.target === elements.announcementsModal) {
      closeAnnouncementsModalHandler();
    }
  });

  elements.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    await login(username, password);
  });

  elements.signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!state.currentUser) {
      showMessage("You must be logged in as a teacher to register students.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = elements.activityInput.value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}&teacher_username=${encodeURIComponent(state.currentUser.username)}`,
        { method: "POST" }
      );
      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "An error occurred", "error");
        return;
      }

      showMessage(result.message, "success");
      closeRegistrationModalHandler();
      fetchActivities();
    } catch (error) {
      console.error("Error signing up:", error);
      showMessage("Failed to sign up. Please try again.", "error");
    }
  });

  window.activityFilters = {
    setDayFilter(day) {
      state.currentDay = day;
      elements.dayFilters.forEach((button) => {
        button.classList.toggle("active", button.dataset.day === day);
      });
      fetchActivities();
    },
    setTimeRangeFilter(timeRange) {
      state.currentTimeRange = timeRange;
      elements.timeFilters.forEach((button) => {
        button.classList.toggle("active", button.dataset.time === timeRange);
      });
      fetchActivities();
    },
  };

  initializeFilters();
  resetAnnouncementForm();
  updateAnnouncementPreview();
  checkAuthentication();
  fetchActiveAnnouncements();
  fetchActivities();
});
