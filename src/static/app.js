document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  let activities = {};
  let messageTimeout;

  function showMessage(message, type) {
    window.clearTimeout(messageTimeout);
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageTimeout = window.setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function createParticipantRow(activityName, email) {
    const row = document.createElement("li");
    row.className = "participant-row";

    const participantEmail = document.createElement("span");
    participantEmail.className = "participant-email";
    participantEmail.textContent = email;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-participant";
    removeButton.dataset.activity = activityName;
    removeButton.dataset.email = email;
    removeButton.setAttribute("aria-label", `Unregister ${email} from ${activityName}`);
    removeButton.title = "Unregister participant";
    removeButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" />
      </svg>
    `;

    row.append(participantEmail, removeButton);
    return row;
  }

  function renderActivities() {
    activitiesList.replaceChildren();
    const shouldPopulateActivitySelect = activitySelect.options.length === 1;

    Object.entries(activities).forEach(([name, details]) => {
      const activityCard = document.createElement("article");
      activityCard.className = "activity-card";

      const title = document.createElement("h4");
      title.textContent = name;

      const description = document.createElement("p");
      description.textContent = details.description;

      const schedule = document.createElement("p");
      schedule.innerHTML = `<strong>Schedule:</strong> ${details.schedule}`;

      const spotsLeft = details.max_participants - details.participants.length;
      const availability = document.createElement("p");
      availability.className = "availability";
      availability.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;

      const participantsPanel = document.createElement("div");
      participantsPanel.className = "participants-panel";

      const participantsHeader = document.createElement("div");
      participantsHeader.className = "participants-header";

      const participantsTitle = document.createElement("h5");
      participantsTitle.textContent = "Participants";

      const participantCount = document.createElement("span");
      participantCount.className = "participant-count";
      participantCount.textContent = details.participants.length;
      participantCount.setAttribute("aria-label", `${details.participants.length} participants`);

      participantsHeader.append(participantsTitle, participantCount);
      participantsPanel.append(participantsHeader);

      if (details.participants.length > 0) {
        const participantList = document.createElement("ul");
        participantList.className = "participant-list";
        participantList.setAttribute("aria-label", `Participants in ${name}`);
        details.participants.forEach((email) => {
          participantList.append(createParticipantRow(name, email));
        });
        participantsPanel.append(participantList);
      } else {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "participants-empty";
        emptyMessage.textContent = "No participants yet";
        participantsPanel.append(emptyMessage);
      }

      activityCard.append(title, description, schedule, availability, participantsPanel);
      activitiesList.append(activityCard);

      if (shouldPopulateActivitySelect) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.append(option);
      }
    });
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      if (!response.ok) {
        throw new Error("Failed to load activities");
      }
      activities = await response.json();
      renderActivities();
    } catch (error) {
      activitiesList.textContent = "Failed to load activities. Please try again later.";
      console.error("Error fetching activities:", error);
    }
  }

  activitiesList.addEventListener("click", async (event) => {
    const removeButton = event.target.closest(".remove-participant");
    if (!removeButton) {
      return;
    }

    const { activity, email } = removeButton.dataset;
    removeButton.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Unable to unregister participant");
      }

      const participantIndex = activities[activity].participants.indexOf(email);
      if (participantIndex !== -1) {
        activities[activity].participants.splice(participantIndex, 1);
      }
      renderActivities();
      showMessage(result.message, "success");
    } catch (error) {
      removeButton.disabled = false;
      showMessage(error.message || "Failed to unregister participant. Please try again.", "error");
      console.error("Error unregistering participant:", error);
    }
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        activities[activity].participants.push(email);
        renderActivities();
        showMessage(result.message, "success");
        signupForm.reset();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  fetchActivities();
});
