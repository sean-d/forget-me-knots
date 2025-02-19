// ✅ Load total counts when the page loads
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

// ✅ Fetch totals based on date range
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

// ✅ Run on page load
window.onload = loadTotals;