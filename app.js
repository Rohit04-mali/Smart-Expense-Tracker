// Smart Expense Tracker - Multi UI + Theme + Pagination
// All data stored in localStorage

(function () {
  // State
  let expenses = JSON.parse(localStorage.getItem("expenses_v1") || "[]");
  let chart = null;
  let themeMode = "system"; // 'system' | 'light' | 'dark'
  let currentPage = 1;
  const PAGE_SIZE = 5;

  const UI_STYLES = ["modern", "neon", "material", "dashboard", "glass"];
  const UI_LABELS = {
    modern: "Modern Minimal",
    neon: "Neon Gradient",
    material: "Material UI",
    dashboard: "Dashboard Pro",
    glass: "Glassmorphism",
  };

  // DOM references
  const dateEl = document.getElementById("date");
  const amountEl = document.getElementById("amount");
  const categoryEl = document.getElementById("category");
  const descriptionEl = document.getElementById("description");

  const addBtn = document.getElementById("addBtn");
  const clearBtn = document.getElementById("clearBtn");
  const exportBtn = document.getElementById("exportCsvBtn");
  const tableBody = document.getElementById("expenseTable");
  const emptyStateEl = document.getElementById("emptyState");

  const sortEl = document.getElementById("sortAmount");
  const durationEl = document.getElementById("duration");
  const filterCategoryEl = document.getElementById("filterCategory");

  const totalAmountEl = document.getElementById("totalAmount");
  const totalCountEl = document.getElementById("totalCount");
  const avgAmountEl = document.getElementById("avgAmount");

  const themeToggleBtn = document.getElementById("themeToggle");
  const uiStyleToggleBtn = document.getElementById("uiStyleToggle");

  const prevPageBtn = document.getElementById("prevPageBtn");
  const nextPageBtn = document.getElementById("nextPageBtn");
  const paginationInfoEl = document.getElementById("paginationInfo");

  const chartCanvas = document.getElementById("chart");
  const ctx = chartCanvas ? chartCanvas.getContext("2d") : null;

  // Init
  initTheme();
  initUiStyle();
  applyFilters();

  // Event wiring
  addBtn?.addEventListener("click", onAdd);
  clearBtn?.addEventListener("click", onClearAll);
  exportBtn?.addEventListener("click", onExportCsv);

  sortEl?.addEventListener("change", () => {
    currentPage = 1;
    applyFilters();
  });
  durationEl?.addEventListener("change", () => {
    currentPage = 1;
    applyFilters();
  });
  filterCategoryEl?.addEventListener("change", () => {
    currentPage = 1;
    applyFilters();
  });

  themeToggleBtn?.addEventListener("click", toggleTheme);
  uiStyleToggleBtn?.addEventListener("click", cycleUiStyle);

  prevPageBtn?.addEventListener("click", () => {
    const list = getFilteredList();
    if (currentPage > 1) {
      currentPage--;
      renderTableWithPagination(list);
    }
  });

  nextPageBtn?.addEventListener("click", () => {
    const list = getFilteredList();
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (currentPage < totalPages) {
      currentPage++;
      renderTableWithPagination(list);
    }
  });

  // ---- Core actions ----

  function onAdd() {
    const date = dateEl.value;
    const amount = parseFloat(amountEl.value);
    const category = categoryEl.value;
    const description = descriptionEl.value || "";

    if (!date || !amount || amount <= 0 || !category) {
      alert("Please provide a valid Date, positive Amount, and Category.");
      return;
    }

    const id = Date.now();
    expenses.push({ id, date, amount, category, description });
    persist();
    clearForm();
    currentPage = 1;
    applyFilters();
  }

  function onClearAll() {
    if (!expenses.length) {
      alert("There are no expenses to clear.");
      return;
    }
    const confirmed = confirm("This will permanently remove all expenses. Continue?");
    if (!confirmed) return;
    expenses = [];
    persist();
    currentPage = 1;
    applyFilters();
  }

  function onExportCsv() {
    const list = getFilteredList();
    if (!list.length) {
      alert("No expenses to export for the current filters.");
      return;
    }

    const header = ["Date", "Amount", "Category", "Description"];
    const rows = list.map((item) => [
      safeCsv(item.date),
      safeCsv(item.amount),
      safeCsv(item.category),
      safeCsv(item.description),
    ]);

    const allRows = [header, ...rows];
    const csvContent = allRows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.download = `expenses_${dateStamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function onEdit(e) {
    const id = Number(e.currentTarget.dataset.id);
    if (!id) return;

    const item = expenses.find((x) => x.id === id);
    if (!item) return;

    // Load into form
    dateEl.value = item.date;
    amountEl.value = item.amount;
    categoryEl.value = item.category;
    descriptionEl.value = item.description;

    // Remove from master list so re-save won't duplicate
    expenses = expenses.filter((x) => x.id !== item.id);
    persist();
    currentPage = 1;
    applyFilters();

    // Small UX touch: scroll to form
    document.getElementById("date")?.focus({ preventScroll: false });
    document
      .getElementById("date")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function onDelete(e) {
    const id = Number(e.currentTarget.dataset.id);
    if (!id) return;
    const confirmed = confirm("Delete this expense?");
    if (!confirmed) return;

    expenses = expenses.filter((x) => x.id !== id);
    persist();
    const list = getFilteredList();
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    applyFilters();
  }

  // ---- Persistence ----

  function persist() {
    localStorage.setItem("expenses_v1", JSON.stringify(expenses));
  }

  // ---- Form helpers ----

  function clearForm() {
    dateEl.value = "";
    amountEl.value = "";
    descriptionEl.value = "";
    if (categoryEl) categoryEl.value = "Food";
  }

  // ---- Filtering & sorting ----

  function getFilteredList() {
    let list = expenses.slice();

    // Duration filter
    const durationVal = durationEl?.value || "all";
    if (durationVal !== "all") {
      const days = parseInt(durationVal, 10);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      list = list.filter((it) => new Date(it.date) >= cutoff);
    }

    // Category filter
    const cat = filterCategoryEl?.value || "all";
    if (cat !== "all") {
      list = list.filter((it) => it.category === cat);
    }

    // Sorting
    const sortVal = sortEl?.value || "none";
    if (sortVal === "low-high") {
      list.sort((a, b) => a.amount - b.amount);
    } else if (sortVal === "high-low") {
      list.sort((a, b) => b.amount - a.amount);
    }

    return list;
  }

  function getPagedSlice(list) {
    const totalItems = list.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageItems = list.slice(start, end);
    return { pageItems, totalPages, totalItems };
  }

  function applyFilters() {
    const filtered = getFilteredList();
    renderTableWithPagination(filtered);
    updateSummary(filtered);
    updateChart(filtered);
  }

  // ---- Rendering ----

  function renderTableWithPagination(fullList) {
    const list = fullList || getFilteredList();
    const { pageItems, totalPages, totalItems } = getPagedSlice(list);
    renderTable(pageItems);
    updatePaginationControls(totalItems, totalPages);
  }

  function renderTable(list) {
    if (!tableBody) return;

    tableBody.innerHTML = "";
    const src = list || [];

    if (emptyStateEl) {
      emptyStateEl.hidden = src.length > 0;
    }

    src.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(item.date)}</td>
        <td>₹ ${formatAmount(item.amount)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${escapeHtml(item.description)}</td>
        <td class="actions">
          <button class="btn-row btn-row--edit" data-id="${item.id}">Edit</button>
          <button class="btn-row btn-row--delete" data-id="${item.id}">Delete</button>
        </td>
      `;

      const editBtn = tr.querySelector(".btn-row--edit");
      const deleteBtn = tr.querySelector(".btn-row--delete");

      editBtn.addEventListener("click", onEdit);
      deleteBtn.addEventListener("click", onDelete);

      tableBody.appendChild(tr);
    });
  }

  function updatePaginationControls(totalItems, totalPages) {
    if (!paginationInfoEl || !prevPageBtn || !nextPageBtn) return;

    if (!totalItems) {
      paginationInfoEl.textContent = "No expenses";
      prevPageBtn.disabled = true;
      nextPageBtn.disabled = true;
      return;
    }

    paginationInfoEl.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
  }

  function updateSummary(list) {
    if (!totalAmountEl || !totalCountEl || !avgAmountEl) return;
    const src = list || [];
    const total = src.reduce((sum, it) => sum + Number(it.amount || 0), 0);
    const count = src.length;
    const avg = count ? total / count : 0;

    totalAmountEl.textContent = "₹ " + formatAmount(total);
    totalCountEl.textContent = String(count);
    avgAmountEl.textContent = "₹ " + formatAmount(avg);
  }

  function updateChart(list) {
    if (!ctx) return;
    const labels = ["Food", "Travel", "Grocery", "Fitness", "Other"];
    const src = list || expenses;

    const totals = labels.map((lbl) =>
      src
        .filter((x) => x.category === lbl)
        .reduce((sum, it) => sum + Number(it.amount || 0), 0)
    );

    if (chart) {
      try {
        chart.destroy();
      } catch (_) {}
    }

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const axisColor = isDark ? "#e5e7eb" : "#4b5563";
    const gridColor = isDark ? "rgba(148, 163, 184, 0.35)" : "rgba(148, 163, 184, 0.3)";

    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Expense",
            data: totals,
            backgroundColor: [
              "rgba(37, 99, 235, 0.85)",
              "rgba(59, 130, 246, 0.85)",
              "rgba(16, 185, 129, 0.85)",
              "rgba(234, 179, 8, 0.85)",
              "rgba(239, 68, 68, 0.85)",
            ],
            borderRadius: 6,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: axisColor,
              font: { size: 11 },
            },
            grid: {
              color: gridColor,
            },
          },
          x: {
            ticks: {
              color: axisColor,
              font: { size: 11 },
            },
            grid: {
              display: false,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });
  }

  // ---- Theme handling ----

  function initTheme() {
    const stored = localStorage.getItem("expense_theme_mode");
    const valid = stored === "light" || stored === "dark" || stored === "system";
    themeMode = valid ? stored : "system";
    applyTheme();
  }

  function applyTheme() {
    const htmlEl = document.documentElement;
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const resolved =
      themeMode === "system" ? (prefersDark ? "dark" : "light") : themeMode;

    htmlEl.setAttribute("data-theme", resolved);
    updateThemeToggleButton();
    updateChart();
  }

  function toggleTheme() {
    if (themeMode === "system") {
      themeMode = "light";
    } else if (themeMode === "light") {
      themeMode = "dark";
    } else {
      themeMode = "system";
    }
    localStorage.setItem("expense_theme_mode", themeMode);
    applyTheme();
  }

  function updateThemeToggleButton() {
    if (!themeToggleBtn) return;
    let label = "Theme: System";
    if (themeMode === "light") label = "Theme: Light";
    else if (themeMode === "dark") label = "Theme: Dark";
    themeToggleBtn.title = label;
  }

  // ---- UI Style handling ----

  function initUiStyle() {
    const stored = localStorage.getItem("expense_ui_style");
    const htmlEl = document.documentElement;
    const style = UI_STYLES.includes(stored) ? stored : "dashboard";
    htmlEl.setAttribute("data-ui", style);
    updateUiStyleButton(style);
  }

  function cycleUiStyle() {
    const htmlEl = document.documentElement;
    const current = htmlEl.getAttribute("data-ui") || "dashboard";
    const idx = UI_STYLES.indexOf(current);
    const next = UI_STYLES[(idx + 1 + UI_STYLES.length) % UI_STYLES.length];
    htmlEl.setAttribute("data-ui", next);
    localStorage.setItem("expense_ui_style", next);
    updateUiStyleButton(next);
  }

  function updateUiStyleButton(style) {
    if (!uiStyleToggleBtn) return;
    const label = UI_LABELS[style] || "Dashboard Pro";
    uiStyleToggleBtn.textContent = `UI: ${label}`;
  }

  // ---- Utilities ----

  function formatAmount(n) {
    const num = Number(n || 0);
    return num.toFixed(2);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function safeCsv(val) {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }
})();