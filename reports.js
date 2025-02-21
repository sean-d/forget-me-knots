/**
 * Loads total counts of open and completed projects when the page loads.
 *
 * - Retrieves the total number of open projects using `getTotalOpenProjects()`.
 * - Retrieves the total number of completed projects using `getTotalCompletedProjects()`.
 * - Updates the corresponding elements with retrieved values or displays `"Error"` if the request fails.
 *
 * @returns {Promise<void>}
 */
async function loadTotals() {
    try {
        const openProjects = await window.electronAPI.getTotalOpenProjects();
        const completedProjects = await window.electronAPI.getTotalCompletedProjects();

        document.getElementById("total-open").textContent = openProjects.success ? openProjects.total : "Error";
        document.getElementById("total-completed").textContent = completedProjects.success ? completedProjects.total : "Error";
    } catch {
        document.getElementById("total-open").textContent = "Error";
        document.getElementById("total-completed").textContent = "Error";
    }
}

/**
 * Fetches project totals based on a selected date range.
 *
 * - Retrieves user-selected `startDate` and `endDate` values.
 * - If either date is missing, prompts the user to select both dates.
 * - Calls `getProjectsByDateRange()` to fetch counts for open and completed projects within the range.
 * - Updates the UI with retrieved values or `"Error"` if the request fails.
 *
 * @returns {Promise<void>}
 */
async function getProjectsByDate() {
    const startDate = document.getElementById("start-date").value;
    const endDate = document.getElementById("end-date").value;

    if (!startDate || !endDate) {
        alert("Please select both start and end dates.");
        return;
    }

    try {
        const response = await window.electronAPI.getProjectsByDateRange(startDate, endDate);

        document.getElementById("range-open").textContent = response.success ? response.openProjects : "Error";
        document.getElementById("range-completed").textContent = response.success ? response.completedProjects : "Error";
    } catch {
        alert("Error fetching report.");
    }
}

/**
 * Calls `loadTotals()` when the page loads.
 *
 * - Ensures total counts are displayed immediately on page initialization.
 */
window.onload = loadTotals;