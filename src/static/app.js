document.addEventListener("DOMContentLoaded", () => {
  const loginContainer = document.getElementById("login-container");
  const userDashboard = document.getElementById("user-dashboard");
  const adminDashboard = document.getElementById("admin-dashboard");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const logoutUserButton = document.getElementById("logout-user");
  const logoutAdminButton = document.getElementById("logout-admin");
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const adminActivitiesList = document.getElementById("admin-activities-list");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const roleStorageKey = "dashboardRole";

  function showView(view) {
    loginContainer.classList.toggle("hidden", view !== "login");
    userDashboard.classList.toggle("hidden", view !== "user");
    adminDashboard.classList.toggle("hidden", view !== "admin");
  }

  function setRoute(route) {
    window.location.hash = route;
  }

  function storeRole(role) {
    sessionStorage.setItem(roleStorageKey, role);
  }

  function getStoredRole() {
    return sessionStorage.getItem(roleStorageKey);
  }

  function clearRole() {
    sessionStorage.removeItem(roleStorageKey);
  }

  function showMessage(element, text, type) {
    element.textContent = text;
    element.className = `message ${type}`;
    element.classList.remove("hidden");

    setTimeout(() => {
      element.classList.add("hidden");
    }, 5000);
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = "<option value=\"\">-- Select an activity --</option>";
      adminActivitiesList.innerHTML = "";

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);

        const adminCard = document.createElement("div");
        adminCard.className = "activity-card";
        adminCard.innerHTML = `
          <h4>${name}</h4>
          <p><strong>Participants:</strong> ${details.participants.length}</p>
          <p><strong>Capacity:</strong> ${details.max_participants}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <div class="admin-actions">
            <button disabled>Edit</button>
            <button disabled>Delete</button>
          </div>
        `;
        adminActivitiesList.appendChild(adminCard);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      adminActivitiesList.innerHTML =
        "<p>Failed to load admin activity details. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(messageDiv, result.message, "success");
        await fetchActivities();
      } else {
        showMessage(messageDiv, result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage(messageDiv, "Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

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
        showMessage(messageDiv, result.message, "success");
        signupForm.reset();
        await fetchActivities();
      } else {
        showMessage(messageDiv, result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage(messageDiv, "Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  function routeFromHash() {
    const hash = window.location.hash.replace("#", "");
    const storedRole = getStoredRole();

    if (!storedRole) {
      showView("login");
      return;
    }

    if (hash === "admin-dashboard") {
      if (storedRole !== "admin") {
        showView("login");
        showMessage(loginMessage, "Admin access requires an admin login.", "error");
        return;
      }
      showView("admin");
      return;
    }

    if (hash === "user-dashboard") {
      if (storedRole !== "user") {
        showView("login");
        showMessage(loginMessage, "User access requires a user login.", "error");
        return;
      }
      showView("user");
      return;
    }

    showView(storedRole === "admin" ? "admin" : "user");
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const role = document.getElementById("role").value;

    if (!username || !password || !role) {
      showMessage(loginMessage, "Please complete all login fields.", "error");
      return;
    }

    storeRole(role);
    showMessage(loginMessage, `Welcome, ${username}! Redirecting to the ${role} dashboard...`, "success");
    setTimeout(() => {
      setRoute(role === "admin" ? "admin-dashboard" : "user-dashboard");
      routeFromHash();
    }, 500);
  });

  logoutUserButton.addEventListener("click", () => {
    clearRole();
    setRoute("login");
    showView("login");
  });

  logoutAdminButton.addEventListener("click", () => {
    clearRole();
    setRoute("login");
    showView("login");
  });

  window.addEventListener("hashchange", routeFromHash);

  fetchActivities().then(routeFromHash);
});
